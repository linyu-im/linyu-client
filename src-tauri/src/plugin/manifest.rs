use semver::{Version, VersionReq};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashSet;
use std::path::{Component, Path, PathBuf};
use url::Url;

pub const ALLOWED_PERMISSIONS: &[&str] = &[
    "storage",
    "network.fetch",
    "user.profile.read",
    "notification.show",
    "files.read",
    "files.write",
    "clipboard.read",
    "clipboard.write",
    "window.open",
    "window.alwaysOnTop",
    "external.open",
];

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginEngine {
    pub linyu: String,
}

fn default_api_version() -> u32 {
    1
}

fn default_window_width() -> f64 {
    900.0
}

fn default_window_height() -> f64 {
    650.0
}

fn default_window_min_width() -> f64 {
    640.0
}

fn default_window_min_height() -> f64 {
    480.0
}

fn default_true() -> bool {
    true
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginWindowDecorations {
    #[serde(default = "default_window_decoration_mode")]
    pub mode: String,
    #[serde(default)]
    pub tabs: bool,
    #[serde(default = "default_true")]
    pub show_icon: bool,
    #[serde(default)]
    pub show_version: bool,
}

fn default_window_decoration_mode() -> String {
    "linyu".into()
}

impl Default for PluginWindowDecorations {
    fn default() -> Self {
        Self {
            mode: default_window_decoration_mode(),
            tabs: false,
            show_icon: true,
            show_version: false,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginWindowSize {
    #[serde(default = "default_window_width")]
    pub width: f64,
    #[serde(default = "default_window_height")]
    pub height: f64,
    #[serde(default = "default_window_min_width")]
    pub min_width: f64,
    #[serde(default = "default_window_min_height")]
    pub min_height: f64,
    #[serde(default)]
    pub max_width: Option<f64>,
    #[serde(default)]
    pub max_height: Option<f64>,
}

impl Default for PluginWindowSize {
    fn default() -> Self {
        Self {
            width: default_window_width(),
            height: default_window_height(),
            min_width: default_window_min_width(),
            min_height: default_window_min_height(),
            max_width: None,
            max_height: None,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginWindowBehavior {
    #[serde(default = "default_true")]
    pub resizable: bool,
    #[serde(default = "default_true")]
    pub center: bool,
    #[serde(default = "default_true")]
    pub singleton: bool,
    #[serde(default = "default_true")]
    pub persist_bounds: bool,
    #[serde(default)]
    pub always_on_top: bool,
    #[serde(default)]
    pub skip_taskbar: bool,
    #[serde(default)]
    pub fullscreen: bool,
}

impl Default for PluginWindowBehavior {
    fn default() -> Self {
        Self {
            resizable: true,
            center: true,
            singleton: true,
            persist_bounds: true,
            always_on_top: false,
            skip_taskbar: false,
            fullscreen: false,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginWindow {
    pub id: String,
    pub entry: String,
    #[serde(default)]
    pub primary: bool,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub decorations: PluginWindowDecorations,
    #[serde(default)]
    pub size: PluginWindowSize,
    #[serde(default)]
    pub behavior: PluginWindowBehavior,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginPermission {
    pub name: String,
    #[serde(default)]
    pub scope: Option<Value>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginContributions {
    #[serde(default)]
    pub commands: Vec<Value>,
    #[serde(default)]
    pub views: Vec<Value>,
    #[serde(default)]
    pub chat_actions: Vec<Value>,
    #[serde(default)]
    pub file_openers: Vec<Value>,
    #[serde(default)]
    pub settings: Vec<Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginManifest {
    pub manifest_version: u32,
    #[serde(default = "default_api_version")]
    pub api_version: u32,
    pub id: String,
    pub name: String,
    pub version: String,
    pub publisher: String,
    #[serde(default)]
    pub description: String,
    pub engines: PluginEngine,
    pub main: String,
    #[serde(default)]
    pub ui: Option<String>,
    #[serde(default)]
    pub windows: Vec<PluginWindow>,
    #[serde(default)]
    pub icon: Option<String>,
    #[serde(default)]
    pub activation_events: Vec<String>,
    #[serde(default)]
    pub contributes: PluginContributions,
    #[serde(default)]
    pub permissions: Vec<PluginPermission>,
}

impl PluginManifest {
    pub fn validate(
        &self,
        content_root: &Path,
        app_version: &str,
    ) -> Result<(), String> {
        if self.manifest_version != 1 {
            return Err("PLUGIN_MANIFEST_VERSION_UNSUPPORTED".into());
        }
        if self.api_version != 1 {
            return Err("PLUGIN_API_VERSION_UNSUPPORTED".into());
        }
        validate_plugin_id(&self.id)?;
        Version::parse(&self.version).map_err(|_| "PLUGIN_VERSION_INVALID".to_string())?;

        let app_version =
            Version::parse(app_version).map_err(|_| "APP_VERSION_INVALID".to_string())?;
        let requirement = VersionReq::parse(&self.engines.linyu)
            .map_err(|_| "PLUGIN_ENGINE_VERSION_INVALID".to_string())?;
        if !requirement.matches(&app_version) {
            return Err("PLUGIN_ENGINE_INCOMPATIBLE".into());
        }

        if self.name.trim().is_empty() || self.name.chars().count() > 80 {
            return Err("PLUGIN_NAME_INVALID".into());
        }
        if self.publisher.trim().is_empty() || self.publisher.chars().count() > 80 {
            return Err("PLUGIN_PUBLISHER_INVALID".into());
        }

        validate_entry(content_root, &self.main, "PLUGIN_MAIN_INVALID")?;
        if let Some(ui) = &self.ui {
            validate_entry(content_root, ui, "PLUGIN_UI_INVALID")?;
        }
        self.validate_windows(content_root)?;
        if let Some(icon) = &self.icon {
            validate_entry(content_root, icon, "PLUGIN_ICON_INVALID")?;
        }

        let mut permission_names = HashSet::new();
        for permission in &self.permissions {
            if !ALLOWED_PERMISSIONS.contains(&permission.name.as_str()) {
                return Err(format!("PLUGIN_PERMISSION_UNSUPPORTED:{}", permission.name));
            }
            if !permission_names.insert(permission.name.as_str()) {
                return Err(format!("PLUGIN_PERMISSION_DUPLICATED:{}", permission.name));
            }
            if permission.name == "network.fetch" {
                validate_network_scope(permission.scope.as_ref())?;
            }
        }
        Ok(())
    }

    fn validate_windows(
        &self,
        content_root: &Path,
    ) -> Result<(), String> {
        let mut ids = HashSet::new();
        let mut primary_count = 0;
        for window in &self.windows {
            validate_window_id(&window.id)?;
            if !ids.insert(window.id.as_str()) {
                return Err(format!("PLUGIN_WINDOW_DUPLICATED:{}", window.id));
            }
            if window.primary {
                primary_count += 1;
            }
            validate_entry(content_root, &window.entry, "PLUGIN_WINDOW_ENTRY_INVALID")?;
            if !matches!(window.decorations.mode.as_str(), "native" | "linyu" | "none") {
                return Err("PLUGIN_WINDOW_DECORATIONS_INVALID".into());
            }
            if window.decorations.tabs && window.decorations.mode != "linyu" {
                return Err("PLUGIN_WINDOW_TABS_REQUIRE_LINYU_DECORATIONS".into());
            }
            validate_window_size(&window.size)?;
            if window.behavior.always_on_top
                && !self.permissions.iter().any(|item| item.name == "window.alwaysOnTop")
            {
                return Err("PLUGIN_WINDOW_ALWAYS_ON_TOP_PERMISSION_REQUIRED".into());
            }
        }
        if primary_count > 1 {
            return Err("PLUGIN_WINDOW_PRIMARY_DUPLICATED".into());
        }
        if !self.windows.is_empty() && primary_count == 0 {
            return Err("PLUGIN_WINDOW_PRIMARY_REQUIRED".into());
        }
        Ok(())
    }

    pub fn window(
        &self,
        window_id: &str,
    ) -> Option<PluginWindow> {
        if let Some(window) = self.windows.iter().find(|window| window.id == window_id) {
            return Some(window.clone());
        }
        if window_id == "main" {
            return self.ui.as_ref().map(|entry| PluginWindow {
                id: "main".into(),
                entry: entry.clone(),
                primary: true,
                title: self.name.clone(),
                decorations: PluginWindowDecorations::default(),
                size: PluginWindowSize::default(),
                behavior: PluginWindowBehavior::default(),
            });
        }
        None
    }

    pub fn primary_window(&self) -> Option<PluginWindow> {
        self.windows.iter().find(|window| window.primary).cloned().or_else(|| self.window("main"))
    }

    pub fn entry_path(
        &self,
        content_root: &Path,
        kind: &str,
    ) -> Result<PathBuf, String> {
        let entry = match kind {
            "worker" => self.main.clone(),
            "ui" => self
                .primary_window()
                .map(|window| window.entry)
                .ok_or_else(|| "PLUGIN_UI_NOT_DECLARED".to_string())?,
            "icon" => self.icon.clone().ok_or_else(|| "PLUGIN_ICON_NOT_DECLARED".to_string())?,
            _ => return Err("PLUGIN_ENTRY_KIND_INVALID".into()),
        };
        safe_join(content_root, &entry)
    }
}

fn validate_window_id(id: &str) -> Result<(), String> {
    if id.is_empty()
        || id.len() > 64
        || !id
            .chars()
            .all(|character| character.is_ascii_alphanumeric() || matches!(character, '-' | '_'))
    {
        return Err("PLUGIN_WINDOW_ID_INVALID".into());
    }
    Ok(())
}

fn validate_window_size(size: &PluginWindowSize) -> Result<(), String> {
    let in_range =
        |value: f64, min: f64, max: f64| value.is_finite() && value >= min && value <= max;
    if !in_range(size.width, 320.0, 3840.0)
        || !in_range(size.height, 240.0, 2160.0)
        || !in_range(size.min_width, 240.0, 3840.0)
        || !in_range(size.min_height, 160.0, 2160.0)
        || size.min_width > size.width
        || size.min_height > size.height
        || size.max_width.is_some_and(|value| !in_range(value, size.width, 7680.0))
        || size.max_height.is_some_and(|value| !in_range(value, size.height, 4320.0))
    {
        return Err("PLUGIN_WINDOW_SIZE_INVALID".into());
    }
    Ok(())
}

pub fn validate_plugin_id(id: &str) -> Result<(), String> {
    if id.len() < 3 || id.len() > 128 || id.starts_with('.') || id.ends_with('.') {
        return Err("PLUGIN_ID_INVALID".into());
    }
    if !id
        .chars()
        .all(|character| character.is_ascii_alphanumeric() || matches!(character, '.' | '-' | '_'))
    {
        return Err("PLUGIN_ID_INVALID".into());
    }
    Ok(())
}

pub fn safe_join(
    root: &Path,
    relative: &str,
) -> Result<PathBuf, String> {
    let path = Path::new(relative);
    if path.as_os_str().is_empty()
        || path.components().any(|component| !matches!(component, Component::Normal(_)))
    {
        return Err("PLUGIN_PATH_INVALID".into());
    }
    Ok(root.join(path))
}

fn validate_entry(
    root: &Path,
    relative: &str,
    error: &str,
) -> Result<(), String> {
    let path = safe_join(root, relative).map_err(|_| error.to_string())?;
    if !path.is_file() {
        return Err(error.into());
    }
    Ok(())
}

fn validate_network_scope(scope: Option<&Value>) -> Result<(), String> {
    let hosts = scope
        .and_then(|value| value.get("hosts"))
        .and_then(Value::as_array)
        .filter(|hosts| !hosts.is_empty())
        .ok_or_else(|| "PLUGIN_NETWORK_SCOPE_INVALID".to_string())?;
    for host in hosts {
        let value = host.as_str().ok_or_else(|| "PLUGIN_NETWORK_SCOPE_INVALID".to_string())?;
        let url = Url::parse(value).map_err(|_| "PLUGIN_NETWORK_SCOPE_INVALID".to_string())?;
        if url.scheme() != "https"
            || url.cannot_be_a_base()
            || url.path() != "/"
            || url.query().is_some()
            || url.fragment().is_some()
            || url.origin().ascii_serialization() != value.trim_end_matches('/')
        {
            return Err("PLUGIN_NETWORK_SCOPE_INVALID".into());
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use uuid::Uuid;

    fn fixture_root() -> PathBuf {
        let root = std::env::temp_dir().join(format!("linyu-plugin-test-{}", Uuid::new_v4()));
        fs::create_dir_all(root.join("dist")).unwrap();
        fs::write(root.join("dist/worker.js"), "linyu.register({})").unwrap();
        root
    }

    fn fixture_manifest() -> PluginManifest {
        PluginManifest {
            manifest_version: 1,
            api_version: 1,
            id: "official.example".into(),
            name: "Example".into(),
            version: "1.0.0".into(),
            publisher: "Linyu".into(),
            description: String::new(),
            engines: PluginEngine { linyu: ">=0.1.0".into() },
            main: "dist/worker.js".into(),
            ui: None,
            windows: Vec::new(),
            icon: None,
            activation_events: vec!["onStartup".into()],
            contributes: PluginContributions::default(),
            permissions: vec![PluginPermission { name: "storage".into(), scope: None }],
        }
    }

    #[test]
    fn validates_a_well_formed_manifest() {
        let root = fixture_root();
        let mut manifest = fixture_manifest();
        manifest
            .permissions
            .push(PluginPermission { name: "user.profile.read".into(), scope: None });
        let result = manifest.validate(&root, "0.1.0");
        let _ = fs::remove_dir_all(root);
        assert!(result.is_ok());
    }

    #[test]
    fn rejects_path_traversal_and_absolute_entries() {
        let root = fixture_root();
        let mut traversal = fixture_manifest();
        traversal.main = "../worker.js".into();
        assert_eq!(traversal.validate(&root, "0.1.0"), Err("PLUGIN_MAIN_INVALID".into()));

        let mut absolute = fixture_manifest();
        absolute.main = root.join("dist/worker.js").to_string_lossy().into_owned();
        assert_eq!(absolute.validate(&root, "0.1.0"), Err("PLUGIN_MAIN_INVALID".into()));
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn rejects_unsupported_permission_and_engine() {
        let root = fixture_root();
        let mut permission = fixture_manifest();
        permission.permissions[0].name = "system.unrestricted".into();
        assert_eq!(
            permission.validate(&root, "0.1.0"),
            Err("PLUGIN_PERMISSION_UNSUPPORTED:system.unrestricted".into())
        );

        let mut engine = fixture_manifest();
        engine.engines.linyu = ">=9.0.0".into();
        assert_eq!(engine.validate(&root, "0.1.0"), Err("PLUGIN_ENGINE_INCOMPATIBLE".into()));
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn validates_declared_windows_and_rejects_invalid_combinations() {
        let root = fixture_root();
        fs::write(root.join("dist/ui.html"), "<!doctype html>").unwrap();
        let mut manifest = fixture_manifest();
        manifest.ui = None;
        manifest.windows = vec![PluginWindow {
            id: "main".into(),
            entry: "dist/ui.html".into(),
            primary: true,
            title: "Main".into(),
            decorations: PluginWindowDecorations::default(),
            size: PluginWindowSize::default(),
            behavior: PluginWindowBehavior::default(),
        }];
        assert!(manifest.validate(&root, "0.1.0").is_ok());

        manifest.windows[0].decorations.mode = "native".into();
        manifest.windows[0].decorations.tabs = true;
        assert_eq!(
            manifest.validate(&root, "0.1.0"),
            Err("PLUGIN_WINDOW_TABS_REQUIRE_LINYU_DECORATIONS".into())
        );

        manifest.windows[0].decorations.tabs = false;
        manifest.windows[0].size.min_width = 1200.0;
        assert_eq!(manifest.validate(&root, "0.1.0"), Err("PLUGIN_WINDOW_SIZE_INVALID".into()));
        let _ = fs::remove_dir_all(root);
    }
}
