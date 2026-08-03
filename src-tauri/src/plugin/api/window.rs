use serde_json::{json, Value};
use tauri::{LogicalSize, Size};

use super::{context::PluginCallContext, permissions};

pub fn invoke(
    context: &PluginCallContext<'_>,
    method: &str,
    params: &Value,
) -> Result<Value, String> {
    context.require_plugin_window()?;
    let window = context.window;
    match method {
        "window.close" => window.close(),
        "window.minimize" => window.minimize(),
        "window.maximize" => window.maximize(),
        "window.unmaximize" => window.unmaximize(),
        "window.show" => window.show(),
        "window.hide" => window.hide(),
        "window.focus" => window.set_focus(),
        "window.center" => window.center(),
        "window.startDragging" => window.start_dragging(),
        "window.setTitle" => {
            let title = string_param(params, "title")?;
            window.set_title(&title.chars().take(120).collect::<String>())
        },
        "window.setFullscreen" => window.set_fullscreen(bool_param(params, "fullscreen")?),
        "window.setAlwaysOnTop" => {
            permissions::require(context, "window.alwaysOnTop")?;
            window.set_always_on_top(bool_param(params, "alwaysOnTop")?)
        },
        "window.setSize" => {
            let width = number_param(params, "width")?;
            let height = number_param(params, "height")?;
            if !(320.0..=3840.0).contains(&width) || !(240.0..=2160.0).contains(&height) {
                return Err("PLUGIN_WINDOW_SIZE_INVALID".into());
            }
            window.set_size(Size::Logical(LogicalSize::new(width, height)))
        },
        "window.toggleMaximize" => {
            if window.is_maximized().map_err(|error| error.to_string())? {
                window.unmaximize()
            } else {
                window.maximize()
            }
        },
        "window.isMaximized" => {
            return window.is_maximized().map(Value::Bool).map_err(|error| error.to_string());
        },
        "window.getSize" => {
            let size = window.inner_size().map_err(|error| error.to_string())?;
            let scale = window.scale_factor().map_err(|error| error.to_string())?;
            let logical = size.to_logical::<f64>(scale);
            return Ok(json!({ "width": logical.width, "height": logical.height }));
        },
        _ => return Err(format!("PLUGIN_API_METHOD_UNSUPPORTED:{method}")),
    }
    .map_err(|error| format!("PLUGIN_WINDOW_OPERATION_FAILED:{error}"))?;
    Ok(Value::Null)
}

fn string_param<'a>(
    params: &'a Value,
    key: &str,
) -> Result<&'a str, String> {
    params.get(key).and_then(Value::as_str).ok_or_else(|| format!("PLUGIN_API_PARAM_MISSING:{key}"))
}

fn bool_param(
    params: &Value,
    key: &str,
) -> Result<bool, String> {
    params
        .get(key)
        .and_then(Value::as_bool)
        .ok_or_else(|| format!("PLUGIN_API_PARAM_MISSING:{key}"))
}

fn number_param(
    params: &Value,
    key: &str,
) -> Result<f64, String> {
    params.get(key).and_then(Value::as_f64).ok_or_else(|| format!("PLUGIN_API_PARAM_MISSING:{key}"))
}
