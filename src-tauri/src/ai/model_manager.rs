use reqwest::Client;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};
use tauri::Emitter;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelsCatalog {
    pub version: u32,
    pub models: HashMap<String, ModelSpec>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelSpec {
    pub id: String,
    pub label: String,
    pub recommended_ram_gb: u32,
    pub files: Vec<ModelFileSpec>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelFileSpec {
    pub url: String,
    pub sha256: String,
    pub size_bytes: u64,
    pub file_name: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadProgressPayload {
    pub model_id: String,
    pub file_name: String,
    pub bytes_downloaded: u64,
    pub bytes_total: u64,
    pub pct: f64,
}

fn models_catalog_json() -> &'static str {
    // compile-time embed; avoids file I/O permissions differences across bundle types
    include_str!("../../resources/models.json")
}

pub fn load_catalog() -> Result<ModelsCatalog, String> {
    serde_json::from_str::<ModelsCatalog>(models_catalog_json()).map_err(|e| e.to_string())
}

pub fn models_dir() -> Result<PathBuf, String> {
    let home = dirs::home_dir().ok_or_else(|| "Could not resolve home directory".to_string())?;
    Ok(home
        .join("Library")
        .join("Application Support")
        .join("macfyi")
        .join("models"))
}

fn sha_marker_path(file_path: &Path) -> PathBuf {
    let name = file_path.file_name().unwrap_or_default().to_string_lossy();
    file_path
        .parent()
        .unwrap_or_else(|| Path::new("."))
        .join(format!("{name}.sha256"))
}

fn read_sha_marker(file_path: &Path) -> Option<String> {
    std::fs::read_to_string(sha_marker_path(file_path))
        .ok()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
}

fn write_sha_marker(file_path: &Path, sha256_hex: &str) -> Result<(), String> {
    std::fs::write(sha_marker_path(file_path), format!("{sha256_hex}\n")).map_err(|e| e.to_string())
}

pub fn is_model_installed(model: &ModelSpec) -> Result<bool, String> {
    let dir = models_dir()?;
    for f in &model.files {
        let p = dir.join(&f.file_name);
        if !p.is_file() {
            return Ok(false);
        }
        // Fast path: marker file must match expected.
        match read_sha_marker(&p) {
            Some(v) if v.eq_ignore_ascii_case(&f.sha256) => {}
            _ => return Ok(false),
        }
    }
    Ok(true)
}

pub fn delete_model_files(model: &ModelSpec) -> Result<(), String> {
    let dir = models_dir()?;
    for f in &model.files {
        let p = dir.join(&f.file_name);
        let _ = std::fs::remove_file(&p);
        let _ = std::fs::remove_file(sha_marker_path(&p));
    }
    Ok(())
}

pub async fn download_model(
    app: &tauri::AppHandle,
    model: &ModelSpec,
    cancelled: Arc<AtomicBool>,
) -> Result<(), String> {
    let dir = models_dir()?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

    let client = Client::builder()
        .user_agent("macfyi/ai-model-downloader")
        .build()
        .map_err(|e| e.to_string())?;

    for file in &model.files {
        if cancelled.load(Ordering::Relaxed) {
            return Err("cancelled".to_string());
        }

        let out_path = dir.join(&file.file_name);
        // If already verified, skip.
        if out_path.is_file() {
            if let Some(v) = read_sha_marker(&out_path) {
                if v.eq_ignore_ascii_case(&file.sha256) {
                    continue;
                }
            }
        }

        let tmp_path = dir.join(format!("{}.partial", &file.file_name));
        let mut hasher = Sha256::new();

        let mut resp = client
            .get(&file.url)
            .send()
            .await
            .map_err(|e| e.to_string())?;
        if !resp.status().is_success() {
            return Err(format!("Download failed: HTTP {}", resp.status()));
        }

        let total = resp
            .content_length()
            .unwrap_or(file.size_bytes)
            .max(1);

        use std::io::Write;
        let mut out = std::fs::File::create(&tmp_path).map_err(|e| e.to_string())?;
        let mut downloaded: u64 = 0;

        while let Some(chunk) = resp.chunk().await.map_err(|e| e.to_string())? {
            if cancelled.load(Ordering::Relaxed) {
                let _ = std::fs::remove_file(&tmp_path);
                return Err("cancelled".to_string());
            }
            hasher.update(&chunk);
            out.write_all(&chunk).map_err(|e| e.to_string())?;
            downloaded = downloaded.saturating_add(chunk.len() as u64);

            let pct = (downloaded as f64 / total as f64) * 100.0;
            let _ = app.emit(
                "ai:download_progress",
                DownloadProgressPayload {
                    model_id: model.id.clone(),
                    file_name: file.file_name.clone(),
                    bytes_downloaded: downloaded,
                    bytes_total: total,
                    pct: pct.max(0.0).min(100.0),
                },
            );
        }

        let sha_hex = hex::encode(hasher.finalize());
        if !sha_hex.eq_ignore_ascii_case(&file.sha256) {
            let _ = std::fs::remove_file(&tmp_path);
            return Err("SHA256 mismatch. Download corrupted or model catalog outdated.".to_string());
        }

        std::fs::rename(&tmp_path, &out_path).map_err(|e| e.to_string())?;
        write_sha_marker(&out_path, &sha_hex)?;
    }

    Ok(())
}

