import { accountStore } from '../store'
import { showAddAccountDialog } from '../dialogs/add-account-dialog'
import { handleBatchCheck, handleBatchRefresh, handleBatchDelete } from '../actions/account-actions'

export function attachAccountsEvents(
  container: HTMLElement,
  selectedIds: Set<string>,
  onFilterToggle: () => void,
  onViewModeChange: (mode: 'grid' | 'list') => void,
  onExport: () => void,
  onUpdateAccountList: () => void,
  onUpdateSelectionUI: () => void,
  onAttachAccountCardEvents: () => void,
  updateCurrentAccountIfMatch: (accountId: string) => Promise<void>
) {
  const searchInput = container.querySelector('#search-input') as HTMLInputElement
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const value = (e.target as HTMLInputElement).value
      const filter = accountStore.getFilter()
      // 直接更新 filter 对象，不触发订阅通知
      filter.search = value || undefined

      // 只更新账号列表，不重新渲染整个页面
      onUpdateAccountList()
    })

    // 支持 ESC 键清空搜索
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const filter = accountStore.getFilter()
        filter.search = undefined
        searchInput.value = ''
        onUpdateAccountList()
      }
    })
  }

  // 清空搜索按钮
  const clearBtn = container.querySelector('#search-clear-btn')
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      const filter = accountStore.getFilter()
      filter.search = undefined
      if (searchInput) searchInput.value = ''
      onUpdateAccountList()
      searchInput?.focus()
    })
  }

  // 筛选切换按钮
  const filterToggleBtn = container.querySelector('#filter-toggle-btn')
  if (filterToggleBtn) {
    filterToggleBtn.addEventListener('click', () => {
      onFilterToggle()
    })
  }

  // 视图模式切换
  const viewGridBtn = container.querySelector('#view-grid-btn')
  const viewListBtn = container.querySelector('#view-list-btn')
  if (viewGridBtn) {
    viewGridBtn.addEventListener('click', () => {
      onViewModeChange('grid')
    })
  }
  if (viewListBtn) {
    viewListBtn.addEventListener('click', () => {
      onViewModeChange('list')
    })
  }

  // 筛选按钮事件
  const filterBtns = container.querySelectorAll('.filter-btn')
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const type = (btn as HTMLElement).dataset.filterType
      const value = (btn as HTMLElement).dataset.filterValue
      toggleFilter(type!, value!)
    })
  })

  // 使用量范围筛选
  const usageMinInput = container.querySelector('#usage-min') as HTMLInputElement
  const usageMaxInput = container.querySelector('#usage-max') as HTMLInputElement
  if (usageMinInput && usageMaxInput) {
    usageMinInput.addEventListener('change', () => {
      const filter = accountStore.getFilter()
      accountStore.setFilter({
        ...filter,
        usageMin: usageMinInput.value ? Number(usageMinInput.value) / 100 : undefined
      })
    })
    usageMaxInput.addEventListener('change', () => {
      const filter = accountStore.getFilter()
      accountStore.setFilter({
        ...filter,
        usageMax: usageMaxInput.value ? Number(usageMaxInput.value) / 100 : undefined
      })
    })
  }

  // 剩余天数范围筛选
  const daysMinInput = container.querySelector('#days-min') as HTMLInputElement
  const daysMaxInput = container.querySelector('#days-max') as HTMLInputElement
  if (daysMinInput && daysMaxInput) {
    daysMinInput.addEventListener('change', () => {
      const filter = accountStore.getFilter()
      accountStore.setFilter({
        ...filter,
        daysRemainingMin: daysMinInput.value ? Number(daysMinInput.value) : undefined
      })
    })
    daysMaxInput.addEventListener('change', () => {
      const filter = accountStore.getFilter()
      accountStore.setFilter({
        ...filter,
        daysRemainingMax: daysMaxInput.value ? Number(daysMaxInput.value) : undefined
      })
    })
  }

  const addBtns = container.querySelectorAll('#add-account-btn, #add-first-account-btn')
  addBtns.forEach(btn => {
    btn.addEventListener('click', () => showAddAccountDialog())
  })

  const exportBtn = container.querySelector('#export-btn')
  if (exportBtn) {
    exportBtn.addEventListener('click', () => onExport())
  }

  // 全选复选框
  const selectAllCheckbox = container.querySelector('#select-all-checkbox')
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('click', () => {
      const filteredAccounts = accountStore.getFilteredAccounts()
      const allSelected = selectedIds.size > 0 && selectedIds.size === filteredAccounts.length

      if (allSelected) {
        // 取消全选
        selectedIds.clear()
      } else {
        // 全选
        filteredAccounts.forEach(account => {
          selectedIds.add(account.id)
        })
      }
      onUpdateSelectionUI()
    })
  }

  const batchCheckBtn = container.querySelector('#batch-check-btn')
  if (batchCheckBtn) {
    batchCheckBtn.addEventListener('click', () => handleBatchCheck(selectedIds))
  }

  const batchRefreshBtn = container.querySelector('#batch-refresh-btn')
  if (batchRefreshBtn) {
    batchRefreshBtn.addEventListener('click', () => handleBatchRefresh(selectedIds, updateCurrentAccountIfMatch))
  }

  const batchDeleteBtn = container.querySelector('#batch-delete-btn')
  if (batchDeleteBtn) {
    batchDeleteBtn.addEventListener('click', () => handleBatchDelete(selectedIds, () => { selectedIds.clear(); }))
  }

  onAttachAccountCardEvents()
}

function toggleFilter(type: string, value: string) {
  const filter = accountStore.getFilter()

  if (type === 'subscription') {
    const current = filter.subscriptionTypes || []
    const newValue = current.includes(value as any)
      ? current.filter(v => v !== value)
      : [...current, value as any]
    accountStore.setFilter({
      ...filter,
      subscriptionTypes: newValue.length > 0 ? newValue : undefined
    })
  } else if (type === 'status') {
    const current = filter.statuses || []
    const newValue = current.includes(value as any)
      ? current.filter(v => v !== value)
      : [...current, value as any]
    accountStore.setFilter({
      ...filter,
      statuses: newValue.length > 0 ? newValue : undefined
    })
  } else if (type === 'idp') {
    const current = filter.idps || []
    const newValue = current.includes(value as any)
      ? current.filter(v => v !== value)
      : [...current, value as any]
    accountStore.setFilter({
      ...filter,
      idps: newValue.length > 0 ? newValue : undefined
    })
  }
}
