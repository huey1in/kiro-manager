// 对话功能模块
use serde::{Deserialize, Serialize};
use serde_json::Value;
use reqwest::Client;
use std::time::Duration;

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatResponse {
    pub success: bool,
    pub content: Option<String>,
    pub error: Option<String>,
    #[serde(rename = "inputTokens")]
    pub input_tokens: Option<u64>,
    #[serde(rename = "outputTokens")]
    pub output_tokens: Option<u64>,
    pub credits: Option<f64>,
}

/// 发送对话消息
#[tauri::command]
pub async fn send_chat_message(
    model: String,
    messages: Vec<ChatMessage>,
    access_token: String,
    region: Option<String>,
    temperature: Option<f64>,
    max_tokens: Option<u32>,
    use_custom_api: Option<bool>,
    custom_base_url: Option<String>,
) -> Result<ChatResponse, String> {
    println!("[Chat] 发送对话消息");
    println!("[Chat] 模型: {}", model);
    println!("[Chat] 消息数量: {}", messages.len());
    println!("[Chat] 使用自定义 API: {:?}", use_custom_api);
    
    let use_custom = use_custom_api.unwrap_or(false);
    
    if use_custom && custom_base_url.is_some() {
        // 使用自定义 OpenAI 格式 API
        send_openai_format_message(
            model,
            messages,
            access_token,
            custom_base_url.unwrap(),
            temperature,
            max_tokens,
        ).await
    } else {
        // 使用 AWS Kiro API
        send_aws_kiro_message(
            model,
            messages,
            access_token,
            region,
        ).await
    }
}

/// 发送 OpenAI 格式的消息
async fn send_openai_format_message(
    model: String,
    messages: Vec<ChatMessage>,
    api_key: String,
    base_url: String,
    temperature: Option<f64>,
    max_tokens: Option<u32>,
) -> Result<ChatResponse, String> {
    println!("[Chat] 使用 OpenAI 格式 API");
    println!("[Chat] Base URL: {}", base_url);
    
    let client = Client::builder()
        .timeout(Duration::from_secs(120))
        .build()
        .map_err(|e| format!("创建 HTTP 客户端失败: {}", e))?;
    
    // 构建 OpenAI 格式的请求
    let mut request_body = serde_json::json!({
        "model": model,
        "messages": messages.iter().map(|m| {
            serde_json::json!({
                "role": m.role,
                "content": m.content
            })
        }).collect::<Vec<_>>(),
        "stream": false
    });
    
    if let Some(temp) = temperature {
        request_body["temperature"] = serde_json::json!(temp);
    }
    
    if let Some(max_tok) = max_tokens {
        request_body["max_tokens"] = serde_json::json!(max_tok);
    }
    
    let url = format!("{}/v1/chat/completions", base_url.trim_end_matches('/'));
    
    let mut headers = reqwest::header::HeaderMap::new();
    headers.insert(
        "Authorization",
        format!("Bearer {}", api_key)
            .parse()
            .map_err(|e| format!("无效的 Authorization 头: {}", e))?,
    );
    headers.insert(
        "Content-Type",
        "application/json"
            .parse()
            .map_err(|e| format!("无效的 Content-Type 头: {}", e))?,
    );
    
    println!("[Chat] 请求 URL: {}", url);
    println!("[Chat] 请求体: {}", serde_json::to_string_pretty(&request_body).unwrap_or_default());
    
    let response = client
        .post(&url)
        .headers(headers)
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("请求失败: {}", e))?;
    
    let status = response.status();
    println!("[Chat] 响应状态: {}", status);
    
    if !status.is_success() {
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "无法读取错误响应".to_string());
        
        println!("[Chat] 错误响应: {}", error_text);
        
        return Ok(ChatResponse {
            success: false,
            content: None,
            error: Some(format!("API 返回错误 {}: {}", status.as_u16(), error_text)),
            input_tokens: None,
            output_tokens: None,
            credits: None,
        });
    }
    
    let response_json: Value = response
        .json()
        .await
        .map_err(|e| format!("解析响应失败: {}", e))?;
    
    println!("[Chat] 响应: {}", serde_json::to_string_pretty(&response_json).unwrap_or_default());
    
    // 提取内容
    let content = response_json
        .get("choices")
        .and_then(|c| c.get(0))
        .and_then(|c| c.get("message"))
        .and_then(|m| m.get("content"))
        .and_then(|c| c.as_str())
        .map(|s| s.to_string());
    
    // 提取 token 信息
    let input_tokens = response_json
        .get("usage")
        .and_then(|u| u.get("prompt_tokens"))
        .and_then(|t| t.as_u64());
    
    let output_tokens = response_json
        .get("usage")
        .and_then(|u| u.get("completion_tokens"))
        .and_then(|t| t.as_u64());
    
    if content.is_none() {
        return Ok(ChatResponse {
            success: false,
            content: None,
            error: Some("未能提取到回复内容".to_string()),
            input_tokens,
            output_tokens,
            credits: None,
        });
    }
    
    Ok(ChatResponse {
        success: true,
        content,
        error: None,
        input_tokens,
        output_tokens,
        credits: None,
    })
}

/// 发送 AWS Kiro 格式的消息
async fn send_aws_kiro_message(
    model: String,
    messages: Vec<ChatMessage>,
    access_token: String,
    region: Option<String>,
) -> Result<ChatResponse, String> {
    println!("[Chat] 使用 AWS Kiro API");
    
    let region = region.unwrap_or_else(|| "us-east-1".to_string());
    
    // 构建 Kiro 请求格式
    let user_message = messages
        .iter()
        .filter(|m| m.role == "user")
        .last()
        .ok_or("没有找到用户消息")?;
    
    // 提取 system prompt（如果有）
    let system_prompt = messages
        .iter()
        .find(|m| m.role == "system")
        .map(|m| m.content.clone());
    
    // 如果有 system prompt，将其与用户消息合并
    let content = if let Some(prompt) = system_prompt {
        format!("{}\n\n{}", prompt, user_message.content)
    } else {
        user_message.content.clone()
    };
    
    let user_input_message = serde_json::json!({
        "content": content,
        "userInputMessageContext": {
            "editorState": {
                "document": {
                    "relativeFilePath": "chat.txt",
                    "programmingLanguage": {
                        "languageName": "plaintext"
                    },
                    "text": ""
                }
            }
        },
        "userIntent": "SUGGEST_ALTERNATE_IMPLEMENTATION",
        "origin": "AI_EDITOR",
        "modelId": model
    });
    
    let kiro_request = serde_json::json!({
        "conversationState": {
            "currentMessage": {
                "userInputMessage": user_input_message
            },
            "chatTriggerType": "MANUAL"
        }
    });
    
    // 调用 Kiro API
    let client = Client::builder()
        .timeout(Duration::from_secs(120))
        .build()
        .map_err(|e| format!("创建 HTTP 客户端失败: {}", e))?;
    
    let url = "https://codewhisperer.us-east-1.amazonaws.com/generateAssistantResponse";
    
    let mut headers = reqwest::header::HeaderMap::new();
    headers.insert(
        "Authorization",
        format!("Bearer {}", access_token)
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
        "AmazonCodeWhispererStreamingService.GenerateAssistantResponse"
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
    
    println!("[Chat] 请求 URL: {}", url);
    println!("[Chat] 请求体: {}", serde_json::to_string_pretty(&kiro_request).unwrap_or_default());
    
    let response = client
        .post(url)
        .headers(headers)
        .json(&kiro_request)
        .send()
        .await
        .map_err(|e| format!("请求失败: {}", e))?;
    
    let status = response.status();
    println!("[Chat] 响应状态: {}", status);
    
    if !status.is_success() {
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "无法读取错误响应".to_string());
        
        println!("[Chat] 错误响应: {}", error_text);
        
        return Ok(ChatResponse {
            success: false,
            content: None,
            error: Some(format!("API 返回错误 {}: {}", status.as_u16(), error_text)),
            input_tokens: None,
            output_tokens: None,
            credits: None,
        });
    }
    
    // 获取原始字节，解析 AWS Event Stream 格式
    let response_bytes = response
        .bytes()
        .await
        .map_err(|e| format!("读取响应失败: {}", e))?;
    
    println!("[Chat] 响应字节数: {}", response_bytes.len());
    
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
        let payload_end = offset + total_length - 4;
        
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
    
    println!("[Chat] 提取的完整内容长度: {}", full_content.len());
    println!("[Chat] Tokens - Input: {}, Output: {}, Credits: {}", input_tokens, output_tokens, credits);
    
    if full_content.is_empty() {
        return Ok(ChatResponse {
            success: false,
            content: None,
            error: Some("未能提取到回复内容".to_string()),
            input_tokens: Some(input_tokens),
            output_tokens: Some(output_tokens),
            credits: Some(credits),
        });
    }
    
    Ok(ChatResponse {
        success: true,
        content: Some(full_content),
        error: None,
        input_tokens: Some(input_tokens),
        output_tokens: Some(output_tokens),
        credits: Some(credits),
    })
}
