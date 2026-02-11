@echo off
:: 检查管理员权限
net session >nul 2>&1
if %errorLevel% == 0 (
    echo 已获得管理员权限，启动开发服务器...
    npm run tauri dev
) else (
    echo 请求管理员权限...
    powershell -Command "Start-Process cmd -ArgumentList '/c cd /d %~dp0 && npm run tauri dev && pause' -Verb RunAs"
)
