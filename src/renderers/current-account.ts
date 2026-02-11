import type { Account } from '../types'
import { accountStore } from '../store'

export function renderCurrentAccount(container: Element, account?: Account | null) {
  const card = container.querySelector('#current-account-card')
  if (!card) return

  if (account === undefined) {
    // 初始加载状态
    card.innerHTML = '<div class="current-account-loading">加载中...</div>'
    return
  }

  if (!account) {
    // 未找到当前账号
    card.innerHTML = `
      <div class="current-account-empty">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <div class="current-account-empty-text">未登录</div>
      </div>
    `
    return
  }

  // 显示当前账号信息
  const settings = accountStore.getSettings()
  const displayEmail = accountStore.maskEmail(account.email)
  const isHighUsage = account.usage.percentUsed > 0.8
  
  // 格式化使用量
  const formatUsage = (value: number): string => {
    if (settings.usagePrecision) {
      return value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
    }
    return Math.floor(value).toLocaleString()
  }
  
  card.innerHTML = `
    <div class="current-account-header">
      <div class="current-account-label">当前账号</div>
      <span class="current-account-badge">${account.subscription.title || account.subscription.type}</span>
    </div>
    <div class="current-account-email" title="${displayEmail}">${displayEmail}</div>
    <div class="current-account-usage">
      <div class="current-account-usage-text">
        <span>${formatUsage(account.usage.current)}</span>
        <span class="current-account-usage-limit">/ ${formatUsage(account.usage.limit)}</span>
      </div>
      <div class="current-account-progress">
        <div class="current-account-progress-bar ${isHighUsage ? 'warning' : ''}" style="width: ${account.usage.percentUsed * 100}%"></div>
      </div>
    </div>
    <button class="current-account-logout-btn" id="current-account-logout-btn" title="退出登录">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
        <polyline points="16 17 21 12 16 7"></polyline>
        <line x1="21" y1="12" x2="9" y2="12"></line>
      </svg>
      <span>退出登录</span>
    </button>
  `
  
  // 添加退出登录按钮事件
  const logoutBtn = card.querySelector('#current-account-logout-btn')
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      const { logoutAccount } = await import('../actions/account-actions')
      await logoutAccount()
      // 退出后重新渲染为空状态
      renderCurrentAccount(container, null)
    })
  }
}
