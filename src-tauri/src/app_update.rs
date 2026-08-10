use futures_util::StreamExt;
use serde_json::json;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, Manager, Runtime, State};
use tokio::fs::{self, File};
use tokio::io::AsyncWriteExt;
use tokio::sync::Mutex;

const PROGRESS_EVENT: &str = "app-update-progress";
const PROGRESS_EMIT_INTERVAL: Duration = Duration::from_millis(250);
pub const APP_UPDATE_CANCELLED: &str = "APP_UPDATE_CANCELLED";

pub struct AppUpdateState {
    cancel_flag: AtomicBool,
    downloading: Mutex<bool>,
}

impl Default for AppUpdateState {
    fn default() -> Self {
        Self { cancel_flag: AtomicBool::new(false), downloading: Mutex::new(false) }
    }
}

fn emit_progress<R: Runtime>(
    app: &AppHandle<R>,
    stage: &str,
    progress: f64,
    path: Option<&str>,
    message: Option<&str>,
) {
    let _ = app.emit(
        PROGRESS_EVENT,
        json!({
            "stage": stage,
            "progress": progress,
            "path": path,
            "message": message,
        }),
    );
}

#[tauri::command]
pub async fn download_app_update(
    app: AppHandle,
    state: State<'_, AppUpdateState>,
    url: String,
    version: String,
) -> Result<String, String> {
    {
        let mut downloading = state.downloading.lock().await;
        if *downloading {
            return Err("APP_UPDATE_BUSY".to_string());
        }
        *downloading = true;
    }
    state.cancel_flag.store(false, Ordering::SeqCst);

    let result = download_inner(&app, &state, &url, &version).await;

    {
        let mut downloading = state.downloading.lock().await;
        *downloading = false;
    }

    result
}

async fn download_inner(
    app: &AppHandle,
    state: &AppUpdateState,
    url: &str,
    version: &str,
) -> Result<String, String> {
    let local_data = app.path().app_local_data_dir().map_err(|e| e.to_string())?;
    let updates_dir = local_data.join("updates");
    fs::create_dir_all(&updates_dir).await.map_err(|e| e.to_string())?;

    let safe_version = version.replace(['/', '\\', ':', '*', '?', '"', '<', '>', '|'], "_");
    let file_name = format!("Linyu_{safe_version}.exe");
    let destination = updates_dir.join(&file_name);
    let part_path = updates_dir.join(format!("{file_name}.part"));

    if destination.exists() {
        let path = destination.to_string_lossy().to_string();
        emit_progress(app, "done", 1.0, Some(&path), None);
        return Ok(path);
    }

    emit_progress(app, "downloading", 0.0, None, None);

    let response = reqwest::Client::new()
        .get(url)
        .send()
        .await
        .map_err(|e| e.to_string())?
        .error_for_status()
        .map_err(|e| e.to_string())?;

    let total = response.content_length().unwrap_or(0);
    let mut stream = response.bytes_stream();
    let mut file = File::create(&part_path).await.map_err(|e| e.to_string())?;
    let mut downloaded = 0u64;
    let mut last_emit_at =
        Instant::now().checked_sub(Duration::from_secs(1)).unwrap_or_else(Instant::now);

    while let Some(chunk) = stream.next().await {
        if state.cancel_flag.load(Ordering::SeqCst) {
            let _ = fs::remove_file(&part_path).await;
            emit_progress(app, "error", 0.0, None, Some(APP_UPDATE_CANCELLED));
            return Err(APP_UPDATE_CANCELLED.to_string());
        }
        let chunk = chunk.map_err(|e| e.to_string())?;
        file.write_all(&chunk).await.map_err(|e| e.to_string())?;
        downloaded += chunk.len() as u64;

        let progress = if total > 0 { (downloaded as f64 / total as f64).min(1.0) } else { 0.0 };
        if last_emit_at.elapsed() >= PROGRESS_EMIT_INTERVAL || (total > 0 && downloaded >= total) {
            last_emit_at = Instant::now();
            emit_progress(app, "downloading", progress, None, None);
        }
    }

    file.flush().await.map_err(|e| e.to_string())?;
    drop(file);
    fs::rename(&part_path, &destination).await.map_err(|e| e.to_string())?;

    let path = destination.to_string_lossy().to_string();
    emit_progress(app, "done", 1.0, Some(&path), None);
    Ok(path)
}

#[tauri::command]
pub async fn cancel_app_update_download(state: State<'_, AppUpdateState>) -> Result<(), String> {
    state.cancel_flag.store(true, Ordering::SeqCst);
    Ok(())
}

#[tauri::command]
pub async fn install_app_update(
    app: AppHandle,
    path: String,
) -> Result<(), String> {
    let installer = PathBuf::from(&path);
    if !installer.exists() {
        return Err("APP_UPDATE_INSTALLER_MISSING".to_string());
    }

    #[cfg(windows)]
    {
        // /S 静默；/R 安装成功后重新启动应用；/UPDATE 覆盖更新模式
        std::process::Command::new(&installer)
            .args(["/S", "/R", "/UPDATE"])
            .spawn()
            .map_err(|e| format!("APP_UPDATE_INSTALL_FAILED: {e}"))?;
        app.exit(0);
        Ok(())
    }

    #[cfg(not(windows))]
    {
        let _ = app;
        Err("APP_UPDATE_UNSUPPORTED_PLATFORM".to_string())
    }
}
