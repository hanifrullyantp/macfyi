use super::common::*;
use std::path::PathBuf;

const MAX_TEXT_BYTES: usize = 4096;

fn is_safe_path(path: &std::path::Path) -> bool {
    let home = match home_dir() {
        Ok(h) => h,
        Err(_) => return false,
    };
    path.starts_with(&home) || path.starts_with("/Applications")
}

fn guess_mime(ext: &str) -> &'static str {
    match ext {
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "pdf" => "application/pdf",
        "txt" | "log" | "md" | "csv" => "text/plain",
        "json" => "application/json",
        "html" | "htm" => "text/html",
        "xml" | "plist" => "text/xml",
        "rs" | "py" | "js" | "ts" | "tsx" | "jsx" | "css" | "scss" | "sh" | "bash" | "zsh"
        | "go" | "java" | "c" | "cpp" | "h" | "swift" | "rb" | "sql" | "yaml" | "yml"
        | "toml" => "text/plain",
        _ => "application/octet-stream",
    }
}

#[tauri::command]
pub fn file_preview(path: String) -> Result<FilePreviewDto, String> {
    let p = PathBuf::from(&path);
    if !is_safe_path(&p) {
        return Err("Access denied: path outside allowed scope".to_string());
    }
    if !p.exists() {
        return Err("File not found".to_string());
    }

    let meta = std::fs::metadata(&p).map_err(|e| e.to_string())?;
    let ext = file_extension(&p);
    let mime = guess_mime(&ext);
    let mtime = modified_ms(&meta);

    let is_text = mime.starts_with("text/") || mime == "application/json";
    let is_image = mime.starts_with("image/");

    let mut text_content = None;
    let mut base64_image = None;

    if is_text {
        use std::io::Read;
        let mut f = std::fs::File::open(&p).map_err(|e| e.to_string())?;
        let mut buf = vec![0u8; MAX_TEXT_BYTES];
        let n = f.read(&mut buf).map_err(|e| e.to_string())?;
        buf.truncate(n);
        if let Ok(s) = String::from_utf8(buf.clone()) {
            text_content = Some(s);
        } else {
            text_content = Some(String::from_utf8_lossy(&buf).to_string());
        }
    } else if is_image && meta.len() < 20 * 1024 * 1024 {
        let bytes = std::fs::read(&p).map_err(|e| e.to_string())?;
        let encoded = base64_encode(&bytes);
        base64_image = Some(format!("data:{};base64,{}", mime, encoded));
    }

    Ok(FilePreviewDto {
        path,
        mime_hint: mime.to_string(),
        text_content,
        base64_image,
        size: meta.len(),
        modified: iso8601(mtime),
    })
}

fn base64_encode(data: &[u8]) -> String {
    const CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut result = String::with_capacity((data.len() + 2) / 3 * 4);
    for chunk in data.chunks(3) {
        let b0 = chunk[0] as u32;
        let b1 = if chunk.len() > 1 { chunk[1] as u32 } else { 0 };
        let b2 = if chunk.len() > 2 { chunk[2] as u32 } else { 0 };
        let n = (b0 << 16) | (b1 << 8) | b2;
        result.push(CHARS[((n >> 18) & 0x3F) as usize] as char);
        result.push(CHARS[((n >> 12) & 0x3F) as usize] as char);
        if chunk.len() > 1 {
            result.push(CHARS[((n >> 6) & 0x3F) as usize] as char);
        } else {
            result.push('=');
        }
        if chunk.len() > 2 {
            result.push(CHARS[(n & 0x3F) as usize] as char);
        } else {
            result.push('=');
        }
    }
    result
}

#[tauri::command]
pub fn reveal_in_finder(path: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .args(["-R", &path])
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}
