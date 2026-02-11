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

// 检查管理员权限
export async function checkAdminPrivilege(): Promise<boolean> {
  try {
    hasAdminPrivilege = await (window as any).__TAURI__.core.invoke('check_admin_privilege')
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
  }
}

// 应用机器码到账户
export async function applyMachineIdForAccount(accountId: string): Promise<boolean> {
  if (!hasAdminPrivilege) {
    return false
  }
  
  const config = loadConfig()
  
  if (!config.autoSwitchOnAccountChange) {
    return false
  }
  
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
      return true
    }
    
    // 应用机器码
    const result = await setMachineId(machineIdToApply)
    
    if (result.success) {
      addHistoryEntry(machineIdToApply, 'auto_switch', accountId)
      return true
    } else {
      return false
    }
  } catch (error) {
    return false
  }
}

// 验证机器码格式
export function validateMachineId(machineId: string): { valid: boolean; error?: string } {
  if (!machineId) {
    return { valid: false, error: '请输入机器码' }
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
