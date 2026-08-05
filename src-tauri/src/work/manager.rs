use std::{
    collections::HashMap,
    fs,
    path::{Path, PathBuf},
    process::Command,
    sync::Arc,
};

use std::time::{Duration, Instant};
use tauri::AppHandle;
use tokio::sync::Mutex;

use super::{acp::AcpConnection, types::*};

const WORK_KEYRING_SERVICE: &str = "chat.linyu.work-agent";

fn read_provider_key(provider_id: &str) -> Option<String> {
    keyring::Entry::new(WORK_KEYRING_SERVICE, provider_id)
        .ok()
        .and_then(|entry| entry.get_password().ok())
        .filter(|value| !value.trim().is_empty())
}

fn save_provider_key(
    provider_id: &str,
    api_key: &str,
) -> Result<(), String> {
    let secret = api_key.trim();
    let entry = keyring::Entry::new(WORK_KEYRING_SERVICE, provider_id)
        .map_err(|error| format!("WORK_KEYRING_FAILED: {error}"))?;
    entry.set_password(secret).map_err(|error| format!("WORK_KEYRING_FAILED: {error}"))?;

    let persisted =
        entry.get_password().map_err(|error| format!("WORK_KEYRING_FAILED: {error}"))?;
    if persisted != secret {
        return Err("WORK_KEYRING_FAILED: credential verification failed".into());
    }
    Ok(())
}

pub struct WorkManager {
    root: PathBuf,
    settings: Mutex<WorkSettings>,
    connections: Mutex<HashMap<String, Arc<AcpConnection>>>,
}

impl WorkManager {
    pub fn initialize(root: PathBuf) -> Result<Self, String> {
        fs::create_dir_all(root.join("runtime-data")).map_err(|error| error.to_string())?;
        fs::create_dir_all(root.join("downloads")).map_err(|error| error.to_string())?;
        let settings_path = root.join("settings.json");
        let mut settings: WorkSettings = if settings_path.exists() {
            serde_json::from_slice(&fs::read(&settings_path).map_err(|error| error.to_string())?)
                .unwrap_or_default()
        } else {
            WorkSettings::default()
        };
        for provider in &mut settings.providers {
            provider.models = provider
                .models
                .iter()
                .map(|model| normalize_provider_model(&provider.id, model))
                .collect();
            provider.default_model =
                normalize_provider_model(&provider.id, &provider.default_model);
            let is_legacy_deepseek_preset = provider.id == "deepseek"
                && provider.base_url.trim_end_matches('/') == "https://api.deepseek.com"
                && provider.models.iter().all(|model| {
                    ["deepseek-chat", "deepseek-reasoner", "deepseek-v4-flash"]
                        .contains(&model.as_str())
                });
            if is_legacy_deepseek_preset {
                provider.models = vec!["deepseek-v4-flash".into(), "deepseek-v4-pro".into()];
                provider.default_model = "deepseek-v4-flash".into();
            }
            // The settings flag is only a display cache. The credential store is
            // the source of truth so a stale flag can never report a missing key
            // as successfully saved.
            provider.has_api_key = read_provider_key(&provider.id).is_some();
        }
        if let (Some(provider_id), Some(model)) =
            (settings.active_provider_id.as_deref(), settings.active_model.as_deref())
        {
            let normalized = normalize_provider_model(provider_id, model);
            settings.active_model =
                settings.providers.iter().find(|provider| provider.id == provider_id).map(
                    |provider| {
                        if provider.models.contains(&normalized) {
                            normalized
                        } else {
                            provider.default_model.clone()
                        }
                    },
                );
        }
        let settings_bytes =
            serde_json::to_vec_pretty(&settings).map_err(|error| error.to_string())?;
        fs::write(&settings_path, settings_bytes).map_err(|error| error.to_string())?;
        Ok(Self { root, settings: Mutex::new(settings), connections: Mutex::new(HashMap::new()) })
    }

    pub async fn runtimes(&self) -> Vec<RuntimeManifest> {
        vec![self.detect_reasonix()]
    }

    pub fn detect_reasonix(&self) -> RuntimeManifest {
        let executable = self.find_reasonix();
        let version = executable.as_ref().and_then(|path| {
            runtime_command(path).arg("--version").output().ok().and_then(|output| {
                let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
                let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
                let value = if stdout.is_empty() { stderr } else { stdout };
                (!value.is_empty()).then_some(value)
            })
        });
        RuntimeManifest {
            id: "reasonix".into(),
            name: "Reasonix".into(),
            description: "ACP work-agent runtime".into(),
            protocol: "acp-v1".into(),
            installed: executable.is_some(),
            version,
            executable_path: executable.map(|path| path.to_string_lossy().to_string()),
            source: "github-release".into(),
            install_state: "idle".into(),
            supports: vec![
                "streaming".into(),
                "tools".into(),
                "permissions".into(),
                "skills".into(),
                "sessions".into(),
            ],
        }
    }

    fn find_reasonix(&self) -> Option<PathBuf> {
        let executable_name = if cfg!(windows) { "reasonix.exe" } else { "reasonix" };
        let managed_root = self.root.join("runtimes").join("reasonix");
        let mut candidates = vec![
            managed_root.join(executable_name),
            managed_root.join("node_modules").join(".bin").join(if cfg!(windows) {
                "reasonix.cmd"
            } else {
                "reasonix"
            }),
        ];
        if cfg!(windows) {
            if let Ok(app_data) = std::env::var("APPDATA") {
                candidates.push(PathBuf::from(app_data).join("npm").join("reasonix.cmd"));
            }
            if let Ok(local_data) = std::env::var("LOCALAPPDATA") {
                let program = PathBuf::from(local_data).join("Programs").join("Reasonix");
                candidates.push(program.join("reasonix.exe"));
                candidates.push(program.join("resources").join("reasonix.exe"));
            }
        }
        {
            let mut locate = Command::new(if cfg!(windows) { "where.exe" } else { "which" });
            locate.arg("reasonix");
            super::process::hide_console(&mut locate);
            if let Ok(output) = locate.output() {
                if output.status.success() {
                    if let Some(line) = String::from_utf8_lossy(&output.stdout).lines().next() {
                        candidates.insert(0, PathBuf::from(line.trim()));
                    }
                }
            }
        }
        candidates.into_iter().find(|path| path.is_file())
    }

    pub async fn settings(&self) -> WorkSettings {
        self.settings.lock().await.clone()
    }

    pub async fn save_preferences(
        &self,
        input: PreferencesInput,
    ) -> Result<WorkSettings, String> {
        if input.active_runtime_id != "reasonix"
            || !["ask", "auto", "yolo"].contains(&input.approval_mode.as_str())
            || !["economy", "balanced", "delivery"].contains(&input.work_mode.as_str())
        {
            return Err("WORK_PREFERENCES_INVALID".into());
        }
        let mut settings = self.settings.lock().await;
        if let Some(provider_id) = input.active_provider_id.as_ref() {
            let provider = settings
                .providers
                .iter()
                .find(|provider| &provider.id == provider_id && provider.enabled)
                .ok_or("WORK_PROVIDER_NOT_FOUND")?;
            if let Some(model) = input.active_model.as_ref() {
                if !provider.models.contains(model) {
                    return Err("WORK_MODEL_NOT_FOUND".into());
                }
            }
        }
        settings.active_runtime_id = input.active_runtime_id;
        settings.active_provider_id = input.active_provider_id;
        settings.active_model = input.active_model;
        settings.approval_mode = input.approval_mode;
        settings.work_mode = input.work_mode;
        self.persist_settings(&settings)?;
        self.write_reasonix_config(&settings)?;
        Ok(settings.clone())
    }

    pub async fn save_provider(
        &self,
        input: ProviderInput,
    ) -> Result<ProviderProfile, String> {
        if input.id.trim().is_empty() || input.name.trim().is_empty() || input.models.is_empty() {
            return Err("WORK_PROVIDER_INVALID".into());
        }
        let id = input.id.trim().to_ascii_lowercase().replace(' ', "-");
        let models = input
            .models
            .iter()
            .map(|model| normalize_provider_model(&id, model))
            .filter(|model| !model.is_empty())
            .collect::<Vec<_>>();
        let default_model = normalize_provider_model(&id, &input.default_model);
        if models.is_empty() || !models.contains(&default_model) {
            return Err("WORK_PROVIDER_INVALID".into());
        }
        let env_name = format!("LINYU_AGENT_KEY_{}", id.to_ascii_uppercase().replace('-', "_"));
        let submitted_key = input.api_key.as_ref().filter(|value| !value.trim().is_empty());
        if let Some(key) = submitted_key {
            save_provider_key(&id, key)?;
        }
        let has_api_key = read_provider_key(&id).is_some();
        let profile = ProviderProfile {
            id,
            name: input.name.trim().to_string(),
            kind: input.kind,
            base_url: input.base_url.trim_end_matches('/').to_string(),
            models,
            default_model,
            api_key_env: env_name,
            has_api_key,
            enabled: input.enabled,
        };
        let mut settings = self.settings.lock().await;
        if let Some(index) = settings.providers.iter().position(|item| item.id == profile.id) {
            settings.providers[index] = profile.clone();
        } else {
            settings.providers.push(profile.clone());
        }
        if settings.active_provider_id.is_none() {
            settings.active_provider_id = Some(profile.id.clone());
            settings.active_model = Some(profile.default_model.clone());
        } else if settings.active_provider_id.as_deref() == Some(&profile.id) {
            if !profile.enabled {
                let fallback = settings
                    .providers
                    .iter()
                    .find(|provider| provider.enabled)
                    .map(|provider| (provider.id.clone(), provider.default_model.clone()));
                settings.active_provider_id = fallback.as_ref().map(|value| value.0.clone());
                settings.active_model = fallback.map(|value| value.1);
            } else if settings
                .active_model
                .as_ref()
                .map_or(true, |model| !profile.models.contains(model))
            {
                settings.active_model = Some(profile.default_model.clone());
            }
        }
        self.persist_settings(&settings)?;
        self.write_reasonix_config(&settings)?;
        Ok(profile)
    }

    pub async fn test_provider(
        &self,
        input: ProviderInput,
    ) -> Result<ProviderTestResult, String> {
        let base_url = input.base_url.trim_end_matches('/');
        reqwest::Url::parse(base_url).map_err(|_| "WORK_PROVIDER_URL_INVALID")?;
        let api_key = input
            .api_key
            .as_deref()
            .filter(|value| !value.trim().is_empty())
            .map(str::to_string)
            .or_else(|| read_provider_key(input.id.trim()))
            .ok_or("WORK_PROVIDER_KEY_REQUIRED")?;
        let endpoint = if base_url.ends_with("/v1") {
            format!("{base_url}/models")
        } else if input.kind == "anthropic" {
            format!("{base_url}/v1/models")
        } else {
            format!("{base_url}/models")
        };
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(15))
            .build()
            .map_err(|error| format!("WORK_PROVIDER_TEST_FAILED: {error}"))?;
        let mut request = client.get(endpoint);
        if input.kind == "anthropic" {
            request =
                request.header("x-api-key", api_key).header("anthropic-version", "2023-06-01");
        } else {
            request = request.bearer_auth(api_key);
        }
        let started = Instant::now();
        let response = request.send().await.map_err(|error| {
            if error.is_timeout() {
                "WORK_PROVIDER_TIMEOUT".to_string()
            } else {
                format!("WORK_PROVIDER_TEST_FAILED: {error}")
            }
        })?;
        let status = response.status();
        if status.as_u16() == 401 || status.as_u16() == 403 {
            return Err("WORK_PROVIDER_KEY_INVALID".into());
        }
        if status.as_u16() == 404 {
            return Err("WORK_PROVIDER_ENDPOINT_NOT_FOUND".into());
        }
        if !status.is_success() {
            return Err(format!("WORK_PROVIDER_HTTP_ERROR: {}", status.as_u16()));
        }
        let payload: serde_json::Value = response
            .json()
            .await
            .map_err(|error| format!("WORK_PROVIDER_RESPONSE_INVALID: {error}"))?;
        let models = payload
            .get("data")
            .or_else(|| payload.get("models"))
            .and_then(serde_json::Value::as_array)
            .map(|items| {
                items
                    .iter()
                    .filter_map(|item| item.get("id").and_then(serde_json::Value::as_str))
                    .map(str::to_string)
                    .collect::<Vec<_>>()
            })
            .unwrap_or_default();
        Ok(ProviderTestResult {
            ok: true,
            latency_ms: started.elapsed().as_millis(),
            models,
            message: "WORK_PROVIDER_TEST_OK".into(),
        })
    }

    pub async fn delete_provider(
        &self,
        id: &str,
    ) -> Result<(), String> {
        let mut settings = self.settings.lock().await;
        settings.providers.retain(|item| item.id != id);
        if settings.active_provider_id.as_deref() == Some(id) {
            let fallback = settings
                .providers
                .iter()
                .find(|provider| provider.enabled)
                .map(|provider| (provider.id.clone(), provider.default_model.clone()));
            settings.active_provider_id = fallback.as_ref().map(|value| value.0.clone());
            settings.active_model = fallback.map(|value| value.1);
        }
        if let Ok(entry) = keyring::Entry::new(WORK_KEYRING_SERVICE, id) {
            let _ = entry.delete_credential();
        }
        self.persist_settings(&settings)?;
        self.write_reasonix_config(&settings)
    }

    pub async fn install_skill(
        &self,
        id: &str,
        content: &str,
    ) -> Result<(), String> {
        let id = sanitize_skill_id(id)?;
        if content.trim().is_empty() {
            return Err("WORK_SKILL_CONTENT_REQUIRED".into());
        }
        let root = self.reasonix_home().join("skills").join(&id);
        fs::create_dir_all(&root).map_err(|error| error.to_string())?;
        fs::write(root.join("SKILL.md"), content).map_err(|error| error.to_string())?;
        let settings = self.settings.lock().await.clone();
        self.write_reasonix_config(&settings)?;
        self.restart_runtime("reasonix").await;
        Ok(())
    }

    pub async fn uninstall_skill(
        &self,
        id: &str,
    ) -> Result<(), String> {
        let id = sanitize_skill_id(id)?;
        let root = self.reasonix_home().join("skills").join(&id);
        if root.exists() {
            fs::remove_dir_all(&root).map_err(|error| error.to_string())?;
        }
        let mut settings = self.settings.lock().await;
        settings.disabled_skills.retain(|value| value != &id);
        self.persist_settings(&settings)?;
        self.write_reasonix_config(&settings)?;
        drop(settings);
        self.restart_runtime("reasonix").await;
        Ok(())
    }

    pub async fn set_skill_enabled(
        &self,
        id: &str,
        enabled: bool,
    ) -> Result<(), String> {
        let id = sanitize_skill_id(id)?;
        let mut settings = self.settings.lock().await;
        settings.disabled_skills.retain(|value| value != &id);
        if !enabled {
            settings.disabled_skills.push(id.clone());
        }
        self.persist_settings(&settings)?;
        self.write_reasonix_config(&settings)?;
        drop(settings);
        self.restart_runtime("reasonix").await;
        Ok(())
    }

    pub async fn skill_local_state(&self) -> SkillLocalState {
        let settings = self.settings.lock().await;
        SkillLocalState {
            installed_ids: self.scan_installed_skill_ids(),
            disabled_ids: settings.disabled_skills.clone(),
        }
    }

    pub fn installed_skill_count(&self) -> usize {
        self.scan_installed_skill_ids().len()
    }

    fn scan_installed_skill_ids(&self) -> Vec<String> {
        let skills_dir = self.reasonix_home().join("skills");
        let mut installed_ids = Vec::new();
        let Ok(entries) = fs::read_dir(skills_dir) else {
            return installed_ids;
        };
        for entry in entries.flatten() {
            let path = entry.path();
            if !path.is_dir() || !path.join("SKILL.md").is_file() {
                continue;
            }
            if let Some(name) = path.file_name().and_then(|value| value.to_str()) {
                if sanitize_skill_id(name).is_ok() {
                    installed_ids.push(name.to_string());
                }
            }
        }
        installed_ids.sort();
        installed_ids
    }

    pub async fn connection(
        &self,
        app: AppHandle,
        runtime_id: &str,
    ) -> Result<Arc<AcpConnection>, String> {
        if let Some(connection) = self.connections.lock().await.get(runtime_id).cloned() {
            return Ok(connection);
        }
        if runtime_id != "reasonix" {
            return Err("WORK_RUNTIME_UNSUPPORTED".into());
        }
        let executable = self.find_reasonix().ok_or("WORK_RUNTIME_NOT_INSTALLED")?;
        let settings = self.settings.lock().await.clone();
        if settings.providers.iter().all(|provider| !provider.enabled) {
            return Err("WORK_PROVIDER_NOT_CONFIGURED".into());
        }
        self.write_reasonix_config(&settings)?;
        let provider_envs = self.materialize_reasonix_env(&settings)?;
        let mut runtime_envs =
            vec![("REASONIX_HOME".into(), self.reasonix_home().to_string_lossy().to_string())];
        runtime_envs.extend(provider_envs);
        let connection = AcpConnection::spawn(
            app,
            runtime_id.to_string(),
            &executable.to_string_lossy(),
            &["acp".into()],
            &runtime_envs,
            &self.reasonix_home(),
        )
        .await
        .map_err(|error| {
            let _ = fs::remove_file(self.reasonix_home().join(".env"));
            error
        })?;
        self.connections.lock().await.insert(runtime_id.to_string(), connection.clone());
        Ok(connection)
    }

    pub async fn session_count(&self) -> usize {
        self.connections.lock().await.len()
    }

    pub async fn restart_runtime(
        &self,
        runtime_id: &str,
    ) {
        if let Some(connection) = self.connections.lock().await.remove(runtime_id) {
            let _ = connection.stop().await;
        }
        if runtime_id == "reasonix" {
            let _ = fs::remove_file(self.reasonix_home().join(".env"));
        }
    }

    pub fn root(&self) -> &Path {
        &self.root
    }

    pub fn reasonix_home(&self) -> PathBuf {
        self.root.join("runtime-data").join("reasonix")
    }

    fn persist_settings(
        &self,
        settings: &WorkSettings,
    ) -> Result<(), String> {
        let bytes = serde_json::to_vec_pretty(settings).map_err(|error| error.to_string())?;
        fs::write(self.root.join("settings.json"), bytes).map_err(|error| error.to_string())
    }

    fn write_reasonix_config(
        &self,
        settings: &WorkSettings,
    ) -> Result<(), String> {
        let home = self.reasonix_home();
        fs::create_dir_all(home.join("skills")).map_err(|error| error.to_string())?;
        let active = settings.active_provider_id.as_ref().and_then(|id| {
            settings.providers.iter().find(|provider| &provider.id == id && provider.enabled)
        });
        let mut config = String::new();
        if let Some(provider) = active {
            config.push_str(&format!(
                "config_version = 5\ndefault_model = \"{}\"\n",
                toml_escape(&provider.id)
            ));
        }
        config.push_str(
            "[environment]\nenabled = true\n\n[tools]\nenabled = []\nbash_timeout_seconds = 120\n",
        );
        if !settings.disabled_skills.is_empty() {
            let values = settings
                .disabled_skills
                .iter()
                .map(|value| format!("\"{}\"", toml_escape(value)))
                .collect::<Vec<_>>()
                .join(", ");
            config.push_str(&format!("\n[skills]\ndisabled_skills = [{values}]\n"));
        }
        for provider in settings.providers.iter().filter(|provider| provider.enabled) {
            let default_model = if active.map(|item| item.id.as_str()) == Some(provider.id.as_str())
            {
                settings.active_model.as_deref().unwrap_or(&provider.default_model)
            } else {
                &provider.default_model
            };
            let models = provider
                .models
                .iter()
                .map(|model| format!("\"{}\"", toml_escape(model)))
                .collect::<Vec<_>>()
                .join(", ");
            config.push_str(&format!(
                "\n[[providers]]\nname = \"{}\"\nkind = \"{}\"\nbase_url = \"{}\"\nmodels = [{}]\ndefault = \"{}\"\napi_key_env = \"{}\"\n",
                toml_escape(&provider.id),
                toml_escape(&provider.kind),
                toml_escape(&provider.base_url),
                models,
                toml_escape(default_model),
                toml_escape(&provider.api_key_env)
            ));
        }
        let target = home.join("config.toml");
        let temporary = home.join("config.toml.tmp");
        fs::write(&temporary, config).map_err(|error| error.to_string())?;
        fs::rename(temporary, target).map_err(|error| error.to_string())
    }

    fn materialize_reasonix_env(
        &self,
        settings: &WorkSettings,
    ) -> Result<Vec<(String, String)>, String> {
        let mut env_file = String::new();
        let mut provider_envs = Vec::new();
        for provider in settings.providers.iter().filter(|provider| provider.enabled) {
            let secret =
                read_provider_key(&provider.id).map(|value| value.replace(['\r', '\n'], ""));
            if let Some(secret) = secret.filter(|value| !value.is_empty()) {
                env_file.push_str(&format!("{}={}\n", provider.api_key_env, secret));
                provider_envs.push((provider.api_key_env.clone(), secret));
            } else if settings.active_provider_id.as_deref() == Some(&provider.id) {
                return Err("WORK_PROVIDER_KEY_REQUIRED".into());
            }
        }
        fs::write(self.reasonix_home().join(".env"), env_file)
            .map_err(|error| error.to_string())?;
        Ok(provider_envs)
    }
}

impl Drop for WorkManager {
    fn drop(&mut self) {
        let _ = fs::remove_file(self.reasonix_home().join(".env"));
    }
}

fn toml_escape(value: &str) -> String {
    value.replace('\\', "\\\\").replace('"', "\\\"")
}

fn sanitize_skill_id(id: &str) -> Result<String, String> {
    let id = id.trim();
    if id.is_empty()
        || id.contains("..")
        || id.contains('/')
        || id.contains('\\')
        || !id.chars().all(|ch| ch.is_ascii_alphanumeric() || ch == '-' || ch == '_')
    {
        return Err("WORK_SKILL_ID_INVALID".into());
    }
    Ok(id.to_string())
}

fn normalize_provider_model(
    provider_id: &str,
    model: &str,
) -> String {
    model.trim().strip_prefix(&format!("{provider_id}/")).unwrap_or(model.trim()).to_string()
}

fn runtime_command(path: &Path) -> Command {
    let mut command = if cfg!(windows)
        && matches!(path.extension().and_then(|value| value.to_str()), Some("cmd" | "bat"))
    {
        let mut command = Command::new("cmd");
        command.arg("/C").arg(path);
        command
    } else {
        Command::new(path)
    };
    super::process::hide_console(&mut command);
    command
}
