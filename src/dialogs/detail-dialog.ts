// 账号详情对话框
import type { Account } from '../types'

/**
 * 显示账号详情对话框
 */
export function showAccountDetailDialog(account: Account): void {
  const createdAt = new Date(account.createdAt).toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit'
  })
  const lastUsedAt = new Date(account.lastUsedAt).toLocaleString('zh-CN', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
  })
  const nextReset = account.usage.nextResetDate
    ? new Date(account.usage.nextResetDate).toLocaleDateString('zh-CN', {
        year: 'numeric', month: '2-digit', day: '2-digit'
      }).replace(/\//g, '/')
    : '未知'

  // 状态文本映射
  const statusTextMap = {
    active: '正常',
    expired: '已过期',
    error: '错误',
    refreshing: '刷新中',
    unknown: '未知',
    suspended: '已暂停'
  }

  const statusText = statusTextMap[account.status] || '未知'
  const isSuspended = account.status === 'suspended'

  window.UI?.modal.open({
    title: '',
    html: `
      <div class="account-detail-modal">
        <!-- 头部信息 -->
        <div class="detail-header">
          <div class="detail-email-row">
            <div class="detail-email">${account.email}</div>
            <div class="account-status-indicator">
              <span class="status-dot status-${account.status}"></span>
              <span class="status-text">${statusText}</span>
            </div>
          </div>
          <div class="detail-header-bottom">
            <span class="detail-badge">
              ${account.subscription.title || account.subscription.type}
            </span>
            <div class="detail-sync-time">
              上次同步: ${lastUsedAt}
            </div>
          </div>
        </div>

        <!-- 使用量卡片或封禁警告 -->
        ${isSuspended ? `
          <div class="detail-suspended-warning">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <div class="suspended-text">
              <div class="suspended-title">账号已封禁</div>
              <div class="suspended-desc">此账号已被暂停使用，无法访问服务</div>
            </div>
          </div>
        ` : `
          <div class="detail-usage-card">
            <div class="detail-usage-info">
              <div>
                <div class="detail-usage-label">月度已用配额</div>
                <div class="detail-usage-value">${account.usage.current.toLocaleString()}</div>
              </div>
              <div class="detail-usage-limit">
                <div class="detail-usage-label">总限额</div>
                <div class="detail-usage-limit-value">${account.usage.limit.toLocaleString()}</div>
              </div>
            </div>
            <div class="detail-progress-bg">
              <div class="detail-progress-fill" style="width: ${account.usage.percentUsed * 100}%"></div>
            </div>
          </div>
        `}

        <!-- 关键数据网格 -->
        <div class="detail-grid">
          ${account.subscription.daysRemaining ? `
            <div class="detail-grid-item">
              <span class="detail-grid-label">剩余试用</span>
              <span class="detail-grid-value detail-grid-value-danger">${account.subscription.daysRemaining} 天</span>
            </div>
          ` : ''}
          <div class="detail-grid-item">
            <span class="detail-grid-label">下次重置</span>
            <span class="detail-grid-value">${nextReset}</span>
          </div>
          <div class="detail-grid-item">
            <span class="detail-grid-label">服务区域</span>
            <span class="detail-grid-value">${account.credentials?.region || 'us-east-1'}</span>
          </div>
          <div class="detail-grid-item">
            <span class="detail-grid-label">登录方式</span>
            <span class="detail-grid-value">BuilderId</span>
          </div>
          <div class="detail-grid-item">
            <span class="detail-grid-label">创建日期</span>
            <span class="detail-grid-value">${createdAt}</span>
          </div>
          <div class="detail-grid-item">
            <span class="detail-grid-label">活跃时间</span>
            <span class="detail-grid-value">${lastUsedAt}</span>
          </div>
        </div>

        <!-- USER ID -->
        <div class="detail-user-id">
          <span class="detail-user-id-label">USER ID</span>
          <span class="detail-user-id-value">${account.userId}</span>
        </div>
      </div>
    `,
    footer: `
      <button class="ui-btn ui-btn-secondary ui-btn-sm" onclick="window.copyAccountJson()">复制数据</button>
      <button class="ui-btn ui-btn-primary ui-btn-sm" onclick="window.closeAccountDetailModal()">确定</button>
    `,
    size: 'default',
    closable: true
  })

  window.copyAccountJson = () => {
    navigator.clipboard.writeText(JSON.stringify(account, null, 2))
    window.UI?.toast.success('已复制到剪贴板')
  }

  window.closeAccountDetailModal = () => {
    window.UI?.modal.closeAll()
    delete window.closeAccountDetailModal
    delete window.copyAccountJson
  }
}
