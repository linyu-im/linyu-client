use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeManifest {
    pub id: String,
    pub name: String,
    pub description: String,
    pub protocol: String,
    pub installed: bool,
    pub version: Option<String>,
    pub executable_path: Option<String>,
    pub source: String,
    pub install_state: String,
    pub supports: Vec<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeUpdateInfo {
    pub current_version: Option<String>,
    pub latest_version: Option<String>,
    pub update_available: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderProfile {
    pub id: String,
    pub name: String,
    pub kind: String,
    pub base_url: String,
    pub models: Vec<String>,
    pub default_model: String,
    pub api_key_env: String,
    pub has_api_key: bool,
    pub enabled: bool,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderInput {
    pub id: String,
    pub name: String,
    pub kind: String,
    pub base_url: String,
    pub models: Vec<String>,
    pub default_model: String,
    pub api_key: Option<String>,
    pub enabled: bool,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderTestResult {
    pub ok: bool,
    pub latency_ms: u128,
    pub models: Vec<String>,
    pub message: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkSettings {
    pub active_runtime_id: String,
    pub active_provider_id: Option<String>,
    pub active_model: Option<String>,
    pub approval_mode: String,
    pub work_mode: String,
    pub providers: Vec<ProviderProfile>,
    pub disabled_skills: Vec<String>,
}

impl Default for WorkSettings {
    fn default() -> Self {
        Self {
            active_runtime_id: "reasonix".into(),
            active_provider_id: None,
            active_model: None,
            approval_mode: "ask".into(),
            work_mode: "balanced".into(),
            providers: Vec::new(),
            disabled_skills: Vec::new(),
        }
    }
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillLocalState {
    pub installed_ids: Vec<String>,
    pub disabled_ids: Vec<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkEvent {
    pub runtime_id: String,
    pub kind: String,
    pub session_id: Option<String>,
    pub request_id: Option<String>,
    pub payload: Value,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkStatus {
    pub runtime: RuntimeManifest,
    pub provider: Option<ProviderProfile>,
    pub model: Option<String>,
    pub approval_mode: String,
    pub work_mode: String,
    pub active_sessions: usize,
    pub installed_skills: usize,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionNewInput {
    pub runtime_id: String,
    pub cwd: Option<String>,
    pub scope_mode: String,
    pub conversation_id: String,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionPromptInput {
    pub runtime_id: String,
    pub session_id: String,
    pub text: String,
    pub attachments: Vec<SessionAttachmentInput>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionAttachmentInput {
    pub path: String,
    pub name: String,
    pub mime_type: String,
    pub category: String,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionInput {
    pub runtime_id: String,
    pub session_id: String,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionConfigInput {
    pub runtime_id: String,
    pub session_id: String,
    pub option_id: String,
    pub value: String,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PermissionInput {
    pub runtime_id: String,
    pub request_id: String,
    pub option_id: Option<String>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PreferencesInput {
    pub active_runtime_id: String,
    pub active_provider_id: Option<String>,
    pub active_model: Option<String>,
    pub approval_mode: String,
    pub work_mode: String,
}
