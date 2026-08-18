use reqwest::multipart;
use serde::Deserialize;
use serde_json::json;
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex, OnceLock};
use tauri::{AppHandle, Emitter, Runtime};
use tokio::io::{AsyncReadExt, AsyncSeekExt};

const HASH_WEIGHT: f64 = 5.0;
const UPLOAD_WEIGHT: f64 = 94.0;
const DEFAULT_CHUNK_SIZE: usize = 5 * 1024 * 1024;
const SAMPLE_SIZE: usize = 1024 * 1024;

// 与 @tauri-apps/plugin-http 的 User-Agent 保持一致，
const DESKTOP_USER_AGENT: &str = "tauri-plugin-http/2.5.7";

pub const UPLOAD_CANCELLED: &str = "UPLOAD_CANCELLED";

const MESSAGE_PROGRESS_EVENT: &str = "upload-file-progress";
const SPACE_PROGRESS_EVENT: &str = "space-upload-file-progress";

const MESSAGE_CHUNK_URL: &str = "/api/basic/v1/message/file/upload";
const MESSAGE_MERGE_URL: &str = "/api/basic/v1/message/file/merge";
const SPACE_CHUNK_URL: &str = "/api/cloud-drive/v1/space/user/upload/chunk";
const SPACE_MERGE_URL: &str = "/api/cloud-drive/v1/space/user/upload/merge";

struct UploadTaskState {
    cancel_flags: Mutex<HashMap<String, Arc<AtomicBool>>>,
}

impl Default for UploadTaskState {
    fn default() -> Self {
        Self { cancel_flags: Mutex::new(HashMap::new()) }
    }
}

impl UploadTaskState {
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

fn space_upload_task_state() -> &'static UploadTaskState {
    static STATE: OnceLock<UploadTaskState> = OnceLock::new();
    STATE.get_or_init(UploadTaskState::default)
}

#[derive(Deserialize)]
pub struct MessageUploadFileParam {
    #[serde(rename = "filePath")]
    file_path: String,
    #[serde(rename = "fileName")]
    file_name: String,
    #[serde(rename = "baseUrl")]
    base_url: String,
    #[serde(rename = "authToken")]
    auth_token: String,
    lang: String,
    #[serde(rename = "chunkSize")]
    chunk_size: Option<usize>,
    #[serde(rename = "tempFile")]
    temp_file: Option<bool>,
}

#[derive(Deserialize)]
pub struct SpaceUploadFileParam {
    #[serde(rename = "filePath")]
    file_path: String,
    #[serde(rename = "fileName")]
    file_name: String,
    #[serde(rename = "baseUrl")]
    base_url: String,
    #[serde(rename = "authToken")]
    auth_token: String,
    lang: String,
    #[serde(rename = "chunkSize")]
    chunk_size: Option<usize>,
    #[serde(rename = "taskId")]
    task_id: String,
    #[serde(rename = "fileHash")]
    file_hash: Option<String>,
    #[serde(rename = "skipChunks")]
    skip_chunks: Option<Vec<usize>>,
    #[serde(rename = "parentId")]
    parent_id: String,
    #[serde(rename = "successCode")]
    success_code: Option<i64>,
}

#[derive(Deserialize)]
pub struct ComputeSpaceFileHashParam {
    #[serde(rename = "filePath")]
    file_path: String,
}

async fn compute_file_hash_from_path(file_path: &str) -> Result<String, String> {
    let file_size = tokio::fs::metadata(file_path)
        .await
        .map_err(|e| format!("read file metadata failed: {e}"))?
        .len() as usize;

    if file_size <= SAMPLE_SIZE * 3 {
        let data =
            tokio::fs::read(file_path).await.map_err(|e| format!("read file failed: {e}"))?;
        let mut hasher = Sha256::new();
        hasher.update(&data);
        return Ok(format!("{:x}", hasher.finalize()));
    }

    let mut file =
        tokio::fs::File::open(file_path).await.map_err(|e| format!("open file failed: {e}"))?;
    let mut buf = vec![0u8; SAMPLE_SIZE];
    let mut hasher = Sha256::new();

    file.read_exact(&mut buf).await.map_err(|e| e.to_string())?;
    hasher.update(&buf);

    file.seek(std::io::SeekFrom::Start(((file_size - SAMPLE_SIZE) / 2) as u64))
        .await
        .map_err(|e| e.to_string())?;
    file.read_exact(&mut buf).await.map_err(|e| e.to_string())?;
    hasher.update(&buf);

    file.seek(std::io::SeekFrom::Start((file_size - SAMPLE_SIZE) as u64))
        .await
        .map_err(|e| e.to_string())?;
    file.read_exact(&mut buf).await.map_err(|e| e.to_string())?;
    hasher.update(&buf);

    hasher.update(file_size.to_le_bytes());
    Ok(format!("{:x}", hasher.finalize()))
}

fn emit_progress<R: Runtime>(
    app: &AppHandle<R>,
    event: &str,
    progress: f64,
    file_hash: &str,
    task_id: Option<&str>,
) {
    let mut payload = json!({
        "progress": progress,
        "fileHash": file_hash,
    });
    if let Some(id) = task_id {
        if let Some(obj) = payload.as_object_mut() {
            obj.insert("taskId".to_string(), json!(id));
        }
    }
    let _ = app.emit(event, payload);
}

async fn read_chunk_from(
    file: &mut tokio::fs::File,
    start: usize,
    end: usize,
    index: usize,
) -> Result<Vec<u8>, String> {
    file.seek(std::io::SeekFrom::Start(start as u64))
        .await
        .map_err(|e| format!("seek chunk {index} failed: {e}"))?;
    let len = end - start;
    let mut buf = vec![0u8; len];
    file.read_exact(&mut buf).await.map_err(|e| format!("read chunk {index} failed: {e}"))?;
    Ok(buf)
}

async fn upload_chunks_and_merge<R: Runtime>(
    app: &AppHandle<R>,
    progress_event: &str,
    file_path: &str,
    file_name: &str,
    base_url: &str,
    auth_token: &str,
    lang: &str,
    chunk_url_path: &str,
    merge_url_path: &str,
    chunk_size: usize,
    success_code: i64,
    file_hash: String,
    skip_chunks: &[usize],
    merge_extra: Option<serde_json::Value>,
    task_id: Option<&str>,
    cancel_flag: Option<&Arc<AtomicBool>>,
) -> Result<String, String> {
    let is_cancelled = || cancel_flag.map(|flag| flag.load(Ordering::SeqCst)).unwrap_or(false);

    if is_cancelled() {
        return Err(UPLOAD_CANCELLED.to_string());
    }

    let file_size = tokio::fs::metadata(file_path)
        .await
        .map_err(|e| format!("read file metadata failed: {e}"))?
        .len() as usize;

    emit_progress(app, progress_event, HASH_WEIGHT, &file_hash, task_id);

    let chunk_size = chunk_size.max(1);
    let total_chunks = (file_size + chunk_size - 1) / chunk_size;
    // 复用连接，避免每个分片重建 TLS/TCP
    let client = reqwest::Client::builder()
        .user_agent(DESKTOP_USER_AGENT)
        .pool_max_idle_per_host(4)
        .build()
        .unwrap_or_else(|_| reqwest::Client::new());
    let skip_set: std::collections::HashSet<usize> = skip_chunks.iter().copied().collect();
    let chunk_url = format!("{base_url}{chunk_url_path}");

    // 复用同一个文件句柄，避免每个分片重新 open
    let mut file = tokio::fs::File::open(file_path)
        .await
        .map_err(|e| format!("open file for upload failed: {e}"))?;

    // 进度事件节流，避免频繁 IPC 打满前端主线程
    let mut last_emit_at = std::time::Instant::now()
        .checked_sub(std::time::Duration::from_secs(1))
        .unwrap_or_else(std::time::Instant::now);
    const PROGRESS_EMIT_INTERVAL: std::time::Duration = std::time::Duration::from_millis(200);

    for i in 0..total_chunks {
        if is_cancelled() {
            return Err(UPLOAD_CANCELLED.to_string());
        }

        let progress = HASH_WEIGHT + ((i + 1) as f64 / total_chunks as f64) * UPLOAD_WEIGHT;
        let is_last_chunk = i + 1 == total_chunks;

        if skip_set.contains(&i) {
            if is_last_chunk || last_emit_at.elapsed() >= PROGRESS_EMIT_INTERVAL {
                emit_progress(app, progress_event, progress, &file_hash, task_id);
                last_emit_at = std::time::Instant::now();
            }
            continue;
        }

        let start = i * chunk_size;
        let end = (start + chunk_size).min(file_size);
        let chunk_data = read_chunk_from(&mut file, start, end, i).await?;

        if is_cancelled() {
            return Err(UPLOAD_CANCELLED.to_string());
        }

        let part = multipart::Part::bytes(chunk_data)
            .file_name(format!("chunk-{i}"))
            .mime_str("application/octet-stream")
            .map_err(|e| e.to_string())?;

        let form = multipart::Form::new()
            .text("fileHash", file_hash.clone())
            .text("chunkIndex", i.to_string())
            .part("file", part);

        let response = client
            .post(&chunk_url)
            .header("Authorization", auth_token)
            .header("Accept-Language", lang)
            .multipart(form)
            .send()
            .await
            .map_err(|e| format!("chunk {i} request failed: {e}"))?;

        if is_cancelled() {
            return Err(UPLOAD_CANCELLED.to_string());
        }

        if !response.status().is_success() {
            return Err(format!("chunk {} upload failed: HTTP {}", i, response.status()));
        }

        let body: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;
        let code = body.get("code").and_then(|v| v.as_i64()).unwrap_or(-1);
        if code != success_code {
            let msg = body.get("msg").and_then(|v| v.as_str()).unwrap_or("unknown error");
            return Err(format!("chunk {i} upload error: {msg}"));
        }

        if is_last_chunk || last_emit_at.elapsed() >= PROGRESS_EMIT_INTERVAL {
            emit_progress(app, progress_event, progress, &file_hash, task_id);
            last_emit_at = std::time::Instant::now();
        }

        // 让出执行权，避免长时间占用 runtime 导致界面卡顿
        tokio::task::yield_now().await;
    }

    if is_cancelled() {
        return Err(UPLOAD_CANCELLED.to_string());
    }

    let merge_endpoint = format!("{base_url}{merge_url_path}");
    let mut merge_body = json!({
        "fileHash": file_hash,
        "fileSize": file_size,
        "fileName": file_name,
        "totalChunk": total_chunks,
    });
    if let Some(extra) = merge_extra {
        if let (Some(base), Some(ext)) = (merge_body.as_object_mut(), extra.as_object()) {
            for (k, v) in ext {
                base.insert(k.clone(), v.clone());
            }
        }
    }

    let merge_resp = client
        .post(&merge_endpoint)
        .header("Authorization", auth_token)
        .header("Accept-Language", lang)
        .header("Content-Type", "application/json")
        .json(&merge_body)
        .send()
        .await
        .map_err(|e| format!("merge request failed: {e}"))?;

    if !merge_resp.status().is_success() {
        return Err(format!("merge failed: HTTP {}", merge_resp.status()));
    }

    let merge_body: serde_json::Value = merge_resp.json().await.map_err(|e| e.to_string())?;
    let code = merge_body.get("code").and_then(|v| v.as_i64()).unwrap_or(-1);
    if code != success_code {
        let msg = merge_body.get("msg").and_then(|v| v.as_str()).unwrap_or("unknown error");
        return Err(format!("merge error: {msg}"));
    }

    let mut file_url =
        merge_body.get("data").and_then(|v| v.as_str()).map(|s| s.to_string()).unwrap_or_default();
    if file_url.is_empty() {
        // 兼容 data 为对象且含 url 字段的返回
        file_url = merge_body
            .get("data")
            .and_then(|v| v.get("url"))
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
            .unwrap_or_default();
    }
    if file_url.is_empty() {
        return Err("merge error: empty file url".to_string());
    }

    emit_progress(app, progress_event, 100.0, &file_hash, task_id);
    Ok(file_url)
}

/// 消息文件分片上传（保持原命令名 `upload_file_chunks`，与网盘完全隔离）
#[tauri::command]
pub async fn upload_file_chunks<R: Runtime>(
    app: AppHandle<R>,
    param: MessageUploadFileParam,
) -> Result<String, String> {
    let file_hash = compute_file_hash_from_path(&param.file_path).await?;
    let result = upload_chunks_and_merge(
        &app,
        MESSAGE_PROGRESS_EVENT,
        &param.file_path,
        &param.file_name,
        &param.base_url,
        &param.auth_token,
        &param.lang,
        MESSAGE_CHUNK_URL,
        MESSAGE_MERGE_URL,
        param.chunk_size.unwrap_or(DEFAULT_CHUNK_SIZE),
        0,
        file_hash,
        &[],
        None,
        None,
        None,
    )
    .await;

    if let Err(err) = &result {
        eprintln!(
            "[upload_file_chunks] failed path={} name={} base={} err={}",
            param.file_path, param.file_name, param.base_url, err
        );
    }

    if param.temp_file.unwrap_or(false) {
        let _ = tokio::fs::remove_file(&param.file_path).await;
    }
    result
}

/// 网盘文件分片上传（独立命令，支持暂停/断点）
#[tauri::command]
pub async fn upload_space_file_chunks<R: Runtime>(
    app: AppHandle<R>,
    param: SpaceUploadFileParam,
) -> Result<String, String> {
    let state = space_upload_task_state();
    let cancel_flag = state.register(&param.task_id);

    let file_hash = match &param.file_hash {
        Some(hash) if !hash.is_empty() => hash.clone(),
        _ => compute_file_hash_from_path(&param.file_path).await?,
    };

    let merge_extra = json!({ "parentId": param.parent_id });
    let result = upload_chunks_and_merge(
        &app,
        SPACE_PROGRESS_EVENT,
        &param.file_path,
        &param.file_name,
        &param.base_url,
        &param.auth_token,
        &param.lang,
        SPACE_CHUNK_URL,
        SPACE_MERGE_URL,
        param.chunk_size.unwrap_or(DEFAULT_CHUNK_SIZE),
        param.success_code.unwrap_or(0),
        file_hash,
        param.skip_chunks.as_deref().unwrap_or(&[]),
        Some(merge_extra),
        Some(param.task_id.as_str()),
        Some(&cancel_flag),
    )
    .await;

    state.unregister(&param.task_id);
    result
}

#[tauri::command]
pub async fn compute_space_file_hash(param: ComputeSpaceFileHashParam) -> Result<String, String> {
    compute_file_hash_from_path(&param.file_path).await
}

#[tauri::command]
pub fn cancel_space_file_upload(task_id: String) -> Result<bool, String> {
    Ok(space_upload_task_state().request_cancel(&task_id))
}
