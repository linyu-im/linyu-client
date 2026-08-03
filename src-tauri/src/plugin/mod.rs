pub mod api;
pub mod commands;
mod exporter;
mod installer;
pub mod manifest;
pub mod record;

use base64::{engine::general_purpose::STANDARD, Engine as _};
use manifest::{PluginManifest, PluginPermission};
use record::PluginRecord;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PreparedPlugin {
    pub transaction_id: String,
    pub manifest: PluginManifest,
    pub package_sha256: String,
    pub signature_status: String,
    pub source: String,
}

#[derive(Debug, Clone)]
pub struct PreparedInstall {
    pub transaction_id: String,
    pub staging_dir: Option<PathBuf>,
    pub content_root: PathBuf,
    pub manifest: PluginManifest,
    pub package_sha256: String,
    pub signature_status: String,
    pub application_id: Option<String>,
    pub icon_url: String,
    pub tags: Vec<String>,
    pub source: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginSystemInfo {
    pub root_path: String,
    pub installed_path: String,
    pub data_path: String,
    pub staging_path: String,
    pub registry_path: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginEntry {
    pub content: String,
    pub path: String,
    pub kind: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginLifecycleEvent {
    pub plugin_id: String,
    pub action: String,
}

pub struct PluginManager {
    root: PathBuf,
    db_path: PathBuf,
    prepared: Mutex<HashMap<String, PreparedInstall>>,
    file_handles: Mutex<HashMap<String, PluginFileHandle>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginRuntimeRecord {
    pub id: String,
    pub enabled: bool,
    pub root_path: PathBuf,
    pub manifest: PluginManifest,
    pub granted_permissions: Vec<PluginPermission>,
}

#[derive(Debug, Clone)]
pub struct PluginFileHandle {
    pub plugin_id: String,
    pub path: PathBuf,
    pub readable: bool,
    pub writable: bool,
}

impl PluginManager {
    pub fn initialize(
        root: PathBuf,
        db_path: PathBuf,
    ) -> Result<Self, String> {
        fs::create_dir_all(root.join("installed")).map_err(|error| error.to_string())?;
        fs::create_dir_all(root.join("data")).map_err(|error| error.to_string())?;
        fs::create_dir_all(root.join("logs")).map_err(|error| error.to_string())?;
        if let Some(parent) = db_path.parent() {
            fs::create_dir_all(parent).map_err(|error| error.to_string())?;
        }
        let staging = root.join(".staging");
        if staging.exists() {
            for entry in fs::read_dir(&staging).map_err(|error| error.to_string())? {
                let entry = entry.map_err(|error| error.to_string())?;
                let _ = if entry.path().is_dir() {
                    fs::remove_dir_all(entry.path())
                } else {
                    fs::remove_file(entry.path())
                };
            }
        }
        fs::create_dir_all(&staging).map_err(|error| error.to_string())?;

        Ok(Self {
            root,
            db_path,
            prepared: Mutex::new(HashMap::new()),
            file_handles: Mutex::new(HashMap::new()),
        })
    }

    pub fn staging_dir(&self) -> PathBuf {
        self.root.join(".staging")
    }

    pub fn system_info(&self) -> PluginSystemInfo {
        PluginSystemInfo {
            root_path: path_string(&self.root),
            installed_path: path_string(&self.root.join("installed")),
            data_path: path_string(&self.root.join("data")),
            staging_path: path_string(&self.root.join(".staging")),
            registry_path: path_string(&self.db_path),
        }
    }

    pub fn register_file_handle(
        &self,
        plugin_id: &str,
        path: PathBuf,
        readable: bool,
        writable: bool,
    ) -> Result<String, String> {
        let id = Uuid::new_v4().to_string();
        self.file_handles.lock().map_err(|error| error.to_string())?.insert(
            id.clone(),
            PluginFileHandle { plugin_id: plugin_id.into(), path, readable, writable },
        );
        Ok(id)
    }

    pub fn file_handle(
        &self,
        plugin_id: &str,
        handle_id: &str,
    ) -> Result<PluginFileHandle, String> {
        self.file_handles
            .lock()
            .map_err(|error| error.to_string())?
            .get(handle_id)
            .filter(|handle| handle.plugin_id == plugin_id)
            .cloned()
            .ok_or_else(|| "PLUGIN_FILE_HANDLE_INVALID".to_string())
    }

    pub fn data_root(
        &self,
        plugin_id: &str,
    ) -> Result<PathBuf, String> {
        manifest::validate_plugin_id(plugin_id)?;
        let root = self.root.join("data").join(plugin_id);
        fs::create_dir_all(&root).map_err(|error| error.to_string())?;
        root.canonicalize().map_err(|error| error.to_string())
    }

    pub fn insert_prepared(
        &self,
        prepared: PreparedInstall,
    ) -> Result<(), String> {
        self.prepared
            .lock()
            .map_err(|error| error.to_string())?
            .insert(prepared.transaction_id.clone(), prepared);
        Ok(())
    }

    pub fn abort_prepared(
        &self,
        transaction_id: &str,
    ) -> Result<(), String> {
        let prepared =
            self.prepared.lock().map_err(|error| error.to_string())?.remove(transaction_id);
        if let Some(prepared) = prepared {
            installer::remove_staging(prepared.staging_dir.as_ref());
        }
        Ok(())
    }

    pub fn commit_prepared(
        &self,
        transaction_id: &str,
        granted_permissions: Vec<PluginPermission>,
        previous_installed_at: Option<String>,
    ) -> Result<PluginRecord, String> {
        let prepared = self
            .prepared
            .lock()
            .map_err(|error| error.to_string())?
            .remove(transaction_id)
            .ok_or_else(|| "PLUGIN_INSTALL_TRANSACTION_NOT_FOUND".to_string())?;

        if prepared.manifest.permissions.len() != granted_permissions.len()
            || prepared
                .manifest
                .permissions
                .iter()
                .any(|requested| !granted_permissions.contains(requested))
        {
            installer::remove_staging(prepared.staging_dir.as_ref());
            return Err("PLUGIN_PERMISSION_GRANT_MISMATCH".into());
        }

        let is_development = prepared.source == "development";
        let destination = if is_development {
            prepared.content_root.clone()
        } else {
            self.root.join("installed").join(&prepared.manifest.id).join(&prepared.manifest.version)
        };
        let mut replaced_destination = None;
        if !is_development {
            if let Some(parent) = destination.parent() {
                fs::create_dir_all(parent).map_err(|error| error.to_string())?;
            }
            if destination.exists() {
                let backup = destination
                    .parent()
                    .ok_or_else(|| "PLUGIN_INSTALL_PATH_INVALID".to_string())?
                    .join(format!(".backup-{}", transaction_id));
                fs::rename(&destination, &backup).map_err(|error| error.to_string())?;
                replaced_destination = Some(backup);
            }
            if let Err(error) = fs::rename(&prepared.content_root, &destination) {
                if let Some(backup) = &replaced_destination {
                    let _ = fs::rename(backup, &destination);
                }
                installer::remove_staging(prepared.staging_dir.as_ref());
                return Err(error.to_string());
            }
        }

        let now = now_string();
        let icon_url = if prepared.icon_url.trim().is_empty() {
            manifest_icon_data_url(&destination, &prepared.manifest)
        } else {
            prepared.icon_url.clone()
        };
        let record = PluginRecord {
            id: prepared.manifest.id.clone(),
            application_id: prepared.application_id,
            name: prepared.manifest.name.clone(),
            version: prepared.manifest.version.clone(),
            description: prepared.manifest.description.clone(),
            author: prepared.manifest.publisher.clone(),
            icon_url,
            tags: prepared.tags,
            source: prepared.source,
            enabled: true,
            installed_at: previous_installed_at.unwrap_or_else(|| now.clone()),
            updated_at: now,
            root_path: path_string(&destination),
            package_sha256: prepared.package_sha256,
            signature_status: prepared.signature_status,
            development_path: is_development.then(|| display_path_string(&destination)),
            manifest: prepared.manifest,
            granted_permissions,
        };
        if let Some(backup) = replaced_destination {
            let _ = fs::remove_dir_all(backup);
        }
        installer::remove_staging(prepared.staging_dir.as_ref());
        Ok(record)
    }

    pub fn uninstall(
        &self,
        plugin_id: &str,
        delete_data: bool,
        is_development: bool,
    ) -> Result<(), String> {
        manifest::validate_plugin_id(plugin_id)?;
        let transaction_id = Uuid::new_v4().to_string();
        let code_trash =
            self.root.join(".staging").join(format!("uninstall-code-{transaction_id}"));
        let data_trash =
            self.root.join(".staging").join(format!("uninstall-data-{transaction_id}"));
        let mut moved_code = None;
        let mut moved_data = None;
        if !is_development {
            let plugin_root = self.root.join("installed").join(plugin_id);
            if plugin_root.exists() {
                fs::rename(&plugin_root, &code_trash).map_err(|error| error.to_string())?;
                moved_code = Some(plugin_root);
            }
        }
        if delete_data {
            let data_root = self.root.join("data").join(plugin_id);
            if data_root.exists() {
                if let Err(error) = fs::rename(&data_root, &data_trash) {
                    if let Some(original) = &moved_code {
                        let _ = fs::rename(&code_trash, original);
                    }
                    return Err(error.to_string());
                }
                moved_data = Some(data_root);
            }
        }
        if moved_code.is_some() {
            let _ = fs::remove_dir_all(code_trash);
        }
        if moved_data.is_some() {
            let _ = fs::remove_dir_all(data_trash);
        }
        Ok(())
    }

    pub fn read_entry(
        &self,
        plugin_id: &str,
        kind: &str,
        window_id: Option<&str>,
        record: &PluginRuntimeRecord,
    ) -> Result<PluginEntry, String> {
        manifest::validate_plugin_id(plugin_id)?;
        if !record.enabled {
            return Err("PLUGIN_DISABLED".into());
        }
        if record.id != plugin_id {
            return Err("PLUGIN_ID_MISMATCH".into());
        }
        let root = record.root_path.canonicalize().map_err(|error| error.to_string())?;
        if record.manifest.id != plugin_id {
            return Err("PLUGIN_ID_MISMATCH".into());
        }
        let path = if kind == "ui" {
            let window = record
                .manifest
                .window(window_id.unwrap_or("main"))
                .ok_or_else(|| "PLUGIN_WINDOW_NOT_DECLARED".to_string())?;
            manifest::safe_join(&root, &window.entry)?
        } else {
            record.manifest.entry_path(&root, kind)?
        };
        let canonical = path.canonicalize().map_err(|error| error.to_string())?;
        if !canonical.starts_with(&root) {
            return Err("PLUGIN_ENTRY_PATH_DENIED".into());
        }
        let metadata = fs::metadata(&canonical).map_err(|error| error.to_string())?;
        if metadata.len() > 5 * 1024 * 1024 {
            return Err("PLUGIN_ENTRY_TOO_LARGE".into());
        }
        let content = fs::read_to_string(&canonical).map_err(|error| error.to_string())?;
        Ok(PluginEntry { content, path: path_string(&canonical), kind: kind.into() })
    }
}

pub fn now_string() -> String {
    SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_millis().to_string()
}

fn path_string(path: &Path) -> String {
    path.to_string_lossy().into_owned()
}

fn display_path_string(path: &Path) -> String {
    let value = path_string(path);
    if let Some(path) = value.strip_prefix(r"\\?\UNC\") {
        return format!(r"\\{path}");
    }
    value.strip_prefix(r"\\?\").unwrap_or(&value).to_owned()
}

fn manifest_icon_data_url(
    root: &Path,
    manifest: &PluginManifest,
) -> String {
    let Some(icon) = manifest.icon.as_deref() else {
        return String::new();
    };
    let extension = Path::new(icon)
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();
    let mime = match extension.as_str() {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "webp" => "image/webp",
        "gif" => "image/gif",
        _ => return String::new(),
    };
    let Ok(path) = manifest.entry_path(root, "icon") else {
        return String::new();
    };
    let Ok(metadata) = fs::metadata(&path) else {
        return String::new();
    };
    if metadata.len() > 1024 * 1024 {
        return String::new();
    }
    fs::read(path)
        .map(|bytes| format!("data:{mime};base64,{}", STANDARD.encode(bytes)))
        .unwrap_or_default()
}

#[cfg(test)]
mod path_tests {
    use super::*;

    #[test]
    fn removes_windows_extended_path_prefix_for_display() {
        assert_eq!(display_path_string(Path::new(r"\\?\D:\Work\plugin")), r"D:\Work\plugin");
        assert_eq!(
            display_path_string(Path::new(r"\\?\UNC\server\plugins\demo")),
            r"\\server\plugins\demo"
        );
    }
}
