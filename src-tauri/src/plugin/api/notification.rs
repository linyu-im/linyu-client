use serde_json::Value;
use tauri_plugin_notification::NotificationExt;

use super::{context::PluginCallContext, permissions};

pub fn show(
    context: &PluginCallContext<'_>,
    params: &Value,
) -> Result<Value, String> {
    permissions::require(context, "notification.show")?;
    let title = params
        .get("title")
        .and_then(Value::as_str)
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| "PLUGIN_API_PARAM_MISSING:title".to_string())?;
    let body = params.get("body").and_then(Value::as_str).unwrap_or_default();
    context
        .window
        .notification()
        .builder()
        .title(title.chars().take(120).collect::<String>())
        .body(body.chars().take(1000).collect::<String>())
        .show()
        .map_err(|error| format!("PLUGIN_NOTIFICATION_FAILED:{error}"))?;
    Ok(Value::Null)
}
