import { accountStore } from '../store'
import { renderAccountCard, renderAccountListItem } from '../renderers/account-card'
import { showAddAccountDialog } from '../dialogs/add-account-dialog'

export function updateAccountList(
  container: HTMLElement,
  selectedIds: Set<string>,
  viewMode: 'grid' | 'list',
  onAttachAccountCardEvents: () => void
) {
  const filteredAccounts = accountStore.getFilteredAccounts()
  const filter = accountStore.getFilter()

  // 更新清空按钮的显示
  const searchInput = container.querySelector('#search-input') as HTMLInputElement
  const clearBtn = container.querySelector('#search-clear-btn')
  const inputGroup = searchInput?.parentElement

  if (filter.search && !clearBtn && inputGroup) {
    // 添加清空按钮
    const btn = document.createElement('button')
    btn.className = 'search-clear-btn'
    btn.id = 'search-clear-btn'
    btn.title = '清空搜索'
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    `
    btn.addEventListener('click', () => {
      const filter = accountStore.getFilter()
      filter.search = undefined
      if (searchInput) searchInput.value = ''
      updateAccountList(container, selectedIds, viewMode, onAttachAccountCardEvents)
      searchInput?.focus()
    })
    inputGroup.appendChild(btn)
  } else if (!filter.search && clearBtn) {
    // 移除清空按钮
    clearBtn.remove()
  }

  // 查找账号列表容器
  const accountGrid = container.querySelector('#account-grid')
  const emptyState = container.querySelector('.empty-state')
  const contentBody = container.querySelector('.content-body')

  if (!contentBody) return

  if (filteredAccounts.length > 0) {
    // 有账号，更新或创建网格/列表
    if (accountGrid) {
      accountGrid.className = viewMode === 'grid' ? 'account-grid' : 'account-list'
      accountGrid.innerHTML = filteredAccounts.map(account =>
        viewMode === 'grid' ? renderAccountCard(account, selectedIds.has(account.id)) : renderAccountListItem(account, selectedIds.has(account.id))
      ).join('')
      onAttachAccountCardEvents()
    } else if (emptyState) {
      // 从空状态切换到有账号
      emptyState.outerHTML = `
        <div class="${viewMode === 'grid' ? 'account-grid' : 'account-list'}" id="account-grid">
          ${filteredAccounts.map(account =>
            viewMode === 'grid' ? renderAccountCard(account, selectedIds.has(account.id)) : renderAccountListItem(account, selectedIds.has(account.id))
          ).join('')}
        </div>
      `
      onAttachAccountCardEvents()
    }
  } else {
    // 没有账号，显示空状态
    const targetElement = accountGrid || emptyState
    if (targetElement) {
      const hasFilters = filter.search || Object.keys(filter).length > 1
      targetElement.outerHTML = `
        <div class="empty-state">
          <svg class="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${hasFilters ? 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' : 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'}" />
          </svg>
          <h3 class="empty-title">${hasFilters ? '未找到匹配的账号' : '暂无账号'}</h3>
          <p class="empty-text">${hasFilters ? '尝试调整筛选条件' : '点击下方按钮添加第一个账号'}</p>
          ${!hasFilters ? '<button class="ui-btn ui-btn-primary" id="add-first-account-btn">添加账号</button>' : ''}
        </div>
      `
      if (!hasFilters) {
        const addBtn = container.querySelector('#add-first-account-btn')
        if (addBtn) {
          addBtn.addEventListener('click', () => showAddAccountDialog())
        }
      }
    }
  }
}
