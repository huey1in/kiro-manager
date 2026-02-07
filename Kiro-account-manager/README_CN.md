# Kiro 账户管理器

<p align="center">
  <img src="resources/icon.png" width="128" height="128" alt="Kiro Logo">
</p>

<p align="center">
  <strong>一个功能强大的 Kiro IDE 多账号管理工具</strong>
</p>

<p align="center">
  支持多账号快速切换、自动 Token 刷新、分组标签管理、机器码管理等功能
</p>

<p align="center">
  <a href="README.md">English</a> | <strong>简体中文</strong>
</p>

---

## ✨ 功能特性

### 🔐 多账号管理
- 添加、编辑、删除多个 Kiro 账号
- 一键快速切换账号
- 支持 Builder ID 和社交登录（Google/GitHub）方式
- 批量导入/导出账号数据

### 🔄 自动刷新
- Token 过期前自动刷新
- 刷新后自动更新账号用量和订阅信息
- 开启自动切换后，定时检查所有账号余额

### 📁 分组与标签
- 使用分组和标签灵活组织账号
- 批量设置账号的分组/标签

### 🔑 机器码管理
- 修改设备标识符，防止账号关联封禁
- 切换账号时自动切换机器码
- 为每个账号分配唯一绑定的机器码

### 🔄 自动切换账号
- 余额不足时自动切换到可用账号
- 可配置余额阈值和检查间隔

### ⚙️ Kiro IDE 设置同步
- 同步 Kiro IDE 设置（Agent 模式、模型、MCP 服务器等）
- 编辑 MCP 服务器配置
- 管理用户规则（Steering 文件）

### 🌐 多语言支持
- 完整的中英文双语界面
- 自动检测系统语言或手动选择

### 🎨 个性化
- 21 种主题颜色可选
- 深色/浅色模式切换
- 隐私模式隐藏敏感信息

### 🌐 代理支持
- 支持 HTTP/HTTPS/SOCKS5 代理

---

## 📸 截图

### 主页
![主页](resources/主页.png)

### 账户管理
![账户管理](resources/账户管理.png)

### 机器码管理
![机器码管理](resources/机器码管理.png)

### 设置
![设置](resources/设置.png)

### Kiro IDE 设置
![Kiro 设置](resources/Kiro%20设置.png)

### 主题颜色
![主题颜色](resources/主题色.png)

### 关于
![关于](resources/关于.png)

---

## 🛠️ 技术栈

- **前端框架**: React 18 + TypeScript
- **桌面框架**: Electron
- **状态管理**: Zustand
- **UI 组件**: Radix UI + Tailwind CSS
- **图标库**: Lucide React
- **构建工具**: Vite

---

## 🚀 开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 类型检查
npm run typecheck
```

---

## 📋 更新日志

查看 [根目录 README](../README_CN.md#-更新日志) 获取完整更新日志。
