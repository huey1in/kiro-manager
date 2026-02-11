// 机器码管理模块 - Windows 版本
use serde::Serialize;
use std::process::Command;
use winreg::enums::*;
use winreg::RegKey;

#[derive(Debug, Serialize)]
pub struct MachineIdResult {
    pub success: bool,
    pub machine_id: Option<String>,
    pub error: Option<String>,
}

// 获取当前机器码
#[tauri::command]
pub async fn get_current_machine_id() -> Result<MachineIdResult, String> {
    println!("[机器码] 开始获取当前机器码");
    
    // 方法1: 使用 winreg 读取注册表
    match get_machine_id_from_registry() {
        Ok(machine_id) => {
            println!("[机器码] 成功获取: {}", machine_id);
            return Ok(MachineIdResult {
                success: true,
                machine_id: Some(machine_id),
                error: None,
            });
        }
        Err(e) => {
            println!("[机器码] 注册表读取失败: {}", e);
        }
    }
    
    // 方法2: 使用 reg query 命令
    match get_machine_id_from_command() {
        Ok(machine_id) => {
            println!("[机器码] 通过命令获取成功: {}", machine_id);
            return Ok(MachineIdResult {
                success: true,
                machine_id: Some(machine_id),
                error: None,
            });
        }
        Err(e) => {
            println!("[机器码] 命令获取失败: {}", e);
        }
    }
    
    Ok(MachineIdResult {
        success: false,
        machine_id: None,
        error: Some("无法获取机器码".to_string()),
    })
}

// 设置新机器码
#[tauri::command]
pub async fn set_machine_id(new_machine_id: String) -> Result<MachineIdResult, String> {
    println!("[机器码] 开始设置新机器码: {}", new_machine_id);
    
    // 验证格式
    if !is_valid_machine_id(&new_machine_id) {
        return Ok(MachineIdResult {
            success: false,
            machine_id: None,
            error: Some("无效的机器码格式".to_string()),
        });
    }
    
    // 尝试使用 winreg 写入
    match set_machine_id_to_registry(&new_machine_id) {
        Ok(_) => {
            println!("[机器码] 设置成功");
            return Ok(MachineIdResult {
                success: true,
                machine_id: Some(new_machine_id),
                error: None,
            });
        }
        Err(e) => {
            println!("[机器码] 设置失败: {}", e);
            let error_msg = if e.to_string().contains("Access is denied") || e.to_string().contains("拒绝访问") {
                "需要管理员权限".to_string()
            } else {
                format!("设置失败: {}", e)
            };
            
            return Ok(MachineIdResult {
                success: false,
                machine_id: None,
                error: Some(error_msg),
            });
        }
    }
}

// 检查是否有管理员权限
#[tauri::command]
pub async fn check_admin_privilege() -> Result<bool, String> {
    // 尝试打开需要管理员权限的注册表键
    match RegKey::predef(HKEY_LOCAL_MACHINE)
        .open_subkey_with_flags("SOFTWARE\\Microsoft\\Cryptography", KEY_WRITE)
    {
        Ok(_) => Ok(true),
        Err(_) => Ok(false),
    }
}

// 生成随机机器码
#[tauri::command]
pub async fn generate_random_machine_id() -> Result<String, String> {
    Ok(uuid::Uuid::new_v4().to_string().to_lowercase())
}

// 从注册表读取机器码
fn get_machine_id_from_registry() -> Result<String, String> {
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let key = hklm
        .open_subkey("SOFTWARE\\Microsoft\\Cryptography")
        .map_err(|e| format!("打开注册表键失败: {}", e))?;
    
    let machine_guid: String = key
        .get_value("MachineGuid")
        .map_err(|e| format!("读取 MachineGuid 失败: {}", e))?;
    
    Ok(machine_guid.to_lowercase())
}

// 使用命令行读取机器码
fn get_machine_id_from_command() -> Result<String, String> {
    let output = Command::new("reg")
        .args(&[
            "query",
            "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography",
            "/v",
            "MachineGuid",
        ])
        .output()
        .map_err(|e| format!("执行命令失败: {}", e))?;
    
    let stdout = String::from_utf8_lossy(&output.stdout);
    
    // 解析输出
    for line in stdout.lines() {
        if line.contains("MachineGuid") && line.contains("REG_SZ") {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if let Some(guid) = parts.last() {
                return Ok(guid.to_lowercase());
            }
        }
    }
    
    Err("无法从命令输出中解析机器码".to_string())
}

// 写入注册表
fn set_machine_id_to_registry(new_machine_id: &str) -> Result<(), String> {
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let key = hklm
        .open_subkey_with_flags("SOFTWARE\\Microsoft\\Cryptography", KEY_WRITE)
        .map_err(|e| format!("打开注册表键失败: {}", e))?;
    
    key.set_value("MachineGuid", &new_machine_id)
        .map_err(|e| format!("写入 MachineGuid 失败: {}", e))?;
    
    Ok(())
}

// 验证机器码格式
fn is_valid_machine_id(machine_id: &str) -> bool {
    // UUID 格式: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    let parts: Vec<&str> = machine_id.split('-').collect();
    if parts.len() != 5 {
        return false;
    }
    
    if parts[0].len() != 8 || parts[1].len() != 4 || parts[2].len() != 4 
        || parts[3].len() != 4 || parts[4].len() != 12 {
        return false;
    }
    
    // 检查是否都是十六进制字符
    machine_id.chars().all(|c| c.is_ascii_hexdigit() || c == '-')
}
