// HTTP 代理服务器
use super::account_pool::AccountPool;
use super::routes;
use super::types::*;
use serde_json::Value;
use std::sync::{Arc, Mutex};
use tokio::sync::RwLock;
use warp::Filter;

/// 代理服务器
pub struct ProxyServer {
    config: Arc<RwLock<ProxyConfig>>,
    account_pool: Arc<AccountPool>,
    stats: Arc<Mutex<ProxyStats>>,
    session_stats: Arc<Mutex<SessionStats>>,
    recent_logs: Arc<Mutex<Vec<RequestLog>>>,
    is_running: Arc<Mutex<bool>>,
    shutdown_tx: Arc<Mutex<Option<tokio::sync::oneshot::Sender<()>>>>,
}

impl ProxyServer {
    /// 创建新的代理服务器
    pub fn new(config: ProxyConfig) -> Self {
        Self {
            config: Arc::new(RwLock::new(config)),
            account_pool: Arc::new(AccountPool::new()),
            stats: Arc::new(Mutex::new(ProxyStats::default())),
            session_stats: Arc::new(Mutex::new(SessionStats {
                start_time: chrono::Utc::now().timestamp_millis(),
                ..Default::default()
            })),
            recent_logs: Arc::new(Mutex::new(Vec::new())),
            is_running: Arc::new(Mutex::new(false)),
            shutdown_tx: Arc::new(Mutex::new(None)),
        }
    }

    /// 启动服务器
    pub async fn start(&self) -> Result<(), String> {
        {
            let mut is_running = self.is_running.lock().unwrap();
            if *is_running {
                return Err("服务器已在运行".to_string());
            }
            *is_running = true;
        }

        let config = self.config.read().await;
        let port = config.port;
        let host = config.host.clone();
        let enable_openai = config.enable_openai;
        let enable_claude = config.enable_claude;
        drop(config);

        // 重置会话统计
        {
            let mut session_stats = self.session_stats.lock().unwrap();
            *session_stats = SessionStats {
                start_time: chrono::Utc::now().timestamp_millis(),
                ..Default::default()
            };
        }

        println!("[ProxyServer] 启动服务器: {}:{}", host, port);

        // 创建关闭信号
        let (shutdown_tx, shutdown_rx) = tokio::sync::oneshot::channel::<()>();
        {
            let mut tx = self.shutdown_tx.lock().unwrap();
            *tx = Some(shutdown_tx);
        }

        // 克隆需要的数据
        let account_pool = self.account_pool.clone();
        let stats = self.stats.clone();
        let session_stats = self.session_stats.clone();
        let recent_logs = self.recent_logs.clone();
        let config_arc = self.config.clone();

        // 在后台线程启动 HTTP 服务器
        tokio::spawn(async move {
            use warp::Filter;
            
            // 创建所有路由
            let health = routes::health_route();
            let models = routes::models_route(account_pool.clone(), config_arc.clone());
            let chat = routes::chat_completions_route(
                account_pool.clone(),
                stats.clone(),
                session_stats.clone(),
                recent_logs.clone(),
                config_arc.clone(),
            );
            let messages = routes::claude_messages_route(
                account_pool.clone(),
                stats.clone(),
                session_stats.clone(),
                recent_logs.clone(),
                config_arc.clone(),
            );

            let all_routes = health.or(models).or(chat).or(messages);

            let addr: std::net::SocketAddr = format!("{}:{}", host, port)
                .parse()
                .expect("无效的地址");

            let (_, server) = warp::serve(all_routes)
                .bind_with_graceful_shutdown(addr, async {
                    shutdown_rx.await.ok();
                });

            println!("[ProxyServer] HTTP 服务器已启动: {}", addr);
            println!("[ProxyServer] OpenAI API: {}", if enable_openai { "启用" } else { "禁用" });
            println!("[ProxyServer] Claude API: {}", if enable_claude { "启用" } else { "禁用" });
            server.await;
            println!("[ProxyServer] HTTP 服务器已停止");
        });

        Ok(())
    }

    /// 停止服务器
    pub async fn stop(&self) -> Result<(), String> {
        {
            let mut is_running = self.is_running.lock().unwrap();
            if !*is_running {
                return Ok(());
            }
            *is_running = false;
        }

        // 发送关闭信号
        {
            let mut tx = self.shutdown_tx.lock().unwrap();
            if let Some(sender) = tx.take() {
                let _ = sender.send(());
            }
        }

        println!("[ProxyServer] 停止服务器");

        Ok(())
    }

    /// 是否正在运行
    pub fn is_running(&self) -> bool {
        *self.is_running.lock().unwrap()
    }

    /// 获取配置
    pub async fn get_config(&self) -> ProxyConfig {
        self.config.read().await.clone()
    }

    /// 更新配置
    pub async fn update_config(&self, new_config: ProxyConfig) {
        let mut config = self.config.write().await;
        *config = new_config;
    }

    /// 获取统计信息
    pub fn get_stats(&self) -> ProxyStats {
        self.stats.lock().unwrap().clone()
    }

    /// 获取会话统计
    pub fn get_session_stats(&self) -> SessionStats {
        self.session_stats.lock().unwrap().clone()
    }

    /// 获取最近日志
    pub fn get_recent_logs(&self, limit: usize) -> Vec<RequestLog> {
        let logs = self.recent_logs.lock().unwrap();
        logs.iter().rev().take(limit).cloned().collect()
    }

    /// 同步账号
    pub fn sync_accounts(&self, accounts: Vec<ProxyAccount>) -> usize {
        self.account_pool.clear();
        self.account_pool.add_accounts(accounts);
        self.account_pool.get_all_accounts().len()
    }

    /// 获取账号池信息
    pub fn get_accounts_info(&self) -> (Vec<ProxyAccount>, usize) {
        let accounts = self.account_pool.get_all_accounts();
        let available_count = self.account_pool.get_available_count();
        (accounts, available_count)
    }

    /// 获取可用模型
    pub async fn get_available_models(&self) -> Result<Vec<Value>, String> {
        use super::kiro_api::fetch_kiro_models;
        
        let accounts = self.account_pool.get_all_accounts();
        
        if accounts.is_empty() {
            return Err("账号池为空，请先同步账号".to_string());
        }

        // 使用第一个可用账号获取模型列表
        let account = accounts.first().ok_or("没有可用账号")?;
        fetch_kiro_models(account).await
    }

    /// 记录请求
    fn record_request(&self, log: RequestLog) {
        let mut logs = self.recent_logs.lock().unwrap();
        logs.push(log);
        if logs.len() > 1000 {
            logs.drain(0..100);
        }
    }

    /// 更新统计
    fn update_stats(
        &self,
        success: bool,
        input_tokens: u64,
        output_tokens: u64,
        credits: f64,
    ) {
        let mut stats = self.stats.lock().unwrap();
        let mut session_stats = self.session_stats.lock().unwrap();

        if success {
            stats.success_requests += 1;
            session_stats.success_requests += 1;
        } else {
            stats.failed_requests += 1;
            session_stats.failed_requests += 1;
        }

        stats.total_requests += 1;
        stats.input_tokens += input_tokens;
        stats.output_tokens += output_tokens;
        stats.total_tokens += input_tokens + output_tokens;
        stats.total_credits += credits;

        session_stats.total_requests += 1;
    }

    /// 重置累计统计
    pub fn reset_total_stats(&self) {
        let mut stats = self.stats.lock().unwrap();
        stats.total_credits = 0.0;
        stats.input_tokens = 0;
        stats.output_tokens = 0;
        stats.total_tokens = 0;
        stats.total_requests = 0;
        stats.success_requests = 0;
        stats.failed_requests = 0;
    }
}
