import type { Account } from '../types'
import { accountStore } from '../store'
import { renderAccountCard, renderAccountListItem } from './account-card'
import { renderFilterPanel } from './filter-panel'

export function renderAccountsView(
  selectedIds: Set<string>,
  isFilterExpanded: boolean,
  viewMode: 'grid' | 'list'
): string {
  const filteredAccounts = accountStore.getFilteredAccounts()
  const filter = accountStore.getFilter()

  return `
    <div class="content-body">
      <div class="toolbar-container">
        <div class="toolbar">
          <div class="search-box">
            <div class="ui-form-group">
              <div class="ui-input-group">
                <div class="ui-input-icon">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input type="text" class="ui-input" placeholder="搜索账号（邮箱/昵称/ID）..." id="search-input" value="${filter.search || ''}">
                ${filter.search ? `
                  <button class="search-clear-btn" id="search-clear-btn" title="清空搜索">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                ` : ''}
              </div>
            </div>
          </div>
          <div class="toolbar-actions">
            <button class="ui-btn ui-btn-secondary ${isFilterExpanded ? 'active' : ''}" id="filter-toggle-btn" title="展开/收起筛选">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16" style="margin-right: 0.25rem">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              筛选
            </button>
            <button class="ui-btn ui-btn-primary" id="add-account-btn">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16" style="margin-right: 0.25rem">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              添加账号
            </button>
            <button class="ui-btn ui-btn-secondary" id="export-btn">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16" style="margin-right: 0.25rem">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              导出
            </button>
          </div>
        </div>

        <div class="toolbar-secondary">
          <div class="select-all-wrapper">
            <div class="custom-checkbox ${selectedIds.size > 0 && selectedIds.size === accountStore.getFilteredAccounts().length ? 'checked' : ''}" id="select-all-checkbox" title="${selectedIds.size > 0 && selectedIds.size === accountStore.getFilteredAccounts().length ? '取消全选' : '全选'}">
              ${selectedIds.size > 0 && selectedIds.size === accountStore.getFilteredAccounts().length ? '<svg fill="currentColor" viewBox="0 0 20 20" width="12" height="12"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>' : ''}
            </div>
            ${selectedIds.size > 0 ? `
              <span class="selection-text">已选中 ${selectedIds.size} 个</span>
            ` : ''}
          </div>
          <div class="toolbar-batch-actions">
            <button class="ui-btn ui-btn-sm ui-btn-secondary" id="batch-check-btn" title="检查账号状态" ${selectedIds.size === 0 ? 'disabled' : ''}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14" style="margin-right: 0.25rem">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              检查
            </button>
            <button class="ui-btn ui-btn-sm ui-btn-secondary" id="batch-refresh-btn" title="刷新账号信息" ${selectedIds.size === 0 ? 'disabled' : ''}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14" style="margin-right: 0.25rem">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              刷新
            </button>
            <button class="ui-btn ui-btn-sm ui-btn-danger" id="batch-delete-btn" title="删除选中账号" ${selectedIds.size === 0 ? 'disabled' : ''}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14" style="margin-right: 0.25rem">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              删除
            </button>
          </div>
          <div class="view-mode-switch">
            <button class="view-mode-btn ${viewMode === 'grid' ? 'active' : ''}" id="view-grid-btn" title="卡片视图">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button class="view-mode-btn ${viewMode === 'list' ? 'active' : ''}" id="view-list-btn" title="列表视图">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      ${isFilterExpanded ? renderFilterPanel() : ''}

      ${filteredAccounts.length > 0 ? `
        <div class="${viewMode === 'grid' ? 'account-grid' : 'account-list'}" id="account-grid">
          ${filteredAccounts.map(account => viewMode === 'grid' ? renderAccountCard(account, selectedIds.has(account.id)) : renderAccountListItem(account, selectedIds.has(account.id))).join('')}
        </div>
      ` : `
        <div class="empty-state">
          <svg class="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${filter.search || Object.keys(filter).length > 1 ? 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' : 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'}" />
          </svg>
          <h3 class="empty-title">${filter.search || Object.keys(filter).length > 1 ? '未找到匹配的账号' : '暂无账号'}</h3>
          <p class="empty-text">${filter.search || Object.keys(filter).length > 1 ? '尝试调整筛选条件' : '点击下方按钮添加第一个账号'}</p>
          ${!filter.search && Object.keys(filter).length <= 1 ? '<button class="ui-btn ui-btn-primary" id="add-first-account-btn">添加账号</button>' : ''}
        </div>
      `}
    </div>
  `
}
