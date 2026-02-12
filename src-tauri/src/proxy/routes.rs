// HTTP 路由处理
use super::account_pool::AccountPool;
use super::kiro_api::{call_kiro_api, fetch_kiro_models};
use super::translator::{claude_to_kiro, kiro_to_claude_response, kiro_to_openai_response, openai_to_kiro};
use super::types::*;
use std::sync::{Arc, Mutex};
use warp::Filter;

/// 创建健康检查路由
pub fn health_route() -> impl Filter<Extract = impl warp::Reply, Error = warp::Rejection> + Clone {
    warp::path("health")
        .map(|| warp::reply::json(&serde_json::json!({"status": "ok"})))
}

/// 创建模型列表路由
pub fn models_route(
    account_pool: Arc<AccountPool>,
    config: Arc<tokio::sync::RwLock<ProxyConfig>>,
) -> impl Filter<Extract = impl warp::Reply, Error = warp::Rejection> + Clone {
    warp::path!("v1" / "models")
        .and(warp::get())
        .and(warp::header::optional::<String>("authorization"))
        .and(warp::any().map(move || account_pool.clone()))
        .and(warp::any().map(move || config.clone()))
        .and_then(handle_models)
}

/// 处理模型列表请求
async fn handle_models(
    auth_header: Option<String>,
    pool: Arc<AccountPool>,
    config: Arc<tokio::sync::RwLock<ProxyConfig>>,
) -> Result<impl warp::Reply, warp::Rejection> {
    // 验证 API Key
    let config_read = config.read().await;
    let has_api_keys = config_read.api_keys.as_ref().map(|keys| !keys.is_empty()).unwrap_or(false);
    
    println!("[Models] Authorization 头: {:?}", auth_header);
    println!("[Models] 是否配置了 API Keys: {}", has_api_keys);
    
    if has_api_keys {
        let api_keys = config_read.api_keys.as_ref().unwrap();
        
        // 提取 Bearer Token
        let provided_key = auth_header
            .as_ref()
            .and_then(|h| h.strip_prefix("Bearer "))
            .map(|s| s.trim());
        
        println!("[Models] 提取的 API Key: {:?}", provided_key);
        
        if provided_key.is_none() {
            drop(config_read);
            return Ok(warp::reply::with_status(
                warp::reply::json(&serde_json::json!({
                    "error": {
                        "message": "缺少 Authorization 头",
                        "type": "invalid_request_error",
                        "code": "missing_authorization"
                    }
                })),
                warp::http::StatusCode::UNAUTHORIZED,
            ));
        }
        
        let provided_key = provided_key.unwrap();
        
        // 验证 API Key 是否有效且启用
        let valid_key = api_keys.iter().find(|k| {
            println!("[Models] 检查 API Key: {} (enabled: {})", k.key, k.enabled);
            k.enabled && k.key == provided_key
        });
        
        println!("[Models] 验证结果: {}", valid_key.is_some());
        
        if valid_key.is_none() {
            drop(config_read);
            return Ok(warp::reply::with_status(
                warp::reply::json(&serde_json::json!({
                    "error": {
                        "message": "无效的 API Key",
                        "type": "invalid_request_error",
                        "code": "invalid_api_key"
                    }
                })),
                warp::http::StatusCode::UNAUTHORIZED,
            ));
        }
    }
    
    drop(config_read);
    
    let accounts = pool.get_all_accounts();
    if accounts.is_empty() {
        return Ok(warp::reply::with_status(
            warp::reply::json(&serde_json::json!({
                "error": {
                    "message": "没有可用账号",
                    "type": "server_error",
                    "code": "no_accounts"
                }
            })),
            warp::http::StatusCode::SERVICE_UNAVAILABLE,
        ));
    }

    match fetch_kiro_models(&accounts[0]).await {
        Ok(kiro_models) => {
            // 转换为 OpenAI 格式
            let openai_models: Vec<serde_json::Value> = kiro_models
                .iter()
                .filter_map(|model| {
                    let model_id = model.get("modelId")?.as_str()?;
                    
                    Some(serde_json::json!({
                        "id": model_id,
                        "object": "model",
                        "created": chrono::Utc::now().timestamp(),
                        "owned_by": "amazon",
                        "permission": [],
                        "root": model_id,
                        "parent": null
                    }))
                })
                .collect();

            Ok(warp::reply::with_status(
                warp::reply::json(&serde_json::json!({
                    "object": "list",
                    "data": openai_models
                })),
                warp::http::StatusCode::OK,
            ))
        }
        Err(e) => Ok(warp::reply::with_status(
            warp::reply::json(&serde_json::json!({
                "error": {
                    "message": e,
                    "type": "server_error",
                    "code": "fetch_models_failed"
                }
            })),
            warp::http::StatusCode::INTERNAL_SERVER_ERROR,
        )),
    }
}

/// 创建 OpenAI Chat Completions 路由
pub fn chat_completions_route(
    account_pool: Arc<AccountPool>,
    stats: Arc<Mutex<ProxyStats>>,
    session_stats: Arc<Mutex<SessionStats>>,
    recent_logs: Arc<Mutex<Vec<RequestLog>>>,
    config: Arc<tokio::sync::RwLock<ProxyConfig>>,
) -> impl Filter<Extract = impl warp::Reply, Error = warp::Rejection> + Clone {
    warp::path!("v1" / "chat" / "completions")
        .and(warp::post())
        .and(warp::header::optional::<String>("authorization"))
        .and(warp::body::json())
        .and(warp::any().map(move || account_pool.clone()))
        .and(warp::any().map(move || stats.clone()))
        .and(warp::any().map(move || session_stats.clone()))
        .and(warp::any().map(move || recent_logs.clone()))
        .and(warp::any().map(move || config.clone()))
        .and_then(handle_chat_completions)
}

/// 处理 OpenAI Chat Completions 请求
async fn handle_chat_completions(
    auth_header: Option<String>,
    body: serde_json::Value,
    pool: Arc<AccountPool>,
    stats_arc: Arc<Mutex<ProxyStats>>,
    session_stats_arc: Arc<Mutex<SessionStats>>,
    recent_logs_arc: Arc<Mutex<Vec<RequestLog>>>,
    config: Arc<tokio::sync::RwLock<ProxyConfig>>,
) -> Result<impl warp::Reply, warp::Rejection> {
    // 检查是否启用 OpenAI API
    let config_read = config.read().await;
    if !config_read.enable_openai {
        drop(config_read);
        return Ok(warp::reply::with_status(
            warp::reply::json(&serde_json::json!({
                "error": {
                    "message": "OpenAI API 未启用",
                    "type": "invalid_request_error",
                    "code": "endpoint_disabled"
                }
            })),
            warp::http::StatusCode::FORBIDDEN,
        ));
    }
    
    // 验证 API Key
    let has_api_keys = config_read.api_keys.as_ref().map(|keys| !keys.is_empty()).unwrap_or(false);
    
    println!("[OpenAI] Authorization 头: {:?}", auth_header);
    println!("[OpenAI] 是否配置了 API Keys: {}", has_api_keys);
    
    if has_api_keys {
        let api_keys = config_read.api_keys.as_ref().unwrap();
        
        // 提取 Bearer Token
        let provided_key = auth_header
            .as_ref()
            .and_then(|h| h.strip_prefix("Bearer "))
            .map(|s| s.trim());
        
        println!("[OpenAI] 提取的 API Key: {:?}", provided_key);
        
        if provided_key.is_none() {
            drop(config_read);
            return Ok(warp::reply::with_status(
                warp::reply::json(&serde_json::json!({
                    "error": {
                        "message": "缺少 Authorization 头",
                        "type": "invalid_request_error",
                        "code": "missing_authorization"
                    }
                })),
                warp::http::StatusCode::UNAUTHORIZED,
            ));
        }
        
        let provided_key = provided_key.unwrap();
        
        // 验证 API Key 是否有效且启用
        let valid_key = api_keys.iter().find(|k| {
            println!("[OpenAI] 检查 API Key: {} (enabled: {})", k.key, k.enabled);
            k.enabled && k.key == provided_key
        });
        
        println!("[OpenAI] 验证结果: {}", valid_key.is_some());
        
        if valid_key.is_none() {
            drop(config_read);
            return Ok(warp::reply::with_status(
                warp::reply::json(&serde_json::json!({
                    "error": {
                        "message": "无效的 API Key",
                        "type": "invalid_request_error",
                        "code": "invalid_api_key"
                    }
                })),
                warp::http::StatusCode::UNAUTHORIZED,
            ));
        }
    }
    
    drop(config_read);
    
    // 检查是否为流式请求
    let is_stream = body.get("stream")
        .and_then(|s| s.as_bool())
        .unwrap_or(false);
    
    if is_stream {
        return Ok(warp::reply::with_status(
            warp::reply::json(&serde_json::json!({
                "error": {
                    "message": "暂不支持流式请求",
                    "type": "invalid_request_error",
                    "code": "stream_not_supported"
                }
            })),
            warp::http::StatusCode::BAD_REQUEST,
        ));
    }
    
    // 解析请求
    let openai_request: OpenAIChatRequest = match serde_json::from_value(body.clone()) {
        Ok(req) => req,
        Err(e) => {
            return Ok(warp::reply::with_status(
                warp::reply::json(&serde_json::json!({
                    "error": {
                        "message": format!("无效的请求格式: {}", e),
                        "type": "invalid_request_error",
                        "code": "invalid_format"
                    }
                })),
                warp::http::StatusCode::BAD_REQUEST,
            ));
        }
    };
    
    let model = openai_request.model.clone();
    
    // 转换为 Kiro 格式
    let kiro_request = openai_to_kiro(&openai_request);
    
    // 获取账号
    let account = match pool.get_next_account() {
        Some(acc) => acc,
        None => {
            return Ok(warp::reply::with_status(
                warp::reply::json(&serde_json::json!({
                    "error": {
                        "message": "没有可用账号",
                        "type": "server_error",
                        "code": "no_accounts"
                    }
                })),
                warp::http::StatusCode::SERVICE_UNAVAILABLE,
            ));
        }
    };
    
    // 调用 Kiro API
    let result = call_kiro_api(&account, &kiro_request, &model, 0).await;
    
    match result {
        Ok(kiro_response) => {
            // 转换为 OpenAI 格式
            match kiro_to_openai_response(&kiro_response, &model) {
                Ok(openai_response) => {
                    // 提取 token 信息
                    let input_tokens = kiro_response
                        .get("inputTokens")
                        .and_then(|t| t.as_u64())
                        .unwrap_or(0);
                    let output_tokens = kiro_response
                        .get("outputTokens")
                        .and_then(|t| t.as_u64())
                        .unwrap_or(0);
                    let credits = kiro_response
                        .get("credits")
                        .and_then(|c| c.as_f64())
                        .unwrap_or(0.0);
                    
                    // 更新统计
                    {
                        let mut stats = stats_arc.lock().unwrap();
                        let mut session_stats = session_stats_arc.lock().unwrap();
                        
                        stats.total_requests += 1;
                        stats.success_requests += 1;
                        stats.input_tokens += input_tokens;
                        stats.output_tokens += output_tokens;
                        stats.total_tokens += input_tokens + output_tokens;
                        stats.total_credits += credits;
                        
                        session_stats.total_requests += 1;
                        session_stats.success_requests += 1;
                    }
                    
                    // 记录日志
                    {
                        let mut logs = recent_logs_arc.lock().unwrap();
                        logs.push(RequestLog {
                            time: chrono::Utc::now().to_rfc3339(),
                            path: "/v1/chat/completions".to_string(),
                            model: Some(model.clone()),
                            status: 200,
                            tokens: Some(input_tokens + output_tokens),
                            input_tokens: Some(input_tokens),
                            output_tokens: Some(output_tokens),
                            credits: Some(credits),
                            error: None,
                        });
                        if logs.len() > 1000 {
                            logs.drain(0..100);
                        }
                    }
                    
                    Ok(warp::reply::with_status(
                        warp::reply::json(&openai_response),
                        warp::http::StatusCode::OK,
                    ))
                }
                Err(e) => {
                    Ok(warp::reply::with_status(
                        warp::reply::json(&serde_json::json!({
                            "error": {
                                "message": format!("响应转换失败: {}", e),
                                "type": "server_error",
                                "code": "response_conversion_failed"
                            }
                        })),
                        warp::http::StatusCode::INTERNAL_SERVER_ERROR,
                    ))
                }
            }
        }
        Err(e) => {
            // 更新失败统计
            {
                let mut stats = stats_arc.lock().unwrap();
                let mut session_stats = session_stats_arc.lock().unwrap();
                
                stats.total_requests += 1;
                stats.failed_requests += 1;
                
                session_stats.total_requests += 1;
                session_stats.failed_requests += 1;
            }
            
            // 记录错误日志
            {
                let mut logs = recent_logs_arc.lock().unwrap();
                logs.push(RequestLog {
                    time: chrono::Utc::now().to_rfc3339(),
                    path: "/v1/chat/completions".to_string(),
                    model: Some(model.clone()),
                    status: 500,
                    tokens: None,
                    input_tokens: None,
                    output_tokens: None,
                    credits: None,
                    error: Some(e.clone()),
                });
                if logs.len() > 1000 {
                    logs.drain(0..100);
                }
            }
            
            Ok(warp::reply::with_status(
                warp::reply::json(&serde_json::json!({
                    "error": {
                        "message": e,
                        "type": "server_error",
                        "code": "api_call_failed"
                    }
                })),
                warp::http::StatusCode::INTERNAL_SERVER_ERROR,
            ))
        }
    }
}

/// 创建 Claude Messages 路由
pub fn claude_messages_route(
    account_pool: Arc<AccountPool>,
    stats: Arc<Mutex<ProxyStats>>,
    session_stats: Arc<Mutex<SessionStats>>,
    recent_logs: Arc<Mutex<Vec<RequestLog>>>,
    config: Arc<tokio::sync::RwLock<ProxyConfig>>,
) -> impl Filter<Extract = impl warp::Reply, Error = warp::Rejection> + Clone {
    warp::path!("v1" / "messages")
        .or(warp::path("messages"))
        .unify()
        .and(warp::post())
        .and(warp::header::optional::<String>("authorization"))
        .and(warp::body::json())
        .and(warp::any().map(move || account_pool.clone()))
        .and(warp::any().map(move || stats.clone()))
        .and(warp::any().map(move || session_stats.clone()))
        .and(warp::any().map(move || recent_logs.clone()))
        .and(warp::any().map(move || config.clone()))
        .and_then(handle_claude_messages)
}

/// 处理 Claude Messages 请求
async fn handle_claude_messages(
    auth_header: Option<String>,
    body: serde_json::Value,
    pool: Arc<AccountPool>,
    stats_arc: Arc<Mutex<ProxyStats>>,
    session_stats_arc: Arc<Mutex<SessionStats>>,
    recent_logs_arc: Arc<Mutex<Vec<RequestLog>>>,
    config: Arc<tokio::sync::RwLock<ProxyConfig>>,
) -> Result<impl warp::Reply, warp::Rejection> {
    // 检查是否启用 Claude API
    let config_read = config.read().await;
    if !config_read.enable_claude {
        drop(config_read);
        return Ok(warp::reply::with_status(
            warp::reply::json(&serde_json::json!({
                "error": {
                    "type": "invalid_request_error",
                    "message": "Claude API 未启用"
                }
            })),
            warp::http::StatusCode::FORBIDDEN,
        ));
    }
    
    // 验证 API Key
    let has_api_keys = config_read.api_keys.as_ref().map(|keys| !keys.is_empty()).unwrap_or(false);
    
    println!("[Claude] Authorization 头: {:?}", auth_header);
    println!("[Claude] 是否配置了 API Keys: {}", has_api_keys);
    
    if has_api_keys {
        let api_keys = config_read.api_keys.as_ref().unwrap();
        
        // 提取 Bearer Token 或 x-api-key
        let provided_key = auth_header
            .as_ref()
            .and_then(|h| {
                h.strip_prefix("Bearer ")
                    .or_else(|| h.strip_prefix("x-api-key: "))
            })
            .map(|s| s.trim());
        
        println!("[Claude] 提取的 API Key: {:?}", provided_key);
        
        if provided_key.is_none() {
            drop(config_read);
            return Ok(warp::reply::with_status(
                warp::reply::json(&serde_json::json!({
                    "error": {
                        "type": "invalid_request_error",
                        "message": "缺少 Authorization 头"
                    }
                })),
                warp::http::StatusCode::UNAUTHORIZED,
            ));
        }
        
        let provided_key = provided_key.unwrap();
        
        // 验证 API Key 是否有效且启用
        let valid_key = api_keys.iter().find(|k| {
            println!("[Claude] 检查 API Key: {} (enabled: {})", k.key, k.enabled);
            k.enabled && k.key == provided_key
        });
        
        println!("[Claude] 验证结果: {}", valid_key.is_some());
        
        if valid_key.is_none() {
            drop(config_read);
            return Ok(warp::reply::with_status(
                warp::reply::json(&serde_json::json!({
                    "error": {
                        "type": "invalid_request_error",
                        "message": "无效的 API Key"
                    }
                })),
                warp::http::StatusCode::UNAUTHORIZED,
            ));
        }
    }
    
    // 检查是否为流式请求
    let is_stream = body.get("stream")
        .and_then(|s| s.as_bool())
        .unwrap_or(false);
    
    if is_stream {
        return Ok(warp::reply::with_status(
            warp::reply::json(&serde_json::json!({
                "error": {
                    "type": "invalid_request_error",
                    "message": "暂不支持流式请求"
                }
            })),
            warp::http::StatusCode::BAD_REQUEST,
        ));
    }
    
    // 解析请求
    let claude_request: ClaudeRequest = match serde_json::from_value(body.clone()) {
        Ok(req) => req,
        Err(e) => {
            return Ok(warp::reply::with_status(
                warp::reply::json(&serde_json::json!({
                    "error": {
                        "type": "invalid_request_error",
                        "message": format!("无效的请求格式: {}", e)
                    }
                })),
                warp::http::StatusCode::BAD_REQUEST,
            ));
        }
    };
    
    let model = claude_request.model.clone();
    
    // 转换为 Kiro 格式
    let kiro_request = claude_to_kiro(&claude_request);
    
    // 获取账号
    let account = match pool.get_next_account() {
        Some(acc) => acc,
        None => {
            return Ok(warp::reply::with_status(
                warp::reply::json(&serde_json::json!({
                    "error": {
                        "type": "api_error",
                        "message": "没有可用账号"
                    }
                })),
                warp::http::StatusCode::SERVICE_UNAVAILABLE,
            ));
        }
    };
    
    // 调用 Kiro API
    let result = call_kiro_api(&account, &kiro_request, &model, 0).await;
    
    match result {
        Ok(kiro_response) => {
            // 转换为 Claude 格式
            match kiro_to_claude_response(&kiro_response, &model) {
                Ok(claude_response) => {
                    // 提取 token 信息
                    let input_tokens = kiro_response
                        .get("inputTokens")
                        .and_then(|t| t.as_u64())
                        .unwrap_or(0);
                    let output_tokens = kiro_response
                        .get("outputTokens")
                        .and_then(|t| t.as_u64())
                        .unwrap_or(0);
                    let credits = kiro_response
                        .get("credits")
                        .and_then(|c| c.as_f64())
                        .unwrap_or(0.0);
                    
                    // 更新统计
                    {
                        let mut stats = stats_arc.lock().unwrap();
                        let mut session_stats = session_stats_arc.lock().unwrap();
                        
                        stats.total_requests += 1;
                        stats.success_requests += 1;
                        stats.input_tokens += input_tokens;
                        stats.output_tokens += output_tokens;
                        stats.total_tokens += input_tokens + output_tokens;
                        stats.total_credits += credits;
                        
                        session_stats.total_requests += 1;
                        session_stats.success_requests += 1;
                    }
                    
                    // 记录日志
                    {
                        let mut logs = recent_logs_arc.lock().unwrap();
                        logs.push(RequestLog {
                            time: chrono::Utc::now().to_rfc3339(),
                            path: "/v1/messages".to_string(),
                            model: Some(model.clone()),
                            status: 200,
                            tokens: Some(input_tokens + output_tokens),
                            input_tokens: Some(input_tokens),
                            output_tokens: Some(output_tokens),
                            credits: Some(credits),
                            error: None,
                        });
                        if logs.len() > 1000 {
                            logs.drain(0..100);
                        }
                    }
                    
                    Ok(warp::reply::with_status(
                        warp::reply::json(&claude_response),
                        warp::http::StatusCode::OK,
                    ))
                }
                Err(e) => {
                    Ok(warp::reply::with_status(
                        warp::reply::json(&serde_json::json!({
                            "error": {
                                "type": "api_error",
                                "message": format!("响应转换失败: {}", e)
                            }
                        })),
                        warp::http::StatusCode::INTERNAL_SERVER_ERROR,
                    ))
                }
            }
        }
        Err(e) => {
            // 更新失败统计
            {
                let mut stats = stats_arc.lock().unwrap();
                let mut session_stats = session_stats_arc.lock().unwrap();
                
                stats.total_requests += 1;
                stats.failed_requests += 1;
                
                session_stats.total_requests += 1;
                session_stats.failed_requests += 1;
            }
            
            // 记录错误日志
            {
                let mut logs = recent_logs_arc.lock().unwrap();
                logs.push(RequestLog {
                    time: chrono::Utc::now().to_rfc3339(),
                    path: "/v1/messages".to_string(),
                    model: Some(model.clone()),
                    status: 500,
                    tokens: None,
                    input_tokens: None,
                    output_tokens: None,
                    credits: None,
                    error: Some(e.clone()),
                });
                if logs.len() > 1000 {
                    logs.drain(0..100);
                }
            }
            
            Ok(warp::reply::with_status(
                warp::reply::json(&serde_json::json!({
                    "error": {
                        "type": "api_error",
                        "message": e
                    }
                })),
                warp::http::StatusCode::INTERNAL_SERVER_ERROR,
            ))
        }
    }
}
