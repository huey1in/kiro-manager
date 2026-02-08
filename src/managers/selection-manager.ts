import { accountStore } from '../store'

export function toggleSelection(
  accountId: string,
  selectedIds: Set<string>,
  onUpdateSelectionUI: () => void
) {
  if (selectedIds.has(accountId)) {
    selectedIds.delete(accountId)
  } else {
    selectedIds.add(accountId)
  }

  // 只更新相关的 UI 元素，不重新渲染整个页面
  onUpdateSelectionUI()
}

export function updateSelectionUI(container: HTMLElement, selectedIds: Set<string>) {
  const filteredAccounts = accountStore.getFilteredAccounts()

  // 更新所有账号项的复选框状态
  const accountItems = container.querySelectorAll('.account-card, .account-list-item')
  accountItems.forEach(item => {
    const accountId = (item as HTMLElement).dataset.accountId
    if (!accountId) return

    const checkbox = item.querySelector('.custom-checkbox[data-action="toggle-select"]')
    if (checkbox) {
      const isSelected = selectedIds.has(accountId)
      if (isSelected) {
        checkbox.classList.add('checked')
        checkbox.innerHTML = '<svg fill="currentColor" viewBox="0 0 20 20" width="12" height="12"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>'
      } else {
        checkbox.classList.remove('checked')
        checkbox.innerHTML = ''
      }
    }
  })

  // 更新全选复选框
  const selectAllCheckbox = container.querySelector('#select-all-checkbox')
  if (selectAllCheckbox) {
    const allSelected = selectedIds.size > 0 && selectedIds.size === filteredAccounts.length
    if (allSelected) {
      selectAllCheckbox.classList.add('checked')
      selectAllCheckbox.innerHTML = '<svg fill="currentColor" viewBox="0 0 20 20" width="12" height="12"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>'
      selectAllCheckbox.setAttribute('title', '取消全选')
    } else {
      selectAllCheckbox.classList.remove('checked')
      selectAllCheckbox.innerHTML = ''
      selectAllCheckbox.setAttribute('title', '全选')
    }
  }

  // 更新选中信息文本
  const selectionTextContainer = container.querySelector('.select-all-wrapper')
  if (selectionTextContainer) {
    const existingText = selectionTextContainer.querySelector('.selection-text')
    if (selectedIds.size > 0) {
      if (existingText) {
        existingText.textContent = `已选中 ${selectedIds.size} 个`
      } else {
        const textSpan = document.createElement('span')
        textSpan.className = 'selection-text'
        textSpan.textContent = `已选中 ${selectedIds.size} 个`
        selectionTextContainer.appendChild(textSpan)
      }
    } else {
      if (existingText) {
        existingText.remove()
      }
    }
  }

  // 更新批量操作按钮的禁用状态
  const batchCheckBtn = container.querySelector('#batch-check-btn') as HTMLButtonElement
  const batchRefreshBtn = container.querySelector('#batch-refresh-btn') as HTMLButtonElement
  const batchDeleteBtn = container.querySelector('#batch-delete-btn') as HTMLButtonElement

  const isDisabled = selectedIds.size === 0
  if (batchCheckBtn) batchCheckBtn.disabled = isDisabled
  if (batchRefreshBtn) batchRefreshBtn.disabled = isDisabled
  if (batchDeleteBtn) batchDeleteBtn.disabled = isDisabled
}
