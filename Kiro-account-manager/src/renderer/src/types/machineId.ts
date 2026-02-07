/**
 * 机器码管理相关类型定义
 */

// 操作系统类型
export type OSType = 'windows' | 'macos' | 'linux' | 'unknown'

// 机器码配置
export interface MachineIdConfig {
  // 自动切换机器码（切号时自动更换）
  autoSwitchOnAccountChange: boolean
  // 账户机器码绑定（每个账户关联唯一机器码）
  bindMachineIdToAccount: boolean
  // 使用绑定的唯一机器码（否则随机生成）
  useBindedMachineId: boolean
}

// 机器码状态
export interface MachineIdState {
  // 当前系统机器码
  currentMachineId: string
  // 备份的原始机器码
  originalMachineId: string | null
  // 原始机器码备份时间
  originalBackupTime: number | null
  // 操作系统类型
  osType: OSType
  // 是否拥有管理员权限
  hasAdminPrivilege: boolean
  // 是否正在操作中
  isOperating: boolean
  // 最后一次操作错误
  lastError: string | null
  // 配置
  config: MachineIdConfig
  // 账户绑定的机器码映射 (accountId -> machineId)
  accountMachineIds: Record<string, string>
  // 机器码历史记录
  history: MachineIdHistoryEntry[]
}

// 机器码历史记录
export interface MachineIdHistoryEntry {
  id: string
  machineId: string
  timestamp: number
  action: 'initial' | 'manual' | 'auto_switch' | 'restore' | 'bind'
  accountId?: string
  accountEmail?: string
}

// 机器码操作结果
export interface MachineIdResult {
  success: boolean
  machineId?: string
  error?: string
  requiresAdmin?: boolean
}

// 主进程 API 接口
export interface MachineIdAPI {
  // 获取当前机器码
  getCurrentMachineId: () => Promise<MachineIdResult>
  // 设置新机器码
  setMachineId: (newMachineId: string) => Promise<MachineIdResult>
  // 生成随机机器码
  generateRandomMachineId: () => string
  // 检查管理员权限
  checkAdminPrivilege: () => Promise<boolean>
  // 请求管理员权限重启
  requestAdminRestart: () => Promise<boolean>
  // 获取操作系统类型
  getOSType: () => OSType
  // 备份机器码到文件
  backupMachineIdToFile: (machineId: string, path: string) => Promise<boolean>
  // 从文件恢复机器码
  restoreMachineIdFromFile: (path: string) => Promise<MachineIdResult>
}
