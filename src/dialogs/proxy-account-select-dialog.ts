// 反代账号选择对话框
import type { Account } from '../types'
import { accountStore } from '../store'

/**
 * 格式化用量信息
 */
function formatUsage(account: Account): { text: string; percentage: number } {
  if (!account.usage) return { text: '无用量信息', percentage: 0 }
  
  const used = account.usage.current || 0
  const total = account.usage.limit || 0
  const percentage = total > 0 ? (used / total) * 100 : 0
  
  return {
    text: `${used.toFixed(2)} / ${total.toFixed(2)}`,
    percentage
  }
}

/**
 * 格式化订阅类型
 */
function formatSubscription(account: Account): string {
  if (!account.subscription) return 'Free'
  
  const rawType = account.subscription.rawType || account.subscription.type || 'Free'
  
  // 处理原始订阅类型字符串
  if (rawType.includes('FREE')) return 'Free'
  if (rawType.includes('PRO_PLUS') || rawType.includes('POWER')) return 'Pro+'
  if (rawType.includes('PRO')) return 'Pro'
  if (rawType.includes('ENTERPRISE')) return 'Power'
  if (rawType.includes('TEAM')) return 'Teams'
  
  // 如果是已经转换过的类型
  const typeMap: Record<string, string> = {
    'Free': 'Free',
    'Pro': 'Pro',
    'Pro_Plus': 'Pro+',
    'Enterprise': 'Power',
    'Teams': 'Teams'
  }
  
  return typeMap[rawType] || 'Free'
}

/**
 * 获取订阅类型颜色
 */
function getSubscriptionColor(account: Account): string {
  const displayType = formatSubscription(account)
  const colorMap: Record<string, string> = {
    'Free': '#94a3b8',
    'Pro': '#3b82f6',
    'Pro+': '#8b5cf6',
    'Power': '#f59e0b',
    'Teams': '#10b981'
  }
  return colorMap[displayType] || '#94a3b8'
}

/**
 * 获取用量百分比颜色
 */
function getUsageColor(percentage: number): string {
  if (percentage >= 90) return '#ef4444'
  if (percentage >= 70) return '#f59e0b'
  if (percentage >= 50) return '#3b82f6'
  return '#10b981'
}

/**
 * 获取状态颜色
 */
function getStatusColor(account: Account): string {
  if (account.status === 'active') return 'var(--success-color)'
  if (account.status === 'expired') return 'var(--error-color)'
  return 'var(--text-muted)'
}

/**
 * 获取状态文本
 */
function getStatusText(account: Account): string {
  const statusMap: Record<string, string> = {
    'active': '正常',
    'expired': '已过期',
    'error': '错误'
  }
  return statusMap[account.status] || account.status
}

/**
 * 显示账号选择对话框
 */
export function showProxyAccountSelectDialog(
  selectedIds: string[],
  onConfirm?: (selectedIds: string[]) => void
): void {
  const accounts = accountStore.getAccounts().filter(acc => acc.status === 'active')
  const tempSelected = new Set(selectedIds)

  const modal = window.UI?.modal.open({
    title: '选择反代账号',
    html: `
      <div class="modal-form">
        <div class="form-section">
          <div class="form-hint" style="margin-bottom: 16px;">
            选择要用于反代服务的账号。未选择任何账号时，将使用所有可用账号。
          </div>
          
          <div style="margin-bottom: 12px; display: flex; gap: 8px; align-items: center;">
            <button class="ui-btn ui-btn-secondary ui-btn-sm" onclick="window.selectAllProxyAccounts()">全选</button>
            <button class="ui-btn ui-btn-secondary ui-btn-sm" onclick="window.deselectAllProxyAccounts()">取消全选</button>
            <span style="margin-left: auto; font-size: 13px; color: var(--text-muted);">
              已选择 <span id="selected-count">${tempSelected.size}</span> / ${accounts.length} 个账号
            </span>
          </div>

          <div id="proxy-account-list" style="max-height: 500px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 6px;">
            ${accounts.length === 0 ? `
              <div style="padding: 40px; text-align: center; color: var(--text-muted);">
                暂无可用账号
              </div>
            ` : accounts.map(acc => {
              const usage = formatUsage(acc)
              return `
              <label class="proxy-account-item" style="display: flex; align-items: flex-start; padding: 16px; border-bottom: 1px solid var(--border-color); cursor: pointer; transition: background 0.2s;">
                <input 
                  type="checkbox" 
                  class="proxy-account-checkbox" 
                  data-account-id="${acc.id}"
                  ${tempSelected.has(acc.id) ? 'checked' : ''}
                  style="margin-right: 12px; margin-top: 4px; width: 16px; height: 16px; cursor: pointer; flex-shrink: 0;"
                />
                <div style="flex: 1; min-width: 0;">
                  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
                    <div style="font-weight: 600; color: var(--text-main); font-size: 14px; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                      ${acc.email || acc.id}
                    </div>
                    <span style="padding: 3px 10px; background: ${getSubscriptionColor(acc)}; color: white; border-radius: 4px; font-size: 11px; font-weight: 600; flex-shrink: 0;">
                      ${formatSubscription(acc)}
                    </span>
                    <span style="padding: 3px 8px; background: ${getStatusColor(acc)}; color: white; border-radius: 4px; font-size: 11px; font-weight: 500; flex-shrink: 0;">
                      ${getStatusText(acc)}
                    </span>
                  </div>
                  
                  <div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                      <span style="font-size: 12px; color: var(--text-muted);">用量</span>
                      <span style="font-size: 12px; font-weight: 600; color: ${getUsageColor(usage.percentage)};">
                        ${usage.text} (${usage.percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div style="width: 100%; height: 6px; background: var(--slate-100); border-radius: 3px; overflow: hidden;">
                      <div style="width: ${Math.min(usage.percentage, 100)}%; height: 100%; background: ${getUsageColor(usage.percentage)}; transition: width 0.3s;"></div>
                    </div>
                  </div>
                </div>
              </label>
              `
            }).join('')}
          </div>
        </div>
      </div>
    `,
    footer: `
      <button class="ui-btn ui-btn-secondary" onclick="window.closeProxyAccountSelectDialog()">取消</button>
      <button class="ui-btn ui-btn-primary" onclick="window.confirmProxyAccountSelect()">确定</button>
    `,
    size: 'lg',
    closable: true
  })

  // 更新选中计数
  function updateSelectedCount() {
    const countEl = document.getElementById('selected-count')
    if (countEl) {
      countEl.textContent = tempSelected.size.toString()
    }
  }

  // 全选
  window.selectAllProxyAccounts = () => {
    const checkboxes = document.querySelectorAll('.proxy-account-checkbox') as NodeListOf<HTMLInputElement>
    checkboxes.forEach(cb => {
      cb.checked = true
      const accountId = cb.getAttribute('data-account-id')
      if (accountId) tempSelected.add(accountId)
    })
    updateSelectedCount()
  }

  // 取消全选
  window.deselectAllProxyAccounts = () => {
    const checkboxes = document.querySelectorAll('.proxy-account-checkbox') as NodeListOf<HTMLInputElement>
    checkboxes.forEach(cb => {
      cb.checked = false
      const accountId = cb.getAttribute('data-account-id')
      if (accountId) tempSelected.delete(accountId)
    })
    updateSelectedCount()
  }

  // 监听复选框变化
  setTimeout(() => {
    const checkboxes = document.querySelectorAll('.proxy-account-checkbox') as NodeListOf<HTMLInputElement>
    checkboxes.forEach(cb => {
      cb.addEventListener('change', () => {
        const accountId = cb.getAttribute('data-account-id')
        if (accountId) {
          if (cb.checked) {
            tempSelected.add(accountId)
          } else {
            tempSelected.delete(accountId)
          }
          updateSelectedCount()
        }
      })
    })

    // 鼠标悬停效果
    const items = document.querySelectorAll('.proxy-account-item') as NodeListOf<HTMLElement>
    items.forEach(item => {
      item.addEventListener('mouseenter', () => {
        item.style.background = 'var(--slate-50)'
      })
      item.addEventListener('mouseleave', () => {
        item.style.background = 'transparent'
      })
    })
  }, 100)

  window.closeProxyAccountSelectDialog = () => {
    window.UI?.modal.close(modal)
    delete window.selectAllProxyAccounts
    delete window.deselectAllProxyAccounts
    delete window.closeProxyAccountSelectDialog
    delete window.confirmProxyAccountSelect
  }

  window.confirmProxyAccountSelect = () => {
    if (onConfirm) {
      onConfirm(Array.from(tempSelected))
    }
    window.UI?.modal.close(modal)
    delete window.selectAllProxyAccounts
    delete window.deselectAllProxyAccounts
    delete window.closeProxyAccountSelectDialog
    delete window.confirmProxyAccountSelect
  }
}
