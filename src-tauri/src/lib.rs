// 模块声明
mod window;
mod auth;
mod storage;
mod models;
mod switch;
mod machine_id;
mod kiro_settings;
mod proxy;

use tauri::{Manager, PhysicalPosition};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            // 初始化 ProxyState
            let proxy_state = proxy::ProxyState::new(app.handle());
            app.manage(proxy_state);
            
            let window = app.get_webview_window("main").unwrap();
            
            // 恢复窗口位置
            tauri::async_runtime::spawn(async move {
                // 先恢复位置
                if let Ok(Some(position)) = window::load_window_position().await {
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
            auth::verify_account_credentials,
            storage::get_local_active_account,
            models::get_account_models,
            storage::load_accounts,
            storage::save_accounts,
            storage::save_custom_logo,
            storage::delete_custom_logo,
            window::save_window_position,
            window::load_window_position,
            switch::switch_account,
            switch::logout_account,
            switch::get_active_account,
            machine_id::get_current_machine_id,
            machine_id::set_machine_id,
            machine_id::check_admin_privilege,
            machine_id::generate_random_machine_id,
            kiro_settings::get_kiro_settings,
            kiro_settings::save_kiro_settings,
            kiro_settings::get_kiro_available_models,
            kiro_settings::open_kiro_settings_file,
            kiro_settings::open_kiro_mcp_config,
            kiro_settings::read_kiro_mcp_config,
            kiro_settings::write_kiro_mcp_config,
            kiro_settings::open_kiro_steering_folder,
            kiro_settings::open_kiro_steering_file,
            kiro_settings::read_kiro_steering_file,
            kiro_settings::save_kiro_steering_file,
            kiro_settings::delete_kiro_steering_file,
            kiro_settings::rename_kiro_steering_file,
            kiro_settings::create_kiro_default_rules,
            kiro_settings::save_mcp_server,
            kiro_settings::delete_mcp_server,
            proxy::commands::start_proxy_server,
            proxy::commands::stop_proxy_server,
            proxy::commands::get_proxy_status,
            proxy::commands::update_proxy_config,
            proxy::commands::sync_proxy_accounts,
            proxy::commands::get_proxy_accounts,
            proxy::commands::get_proxy_models,
            proxy::commands::get_proxy_logs,
            proxy::commands::reset_proxy_stats
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
