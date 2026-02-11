// 机器码核心操作模块
import {
  loadConfig,
  loadAccountBindings,
  saveAccountBindings,
  getAccountBinding,
  setAccountBinding,
  addHistoryEntry,
  saveOriginalMachineId
} from './machine-id-storage'

// 存储当前机器码和权限状态
let currentMachineId: string | null = null
let hasAdminPrivilege: boolean | null = null
let operationInProgress: boolean = false

// 获取当前机器码
export function getCurrentMachineId(): string | null {
  return currentMachineId
}

// 设置当前机器码
export function setCurrentMachineId(machineId: string | null): void {
  currentMachineId = machineId
}

// 获取管理员权限状态
export function getAdminPrivilege(): boolean | null {
  return hasAdminPrivilege
}

// 设置管理员权限状态
export function setAdminPrivilege(privilege: boolean): void {
  hasAdminPrivilege = privilege
}

// 检查是否有操作正在进行
export function isOperationInProgress(): boolean {
  return operationInProgress
}

// 设置操作状态
function setOperationInProgress(inProgress: boolean): void {
  operationInProgress = inProgress
}

// 检查管理员权限
export async function checkAdminPrivilege(): Promise<boolean> {
  try {
    const result = await (window as any).__TAURI__.core.invoke('check_admin_privilege')
    hasAdminPrivilege = result as boolean
    return hasAdminPrivilege
  } catch (error) {
    hasAdminPrivilege = false
    return false
  }
}

// 获取机器码
export async function fetchMachineId(): Promise<{ success: boolean; machineId?: string; error?: string }> {
  try {
    const result = await (window as any).__TAURI__.core.invoke('get_current_machine_id')
    
    if (result.success && result.machine_id) {
      currentMachineId = result.machine_id
      return { success: true, machineId: result.machine_id }
    } else {
      return { success: false, error: result.error }
    }
  } catch (error) {
    return { success: false, error: '加载失败' }
  }
}

// 生成随机机器码
export async function generateRandomMachineId(): Promise<string> {
  return await (window as any).__TAURI__.core.invoke('generate_random_machine_id')
}

// 设置机器码
export async function setMachineId(newMachineId: string): Promise<{ success: boolean; error?: string }> {
  // 防止并发操作
  if (operationInProgress) {
    return { success: false, error: '操作正在进行中，请稍候' }
  }

  operationInProgress = true
  try {
    const result = await (window as any).__TAURI__.core.invoke('set_machine_id', {
      newMachineId: newMachineId
    })
    
    if (result.success) {
      currentMachineId = newMachineId
      return { success: true }
    } else {
      return { success: false, error: result.error }
    }
  } catch (error) {
    return { success: false, error: '操作失败' }
  } finally {
    operationInProgress = false
  }
}

// 应用机器码到账户
export async function applyMachineIdForAccount(accountId: string): Promise<boolean> {
  if (!hasAdminPrivilege) {
    console.log('[机器码] 没有管理员权限，跳过')
    return false
  }

  if (operationInProgress) {
    console.log('[机器码] 操作正在进行中，跳过')
    return false
  }
  
  const config = loadConfig()
  
  if (!config.autoSwitchOnAccountChange) {
    console.log('[机器码] 自动切换未启用，跳过')
    return false
  }
  
  operationInProgress = true
  try {
    // 保存当前机器码作为备份
    if (currentMachineId) {
      saveOriginalMachineId(currentMachineId)
    }
    
    let machineIdToApply: string
    
    if (config.bindMachineIdToAccount && config.useBoundMachineId) {
      // 使用绑定的机器码
      const bindings = loadAccountBindings()
      let boundMachineId = bindings[accountId]
      
      if (!boundMachineId) {
        // 生成新的绑定
        boundMachineId = await generateRandomMachineId()
        setAccountBinding(accountId, boundMachineId)
        addHistoryEntry(boundMachineId, 'bind', accountId)
      }
      
      machineIdToApply = boundMachineId
    } else {
      // 随机生成
      machineIdToApply = await generateRandomMachineId()
    }
    
    // 检查是否与当前相同
    if (machineIdToApply === currentMachineId) {
      console.log('[机器码] 机器码未改变，跳过')
      return true
    }
    
    // 应用机器码
    const result = await (window as any).__TAURI__.core.invoke('set_machine_id', {
      newMachineId: machineIdToApply
    })
    
    if (result.success) {
      currentMachineId = machineIdToApply
      addHistoryEntry(machineIdToApply, 'auto_switch', accountId)
      console.log('[机器码] 已应用:', machineIdToApply)
      return true
    } else {
      console.error('[机器码] 应用失败:', result.error)
      return false
    }
  } catch (error) {
    console.error('[机器码] 应用异常:', error)
    return false
  } finally {
    operationInProgress = false
  }
}

// 验证机器码格式
export function validateMachineId(machineId: string): { valid: boolean; error?: string } {
  if (!machineId) {
    return { valid: false, error: '请输入机器码' }
  }

  // 去除空格
  machineId = machineId.trim()
  
  if (machineId.length < 10) {
    return { valid: false, error: '机器码长度过短' }
  }
  
  if (machineId.length > 100) {
    return { valid: false, error: '机器码长度超出限制' }
  }
  
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidPattern.test(machineId)) {
    return { valid: false, error: '无效的 UUID 格式' }
  }
  
  return { valid: true }
}

// 检查机器码是否重复
export function checkDuplicateMachineId(machineId: string, excludeAccountId?: string): { isDuplicate: boolean; accountEmail?: string } {
  const bindings = loadAccountBindings()
  const accounts = (window as any).accountStore?.getAccounts() || []
  
  for (const [accountId, boundMachineId] of Object.entries(bindings)) {
    if (accountId === excludeAccountId) continue
    
    if (boundMachineId === machineId.toLowerCase()) {
      const account = accounts.find((a: any) => a.id === accountId)
      return {
        isDuplicate: true,
        accountEmail: account?.email || '未知账号'
      }
    }
  }
  
  return { isDuplicate: false }
}
