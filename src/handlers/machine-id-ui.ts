// 机器码UI更新和事件处理模块
import { accountStore } from '../store'
import {
  loadHistory,
  loadAccountBindings,
  saveAccountBindings,
  removeAccountBinding as removeBinding,
  addHistoryEntry,
  clearHistory,
  getHistoryCount,
  getBindingCount,
  loadOriginalMachineId,
  saveOriginalMachineId
} from './machine-id-storage'
import {
  getCurrentMachineId,
  setCurrentMachineId,
  getAdminPrivilege,
  generateRandomMachineId,
  setMachineId,
  validateMachineId,
  fetchMachineId
} from './machine-id-operations'

// 更新当前机器码显示
export function updateCurrentMachineIdDisplay(machineId: string | null, error?: string): void {
  const displayEl = document.getElementById('current-machine-id-display')
  if (!displayEl) return
  
  if (machineId) {
    displayEl.innerHTML = `<span style="font-family: 'Consolas', 'Monaco', monospace; color: var(--text-main);">${machineId}</span>`
  } else {
    displayEl.innerHTML = `<span style="color: var(--danger);">${error || '无法获取'}</span>`
  }
}

// 更新原始机器码显示
export function updateOriginalMachineIdDisplay(machineId: string | null): void {
  const displayEl = document.getElementById('original-machine-id-display')
  const actionsEl = document.getElementById('original-actions')
  
  if (!displayEl) return
  
  if (machineId) {
    displayEl.innerHTML = `<span style="font-family: 'Consolas', 'Monaco', monospace; color: var(--text-main);">${machineId}</span>`
    if (actionsEl) actionsEl.style.display = 'flex'
    updateRestoreButtonState(machineId)
  } else {
    displayEl.innerHTML = '<span style="color: var(--text-muted);">每次更新机器码时会自动备份当前值</span>'
    if (actionsEl) actionsEl.style.display = 'none'
  }
}

// 更新恢复按钮状态
function updateRestoreButtonState(originalMachineId: string): void {
  const restoreBtn = document.getElementById('restore-btn') as HTMLButtonElement
  if (!restoreBtn) return
  
  const currentMachineId = getCurrentMachineId()
  
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

// 更新历史描述
export function updateHistoryDescription(): void {
  const historyDesc = document.getElementById('history-desc')
  if (historyDesc) {
    const count = getHistoryCount()
    historyDesc.textContent = count > 0 ? `查看机器码的变更历史（共 ${count} 条记录）` : '查看机器码的变更历史'
  }
}

// 更新账户绑定描述
export function updateAccountBindingDescription(): void {
  const bindingDesc = document.getElementById('account-binding-desc')
  if (bindingDesc) {
    const count = getBindingCount()
    bindingDesc.textContent = count > 0 ? `查看和管理每个账户绑定的机器码（已绑定 ${count} 个账户）` : '查看和管理每个账户绑定的机器码'
  }
}

// 复制机器码
export async function copyMachineId(type: 'current' | 'original'): Promise<void> {
  const machineId = type === 'current' ? getCurrentMachineId() : loadOriginalMachineId()
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
export async function refreshMachineId(): Promise<void> {
  const result = await fetchMachineId()
  
  if (result.success && result.machineId) {
    updateCurrentMachineIdDisplay(result.machineId)
  } else {
    updateCurrentMachineIdDisplay(null, result.error)
  }
  
  const originalMachineId = loadOriginalMachineId()
  if (originalMachineId) {
    updateOriginalMachineIdDisplay(originalMachineId)
  }
  
  window.UI?.toast.success('已刷新')
}

// 随机生成并应用机器码
export async function generateAndApplyRandomMachineId(): Promise<void> {
  if (!getAdminPrivilege()) {
    window.UI?.toast.error('需要管理员权限')
    return
  }
  
  try {
    const currentMachineId = getCurrentMachineId()
    
    // 保存当前机器码作为备份
    if (currentMachineId) {
      saveOriginalMachineId(currentMachineId)
      updateOriginalMachineIdDisplay(currentMachineId)
    }
    
    // 生成并应用
    const newMachineId = await generateRandomMachineId()
    const result = await setMachineId(newMachineId)
    
    if (result.success) {
      updateCurrentMachineIdDisplay(newMachineId)
      addHistoryEntry(newMachineId, 'manual')
      updateHistoryDescription()
      window.UI?.toast.success('机器码已更新')
    } else {
      window.UI?.toast.error(result.error || '设置失败')
    }
  } catch (error) {
    window.UI?.toast.error('操作失败')
  }
}

// 应用自定义机器码
export async function applyCustomMachineId(customMachineId: string): Promise<void> {
  if (!getAdminPrivilege()) {
    window.UI?.toast.error('需要管理员权限')
    return
  }
  
  const validation = validateMachineId(customMachineId)
  if (!validation.valid) {
    window.UI?.toast.error(validation.error || '无效的机器码')
    return
  }
  
  const currentMachineId = getCurrentMachineId()
  
  // 检查是否相同
  if (customMachineId.toLowerCase() === currentMachineId) {
    window.UI?.toast.info('机器码未改变')
    return
  }
  
  try {
    // 保存备份
    if (currentMachineId) {
      saveOriginalMachineId(currentMachineId)
      updateOriginalMachineIdDisplay(currentMachineId)
    }
    
    // 应用
    const result = await setMachineId(customMachineId.toLowerCase())
    
    if (result.success) {
      updateCurrentMachineIdDisplay(customMachineId.toLowerCase())
      addHistoryEntry(customMachineId.toLowerCase(), 'manual')
      updateHistoryDescription()
      window.UI?.toast.success('机器码已更新')
    } else {
      window.UI?.toast.error(result.error || '设置失败')
    }
  } catch (error) {
    window.UI?.toast.error('操作失败')
  }
}

// 恢复原始机器码
export async function restoreOriginalMachineId(): Promise<void> {
  if (!getAdminPrivilege()) {
    window.UI?.toast.error('需要管理员权限')
    return
  }
  
  const originalMachineId = loadOriginalMachineId()
  if (!originalMachineId) {
    window.UI?.toast.warning('没有备份的机器码')
    return
  }
  
  const currentMachineId = getCurrentMachineId()
  if (currentMachineId === originalMachineId) {
    window.UI?.toast.info('当前已是备份的机器码')
    return
  }
  
  try {
    const previousMachineId = currentMachineId
    const result = await setMachineId(originalMachineId)
    
    if (result.success) {
      updateCurrentMachineIdDisplay(originalMachineId)
      
      // 将之前的当前机器码保存为新的备份
      if (previousMachineId) {
        saveOriginalMachineId(previousMachineId)
        updateOriginalMachineIdDisplay(previousMachineId)
      }
      
      addHistoryEntry(originalMachineId, 'restore')
      updateHistoryDescription()
      window.UI?.toast.success('已恢复备份的机器码')
    } else {
      window.UI?.toast.error(result.error || '恢复失败')
    }
  } catch (error) {
    window.UI?.toast.error('操作失败')
  }
}

// 打开账户绑定管理器
export function openAccountBindingManager(): void {
  const accounts = accountStore.getAccounts()
  const bindings = loadAccountBindings()
  
  let html = `
    <div style="max-height: 300px; overflow-y: auto;">
      <div style="margin-bottom: 16px;">
        <input type="text" id="binding-search" class="ui-input" placeholder="搜索账户..." style="width: 100%;" />
      </div>
      <div id="binding-list">
  `
  
  accounts.forEach(account => {
    const boundMachineId = bindings[account.id]
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
  
  window.UI?.modal.open({
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

// 生成账户绑定
export async function generateBindingForAccount(accountId: string): Promise<void> {
  try {
    const newMachineId = await generateRandomMachineId()
    const bindings = loadAccountBindings()
    bindings[accountId] = newMachineId
    saveAccountBindings(bindings)
    updateAccountBindingDescription()
    
    addHistoryEntry(newMachineId, 'bind', accountId)
    updateHistoryDescription()
    
    window.UI?.toast.success('已生成绑定')
    
    // 更新UI
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
export function removeAccountBinding(accountId: string): void {
  removeBinding(accountId)
  updateAccountBindingDescription()
  window.UI?.toast.success('已解除绑定')
  
  // 更新UI
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

// 打开历史记录
export function openMachineIdHistory(): void {
  const history = loadHistory()
  const accounts = accountStore.getAccounts()
  
  let html = `
    <div style="max-height: 300px; overflow-y: auto;">
  `
  
  if (history.length === 0) {
    html += `
      <div style="text-align: center; padding: 40px; color: var(--text-muted);">
        <p>暂无变更记录</p>
      </div>
    `
  } else {
    const reversedHistory = [...history].reverse()
    
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
            <div class="settings-item-label">#${history.length - index} - ${actionText}</div>
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
    ${history.length > 0 ? `
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

// 清空历史记录
export function clearMachineIdHistory(): void {
  if (confirm('确定要清空所有历史记录吗？此操作不可恢复。')) {
    clearHistory()
    updateHistoryDescription()
    window.UI?.toast.success('已清空历史记录')
    window.UI?.modal.closeAll()
  }
}
