use serde_json::json;
use std::sync::Mutex;
use tauri::async_runtime::JoinHandle;
use tauri::{AppHandle, Emitter, Manager, Runtime, State};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
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
