// 账号卡片渲染器
import type { Account } from '../types'
import { getSubscriptionColor, getStatusText } from '../utils/account-utils'

/**
 * 渲染账号卡片（网格视图）
 */
export function renderAccountCard(account: Account, isSelected: boolean): string {
  const subscriptionColor = getSubscriptionColor(account.subscription.type)
  const isHighUsage = account.usage.percentUsed > 0.8

  return `
    <div class="ui-card account-card ui-hover-lift" data-account-id="${account.id}">
      <!-- 头部区域 -->
      <div class="card-header">
        <div class="checkbox-wrapper">
          <div class="custom-checkbox ${isSelected ? 'checked' : ''}" data-action="toggle-select">
            ${isSelected ? '<svg fill="currentColor" viewBox="0 0 20 20" width="12" height="12"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>' : ''}
          </div>
        </div>
        <div class="header-content">
          <div class="email" title="${account.email}">${account.email}</div>
          <div class="meta-badges">
            <span class="badge ${subscriptionColor}">${account.subscription.title || account.subscription.type}</span>
            <span class="badge badge-secondary">${account.idp}</span>
            <div class="status-dot">${getStatusText(account.status)}</div>
          </div>
        </div>
      </div>

      <!-- 使用量区域 -->
      <div class="usage-box">
        <div class="usage-title-row">
          <span class="usage-label">本月用量</span>
          <span class="usage-percent ${isHighUsage ? 'warning' : ''}">${(account.usage.percentUsed * 100).toFixed(1)}%</span>
        </div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill ${isHighUsage ? 'warning' : ''}" style="width: ${account.usage.percentUsed * 100}%"></div>
        </div>
        <div class="usage-text">${account.usage.current.toLocaleString()} / ${account.usage.limit.toLocaleString()}</div>
      </div>

      ${account.nickname ? `
        <div class="nickname-tag">
          <svg viewBox="0 0 24 24" width="14" height="14">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" fill="none" stroke="currentColor" stroke-width="2"></path>
            <circle cx="12" cy="7" r="4" fill="none" stroke="currentColor" stroke-width="2"></circle>
          </svg>
          <span>${account.nickname}</span>
        </div>
      ` : ''}

      <!-- 操作按钮 -->
      <div class="actions-row">
        <button class="btn-icon" title="查看详情" data-action="detail">
          <svg viewBox="0 0 24 24" width="16" height="16">
            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"></circle>
            <line x1="12" y1="16" x2="12" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"></line>
            <circle cx="12" cy="8" r="0.5" fill="currentColor"></circle>
          </svg>
        </button>
        <button class="btn-icon" title="刷新" data-action="refresh">
          <svg viewBox="0 0 24 24" width="16" height="16">
            <polyline points="23 4 23 10 17 10" fill="none" stroke="currentColor" stroke-width="2"></polyline>
            <polyline points="1 20 1 14 7 14" fill="none" stroke="currentColor" stroke-width="2"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" fill="none" stroke="currentColor" stroke-width="2"></path>
          </svg>
        </button>
        <button class="btn-icon" title="复制凭证" data-action="copy">
          <svg viewBox="0 0 24 24" width="16" height="16">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" fill="none" stroke="currentColor" stroke-width="2"></path>
          </svg>
        </button>
        <button class="btn-icon" title="编辑" data-action="edit">
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" fill="none" stroke="currentColor" stroke-width="2"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" fill="none" stroke="currentColor" stroke-width="2"></path>
          </svg>
        </button>
        <button class="btn-icon delete" title="删除" data-action="delete">
          <svg viewBox="0 0 24 24" width="16" height="16">
            <polyline points="3 6 5 6 21 6" fill="none" stroke="currentColor" stroke-width="2"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" fill="none" stroke="currentColor" stroke-width="2"></path>
          </svg>
        </button>
      </div>
    </div>
  `
}

/**
 * 渲染账号列表项（列表视图）
 */
export function renderAccountListItem(account: Account, isSelected: boolean): string {
  const subscriptionColor = getSubscriptionColor(account.subscription.type)
  const isHighUsage = account.usage.percentUsed > 0.8

  return `
    <div class="account-list-item" data-account-id="${account.id}">
      <div class="list-item-left">
        <div class="custom-checkbox ${isSelected ? 'checked' : ''}" data-action="toggle-select">
          ${isSelected ? '<svg fill="currentColor" viewBox="0 0 20 20" width="12" height="12"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>' : ''}
        </div>
        <div class="list-item-info">
          <div class="list-item-email">${account.email}</div>
          <div class="list-item-nickname-row">
            ${account.nickname ? `<span class="list-item-nickname">${account.nickname}</span>` : ''}
            <div class="status-dot">${getStatusText(account.status)}</div>
          </div>
        </div>
      </div>
      <div class="list-item-center">
        <span class="badge ${subscriptionColor}">${account.subscription.title || account.subscription.type}</span>
        <span class="badge badge-secondary">${account.idp}</span>
      </div>
      <div class="list-item-usage">
        <div class="list-usage-text">
          <span class="list-usage-current">${account.usage.current.toLocaleString()}</span>
          <span class="list-usage-separator">/</span>
          <span class="list-usage-limit">${account.usage.limit.toLocaleString()}</span>
        </div>
        <div class="list-progress-bar">
          <div class="list-progress-fill ${isHighUsage ? 'warning' : ''}" style="width: ${account.usage.percentUsed * 100}%"></div>
        </div>
        <div class="list-usage-percent ${isHighUsage ? 'warning' : ''}">${(account.usage.percentUsed * 100).toFixed(1)}%</div>
      </div>
      <div class="list-item-actions">
        <button class="btn-icon" title="查看详情" data-action="detail">
          <svg viewBox="0 0 24 24" width="16" height="16">
            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"></circle>
            <line x1="12" y1="16" x2="12" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"></line>
            <circle cx="12" cy="8" r="0.5" fill="currentColor"></circle>
          </svg>
        </button>
        <button class="btn-icon" title="刷新" data-action="refresh">
          <svg viewBox="0 0 24 24" width="16" height="16">
            <polyline points="23 4 23 10 17 10" fill="none" stroke="currentColor" stroke-width="2"></polyline>
            <polyline points="1 20 1 14 7 14" fill="none" stroke="currentColor" stroke-width="2"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" fill="none" stroke="currentColor" stroke-width="2"></path>
          </svg>
        </button>
        <button class="btn-icon" title="复制凭证" data-action="copy">
          <svg viewBox="0 0 24 24" width="16" height="16">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" fill="none" stroke="currentColor" stroke-width="2"></path>
          </svg>
        </button>
        <button class="btn-icon" title="编辑" data-action="edit">
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" fill="none" stroke="currentColor" stroke-width="2"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" fill="none" stroke="currentColor" stroke-width="2"></path>
          </svg>
        </button>
        <button class="btn-icon delete" title="删除" data-action="delete">
          <svg viewBox="0 0 24 24" width="16" height="16">
            <polyline points="3 6 5 6 21 6" fill="none" stroke="currentColor" stroke-width="2"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" fill="none" stroke="currentColor" stroke-width="2"></path>
          </svg>
        </button>
      </div>
    </div>
  `
}
