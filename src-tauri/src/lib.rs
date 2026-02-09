use serde::{Deserialize, Serialize};
use serde_json::json;
use tauri::{Manager, PhysicalPosition};
use std::fs;
use std::path::PathBuf;

// ============= 窗口位置管理 =============

#[derive(Debug, Serialize, Deserialize)]
struct WindowPosition {
    x: i32,
    y: i32,
}

// 获取配置文件路径
fn get_config_path() -> Result<PathBuf, String> {
    let app_data = std::env::var("APPDATA")
        .or_else(|_| std::env::var("HOME"))
        .map_err(|_| "无法获取应用数据目录".to_string())?;
    
    let config_dir = PathBuf::from(app_data).join("kiro-manager");
    fs::create_dir_all(&config_dir).map_err(|e| format!("创建配置目录失败: {}", e))?;
    
    Ok(config_dir.join("window-position.json"))
}

// 保存窗口位置
#[tauri::command]
async fn save_window_position(x: i32, y: i32) -> Result<(), String> {
    let config_path = get_config_path()?;
    let position = WindowPosition { x, y };
    let json = serde_json::to_string_pretty(&position)
        .map_err(|e| format!("序列化失败: {}", e))?;
    
    fs::write(config_path, json)
        .map_err(|e| format!("保存窗口位置失败: {}", e))?;
    
    Ok(())
}

// 加载窗口位置
#[tauri::command]
async fn load_window_position() -> Result<Option<WindowPosition>, String> {
    let config_path = get_config_path()?;
    
    if !config_path.exists() {
        return Ok(None);
    }
    
    let json = fs::read_to_string(config_path)
        .map_err(|e| format!("读取窗口位置失败: {}", e))?;
    
    let position: WindowPosition = serde_json::from_str(&json)
        .map_err(|e| format!("解析窗口位置失败: {}", e))?;
    
    Ok(Some(position))
}

// ============= 账号验证 =============


#[derive(Debug, Serialize, Deserialize)]
struct VerifyCredentialsResponse {
    success: bool,
    data: Option<AccountData>,
    error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct AccountData {
    email: String,
    user_id: String,
    access_token: String,
    refresh_token: String,
    expires_in: Option<u64>,
    subscription_type: String,
    subscription_title: String,
    usage: UsageData,
    days_remaining: Option<u32>,
    expires_at: Option<u64>,
}

#[derive(Debug, Serialize, Deserialize)]
struct UsageData {
    current: f64,
    limit: f64,
    #[serde(rename = "nextResetDate")]
    next_reset_date: Option<String>,
}

// AWS OIDC Token 响应
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct OidcTokenResponse {
    access_token: String,
    refresh_token: Option<String>,
    expires_in: u64,
}

// Kiro GetUserInfo 响应
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
struct UserInfoResponse {
    email: Option<String>,
    user_id: Option<String>,
    idp: Option<String>,
    status: Option<String>,
}

// Kiro Usage 响应
#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct UsageBreakdown {
    resource_type: Option<String>,
    display_name: Option<String>,
    current_usage: Option<f64>,
    current_usage_with_precision: Option<f64>,
    usage_limit: Option<f64>,
    usage_limit_with_precision: Option<f64>,
    free_trial_info: Option<FreeTrialInfo>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct FreeTrialInfo {
    free_trial_status: Option<String>,
    #[serde(deserialize_with = "deserialize_timestamp_or_string")]
    free_trial_expiry: Option<String>,
    current_usage: Option<f64>,
    current_usage_with_precision: Option<f64>,
    usage_limit: Option<f64>,
    usage_limit_with_precision: Option<f64>,
}

// 自定义反序列化函数：支持数字或字符串
fn deserialize_timestamp_or_string<'de, D>(deserializer: D) -> Result<Option<String>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    use serde::de::{self, Deserialize};
    
    #[derive(Deserialize)]
    #[serde(untagged)]
    enum TimestampOrString {
        Timestamp(f64),
        String(String),
    }
    
    match Option::<TimestampOrString>::deserialize(deserializer)? {
        None => Ok(None),
        Some(TimestampOrString::Timestamp(ts)) => {
            // 将 Unix 时间戳（秒）转换为 ISO 字符串
            let datetime = chrono::DateTime::from_timestamp(ts as i64, (ts.fract() * 1_000_000_000.0) as u32)
                .ok_or_else(|| de::Error::custom("invalid timestamp"))?;
            Ok(Some(datetime.to_rfc3339()))
        }
        Some(TimestampOrString::String(s)) => Ok(Some(s)),
    }
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct UsageLimitsResponse {
    usage_breakdown_list: Option<Vec<UsageBreakdown>>,
    subscription_info: Option<SubscriptionInfo>,
    user_info: Option<UserInfo>,
    #[serde(deserialize_with = "deserialize_timestamp_or_string")]
    next_date_reset: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct SubscriptionInfo {
    #[serde(alias = "type")]
    subscription_type: Option<String>,
    subscription_title: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct UserInfo {
    email: Option<String>,
    user_id: Option<String>,
}

// ============= 核心验证函数 =============

#[tauri::command]
async fn verify_account_credentials(
    refresh_token: String,
    client_id: String,
    client_secret: String,
    region: Option<String>,
) -> Result<VerifyCredentialsResponse, String> {
    let region = region.unwrap_or_else(|| "us-east-1".to_string());
    
    println!("[验证] 开始验证账号凭证");
    println!("[验证] Region: {}", region);
    println!("[验证] Client ID: {}...", &client_id[..client_id.len().min(20)]);
    
    // 步骤 1: 使用 refresh_token 获取 access_token
    let oidc_url = format!("https://oidc.{}.amazonaws.com/token", region);
    println!("[验证] OIDC URL: {}", oidc_url);
    
    let client = reqwest::Client::new();
    
    let oidc_payload = json!({
        "clientId": client_id,
        "clientSecret": client_secret,
        "refreshToken": refresh_token,
        "grantType": "refresh_token"
    });
    
    println!("[验证] 发送 OIDC 请求...");
    let oidc_response = client
        .post(&oidc_url)
        .header("Content-Type", "application/json")
        .json(&oidc_payload)
        .send()
        .await
        .map_err(|e| format!("OIDC 请求失败: {}", e))?;
    
    println!("[验证] OIDC 响应状态: {}", oidc_response.status());
    
    if !oidc_response.status().is_success() {
        let status = oidc_response.status();
        let error_text = oidc_response.text().await.unwrap_or_default();
        return Ok(VerifyCredentialsResponse {
            success: false,
            data: None,
            error: Some(format!("OIDC 认证失败 ({}): {}", status, error_text)),
        });
    }
    
    let oidc_data: OidcTokenResponse = oidc_response
        .json()
        .await
        .map_err(|e| format!("解析 OIDC 响应失败: {}", e))?;
    
    println!("[OIDC] Token 刷新成功");
    println!("[OIDC] Access Token 长度: {}", oidc_data.access_token.len());
    println!("[OIDC] Expires In: {} 秒", oidc_data.expires_in);
    
    let access_token = oidc_data.access_token;
    let new_refresh_token = oidc_data.refresh_token.unwrap_or(refresh_token);
    let expires_in = oidc_data.expires_in;
    
    // 步骤 2: 使用 access_token 获取用户信息和使用量
    // 使用 REST API 端点
    let api_base = if region.starts_with("eu-") {
        "https://q.eu-central-1.amazonaws.com"
    } else {
        "https://q.us-east-1.amazonaws.com"
    };
    
    println!("[验证] API Base: {}", api_base);
    
    // 调用 GetUsageLimits API (使用 GET 方法和查询参数)
    let usage_url = format!(
        "{}/getUsageLimits?origin=AI_EDITOR&resourceType=AGENTIC_REQUEST&isEmailRequired=true",
        api_base
    );
    
    println!("[验证] 发送 GetUsageLimits 请求...");
    let usage_response = client
        .get(&usage_url)
        .header("Accept", "application/json")
        .header("Authorization", format!("Bearer {}", access_token))
        .header("User-Agent", "aws-sdk-rust/1.3.9 os/windows lang/rust/1.87.0")
        .header("x-amz-user-agent", "aws-sdk-rust/1.3.9 ua/2.1 api/ssooidc/1.88.0 os/windows lang/rust/1.87.0 m/E app/KiroManager")
        .send()
        .await
        .map_err(|e| format!("获取使用量失败: {}", e))?;
    
    println!("[验证] GetUsageLimits 响应状态: {}", usage_response.status());
    
    if !usage_response.status().is_success() {
        let status = usage_response.status();
        let error_text = usage_response.text().await.unwrap_or_default();
        println!("[API] GetUsageLimits 失败: {} - {}", status, error_text);

        // 解析错误响应，提取友好的错误信息
        let friendly_error = if status.as_u16() == 403 {
            // 尝试解析JSON错误响应
            if let Ok(error_json) = serde_json::from_str::<serde_json::Value>(&error_text) {
                if let Some(reason) = error_json.get("reason").and_then(|r| r.as_str()) {
                    match reason {
                        "TEMPORARILY_SUSPENDED" => "账号已被临时封禁".to_string(),
                        "PERMANENTLY_SUSPENDED" => "账号已被永久封禁".to_string(),
                        _ => format!("账号访问受限: {}", reason)
                    }
                } else {
                    "账号访问被拒绝 (403)".to_string()
                }
            } else {
                "账号访问被拒绝 (403)".to_string()
            }
        } else {
            format!("获取使用量失败 ({})", status)
        };

        return Ok(VerifyCredentialsResponse {
            success: false,
            data: None,
            error: Some(friendly_error),
        });
    }
    
    // 先读取原始响应文本用于调试
    let response_text = usage_response.text().await.map_err(|e| {
        println!("[API] 读取响应文本失败: {}", e);
        format!("读取响应文本失败: {}", e)
    })?;
    
    println!("[API] 原始响应: {}", &response_text[..response_text.len().min(500)]);
    
    let usage_data: UsageLimitsResponse = serde_json::from_str(&response_text).map_err(|e| {
        println!("[API] 解析 JSON 失败: {}", e);
        println!("[API] 完整响应: {}", response_text);
        format!("解析使用量响应失败: {}", e)
    })?;
    
    println!("[API] 使用量响应: {}", serde_json::to_string_pretty(&usage_data).unwrap_or_else(|e| format!("序列化失败: {}", e)));
    
    // 提取用户信息
    let email = usage_data
        .user_info
        .as_ref()
        .and_then(|u| u.email.clone())
        .unwrap_or_else(|| "unknown@example.com".to_string());
    
    let user_id = usage_data
        .user_info
        .as_ref()
        .and_then(|u| u.user_id.clone())
        .unwrap_or_else(|| "unknown".to_string());
    
    println!("[API] 用户邮箱: {}", email);
    println!("[API] 用户 ID: {}", user_id);
    
    // 提取订阅信息和使用量
    let subscription_type = usage_data
        .subscription_info
        .as_ref()
        .and_then(|s| s.subscription_type.clone())
        .unwrap_or_else(|| "FREE".to_string());
    
    let subscription_title = usage_data
        .subscription_info
        .as_ref()
        .and_then(|s| s.subscription_title.clone())
        .unwrap_or_else(|| "KIRO FREE".to_string());
    
    println!("[API] 订阅类型: {}", subscription_type);
    println!("[API] 订阅标题: {}", subscription_title);
    
    // 提取使用量（查找 CREDIT 或 AGENT_INTERACTIONS 类型）
    let mut current_usage = 0.0;
    let mut usage_limit = 50.0;
    let mut days_remaining: Option<u32> = None;
    
    println!("[API] 开始提取使用量信息...");
    
    if let Some(breakdowns) = &usage_data.usage_breakdown_list {
        println!("[API] 找到 {} 个使用量条目", breakdowns.len());
        
        for breakdown in breakdowns {
            if let Some(resource_type) = &breakdown.resource_type {
                println!("[API] 检查资源类型: {}", resource_type);
                
                // 支持 CREDIT 和 AGENT_INTERACTIONS 两种类型
                if resource_type == "CREDIT" || resource_type == "AGENT_INTERACTIONS" {
                    // 月度使用量（优先使用带精度的字段）
                    let monthly_current = breakdown.current_usage_with_precision
                        .or(breakdown.current_usage)
                        .unwrap_or(0.0);
                    let monthly_limit = breakdown.usage_limit_with_precision
                        .or(breakdown.usage_limit)
                        .unwrap_or(50.0);
                    
                    println!("[API] 资源类型匹配: {}", resource_type);
                    println!("[API] 月度使用量: {} / {}", monthly_current, monthly_limit);
                    
                    // 提取免费试用信息
                    if let Some(free_trial) = &breakdown.free_trial_info {
                        // 优先使用带精度的字段
                        let trial_current = free_trial.current_usage_with_precision
                            .or(free_trial.current_usage)
                            .unwrap_or(0.0);
                        let trial_limit = free_trial.usage_limit_with_precision
                            .or(free_trial.usage_limit)
                            .unwrap_or(0.0);
                        
                        println!("[API] 找到免费试用信息");
                        println!("[API] 免费试用使用量: {} / {}", trial_current, trial_limit);
                        
                        // 总使用量 = 月度使用量 + 免费试用使用量
                        current_usage = monthly_current + trial_current;
                        usage_limit = monthly_limit + trial_limit;
                        
                        println!("[API] 计算总使用量: {} + {} = {}", monthly_current, trial_current, current_usage);
                        println!("[API] 计算总额度: {} + {} = {}", monthly_limit, trial_limit, usage_limit);
                        
                        // 提取免费试用到期时间
                        if let Some(expiry) = &free_trial.free_trial_expiry {
                            // 计算剩余天数
                            if let Ok(expiry_time) = chrono::DateTime::parse_from_rfc3339(expiry) {
                                let now = chrono::Utc::now();
                                let duration = expiry_time.signed_duration_since(now);
                                days_remaining = Some(duration.num_days().max(0) as u32);
                            }
                        }
                    } else {
                        println!("[API] 没有免费试用信息");
                        // 没有免费试用，只使用月度使用量
                        current_usage = monthly_current;
                        usage_limit = monthly_limit;
                    }
                    
                    break;
                }
            }
        }
    } else {
        println!("[API] 没有找到使用量列表");
    }
    
    println!("[API] 最终总使用量: {} / {}", current_usage, usage_limit);
    if let Some(days) = days_remaining {
        println!("[API] 剩余天数: {} 天", days);
    }
    
    // 提取下次重置时间
    let next_reset_date = usage_data.next_date_reset.clone();
    if let Some(ref reset_date) = next_reset_date {
        println!("[API] 下次重置: {}", reset_date);
    }
    
    println!("[验证] 账号验证成功");
    
    Ok(VerifyCredentialsResponse {
        success: true,
        data: Some(AccountData {
            email,
            user_id,
            access_token,
            refresh_token: new_refresh_token,
            expires_in: Some(expires_in),
            subscription_type,
            subscription_title,
            usage: UsageData {
                current: current_usage,
                limit: usage_limit,
                next_reset_date,
            },
            days_remaining,
            expires_at: None,
        }),
        error: None,
    })
}

// ============= 读取本地活跃账号 =============

#[derive(Debug, Serialize, Deserialize)]
struct LocalActiveAccountResponse {
    success: bool,
    data: Option<LocalActiveAccountData>,
    error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct LocalActiveAccountData {
    refresh_token: String,
    client_id: String,
    client_secret: String,
    region: String,
}

#[tauri::command]
async fn get_local_active_account() -> Result<LocalActiveAccountResponse, String> {
    println!("[本地账号] 开始读取本地 SSO 缓存");
    
    // 获取用户主目录
    let home_dir = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .map_err(|_| "无法获取用户主目录".to_string())?;
    
    let token_path = PathBuf::from(&home_dir)
        .join(".aws")
        .join("sso")
        .join("cache")
        .join("kiro-auth-token.json");
    
    println!("[本地账号] Token 路径: {:?}", token_path);
    
    // 检查文件是否存在
    if !token_path.exists() {
        return Ok(LocalActiveAccountResponse {
            success: false,
            data: None,
            error: Some("找不到 kiro-auth-token.json 文件，请先在 Kiro IDE 中登录".to_string()),
        });
    }
    
    // 读取文件内容
    let token_content = fs::read_to_string(&token_path)
        .map_err(|e| format!("读取 token 文件失败: {}", e))?;
    
    println!("[本地账号] 成功读取 token 文件");
    
    // 解析 JSON
    let token_data: serde_json::Value = serde_json::from_str(&token_content)
        .map_err(|e| format!("解析 token 文件失败: {}", e))?;
    
    // 提取必要字段
    let refresh_token = token_data.get("refreshToken")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "token 文件中缺少 refreshToken".to_string())?
        .to_string();
    
    // 从 ~/.aws/sso/cache/ 目录查找 client credentials
    let cache_dir = PathBuf::from(&home_dir)
        .join(".aws")
        .join("sso")
        .join("cache");
    
    println!("[本地账号] 搜索 cache 目录: {:?}", cache_dir);
    
    let mut client_id = String::new();
    let mut client_secret = String::new();
    let mut region = "us-east-1".to_string();
    
    // 遍历 cache 目录查找包含 clientId 和 clientSecret 的文件
    if let Ok(entries) = fs::read_dir(&cache_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().and_then(|s| s.to_str()) == Some("json") {
                if let Ok(content) = fs::read_to_string(&path) {
                    if let Ok(data) = serde_json::from_str::<serde_json::Value>(&content) {
                        // 检查是否包含 clientId 和 clientSecret
                        if let (Some(cid), Some(csec)) = (
                            data.get("clientId").and_then(|v| v.as_str()),
                            data.get("clientSecret").and_then(|v| v.as_str())
                        ) {
                            client_id = cid.to_string();
                            client_secret = csec.to_string();
                            
                            // 尝试获取 region
                            if let Some(reg) = data.get("region").and_then(|v| v.as_str()) {
                                region = reg.to_string();
                            }
                            
                            println!("[本地账号] 找到 client credentials 文件: {:?}", path);
                            break;
                        }
                    }
                }
            }
        }
    }
    
    // 如果没有找到 client credentials，返回错误
    if client_id.is_empty() || client_secret.is_empty() {
        return Ok(LocalActiveAccountResponse {
            success: false,
            data: None,
            error: Some("找不到 client credentials，请确保已在 Kiro IDE 中完成登录".to_string()),
        });
    }
    
    println!("[本地账号] 成功提取凭证信息");
    println!("[本地账号] Region: {}", region);
    println!("[本地账号] Client ID: {}...", &client_id[..client_id.len().min(20)]);
    
    Ok(LocalActiveAccountResponse {
        success: true,
        data: Some(LocalActiveAccountData {
            refresh_token,
            client_id,
            client_secret,
            region,
        }),
        error: None,
    })
}

// 获取数据目录路径
fn get_data_dir() -> Result<PathBuf, String> {
    let home_dir = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .map_err(|_| "无法获取用户目录".to_string())?;
    
    let data_dir = PathBuf::from(home_dir).join("kiro manager");
    fs::create_dir_all(&data_dir).map_err(|e| format!("创建数据目录失败: {}", e))?;
    
    Ok(data_dir)
}

// 保存自定义 Logo
#[tauri::command]
async fn save_custom_logo(source_path: String) -> Result<String, String> {
    let data_dir = get_data_dir()?;
    
    // 获取文件扩展名
    let source = PathBuf::from(&source_path);
    let extension = source.extension()
        .and_then(|e| e.to_str())
        .unwrap_or("png");
    
    // 目标文件路径
    let target_path = data_dir.join(format!("custom-logo.{}", extension));
    
    // 复制文件
    fs::copy(&source, &target_path)
        .map_err(|e| format!("复制文件失败: {}", e))?;
    
    // 返回目标文件的绝对路径
    target_path.to_str()
        .ok_or_else(|| "路径转换失败".to_string())
        .map(|s| s.to_string())
}

// 删除自定义 Logo
#[tauri::command]
async fn delete_custom_logo() -> Result<(), String> {
    let data_dir = get_data_dir()?;
    
    // 尝试删除所有可能的扩展名
    for ext in &["png", "jpg", "jpeg", "svg", "webp"] {
        let logo_path = data_dir.join(format!("custom-logo.{}", ext));
        if logo_path.exists() {
            fs::remove_file(logo_path)
                .map_err(|e| format!("删除文件失败: {}", e))?;
        }
    }
    
    Ok(())
}

#[tauri::command]
async fn load_accounts() -> Result<String, String> {
    let data_dir = get_data_dir()?;
    let accounts_file = data_dir.join("accounts.json");
    
    if !accounts_file.exists() {
        return Ok("[]".to_string());
    }
    
    let data = fs::read_to_string(accounts_file)
        .map_err(|e| format!("读取账号数据失败: {}", e))?;
    
    Ok(data)
}

#[tauri::command]
async fn save_accounts(data: String) -> Result<(), String> {
    let data_dir = get_data_dir()?;
    let accounts_file = data_dir.join("accounts.json");
    
    fs::write(accounts_file, data)
        .map_err(|e| format!("保存账号数据失败: {}", e))?;
    
    Ok(())
}

// ============= 获取账号可用模型 =============

#[derive(Debug, Serialize)]
struct GetModelsResponse {
    success: bool,
    models: Vec<ModelInfo>,
    error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ModelInfo {
    id: String,
    name: String,
    description: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    input_types: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    max_input_tokens: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    max_output_tokens: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    rate_multiplier: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    rate_unit: Option<String>,
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

#[tauri::command]
async fn get_account_models(access_token: String, region: String) -> GetModelsResponse {
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            
            // 恢复窗口位置
            tauri::async_runtime::spawn(async move {
                // 先恢复位置
                if let Ok(Some(position)) = load_window_position().await {
                    // 检查位置是否有效（避免窗口在屏幕外或最小化位置）
                    if position.x > -32000 && position.y > -32000 && position.x < 10000 && position.y < 10000 {
                        let _ = window.set_position(PhysicalPosition::new(position.x, position.y));
                        println!("[窗口] 恢复位置: ({}, {})", position.x, position.y);
                    } else {
                        println!("[窗口] 位置无效，使用默认居中位置");
                        let _ = window.center();
                    }
                } else {
                    // 首次启动，居中显示
                    let _ = window.center();
                }
                
                // 等待一小段时间确保内容加载
                tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
                
                // 显示窗口
                let _ = window.show();
                println!("[窗口] 窗口已显示");
            });
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            verify_account_credentials,
            get_local_active_account,
            get_account_models,
            load_accounts,
            save_accounts,
            save_custom_logo,
            delete_custom_logo,
            save_window_position,
            load_window_position
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
