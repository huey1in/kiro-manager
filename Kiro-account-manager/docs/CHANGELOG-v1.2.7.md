# Kiro 账户管理器 v1.2.7 更新说明

发布日期：2024-12-09

## 🎨 界面美化

### 全局页面美化
- **统一页面头部设计**：所有页面采用渐变背景 + 模糊光效 + 主题色标题
- **统一卡片样式**：所有卡片添加悬停阴影效果和图标背景框
- **颜色主题化**：移除所有硬编码颜色，统一使用主题变量，确保深色/浅色模式和主题色切换时颜色一致

### 新增自定义 UI 组件
- **Toggle 开关组件**：替换原生 checkbox，提供平滑动画和主题色支持
- **Select 下拉组件**：替换原生 select，支持选项描述、勾选标记和主题色高亮

### 美化的页面
- **首页 (HomePage)**：头部渐变、统计卡片悬停效果、特色功能卡片主题化
- **账户管理 (AccountManager)**：头部渐变背景和图标
- **设置页面 (SettingsPage)**：头部渐变、所有卡片图标统一样式、检查间隔布局优化
- **Kiro 设置 (KiroSettingsPage)**：头部渐变、Toggle 开关、Select 下拉框、通知设置分组
- **关于页面 (AboutPage)**：头部渐变、所有卡片图标统一样式、功能列表颜色统一

## 🔧 功能优化

### OIDC 凭证批量导入
- **支持 GitHub 和 Google 账号**：批量导入时可通过 `provider` 字段指定账号类型
- **自动识别认证方式**：根据 provider 自动设置正确的 `authMethod` (IdC/social) 和 `idp`
- **更新帮助文本**：添加 GitHub/Google 示例和说明

### 批量导入 JSON 格式示例
```json
[
  {
    "refreshToken": "xxx",
    "clientId": "xxx",
    "clientSecret": "xxx",
    "provider": "BuilderId"
  },
  {
    "refreshToken": "yyy",
    "provider": "Github"
  },
  {
    "refreshToken": "zzz",
    "provider": "Google"
  }
]
```

## 📁 新增文件

- `src/renderer/src/components/ui/Toggle.tsx` - 自定义开关组件
- `src/renderer/src/components/ui/Select.tsx` - 自定义下拉选择组件

## 🐛 修复

- 修复设置页面检查间隔下拉框布局问题
- 修复 Kiro 设置页面上下下拉框宽度不一致问题
- 统一设置页面和 Kiro 设置页面的宽度设置
