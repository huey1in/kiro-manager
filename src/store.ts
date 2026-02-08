// 简化的状态管理
import type { Account, AccountFilter, SubscriptionType, AccountStatus } from './types'

class AccountStore {
  private accounts: Account[] = []
  private listeners: Set<() => void> = new Set()
  private filter: AccountFilter = {}

  async loadAccounts() {
    // TODO: 从 Tauri 后端加载
    const saved = localStorage.getItem('accounts')
    if (saved) {
      this.accounts = JSON.parse(saved)
      this.notify()
    }
  }

  async saveAccounts() {
    // TODO: 保存到 Tauri 后端
    localStorage.setItem('accounts', JSON.stringify(this.accounts))
  }

  getAccounts(): Account[] {
    return this.accounts
  }

  addAccount(account: Omit<Account, 'id' | 'createdAt' | 'isActive'>) {
    const newAccount: Account = {
      ...account,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      isActive: false
    }
    this.accounts.push(newAccount)
    this.saveAccounts()
    this.notify()
    return newAccount.id
  }

  updateAccount(id: string, updates: Partial<Account>) {
    const index = this.accounts.findIndex(a => a.id === id)
    if (index !== -1) {
      this.accounts[index] = { ...this.accounts[index], ...updates }
      this.saveAccounts()
      this.notify()
    }
  }

  deleteAccount(id: string) {
    this.accounts = this.accounts.filter(a => a.id !== id)
    this.saveAccounts()
    this.notify()
  }

  // 筛选相关方法
  getFilter(): AccountFilter {
    return this.filter
  }

  setFilter(filter: AccountFilter) {
    this.filter = filter
    this.notify()
  }

  clearFilter() {
    this.filter = {}
    this.notify()
  }

  getFilteredAccounts(): Account[] {
    let result = [...this.accounts]

    // 应用搜索筛选
    if (this.filter.search) {
      const search = this.filter.search.toLowerCase()
      result = result.filter(a =>
        a.email.toLowerCase().includes(search) ||
        a.nickname?.toLowerCase().includes(search) ||
        a.userId?.toLowerCase().includes(search) ||
        a.subscription?.title?.toLowerCase().includes(search) ||
        a.idp?.toLowerCase().includes(search)
      )
    }

    // 应用订阅类型筛选
    if (this.filter.subscriptionTypes?.length) {
      result = result.filter(a => this.filter.subscriptionTypes!.includes(a.subscription.type))
    }

    // 应用状态筛选
    if (this.filter.statuses?.length) {
      result = result.filter(a => this.filter.statuses!.includes(a.status))
    }

    // 应用登录方式筛选
    if (this.filter.idps?.length) {
      result = result.filter(a => this.filter.idps!.includes(a.idp))
    }

    // 应用使用量范围筛选
    if (this.filter.usageMin !== undefined) {
      result = result.filter(a => a.usage.percentUsed >= this.filter.usageMin!)
    }

    if (this.filter.usageMax !== undefined) {
      result = result.filter(a => a.usage.percentUsed <= this.filter.usageMax!)
    }

    // 应用剩余天数范围筛选
    if (this.filter.daysRemainingMin !== undefined) {
      result = result.filter(a =>
        a.subscription.daysRemaining !== undefined &&
        a.subscription.daysRemaining >= this.filter.daysRemainingMin!
      )
    }

    if (this.filter.daysRemainingMax !== undefined) {
      result = result.filter(a =>
        a.subscription.daysRemaining !== undefined &&
        a.subscription.daysRemaining <= this.filter.daysRemainingMax!
      )
    }

    return result
  }

  getStats() {
    const bySubscription: Record<SubscriptionType, number> = {
      Free: 0,
      Pro: 0,
      Pro_Plus: 0,
      Enterprise: 0,
      Teams: 0
    }

    const byStatus: Record<AccountStatus, number> = {
      active: 0,
      expired: 0,
      error: 0,
      refreshing: 0,
      unknown: 0,
      suspended: 0
    }

    const byIdp: Record<string, number> = {}

    this.accounts.forEach(account => {
      bySubscription[account.subscription.type] = (bySubscription[account.subscription.type] || 0) + 1
      byStatus[account.status] = (byStatus[account.status] || 0) + 1
      byIdp[account.idp] = (byIdp[account.idp] || 0) + 1
    })

    return {
      total: this.accounts.length,
      bySubscription,
      byStatus,
      byIdp
    }
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify() {
    this.listeners.forEach(listener => listener())
  }
}

export const accountStore = new AccountStore()
