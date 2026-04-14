use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc, Mutex,
};

use super::runtime::AiRuntimeManager;
use tokio::sync::Mutex as AsyncMutex;

#[derive(Debug, Clone)]
pub enum ModelId {
    Lite,
    Better,
}

impl ModelId {
    pub fn as_str(&self) -> &'static str {
        match self {
            ModelId::Lite => "lite",
            ModelId::Better => "better",
        }
    }
}

impl TryFrom<String> for ModelId {
    type Error = String;
    fn try_from(value: String) -> Result<Self, Self::Error> {
        match value.as_str() {
            "lite" => Ok(ModelId::Lite),
            "better" => Ok(ModelId::Better),
            _ => Err("Invalid modelId. Use \"lite\" or \"better\".".to_string()),
        }
    }
}

#[derive(Debug)]
pub struct AiState {
    pub enabled: Mutex<bool>,
    pub selected_model: Mutex<ModelId>,
    pub download_cancel: Mutex<Option<Arc<AtomicBool>>>,
    pub panel_open: Mutex<bool>,
    pub runtime: AsyncMutex<AiRuntimeManager>,
    pub idle_task_running: Mutex<bool>,
    pub memory_pressure_high: Mutex<bool>,
}

impl Default for AiState {
    fn default() -> Self {
        Self {
            enabled: Mutex::new(false),
            selected_model: Mutex::new(ModelId::Lite),
            download_cancel: Mutex::new(None),
            panel_open: Mutex::new(false),
            runtime: AsyncMutex::new(AiRuntimeManager::default()),
            idle_task_running: Mutex::new(false),
            memory_pressure_high: Mutex::new(false),
        }
    }
}

impl AiState {
    pub fn cancel_download(&self) -> bool {
        let mut g = self.download_cancel.lock().unwrap();
        if let Some(flag) = g.take() {
            flag.store(true, Ordering::Relaxed);
            return true;
        }
        false
    }
}

