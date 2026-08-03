use super::manifest::{PluginManifest, PluginPermission};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginRecord {
    pub id: String,
    pub application_id: Option<String>,
    pub name: String,
    pub version: String,
    pub description: String,
    pub author: String,
    pub icon_url: String,
    pub tags: Vec<String>,
    pub source: String,
    pub enabled: bool,
    pub installed_at: String,
    pub updated_at: String,
    pub root_path: String,
    pub package_sha256: String,
    pub signature_status: String,
    pub development_path: Option<String>,
    pub manifest: PluginManifest,
    pub granted_permissions: Vec<PluginPermission>,
}
