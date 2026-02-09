# Kiro Manager

<div align="center">
  <img src="src/assets/logo.svg" alt="Kiro Manager Logo" width="120" height="120">
  <p>一个现代化的 Kiro 账号管理工具</p>
  
  [![GitHub Stars](https://img.shields.io/github/stars/huey1in/kiro-manager?style=flat-square&logo=github)](https://github.com/huey1in/kiro-manager)
  [![GitHub Forks](https://img.shields.io/github/forks/huey1in/kiro-manager?style=flat-square&logo=github)](https://github.com/huey1in/kiro-manager)
  [![GitHub Release](https://img.shields.io/github/v/release/huey1in/kiro-manager?style=flat-square&logo=github)](https://github.com/huey1in/kiro-manager/releases)
  [![Repo Views](https://komarev.com/ghpvc/?username=huey1in&repo=kiro-manager&style=flat-square&color=orange&label=Clone+%26+Views)](https://github.com/huey1in/kiro-manager)
  [![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)
</div>

## 功能特性

### 账号管理
- 支持单个和批量导入账号
- 自动验证 OIDC 凭证
- 实时显示账号状态（正常、已封禁、已过期等）
- 查看账号可用模型列表
- 账号使用量和订阅信息展示

### 数据安全
- 本地存储，数据保存在用户目录
- 支持隐私模式，隐藏敏感信息
- 支持导出账号数据

### 自动化功能
- Token 自动刷新
- 账号信息自动同步
- 可配置的检查间隔

## 下载安装

前往 [Releases](https://github.com/huey1in/kiro-manager/releases) 页面下载最新版本的安装包。

### Windows
下载 `.msi` 或 `.exe` 安装包，双击运行即可安装。

## 使用说明

### 账号凭证

账号凭证包括：
- Refresh Token
- Client ID
- Client Secret
- Region（区域）


### 查看账号信息

点击账号卡片可以查看详细信息：
- 用户邮箱和 ID
- 订阅类型和到期时间
- 使用量统计
- 可用模型列表

### 自动刷新设置

在"设置"页面可以配置：
- 启用/禁用自动刷新
- 设置检查间隔（30秒 - 30分钟）
- 是否同步账户信息


## 技术栈

- **前端框架**：TypeScript + Vite
- **桌面框架**：Tauri 2.0
- **后端语言**：Rust
- **UI 样式**：原生 CSS

## 开发

### 环境要求

- Node.js 20+
- Rust 1.70+
- Windows 10/11

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run tauri dev
```

### 构建应用

```bash
npm run tauri build
```


## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 免责声明

本工具仅供学习和个人使用，请遵守 Kiro 服务条款。
