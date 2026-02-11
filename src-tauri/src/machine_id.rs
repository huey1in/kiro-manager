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
    // 方法1: 使用 winreg 读取注册表
    match get_machine_id_from_registry() {
        Ok(machine_id) => {
            return Ok(MachineIdResult {
                success: true,
                machine_id: Some(machine_id),
                error: None,
            });
        }
        Err(_) => {}
    }
    
    // 方法2: 使用 reg query 命令
    match get_machine_id_from_command() {
        Ok(machine_id) => {
            return Ok(MachineIdResult {
                success: true,
                machine_id: Some(machine_id),
                error: None,
            });
        }
        Err(_) => {}
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
    // 1. 首先检查管理员权限
    if !check_admin_privilege_internal() {
        return Ok(MachineIdResult {
            success: false,
            machine_id: None,
            error: Some("需要管理员权限".to_string()),
        });
    }
    
    // 2. 验证长度
    if new_machine_id.len() > 100 {
        return Ok(MachineIdResult {
            success: false,
            machine_id: None,
            error: Some("机器码长度超出限制".to_string()),
        });
    }
    
    // 3. 验证格式
    if !is_valid_machine_id(&new_machine_id) {
        return Ok(MachineIdResult {
            success: false,
            machine_id: None,
            error: Some("无效的机器码格式".to_string()),
        });
    }
    
    // 4. 尝试写入注册表
    match set_machine_id_to_registry(&new_machine_id) {
        Ok(_) => {
            Ok(MachineIdResult {
                success: true,
                machine_id: Some(new_machine_id),
                error: None,
            })
        }
        Err(_) => {
            Ok(MachineIdResult {
                success: false,
                machine_id: None,
                error: Some("设置失败".to_string()),
            })
        }
    }
}

// 内部权限检查函数
fn check_admin_privilege_internal() -> bool {
    match RegKey::predef(HKEY_LOCAL_MACHINE)
        .open_subkey_with_flags("SOFTWARE\\Microsoft\\Cryptography", KEY_WRITE)
    {
        Ok(_) => true,
        Err(_) => false,
    }
}

// 检查是否有管理员权限
#[tauri::command]
pub async fn check_admin_privilege() -> Result<bool, String> {
    Ok(check_admin_privilege_internal())
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
        .map_err(|_| "读取失败".to_string())?;
    
    let machine_guid: String = key
        .get_value("MachineGuid")
        .map_err(|_| "读取失败".to_string())?;
    
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
        .map_err(|_| "执行失败".to_string())?;
    
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
    
    Err("解析失败".to_string())
}

// 写入注册表
fn set_machine_id_to_registry(new_machine_id: &str) -> Result<(), String> {
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let key = hklm
        .open_subkey_with_flags("SOFTWARE\\Microsoft\\Cryptography", KEY_WRITE)
        .map_err(|_| "打开失败".to_string())?;
    
    key.set_value("MachineGuid", &new_machine_id)
        .map_err(|_| "写入失败".to_string())?;
    
    Ok(())
}

// 验证机器码格式
fn is_valid_machine_id(machine_id: &str) -> bool {
    // 检查长度
    if machine_id.len() > 100 {
        return false;
    }
    
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
