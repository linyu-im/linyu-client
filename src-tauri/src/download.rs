use serde::Deserialize;
use serde_json::json;
use std::collections::HashMap;
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex, OnceLock};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, Runtime};
use tokio::fs::{self, File, OpenOptions};
use tokio::io::{AsyncSeekExt, AsyncWriteExt};

const DEFAULT_CHUNK_SIZE: u64 = 5 * 1024 * 1024;
pub const DOWNLOAD_CANCELLED: &str = "DOWNLOAD_CANCELLED";
const SPACE_PROGRESS_EVENT: &str = "space-download-file-progress";
/// 进度 IPC 节流，避免大文件下载打满前端主线程
const PROGRESS_EMIT_INTERVAL: Duration = Duration::from_millis(250);

struct DownloadTaskState {
    cancel_flags: Mutex<HashMap<String, Arc<AtomicBool>>>,
}

impl Default for DownloadTaskState {
    fn default() -> Self {
        Self { cancel_flags: Mutex::new(HashMap::new()) }
    }
}

impl DownloadTaskState {
    fn register(
        &self,
        task_id: &str,
    ) -> Arc<AtomicBool> {
        let flag = Arc::new(AtomicBool::new(false));
        if let Ok(mut map) = self.cancel_flags.lock() {
            map.insert(task_id.to_string(), Arc::clone(&flag));
        }
        flag
    }

    fn unregister(
        &self,
        task_id: &str,
    ) {
        if let Ok(mut map) = self.cancel_flags.lock() {
            map.remove(task_id);
        }
    }

    fn request_cancel(
        &self,
        task_id: &str,
    ) -> bool {
        if let Ok(map) = self.cancel_flags.lock() {
            if let Some(flag) = map.get(task_id) {
                flag.store(true, Ordering::SeqCst);
                return true;
            }
        }
        false
    }
}

fn space_download_task_state() -> &'static DownloadTaskState {
    static STATE: OnceLock<DownloadTaskState> = OnceLock::new();
    STATE.get_or_init(DownloadTaskState::default)
}

#[derive(Deserialize)]
pub struct SpaceDownloadFileParam {
    url: String,
    #[serde(rename = "savePath")]
    save_path: String,
    #[serde(rename = "taskId")]
    task_id: String,
    #[serde(rename = "chunkSize")]
    chunk_size: Option<u64>,
}

struct ProgressEmitter {
    last_emit_at: Instant,
    last_loaded: u64,
}

impl ProgressEmitter {
    fn new() -> Self {
        Self {
            // 允许首次立即上报
            last_emit_at: Instant::now()
                .checked_sub(Duration::from_secs(1))
                .unwrap_or_else(Instant::now),
            last_loaded: 0,
        }
    }

    fn emit<R: Runtime>(
        &mut self,
        app: &AppHandle<R>,
        task_id: &str,
        loaded: u64,
        total: u64,
        force: bool,
    ) {
        if !force
            && loaded != total
            && self.last_emit_at.elapsed() < PROGRESS_EMIT_INTERVAL
            && loaded.saturating_sub(self.last_loaded) < 512 * 1024
        {
            return;
        }
        self.last_emit_at = Instant::now();
        self.last_loaded = loaded;
        let progress =
            if total == 0 { 0.0 } else { ((loaded as f64) * 100.0 / (total as f64)).min(100.0) };
        let _ = app.emit(
            SPACE_PROGRESS_EVENT,
            json!({
                "taskId": task_id,
                "progress": progress,
                "loadedBytes": loaded,
                "totalBytes": total,
            }),
        );
    }
}

fn check_cancelled(flag: &AtomicBool) -> Result<(), String> {
    if flag.load(Ordering::SeqCst) {
        Err(DOWNLOAD_CANCELLED.to_string())
    } else {
        Ok(())
    }
}

fn part_path(save_path: &str) -> String {
    format!("{}.part", save_path)
}

async fn ensure_parent_dir(save_path: &str) -> Result<(), String> {
    if let Some(parent) = Path::new(save_path).parent() {
        if !parent.as_os_str().is_empty() {
            fs::create_dir_all(parent).await.map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

/// 探测文件大小与是否真正支持 Range。
/// 注意：不能仅因有 Content-Length 就认定支持 Range，否则服务端忽略 Range 时
/// 会把整文件一次缓冲进内存导致卡死/OOM。
async fn probe_total_size(
    client: &reqwest::Client,
    url: &str,
) -> Result<(u64, bool), String> {
    let head = client.head(url).send().await.map_err(|e| e.to_string())?;
    let mut total: u64 = 0;

    if head.status().is_success() {
        let accept_ranges = head
            .headers()
            .get(reqwest::header::ACCEPT_RANGES)
            .and_then(|v| v.to_str().ok())
            .map(|v| v.to_ascii_lowercase().contains("bytes"))
            .unwrap_or(false);
        total = head.content_length().unwrap_or(0);
        if accept_ranges && total > 0 {
            return Ok((total, true));
        }
    }

    // HEAD 不可靠时用 bytes=0-0 探测；仅 206 才认定支持 Range
    let probe = client
        .get(url)
        .header(reqwest::header::RANGE, "bytes=0-0")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if probe.status() == reqwest::StatusCode::PARTIAL_CONTENT {
        if let Some(content_range) =
            probe.headers().get(reqwest::header::CONTENT_RANGE).and_then(|v| v.to_str().ok())
        {
            if let Some(total_str) = content_range.split('/').nth(1) {
                if let Ok(parsed) = total_str.trim().parse::<u64>() {
                    return Ok((parsed, true));
                }
            }
        }
        if let Some(len) = probe.content_length() {
            // 单字节探测成功，但没有总长时仍可走流式整下
            if total == 0 {
                total = len;
            }
        }
        return Ok((total, true));
    }

    if probe.status().is_success() {
        if let Some(len) = probe.content_length() {
            if total == 0 {
                total = len;
            }
        }
    }

    Ok((total, false))
}

async fn stream_body_to_file<R: Runtime>(
    app: &AppHandle<R>,
    response: &mut reqwest::Response,
    file: &mut File,
    task_id: &str,
    mut loaded: u64,
    total: u64,
    cancel_flag: &AtomicBool,
    emitter: &mut ProgressEmitter,
) -> Result<u64, String> {
    while let Some(chunk) = response.chunk().await.map_err(|e| e.to_string())? {
        check_cancelled(cancel_flag)?;
        file.write_all(&chunk).await.map_err(|e| e.to_string())?;
        loaded += chunk.len() as u64;
        let report_total = if total > 0 { total } else { loaded };
        emitter.emit(app, task_id, loaded, report_total, false);
    }
    Ok(loaded)
}

async fn download_with_range<R: Runtime>(
    app: &AppHandle<R>,
    client: &reqwest::Client,
    url: &str,
    save_path: &str,
    task_id: &str,
    total: u64,
    chunk_size: u64,
    cancel_flag: &AtomicBool,
) -> Result<(), String> {
    let part = part_path(save_path);
    let mut offset = match fs::metadata(&part).await {
        Ok(meta) => meta.len().min(total),
        Err(_) => 0,
    };
    let mut emitter = ProgressEmitter::new();

    if offset >= total && total > 0 {
        fs::rename(&part, save_path).await.map_err(|e| e.to_string())?;
        emitter.emit(app, task_id, total, total, true);
        return Ok(());
    }

    let mut file =
        OpenOptions::new().create(true).write(true).open(&part).await.map_err(|e| e.to_string())?;

    file.set_len(offset).await.map_err(|e| e.to_string())?;
    file.seek(std::io::SeekFrom::Start(offset)).await.map_err(|e| e.to_string())?;

    emitter.emit(app, task_id, offset, total, true);

    while offset < total {
        check_cancelled(cancel_flag)?;
        let end = (offset + chunk_size - 1).min(total - 1);
        let expected = end - offset + 1;
        let range = format!("bytes={}-{}", offset, end);

        let mut response = client
            .get(url)
            .header(reqwest::header::RANGE, &range)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        let status = response.status();
        if status == reqwest::StatusCode::PARTIAL_CONTENT {
            offset = stream_body_to_file(
                app,
                &mut response,
                &mut file,
                task_id,
                offset,
                total,
                cancel_flag,
                &mut emitter,
            )
            .await?;
            continue;
        }

        // 服务端忽略 Range 返回 200：切勿用 bytes() 整包缓冲，改为流式写入并结束分段循环
        if status == reqwest::StatusCode::OK {
            let body_len = response.content_length().unwrap_or(0);
            // 若返回体明显大于本次分段，按整文件流式下载处理（从当前文件位置覆盖写完）
            if body_len == 0 || body_len > expected * 2 {
                // 丢弃已有 .part，整文件重下，避免半截+全量拼接错误
                drop(file);
                let _ = fs::remove_file(&part).await;
                return download_full(app, client, url, save_path, task_id, cancel_flag).await;
            }

            offset = stream_body_to_file(
                app,
                &mut response,
                &mut file,
                task_id,
                offset,
                total,
                cancel_flag,
                &mut emitter,
            )
            .await?;
            // 单次 200 已拿完全部期望数据时继续；若服务端一次给了剩余全部则循环会自然结束
            continue;
        }

        return Err(format!("DOWNLOAD_HTTP_{}", status.as_u16()));
    }

    file.flush().await.map_err(|e| e.to_string())?;
    drop(file);

    check_cancelled(cancel_flag)?;
    if offset < total {
        return Err("DOWNLOAD_INCOMPLETE".to_string());
    }

    if fs::try_exists(save_path).await.unwrap_or(false) {
        fs::remove_file(save_path).await.map_err(|e| e.to_string())?;
    }
    fs::rename(&part, save_path).await.map_err(|e| e.to_string())?;
    emitter.emit(app, task_id, total, total, true);
    Ok(())
}

async fn download_full<R: Runtime>(
    app: &AppHandle<R>,
    client: &reqwest::Client,
    url: &str,
    save_path: &str,
    task_id: &str,
    cancel_flag: &AtomicBool,
) -> Result<(), String> {
    let part = part_path(save_path);
    let _ = fs::remove_file(&part).await;
    let mut emitter = ProgressEmitter::new();

    check_cancelled(cancel_flag)?;
    let mut response = client.get(url).send().await.map_err(|e| e.to_string())?;
    if !response.status().is_success() {
        return Err(format!("DOWNLOAD_HTTP_{}", response.status().as_u16()));
    }

    let total = response.content_length().unwrap_or(0);
    let mut file = File::create(&part).await.map_err(|e| e.to_string())?;
    emitter.emit(app, task_id, 0, total, true);

    let loaded = stream_body_to_file(
        app,
        &mut response,
        &mut file,
        task_id,
        0,
        total,
        cancel_flag,
        &mut emitter,
    )
    .await?;

    file.flush().await.map_err(|e| e.to_string())?;
    drop(file);

    check_cancelled(cancel_flag)?;
    if fs::try_exists(save_path).await.unwrap_or(false) {
        fs::remove_file(save_path).await.map_err(|e| e.to_string())?;
    }
    fs::rename(&part, save_path).await.map_err(|e| e.to_string())?;
    let final_total = if total > 0 { total } else { loaded };
    emitter.emit(app, task_id, final_total, final_total, true);
    Ok(())
}

#[tauri::command]
pub async fn download_space_file<R: Runtime>(
    app: AppHandle<R>,
    param: SpaceDownloadFileParam,
) -> Result<(), String> {
    let url = param.url.trim();
    if url.is_empty() {
        return Err("EMPTY_DOWNLOAD_URL".to_string());
    }
    let save_path = param.save_path.trim();
    if save_path.is_empty() {
        return Err("EMPTY_SAVE_PATH".to_string());
    }

    let chunk_size = param.chunk_size.unwrap_or(DEFAULT_CHUNK_SIZE).max(64 * 1024);
    let task_id = param.task_id.clone();
    let state = space_download_task_state();
    let cancel_flag = state.register(&task_id);

    let result = async {
        ensure_parent_dir(save_path).await?;
        check_cancelled(&cancel_flag)?;

        let client = reqwest::Client::builder()
            .pool_max_idle_per_host(4)
            .redirect(reqwest::redirect::Policy::limited(10))
            .build()
            .map_err(|e| e.to_string())?;

        let (total, supports_range) = probe_total_size(&client, url).await?;
        check_cancelled(&cancel_flag)?;

        if supports_range && total > 0 {
            download_with_range(
                &app,
                &client,
                url,
                save_path,
                &task_id,
                total,
                chunk_size,
                &cancel_flag,
            )
            .await
        } else {
            download_full(&app, &client, url, save_path, &task_id, &cancel_flag).await
        }
    }
    .await;

    state.unregister(&task_id);

    if let Err(err) = &result {
        if err == DOWNLOAD_CANCELLED {
            return Err(DOWNLOAD_CANCELLED.to_string());
        }
    }

    result
}

#[tauri::command]
pub async fn cancel_space_file_download(task_id: String) -> Result<bool, String> {
    Ok(space_download_task_state().request_cancel(&task_id))
}
