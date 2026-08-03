use base64::{engine::general_purpose::STANDARD, Engine as _};
use serde_json::{json, Value};
use std::fs;
use std::path::{Component, Path, PathBuf};
use tauri_plugin_dialog::{DialogExt, FilePath, MessageDialogButtons};

use super::{context::PluginCallContext, permissions};

const MAX_FILE_SIZE: u64 = 10 * 1024 * 1024;

pub fn invoke(
    context: &PluginCallContext<'_>,
    method: &str,
    params: &Value,
) -> Result<Value, String> {
    match method {
        "dialog.openFile" => pick_file(context, params, false),
        "dialog.openDirectory" => pick_file(context, params, true),
        "dialog.saveFile" => save_file(context, params),
        "dialog.message" => message(context, params, false),
        "dialog.confirm" => message(context, params, true),
        "files.readText" => read(context, params, false),
        "files.readBinary" => read(context, params, true),
        "files.writeText" => write(context, params, false),
        "files.writeBinary" => write(context, params, true),
        "files.stat" => stat(context, params),
        "files.exists" => exists(context, params),
        "files.pluginData.readText" => plugin_data_read(context, params),
        "files.pluginData.writeText" => plugin_data_write(context, params),
        _ => Err(format!("PLUGIN_API_METHOD_UNSUPPORTED:{method}")),
    }
}

fn message(
    context: &PluginCallContext<'_>,
    params: &Value,
    confirm: bool,
) -> Result<Value, String> {
    context.require_plugin_window()?;
    let content = params
        .get("message")
        .and_then(Value::as_str)
        .ok_or_else(|| "PLUGIN_API_PARAM_MISSING:message".to_string())?;
    let mut dialog = context.window.dialog().message(content);
    if let Some(title) = params.get("title").and_then(Value::as_str) {
        dialog = dialog.title(title);
    }
    if confirm {
        dialog = dialog.buttons(MessageDialogButtons::OkCancel);
    }
    Ok(Value::Bool(dialog.blocking_show()))
}

fn pick_file(
    context: &PluginCallContext<'_>,
    params: &Value,
    directory: bool,
) -> Result<Value, String> {
    context.require_plugin_window()?;
    permissions::require(context, "files.read")?;
    let mut dialog = context.window.dialog().file();
    if let Some(title) = params.get("title").and_then(Value::as_str) {
        dialog = dialog.set_title(title);
    }
    let selected =
        if directory { dialog.blocking_pick_folder() } else { dialog.blocking_pick_file() };
    selected.map_or(Ok(Value::Null), |path| create_handle(context, path, true, false))
}

fn save_file(
    context: &PluginCallContext<'_>,
    params: &Value,
) -> Result<Value, String> {
    context.require_plugin_window()?;
    permissions::require(context, "files.write")?;
    let mut dialog = context.window.dialog().file();
    if let Some(title) = params.get("title").and_then(Value::as_str) {
        dialog = dialog.set_title(title);
    }
    if let Some(name) = params.get("defaultName").and_then(Value::as_str) {
        dialog = dialog.set_file_name(name);
    }
    dialog
        .blocking_save_file()
        .map_or(Ok(Value::Null), |path| create_handle(context, path, true, true))
}

fn create_handle(
    context: &PluginCallContext<'_>,
    path: FilePath,
    readable: bool,
    writable: bool,
) -> Result<Value, String> {
    let path = path.into_path().map_err(|error| error.to_string())?;
    let id = context.manager.register_file_handle(
        &context.record.id,
        path.clone(),
        readable,
        writable,
    )?;
    Ok(json!({
        "id": id,
        "name": path.file_name().and_then(|value| value.to_str()).unwrap_or_default(),
        "kind": if path.is_dir() { "directory" } else { "file" }
    }))
}

fn read(
    context: &PluginCallContext<'_>,
    params: &Value,
    binary: bool,
) -> Result<Value, String> {
    permissions::require(context, "files.read")?;
    let handle = get_handle(context, params)?;
    if !handle.readable || !handle.path.is_file() {
        return Err("PLUGIN_FILE_READ_DENIED".into());
    }
    let metadata = fs::metadata(&handle.path).map_err(|error| error.to_string())?;
    if metadata.len() > MAX_FILE_SIZE {
        return Err("PLUGIN_FILE_TOO_LARGE".into());
    }
    let bytes =
        fs::read(&handle.path).map_err(|error| format!("PLUGIN_FILE_READ_FAILED:{error}"))?;
    if binary {
        Ok(Value::String(STANDARD.encode(bytes)))
    } else {
        String::from_utf8(bytes)
            .map(Value::String)
            .map_err(|_| "PLUGIN_FILE_ENCODING_INVALID".into())
    }
}

fn write(
    context: &PluginCallContext<'_>,
    params: &Value,
    binary: bool,
) -> Result<Value, String> {
    permissions::require(context, "files.write")?;
    let handle = get_handle(context, params)?;
    if !handle.writable {
        return Err("PLUGIN_FILE_WRITE_DENIED".into());
    }
    let content = params
        .get("content")
        .and_then(Value::as_str)
        .ok_or_else(|| "PLUGIN_API_PARAM_MISSING:content".to_string())?;
    let bytes = if binary {
        STANDARD.decode(content).map_err(|_| "PLUGIN_FILE_BINARY_INVALID".to_string())?
    } else {
        content.as_bytes().to_vec()
    };
    if bytes.len() as u64 > MAX_FILE_SIZE {
        return Err("PLUGIN_FILE_TOO_LARGE".into());
    }
    fs::write(&handle.path, bytes).map_err(|error| format!("PLUGIN_FILE_WRITE_FAILED:{error}"))?;
    Ok(Value::Null)
}

fn stat(
    context: &PluginCallContext<'_>,
    params: &Value,
) -> Result<Value, String> {
    let handle = get_handle(context, params)?;
    let metadata = fs::metadata(&handle.path).map_err(|error| error.to_string())?;
    Ok(json!({
        "name": handle.path.file_name().and_then(|value| value.to_str()).unwrap_or_default(),
        "size": metadata.len(),
        "isFile": metadata.is_file(),
        "isDirectory": metadata.is_dir(),
        "readonly": metadata.permissions().readonly()
    }))
}

fn exists(
    context: &PluginCallContext<'_>,
    params: &Value,
) -> Result<Value, String> {
    let handle = get_handle(context, params)?;
    Ok(Value::Bool(handle.path.exists()))
}

fn plugin_data_read(
    context: &PluginCallContext<'_>,
    params: &Value,
) -> Result<Value, String> {
    permissions::require(context, "files.read")?;
    let path = plugin_data_path(context, params)?;
    if !path.exists() {
        return Ok(Value::Null);
    }
    let metadata = fs::metadata(&path).map_err(|error| error.to_string())?;
    if metadata.len() > MAX_FILE_SIZE {
        return Err("PLUGIN_FILE_TOO_LARGE".into());
    }
    fs::read_to_string(path)
        .map(Value::String)
        .map_err(|error| format!("PLUGIN_FILE_READ_FAILED:{error}"))
}

fn plugin_data_write(
    context: &PluginCallContext<'_>,
    params: &Value,
) -> Result<Value, String> {
    permissions::require(context, "files.write")?;
    let path = plugin_data_path(context, params)?;
    let content = params
        .get("content")
        .and_then(Value::as_str)
        .ok_or_else(|| "PLUGIN_API_PARAM_MISSING:content".to_string())?;
    if content.len() as u64 > MAX_FILE_SIZE {
        return Err("PLUGIN_FILE_TOO_LARGE".into());
    }
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    fs::write(path, content).map_err(|error| format!("PLUGIN_FILE_WRITE_FAILED:{error}"))?;
    Ok(Value::Null)
}

fn plugin_data_path(
    context: &PluginCallContext<'_>,
    params: &Value,
) -> Result<PathBuf, String> {
    let relative = params
        .get("path")
        .and_then(Value::as_str)
        .ok_or_else(|| "PLUGIN_API_PARAM_MISSING:path".to_string())?;
    let path = Path::new(relative);
    if path.as_os_str().is_empty()
        || path.components().any(|component| !matches!(component, Component::Normal(_)))
    {
        return Err("PLUGIN_FILE_PATH_INVALID".into());
    }
    Ok(context.manager.data_root(&context.record.id)?.join(path))
}

fn get_handle(
    context: &PluginCallContext<'_>,
    params: &Value,
) -> Result<crate::plugin::PluginFileHandle, String> {
    let id = params
        .get("handleId")
        .and_then(Value::as_str)
        .ok_or_else(|| "PLUGIN_API_PARAM_MISSING:handleId".to_string())?;
    context.manager.file_handle(&context.record.id, id)
}
