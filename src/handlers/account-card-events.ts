export function attachAccountCardEvents(
  container: HTMLElement,
  onToggleSelection: (accountId: string) => void,
  onAccountAction: (accountId: string, action: string) => void
) {
  // 处理卡片视图和列表视图
  const accountItems = container.querySelectorAll('.account-card, .account-list-item')
  accountItems.forEach(item => {
    const accountId = (item as HTMLElement).dataset.accountId
    if (!accountId) return

    const checkbox = item.querySelector('[data-action="toggle-select"]')
    if (checkbox) {
      checkbox.addEventListener('click', (e) => {
        e.stopPropagation()
        onToggleSelection(accountId)
      })
    }

    const actions = item.querySelectorAll('[data-action]')
    actions.forEach(btn => {
      const action = (btn as HTMLElement).dataset.action
      if (action && action !== 'toggle-select') {
        btn.addEventListener('click', (e) => {
          e.stopPropagation()
          onAccountAction(accountId, action)
        })
      }
    })
  })
}
