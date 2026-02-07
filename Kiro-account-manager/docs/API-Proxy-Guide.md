# API 反代服务使用指南

## 概述

API 反代服务提供 OpenAI 和 Claude 兼容的 API 端点，支持多账号轮询、Token 自动刷新、请求重试等高级功能。

## 快速开始

### 1. 启动服务

1. 在应用中导航到「API 反代服务」页面
2. 配置端口号（默认 5580）
3. 点击「启动服务」按钮

### 2. 配置客户端

将你的 AI 客户端（如 Cursor、Continue、Cline 等）的 API 地址设置为：

```
http://localhost:5580
```

## API 端点

### OpenAI 兼容端点

```
POST http://localhost:5580/v1/chat/completions
```

请求示例：
```json
{
  "model": "claude-3-5-sonnet-20241022",
  "messages": [
    {"role": "user", "content": "Hello!"}
  ],
  "stream": true
}
```

### Claude 兼容端点

```
POST http://localhost:5580/v1/messages
```

请求示例：
```json
{
  "model": "claude-3-5-sonnet-20241022",
  "max_tokens": 4096,
  "messages": [
    {"role": "user", "content": "Hello!"}
  ],
  "stream": true
}
```

## 配置选项

| 选项 | 说明 | 默认值 |
|------|------|--------|
| 端口 | 服务监听端口 | 5580 |
| 主机 | 服务监听地址 | 127.0.0.1 |
| API Key | 可选的认证密钥 | 空 |
| 多账号轮询 | 启用多账号负载均衡 | 开启 |
| 记录请求日志 | 记录请求和响应日志 | 关闭 |
| 首选端点 | CodeWhisperer / AmazonQ | 自动选择 |
| 最大重试次数 | 请求失败时的重试次数 | 3 |

## 高级功能

### Token 自动刷新

服务会在 Token 过期前自动刷新，无需手动干预。刷新提前时间为 5 分钟。

### 请求重试机制

- **401/403 错误**：自动刷新 Token 后重试
- **429 错误**：切换到其他账号/端点后重试
- **5xx 错误**：延迟后重试

### 多账号轮询

当启用多账号轮询时，服务会在多个账号之间智能分配请求，实现负载均衡。

### Agentic 模式检测

自动检测 Agentic 模式（模型名称包含 `-agent` 或请求包含工具），并注入优化的系统提示。

### Thinking 模式支持

支持 Claude 的 Extended Thinking 功能，通过 `Anthropic-Beta: extended-thinking` 头启用。

### API Key 认证

如果配置了 API Key，所有请求必须携带认证头：

```
Authorization: Bearer your-api-key
```

或

```
X-Api-Key: your-api-key
```

## 管理 API

### 获取统计信息

```
GET http://localhost:5580/admin/stats
```

### 获取账号列表

```
GET http://localhost:5580/admin/accounts
```

### 获取请求日志

```
GET http://localhost:5580/admin/logs
```

## 在 IDE 中使用

### Cursor

1. 打开设置 → Models → OpenAI API Key
2. 设置 API Key（如果配置了的话）
3. 设置 Base URL 为 `http://localhost:5580/v1`

### Continue

在 `~/.continue/config.json` 中添加：

```json
{
  "models": [
    {
      "title": "Kiro Proxy",
      "provider": "openai",
      "model": "claude-3-5-sonnet-20241022",
      "apiBase": "http://localhost:5580/v1",
      "apiKey": "your-api-key"
    }
  ]
}
```

### Cline

1. 打开 Cline 设置
2. 选择 API Provider: OpenAI Compatible
3. 设置 Base URL: `http://localhost:5580/v1`
4. 设置 API Key（如果配置了的话）

## 常见问题

### Q: 服务启动失败？

检查端口是否被占用，尝试更换其他端口。

### Q: 请求返回 401 错误？

1. 检查是否配置了 API Key
2. 检查请求头中的认证信息是否正确

### Q: 请求超时？

1. 检查网络连接
2. 尝试增加最大重试次数
3. 检查账号状态是否正常

### Q: 如何查看请求日志？

1. 启用「记录请求日志」选项
2. 访问 `http://localhost:5580/admin/logs` 查看日志

## 支持的功能列表

- ✅ OpenAI 兼容 API
- ✅ Claude 兼容 API
- ✅ 流式响应 (SSE)
- ✅ Token 自动刷新
- ✅ 请求重试机制
- ✅ 多账号轮询
- ✅ IDC/Social 认证
- ✅ Agentic 模式检测
- ✅ Thinking 模式支持
- ✅ 图像处理
- ✅ 使用量统计
- ✅ API Key 认证
- ✅ 管理 API
