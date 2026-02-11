// 切换账号模块
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use sha1::{Sha1, Digest};

#[derive(Debug, Serialize)]
pub struct SwitchAccountResponse {
    pub success: bool,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct TokenCache {
    #[serde(rename = "accessToken")]
    access_token: String,
    #[serde(rename = "refreshToken", default)]
    refresh_token: Option<String>,
    #[serde(rename = "expiresAt")]
    expires_at: String,
}

// 获取当前激活的账号信息
#[tauri::command]
pub async fn get_active_account() -> Result<Option<String>, String> {
    let home_dir = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .map_err(|_| "无法获取用户主目录".to_string())?;
    
    let sso_cache = PathBuf::from(&home_dir)
        .join(".aws")
        .join("sso")
        .join("cache");
    
    let token_path = sso_cache.join("kiro-auth-token.json");
    
    // 如果文件不存在，返回 None
    if !token_path.exists() {
        return Ok(None);
    }
    
    // 读取 token 文件
    let content = fs::read_to_string(&token_path)
        .map_err(|e| format!("读取 token 文件失败: {}", e))?;
    
    let token_cache: TokenCache = serde_json::from_str(&content)
        .map_err(|e| format!("解析 token 文件失败: {}", e))?;
    
    // 返回 accessToken，前端用它来匹配账号
    Ok(Some(token_cache.access_token))
}

// 切换账号 - 写入凭证到本地 SSO 缓存
#[tauri::command]
pub async fn switch_account(
    access_token: String,
    refresh_token: String,
    client_id: String,
    client_secret: String,
    region: Option<String>,
    start_url: Option<String>,
    auth_method: Option<String>,
    provider: Option<String>,
) -> Result<SwitchAccountResponse, String> {
    println!("[切换账号] 开始切换账号");
    
    let region = region.unwrap_or_else(|| "us-east-1".to_string());
    let start_url = start_url.unwrap_or_else(|| "https://view.awsapps.com/start".to_string());
    let auth_method = auth_method.unwrap_or_else(|| "IdC".to_string());
    let provider = provider.unwrap_or_else(|| "BuilderId".to_string());
    
    // 计算 clientIdHash
    let hash_input = format!(r#"{{"startUrl":"{}"}}"#, start_url);
    let mut hasher = Sha1::new();
    hasher.update(hash_input.as_bytes());
    let client_id_hash = format!("{:x}", hasher.finalize());
    
    println!("[切换账号] Client ID Hash: {}", client_id_hash);
    
    // 获取 SSO 缓存目录
    let home_dir = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .map_err(|_| "无法获取用户主目录".to_string())?;
    
    let sso_cache = PathBuf::from(&home_dir)
        .join(".aws")
        .join("sso")
        .join("cache");
    
    // 确保目录存在
    fs::create_dir_all(&sso_cache)
        .map_err(|e| format!("创建 SSO 缓存目录失败: {}", e))?;
    
    println!("[切换账号] SSO 缓存目录: {:?}", sso_cache);
    
    // 写入 token 文件
    let token_path = sso_cache.join("kiro-auth-token.json");
    let expires_at = chrono::Utc::now() + chrono::Duration::hours(1);
    
    let token_data = serde_json::json!({
        "accessToken": access_token,
        "refreshToken": refresh_token,
        "expiresAt": expires_at.to_rfc3339(),
        "clientIdHash": client_id_hash,
        "authMethod": auth_method,
        "provider": provider,
        "region": region
    });
    
    let token_json = serde_json::to_string_pretty(&token_data)
        .map_err(|e| format!("序列化 token 数据失败: {}", e))?;
    
    fs::write(&token_path, token_json)
        .map_err(|e| format!("写入 token 文件失败: {}", e))?;
    
    println!("[切换账号] Token 文件已保存: {:?}", token_path);
    
    // 只有 IdC 登录需要写入客户端注册文件
    if auth_method != "social" && !client_id.is_empty() && !client_secret.is_empty() {
        let client_reg_path = sso_cache.join(format!("{}.json", client_id_hash));
        let client_expires_at = chrono::Utc::now() + chrono::Duration::days(90);
        
        let client_data = serde_json::json!({
            "clientId": client_id,
            "clientSecret": client_secret,
            "expiresAt": client_expires_at.format("%Y-%m-%dT%H:%M:%S%.3f").to_string(),
            "scopes": [
                "codewhisperer:completions",
                "codewhisperer:analysis",
                "codewhisperer:conversations",
                "codewhisperer:transformations",
                "codewhisperer:taskassist"
            ]
        });
        
        let client_json = serde_json::to_string_pretty(&client_data)
            .map_err(|e| format!("序列化客户端数据失败: {}", e))?;
        
        fs::write(&client_reg_path, client_json)
            .map_err(|e| format!("写入客户端注册文件失败: {}", e))?;
        
        println!("[切换账号] 客户端注册文件已保存: {:?}", client_reg_path);
    }
    
    println!("[切换账号] 账号切换成功");
    
    Ok(SwitchAccountResponse {
        success: true,
        error: None,
    })
}

// 退出登录 - 清除本地 SSO 缓存
#[tauri::command]
pub async fn logout_account() -> Result<SwitchAccountResponse, String> {
    println!("[退出登录] 开始清除 SSO 缓存");
    
    let home_dir = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .map_err(|_| "无法获取用户主目录".to_string())?;
    
    let sso_cache = PathBuf::from(&home_dir)
        .join(".aws")
        .join("sso")
        .join("cache");
    
    if !sso_cache.exists() {
        println!("[退出登录] SSO 缓存目录不存在");
        return Ok(SwitchAccountResponse {
            success: true,
            error: None,
        });
    }
    
    // 读取目录下所有文件
    let entries = fs::read_dir(&sso_cache)
        .map_err(|e| format!("读取 SSO 缓存目录失败: {}", e))?;
    
    let mut deleted_count = 0;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_file() {
            if let Err(e) = fs::remove_file(&path) {
                println!("[退出登录] 删除文件失败: {:?}, 错误: {}", path, e);
            } else {
                deleted_count += 1;
            }
        }
    }
    
    println!("[退出登录] SSO 缓存已清除，删除了 {} 个文件", deleted_count);
    
    Ok(SwitchAccountResponse {
        success: true,
        error: None,
    })
}
