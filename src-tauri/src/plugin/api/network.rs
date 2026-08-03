use serde_json::{json, Value};
use url::Url;

use super::{context::PluginCallContext, permissions};

pub async fn fetch(
    context: &PluginCallContext<'_>,
    params: Value,
) -> Result<Value, String> {
    let permission = permissions::require(context, "network.fetch")?;
    let url = string_param(&params, "url")?;
    let parsed = Url::parse(url).map_err(|_| "PLUGIN_NETWORK_URL_INVALID".to_string())?;
    if parsed.scheme() != "https" {
        return Err("PLUGIN_NETWORK_SCHEME_DENIED".into());
    }
    if let Some(scope) = permission.scope.as_ref() {
        let hosts = scope.get("hosts").and_then(Value::as_array).cloned().unwrap_or_default();
        let origin = parsed.origin().ascii_serialization();
        if !hosts.is_empty() && !hosts.iter().any(|item| item.as_str() == Some(origin.as_str())) {
            return Err("PLUGIN_NETWORK_HOST_DENIED".into());
        }
    }
    let method = params
        .get("method")
        .and_then(Value::as_str)
        .unwrap_or("GET")
        .to_ascii_uppercase()
        .parse::<reqwest::Method>()
        .map_err(|_| "PLUGIN_NETWORK_METHOD_DENIED".to_string())?;
    if !matches!(
        method,
        reqwest::Method::GET
            | reqwest::Method::POST
            | reqwest::Method::PUT
            | reqwest::Method::DELETE
    ) {
        return Err("PLUGIN_NETWORK_METHOD_DENIED".into());
    }
    let client = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::none())
        .build()
        .map_err(|error| error.to_string())?;
    let mut request = client.request(method, url);
    if let Some(headers) = params.get("headers").and_then(Value::as_object) {
        for (name, value) in headers {
            if matches!(name.to_ascii_lowercase().as_str(), "accept" | "content-type") {
                if let Some(value) = value.as_str() {
                    request = request.header(name, value);
                }
            }
        }
    }
    if let Some(body) = params.get("body").and_then(Value::as_str) {
        if body.len() > 512 * 1024 {
            return Err("PLUGIN_NETWORK_BODY_TOO_LARGE".into());
        }
        request = request.body(body.to_owned());
    }
    let response =
        request.send().await.map_err(|error| format!("PLUGIN_NETWORK_FAILED:{error}"))?;
    if response.content_length().unwrap_or_default() > 1024 * 1024 {
        return Err("PLUGIN_NETWORK_RESPONSE_TOO_LARGE".into());
    }
    let status = response.status().as_u16();
    let content_type = response
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .unwrap_or_default()
        .to_string();
    let body = response.bytes().await.map_err(|error| error.to_string())?;
    if body.len() > 1024 * 1024 {
        return Err("PLUGIN_NETWORK_RESPONSE_TOO_LARGE".into());
    }
    Ok(json!({
        "status": status,
        "contentType": content_type,
        "body": String::from_utf8_lossy(&body)
    }))
}

fn string_param<'a>(
    params: &'a Value,
    key: &str,
) -> Result<&'a str, String> {
    params.get(key).and_then(Value::as_str).ok_or_else(|| format!("PLUGIN_API_PARAM_MISSING:{key}"))
}
