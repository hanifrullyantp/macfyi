use serde::Serialize;
use std::process::Command;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MemorySnapshotDto {
    pub total_bytes: u64,
    pub used_bytes: u64,
    pub available_bytes: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessMemoryDto {
    pub pid: u32,
    pub name: String,
    pub memory_bytes: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LaunchAgentDto {
    pub file_name: String,
    pub label: Option<String>,
    pub program: Option<String>,
}

#[tauri::command]
pub fn get_memory_snapshot() -> Result<MemorySnapshotDto, String> {
    let mut sys = sysinfo::System::new_with_specifics(
        sysinfo::RefreshKind::nothing().with_memory(sysinfo::MemoryRefreshKind::everything()),
    );
    sys.refresh_memory();
    let total = sys.total_memory();
    let avail = sys.available_memory();
    let used = total.saturating_sub(avail);
    Ok(MemorySnapshotDto {
        total_bytes: total,
        used_bytes: used,
        available_bytes: avail,
    })
}

#[tauri::command]
pub fn get_top_processes(limit: u32) -> Result<Vec<ProcessMemoryDto>, String> {
    let mut sys = sysinfo::System::new_with_specifics(
        sysinfo::RefreshKind::nothing()
            .with_memory(sysinfo::MemoryRefreshKind::everything())
            .with_processes(sysinfo::ProcessRefreshKind::everything()),
    );
    sys.refresh_all();
    let mut rows: Vec<ProcessMemoryDto> = sys
        .processes()
        .iter()
        .map(|(pid, p)| ProcessMemoryDto {
            pid: pid.as_u32(),
            name: p.name().to_string_lossy().to_string(),
            memory_bytes: p.memory(),
        })
        .collect();
    rows.sort_by(|a, b| b.memory_bytes.cmp(&a.memory_bytes));
    rows.truncate(limit.max(1).min(50) as usize);
    Ok(rows)
}

#[tauri::command]
pub fn list_launch_agents() -> Result<Vec<LaunchAgentDto>, String> {
    #[cfg(target_os = "macos")]
    {
        let home = dirs::home_dir().ok_or_else(|| "Could not resolve home directory".to_string())?;
        let dir = home.join("Library/LaunchAgents");
        if !dir.is_dir() {
            return Ok(vec![]);
        }
        let mut out: Vec<LaunchAgentDto> = Vec::new();
        for ent in std::fs::read_dir(&dir).map_err(|e| e.to_string())? {
            let ent = ent.map_err(|e| e.to_string())?;
            let path = ent.path();
            if path.extension().map(|e| e == "plist").unwrap_or(false) {
                let file_name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
                let (label, program) = read_launch_plist(&path).unwrap_or((None, None));
                out.push(LaunchAgentDto {
                    file_name,
                    label,
                    program,
                });
            }
        }
        out.sort_by(|a, b| a.file_name.cmp(&b.file_name));
        return Ok(out);
    }
    #[cfg(not(target_os = "macos"))]
    {
        Ok(vec![])
    }
}

#[cfg(target_os = "macos")]
fn read_launch_plist(path: &std::path::Path) -> Result<(Option<String>, Option<String>), String> {
    let v = plist::Value::from_file(path).map_err(|e| e.to_string())?;
    let dict = v.as_dictionary().ok_or_else(|| "Invalid plist".to_string())?;
    let label = dict
        .get("Label")
        .and_then(|x| x.as_string())
        .map(|s| s.to_string());
    let program = dict
        .get("Program")
        .and_then(|x| x.as_string())
        .map(|s| s.to_string())
        .or_else(|| {
            dict.get("ProgramArguments")
                .and_then(|x| x.as_array())
                .and_then(|a| a.first())
                .and_then(|x| x.as_string())
                .map(|s| s.to_string())
        });
    Ok((label, program))
}

#[tauri::command]
pub fn run_maintenance(kind: String) -> Result<String, String> {
    #[cfg(target_os = "macos")]
    {
        let output = match kind.as_str() {
            "dns" => Command::new("dscacheutil").args(["-flushcache"]).output(),
            "verify" => Command::new("diskutil").args(["verifyVolume", "/"]).output(),
            "spotlight" => Command::new("mdutil").args(["-E", "/"]).output(),
            _ => return Err(format!("Unknown maintenance kind: {kind}")),
        }
        .map_err(|e| e.to_string())?;
        let status = output.status;
        let mut msg = String::new();
        if !output.stdout.is_empty() {
            msg.push_str(&String::from_utf8_lossy(&output.stdout));
        }
        if !output.stderr.is_empty() {
            if !msg.is_empty() {
                msg.push('\n');
            }
            msg.push_str(&String::from_utf8_lossy(&output.stderr));
        }
        if msg.trim().is_empty() {
            msg = if status.success() {
                "OK".to_string()
            } else {
                format!("Exit code {}", status.code().unwrap_or(-1))
            };
        }
        if !status.success() {
            return Err(msg.trim().to_string());
        }
        return Ok(msg.trim().to_string());
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = kind;
        Err("Maintenance commands are only available on macOS.".to_string())
    }
}

/// Sends SIGKILL to a user process (macOS/Linux). Refuses Macfyi's own PID.
#[tauri::command]
pub fn force_close_process(pid: u32) -> Result<String, String> {
    let my = std::process::id() as u32;
    if pid == my {
        return Err("Cannot terminate Macfyi.".to_string());
    }
    if pid <= 1 {
        return Err("Invalid process ID.".to_string());
    }

    #[cfg(unix)]
    {
        let out = Command::new("/bin/kill")
            .args(["-9", &pid.to_string()])
            .output()
            .map_err(|e| e.to_string())?;
        if out.status.success() {
            return Ok(format!("SIGKILL sent to PID {pid}"));
        }
        let stderr = String::from_utf8_lossy(&out.stderr).trim().to_string();
        if !stderr.is_empty() {
            return Err(stderr);
        }
        return Err(format!(
            "kill exited with status {:?}",
            out.status.code()
        ));
    }
    #[cfg(not(unix))]
    {
        Err("Force quit is only available on macOS and Linux.".to_string())
    }
}

#[tauri::command]
pub fn open_login_items_settings() -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let status = Command::new("open")
            .arg("x-apple.systempreferences:com.apple.LoginItems-Settings.extension")
            .status()
            .map_err(|e| e.to_string())?;
        if status.success() {
            Ok(())
        } else {
            Err("Could not open Login Items settings.".to_string())
        }
    }
    #[cfg(not(target_os = "macos"))]
    {
        Err("Login Items settings are only available on macOS.".to_string())
    }
}
