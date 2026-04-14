use crate::ai::model_manager::{load_catalog, models_dir};
use serde::Serialize;
use std::net::TcpListener;
use std::path::{PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};
use std::time::{Duration, Instant};
use tauri::Emitter;
use tauri::Manager;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TokenPayload {
    pub text: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeStatusDto {
    pub state: String,
    pub model_id: String,
    pub port: Option<u16>,
}

#[derive(Debug)]
pub enum RuntimeState {
    Unloaded,
    Loading,
    Loaded,
    Generating,
}

#[derive(Debug)]
pub struct AiRuntimeManager {
    state: RuntimeState,
    model_id: String,
    port: Option<u16>,
    child: Option<Child>,
    last_activity: Instant,
    generation_cancel: Option<Arc<AtomicBool>>,
}

impl Default for AiRuntimeManager {
    fn default() -> Self {
        Self {
            state: RuntimeState::Unloaded,
            model_id: "lite".to_string(),
            port: None,
            child: None,
            last_activity: Instant::now(),
            generation_cancel: None,
        }
    }
}

fn pick_free_port() -> Result<u16, String> {
    let l = TcpListener::bind("127.0.0.1:0").map_err(|e| e.to_string())?;
    let port = l.local_addr().map_err(|e| e.to_string())?.port();
    Ok(port)
}

fn sidecar_dir_hint() -> Option<PathBuf> {
    // Dev convenience: allow overriding sidecar location.
    std::env::var("MACFYI_LLAMA_SIDECAR_DIR")
        .ok()
        .map(PathBuf::from)
}

fn resolve_llama_server_binary(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    if let Some(d) = sidecar_dir_hint() {
        let cand = d.join("llama-server");
        if cand.is_file() {
            return Ok(cand);
        }
    }

    // Try resource dir (bundled resources).
    if let Ok(res_dir) = app.path().resource_dir() {
        let cand = res_dir.join("llama").join("llama-server");
        if cand.is_file() {
            return Ok(cand);
        }
    }

    // NOTE: we intentionally avoid guessing executable-relative paths here to keep this stable across
    // bundle layouts. The bundling step will place `llama/llama-server` under resources.

    Err("Local AI runtime not installed (llama-server missing).".to_string())
}

fn resolve_model_main_file(model_id: &str) -> Result<PathBuf, String> {
    let cat = load_catalog()?;
    let spec = cat
        .models
        .get(model_id)
        .ok_or_else(|| format!("Unknown modelId: {model_id}"))?;

    // For multi-part models, llama.cpp expects the first shard file path.
    let first = spec
        .files
        .first()
        .ok_or_else(|| "Model spec has no files".to_string())?;

    let dir = models_dir()?;
    Ok(dir.join(&first.file_name))
}

async fn wait_ready(port: u16) -> bool {
    let client = reqwest::Client::new();
    let base = format!("http://127.0.0.1:{port}");
    for _ in 0..50 {
        if let Ok(r) = client.get(format!("{base}/health")).send().await {
            if r.status().is_success() {
                return true;
            }
        }
        if let Ok(r) = client.get(&base).send().await {
            if r.status().is_success() {
                return true;
            }
        }
        tokio::time::sleep(Duration::from_millis(80)).await;
    }
    false
}

fn build_prompt(question: &str, context: &str) -> String {
    // Template-first: short system rules + structured output.
    format!(
        r#"You are Macfyi Local Assistant. You explain storage cleanup items safely.

Rules:
- Never ask the user to delete system folders.
- Never claim "100% safe".
- Never output full local paths. If you see a path like /Users/... replace with [path omitted].
- Be concise (150-300 words max).
- Always follow the required format.

Required output format:
Apa ini:
Kenapa muncul:
Risiko:
Saran aman:

User question:
{question}

Context (privacy-safe metadata):
{context}
"#
    )
}

fn redact_paths(s: &str) -> String {
    // Defense-in-depth: best-effort removal of local paths without extra deps.
    let mut out = s.replace("~/", "[path omitted]/");
    if let Some(idx) = out.find("/Users/") {
        // Replace any occurrence of /Users/<name>/... token-by-token.
        let mut cur = out.clone();
        while let Some(i) = cur.find("/Users/") {
            let tail = &cur[i..];
            // cut at whitespace
            let end = tail
                .find(char::is_whitespace)
                .unwrap_or_else(|| tail.len());
            let token = &tail[..end];
            cur = cur.replacen(token, "[path omitted]", 1);
        }
        out = cur;
        let _ = idx;
    }
    out
}

fn build_context_line(model_id: &str, context: &serde_json::Value) -> String {
    let _ = model_id;
    redact_paths(&context.to_string())
}

impl AiRuntimeManager {
    pub fn status(&self) -> RuntimeStatusDto {
        RuntimeStatusDto {
            state: match self.state {
                RuntimeState::Unloaded => "Unloaded",
                RuntimeState::Loading => "Loading",
                RuntimeState::Loaded => "Loaded",
                RuntimeState::Generating => "Generating",
            }
            .to_string(),
            model_id: self.model_id.clone(),
            port: self.port,
        }
    }

    pub fn is_loaded(&self) -> bool {
        matches!(self.state, RuntimeState::Loaded | RuntimeState::Generating)
    }

    pub fn touch(&mut self) {
        self.last_activity = Instant::now();
    }

    pub fn unload(&mut self) {
        self.generation_cancel = None;
        self.port = None;
        self.state = RuntimeState::Unloaded;
        if let Some(mut c) = self.child.take() {
            let _ = c.kill();
        }
    }

    pub async fn load_if_needed(&mut self, app: &tauri::AppHandle, model_id: &str) -> Result<(), String> {
        self.touch();
        if self.is_loaded() && self.model_id == model_id {
            return Ok(());
        }
        self.unload();
        self.state = RuntimeState::Loading;
        self.model_id = model_id.to_string();

        let server_bin = resolve_llama_server_binary(app)?;
        let model_path = resolve_model_main_file(model_id)?;
        if !model_path.is_file() {
            self.state = RuntimeState::Unloaded;
            return Err("Model file not installed. Download Lite model first.".to_string());
        }

        let port = pick_free_port()?;

        // Keep settings conservative: small ctx, deterministic.
        let mut cmd = Command::new(server_bin);
        cmd.arg("-m")
            .arg(model_path)
            .arg("--host")
            .arg("127.0.0.1")
            .arg("--port")
            .arg(port.to_string())
            .arg("--ctx-size")
            .arg("2048")
            .arg("--temp")
            .arg("0.3")
            .arg("--threads")
            .arg("4")
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .stdin(Stdio::null());

        let child = cmd.spawn().map_err(|e| e.to_string())?;
        self.child = Some(child);
        self.port = Some(port);

        if !wait_ready(port).await {
            self.unload();
            return Err("Local AI runtime failed to start.".to_string());
        }

        self.state = RuntimeState::Loaded;
        Ok(())
    }

    pub fn cancel_generation(&mut self) {
        if let Some(flag) = self.generation_cancel.take() {
            flag.store(true, Ordering::Relaxed);
        }
    }

    pub fn should_unload_idle(&self, idle: Duration) -> bool {
        self.is_loaded() && self.last_activity.elapsed() >= idle
    }

    pub async fn generate_stream(
        &mut self,
        app: &tauri::AppHandle,
        question: &str,
        context_json: serde_json::Value,
        n_predict: u32,
    ) -> Result<(), String> {
        self.touch();
        let port = self.port.ok_or_else(|| "Runtime not loaded".to_string())?;

        self.state = RuntimeState::Generating;
        let cancel = Arc::new(AtomicBool::new(false));
        self.generation_cancel = Some(cancel.clone());

        let ctx_line = build_context_line(&self.model_id, &context_json);
        let prompt = build_prompt(question, &ctx_line);

        let client = reqwest::Client::new();
        let url = format!("http://127.0.0.1:{port}/completion");
        let body = serde_json::json!({
          "prompt": prompt,
          "n_predict": n_predict,
          "temperature": 0.3,
          "stream": true
        });

        let mut resp = client.post(url).json(&body).send().await.map_err(|e| e.to_string())?;
        if !resp.status().is_success() {
            self.state = RuntimeState::Loaded;
            return Err(format!("AI generate failed: HTTP {}", resp.status()));
        }

        let mut buf = String::new();

        while let Some(chunk) = resp.chunk().await.map_err(|e| e.to_string())? {
            if cancel.load(Ordering::Relaxed) {
                self.state = RuntimeState::Loaded;
                return Err("cancelled".to_string());
            }
            let s = String::from_utf8_lossy(&chunk);
            buf.push_str(&s);

            while let Some(idx) = buf.find('\n') {
                let line = buf[..idx].trim().to_string();
                buf = buf[idx + 1..].to_string();
                if line.is_empty() {
                    continue;
                }
                // SSE: "data: {...}"
                let json_str = line.strip_prefix("data: ").unwrap_or(&line);
                if json_str == "[DONE]" {
                    continue;
                }
                if let Ok(v) = serde_json::from_str::<serde_json::Value>(json_str) {
                    if let Some(content) = v
                        .get("content")
                        .and_then(|x| x.as_str())
                        .or_else(|| v.get("response").and_then(|x| x.as_str()))
                    {
                        let text = redact_paths(content);
                        if !text.is_empty() {
                            let _ = app.emit("ai:token", TokenPayload { text });
                        }
                    }
                }
            }
        }

        self.state = RuntimeState::Loaded;
        Ok(())
    }
}

