use serde_json::Value;
use tauri::WebviewWindow;

use crate::plugin::{PluginManager, PluginRuntimeRecord};

use super::{
    app, clipboard, context::PluginCallContext, external, filesystem, log, network, notification,
    permissions, window,
};

pub async fn invoke(
    window_handle: &WebviewWindow,
    manager: &PluginManager,
    record: PluginRuntimeRecord,
    method: &str,
    params: Value,
) -> Result<Value, String> {
    if serde_json::to_vec(&params).map_err(|_| "PLUGIN_API_PAYLOAD_INVALID".to_string())?.len()
        > 1024 * 1024
    {
        return Err("PLUGIN_API_PAYLOAD_TOO_LARGE".into());
    }
    let context = PluginCallContext::new(window_handle, manager, record)?;
    match method {
        "app.getInfo" => Ok(app::get_info(&context)),
        "app.getCapabilities" => Ok(app::get_capabilities()),
        "permissions.check" => {
            let name = params
                .get("name")
                .and_then(Value::as_str)
                .ok_or_else(|| "PLUGIN_API_PARAM_MISSING:name".to_string())?;
            permissions::require(&context, name)?;
            Ok(Value::Bool(true))
        },
        "network.fetch" => network::fetch(&context, params).await,
        "log" => log::write(&context, &params),
        "notifications.show" => notification::show(&context, &params),
        "clipboard.readText" => clipboard::read_text(&context),
        "clipboard.writeText" => clipboard::write_text(&context, &params),
        "external.openUrl" => external::open_url(&context, &params),
        method if method.starts_with("window.") => window::invoke(&context, method, &params),
        method if method.starts_with("files.") || method.starts_with("dialog.") => {
            filesystem::invoke(&context, method, &params)
        },
        _ => Err(format!("PLUGIN_API_METHOD_UNSUPPORTED:{method}")),
    }
}
