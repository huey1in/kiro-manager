// Kiro 设置管理模块
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct KiroSettings {
    #[serde(rename = "agentAutonomy")]
    pub agent_autonomy: Option<String>,
    #[serde(rename = "modelSelection")]
    pub model_selection: Option<String>,
    #[serde(rename = "enableDebugLogs")]
    pub enable_debug_logs: Option<bool>,
    #[serde(rename = "enableTabAutocomplete")]
    pub enable_tab_autocomplete: Option<bool>,
    #[serde(rename = "enableCodebaseIndexing")]
    pub enable_codebase_indexing: Option<bool>,
    #[serde(rename = "usageSummary")]
    pub usage_summary: Option<bool>,
    #[serde(rename = "codeReferences")]
    pub code_references: Option<bool>,
    #[serde(rename = "configureMCP")]
    pub configure_mcp: Option<String>,
    #[serde(rename = "trustedCommands")]
    pub trusted_commands: Option<Vec<String>>,
    #[serde(rename = "commandDenylist")]
    pub command_denylist: Option<Vec<String>>,
    #[serde(rename = "notificationsActionRequired")]
    pub notifications_action_required: Option<bool>,
    #[serde(rename = "notificationsFailure")]
    pub notifications_failure: Option<bool>,
    #[serde(rename = "notificationsSuccess")]
    pub notifications_success: Option<bool>,
    #[serde(rename = "notificationsBilling")]
    pub notifications_billing: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct McpServer {
    pub command: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub args: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub env: Option<HashMap<String, String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub disabled: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename = "autoApprove")]
    pub auto_approve: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct McpConfig {
    #[serde(rename = "mcpServers")]
    pub mcp_servers: HashMap<String, McpServer>,
}

#[derive(Debug, Serialize)]
pub struct KiroSettingsResponse {
    pub settings: KiroSettings,
    #[serde(rename = "mcpConfig")]
    pub mcp_config: McpConfig,
    #[serde(rename = "steeringFiles")]
    pub steering_files: Vec<String>,
}

// 获取 Kiro 配置目录路径
fn get_kiro_config_dir() -> Result<PathBuf, String> {
    let home = dirs::home_dir().ok_or("无法获取用户主目录")?;
    Ok(home.join(".kiro").join("settings"))
}

// 获取 Kiro Steering 目录路径
fn get_kiro_steering_dir() -> Result<PathBuf, String> {
    let home = dirs::home_dir().ok_or("无法获取用户主目录")?;
    Ok(home.join(".kiro").join("steering"))
}

// 获取 Kiro 设置
#[tauri::command]
pub async fn get_kiro_settings() -> Result<KiroSettingsResponse, String> {
    println!("[Kiro设置] 开始加载设置");
    
    let config_dir = get_kiro_config_dir()?;
    println!("[Kiro设置] 配置目录: {:?}", config_dir);
    
    let settings_file = config_dir.join("settings.json");
    println!("[Kiro设置] 设置文件路径: {:?}", settings_file);
    
    // 读取设置
    let settings = if settings_file.exists() {
        println!("[Kiro设置] 设置文件存在，开始读取");
        let content = fs::read_to_string(&settings_file)
            .map_err(|e| format!("读取设置文件失败: {}", e))?;
        println!("[Kiro设置] 文件内容长度: {} 字节", content.len());
        
        serde_json::from_str(&content)
            .unwrap_or_else(|e| {
                println!("[Kiro设置] 解析设置文件失败: {}, 使用默认设置", e);
                KiroSettings {
                    agent_autonomy: None,
                    model_selection: None,
                    enable_debug_logs: None,
                    enable_tab_autocomplete: None,
                    enable_codebase_indexing: None,
                    usage_summary: None,
                    code_references: None,
                    configure_mcp: None,
                    trusted_commands: None,
                    command_denylist: None,
                    notifications_action_required: None,
                    notifications_failure: None,
                    notifications_success: None,
                    notifications_billing: None,
                }
            })
    } else {
        println!("[Kiro设置] 设置文件不存在，使用默认设置");
        KiroSettings {
            agent_autonomy: None,
            model_selection: None,
            enable_debug_logs: None,
            enable_tab_autocomplete: None,
            enable_codebase_indexing: None,
            usage_summary: None,
            code_references: None,
            configure_mcp: None,
            trusted_commands: None,
            command_denylist: None,
            notifications_action_required: None,
            notifications_failure: None,
            notifications_success: None,
            notifications_billing: None,
        }
    };
    
    println!("[Kiro设置] 设置加载完成: {:?}", settings);
    
    // 读取 MCP 配置
    let mcp_file = config_dir.join("mcp.json");
    println!("[Kiro设置] MCP 配置文件路径: {:?}", mcp_file);
    
    let mcp_config = if mcp_file.exists() {
        println!("[Kiro设置] MCP 配置文件存在，开始读取");
        let content = fs::read_to_string(&mcp_file)
            .map_err(|e| format!("读取 MCP 配置失败: {}", e))?;
        serde_json::from_str(&content)
            .unwrap_or_else(|e| {
                println!("[Kiro设置] 解析 MCP 配置失败: {}, 使用空配置", e);
                McpConfig {
                    mcp_servers: HashMap::new(),
                }
            })
    } else {
        println!("[Kiro设置] MCP 配置文件不存在，使用空配置");
        McpConfig {
            mcp_servers: HashMap::new(),
        }
    };
    
    println!("[Kiro设置] MCP 服务器数量: {}", mcp_config.mcp_servers.len());
    
    // 读取 Steering 文件列表
    let steering_dir = get_kiro_steering_dir()?;
    println!("[Kiro设置] Steering 目录: {:?}", steering_dir);
    
    let mut steering_files = Vec::new();
    
    if steering_dir.exists() {
        println!("[Kiro设置] Steering 目录存在，开始扫描文件");
        if let Ok(entries) = fs::read_dir(&steering_dir) {
            for entry in entries.flatten() {
                if let Ok(file_type) = entry.file_type() {
                    if file_type.is_file() {
                        if let Some(name) = entry.file_name().to_str() {
                            if name.ends_with(".md") {
                                println!("[Kiro设置] 找到 Steering 文件: {}", name);
                                steering_files.push(name.to_string());
                            }
                        }
                    }
                }
            }
        }
    } else {
        println!("[Kiro设置] Steering 目录不存在");
    }
    
    steering_files.sort();
    println!("[Kiro设置] Steering 文件总数: {}", steering_files.len());
    
    println!("[Kiro设置] 设置加载完成，返回响应");
    
    Ok(KiroSettingsResponse {
        settings,
        mcp_config,
        steering_files,
    })
}

// 保存 Kiro 设置
#[tauri::command]
pub async fn save_kiro_settings(settings: KiroSettings) -> Result<(), String> {
    println!("[Kiro设置] 开始保存设置");
    println!("[Kiro设置] 设置内容: {:?}", settings);
    
    let config_dir = get_kiro_config_dir()?;
    println!("[Kiro设置] 配置目录: {:?}", config_dir);
    
    // 确保目录存在
    fs::create_dir_all(&config_dir)
        .map_err(|e| format!("创建配置目录失败: {}", e))?;
    println!("[Kiro设置] 配置目录已创建或已存在");
    
    let settings_file = config_dir.join("settings.json");
    println!("[Kiro设置] 设置文件路径: {:?}", settings_file);
    
    let content = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("序列化设置失败: {}", e))?;
    
    println!("[Kiro设置] 序列化后的内容长度: {} 字节", content.len());
    println!("[Kiro设置] 设置内容:\n{}", content);
    
    fs::write(&settings_file, content)
        .map_err(|e| format!("写入设置文件失败: {}", e))?;
    
    println!("[Kiro设置] 设置已成功保存到: {:?}", settings_file);
    
    Ok(())
}

// 获取可用模型列表
#[tauri::command]
pub async fn get_kiro_available_models() -> Result<serde_json::Value, String> {
    // 这里返回空列表，实际应该从 Kiro API 获取
    Ok(serde_json::json!({
        "models": []
    }))
}

// 打开 Kiro 设置文件
#[tauri::command]
pub async fn open_kiro_settings_file() -> Result<(), String> {
    let config_dir = get_kiro_config_dir()?;
    let settings_file = config_dir.join("settings.json");
    
    // 如果文件不存在，创建默认文件
    if !settings_file.exists() {
        fs::create_dir_all(&config_dir)
            .map_err(|e| format!("创建配置目录失败: {}", e))?;
        fs::write(&settings_file, "{}")
            .map_err(|e| format!("创建设置文件失败: {}", e))?;
    }
    
    opener::open(&settings_file)
        .map_err(|e| format!("打开设置文件失败: {}", e))?;
    
    Ok(())
}

// 打开 MCP 配置文件
#[tauri::command]
pub async fn open_kiro_mcp_config(r#type: String) -> Result<(), String> {
    println!("[Kiro设置] 打开 MCP 配置文件: {}", r#type);
    
    let config_dir = get_kiro_config_dir()?;
    let mcp_file = config_dir.join("mcp.json");
    
    // 如果文件不存在，创建默认文件
    if !mcp_file.exists() {
        fs::create_dir_all(&config_dir)
            .map_err(|e| format!("创建配置目录失败: {}", e))?;
        let default_config = McpConfig {
            mcp_servers: HashMap::new(),
        };
        let content = serde_json::to_string_pretty(&default_config)
            .map_err(|e| format!("序列化配置失败: {}", e))?;
        fs::write(&mcp_file, content)
            .map_err(|e| format!("创建 MCP 配置文件失败: {}", e))?;
    }
    
    opener::open(&mcp_file)
        .map_err(|e| format!("打开 MCP 配置文件失败: {}", e))?;
    
    Ok(())
}

// 读取 MCP 配置文件内容
#[tauri::command]
pub async fn read_kiro_mcp_config(r#type: String) -> Result<String, String> {
    println!("[Kiro设置] 读取 MCP 配置文件: {}", r#type);
    
    let config_dir = get_kiro_config_dir()?;
    let mcp_file = config_dir.join("mcp.json");
    
    if !mcp_file.exists() {
        println!("[Kiro设置] MCP 配置文件不存在，返回默认内容");
        let default_config = McpConfig {
            mcp_servers: HashMap::new(),
        };
        let content = serde_json::to_string_pretty(&default_config)
            .map_err(|e| format!("序列化配置失败: {}", e))?;
        return Ok(content);
    }
    
    let content = fs::read_to_string(&mcp_file)
        .map_err(|e| format!("读取 MCP 配置文件失败: {}", e))?;
    
    println!("[Kiro设置] MCP 配置文件读取成功，长度: {} 字节", content.len());
    
    Ok(content)
}

// 保存 MCP 配置文件内容
#[tauri::command]
pub async fn write_kiro_mcp_config(r#type: String, content: String) -> Result<(), String> {
    println!("[Kiro设置] 保存 MCP 配置文件: {}", r#type);
    println!("[Kiro设置] 内容长度: {} 字节", content.len());
    
    let config_dir = get_kiro_config_dir()?;
    
    // 确保目录存在
    fs::create_dir_all(&config_dir)
        .map_err(|e| format!("创建配置目录失败: {}", e))?;
    
    let mcp_file = config_dir.join("mcp.json");
    
    // 验证 JSON 格式
    serde_json::from_str::<serde_json::Value>(&content)
        .map_err(|e| format!("JSON 格式错误: {}", e))?;
    
    fs::write(&mcp_file, content)
        .map_err(|e| format!("写入 MCP 配置文件失败: {}", e))?;
    
    println!("[Kiro设置] MCP 配置文件保存成功");
    
    Ok(())
}

// 打开 Steering 目录
#[tauri::command]
pub async fn open_kiro_steering_folder() -> Result<(), String> {
    let steering_dir = get_kiro_steering_dir()?;
    
    // 确保目录存在
    fs::create_dir_all(&steering_dir)
        .map_err(|e| format!("创建 Steering 目录失败: {}", e))?;
    
    opener::open(&steering_dir)
        .map_err(|e| format!("打开 Steering 目录失败: {}", e))?;
    
    Ok(())
}

// 打开 Steering 文件
#[tauri::command]
pub async fn open_kiro_steering_file(filename: String) -> Result<(), String> {
    let steering_dir = get_kiro_steering_dir()?;
    let file_path = steering_dir.join(&filename);
    
    if !file_path.exists() {
        return Err(format!("文件不存在: {}", filename));
    }
    
    opener::open(&file_path)
        .map_err(|e| format!("打开 Steering 文件失败: {}", e))?;
    
    Ok(())
}

// 读取 Steering 文件内容
#[tauri::command]
pub async fn read_kiro_steering_file(filename: String) -> Result<serde_json::Value, String> {
    let steering_dir = get_kiro_steering_dir()?;
    let file_path = steering_dir.join(&filename);
    
    if !file_path.exists() {
        return Err(format!("文件不存在: {}", filename));
    }
    
    let content = fs::read_to_string(&file_path)
        .map_err(|e| format!("读取文件失败: {}", e))?;
    
    Ok(serde_json::json!({
        "success": true,
        "content": content
    }))
}

// 保存 Steering 文件内容
#[tauri::command]
pub async fn save_kiro_steering_file(filename: String, content: String) -> Result<serde_json::Value, String> {
    let steering_dir = get_kiro_steering_dir()?;
    
    // 确保目录存在
    fs::create_dir_all(&steering_dir)
        .map_err(|e| format!("创建 Steering 目录失败: {}", e))?;
    
    let file_path = steering_dir.join(&filename);
    
    fs::write(&file_path, content)
        .map_err(|e| format!("写入文件失败: {}", e))?;
    
    Ok(serde_json::json!({
        "success": true
    }))
}

// 删除 Steering 文件
#[tauri::command]
pub async fn delete_kiro_steering_file(filename: String) -> Result<serde_json::Value, String> {
    println!("[Kiro设置] 删除 Steering 文件: {}", filename);
    
    let steering_dir = get_kiro_steering_dir()?;
    let file_path = steering_dir.join(&filename);
    
    println!("[Kiro设置] 文件路径: {:?}", file_path);
    
    if !file_path.exists() {
        println!("[Kiro设置] 文件不存在");
        return Err(format!("文件不存在: {}", filename));
    }
    
    fs::remove_file(&file_path)
        .map_err(|e| format!("删除文件失败: {}", e))?;
    
    println!("[Kiro设置] 文件删除成功");
    
    Ok(serde_json::json!({
        "success": true
    }))
}

// 重命名 Steering 文件
#[tauri::command]
pub async fn rename_kiro_steering_file(old_filename: String, new_filename: String) -> Result<serde_json::Value, String> {
    println!("[Kiro设置] 重命名 Steering 文件: {} -> {}", old_filename, new_filename);
    
    let steering_dir = get_kiro_steering_dir()?;
    let old_path = steering_dir.join(&old_filename);
    let new_path = steering_dir.join(&new_filename);
    
    println!("[Kiro设置] 旧文件路径: {:?}", old_path);
    println!("[Kiro设置] 新文件路径: {:?}", new_path);
    
    if !old_path.exists() {
        println!("[Kiro设置] 旧文件不存在");
        return Err(format!("文件不存在: {}", old_filename));
    }
    
    if new_path.exists() {
        println!("[Kiro设置] 新文件名已存在");
        return Err(format!("文件名已存在: {}", new_filename));
    }
    
    fs::rename(&old_path, &new_path)
        .map_err(|e| format!("重命名文件失败: {}", e))?;
    
    println!("[Kiro设置] 文件重命名成功");
    
    Ok(serde_json::json!({
        "success": true
    }))
}

// 创建默认规则文件
#[tauri::command]
pub async fn create_kiro_default_rules() -> Result<serde_json::Value, String> {
    println!("[Kiro设置] 创建默认规则文件");
    
    let steering_dir = get_kiro_steering_dir()?;
    println!("[Kiro设置] Steering 目录: {:?}", steering_dir);
    
    // 确保目录存在
    fs::create_dir_all(&steering_dir)
        .map_err(|e| format!("创建 Steering 目录失败: {}", e))?;
    
    let default_file = steering_dir.join("开发规范.md");
    println!("[Kiro设置] 默认文件路径: {:?}", default_file);
    
    if !default_file.exists() {
        let default_content = r#"# Kiro 开发规范

1. 使用中文回复所有问题和说明
2. 代码注释使用中文
3. 变量名、函数名、类名等标识符使用英文
4. 不使用装饰性符号（如 emoji 等）
5. 保持专业、简洁的表达方式
6. 不要使用模拟功能
7. 合理规划文件，单文件不要大于500行
"#;
        
        fs::write(&default_file, default_content)
            .map_err(|e| format!("创建默认规则文件失败: {}", e))?;
        
        println!("[Kiro设置] 默认规则文件创建成功");
    } else {
        println!("[Kiro设置] 默认规则文件已存在");
    }
    
    Ok(serde_json::json!({
        "success": true
    }))
}

// 保存 MCP 服务器配置
#[tauri::command]
pub async fn save_mcp_server(
    name: String,
    server: McpServer,
    old_name: Option<String>,
) -> Result<serde_json::Value, String> {
    println!("[Kiro设置] 保存 MCP 服务器: {}", name);
    println!("[Kiro设置] 服务器配置: {:?}", server);
    if let Some(ref old) = old_name {
        println!("[Kiro设置] 旧名称: {}", old);
    }
    
    let config_dir = get_kiro_config_dir()?;
    let mcp_file = config_dir.join("mcp.json");
    
    println!("[Kiro设置] MCP 配置文件: {:?}", mcp_file);
    
    // 读取现有配置
    let mut mcp_config = if mcp_file.exists() {
        let content = fs::read_to_string(&mcp_file)
            .map_err(|e| format!("读取 MCP 配置失败: {}", e))?;
        serde_json::from_str::<McpConfig>(&content)
            .unwrap_or_else(|_| McpConfig {
                mcp_servers: HashMap::new(),
            })
    } else {
        McpConfig {
            mcp_servers: HashMap::new(),
        }
    };
    
    // 如果是重命名，删除旧名称
    if let Some(old) = old_name {
        if old != name {
            println!("[Kiro设置] 删除旧服务器: {}", old);
            mcp_config.mcp_servers.remove(&old);
        }
    }
    
    // 添加或更新服务器
    mcp_config.mcp_servers.insert(name.clone(), server);
    println!("[Kiro设置] 当前 MCP 服务器总数: {}", mcp_config.mcp_servers.len());
    
    // 保存配置
    fs::create_dir_all(&config_dir)
        .map_err(|e| format!("创建配置目录失败: {}", e))?;
    
    let content = serde_json::to_string_pretty(&mcp_config)
        .map_err(|e| format!("序列化配置失败: {}", e))?;
    
    fs::write(&mcp_file, content)
        .map_err(|e| format!("写入 MCP 配置失败: {}", e))?;
    
    println!("[Kiro设置] MCP 服务器保存成功");
    
    Ok(serde_json::json!({
        "success": true
    }))
}

// 删除 MCP 服务器
#[tauri::command]
pub async fn delete_mcp_server(name: String) -> Result<serde_json::Value, String> {
    println!("[Kiro设置] 删除 MCP 服务器: {}", name);
    
    let config_dir = get_kiro_config_dir()?;
    let mcp_file = config_dir.join("mcp.json");
    
    if !mcp_file.exists() {
        println!("[Kiro设置] MCP 配置文件不存在");
        return Err("MCP 配置文件不存在".to_string());
    }
    
    // 读取现有配置
    let content = fs::read_to_string(&mcp_file)
        .map_err(|e| format!("读取 MCP 配置失败: {}", e))?;
    let mut mcp_config = serde_json::from_str::<McpConfig>(&content)
        .map_err(|e| format!("解析 MCP 配置失败: {}", e))?;
    
    // 删除服务器
    mcp_config.mcp_servers.remove(&name);
    println!("[Kiro设置] 服务器已删除，剩余 {} 个", mcp_config.mcp_servers.len());
    
    // 保存配置
    let content = serde_json::to_string_pretty(&mcp_config)
        .map_err(|e| format!("序列化配置失败: {}", e))?;
    
    fs::write(&mcp_file, content)
        .map_err(|e| format!("写入 MCP 配置失败: {}", e))?;
    
    println!("[Kiro设置] MCP 配置已更新");
    
    Ok(serde_json::json!({
        "success": true
    }))
}
