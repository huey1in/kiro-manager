// 反代服务 Tauri 命令
use super::types::*;
use super::ProxyServer;
use std::sync::Arc;
use tauri::State;
use tokio::sync::RwLock;
use std::path::PathBuf;

/// 全局代理服务器状态
pub struct ProxyState {
    pub server: Arc<RwLock<Option<ProxyServer>>>,
    pub config_path: PathBuf,
}

impl ProxyState {
    pub fn new(app_handle: &tauri::AppHandle) -> Self {
        use tauri::Manager;
        
        let config_dir = app_handle
            .path()
            .app_data_dir()
            .expect("无法获取应用数据目录");
        
        std::fs::create_dir_all(&config_dir).ok();
        
        let config_path = config_dir.join("proxy_config.json");
        
        Self {
            server: Arc::new(RwLock::new(None)),
            config_path,
        }
    }
    
    /// 加载配置
    pub fn load_config(&self) -> Option<ProxyConfig> {
        if self.config_path.exists() {
            let content = std::fs::read_to_string(&self.config_path).ok()?;
            serde_json::from_str(&content).ok()
        } else {
            None
        }
    }
    
    /// 保存配置
    pub fn save_config(&self, config: &ProxyConfig) -> Result<(), String> {
        let content = serde_json::to_string_pretty(config)
            .map_err(|e| format!("序列化配置失败: {}", e))?;
        
        std::fs::write(&self.config_path, content)
            .map_err(|e| format!("保存配置失败: {}", e))?;
        
        Ok(())
    }
}

/// 启动代理服务器
#[tauri::command]
pub async fn start_proxy_server(
    state: State<'_, ProxyState>,
) -> Result<serde_json::Value, String> {
    println!("[Proxy] 启动代理服务器");
    
    let server_lock = state.server.read().await;
    if let Some(server) = server_lock.as_ref() {
        server.start().await?;
        Ok(serde_json::json!({ "success": true }))
    } else {
        Err("代理服务器未初始化".to_string())
    }
}

/// 停止代理服务器
#[tauri::command]
pub async fn stop_proxy_server(
    state: State<'_, ProxyState>,
) -> Result<serde_json::Value, String> {
    println!("[Proxy] 停止代理服务器");
    
    let server_lock = state.server.read().await;
    if let Some(server) = server_lock.as_ref() {
        server.stop().await?;
        Ok(serde_json::json!({ "success": true }))
    } else {
        Err("代理服务器未初始化".to_string())
    }
}

/// 获取代理服务器状态
#[tauri::command]
pub async fn get_proxy_status(
    state: State<'_, ProxyState>,
) -> Result<serde_json::Value, String> {
    let mut server_lock = state.server.write().await;
    
    // 如果服务器未初始化，尝试加载配置
    if server_lock.is_none() {
        let config = state.load_config().unwrap_or_else(|| {
            ProxyConfig {
                enabled: false,
                port: 5580,
                host: "127.0.0.1".to_string(),
                api_key: None,
                api_keys: None,
                enable_multi_account: true,
                selected_account_ids: vec![],
                log_requests: true,
                max_retries: Some(3),
                preferred_endpoint: None,
                auto_start: None,
                auto_continue_rounds: None,
                disable_tools: None,
                auto_switch_on_quota_exhausted: None,
                model_mappings: None,
                enable_openai: true,
                enable_claude: true,
            }
        });
        *server_lock = Some(ProxyServer::new(config));
    }
    
    if let Some(server) = server_lock.as_ref() {
        let running = server.is_running();
        let config = server.get_config().await;
        let stats = server.get_stats();
        let session_stats = server.get_session_stats();
        
        Ok(serde_json::json!({
            "running": running,
            "config": config,
            "stats": stats,
            "sessionStats": session_stats
        }))
    } else {
        Ok(serde_json::json!({
            "running": false,
            "config": null,
            "stats": null,
            "sessionStats": null
        }))
    }
}

/// 更新代理配置
#[tauri::command]
pub async fn update_proxy_config(
    config: ProxyConfig,
    state: State<'_, ProxyState>,
) -> Result<serde_json::Value, String> {
    println!("[Proxy] 更新配置");
    
    // 保存配置到文件
    state.save_config(&config)?;
    
    let mut server_lock = state.server.write().await;
    if let Some(server) = server_lock.as_mut() {
        server.update_config(config.clone()).await;
    } else {
        // 首次初始化
        *server_lock = Some(ProxyServer::new(config));
    }
    
    Ok(serde_json::json!({ "success": true }))
}

/// 同步账号到代理池
#[tauri::command]
pub async fn sync_proxy_accounts(
    accounts: Vec<ProxyAccount>,
    state: State<'_, ProxyState>,
) -> Result<serde_json::Value, String> {
    println!("[Proxy] 同步账号: {} 个", accounts.len());
    
    let mut server_lock = state.server.write().await;
    
    // 如果服务器未初始化，先创建默认配置
    if server_lock.is_none() {
        println!("[Proxy] 服务器未初始化，创建默认配置");
        let default_config = ProxyConfig {
            enabled: false,
            port: 5580,
            host: "127.0.0.1".to_string(),
            api_key: None,
            api_keys: None,
            enable_multi_account: true,
            selected_account_ids: vec![],
            log_requests: true,
            max_retries: Some(3),
            preferred_endpoint: None,
            auto_start: None,
            auto_continue_rounds: None,
            disable_tools: None,
            auto_switch_on_quota_exhausted: None,
            model_mappings: None,
            enable_openai: true,
            enable_claude: true,
        };
        *server_lock = Some(ProxyServer::new(default_config));
    }
    
    if let Some(server) = server_lock.as_ref() {
        let count = server.sync_accounts(accounts);
        Ok(serde_json::json!({
            "success": true,
            "accountCount": count
        }))
    } else {
        Err("代理服务器初始化失败".to_string())
    }
}

/// 获取代理账号信息
#[tauri::command]
pub async fn get_proxy_accounts(
    state: State<'_, ProxyState>,
) -> Result<serde_json::Value, String> {
    let server_lock = state.server.read().await;
    if let Some(server) = server_lock.as_ref() {
        let (accounts, available_count) = server.get_accounts_info();
        Ok(serde_json::json!({
            "accounts": accounts,
            "availableCount": available_count
        }))
    } else {
        Ok(serde_json::json!({
            "accounts": [],
            "availableCount": 0
        }))
    }
}

/// 获取可用模型列表
#[tauri::command]
pub async fn get_proxy_models(
    state: State<'_, ProxyState>,
) -> Result<serde_json::Value, String> {
    let server_lock = state.server.read().await;
    if let Some(server) = server_lock.as_ref() {
        let models = server.get_available_models().await?;
        Ok(serde_json::json!({
            "models": models,
            "fromCache": false
        }))
    } else {
        Err("代理服务器未初始化".to_string())
    }
}

/// 获取代理日志
#[tauri::command]
pub async fn get_proxy_logs(
    limit: Option<usize>,
    state: State<'_, ProxyState>,
) -> Result<serde_json::Value, String> {
    let server_lock = state.server.read().await;
    if let Some(server) = server_lock.as_ref() {
        let logs = server.get_recent_logs(limit.unwrap_or(100));
        Ok(serde_json::json!({ "logs": logs }))
    } else {
        Ok(serde_json::json!({ "logs": [] }))
    }
}

/// 重置累计统计
#[tauri::command]
pub async fn reset_proxy_stats(
    state: State<'_, ProxyState>,
) -> Result<serde_json::Value, String> {
    let server_lock = state.server.read().await;
    if let Some(server) = server_lock.as_ref() {
        server.reset_total_stats();
        Ok(serde_json::json!({ "success": true }))
    } else {
        Err("代理服务器未初始化".to_string())
    }
}
