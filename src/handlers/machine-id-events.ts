// 机器码管理页面事件处理器
import { accountStore } from '../store'

// 存储当前和原始机器码
let currentMachineId: string | null = null
let originalMachineId: string | null = null
let hasAdminPrivilege: boolean | null = null

// 机器码配置
interface MachineIdConfig {
  autoSwitchOnAccountChange: boolean // 切换账号时自动更换机器码
  bindMachineIdToAccount: boolean // 账户机器码绑定
  useBoundMachineId: boolean // 使用绑定的唯一机器码
}

// 历史记录条目
interface MachineIdHistoryEntry {
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
function loadConfig(): MachineIdConfig {
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
function saveConfig(config: MachineIdConfig) {
  localStorage.setItem('machine_id_config', JSON.stringify(config))
}

// 加载账户绑定
function loadAccountBindings() {
  const saved = localStorage.getItem('account_machine_id_bindings')
  if (saved) {
    accountMachineIdBindings = JSON.parse(saved)
  }
}

// 保存账户绑定
function saveAccountBindings() {
  localStorage.setItem('account_machine_id_bindings', JSON.stringify(accountMachineIdBindings))
}

// 加载历史记录
function loadHistory() {
  const saved = localStorage.getItem('machine_id_history')
  if (saved) {
    machineIdHistory = JSON.parse(saved)
  }
}

// 保存历史记录
function saveHistory() {
  localStorage.setItem('machine_id_history', JSON.stringify(machineIdHistory))
}

// 添加历史记录
function addHistoryEntry(machineId: string, action: 'manual' | 'auto_switch' | 'restore' | 'bind', accountId?: string) {
  // 先加载最新的历史记录，确保不会覆盖其他地方添加的记录
  loadHistory()
  
  const entry: MachineIdHistoryEntry = {
    id: crypto.randomUUID(),
    machineId,
    timestamp: Date.now(),
    action,
    accountId
  }
  machineIdHistory.push(entry)
  saveHistory()
  
  // 更新历史描述
  updateHistoryDescription()
}

// 更新历史描述
function updateHistoryDescription() {
  const historyDesc = document.getElementById('history-desc')
  if (historyDesc) {
    const count = machineIdHistory.length
    historyDesc.textContent = count > 0 ? `查看机器码的变更历史（共 ${count} 条记录）` : '查看机器码的变更历史'
  }
}

// 更新账户绑定描述
function updateAccountBindingDescription() {
  const bindingDesc = document.getElementById('account-binding-desc')
  if (bindingDesc) {
    const count = Object.keys(accountMachineIdBindings).length
    bindingDesc.textContent = count > 0 ? `查看和管理每个账户绑定的机器码（已绑定 ${count} 个账户）` : '查看和管理每个账户绑定的机器码'
  }
}

// 初始化机器码页面
export async function initMachineIdPage() {
  // 加载历史记录和绑定
  loadHistory()
  loadAccountBindings()
  
  // 更新描述
  updateHistoryDescription()
  updateAccountBindingDescription()
  
  // 检查管理员权限
  await checkAdminPrivilege()
  
  // 加载机器码
  await loadMachineIds()
}

// 检查管理员权限
async function checkAdminPrivilege() {
  try {
    hasAdminPrivilege = await (window as any).__TAURI__.core.invoke('check_admin_privilege')
    
    const warningEl = document.getElementById('admin-warning')
    if (warningEl) {
      warningEl.style.display = hasAdminPrivilege ? 'none' : 'flex'
    }
  } catch (error) {
    hasAdminPrivilege = false
  }
}

// 加载机器码
async function loadMachineIds() {
  try {
    // 获取当前机器码
    const result = await (window as any).__TAURI__.core.invoke('get_current_machine_id')
    
    if (result.success && result.machine_id) {
      currentMachineId = result.machine_id
      updateCurrentMachineIdDisplay(currentMachineId)
    } else {
      updateCurrentMachineIdDisplay(null, result.error)
    }
    
    // 从本地存储加载原始机器码
    loadOriginalMachineId()
  } catch (error) {
    updateCurrentMachineIdDisplay(null, '加载失败')
  }
}

// 更新当前机器码显示
function updateCurrentMachineIdDisplay(machineId: string | null, error?: string) {
  const displayEl = document.getElementById('current-machine-id-display')
  if (!displayEl) return
  
  if (machineId) {
    displayEl.innerHTML = `<span style="font-family: 'Consolas', 'Monaco', monospace; color: var(--text-main);">${machineId}</span>`
  } else {
    displayEl.innerHTML = `<span style="color: var(--danger);">${error || '无法获取'}</span>`
  }
}

// 加载原始机器码
function loadOriginalMachineId() {
  try {
    const stored = localStorage.getItem('original_machine_id')
    if (stored) {
      originalMachineId = stored
      updateOriginalMachineIdDisplay(originalMachineId)
    }
  } catch (error) {
    // 静默失败
  }
}

// 保存原始机器码
function saveOriginalMachineId(machineId: string) {
  try {
    localStorage.setItem('original_machine_id', machineId)
    originalMachineId = machineId
  } catch (error) {
    // 静默失败
  }
}

// 更新原始机器码显示
function updateOriginalMachineIdDisplay(machineId: string | null) {
  const displayEl = document.getElementById('original-machine-id-display')
  const actionsEl = document.getElementById('original-actions')
  
  if (!displayEl) return
  
  if (machineId) {
    displayEl.innerHTML = `<span style="font-family: 'Consolas', 'Monaco', monospace; color: var(--text-main);">${machineId}</span>`
    if (actionsEl) actionsEl.style.display = 'flex'
    
    // 更新恢复按钮状态
    updateRestoreButtonState()
  } else {
    displayEl.innerHTML = '<span style="color: var(--text-muted);">每次更新机器码时会自动备份当前值</span>'
    if (actionsEl) actionsEl.style.display = 'none'
  }
}

// 更新恢复按钮状态
function updateRestoreButtonState() {
  const restoreBtn = document.getElementById('restore-btn') as HTMLButtonElement
  if (!restoreBtn) return
  
  // 如果当前机器码等于原始机器码，禁用恢复按钮
  if (currentMachineId === originalMachineId) {
    restoreBtn.disabled = true
    restoreBtn.style.opacity = '0.5'
    restoreBtn.style.cursor = 'not-allowed'
  } else {
    restoreBtn.disabled = false
    restoreBtn.style.opacity = '1'
    restoreBtn.style.cursor = 'pointer'
  }
}

// 复制机器码
;(window as any).copyMachineId = async (type: 'current' | 'original') => {
  const machineId = type === 'current' ? currentMachineId : originalMachineId
  if (!machineId) {
    window.UI?.toast.warning('没有可复制的机器码')
    return
  }
  
  try {
    await navigator.clipboard.writeText(machineId)
    window.UI?.toast.success('已复制到剪贴板')
  } catch (error) {
    window.UI?.toast.error('复制失败')
  }
}

// 刷新机器码
;(window as any).refreshMachineId = async () => {
  await loadMachineIds()
  window.UI?.toast.success('已刷新')
}

// 随机生成机器码
;(window as any).generateRandomMachineId = async () => {
  if (!hasAdminPrivilege) {
    window.UI?.toast.error('需要管理员权限')
    return
  }
  
  try {
    // 保存当前机器码作为备份（如果存在）
    if (currentMachineId) {
      saveOriginalMachineId(currentMachineId)
      updateOriginalMachineIdDisplay(currentMachineId)
    }
    
    // 生成随机机器码
    const newMachineId = await (window as any).__TAURI__.core.invoke('generate_random_machine_id')
    
    // 应用新机器码
    const result = await (window as any).__TAURI__.core.invoke('set_machine_id', {
      newMachineId: newMachineId
    })
    
    if (result.success) {
      currentMachineId = newMachineId
      updateCurrentMachineIdDisplay(newMachineId)
      updateRestoreButtonState()
      
      // 添加历史记录
      addHistoryEntry(newMachineId, 'manual')
      
      window.UI?.toast.success('机器码已更新')
    } else {
      window.UI?.toast.error(result.error || '设置失败')
    }
  } catch (error) {
    window.UI?.toast.error('操作失败')
  }
}

// 应用自定义机器码
;(window as any).applyCustomMachineId = async () => {
  if (!hasAdminPrivilege) {
    window.UI?.toast.error('需要管理员权限')
    return
  }
  
  const input = document.getElementById('custom-machine-id-input') as HTMLInputElement
  if (!input) return
  
  const customMachineId = input.value.trim()
  if (!customMachineId) {
    window.UI?.toast.warning('请输入机器码')
    return
  }
  
  // 验证长度
  if (customMachineId.length > 100) {
    window.UI?.toast.error('机器码长度超出限制')
    return
  }
  
  // 验证格式
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidPattern.test(customMachineId)) {
    window.UI?.toast.error('无效的 UUID 格式')
    return
  }
  
  // 检查是否与当前机器码相同
  if (customMachineId.toLowerCase() === currentMachineId) {
    window.UI?.toast.info('机器码未改变')
    return
  }
  
  try {
    // 保存当前机器码作为备份（如果存在）
    if (currentMachineId) {
      saveOriginalMachineId(currentMachineId)
      updateOriginalMachineIdDisplay(currentMachineId)
    }
    
    // 应用自定义机器码
    const result = await (window as any).__TAURI__.core.invoke('set_machine_id', {
      newMachineId: customMachineId.toLowerCase()
    })
    
    if (result.success) {
      currentMachineId = customMachineId.toLowerCase()
      updateCurrentMachineIdDisplay(currentMachineId)
      updateRestoreButtonState()
      input.value = ''
      
      // 添加历史记录
      addHistoryEntry(currentMachineId, 'manual')
      
      window.UI?.toast.success('机器码已更新')
    } else {
      window.UI?.toast.error(result.error || '设置失败')
    }
  } catch (error) {
    window.UI?.toast.error('操作失败')
  }
}

// 恢复原始机器码
;(window as any).restoreOriginalMachineId = async () => {
  if (!hasAdminPrivilege) {
    window.UI?.toast.error('需要管理员权限')
    return
  }
  
  if (!originalMachineId) {
    window.UI?.toast.warning('没有备份的机器码')
    return
  }
  
  if (currentMachineId === originalMachineId) {
    window.UI?.toast.info('当前已是备份的机器码')
    return
  }
  
  try {
    // 保存当前机器码作为新的备份
    const previousMachineId = currentMachineId
    
    const result = await (window as any).__TAURI__.core.invoke('set_machine_id', {
      newMachineId: originalMachineId
    })
    
    if (result.success) {
      currentMachineId = originalMachineId
      updateCurrentMachineIdDisplay(currentMachineId)
      
      // 将之前的当前机器码保存为新的备份
      if (previousMachineId) {
        saveOriginalMachineId(previousMachineId)
        updateOriginalMachineIdDisplay(previousMachineId)
      }
      
      updateRestoreButtonState()
      
      // 添加历史记录
      addHistoryEntry(currentMachineId, 'restore')
      
      window.UI?.toast.success('已恢复备份的机器码')
    } else {
      window.UI?.toast.error(result.error || '恢复失败')
    }
  } catch (error) {
    window.UI?.toast.error('操作失败')
  }
}

// 请求管理员权限
;(window as any).requestAdminPrivilege = async () => {
  window.UI?.toast.info('请以管理员身份重新启动应用')
}

// 打开账户绑定管理器
;(window as any).openAccountBindingManager = () => {
  const accounts = accountStore.getAccounts()
  loadAccountBindings()
  
  let html = `
    <div style="max-height: 300px; overflow-y: auto;">
      <div style="margin-bottom: 16px;">
        <input type="text" id="binding-search" class="ui-input" placeholder="搜索账户..." style="width: 100%;" />
      </div>
      <div id="binding-list">
  `
  
  accounts.forEach(account => {
    const boundMachineId = accountMachineIdBindings[account.id]
    const statusClass = account.status === 'suspended' ? 'text-danger' : ''
    
    html += `
      <div class="settings-item" style="margin-bottom: 12px;" data-account-email="${account.email.toLowerCase()}" data-account-id="${account.id}">
        <div class="settings-item-info">
          <div class="settings-item-label ${statusClass}">${account.email}</div>
          <div class="settings-item-desc" style="font-family: 'Consolas', 'Monaco', monospace; font-size: 11px;">
            ${boundMachineId || '未绑定'}
          </div>
        </div>
        <div style="display: flex; gap: 8px;">
          ${boundMachineId ? `
            <button class="ui-btn ui-btn-secondary ui-btn-sm" onclick="window.copyBindingMachineId('${boundMachineId}')">复制</button>
            <button class="ui-btn ui-btn-secondary ui-btn-sm" onclick="window.removeAccountBinding('${account.id}')">解绑</button>
          ` : `
            <button class="ui-btn ui-btn-primary ui-btn-sm" onclick="window.generateBindingForAccount('${account.id}')">生成绑定</button>
          `}
        </div>
      </div>
    `
  })
  
  html += `
      </div>
    </div>
  `
  
  const modal = window.UI?.modal.open({
    title: '账户机器码管理',
    html: html,
    size: 'lg',
    closable: true
  })
  
  // 添加搜索功能
  setTimeout(() => {
    const searchInput = document.getElementById('binding-search') as HTMLInputElement
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase()
        const items = document.querySelectorAll('#binding-list .settings-item')
        items.forEach(item => {
          const email = (item as HTMLElement).dataset.accountEmail || ''
          if (email.includes(query)) {
            (item as HTMLElement).style.display = 'flex'
          } else {
            (item as HTMLElement).style.display = 'none'
          }
        })
      })
    }
  }, 100)
}

// 复制绑定的机器码
;(window as any).copyBindingMachineId = async (machineId: string) => {
  try {
    await navigator.clipboard.writeText(machineId)
    window.UI?.toast.success('已复制到剪贴板')
  } catch (error) {
    window.UI?.toast.error('复制失败')
  }
}

// 为账户生成绑定
;(window as any).generateBindingForAccount = async (accountId: string) => {
  try {
    const newMachineId = await (window as any).__TAURI__.core.invoke('generate_random_machine_id')
    accountMachineIdBindings[accountId] = newMachineId
    saveAccountBindings()
    updateAccountBindingDescription()
    
    // 添加历史记录
    addHistoryEntry(newMachineId, 'bind', accountId)
    
    window.UI?.toast.success('已生成绑定')
    
    // 只更新当前账户项
    const accountItem = document.querySelector(`[data-account-id="${accountId}"]`)
    if (accountItem) {
      const descEl = accountItem.querySelector('.settings-item-desc')
      const actionsEl = accountItem.querySelector('.settings-item-info + div')
      
      if (descEl) {
        descEl.innerHTML = `<span style="font-family: 'Consolas', 'Monaco', monospace; font-size: 11px;">${newMachineId}</span>`
      }
      
      if (actionsEl) {
        actionsEl.innerHTML = `
          <button class="ui-btn ui-btn-secondary ui-btn-sm" onclick="window.copyBindingMachineId('${newMachineId}')">复制</button>
          <button class="ui-btn ui-btn-secondary ui-btn-sm" onclick="window.removeAccountBinding('${accountId}')">解绑</button>
        `
      }
    }
  } catch (error) {
    window.UI?.toast.error('生成失败')
  }
}

// 移除账户绑定
;(window as any).removeAccountBinding = (accountId: string) => {
  if (confirm('确定要解除此账户的机器码绑定吗？')) {
    delete accountMachineIdBindings[accountId]
    saveAccountBindings()
    updateAccountBindingDescription()
    window.UI?.toast.success('已解除绑定')
    
    // 只更新当前账户项
    const accountItem = document.querySelector(`[data-account-id="${accountId}"]`)
    if (accountItem) {
      const descEl = accountItem.querySelector('.settings-item-desc')
      const actionsEl = accountItem.querySelector('.settings-item-info + div')
      
      if (descEl) {
        descEl.textContent = '未绑定'
      }
      
      if (actionsEl) {
        actionsEl.innerHTML = `
          <button class="ui-btn ui-btn-primary ui-btn-sm" onclick="window.generateBindingForAccount('${accountId}')">生成绑定</button>
        `
      }
    }
  }
}

// 打开历史记录
;(window as any).openMachineIdHistory = () => {
  loadHistory()
  const accounts = accountStore.getAccounts()
  
  let html = `
    <div style="max-height: 300px; overflow-y: auto;">
  `
  
  if (machineIdHistory.length === 0) {
    html += `
      <div style="text-align: center; padding: 40px; color: var(--text-muted);">
        <p>暂无变更记录</p>
      </div>
    `
  } else {
    // 倒序显示（最新的在前）
    const reversedHistory = [...machineIdHistory].reverse()
    
    reversedHistory.forEach((entry, index) => {
      const account = entry.accountId ? accounts.find(a => a.id === entry.accountId) : null
      const actionText = {
        'manual': '手动修改',
        'auto_switch': '自动切换',
        'restore': '恢复备份',
        'bind': '绑定账户'
      }[entry.action]
      
      const date = new Date(entry.timestamp)
      const timeStr = date.toLocaleString('zh-CN')
      
      html += `
        <div class="settings-item" style="margin-bottom: 12px;">
          <div class="settings-item-info">
            <div class="settings-item-label">#${machineIdHistory.length - index} - ${actionText}</div>
            <div class="settings-item-desc" style="font-family: 'Consolas', 'Monaco', monospace; font-size: 11px;">
              ${entry.machineId}
            </div>
            <div class="settings-item-desc" style="font-size: 11px; margin-top: 4px;">
              ${timeStr}${account ? ` - ${account.email}` : ''}
            </div>
          </div>
          <button class="ui-btn ui-btn-secondary ui-btn-sm" onclick="window.copyHistoryMachineId('${entry.machineId}')">复制</button>
        </div>
      `
    })
  }
  
  html += `
    </div>
    ${machineIdHistory.length > 0 ? `
      <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-color); text-align: right;">
        <button class="ui-btn ui-btn-danger ui-btn-sm" onclick="window.clearMachineIdHistory()">清空历史</button>
      </div>
    ` : ''}
  `
  
  window.UI?.modal.open({
    title: '变更历史记录',
    html: html,
    size: 'lg',
    closable: true
  })
}

// 复制历史记录中的机器码
;(window as any).copyHistoryMachineId = async (machineId: string) => {
  try {
    await navigator.clipboard.writeText(machineId)
    window.UI?.toast.success('已复制到剪贴板')
  } catch (error) {
    window.UI?.toast.error('复制失败')
  }
}

// 清空历史记录
;(window as any).clearMachineIdHistory = () => {
  if (confirm('确定要清空所有历史记录吗？此操作不可恢复。')) {
    machineIdHistory = []
    saveHistory()
    updateHistoryDescription()
    window.UI?.toast.success('已清空历史记录')
    window.UI?.modal.closeAll()
  }
}

// 导出配置和绑定供其他模块使用
export function getMachineIdConfig(): MachineIdConfig {
  return loadConfig()
}

export function getAccountMachineId(accountId: string): string | undefined {
  loadAccountBindings()
  return accountMachineIdBindings[accountId]
}

export function setAccountMachineId(accountId: string, machineId: string) {
  loadAccountBindings()
  accountMachineIdBindings[accountId] = machineId
  saveAccountBindings()
}

export async function applyMachineIdForAccount(accountId: string): Promise<boolean> {
  if (!hasAdminPrivilege) {
    return false
  }
  
  const config = loadConfig()
  
  if (!config.autoSwitchOnAccountChange) {
    return false
  }
  
  try {
    // 保存当前机器码作为备份（如果存在）
    if (currentMachineId) {
      saveOriginalMachineId(currentMachineId)
    }
    
    let machineIdToApply: string
    
    if (config.bindMachineIdToAccount && config.useBoundMachineId) {
      // 使用绑定的机器码
      loadAccountBindings()
      let boundMachineId = accountMachineIdBindings[accountId]
      
      if (!boundMachineId) {
        // 如果没有绑定，生成一个新的
        boundMachineId = await (window as any).__TAURI__.core.invoke('generate_random_machine_id')
        accountMachineIdBindings[accountId] = boundMachineId
        saveAccountBindings()
        
        // 添加绑定历史记录
        addHistoryEntry(boundMachineId, 'bind', accountId)
      }
      
      machineIdToApply = boundMachineId
    } else {
      // 随机生成新机器码
      machineIdToApply = await (window as any).__TAURI__.core.invoke('generate_random_machine_id')
    }
    
    // 检查是否与当前机器码相同
    if (machineIdToApply === currentMachineId) {
      return true
    }
    
    // 应用机器码
    const result = await (window as any).__TAURI__.core.invoke('set_machine_id', {
      newMachineId: machineIdToApply
    })
    
    if (result.success) {
      currentMachineId = machineIdToApply
      
      // 添加自动切换历史记录
      addHistoryEntry(machineIdToApply, 'auto_switch', accountId)
      
      return true
    } else {
      return false
    }
  } catch (error) {
    return false
  }
}
