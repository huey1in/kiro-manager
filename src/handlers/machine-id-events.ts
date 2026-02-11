// 机器码管理页面事件处理器 - 主入口
import { accountStore } from '../store'
import {
  loadConfig,
  loadOriginalMachineId,
  getAccountBinding,
  cleanupDeletedAccountBindings
} from './machine-id-storage'
import {
  checkAdminPrivilege,
  setAdminPrivilege,
  fetchMachineId,
  setCurrentMachineId,
  applyMachineIdForAccount as applyMachineId
} from './machine-id-operations'
import {
  updateCurrentMachineIdDisplay,
  updateOriginalMachineIdDisplay,
  updateHistoryDescription,
  updateAccountBindingDescription,
  copyMachineId,
  refreshMachineId,
  generateAndApplyRandomMachineId,
  applyCustomMachineId,
  restoreOriginalMachineId,
  openAccountBindingManager,
  generateBindingForAccount,
  removeAccountBinding,
  openMachineIdHistory,
  clearMachineIdHistory
} from './machine-id-ui'

// 初始化机器码页面
export async function initMachineIdPage(): Promise<void> {
  // 清理已删除账号的绑定
  const accounts = accountStore.getAccounts()
  const accountIds = accounts.map(a => a.id)
  cleanupDeletedAccountBindings(accountIds)
  
  // 更新描述
  updateHistoryDescription()
  updateAccountBindingDescription()
  
  // 检查管理员权限
  const hasPrivilege = await checkAdminPrivilege()
  setAdminPrivilege(hasPrivilege)
  const warningEl = document.getElementById('admin-warning')
  if (warningEl) {
    warningEl.style.display = hasPrivilege ? 'none' : 'flex'
  }
  
  // 加载机器码
  const result = await fetchMachineId()
  if (result.success && result.machineId) {
    setCurrentMachineId(result.machineId)
    updateCurrentMachineIdDisplay(result.machineId)
  } else {
    updateCurrentMachineIdDisplay(null, result.error)
  }
  
  // 加载原始机器码
  const originalMachineId = loadOriginalMachineId()
  if (originalMachineId) {
    updateOriginalMachineIdDisplay(originalMachineId)
  }
}

// 注册全局函数
;(window as any).copyMachineId = copyMachineId
;(window as any).refreshMachineId = refreshMachineId
;(window as any).generateRandomMachineId = generateAndApplyRandomMachineId

;(window as any).applyCustomMachineId = async () => {
  const input = document.getElementById('custom-machine-id-input') as HTMLInputElement
  if (!input) return
  
  const customMachineId = input.value.trim()
  await applyCustomMachineId(customMachineId)
  input.value = ''
}

;(window as any).restoreOriginalMachineId = restoreOriginalMachineId
;(window as any).requestAdminPrivilege = () => {
  window.UI?.toast.info('请以管理员身份重新启动应用')
}

;(window as any).openAccountBindingManager = openAccountBindingManager
;(window as any).copyBindingMachineId = async (machineId: string) => {
  try {
    await navigator.clipboard.writeText(machineId)
    window.UI?.toast.success('已复制到剪贴板')
  } catch (error) {
    window.UI?.toast.error('复制失败')
  }
}
;(window as any).generateBindingForAccount = generateBindingForAccount
;(window as any).removeAccountBinding = removeAccountBinding

;(window as any).openMachineIdHistory = openMachineIdHistory
;(window as any).copyHistoryMachineId = async (machineId: string) => {
  try {
    await navigator.clipboard.writeText(machineId)
    window.UI?.toast.success('已复制到剪贴板')
  } catch (error) {
    window.UI?.toast.error('复制失败')
  }
}
;(window as any).clearMachineIdHistory = clearMachineIdHistory

// 导出供其他模块使用
export { loadConfig as getMachineIdConfig } from './machine-id-storage'
export { getAccountBinding as getAccountMachineId } from './machine-id-storage'
export { setAccountBinding as setAccountMachineId } from './machine-id-storage'
export { applyMachineId as applyMachineIdForAccount }
