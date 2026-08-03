use serde_json::Value;
use tauri_plugin_clipboard_manager::ClipboardExt;

use super::{context::PluginCallContext, permissions};

pub fn read_text(context: &PluginCallContext<'_>) -> Result<Value, String> {
    context.require_plugin_window()?;
    permissions::require(context, "clipboard.read")?;
    context
        .window
        .clipboard()
        .read_text()
        .map(Value::String)
        .map_err(|error| format!("PLUGIN_CLIPBOARD_READ_FAILED:{error}"))
}

pub fn write_text(
    context: &PluginCallContext<'_>,
    params: &Value,
) -> Result<Value, String> {
    context.require_plugin_window()?;
    permissions::require(context, "clipboard.write")?;
    let text = params
        .get("text")
        .and_then(Value::as_str)
        .ok_or_else(|| "PLUGIN_API_PARAM_MISSING:text".to_string())?;
    if text.len() > 1024 * 1024 {
        return Err("PLUGIN_CLIPBOARD_VALUE_TOO_LARGE".into());
    }
    context
        .window
        .clipboard()
        .write_text(text)
        .map_err(|error| format!("PLUGIN_CLIPBOARD_WRITE_FAILED:{error}"))?;
    Ok(Value::Null)
}
