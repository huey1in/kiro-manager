// API 格式转换器
use super::types::*;
use serde_json::{json, Value};

/// OpenAI 格式转换为 Kiro 格式
pub fn openai_to_kiro(request: &OpenAIChatRequest) -> KiroRequest {
    // 合并所有消息为一个字符串
    let content = request
        .messages
        .iter()
        .map(|msg| format!("{}: {}", msg.role, msg.content))
        .collect::<Vec<_>>()
        .join("\n\n");

    KiroRequest {
        conversation_state: KiroConversationState {
            current_message: KiroMessage {
                user_input_message: KiroUserInputMessage {
                    content,
                    user_input_message_context: KiroUserInputMessageContext {
                        editor_state: KiroEditorState {
                            document: KiroDocument {
                                relative_file_path: "untitled.txt".to_string(),
                                programming_language: KiroProgrammingLanguage {
                                    language_name: "plaintext".to_string(),
                                },
                                text: String::new(),
                            },
                        },
                    },
                    user_intent: "SUGGEST_ALTERNATE_IMPLEMENTATION".to_string(),
                },
            },
            chat_trigger_type: "MANUAL".to_string(),
        },
    }
}

/// Claude 格式转换为 Kiro 格式
pub fn claude_to_kiro(request: &ClaudeRequest) -> KiroRequest {
    let mut content = String::new();
    
    // 添加系统消息
    if let Some(system) = &request.system {
        content.push_str(&format!("System: {}\n\n", system));
    }
    
    // 添加对话消息
    for msg in &request.messages {
        content.push_str(&format!("{}: {}\n\n", msg.role, msg.content));
    }

    KiroRequest {
        conversation_state: KiroConversationState {
            current_message: KiroMessage {
                user_input_message: KiroUserInputMessage {
                    content,
                    user_input_message_context: KiroUserInputMessageContext {
                        editor_state: KiroEditorState {
                            document: KiroDocument {
                                relative_file_path: "untitled.txt".to_string(),
                                programming_language: KiroProgrammingLanguage {
                                    language_name: "plaintext".to_string(),
                                },
                                text: String::new(),
                            },
                        },
                    },
                    user_intent: "SUGGEST_ALTERNATE_IMPLEMENTATION".to_string(),
                },
            },
            chat_trigger_type: "MANUAL".to_string(),
        },
    }
}

/// Kiro 响应转换为 OpenAI 格式
pub fn kiro_to_openai_response(
    kiro_response: &Value,
    model: &str,
) -> Result<Value, String> {
    // 打印原始响应用于调试
    println!("[Translator] Kiro 原始响应: {}", serde_json::to_string_pretty(kiro_response).unwrap_or_default());
    
    // 尝试从不同字段提取内容
    let content = if let Some(assistant_resp) = kiro_response.get("assistantResponseEvent") {
        // 流式响应格式
        assistant_resp.get("content").and_then(|c| c.as_str()).unwrap_or("").to_string()
    } else if let Some(message) = kiro_response.get("message").and_then(|m| m.as_str()) {
        message.to_string()
    } else if let Some(text) = kiro_response.get("text").and_then(|t| t.as_str()) {
        text.to_string()
    } else if let Some(content_arr) = kiro_response.get("content").and_then(|c| c.as_array()) {
        // 如果是 content 数组，提取所有 text
        content_arr
            .iter()
            .filter_map(|item| item.get("text").and_then(|t| t.as_str()))
            .collect::<Vec<_>>()
            .join("")
    } else if let Some(choices) = kiro_response.get("choices").and_then(|c| c.as_array()) {
        // 如果已经是 OpenAI 格式
        choices
            .first()
            .and_then(|choice| choice.get("message"))
            .and_then(|msg| msg.get("content"))
            .and_then(|c| c.as_str())
            .unwrap_or("")
            .to_string()
    } else if let Some(output) = kiro_response.get("Output") {
        // AWS 错误响应格式
        if let Some(error_msg) = output.get("message").and_then(|m| m.as_str()) {
            return Err(format!("Kiro API 错误: {}", error_msg));
        }
        String::new()
    } else {
        String::new()
    };

    if content.is_empty() {
        println!("[Translator] 警告: 无法从 Kiro 响应中提取内容");
    }

    // 提取 token 信息
    let input_tokens = kiro_response
        .get("inputTokens")
        .or_else(|| kiro_response.get("usage").and_then(|u| u.get("prompt_tokens")))
        .and_then(|t| t.as_u64())
        .unwrap_or(0);
    
    let output_tokens = kiro_response
        .get("outputTokens")
        .or_else(|| kiro_response.get("usage").and_then(|u| u.get("completion_tokens")))
        .and_then(|t| t.as_u64())
        .unwrap_or(0);

    Ok(json!({
        "id": format!("chatcmpl-{}", uuid::Uuid::new_v4()),
        "object": "chat.completion",
        "created": chrono::Utc::now().timestamp(),
        "model": model,
        "choices": [{
            "index": 0,
            "message": {
                "role": "assistant",
                "content": content
            },
            "finish_reason": "stop"
        }],
        "usage": {
            "prompt_tokens": input_tokens,
            "completion_tokens": output_tokens,
            "total_tokens": input_tokens + output_tokens
        }
    }))
}

/// Kiro 响应转换为 Claude 格式
pub fn kiro_to_claude_response(
    kiro_response: &Value,
    model: &str,
) -> Result<Value, String> {
    // 打印原始响应用于调试
    println!("[Translator] Kiro 原始响应: {}", serde_json::to_string_pretty(kiro_response).unwrap_or_default());
    
    // 尝试从不同字段提取内容
    let content = if let Some(assistant_resp) = kiro_response.get("assistantResponseEvent") {
        // 流式响应格式
        assistant_resp.get("content").and_then(|c| c.as_str()).unwrap_or("").to_string()
    } else if let Some(message) = kiro_response.get("message").and_then(|m| m.as_str()) {
        message.to_string()
    } else if let Some(text) = kiro_response.get("text").and_then(|t| t.as_str()) {
        text.to_string()
    } else if let Some(content_arr) = kiro_response.get("content").and_then(|c| c.as_array()) {
        // 如果是 content 数组，提取所有 text
        content_arr
            .iter()
            .filter_map(|item| item.get("text").and_then(|t| t.as_str()))
            .collect::<Vec<_>>()
            .join("")
    } else if let Some(choices) = kiro_response.get("choices").and_then(|c| c.as_array()) {
        // 如果是 OpenAI 格式的 choices
        choices
            .first()
            .and_then(|choice| choice.get("message"))
            .and_then(|msg| msg.get("content"))
            .and_then(|c| c.as_str())
            .unwrap_or("")
            .to_string()
    } else if let Some(output) = kiro_response.get("Output") {
        // AWS 错误响应格式
        if let Some(error_msg) = output.get("message").and_then(|m| m.as_str()) {
            return Err(format!("Kiro API 错误: {}", error_msg));
        }
        String::new()
    } else {
        String::new()
    };

    if content.is_empty() {
        println!("[Translator] 警告: 无法从 Kiro 响应中提取内容");
    }

    let input_tokens = kiro_response
        .get("inputTokens")
        .or_else(|| kiro_response.get("usage").and_then(|u| u.get("input_tokens")))
        .and_then(|t| t.as_u64())
        .unwrap_or(0);
    
    let output_tokens = kiro_response
        .get("outputTokens")
        .or_else(|| kiro_response.get("usage").and_then(|u| u.get("output_tokens")))
        .and_then(|t| t.as_u64())
        .unwrap_or(0);

    Ok(json!({
        "id": format!("msg_{}", uuid::Uuid::new_v4()),
        "type": "message",
        "role": "assistant",
        "content": [{
            "type": "text",
            "text": content
        }],
        "model": model,
        "stop_reason": "end_turn",
        "stop_sequence": null,
        "usage": {
            "input_tokens": input_tokens,
            "output_tokens": output_tokens
        }
    }))
}

/// 创建 OpenAI 流式响应块
pub fn create_openai_stream_chunk(
    content: &str,
    model: &str,
    is_final: bool,
) -> String {
    let chunk = if is_final {
        json!({
            "id": format!("chatcmpl-{}", uuid::Uuid::new_v4()),
            "object": "chat.completion.chunk",
            "created": chrono::Utc::now().timestamp(),
            "model": model,
            "choices": [{
                "index": 0,
                "delta": {},
                "finish_reason": "stop"
            }]
        })
    } else {
        json!({
            "id": format!("chatcmpl-{}", uuid::Uuid::new_v4()),
            "object": "chat.completion.chunk",
            "created": chrono::Utc::now().timestamp(),
            "model": model,
            "choices": [{
                "index": 0,
                "delta": {
                    "content": content
                },
                "finish_reason": null
            }]
        })
    };

    format!("data: {}\n\n", chunk)
}

/// 创建 Claude 流式事件
pub fn create_claude_stream_event(
    content: &str,
    event_type: &str,
) -> String {
    let event = match event_type {
        "content_block_start" => {
            json!({
                "type": "content_block_start",
                "index": 0,
                "content_block": {
                    "type": "text",
                    "text": ""
                }
            })
        }
        "content_block_delta" => {
            json!({
                "type": "content_block_delta",
                "index": 0,
                "delta": {
                    "type": "text_delta",
                    "text": content
                }
            })
        }
        "content_block_stop" => {
            json!({
                "type": "content_block_stop",
                "index": 0
            })
        }
        "message_stop" => {
            json!({
                "type": "message_stop"
            })
        }
        _ => {
            json!({
                "type": event_type,
                "message": content
            })
        }
    };

    format!("event: {}\ndata: {}\n\n", event_type, event)
}
