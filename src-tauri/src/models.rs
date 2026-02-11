// 模型列表获取模块
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
pub struct GetModelsResponse {
    pub success: bool,
    pub models: Vec<ModelInfo>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelInfo {
    pub id: String,
    pub name: String,
    pub description: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub input_types: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_input_tokens: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_output_tokens: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rate_multiplier: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rate_unit: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ListModelsResponse {
    models: Vec<KiroModel>,
    #[serde(skip_serializing_if = "Option::is_none")]
    next_token: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct KiroModel {
    model_id: String,
    model_name: String,
    #[serde(default)]
    description: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    supported_input_types: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    token_limits: Option<TokenLimits>,
    #[serde(skip_serializing_if = "Option::is_none")]
    rate_multiplier: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    rate_unit: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TokenLimits {
    #[serde(skip_serializing_if = "Option::is_none")]
    max_input_tokens: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    max_output_tokens: Option<i64>,
}

// 获取账号可用模型列表
#[tauri::command]
pub async fn get_account_models(access_token: String, region: String) -> GetModelsResponse {
    println!("[模型列表] 开始获取模型列表");
    println!("[模型列表] Region: {}", region);
    
    // 根据区域确定正确的端点
    let base_url = if region.starts_with("eu-") {
        "https://q.eu-central-1.amazonaws.com"
    } else {
        "https://q.us-east-1.amazonaws.com"
    };
    
    let url = format!("{}/ListAvailableModels?origin=AI_EDITOR&maxResults=50", base_url);
    
    let client = reqwest::Client::new();
    let mut all_models = Vec::new();
    let mut seen_ids = std::collections::HashSet::new();
    let mut next_token: Option<String> = None;
    
    loop {
        let mut request_url = url.clone();
        if let Some(token) = &next_token {
            request_url = format!("{}&nextToken={}", request_url, token);
        }
        
        println!("[模型列表] 请求 URL: {}", request_url);
        
        let response = match client
            .get(&request_url)
            .header("Authorization", format!("Bearer {}", access_token))
            .header("Content-Type", "application/json")
            .header("Accept", "application/json")
            .send()
            .await
        {
            Ok(resp) => resp,
            Err(e) => {
                println!("[模型列表] 请求失败: {}", e);
                return GetModelsResponse {
                    success: false,
                    models: vec![],
                    error: Some(format!("请求失败: {}", e)),
                };
            }
        };
        
        if !response.status().is_success() {
            println!("[模型列表] API 返回错误: {}", response.status());
            return GetModelsResponse {
                success: false,
                models: vec![],
                error: Some(format!("API 返回错误: {}", response.status())),
            };
        }
        
        let list_response: ListModelsResponse = match response.json().await {
            Ok(data) => data,
            Err(e) => {
                println!("[模型列表] 解析响应失败: {}", e);
                return GetModelsResponse {
                    success: false,
                    models: vec![],
                    error: Some(format!("解析响应失败: {}", e)),
                };
            }
        };
        
        println!("[模型列表] 获取到 {} 个模型", list_response.models.len());
        
        for model in list_response.models {
            // 使用 HashSet 去重，避免重复添加相同的模型
            if seen_ids.insert(model.model_id.clone()) {
                all_models.push(ModelInfo {
                    id: model.model_id,
                    name: model.model_name,
                    description: model.description,
                    input_types: model.supported_input_types,
                    max_input_tokens: model.token_limits.as_ref().and_then(|t| t.max_input_tokens),
                    max_output_tokens: model.token_limits.as_ref().and_then(|t| t.max_output_tokens),
                    rate_multiplier: model.rate_multiplier,
                    rate_unit: model.rate_unit,
                });
            }
        }
        
        next_token = list_response.next_token;
        if next_token.is_none() {
            break;
        }
    }
    
    println!("[模型列表] 总共获取到 {} 个模型（去重后）", all_models.len());
    
    GetModelsResponse {
        success: true,
        models: all_models,
        error: None,
    }
}
