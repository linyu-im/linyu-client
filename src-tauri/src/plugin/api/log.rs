use serde_json::Value;

use super::context::PluginCallContext;

pub fn write(
    context: &PluginCallContext<'_>,
    params: &Value,
) -> Result<Value, String> {
    let level = params.get("level").and_then(Value::as_str).unwrap_or("info");
    if !matches!(level, "debug" | "info" | "warn" | "error") {
        return Err("PLUGIN_API_LOG_LEVEL_INVALID".into());
    }
    let message = params.get("message").and_then(Value::as_str).unwrap_or_default();
    println!(
        "[plugin:{}][{level}] {}",
        context.record.id,
        message.chars().take(2000).collect::<String>()
    );
    Ok(Value::Null)
}
