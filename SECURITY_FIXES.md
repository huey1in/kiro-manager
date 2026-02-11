# 安全修复建议

## 🔴 高优先级（必须修复）

### 1. 移除敏感信息日志
**文件**: `src-tauri/src/auth.rs`
**修复**: 移除或条件编译所有打印敏感信息的 println!

### 2. 强化机器码权限检查
**文件**: `src-tauri/src/machine_id.rs`
**修复**: 在 `set_machine_id` 函数开始时添加权限检查

### 3. 加密敏感数据存储
**文件**: `src/store.ts`, `src/handlers/machine-id-events.ts`
**修复**: 使用 Tauri 安全存储或加密 localStorage 数据

## 🟡 中优先级（建议修复）

### 4. 输入验证增强
**文件**: `src-tauri/src/machine_id.rs`
**修复**: 添加输入长度和格式的完整验证

### 5. 文件路径验证
**文件**: `src-tauri/src/storage.rs`
**修复**: 验证文件路径合法性，防止路径遍历攻击

### 6. XSS 防护
**文件**: 所有使用 innerHTML 的地方
**修复**: 改用 textContent 或进行 HTML 转义

## 🟢 低优先级（可选优化）

### 7. 添加速率限制
**文件**: `src/handlers/machine-id-events.ts`
**修复**: 对敏感操作添加频率限制

### 8. 统一错误处理
**文件**: 所有 Rust 文件
**修复**: 使用统一的错误处理策略

### 9. 日志级别控制
**文件**: 所有 Rust 文件
**修复**: 使用 log crate 替代 println!

## 其他建议

- 添加 CSRF 保护
- 实现会话超时机制
- 添加操作审计日志
- 定期更新依赖包
- 添加单元测试和安全测试
