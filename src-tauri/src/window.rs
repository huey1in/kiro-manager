// 窗口位置管理模块
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize)]
pub struct WindowPosition {
    pub x: i32,
    pub y: i32,
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
pub async fn save_window_position(x: i32, y: i32) -> Result<(), String> {
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
pub async fn load_window_position() -> Result<Option<WindowPosition>, String> {
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
