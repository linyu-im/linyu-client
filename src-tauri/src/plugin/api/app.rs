use serde_json::{json, Value};

use super::context::PluginCallContext;

pub fn get_info(context: &PluginCallContext<'_>) -> Value {
    json!({
        "id": context.record.id,
        "name": context.record.manifest.name,
        "version": context.record.manifest.version,
        "apiVersion": context.record.manifest.api_version
    })
}

pub fn get_capabilities() -> Value {
    json!({
        "apiVersion": 1,
        "methods": [
            "app.getInfo", "app.getVersion", "app.getCapabilities", "permissions.check",
            "user.getCurrent", "system.getTheme", "system.getLocale", "system.getPlatform",
            "events.on", "events.once", "events.off", "storage.get", "storage.set",
            "storage.remove", "storage.clear", "commands.execute", "network.fetch", "log",
            "notifications.show", "dialog.openFile", "dialog.openDirectory", "dialog.saveFile",
            "dialog.message", "dialog.confirm",
            "files.readText", "files.readBinary", "files.writeText", "files.writeBinary",
            "files.stat", "files.exists", "files.pluginData.readText", "files.pluginData.writeText",
            "window.close", "window.minimize", "window.maximize", "window.unmaximize",
            "window.toggleMaximize", "window.isMaximized", "window.show", "window.hide",
            "window.focus", "window.center", "window.getSize", "window.setSize", "window.setTitle",
            "window.startDragging", "window.setFullscreen", "window.setAlwaysOnTop",
            "windows.open", "clipboard.readText", "clipboard.writeText", "external.openUrl"
        ]
    })
}
