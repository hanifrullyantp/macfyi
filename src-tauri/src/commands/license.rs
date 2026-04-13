use serde::Serialize;
use sha2::{Digest, Sha256};
use std::time::Duration;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceFingerprintDto {
    pub fingerprint: String,
}

fn compute_device_fingerprint() -> String {
    let host = sysinfo::System::host_name().unwrap_or_else(|| "unknown".to_string());
    let home = dirs::home_dir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_default();
    let raw = format!("macfyi|{host}|{home}|macos");
    let mut hasher = Sha256::new();
    hasher.update(raw.as_bytes());
    hex::encode(hasher.finalize())
}

#[tauri::command]
pub fn get_device_fingerprint() -> Result<DeviceFingerprintDto, String> {
    Ok(DeviceFingerprintDto {
        fingerprint: compute_device_fingerprint(),
    })
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivateLicenseResponse {
    pub token: String,
    pub license_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub expires_at: Option<String>,
}

/// Calls Supabase Edge Function `activate-license`. Set MACFYI_LICENSE_API_URL at build or runtime
/// to `https://<project>.supabase.co/functions/v1/activate-license`.
#[tauri::command]
pub async fn activate_license(
    email: String,
    license_key: String,
    api_url: String,
) -> Result<ActivateLicenseResponse, String> {
    let device_fingerprint = compute_device_fingerprint();
    let url = api_url.trim().to_string();
    if url.is_empty() {
        return Err("License API URL is not configured.".to_string());
    }

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(45))
        .build()
        .map_err(|e| e.to_string())?;

    let body = serde_json::json!({
        "email": email,
        "license_key": license_key,
        "device_fingerprint": device_fingerprint,
    });

    let res = client
        .post(&url)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Network error: {e}"))?;

    let status = res.status();
    let text = res.text().await.map_err(|e| e.to_string())?;

    if !status.is_success() {
        return Err(format!("Activation failed ({status}): {text}"));
    }

    let v: serde_json::Value =
        serde_json::from_str(&text).map_err(|e| format!("Invalid response: {e}"))?;

    let token = v
        .get("token")
        .and_then(|t| t.as_str())
        .ok_or_else(|| "Missing token in response".to_string())?
        .to_string();
    let license_id = v
        .get("license_id")
        .and_then(|t| t.as_str())
        .unwrap_or("")
        .to_string();
    let expires_at = v
        .get("expires_at")
        .and_then(|t| t.as_str())
        .map(|s| s.to_string());

    Ok(ActivateLicenseResponse {
        token,
        license_id,
        expires_at,
    })
}
