// Kiro 设置类型定义

export interface KiroSettings {
  agentAutonomy: string
  modelSelection: string
  enableDebugLogs: boolean
  enableTabAutocomplete: boolean
  enableCodebaseIndexing: boolean
  usageSummary: boolean
  codeReferences: boolean
  configureMCP: string
  trustedCommands: string[]
  commandDenylist: string[]
  notificationsActionRequired: boolean
  notificationsFailure: boolean
  notificationsSuccess: boolean
  notificationsBilling: boolean
}

export interface McpServer {
  command: string
  args?: string[]
  env?: Record<string, string>
  disabled?: boolean
  autoApprove?: string[]
}

export interface McpConfig {
  mcpServers: Record<string, McpServer>
}

export interface KiroModel {
  id: string
  name: string
  description: string
}

// 默认禁止的危险命令
export const DEFAULT_DENY_COMMANDS = [
  'rm -rf *',
  'rm -rf /',
  'rm -rf ~',
  'del /f /s /q *',
  'format',
  'mkfs',
  'dd if=',
  ':(){:|:&};:',
  'chmod -R 777 /',
  'chown -R',
  '> /dev/sda',
  'wget * | sh',
  'curl * | sh',
  'shutdown',
  'reboot',
  'init 0',
  'init 6'
]
