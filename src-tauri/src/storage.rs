// 本地存储管理模块
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

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
pub async fn save_custom_logo(source_path: String) -> Result<String, String> {
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
pub async fn delete_custom_logo() -> Result<(), String> {
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

// 加载账号数据
#[tauri::command]
pub async fn load_accounts() -> Result<String, String> {
    let data_dir = get_data_dir()?;
    let accounts_file = data_dir.join("accounts.json");
    
    if !accounts_file.exists() {
        return Ok("[]".to_string());
    }
    
    let data = fs::read_to_string(accounts_file)
        .map_err(|e| format!("读取账号数据失败: {}", e))?;
    
    Ok(data)
}

// 保存账号数据
#[tauri::command]
pub async fn save_accounts(data: String) -> Result<(), String> {
    let data_dir = get_data_dir()?;
    let accounts_file = data_dir.join("accounts.json");
    
    fs::write(accounts_file, data)
        .map_err(|e| format!("保存账号数据失败: {}", e))?;
    
    Ok(())
}

// 本地活跃账号数据结构
#[derive(Debug, Serialize, Deserialize)]
pub struct LocalActiveAccountResponse {
    pub success: bool,
    pub data: Option<LocalActiveAccountData>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LocalActiveAccountData {
    pub refresh_token: String,
    pub client_id: String,
    pub client_secret: String,
    pub region: String,
}

// 读取本地活跃账号
#[tauri::command]
pub async fn get_local_active_account() -> Result<LocalActiveAccountResponse, String> {
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
