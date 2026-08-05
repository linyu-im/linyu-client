use base64::{engine::general_purpose::STANDARD, Engine as _};
use screenshots::image::ImageFormat as ScreenshotImageFormat;
use screenshots::Screen;
use serde::Deserialize;
use serde_json::{json, Value};
use std::io::Cursor;
use std::sync::Mutex;
use tauri::async_runtime::JoinHandle;
use tauri::{AppHandle, Emitter, Manager, Runtime, State, WebviewWindow};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;
use url::Url;

pub struct OauthServerState {
    pub handle: Mutex<Option<JoinHandle<()>>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppNotificationInput {
    pub title: String,
    pub body: Option<String>,
    pub extra: Option<Value>,
}

#[tauri::command]
pub fn show_app_notification(
    app: AppHandle,
    input: AppNotificationInput,
) -> Result<(), String> {
    let title = input.title.trim();
    if title.is_empty() {
        return Err("notification title is required".into());
    }

    #[cfg(target_os = "windows")]
    {
        use notify_rust::{Notification, NotificationResponse};

        let mut notification = Notification::new();
        notification.summary(title);
        if let Some(body) = input.body.as_deref().map(str::trim).filter(|value| !value.is_empty()) {
            notification.body(body);
        }

        let identifier = app.config().identifier.clone();
        let current_dir = std::env::current_exe()
            .ok()
            .and_then(|path| path.parent().map(|parent| parent.display().to_string()))
            .unwrap_or_default();
        let is_unbundled =
            current_dir.ends_with("target\\debug") || current_dir.ends_with("target\\release");
        if !is_unbundled {
            notification.app_id(&identifier);
        }

        let handle = notification.show().map_err(|error| error.to_string())?;
        if let Some(extra) = input.extra {
            std::thread::spawn(move || {
                let _ = handle.wait_for_response(|response: &NotificationResponse| {
                    if matches!(
                        response,
                        NotificationResponse::Default | NotificationResponse::Action(_)
                    ) {
                        let _ = app.emit("app://notification-action", extra);
                    }
                });
            });
        }
        return Ok(());
    }

    #[cfg(not(target_os = "windows"))]
    {
        use tauri_plugin_notification::NotificationExt;

        let mut builder = app.notification().builder().title(title);
        if let Some(body) = input.body.as_deref().map(str::trim).filter(|value| !value.is_empty()) {
            builder = builder.body(body);
        }
        builder.show().map_err(|error| error.to_string())
    }
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

#[tauri::command]
pub fn write_clipboard_files(paths: Vec<String>) -> Result<(), String> {
    use clipboard_rs::{Clipboard, ClipboardContext};

    if paths.is_empty() {
        return Err("empty file list".into());
    }
    for path in &paths {
        if !std::path::Path::new(path).is_file() {
            return Err(format!("file not found: {path}"));
        }
    }

    let ctx = ClipboardContext::new().map_err(|error| error.to_string())?;
    ctx.set_files(paths).map_err(|error| error.to_string())
}
