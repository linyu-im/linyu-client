use serde_json::Value;
use tauri_plugin_opener::OpenerExt;
use url::Url;

use super::{context::PluginCallContext, permissions};

pub fn open_url(
    context: &PluginCallContext<'_>,
    params: &Value,
) -> Result<Value, String> {
    context.require_plugin_window()?;
    permissions::require(context, "external.open")?;
    let value = params
        .get("url")
        .and_then(Value::as_str)
        .ok_or_else(|| "PLUGIN_API_PARAM_MISSING:url".to_string())?;
    let url = Url::parse(value).map_err(|_| "PLUGIN_EXTERNAL_URL_INVALID".to_string())?;
    if !matches!(url.scheme(), "https" | "mailto") {
        return Err("PLUGIN_EXTERNAL_URL_DENIED".into());
    }
    context
        .window
        .opener()
        .open_url(url.as_str(), None::<&str>)
        .map_err(|error| format!("PLUGIN_EXTERNAL_OPEN_FAILED:{error}"))?;
    Ok(Value::Null)
}
