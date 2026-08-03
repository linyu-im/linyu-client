use crate::plugin::manifest::PluginPermission;

use super::context::PluginCallContext;

pub fn require<'a>(
    context: &'a PluginCallContext<'_>,
    name: &str,
) -> Result<&'a PluginPermission, String> {
    context
        .record
        .granted_permissions
        .iter()
        .find(|permission| permission.name == name)
        .ok_or_else(|| format!("PLUGIN_PERMISSION_DENIED:{name}"))
}
