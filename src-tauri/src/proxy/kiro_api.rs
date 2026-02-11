// Kiro API 调用
use super::types::{KiroRequest, ProxyAccount};
use reqwest::Client;
use serde_json::Value;
use std::time::Duration;

/// Kiro API 端点配置
const KIRO_ENDPOINTS: &[(&str, &str, &str)] = &[
    (
        "https://codewhisperer.us-east-1.amazonaws.com/generateAssistantResponse",
        "AI_EDITOR",
        "AmazonCodeWhispererStreamingService.GenerateAssistantResponse"
    ),
    (
        "https://q.us-east-1.amazonaws.com/generateAssistantResponse",
        "CLI",
        "AmazonQDeveloperStreamingService.SendMessage"
    ),
];

/// 调用 Kiro API（非流式）
pub async fn call_kiro_api(
    account: &ProxyAccount,
    request: &KiroRequest,
    model: &str,
    endpoint_index: usize,
) -> Result<Value, String> {
    let client = Client::builder()
        .timeout(Duration::from_secs(120))
        .build()
        .map_err(|e| format!("创建 HTTP 客户端失败: {}", e))?;

    let (url, origin, amz_target) = KIRO_ENDPOINTS
        .get(endpoint_index)
        .ok_or("无效的端点索引")?;

    let mut headers = reqwest::header::HeaderMap::new();
    headers.insert(
        "Authorization",
        format!("Bearer {}", account.access_token)
            .parse()
            .map_err(|e| format!("无效的 Authorization 头: {}", e))?,
    );
    headers.insert(
        "Content-Type",
        "application/json"
            .parse()
            .map_err(|e| format!("无效的 Content-Type 头: {}", e))?,
    );
    headers.insert(
        "Accept",
        "*/*"
            .parse()
            .map_err(|e| format!("无效的 Accept 头: {}", e))?,
    );
    headers.insert(
        "X-Amz-Target",
        amz_target
            .parse()
            .map_err(|e| format!("无效的 X-Amz-Target 头: {}", e))?,
    );
    headers.insert(
        "User-Agent",
        "aws-sdk-js/1.0.18 ua/2.1 os/windows lang/js md/nodejs#20.16.0 api/codewhispererstreaming#1.0.18 m/E KiroIDE-0.6.18"
            .parse()
            .map_err(|e| format!("无效的 User-Agent 头: {}", e))?,
    );
    headers.insert(
        "X-Amz-User-Agent",
        "aws-sdk-js/1.0.18 KiroIDE-0.6.18"
            .parse()
            .map_err(|e| format!("无效的 X-Amz-User-Agent 头: {}", e))?,
    );
    headers.insert(
        "x-amzn-kiro-agent-mode",
        "spec"
            .parse()
            .map_err(|e| format!("无效的 agent-mode 头: {}", e))?,
    );
    headers.insert(
        "x-amzn-codewhisperer-optout",
        "true"
            .parse()
            .map_err(|e| format!("无效的 optout 头: {}", e))?,
    );
    headers.insert(
        "Amz-Sdk-Request",
        "attempt=1; max=3"
            .parse()
            .map_err(|e| format!("无效的 Sdk-Request 头: {}", e))?,
    );
    headers.insert(
        "Amz-Sdk-Invocation-Id",
        uuid::Uuid::new_v4().to_string()
            .parse()
            .map_err(|e| format!("无效的 Invocation-Id 头: {}", e))?,
    );

    // 构建请求体 - 使用 Kiro 原生格式
    let mut body = serde_json::to_value(request)
        .map_err(|e| format!("序列化请求失败: {}", e))?;

    // 更新 origin 和 modelId
    if let Some(obj) = body.as_object_mut() {
        if let Some(conv_state) = obj.get_mut("conversationState") {
            if let Some(current_msg) = conv_state.get_mut("currentMessage") {
                if let Some(user_input) = current_msg.get_mut("userInputMessage") {
                    if let Some(user_obj) = user_input.as_object_mut() {
                        user_obj.insert("origin".to_string(), Value::String(origin.to_string()));
                        user_obj.insert("modelId".to_string(), Value::String(model.to_string()));
                    }
                }
            }
        }
    }

    println!("[KiroAPI] 请求 URL: {}", url);
    println!("[KiroAPI] 请求体: {}", serde_json::to_string_pretty(&body).unwrap_or_default());

    let response = client
        .post(*url)
        .headers(headers)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("请求失败: {}", e))?;

    let status = response.status();
    if !status.is_success() {
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "无法读取错误响应".to_string());
        return Err(format!("API 返回错误 {}: {}", status.as_u16(), error_text));
    }

    // 获取原始字节，解析 AWS Event Stream 格式
    let response_bytes = response
        .bytes()
        .await
        .map_err(|e| format!("读取响应失败: {}", e))?;

    println!("[KiroAPI] 响应字节数: {}", response_bytes.len());

    // 解析 Event Stream，提取所有 content
    let mut full_content = String::new();
    let mut input_tokens = 0u64;
    let mut output_tokens = 0u64;
    let mut credits = 0.0f64;

    let mut offset = 0;
    while offset < response_bytes.len() {
        if offset + 16 > response_bytes.len() {
            break;
        }

        // 读取消息头
        let total_length = u32::from_be_bytes([
            response_bytes[offset],
            response_bytes[offset + 1],
            response_bytes[offset + 2],
            response_bytes[offset + 3],
        ]) as usize;

        if offset + total_length > response_bytes.len() {
            break;
        }

        let headers_length = u32::from_be_bytes([
            response_bytes[offset + 4],
            response_bytes[offset + 5],
            response_bytes[offset + 6],
            response_bytes[offset + 7],
        ]) as usize;

        // 提取 payload
        let payload_start = offset + 12 + headers_length;
        let payload_end = offset + total_length - 4; // 减去 message CRC

        if payload_start < payload_end && payload_end <= response_bytes.len() {
            let payload_bytes = &response_bytes[payload_start..payload_end];
            
            // 尝试解析 payload 为 JSON
            if let Ok(payload_text) = String::from_utf8(payload_bytes.to_vec()) {
                if let Ok(event) = serde_json::from_str::<Value>(&payload_text) {
                    // 提取 content
                    if let Some(content) = event.get("content").and_then(|c| c.as_str()) {
                        full_content.push_str(content);
                    }
                    
                    // 提取 token 信息
                    if let Some(tokens) = event.get("inputTokens").and_then(|t| t.as_u64()) {
                        input_tokens = tokens;
                    }
                    if let Some(tokens) = event.get("outputTokens").and_then(|t| t.as_u64()) {
                        output_tokens = tokens;
                    }
                    if let Some(c) = event.get("credits").and_then(|c| c.as_f64()) {
                        credits = c;
                    }
                }
            }
        }

        offset += total_length;
    }

    println!("[KiroAPI] 提取的完整内容: {}", full_content);
    println!("[KiroAPI] Tokens - Input: {}, Output: {}, Credits: {}", input_tokens, output_tokens, credits);

    // 构建统一的响应格式
    let result = serde_json::json!({
        "message": full_content,
        "inputTokens": input_tokens,
        "outputTokens": output_tokens,
        "credits": credits
    });

    Ok(result)
}

/// 调用 Kiro API（流式）
pub async fn call_kiro_api_stream(
    account: &ProxyAccount,
    request: &KiroRequest,
    model: &str,
    endpoint_index: usize,
) -> Result<reqwest::Response, String> {
    let client = Client::builder()
        .timeout(Duration::from_secs(300))
        .build()
        .map_err(|e| format!("创建 HTTP 客户端失败: {}", e))?;

    let (base_url, origin, amz_target) = KIRO_ENDPOINTS
        .get(endpoint_index)
        .ok_or("无效的端点索引")?;

    // 流式端点暂不支持
    return Err("暂不支持流式请求".to_string());
}

/// 获取可用模型列表
pub async fn fetch_kiro_models(account: &ProxyAccount) -> Result<Vec<Value>, String> {
    let client = Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|e| format!("创建 HTTP 客户端失败: {}", e))?;

    let region = account.region.as_deref().unwrap_or("us-east-1");
    let base_url = if region.starts_with("eu-") {
        "https://q.eu-central-1.amazonaws.com"
    } else {
        "https://q.us-east-1.amazonaws.com"
    };

    let url = format!("{}/ListAvailableModels?origin=AI_EDITOR&maxResults=50", base_url);

    let mut headers = reqwest::header::HeaderMap::new();
    headers.insert(
        "Authorization",
        format!("Bearer {}", account.access_token)
            .parse()
            .map_err(|e| format!("无效的 Authorization 头: {}", e))?,
    );
    headers.insert(
        "Content-Type",
        "application/json"
            .parse()
            .map_err(|e| format!("无效的 Content-Type 头: {}", e))?,
    );
    headers.insert(
        "Accept",
        "application/json"
            .parse()
            .map_err(|e| format!("无效的 Accept 头: {}", e))?,
    );

    let response = client
        .get(&url)
        .headers(headers)
        .send()
        .await
        .map_err(|e| format!("请求失败: {}", e))?;

    let status = response.status();
    if !status.is_success() {
        return Err(format!("API 返回错误: {}", status.as_u16()));
    }

    let result: Value = response
        .json()
        .await
        .map_err(|e| format!("解析响应失败: {}", e))?;

    let models = result
        .get("models")
        .and_then(|m| m.as_array())
        .map(|arr| arr.to_vec())
        .unwrap_or_default();

    Ok(models)
}
