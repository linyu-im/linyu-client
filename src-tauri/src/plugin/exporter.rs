use super::manifest;
use super::{display_path_string, PluginManager};
use std::fs::{self, File};
use std::io::{BufWriter, Read, Write};
use std::path::{Component, Path, PathBuf};
use uuid::Uuid;
use zip::write::SimpleFileOptions;
use zip::{CompressionMethod, ZipWriter};

const MAX_PACKAGE_BYTES: u64 = 100 * 1024 * 1024;
const MAX_UNPACKED_BYTES: u64 = 250 * 1024 * 1024;
const MAX_ARCHIVE_FILES: usize = 2048;
const EXCLUDED_DIRECTORIES: &[&str] = &[".git", ".idea", ".vscode", "node_modules", "target"];

pub fn export_development(
    _manager: &PluginManager,
    plugin_id: &str,
    root_path: &Path,
    destination: &Path,
) -> Result<String, String> {
    manifest::validate_plugin_id(plugin_id)?;
    let root =
        root_path.canonicalize().map_err(|_| "PLUGIN_DEVELOPMENT_PATH_INVALID".to_string())?;
    let plugin_manifest = super::installer::read_manifest(&root)?;
    if plugin_manifest.id != plugin_id {
        return Err("PLUGIN_ID_MISMATCH".into());
    }
    plugin_manifest.validate(&root, env!("CARGO_PKG_VERSION"))?;

    let file_name = destination
        .file_name()
        .filter(|value| !value.is_empty())
        .ok_or_else(|| "PLUGIN_EXPORT_PATH_INVALID".to_string())?;
    let parent = destination
        .parent()
        .ok_or_else(|| "PLUGIN_EXPORT_PATH_INVALID".to_string())?
        .canonicalize()
        .map_err(|_| "PLUGIN_EXPORT_PATH_INVALID".to_string())?;
    let destination = parent.join(file_name);
    if destination.starts_with(&root) {
        return Err("PLUGIN_EXPORT_PATH_INSIDE_SOURCE".into());
    }

    let mut files = Vec::new();
    let mut total_bytes = 0_u64;
    collect_files(&root, &root, &mut files, &mut total_bytes)?;
    files.sort_by(|left, right| left.0.cmp(&right.0));

    let temporary = parent.join(format!(".linyu-plugin-export-{}.tmp", Uuid::new_v4()));
    if let Err(error) = write_archive(&temporary, &files) {
        let _ = fs::remove_file(&temporary);
        return Err(error);
    }
    if fs::metadata(&temporary).map_err(|error| error.to_string())?.len() > MAX_PACKAGE_BYTES {
        let _ = fs::remove_file(&temporary);
        return Err("PLUGIN_PACKAGE_TOO_LARGE".into());
    }

    let backup = if destination.exists() {
        if !destination.is_file() {
            let _ = fs::remove_file(&temporary);
            return Err("PLUGIN_EXPORT_PATH_INVALID".into());
        }
        let backup = parent.join(format!(".linyu-plugin-export-{}.backup", Uuid::new_v4()));
        if let Err(error) = fs::rename(&destination, &backup) {
            let _ = fs::remove_file(&temporary);
            return Err(error.to_string());
        }
        Some(backup)
    } else {
        None
    };
    if let Err(error) = fs::rename(&temporary, &destination) {
        if let Some(backup) = &backup {
            let _ = fs::rename(backup, &destination);
        }
        let _ = fs::remove_file(&temporary);
        return Err(error.to_string());
    }
    if let Some(backup) = backup {
        let _ = fs::remove_file(backup);
    }
    Ok(display_path_string(&destination))
}

fn collect_files(
    root: &Path,
    directory: &Path,
    files: &mut Vec<(String, PathBuf)>,
    total_bytes: &mut u64,
) -> Result<(), String> {
    for entry in fs::read_dir(directory).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        let path = entry.path();
        let file_type = entry.file_type().map_err(|error| error.to_string())?;
        if file_type.is_symlink() {
            return Err("PLUGIN_EXPORT_SYMLINK_FORBIDDEN".into());
        }
        if file_type.is_dir() {
            let name = entry.file_name();
            if EXCLUDED_DIRECTORIES.iter().any(|excluded| name == *excluded) {
                continue;
            }
            collect_files(root, &path, files, total_bytes)?;
            continue;
        }
        if !file_type.is_file() {
            continue;
        }
        if excluded_file(&entry.file_name()) {
            continue;
        }
        if files.len() >= MAX_ARCHIVE_FILES {
            return Err("PLUGIN_ARCHIVE_TOO_MANY_FILES".into());
        }
        let metadata = entry.metadata().map_err(|error| error.to_string())?;
        *total_bytes = total_bytes.saturating_add(metadata.len());
        if *total_bytes > MAX_UNPACKED_BYTES {
            return Err("PLUGIN_ARCHIVE_TOO_LARGE".into());
        }
        let relative = path.strip_prefix(root).map_err(|error| error.to_string())?;
        let archive_path = archive_path(relative)?;
        files.push((archive_path, path));
    }
    Ok(())
}

fn excluded_file(name: &std::ffi::OsStr) -> bool {
    let Some(name) = name.to_str() else {
        return false;
    };
    name == ".DS_Store"
        || name == ".linyuignore"
        || name == ".env"
        || name.starts_with(".env.")
        || name.ends_with(".lyp")
        || name.ends_with(".linyu-plugin")
}

fn archive_path(path: &Path) -> Result<String, String> {
    path.components()
        .map(|component| match component {
            Component::Normal(value) => value
                .to_str()
                .map(str::to_owned)
                .ok_or_else(|| "PLUGIN_EXPORT_PATH_INVALID".to_string()),
            _ => Err("PLUGIN_EXPORT_PATH_INVALID".into()),
        })
        .collect::<Result<Vec<_>, _>>()
        .map(|parts| parts.join("/"))
}

fn write_archive(
    destination: &Path,
    files: &[(String, PathBuf)],
) -> Result<(), String> {
    let file = File::create(destination).map_err(|error| error.to_string())?;
    let mut archive = ZipWriter::new(BufWriter::new(file));
    let options = SimpleFileOptions::default()
        .compression_method(CompressionMethod::Deflated)
        .unix_permissions(0o644);
    let mut buffer = [0_u8; 64 * 1024];
    for (archive_path, source) in files {
        archive.start_file(archive_path, options).map_err(|error| error.to_string())?;
        let mut input = File::open(source).map_err(|error| error.to_string())?;
        loop {
            let read = input.read(&mut buffer).map_err(|error| error.to_string())?;
            if read == 0 {
                break;
            }
            archive.write_all(&buffer[..read]).map_err(|error| error.to_string())?;
        }
    }
    archive.finish().map_err(|error| error.to_string())?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use zip::ZipArchive;

    #[test]
    fn converts_paths_to_zip_separators() {
        assert_eq!(
            archive_path(Path::new("dist").join("ui").join("index.html").as_path()),
            Ok("dist/ui/index.html".into())
        );
    }

    #[test]
    fn writes_an_installable_archive_layout() {
        let root = std::env::temp_dir().join(format!("linyu-plugin-export-{}", Uuid::new_v4()));
        fs::create_dir_all(root.join("dist")).unwrap();
        fs::write(root.join("manifest.json"), "{}").unwrap();
        fs::write(root.join("dist/worker.js"), "linyu.register({})").unwrap();
        let destination = root.join("package.zip");
        write_archive(
            &destination,
            &[
                ("dist/worker.js".into(), root.join("dist/worker.js")),
                ("manifest.json".into(), root.join("manifest.json")),
            ],
        )
        .unwrap();

        let mut archive = ZipArchive::new(File::open(&destination).unwrap()).unwrap();
        assert!(archive.by_name("manifest.json").is_ok());
        assert!(archive.by_name("dist/worker.js").is_ok());
        let _ = fs::remove_dir_all(root);
    }
}
