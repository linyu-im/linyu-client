use std::{fs, path::PathBuf, process::Command};

use base64::{engine::general_purpose::STANDARD as BASE64_STANDARD, Engine};
use futures_util::StreamExt;
use serde::Deserialize;
use serde_json::{json, Value};
use tauri::{AppHandle, Emitter, State};
use tokio::io::AsyncWriteExt;

use super::{types::*, WorkManager};

fn emit_event(
    app: &AppHandle,
    kind: &str,
    payload: Value,
) {
    let _ = app.emit(
        "work://event",
        WorkEvent {
            runtime_id: "reasonix".into(),
            kind: kind.into(),
            session_id: None,
            request_id: None,
            payload,
        },
    );
}

fn emit_session_event(
    app: &AppHandle,
    session_id: &str,
    kind: &str,
    payload: Value,
) {
    let _ = app.emit(
        "work://event",
        WorkEvent {
            runtime_id: "reasonix".into(),
            kind: kind.into(),
            session_id: Some(session_id.into()),
            request_id: None,
            payload,
        },
    );
}

#[tauri::command]
pub async fn work_runtime_list(
    manager: State<'_, WorkManager>
) -> Result<Vec<RuntimeManifest>, String> {
    Ok(manager.runtimes().await)
}

#[tauri::command]
pub async fn work_runtime_detect(
    manager: State<'_, WorkManager>
) -> Result<RuntimeManifest, String> {
    Ok(manager.detect_reasonix())
}

fn normalize_version(raw: &str) -> String {
    let trimmed = raw.trim().trim_start_matches('v').trim_start_matches('V');
    let token = trimmed
        .split(|c: char| !(c.is_ascii_digit() || c == '.'))
        .find(|part| part.chars().any(|c| c.is_ascii_digit()))
        .unwrap_or(trimmed);
    token.trim_matches('.').to_string()
}

fn parse_semver(raw: &str) -> Option<(u64, u64, u64)> {
    let normalized = normalize_version(raw);
    if normalized.is_empty() {
        return None;
    }
    let mut parts = normalized.split('.');
    let major = parts.next()?.parse().ok()?;
    let minor = parts.next().unwrap_or("0").parse().unwrap_or(0);
    let patch = parts
        .next()
        .unwrap_or("0")
        .split(|c: char| !c.is_ascii_digit())
        .next()
        .unwrap_or("0")
        .parse()
        .unwrap_or(0);
    Some((major, minor, patch))
}

fn is_newer_version(
    latest: &str,
    current: &str,
) -> bool {
    match (parse_semver(latest), parse_semver(current)) {
        (Some(latest_parts), Some(current_parts)) => latest_parts > current_parts,
        _ => {
            let latest_norm = normalize_version(latest);
            let current_norm = normalize_version(current);
            !latest_norm.is_empty() && latest_norm != current_norm
        },
    }
}

async fn fetch_latest_reasonix_version() -> Result<String, String> {
    let npm = if cfg!(windows) { "npm.cmd" } else { "npm" };
    let mut npm_version = Command::new(npm);
    npm_version.arg("--version");
    super::process::hide_console(&mut npm_version);
    if npm_version.output().is_ok() {
        let mut npm_view = tokio::process::Command::new(npm);
        npm_view.args(["view", "reasonix", "version"]);
        super::process::hide_console_tokio(&mut npm_view);
        if let Ok(output) = npm_view.output().await {
            if output.status.success() {
                let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if !version.is_empty() {
                    return Ok(version);
                }
            }
        }
    }

    let release = reqwest::Client::new()
        .get("https://api.github.com/repos/esengine/DeepSeek-Reasonix/releases/latest")
        .header("User-Agent", "Linyu-Work-Agent")
        .send()
        .await
        .map_err(|error| format!("WORK_UPDATE_NETWORK: {error}"))?
        .error_for_status()
        .map_err(|error| format!("WORK_UPDATE_NETWORK: {error}"))?
        .json::<Release>()
        .await
        .map_err(|error| format!("WORK_UPDATE_METADATA: {error}"))?;
    let tag = release.tag_name.trim().to_string();
    if tag.is_empty() {
        return Err("WORK_UPDATE_EMPTY_VERSION".into());
    }
    Ok(tag)
}

#[tauri::command]
pub async fn work_runtime_check_update(
    manager: State<'_, WorkManager>
) -> Result<RuntimeUpdateInfo, String> {
    let runtime = manager.detect_reasonix();
    if !runtime.installed {
        return Ok(RuntimeUpdateInfo {
            current_version: runtime.version,
            latest_version: None,
            update_available: false,
        });
    }
    let latest = fetch_latest_reasonix_version().await?;
    let current = runtime.version.clone().unwrap_or_default();
    let update_available =
        if current.is_empty() { !latest.is_empty() } else { is_newer_version(&latest, &current) };
    Ok(RuntimeUpdateInfo {
        current_version: runtime.version,
        latest_version: Some(latest),
        update_available,
    })
}

#[derive(Deserialize)]
struct Release {
    tag_name: String,
    assets: Vec<ReleaseAsset>,
}

#[derive(Deserialize)]
struct ReleaseAsset {
    name: String,
    browser_download_url: String,
    size: u64,
}

#[tauri::command]
pub async fn work_runtime_install(
    app: AppHandle,
    manager: State<'_, WorkManager>,
) -> Result<String, String> {
    emit_event(&app, "install_progress", json!({ "stage": "checking", "progress": 0 }));
    let npm = if cfg!(windows) { "npm.cmd" } else { "npm" };
    let mut npm_version = Command::new(npm);
    npm_version.arg("--version");
    super::process::hide_console(&mut npm_version);
    if npm_version.output().is_ok() {
        let runtime_root = manager.root().join("runtimes").join("reasonix");
        fs::create_dir_all(&runtime_root).map_err(|error| error.to_string())?;
        emit_event(&app, "install_progress", json!({ "stage": "downloading", "progress": 0.2 }));
        let mut npm_install = tokio::process::Command::new(npm);
        npm_install
            .args(["install", "--no-audit", "--no-fund", "--prefix"])
            .arg(&runtime_root)
            .arg("reasonix@latest");
        super::process::hide_console_tokio(&mut npm_install);
        let status =
            npm_install.status().await.map_err(|error| format!("WORK_INSTALL_NPM: {error}"))?;
        if status.success() {
            let executable = runtime_root
                .join("node_modules")
                .join(".bin")
                .join(if cfg!(windows) { "reasonix.cmd" } else { "reasonix" });
            emit_event(
                &app,
                "install_progress",
                json!({ "stage": "completed", "progress": 1, "path": executable }),
            );
            return Ok(executable.to_string_lossy().to_string());
        }
    }

    let release = reqwest::Client::new()
        .get("https://api.github.com/repos/esengine/DeepSeek-Reasonix/releases/latest")
        .header("User-Agent", "Linyu-Work-Agent")
        .send()
        .await
        .map_err(|error| format!("WORK_INSTALL_NETWORK: {error}"))?
        .error_for_status()
        .map_err(|error| format!("WORK_INSTALL_NETWORK: {error}"))?
        .json::<Release>()
        .await
        .map_err(|error| format!("WORK_INSTALL_METADATA: {error}"))?;
    let suffix = if cfg!(windows) {
        "_x64-setup.exe"
    } else if cfg!(target_os = "macos") {
        "_universal.dmg"
    } else {
        "_amd64.AppImage"
    };
    let asset = release
        .assets
        .into_iter()
        .find(|asset| asset.name.ends_with(suffix))
        .ok_or("WORK_INSTALL_ASSET_NOT_FOUND")?;
    let destination = manager.root().join("downloads").join(&asset.name);
    let response = reqwest::get(&asset.browser_download_url)
        .await
        .map_err(|error| format!("WORK_INSTALL_NETWORK: {error}"))?
        .error_for_status()
        .map_err(|error| format!("WORK_INSTALL_NETWORK: {error}"))?;
    let total = response.content_length().unwrap_or(asset.size).max(1);
    let mut stream = response.bytes_stream();
    let mut file =
        tokio::fs::File::create(&destination).await.map_err(|error| error.to_string())?;
    let mut downloaded = 0u64;
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|error| format!("WORK_INSTALL_DOWNLOAD: {error}"))?;
        file.write_all(&chunk).await.map_err(|error| error.to_string())?;
        downloaded += chunk.len() as u64;
        emit_event(
            &app,
            "install_progress",
            json!({
                "stage": "downloading",
                "progress": downloaded as f64 / total as f64,
                "version": release.tag_name
            }),
        );
    }
    file.flush().await.map_err(|error| error.to_string())?;
    open_installer(&destination)?;
    emit_event(
        &app,
        "install_progress",
        json!({ "stage": "waiting_user", "progress": 1, "path": destination }),
    );
    Ok(destination.to_string_lossy().to_string())
}

fn open_installer(path: &PathBuf) -> Result<(), String> {
    #[cfg(windows)]
    {
        Command::new("cmd")
            .args(["/C", "start", "", &path.to_string_lossy()])
            .spawn()
            .map_err(|error| error.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        Command::new("open").arg(path).spawn().map_err(|error| error.to_string())?;
    }
    #[cfg(all(unix, not(target_os = "macos")))]
    {
        Command::new("xdg-open").arg(path).spawn().map_err(|error| error.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn work_provider_list(
    manager: State<'_, WorkManager>
) -> Result<Vec<ProviderProfile>, String> {
    Ok(manager.settings().await.providers)
}

#[tauri::command]
pub async fn work_preferences_get(manager: State<'_, WorkManager>) -> Result<WorkSettings, String> {
    Ok(manager.settings().await)
}

#[tauri::command]
pub async fn work_preferences_save(
    manager: State<'_, WorkManager>,
    input: PreferencesInput,
) -> Result<WorkSettings, String> {
    manager.save_preferences(input).await
}

#[tauri::command]
pub async fn work_provider_save(
    manager: State<'_, WorkManager>,
    input: ProviderInput,
) -> Result<ProviderProfile, String> {
    let provider = manager.save_provider(input).await?;
    manager.restart_runtime("reasonix").await;
    Ok(provider)
}

#[tauri::command]
pub async fn work_provider_test(
    manager: State<'_, WorkManager>,
    input: ProviderInput,
) -> Result<ProviderTestResult, String> {
    manager.test_provider(input).await
}

#[tauri::command]
pub async fn work_provider_delete(
    manager: State<'_, WorkManager>,
    id: String,
) -> Result<(), String> {
    manager.delete_provider(&id).await?;
    manager.restart_runtime("reasonix").await;
    Ok(())
}

#[tauri::command]
pub async fn work_skill_local_state(
    manager: State<'_, WorkManager>
) -> Result<SkillLocalState, String> {
    Ok(manager.skill_local_state().await)
}

#[tauri::command]
pub async fn work_skill_install(
    manager: State<'_, WorkManager>,
    id: String,
    content: String,
) -> Result<(), String> {
    manager.install_skill(&id, &content).await
}

#[tauri::command]
pub async fn work_skill_uninstall(
    manager: State<'_, WorkManager>,
    id: String,
) -> Result<(), String> {
    manager.uninstall_skill(&id).await
}

#[tauri::command]
pub async fn work_skill_set_enabled(
    manager: State<'_, WorkManager>,
    id: String,
    enabled: bool,
) -> Result<(), String> {
    manager.set_skill_enabled(&id, enabled).await
}

#[tauri::command]
pub async fn work_session_new(
    app: AppHandle,
    manager: State<'_, WorkManager>,
    input: SessionNewInput,
) -> Result<Value, String> {
    let cwd = match input.scope_mode.as_str() {
        "workspace" => {
            let path = input
                .cwd
                .as_deref()
                .filter(|value| !value.trim().is_empty())
                .ok_or("WORK_WORKSPACE_REQUIRED")?;
            fs::canonicalize(path).map_err(|_| "WORK_WORKSPACE_NOT_FOUND")?
        },
        "chat" => {
            let safe_id = input
                .conversation_id
                .chars()
                .filter(|value| value.is_ascii_alphanumeric() || *value == '-' || *value == '_')
                .collect::<String>();
            let path = manager.root().join("chat-workspaces").join(if safe_id.is_empty() {
                "default"
            } else {
                &safe_id
            });
            fs::create_dir_all(&path)
                .map_err(|error| format!("WORK_CHAT_WORKSPACE_FAILED: {error}"))?;
            fs::canonicalize(path)
                .map_err(|error| format!("WORK_CHAT_WORKSPACE_FAILED: {error}"))?
        },
        _ => return Err("WORK_SCOPE_INVALID".into()),
    };
    let connection = manager.connection(app.clone(), &input.runtime_id).await?;
    let result = connection.rpc("session/new", json!({ "cwd": cwd, "mcpServers": [] })).await?;
    if let Some(session_id) = result.get("sessionId").and_then(Value::as_str) {
        let settings = manager.settings().await;
        let _ = connection
            .rpc(
                "session/set_config_option",
                json!({ "sessionId": session_id, "configId": "work_mode", "value": settings.work_mode }),
            )
            .await;
        let _ = connection
            .rpc(
                "session/set_config_option",
                json!({ "sessionId": session_id, "configId": "tool_approval", "value": settings.approval_mode }),
            )
            .await;
    }
    Ok(result)
}

#[tauri::command]
pub async fn work_session_prompt(
    app: AppHandle,
    manager: State<'_, WorkManager>,
    input: SessionPromptInput,
) -> Result<Value, String> {
    let connection = manager.connection(app.clone(), &input.runtime_id).await?;
    let mut text = input.text;
    let mut prompt = vec![];
    if !input.attachments.is_empty() {
        text.push_str(
            "\n\nThe user attached these local files. Inspect the exact paths when needed:\n",
        );
        for attachment in &input.attachments {
            let canonical = fs::canonicalize(&attachment.path)
                .map_err(|_| format!("WORK_ATTACHMENT_NOT_FOUND: {}", attachment.name))?;
            if !canonical.is_file() {
                return Err(format!("WORK_ATTACHMENT_NOT_FOUND: {}", attachment.name));
            }
            text.push_str(&format!(
                "- {} ({}, {}): {}\n",
                attachment.name,
                attachment.category,
                attachment.mime_type,
                canonical.to_string_lossy()
            ));

            if attachment.category == "image" {
                let bytes = tokio::fs::read(&canonical)
                    .await
                    .map_err(|error| format!("WORK_ATTACHMENT_READ_FAILED: {error}"))?;
                if bytes.len() <= 12 * 1024 * 1024 {
                    prompt.push(json!({
                        "type": "image",
                        "data": BASE64_STANDARD.encode(bytes),
                        "mimeType": attachment.mime_type
                    }));
                }
            } else if is_text_attachment(&canonical) {
                let bytes = tokio::fs::read(&canonical)
                    .await
                    .map_err(|error| format!("WORK_ATTACHMENT_READ_FAILED: {error}"))?;
                if bytes.len() <= 512 * 1024 {
                    if let Ok(content) = String::from_utf8(bytes) {
                        prompt.push(json!({
                            "type": "text",
                            "text": format!("\nContents of attached file {}:\n{}", attachment.name, content)
                        }));
                    }
                }
            }
        }
    }
    prompt.insert(0, json!({ "type": "text", "text": text }));
    emit_session_event(&app, &input.session_id, "prompt_started", json!({}));
    let result = connection
        .rpc("session/prompt", json!({ "sessionId": &input.session_id, "prompt": prompt }))
        .await;
    match &result {
        Ok(value) => emit_session_event(&app, &input.session_id, "prompt_completed", value.clone()),
        Err(error) => emit_session_event(
            &app,
            &input.session_id,
            "prompt_failed",
            json!({ "message": error }),
        ),
    }
    result
}

fn is_text_attachment(path: &std::path::Path) -> bool {
    matches!(
        path.extension().and_then(|value| value.to_str()).map(str::to_ascii_lowercase).as_deref(),
        Some("txt" | "md" | "csv" | "tsv" | "json" | "xml" | "yaml" | "yml" | "log")
    )
}

#[tauri::command]
pub async fn work_session_cancel(
    app: AppHandle,
    manager: State<'_, WorkManager>,
    input: SessionInput,
) -> Result<(), String> {
    manager
        .connection(app, &input.runtime_id)
        .await?
        .notify("session/cancel", json!({ "sessionId": input.session_id }))
        .await
}

#[tauri::command]
pub async fn work_session_close(
    app: AppHandle,
    manager: State<'_, WorkManager>,
    input: SessionInput,
) -> Result<(), String> {
    manager
        .connection(app, &input.runtime_id)
        .await?
        .rpc("session/close", json!({ "sessionId": input.session_id }))
        .await
        .map(|_| ())
}

#[tauri::command]
pub async fn work_session_set_config(
    app: AppHandle,
    manager: State<'_, WorkManager>,
    input: SessionConfigInput,
) -> Result<Value, String> {
    manager
        .connection(app, &input.runtime_id)
        .await?
        .rpc(
            "session/set_config_option",
            json!({
                "sessionId": input.session_id,
                "configId": input.option_id,
                "value": input.value
            }),
        )
        .await
}

#[tauri::command]
pub async fn work_session_resolve_permission(
    app: AppHandle,
    manager: State<'_, WorkManager>,
    input: PermissionInput,
) -> Result<(), String> {
    manager
        .connection(app, &input.runtime_id)
        .await?
        .resolve_permission(&input.request_id, input.option_id.as_deref())
        .await
}

#[tauri::command]
pub async fn work_status(manager: State<'_, WorkManager>) -> Result<WorkStatus, String> {
    let settings = manager.settings().await;
    let runtime = manager.detect_reasonix();
    let provider = settings
        .active_provider_id
        .as_ref()
        .and_then(|id| settings.providers.iter().find(|provider| &provider.id == id).cloned());
    let installed_skills = manager.installed_skill_count();
    Ok(WorkStatus {
        runtime,
        provider,
        model: settings.active_model,
        approval_mode: settings.approval_mode,
        work_mode: settings.work_mode,
        active_sessions: manager.session_count().await,
        installed_skills,
    })
}
