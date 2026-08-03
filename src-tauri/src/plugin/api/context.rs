use crate::plugin::{PluginManager, PluginRuntimeRecord};
use tauri::WebviewWindow;

pub struct PluginCallContext<'a> {
    pub window: &'a WebviewWindow,
    pub manager: &'a PluginManager,
    pub record: PluginRuntimeRecord,
}

impl<'a> PluginCallContext<'a> {
    pub fn new(
        window: &'a WebviewWindow,
        manager: &'a PluginManager,
        record: PluginRuntimeRecord,
    ) -> Result<Self, String> {
        if record.id.is_empty() {
            return Err("PLUGIN_NOT_INSTALLED".into());
        }
        if !record.enabled {
            return Err("PLUGIN_DISABLED".into());
        }
        Ok(Self { window, manager, record })
    }

    pub fn require_plugin_window(&self) -> Result<(), String> {
        if self.window.label().starts_with("plugin-ui-") {
            return Ok(());
        }
        Err("PLUGIN_API_WINDOW_REQUIRED".into())
    }
}
