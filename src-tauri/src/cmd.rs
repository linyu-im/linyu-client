use base64::{engine::general_purpose::STANDARD, Engine as _};
use reqwest::multipart;
use screenshots::image::ImageFormat as ScreenshotImageFormat;
use screenshots::Screen;
use serde::Deserialize;
use serde_json::json;
use sha2::{Digest, Sha256};
use std::io::Cursor;
use std::sync::Mutex;
use tauri::async_runtime::JoinHandle;
use tauri::{AppHandle, Emitter, Manager, Runtime, State, WebviewWindow};
use tokio::io::{AsyncReadExt, AsyncSeekExt, AsyncWriteExt};
use tokio::net::TcpListener;
use url::Url;

pub struct OauthServerState {
    pub handle: Mutex<Option<JoinHandle<()>>>,
}

impl Default for OauthServerState {
    fn default() -> Self {
        Self { handle: Mutex::new(None) }
    }
}

#[tauri::command]
pub fn capture_screen(window: WebviewWindow) -> Result<String, String> {
    let monitor = window
        .current_monitor()
        .map_err(|error| error.to_string())?
        .ok_or_else(|| "no monitor found".to_string())?;
    let monitor_position = monitor.position();

    let screens = Screen::all().map_err(|error| error.to_string())?;
    let screen = screens
        .iter()
        .find(|screen| {
            let info = screen.display_info;
            info.x == monitor_position.x && info.y == monitor_position.y
        })
        .or_else(|| screens.first())
        .ok_or_else(|| "no screen found".to_string())?;

    let image = screen.capture().map_err(|error| error.to_string())?;

    let mut png_bytes = Vec::new();
    image
        .write_to(&mut Cursor::new(&mut png_bytes), ScreenshotImageFormat::Png)
        .map_err(|error| error.to_string())?;

    Ok(STANDARD.encode(png_bytes))
}

#[tauri::command]
pub async fn start_oauth_server<R: Runtime>(
    app: AppHandle<R>,
    state: State<'_, OauthServerState>,
    oauth_type: String,
    redirect_url: String,
) -> Result<String, String> {
    {
        let mut lock = state.handle.lock().map_err(|e| e.to_string())?;
        if let Some(h) = lock.take() {
            h.abort();
        }
    }

    let parsed_url = Url::parse(&redirect_url).map_err(|e| e.to_string())?;
    let host_port = format!(
        "{}:{}",
        parsed_url.host_str().ok_or("invalid host")?,
        parsed_url.port_or_known_default().ok_or("invalid port")?
    );

    let listener = TcpListener::bind(&host_port).await.map_err(|e| e.to_string())?;

    let app_clone = app.clone();
    let redirect_url_clone = redirect_url.clone();

    let handle = tauri::async_runtime::spawn(async move {
        let timeout = tokio::time::sleep(tokio::time::Duration::from_secs(60));
        tokio::pin!(timeout);

        tokio::select! {
            _ = &mut timeout => {
                println!("OAuth timeout");
            }
            res = listener.accept() => {
                if let Ok((mut stream, _)) = res {
                    let mut buffer = [0; 2048];

                    if let Ok(n) = stream.read(&mut buffer).await {
                        let request = String::from_utf8_lossy(&buffer[..n]);
                        let first_line = request.lines().next().unwrap_or("");
                        let path = first_line.split_whitespace().nth(1).unwrap_or("");
                        let full_url = format!("{}{}", redirect_url_clone, path);

                        if let Ok(url) = Url::parse(&full_url) {
                            let mut code = None;

                            for (k, v) in url.query_pairs() {
                                if k == "code" {
                                    code = Some(v.to_string());
                                }
                            }

                            if let Some(code) = code {
                                let payload = json!({
                                    "code": code,
                                    "oauthType": oauth_type,
                                });
                                let _ = app_clone.emit("oauth-code", payload);
                            }
                        }
                        let html_path = app_clone.path().resolve("html/oauth2_success.html", tauri::path::BaseDirectory::Resource);
                        let html_content = match html_path {
                            Ok(path) => tokio::fs::read_to_string(path).await.unwrap_or_else(|_| {
                                "<h1>Success</h1><p>Login successful, please return to the app.</p>".to_string()
                            }),
                            Err(_) => "<h1>File Not Found</h1>".to_string(),
                        };
                        let response = format!(
                            "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\n\r\n{}",
                            html_content.len(),
                            html_content
                        );

                        let _ = stream.write_all(response.as_bytes()).await;
                        let _ = stream.flush().await;
                    }
                }
            }
        }
    });

    {
        let mut lock = state.handle.lock().map_err(|e| e.to_string())?;
        *lock = Some(handle);
    }

    Ok("success".to_string())
}

const HASH_WEIGHT: f64 = 5.0;
const UPLOAD_WEIGHT: f64 = 94.0;
const DEFAULT_CHUNK_SIZE: usize = 5 * 1024 * 1024;

#[derive(Deserialize)]
pub struct UploadFileChunksParam {
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

#[tauri::command]
pub async fn upload_file_chunks<R: Runtime>(
    app: AppHandle<R>,
    param: UploadFileChunksParam,
) -> Result<String, String> {
    let result = do_upload_file_chunks(&app, &param).await;
    if param.temp_file.unwrap_or(false) {
        let _ = tokio::fs::remove_file(&param.file_path).await;
    }
    result
}

async fn do_upload_file_chunks<R: Runtime>(
    app: &AppHandle<R>,
    param: &UploadFileChunksParam,
) -> Result<String, String> {
    let file_size = tokio::fs::metadata(&param.file_path)
        .await
        .map_err(|e| format!("read file metadata failed: {e}"))?
        .len() as usize;

    const SAMPLE_SIZE: usize = 1024 * 1024;

    let file_hash = if file_size <= SAMPLE_SIZE * 3 {
        let data = tokio::fs::read(&param.file_path)
            .await
            .map_err(|e| format!("read file failed: {e}"))?;
        let mut hasher = Sha256::new();
        hasher.update(&data);
        format!("{:x}", hasher.finalize())
    } else {
        let mut file = tokio::fs::File::open(&param.file_path)
            .await
            .map_err(|e| format!("open file failed: {e}"))?;
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
        format!("{:x}", hasher.finalize())
    };

    let _ =
        app.emit("upload-file-progress", json!({ "progress": HASH_WEIGHT, "fileHash": file_hash }));

    let chunk_size = param.chunk_size.unwrap_or(DEFAULT_CHUNK_SIZE).max(1);
    let total_chunks = (file_size + chunk_size - 1) / chunk_size;
    let client = reqwest::Client::new();

    for i in 0..total_chunks {
        let start = i * chunk_size;
        let end = (start + chunk_size).min(file_size);

        let chunk_data = {
            let mut file = tokio::fs::File::open(&param.file_path)
                .await
                .map_err(|e| format!("open file for chunk {i} failed: {e}"))?;
            file.seek(std::io::SeekFrom::Start(start as u64))
                .await
                .map_err(|e| format!("seek chunk {i} failed: {e}"))?;
            let mut buf = vec![0u8; end - start];
            file.read_exact(&mut buf).await.map_err(|e| format!("read chunk {i} failed: {e}"))?;
            buf
        };

        let part = multipart::Part::bytes(chunk_data)
            .file_name(format!("chunk-{i}"))
            .mime_str("application/octet-stream")
            .map_err(|e| e.to_string())?;

        let form = multipart::Form::new()
            .text("fileHash", file_hash.clone())
            .text("chunkIndex", i.to_string())
            .part("file", part);

        let url = format!("{}/api/basic/v1/message/file/upload", param.base_url);
        let response = client
            .post(&url)
            .header("Authorization", &param.auth_token)
            .header("Accept-Language", &param.lang)
            .multipart(form)
            .send()
            .await
            .map_err(|e| format!("chunk {i} request failed: {e}"))?;

        if !response.status().is_success() {
            return Err(format!("chunk {} upload failed: HTTP {}", i, response.status()));
        }

        let body: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;
        let code = body.get("code").and_then(|v| v.as_i64()).unwrap_or(-1);
        if code != 0 {
            let msg = body.get("msg").and_then(|v| v.as_str()).unwrap_or("unknown error");
            return Err(format!("chunk {i} upload error: {msg}"));
        }

        let progress = HASH_WEIGHT + ((i + 1) as f64 / total_chunks as f64) * UPLOAD_WEIGHT;
        let _ = app
            .emit("upload-file-progress", json!({ "progress": progress, "fileHash": file_hash }));
    }

    let merge_url = format!("{}/api/basic/v1/message/file/merge", param.base_url);
    let merge_body = json!({
        "fileHash": file_hash,
        "fileSize": file_size,
        "fileName": param.file_name,
        "totalChunk": total_chunks,
    });

    let merge_resp = client
        .post(&merge_url)
        .header("Authorization", &param.auth_token)
        .header("Accept-Language", &param.lang)
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
    if code != 0 {
        let msg = merge_body.get("msg").and_then(|v| v.as_str()).unwrap_or("unknown error");
        return Err(format!("merge error: {msg}"));
    }

    let file_url = merge_body
        .get("data")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "merge response missing data".to_string())?
        .to_string();

    let _ = app.emit("upload-file-progress", json!({ "progress": 100.0, "fileHash": file_hash }));

    Ok(file_url)
}
