use super::installer::{self, PackageMetadata};
use super::manifest::PluginPermission;
use super::record::PluginRecord;
use super::{
    PluginLifecycleEvent, PluginManager, PluginRuntimeRecord, PluginSystemInfo, PreparedPlugin,
};
use serde::Deserialize;
use serde_json::Value;
use std::path::PathBuf;
use tauri::{AppHandle, Emitter, State, WebviewWindow};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PrepareRemoteInput {
    pub url: String,
    pub authorization: Option<String>,
    pub expected_sha256: String,
    pub signature: Option<String>,
    pub application_id: Option<String>,
    #[serde(default)]
    pub icon_url: String,
    #[serde(default)]
    pub tags: Vec<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PrepareLocalInput {
    pub path: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommitInstallInput {
    pub transaction_id: String,
    pub granted_permissions: Vec<PluginPermission>,
    #[serde(default)]
    pub previous_installed_at: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UninstallInput {
    pub plugin_id: String,
    #[serde(default)]
    pub delete_data: bool,
    #[serde(default)]
    pub is_development: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetEnabledInput {
    pub plugin_id: String,
    pub enabled: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadEntryInput {
    pub plugin_id: String,
    pub kind: String,
    #[serde(default)]
    pub window_id: Option<String>,
    pub record: PluginRuntimeRecord,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginApiRequest {
    pub plugin_id: String,
    pub method: String,
    #[serde(default)]
    pub params: Value,
    pub record: PluginRuntimeRecord,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportDevelopmentInput {
    pub plugin_id: String,
    pub destination_path: String,
    pub root_path: String,
}

#[tauri::command]
pub fn plugin_get_system_info(
    window: WebviewWindow,
    manager: State<'_, PluginManager>,
) -> Result<PluginSystemInfo, String> {
    ensure_management_window(&window)?;
    Ok(manager.system_info())
}

#[tauri::command]
pub async fn plugin_prepare_remote(
    window: WebviewWindow,
    manager: State<'_, PluginManager>,
    input: PrepareRemoteInput,
) -> Result<PreparedPlugin, String> {
    ensure_management_window(&window)?;
    installer::prepare_remote(
        &manager,
        &input.url,
        input.authorization.as_deref(),
        &input.expected_sha256,
        input.signature.as_deref(),
        PackageMetadata {
            application_id: input.application_id,
            icon_url: input.icon_url,
            tags: input.tags,
            source: "official".into(),
        },
    )
    .await
}

#[tauri::command]
pub fn plugin_prepare_local(
    window: WebviewWindow,
    manager: State<'_, PluginManager>,
    input: PrepareLocalInput,
) -> Result<PreparedPlugin, String> {
    ensure_management_window(&window)?;
    installer::prepare_local(
        &manager,
        &PathBuf::from(input.path),
        PackageMetadata {
            application_id: None,
            icon_url: String::new(),
            tags: Vec::new(),
            source: "local".into(),
        },
    )
}

#[tauri::command]
pub fn plugin_prepare_development(
    window: WebviewWindow,
    manager: State<'_, PluginManager>,
    input: PrepareLocalInput,
) -> Result<PreparedPlugin, String> {
    ensure_management_window(&window)?;
    installer::prepare_development(&manager, &PathBuf::from(input.path))
}

#[tauri::command]
pub fn plugin_export_development(
    window: WebviewWindow,
    manager: State<'_, PluginManager>,
    input: ExportDevelopmentInput,
) -> Result<String, String> {
    ensure_management_window(&window)?;
    super::exporter::export_development(
        &manager,
        &input.plugin_id,
        &PathBuf::from(input.root_path),
        &PathBuf::from(input.destination_path),
    )
}

#[tauri::command]
pub fn plugin_abort_install(
    window: WebviewWindow,
    manager: State<'_, PluginManager>,
    transaction_id: String,
) -> Result<(), String> {
    ensure_management_window(&window)?;
    manager.abort_prepared(&transaction_id)
}

#[tauri::command]
pub fn plugin_commit_install(
    app: AppHandle,
    window: WebviewWindow,
    manager: State<'_, PluginManager>,
    input: CommitInstallInput,
) -> Result<PluginRecord, String> {
    ensure_management_window(&window)?;
    let record = manager.commit_prepared(
        &input.transaction_id,
        input.granted_permissions,
        input.previous_installed_at,
    )?;
    app.emit(
        "plugin:lifecycle",
        PluginLifecycleEvent { plugin_id: record.id.clone(), action: "reload".into() },
    )
    .map_err(|error| error.to_string())?;
    Ok(record)
}

#[tauri::command]
pub fn plugin_uninstall(
    app: AppHandle,
    window: WebviewWindow,
    manager: State<'_, PluginManager>,
    input: UninstallInput,
) -> Result<(), String> {
    ensure_management_window(&window)?;
    manager.uninstall(&input.plugin_id, input.delete_data, input.is_development)?;
    app.emit(
        "plugin:lifecycle",
        PluginLifecycleEvent { plugin_id: input.plugin_id, action: "uninstall".into() },
    )
    .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn plugin_set_enabled(
    app: AppHandle,
    window: WebviewWindow,
    input: SetEnabledInput,
) -> Result<(), String> {
    ensure_management_window(&window)?;
    super::manifest::validate_plugin_id(&input.plugin_id)?;
    app.emit(
        "plugin:lifecycle",
        PluginLifecycleEvent {
            plugin_id: input.plugin_id,
            action: if input.enabled { "enable".into() } else { "disable".into() },
        },
    )
    .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn plugin_read_entry(
    window: WebviewWindow,
    manager: State<'_, PluginManager>,
    input: ReadEntryInput,
) -> Result<super::PluginEntry, String> {
    ensure_runtime_access(&window, &input.plugin_id)?;
    manager.read_entry(&input.plugin_id, &input.kind, input.window_id.as_deref(), &input.record)
}

#[tauri::command]
pub async fn plugin_invoke_api(
    window: WebviewWindow,
    manager: State<'_, PluginManager>,
    request: PluginApiRequest,
) -> Result<Value, String> {
    ensure_runtime_access(&window, &request.plugin_id)?;
    if request.record.id != request.plugin_id {
        return Err("PLUGIN_ID_MISMATCH".into());
    }
    super::api::invoke(&window, &manager, request.record, &request.method, request.params).await
}

fn ensure_management_window(window: &WebviewWindow) -> Result<(), String> {
    if matches!(window.label(), "home" | "set") {
        return Ok(());
    }
    Err("PLUGIN_COMMAND_CALLER_DENIED".into())
}

fn ensure_runtime_access(
    window: &WebviewWindow,
    plugin_id: &str,
) -> Result<(), String> {
    if window.label() == "plugin-runtime" {
        return Ok(());
    }
    let safe_id = plugin_id
        .chars()
        .map(|character| {
            if character.is_ascii_alphanumeric() || matches!(character, '-' | '_') {
                character
            } else {
                '_'
            }
        })
        .take(48)
        .collect::<String>();
    let hash = plugin_id
        .encode_utf16()
        .fold(0x811c9dc5_u32, |hash, value| (hash ^ u32::from(value)).wrapping_mul(0x01000193));
    let base_label = format!("plugin-ui-{safe_id}-{hash:x}");
    if window.label() == base_label || window.label().starts_with(&format!("{base_label}-")) {
        return Ok(());
    }
    Err("PLUGIN_COMMAND_CALLER_DENIED".into())
}
