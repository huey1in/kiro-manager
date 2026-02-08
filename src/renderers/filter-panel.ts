// 筛选面板渲染器
import { accountStore } from '../store'

interface FilterOptions {
  subscriptionTypes?: string[]
  statuses?: string[]
  idps?: string[]
  usageMin?: number
  usageMax?: number
  daysRemainingMin?: number
  daysRemainingMax?: number
  search?: string
}

/**
 * 渲染筛选面板
 */
export function renderFilterPanel(): string {
  const filter = accountStore.getFilter() as FilterOptions
  const stats = accountStore.getStats()

  const subscriptionOptions = [
    { value: 'Free', label: 'KIRO FREE', count: stats.bySubscription.Free },
    { value: 'Pro', label: 'KIRO PRO', count: stats.bySubscription.Pro },
    { value: 'Pro_Plus', label: 'KIRO PRO+', count: stats.bySubscription.Pro_Plus },
    { value: 'Enterprise', label: 'KIRO POWER', count: stats.bySubscription.Enterprise }
  ]

  const statusOptions = [
    { value: 'active', label: '正常', count: stats.byStatus.active },
    { value: 'expired', label: '已过期', count: stats.byStatus.expired },
    { value: 'error', label: '错误', count: stats.byStatus.error },
    { value: 'unknown', label: '未知', count: stats.byStatus.unknown }
  ]

  const idpOptions = [
    { value: 'BuilderId', label: 'BuilderId', count: stats.byIdp.BuilderId || 0 },
    { value: 'Enterprise', label: 'Enterprise', count: stats.byIdp.Enterprise || 0 },
    { value: 'Google', label: 'Google', count: stats.byIdp.Google || 0 },
    { value: 'Github', label: 'GitHub', count: stats.byIdp.Github || 0 }
  ]

  return `
    <div class="filter-panel">
      <div class="filter-row">
        <div class="filter-group">
          <span class="filter-label">订阅:</span>
          <div class="filter-buttons">
            ${subscriptionOptions.map(opt => `
              <button class="filter-btn ${filter.subscriptionTypes?.includes(opt.value) ? 'active' : ''}"
                      data-filter-type="subscription"
                      data-filter-value="${opt.value}">
                ${opt.label}(${opt.count})
              </button>
            `).join('')}
          </div>
        </div>

        <div class="filter-group">
          <span class="filter-label">状态:</span>
          <div class="filter-buttons">
            ${statusOptions.map(opt => `
              <button class="filter-btn ${filter.statuses?.includes(opt.value) ? 'active' : ''}"
                      data-filter-type="status"
                      data-filter-value="${opt.value}">
                ${opt.label}(${opt.count})
              </button>
            `).join('')}
          </div>
        </div>

        <div class="filter-group">
          <span class="filter-label">IDP:</span>
          <div class="filter-buttons">
            ${idpOptions.map(opt => `
              <button class="filter-btn ${filter.idps?.includes(opt.value) ? 'active' : ''}"
                      data-filter-type="idp"
                      data-filter-value="${opt.value}">
                ${opt.label}(${opt.count})
              </button>
            `).join('')}
          </div>
        </div>
      </div>

      <div class="filter-row">
        <div class="filter-group">
          <span class="filter-label">使用量:</span>
          <div class="filter-range">
            <input type="number" min="0" max="100" placeholder="最小" class="filter-input"
                   id="usage-min" value="${filter.usageMin !== undefined ? filter.usageMin * 100 : ''}">
            <span class="filter-separator">-</span>
            <input type="number" min="0" max="100" placeholder="最大" class="filter-input"
                   id="usage-max" value="${filter.usageMax !== undefined ? filter.usageMax * 100 : ''}">
            <span class="filter-unit">%</span>
          </div>
        </div>

        <div class="filter-group">
          <span class="filter-label">剩余:</span>
          <div class="filter-range">
            <input type="number" min="0" placeholder="最小" class="filter-input"
                   id="days-min" value="${filter.daysRemainingMin || ''}">
            <span class="filter-separator">-</span>
            <input type="number" min="0" placeholder="最大" class="filter-input"
                   id="days-max" value="${filter.daysRemainingMax || ''}">
            <span class="filter-unit">天</span>
          </div>
        </div>
      </div>
    </div>
  `
}
