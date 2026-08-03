use super::manifest::PluginManifest;
use super::{PluginManager, PreparedInstall, PreparedPlugin};
use base64::{engine::general_purpose::STANDARD, Engine as _};
use ed25519_dalek::{Signature, Verifier, VerifyingKey};
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION};
use sha2::{Digest, Sha256};
use std::fs::{self, File};
use std::io::{Cursor, Read, Write};
use std::path::{Path, PathBuf};
use url::Url;
use uuid::Uuid;
use zip::ZipArchive;

const MAX_PACKAGE_BYTES: usize = 100 * 1024 * 1024;
const MAX_UNPACKED_BYTES: u64 = 250 * 1024 * 1024;
const MAX_ARCHIVE_FILES: usize = 2048;

pub struct PackageMetadata {
    pub application_id: Option<String>,
    pub icon_url: String,
    pub tags: Vec<String>,
    pub source: String,
}

pub async fn prepare_remote(
    manager: &PluginManager,
    url: &str,
    authorization: Option<&str>,
    expected_sha256: &str,
    signature: Option<&str>,
    metadata: PackageMetadata,
) -> Result<PreparedPlugin, String> {
    validate_remote_url(url)?;
    if expected_sha256.trim().is_empty() {
        return Err("PLUGIN_INTEGRITY_REQUIRED".into());
    }

    let mut headers = HeaderMap::new();
    if let Some(authorization) = authorization.filter(|value| !value.trim().is_empty()) {
        headers.insert(
            AUTHORIZATION,
            HeaderValue::from_str(authorization)
                .map_err(|_| "PLUGIN_AUTHORIZATION_INVALID".to_string())?,
        );
    }
    let client = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::custom(|attempt| {
            if attempt.previous().len() >= 3 {
                return attempt.stop();
            }
            let url = attempt.url();
            if url.scheme() == "https"
                || (cfg!(debug_assertions)
                    && url.scheme() == "http"
                    && matches!(url.host_str(), Some("127.0.0.1" | "localhost")))
            {
                attempt.follow()
            } else {
                attempt.stop()
            }
        }))
        .build()
        .map_err(|error| format!("PLUGIN_DOWNLOAD_FAILED:{error}"))?;
    let response = client
        .get(url)
        .headers(headers)
        .send()
        .await
        .map_err(|error| format!("PLUGIN_DOWNLOAD_FAILED:{error}"))?;
    if !response.status().is_success() {
        return Err(format!("PLUGIN_DOWNLOAD_HTTP_STATUS:{}", response.status().as_u16()));
    }
    if response.content_length().unwrap_or_default() > MAX_PACKAGE_BYTES as u64 {
        return Err("PLUGIN_PACKAGE_TOO_LARGE".into());
    }

    let mut bytes = Vec::new();
    let mut response = response;
    while let Some(chunk) = response.chunk().await.map_err(|error| error.to_string())? {
        if bytes.len() + chunk.len() > MAX_PACKAGE_BYTES {
            return Err("PLUGIN_PACKAGE_TOO_LARGE".into());
        }
        bytes.extend_from_slice(&chunk);
    }
    prepare_bytes(manager, bytes, Some(expected_sha256), signature, metadata)
}

pub fn prepare_local(
    manager: &PluginManager,
    path: &Path,
    metadata: PackageMetadata,
) -> Result<PreparedPlugin, String> {
    let file_metadata = fs::metadata(path).map_err(|error| error.to_string())?;
    if !file_metadata.is_file() || file_metadata.len() > MAX_PACKAGE_BYTES as u64 {
        return Err("PLUGIN_PACKAGE_INVALID".into());
    }
    let bytes = fs::read(path).map_err(|error| error.to_string())?;
    prepare_bytes(manager, bytes, None, None, metadata)
}

pub fn prepare_development(
    manager: &PluginManager,
    path: &Path,
) -> Result<PreparedPlugin, String> {
    if !path.is_dir() {
        return Err("PLUGIN_DEVELOPMENT_PATH_INVALID".into());
    }
    let canonical = path.canonicalize().map_err(|error| error.to_string())?;
    let manifest = read_manifest(&canonical)?;
    manifest.validate(&canonical, env!("CARGO_PKG_VERSION"))?;
    let transaction_id = Uuid::new_v4().to_string();
    let prepared = PreparedInstall {
        transaction_id: transaction_id.clone(),
        staging_dir: None,
        content_root: canonical,
        manifest: manifest.clone(),
        package_sha256: String::new(),
        signature_status: "development".into(),
        application_id: None,
        icon_url: String::new(),
        tags: Vec::new(),
        source: "development".into(),
    };
    manager.insert_prepared(prepared)?;
    Ok(PreparedPlugin {
        transaction_id,
        manifest,
        package_sha256: String::new(),
        signature_status: "development".into(),
        source: "development".into(),
    })
}

fn prepare_bytes(
    manager: &PluginManager,
    bytes: Vec<u8>,
    expected_sha256: Option<&str>,
    signature: Option<&str>,
    metadata: PackageMetadata,
) -> Result<PreparedPlugin, String> {
    let digest = Sha256::digest(&bytes);
    let sha256 = digest.iter().map(|byte| format!("{byte:02x}")).collect::<String>();
    if let Some(expected) = expected_sha256 {
        if !sha256.eq_ignore_ascii_case(expected.trim()) {
            return Err("PLUGIN_HASH_MISMATCH".into());
        }
    }
    let signature_status = verify_signature(&digest, signature)?;

    let transaction_id = Uuid::new_v4().to_string();
    let staging_dir = manager.staging_dir().join(&transaction_id);
    let content_root = staging_dir.join("unpacked");
    fs::create_dir_all(&content_root).map_err(|error| error.to_string())?;
    let package_path = staging_dir.join("package.zip");
    File::create(&package_path)
        .and_then(|mut file| file.write_all(&bytes))
        .map_err(|error| error.to_string())?;

    if let Err(error) = extract_archive(&bytes, &content_root) {
        let _ = fs::remove_dir_all(&staging_dir);
        return Err(error);
    }
    let manifest = match read_manifest(&content_root) {
        Ok(manifest) => manifest,
        Err(error) => {
            let _ = fs::remove_dir_all(&staging_dir);
            return Err(error);
        },
    };
    if let Err(error) = manifest.validate(&content_root, env!("CARGO_PKG_VERSION")) {
        let _ = fs::remove_dir_all(&staging_dir);
        return Err(error);
    }

    let prepared = PreparedInstall {
        transaction_id: transaction_id.clone(),
        staging_dir: Some(staging_dir),
        content_root,
        manifest: manifest.clone(),
        package_sha256: sha256.clone(),
        signature_status: signature_status.clone(),
        application_id: metadata.application_id,
        icon_url: metadata.icon_url,
        tags: metadata.tags,
        source: metadata.source.clone(),
    };
    manager.insert_prepared(prepared)?;
    Ok(PreparedPlugin {
        transaction_id,
        manifest,
        package_sha256: sha256,
        signature_status,
        source: metadata.source,
    })
}

fn extract_archive(
    bytes: &[u8],
    destination: &Path,
) -> Result<(), String> {
    let cursor = Cursor::new(bytes);
    let mut archive = ZipArchive::new(cursor).map_err(|_| "PLUGIN_ARCHIVE_INVALID".to_string())?;
    if archive.len() > MAX_ARCHIVE_FILES {
        return Err("PLUGIN_ARCHIVE_TOO_MANY_FILES".into());
    }

    let mut unpacked_bytes = 0_u64;
    for index in 0..archive.len() {
        let mut entry = archive.by_index(index).map_err(|error| error.to_string())?;
        unpacked_bytes = unpacked_bytes.saturating_add(entry.size());
        if unpacked_bytes > MAX_UNPACKED_BYTES {
            return Err("PLUGIN_ARCHIVE_TOO_LARGE".into());
        }
        if entry.unix_mode().map(|mode| mode & 0o170000 == 0o120000).unwrap_or(false) {
            return Err("PLUGIN_ARCHIVE_SYMLINK_FORBIDDEN".into());
        }
        let relative =
            entry.enclosed_name().ok_or_else(|| "PLUGIN_ARCHIVE_PATH_INVALID".to_string())?;
        let output = destination.join(relative);
        if entry.is_dir() {
            fs::create_dir_all(&output).map_err(|error| error.to_string())?;
            continue;
        }
        if let Some(parent) = output.parent() {
            fs::create_dir_all(parent).map_err(|error| error.to_string())?;
        }
        let mut output_file = File::create(&output).map_err(|error| error.to_string())?;
        std::io::copy(&mut entry, &mut output_file).map_err(|error| error.to_string())?;
    }
    Ok(())
}

pub fn read_manifest(root: &Path) -> Result<PluginManifest, String> {
    let path = root.join("manifest.json");
    let file = File::open(path).map_err(|_| "PLUGIN_MANIFEST_MISSING".to_string())?;
    let mut json = String::new();
    file.take(1024 * 1024).read_to_string(&mut json).map_err(|error| error.to_string())?;
    serde_json::from_str(&json).map_err(|error| format!("PLUGIN_MANIFEST_INVALID:{error}"))
}

fn validate_remote_url(value: &str) -> Result<(), String> {
    let url = Url::parse(value).map_err(|_| "PLUGIN_URL_INVALID".to_string())?;
    if url.scheme() == "https" {
        return Ok(());
    }
    if cfg!(debug_assertions)
        && url.scheme() == "http"
        && matches!(url.host_str(), Some("127.0.0.1" | "localhost"))
    {
        return Ok(());
    }
    Err("PLUGIN_URL_HTTPS_REQUIRED".into())
}

fn verify_signature(
    digest: &[u8],
    signature: Option<&str>,
) -> Result<String, String> {
    let Some(signature) = signature.filter(|value| !value.trim().is_empty()) else {
        return Ok("hash-verified".into());
    };
    let public_key = option_env!("LINYU_PLUGIN_PUBLIC_KEY")
        .ok_or_else(|| "PLUGIN_SIGNATURE_TRUST_ROOT_MISSING".to_string())?;
    let key_bytes = STANDARD
        .decode(public_key)
        .map_err(|_| "PLUGIN_SIGNATURE_PUBLIC_KEY_INVALID".to_string())?;
    let key_bytes: [u8; 32] =
        key_bytes.try_into().map_err(|_| "PLUGIN_SIGNATURE_PUBLIC_KEY_INVALID".to_string())?;
    let verifying_key = VerifyingKey::from_bytes(&key_bytes)
        .map_err(|_| "PLUGIN_SIGNATURE_PUBLIC_KEY_INVALID".to_string())?;
    let signature_bytes =
        STANDARD.decode(signature).map_err(|_| "PLUGIN_SIGNATURE_INVALID".to_string())?;
    let signature = Signature::from_slice(&signature_bytes)
        .map_err(|_| "PLUGIN_SIGNATURE_INVALID".to_string())?;
    verifying_key
        .verify(digest, &signature)
        .map_err(|_| "PLUGIN_SIGNATURE_MISMATCH".to_string())?;
    Ok("signature-verified".into())
}

pub fn remove_staging(staging_dir: Option<&PathBuf>) {
    if let Some(staging_dir) = staging_dir {
        let _ = fs::remove_dir_all(staging_dir);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use zip::write::SimpleFileOptions;
    use zip::ZipWriter;

    fn archive_with_file(
        name: &str,
        content: &str,
    ) -> Vec<u8> {
        let mut writer = ZipWriter::new(Cursor::new(Vec::new()));
        writer.start_file(name, SimpleFileOptions::default()).unwrap();
        writer.write_all(content.as_bytes()).unwrap();
        writer.finish().unwrap().into_inner()
    }

    #[test]
    fn extracts_a_safe_archive() {
        let destination =
            std::env::temp_dir().join(format!("linyu-plugin-archive-{}", Uuid::new_v4()));
        fs::create_dir_all(&destination).unwrap();
        let archive = archive_with_file("dist/worker.js", "linyu.register({})");
        assert!(extract_archive(&archive, &destination).is_ok());
        assert_eq!(
            fs::read_to_string(destination.join("dist/worker.js")).unwrap(),
            "linyu.register({})"
        );
        let _ = fs::remove_dir_all(destination);
    }

    #[test]
    fn rejects_archive_path_traversal() {
        let destination =
            std::env::temp_dir().join(format!("linyu-plugin-archive-{}", Uuid::new_v4()));
        fs::create_dir_all(&destination).unwrap();
        let archive = archive_with_file("../escape.js", "unsafe");
        assert_eq!(
            extract_archive(&archive, &destination),
            Err("PLUGIN_ARCHIVE_PATH_INVALID".into())
        );
        let _ = fs::remove_dir_all(destination);
    }
}
