// 机器码存储管理模块

// 机器码配置
export interface MachineIdConfig {
  autoSwitchOnAccountChange: boolean
  bindMachineIdToAccount: boolean
  useBoundMachineId: boolean
}

// 历史记录条目
export interface MachineIdHistoryEntry {
  id: string
  machineId: string
  timestamp: number
  action: 'manual' | 'auto_switch' | 'restore' | 'bind'
  accountId?: string
}

// 账户机器码绑定映射
let accountMachineIdBindings: Record<string, string> = {}

// 历史记录
let machineIdHistory: MachineIdHistoryEntry[] = []

// 加载配置
export function loadConfig(): MachineIdConfig {
  const saved = localStorage.getItem('machine_id_config')
  if (saved) {
    return JSON.parse(saved)
  }
  return {
    autoSwitchOnAccountChange: false,
    bindMachineIdToAccount: false,
    useBoundMachineId: true
  }
}

// 保存配置
export function saveConfig(config: MachineIdConfig): void {
  localStorage.setItem('machine_id_config', JSON.stringify(config))
}

// 加载账户绑定
export function loadAccountBindings(): Record<string, string> {
  const saved = localStorage.getItem('account_machine_id_bindings')
  if (saved) {
    accountMachineIdBindings = JSON.parse(saved)
  }
  return accountMachineIdBindings
}

// 保存账户绑定
export function saveAccountBindings(bindings: Record<string, string>): void {
  accountMachineIdBindings = bindings
  localStorage.setItem('account_machine_id_bindings', JSON.stringify(bindings))
}

// 获取账户绑定
export function getAccountBinding(accountId: string): string | undefined {
  return accountMachineIdBindings[accountId]
}

// 设置账户绑定
export function setAccountBinding(accountId: string, machineId: string): void {
  accountMachineIdBindings[accountId] = machineId
  saveAccountBindings(accountMachineIdBindings)
}

// 删除账户绑定
export function removeAccountBinding(accountId: string): void {
  delete accountMachineIdBindings[accountId]
  saveAccountBindings(accountMachineIdBindings)
}

// 加载历史记录
export function loadHistory(): MachineIdHistoryEntry[] {
  const saved = localStorage.getItem('machine_id_history')
  if (saved) {
    machineIdHistory = JSON.parse(saved)
  }
  return machineIdHistory
}

// 保存历史记录
export function saveHistory(history: MachineIdHistoryEntry[]): void {
  machineIdHistory = history
  localStorage.setItem('machine_id_history', JSON.stringify(history))
}

// 添加历史记录
export function addHistoryEntry(
  machineId: string,
  action: 'manual' | 'auto_switch' | 'restore' | 'bind',
  accountId?: string
): void {
  // 先加载最新的历史记录
  loadHistory()
  
  const entry: MachineIdHistoryEntry = {
    id: crypto.randomUUID(),
    machineId,
    timestamp: Date.now(),
    action,
    accountId
  }
  machineIdHistory.push(entry)
  
  // 限制历史记录数量，最多保留 500 条
  if (machineIdHistory.length > 500) {
    machineIdHistory = machineIdHistory.slice(-500)
  }
  
  saveHistory(machineIdHistory)
}

// 清理已删除账号的绑定
export function cleanupDeletedAccountBindings(existingAccountIds: string[]): void {
  const bindings = loadAccountBindings()
  let hasChanges = false
  
  for (const accountId in bindings) {
    if (!existingAccountIds.includes(accountId)) {
      delete bindings[accountId]
      hasChanges = true
    }
  }
  
  if (hasChanges) {
    saveAccountBindings(bindings)
  }
}

// 清空历史记录
export function clearHistory(): void {
  machineIdHistory = []
  saveHistory(machineIdHistory)
}

// 获取历史记录数量
export function getHistoryCount(): number {
  return machineIdHistory.length
}

// 获取绑定数量
export function getBindingCount(): number {
  return Object.keys(accountMachineIdBindings).length
}

// 加载原始机器码
export function loadOriginalMachineId(): string | null {
  try {
    return localStorage.getItem('original_machine_id')
  } catch (error) {
    return null
  }
}

// 保存原始机器码
export function saveOriginalMachineId(machineId: string): void {
  try {
    localStorage.setItem('original_machine_id', machineId)
  } catch (error) {
    // 静默失败
  }
}
