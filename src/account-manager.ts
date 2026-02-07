import type { Account } from './types'
import { accountStore } from './store'

export class AccountManager {
  private container: HTMLElement
  private selectedIds: Set<string> = new Set()
  private isFilterExpanded: boolean = false
  private viewMode: 'grid' | 'list' = 'grid'
  private unsubscribe: (() => void) | null = null

  constructor(container: HTMLElement) {
    this.container = container
    this.init()
  }

  private async init() {
    await accountStore.loadAccounts()
    this.unsubscribe = accountStore.subscribe(() => {
      this.renderContent()
      // 账号数据更新时，检查并更新当前账号显示
      this.checkAndUpdateCurrentAccount()
    })
    
    // 启动时自动导入当前活跃账号
    await this.autoImportCurrentAccount()
  }

  private async checkAndUpdateCurrentAccount() {
    try {
      // 获取本地活跃账号的凭证
      const localResult = await (window as any).__TAURI__.core.invoke('get_local_active_account')
      
      if (!localResult.success || !localResult.data) {
        return
      }
      
      const { refresh_token, client_id } = localResult.data
      
      // 在所有账号中查找匹配的账号
      const accounts = accountStore.getAccounts()
      const currentAccount = accounts.find(a => 
        a.credentials.refreshToken === refresh_token ||
        a.credentials.clientId === client_id
      )
      
      if (currentAccount) {
        this.renderCurrentAccount(currentAccount)
      }
    } catch (error) {
      // 静默失败，不影响主流程
    }
  }

  private async autoImportCurrentAccount() {
    try {
      // 调用后端读取本地 SSO 缓存
      const localResult = await (window as any).__TAURI__.core.invoke('get_local_active_account')
      
      if (!localResult.success || !localResult.data) {
        console.log('[自动导入] 未找到本地活跃账号:', localResult.error)
        this.renderCurrentAccount(null)
        return
      }
      
      const { refresh_token, client_id, client_secret, region } = localResult.data
      
      // 检查是否已存在相同的账号
      const accounts = accountStore.getAccounts()
      const existingAccount = accounts.find(a => 
        a.credentials.refreshToken === refresh_token ||
        a.credentials.clientId === client_id
      )
      
      if (existingAccount) {
        console.log('[自动导入] 账号已存在,正在刷新:', existingAccount.email)
        await this.refreshAccount(existingAccount)
        this.renderCurrentAccount(existingAccount)
        return
      }
      
      // 验证凭证并添加账号
      console.log('[自动导入] 正在验证新账号...')
      
      const result = await (window as any).__TAURI__.core.invoke('verify_account_credentials', {
        refreshToken: refresh_token,
        clientId: client_id,
        clientSecret: client_secret,
        region: region
      })
      
      if (result.success && result.data) {
        const now = Date.now()
        const newAccountId = accountStore.addAccount({
          email: result.data.email,
          nickname: result.data.email.split('@')[0],
          idp: 'BuilderId',
          userId: result.data.user_id,
          credentials: {
            accessToken: result.data.access_token,
            csrfToken: '',
            refreshToken: result.data.refresh_token,
            clientId: client_id,
            clientSecret: client_secret,
            region: region,
            expiresAt: now + (result.data.expires_in || 3600) * 1000
          },
          subscription: {
            type: result.data.subscription_type,
            title: result.data.subscription_title,
            daysRemaining: result.data.days_remaining
          },
          usage: {
            current: result.data.usage.current,
            limit: result.data.usage.limit,
            percentUsed: result.data.usage.current / result.data.usage.limit,
            lastUpdated: now,
            nextResetDate: result.data.next_reset_date
          },
          groupId: undefined,
          tags: [],
          status: 'active',
          lastUsedAt: now
        })
        
        const newAccount = accountStore.getAccounts().find(a => a.id === newAccountId)
        console.log('[自动导入] 成功导入当前账号:', result.data.email)
        window.UI?.toast.success(`已自动导入当前账号: ${result.data.email}`)
        this.renderCurrentAccount(newAccount || null)
      } else {
        console.log('[自动导入] 验证失败:', result.error)
        this.renderCurrentAccount(null)
      }
    } catch (error) {
      console.log('[自动导入] 导入失败:', (error as Error).message)
      this.renderCurrentAccount(null)
    }
  }

  private renderCurrentAccount(account?: Account | null) {
    const card = this.container.querySelector('#current-account-card')
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
    const isHighUsage = account.usage.percentUsed > 0.8
    card.innerHTML = `
      <div class="current-account-header">
        <div class="current-account-label">当前账号</div>
        <span class="current-account-badge">${account.subscription.title || account.subscription.type}</span>
      </div>
      <div class="current-account-email" title="${account.email}">${account.email}</div>
      <div class="current-account-usage">
        <div class="current-account-usage-text">
          <span>${account.usage.current.toLocaleString()}</span>
          <span class="current-account-usage-limit">/ ${account.usage.limit.toLocaleString()}</span>
        </div>
        <div class="current-account-progress">
          <div class="current-account-progress-bar ${isHighUsage ? 'warning' : ''}" style="width: ${account.usage.percentUsed * 100}%"></div>
        </div>
      </div>
    `
  }

  public destroy() {
    if (this.unsubscribe) {
      this.unsubscribe()
    }
  }

  public render() {
    this.container.innerHTML = `
      <div class="titlebar" data-tauri-drag-region>
        <div class="titlebar-left">
          <div class="titlebar-title">Kiro Manager</div>
        </div>
        <div class="titlebar-right">
          <button class="titlebar-button" id="minimize-btn" title="最小化">
            <svg viewBox="0 0 12 12" width="12" height="12">
              <rect x="2" y="5.5" width="8" height="1" fill="currentColor" />
            </svg>
          </button>
          <button class="titlebar-button close" id="close-btn" title="关闭">
            <svg viewBox="0 0 12 12" width="12" height="12">
              <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
          </button>
        </div>
      </div>
      <div class="app-body">
        <div class="sidebar">
          <div class="sidebar-header">
            <img src="/src/assets/logo.svg" alt="Logo" class="sidebar-logo" />
            <h1 class="sidebar-title">Kiro Manager</h1>
          </div>
          <nav class="sidebar-nav">
            <button class="sidebar-link active" data-view="accounts">
              <svg class="sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>账户管理</span>
            </button>
            <button class="sidebar-link" data-view="settings">
              <svg class="sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>设置</span>
            </button>
          </nav>
          <div class="sidebar-footer">
            <div class="current-account-card" id="current-account-card">
              <div class="current-account-loading">加载中...</div>
            </div>
          </div>
        </div>
        <div class="main-content">
          <div id="content-area"></div>
        </div>
      </div>
    `

    this.attachTitlebarEvents()
    this.renderContent()
    this.renderCurrentAccount()
  }

  private attachTitlebarEvents() {
    const minimizeBtn = this.container.querySelector('#minimize-btn')
    const closeBtn = this.container.querySelector('#close-btn')

    if (minimizeBtn) {
      minimizeBtn.addEventListener('click', async () => {
        await (window as any).__TAURI__.window.getCurrentWindow().minimize()
      })
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', async () => {
        await (window as any).__TAURI__.window.getCurrentWindow().close()
      })
    }

    // 侧边栏导航
    const sidebarLinks = this.container.querySelectorAll('.sidebar-link')
    sidebarLinks.forEach(link => {
      link.addEventListener('click', () => {
        sidebarLinks.forEach(l => l.classList.remove('active'))
        link.classList.add('active')
        this.renderContent()
      })
    })
  }

  private renderSettingsView(container: Element) {
    container.innerHTML = `
      <div class="settings-page">
        <div class="settings-section">
          <h3 class="settings-section-title">外观</h3>
          <div class="settings-item">
            <div class="settings-item-info">
              <div class="settings-item-label">深色模式</div>
              <div class="settings-item-desc">切换深色/浅色主题</div>
            </div>
            <label class="ui-switch">
              <input type="checkbox" id="theme-switch">
              <span class="ui-switch-track">
                <span class="ui-switch-thumb"></span>
              </span>
            </label>
          </div>
        </div>
      </div>
    `

    // 初始化主题开关状态
    const themeSwitch = container.querySelector('#theme-switch') as HTMLInputElement
    if (themeSwitch) {
      const currentTheme = (window as any).UI?.theme.get()
      themeSwitch.checked = currentTheme === 'dark'
      
      themeSwitch.addEventListener('change', () => {
        if ((window as any).UI?.theme) {
          (window as any).UI.theme.toggle()
        }
      })
    }
  }

  private renderContent() {
    const contentArea = this.container.querySelector('#content-area')
    if (!contentArea) return

    const activeView = this.container.querySelector('.sidebar-link.active')?.getAttribute('data-view') || 'accounts'
    
    if (activeView === 'accounts') {
      this.renderAccountsView(contentArea)
    } else if (activeView === 'settings') {
      this.renderSettingsView(contentArea)
    }
  }

  private renderAccountsView(container: Element) {
    const filteredAccounts = accountStore.getFilteredAccounts()
    const filter = accountStore.getFilter()
    
    container.innerHTML = `
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
              <button class="ui-btn ui-btn-secondary ${this.isFilterExpanded ? 'active' : ''}" id="filter-toggle-btn" title="展开/收起筛选">
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
              <div class="custom-checkbox ${this.selectedIds.size > 0 && this.selectedIds.size === accountStore.getFilteredAccounts().length ? 'checked' : ''}" id="select-all-checkbox" title="${this.selectedIds.size > 0 && this.selectedIds.size === accountStore.getFilteredAccounts().length ? '取消全选' : '全选'}">
                ${this.selectedIds.size > 0 && this.selectedIds.size === accountStore.getFilteredAccounts().length ? '<svg fill="currentColor" viewBox="0 0 20 20" width="12" height="12"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>' : ''}
              </div>
              ${this.selectedIds.size > 0 ? `
                <span class="selection-text">已选中 ${this.selectedIds.size} 个</span>
              ` : ''}
            </div>
            <div class="toolbar-batch-actions">
              <button class="ui-btn ui-btn-sm ui-btn-secondary" id="batch-check-btn" title="检查账号状态" ${this.selectedIds.size === 0 ? 'disabled' : ''}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14" style="margin-right: 0.25rem">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                检查
              </button>
              <button class="ui-btn ui-btn-sm ui-btn-secondary" id="batch-refresh-btn" title="刷新账号信息" ${this.selectedIds.size === 0 ? 'disabled' : ''}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14" style="margin-right: 0.25rem">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                刷新
              </button>
              <button class="ui-btn ui-btn-sm ui-btn-danger" id="batch-delete-btn" title="删除选中账号" ${this.selectedIds.size === 0 ? 'disabled' : ''}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14" style="margin-right: 0.25rem">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                删除
              </button>
            </div>
            <div class="view-mode-switch">
              <button class="view-mode-btn ${this.viewMode === 'grid' ? 'active' : ''}" id="view-grid-btn" title="卡片视图">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button class="view-mode-btn ${this.viewMode === 'list' ? 'active' : ''}" id="view-list-btn" title="列表视图">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        
        ${this.isFilterExpanded ? this.renderFilterPanel() : ''}
        
        ${filteredAccounts.length > 0 ? `
          <div class="${this.viewMode === 'grid' ? 'account-grid' : 'account-list'}" id="account-grid">
            ${filteredAccounts.map(account => this.viewMode === 'grid' ? this.renderAccountCard(account) : this.renderAccountListItem(account)).join('')}
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

    this.attachAccountsEvents()
  }

  private renderAccountCard(account: Account): string {
    const isSelected = this.selectedIds.has(account.id)
    const subscriptionColor = this.getSubscriptionColor(account.subscription.type)
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
              <div class="status-dot">${this.getStatusText(account.status)}</div>
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

  private renderAccountListItem(account: Account): string {
    const isSelected = this.selectedIds.has(account.id)
    const subscriptionColor = this.getSubscriptionColor(account.subscription.type)
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
              <div class="status-dot">${this.getStatusText(account.status)}</div>
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

  private getSubscriptionColor(type: string): string {
    const text = type.toUpperCase()
    if (text.includes('PRO+') || text.includes('PRO_PLUS')) return 'badge-pro'
    if (text.includes('PRO')) return 'badge-pro'
    return 'badge-free'
  }

  private getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      active: '正常',
      expired: '已过期',
      error: '错误',
      refreshing: '刷新中',
      unknown: '未知'
    }
    return statusMap[status] || status
  }

  private renderFilterPanel(): string {
    const filter = accountStore.getFilter()
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
                <button class="filter-btn ${filter.subscriptionTypes?.includes(opt.value as any) ? 'active' : ''}" 
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
                <button class="filter-btn ${filter.statuses?.includes(opt.value as any) ? 'active' : ''}" 
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
                <button class="filter-btn ${filter.idps?.includes(opt.value as any) ? 'active' : ''}" 
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

  private attachAccountsEvents() {
    const searchInput = this.container.querySelector('#search-input') as HTMLInputElement
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const value = (e.target as HTMLInputElement).value
        const filter = accountStore.getFilter()
        // 直接更新 filter 对象，不触发订阅通知
        filter.search = value || undefined
        
        // 只更新账号列表，不重新渲染整个页面
        this.updateAccountList()
      })

      // 支持 ESC 键清空搜索
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          const filter = accountStore.getFilter()
          filter.search = undefined
          searchInput.value = ''
          this.updateAccountList()
        }
      })
    }

    // 清空搜索按钮
    const clearBtn = this.container.querySelector('#search-clear-btn')
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        const filter = accountStore.getFilter()
        filter.search = undefined
        if (searchInput) searchInput.value = ''
        this.updateAccountList()
        searchInput?.focus()
      })
    }

    // 筛选切换按钮
    const filterToggleBtn = this.container.querySelector('#filter-toggle-btn')
    if (filterToggleBtn) {
      filterToggleBtn.addEventListener('click', () => {
        this.isFilterExpanded = !this.isFilterExpanded
        this.renderContent()
      })
    }

    // 视图模式切换
    const viewGridBtn = this.container.querySelector('#view-grid-btn')
    const viewListBtn = this.container.querySelector('#view-list-btn')
    if (viewGridBtn) {
      viewGridBtn.addEventListener('click', () => {
        this.viewMode = 'grid'
        this.renderContent()
      })
    }
    if (viewListBtn) {
      viewListBtn.addEventListener('click', () => {
        this.viewMode = 'list'
        this.renderContent()
      })
    }

    // 筛选按钮事件
    const filterBtns = this.container.querySelectorAll('.filter-btn')
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const type = (btn as HTMLElement).dataset.filterType
        const value = (btn as HTMLElement).dataset.filterValue
        this.toggleFilter(type!, value!)
      })
    })

    // 使用量范围筛选
    const usageMinInput = this.container.querySelector('#usage-min') as HTMLInputElement
    const usageMaxInput = this.container.querySelector('#usage-max') as HTMLInputElement
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
    const daysMinInput = this.container.querySelector('#days-min') as HTMLInputElement
    const daysMaxInput = this.container.querySelector('#days-max') as HTMLInputElement
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

    const addBtns = this.container.querySelectorAll('#add-account-btn, #add-first-account-btn')
    addBtns.forEach(btn => {
      btn.addEventListener('click', () => this.showAddAccountDialog())
    })

    const exportBtn = this.container.querySelector('#export-btn')
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.handleExport())
    }

    // 全选复选框
    const selectAllCheckbox = this.container.querySelector('#select-all-checkbox')
    if (selectAllCheckbox) {
      selectAllCheckbox.addEventListener('click', () => {
        const filteredAccounts = accountStore.getFilteredAccounts()
        const allSelected = this.selectedIds.size > 0 && this.selectedIds.size === filteredAccounts.length
        
        if (allSelected) {
          // 取消全选
          this.selectedIds.clear()
        } else {
          // 全选
          filteredAccounts.forEach(account => {
            this.selectedIds.add(account.id)
          })
        }
        this.updateSelectionUI()
      })
    }

    const batchCheckBtn = this.container.querySelector('#batch-check-btn')
    if (batchCheckBtn) {
      batchCheckBtn.addEventListener('click', () => this.handleBatchCheck())
    }

    const batchRefreshBtn = this.container.querySelector('#batch-refresh-btn')
    if (batchRefreshBtn) {
      batchRefreshBtn.addEventListener('click', () => this.handleBatchRefresh())
    }

    const batchDeleteBtn = this.container.querySelector('#batch-delete-btn')
    if (batchDeleteBtn) {
      batchDeleteBtn.addEventListener('click', () => this.handleBatchDelete())
    }

    this.attachAccountCardEvents()
  }

  private toggleFilter(type: string, value: string) {
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

  private updateAccountList() {
    const filteredAccounts = accountStore.getFilteredAccounts()
    const filter = accountStore.getFilter()
    
    // 更新清空按钮的显示
    const searchInput = this.container.querySelector('#search-input') as HTMLInputElement
    const clearBtn = this.container.querySelector('#search-clear-btn')
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
        this.updateAccountList()
        searchInput?.focus()
      })
      inputGroup.appendChild(btn)
    } else if (!filter.search && clearBtn) {
      // 移除清空按钮
      clearBtn.remove()
    }
    
    // 查找账号列表容器
    const accountGrid = this.container.querySelector('#account-grid')
    const emptyState = this.container.querySelector('.empty-state')
    const contentBody = this.container.querySelector('.content-body')
    
    if (!contentBody) return
    
    if (filteredAccounts.length > 0) {
      // 有账号，更新或创建网格/列表
      if (accountGrid) {
        accountGrid.className = this.viewMode === 'grid' ? 'account-grid' : 'account-list'
        accountGrid.innerHTML = filteredAccounts.map(account => 
          this.viewMode === 'grid' ? this.renderAccountCard(account) : this.renderAccountListItem(account)
        ).join('')
        this.attachAccountCardEvents()
      } else if (emptyState) {
        // 从空状态切换到有账号
        emptyState.outerHTML = `
          <div class="${this.viewMode === 'grid' ? 'account-grid' : 'account-list'}" id="account-grid">
            ${filteredAccounts.map(account => 
              this.viewMode === 'grid' ? this.renderAccountCard(account) : this.renderAccountListItem(account)
            ).join('')}
          </div>
        `
        this.attachAccountCardEvents()
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
          const addBtn = this.container.querySelector('#add-first-account-btn')
          if (addBtn) {
            addBtn.addEventListener('click', () => this.showAddAccountDialog())
          }
        }
      }
    }
  }

  private attachAccountCardEvents() {
    // 处理卡片视图和列表视图
    const accountItems = this.container.querySelectorAll('.account-card, .account-list-item')
    accountItems.forEach(item => {
      const accountId = (item as HTMLElement).dataset.accountId
      if (!accountId) return

      const checkbox = item.querySelector('[data-action="toggle-select"]')
      if (checkbox) {
        checkbox.addEventListener('click', (e) => {
          e.stopPropagation()
          this.toggleSelection(accountId)
        })
      }

      const actions = item.querySelectorAll('[data-action]')
      actions.forEach(btn => {
        const action = (btn as HTMLElement).dataset.action
        if (action && action !== 'toggle-select') {
          btn.addEventListener('click', (e) => {
            e.stopPropagation()
            this.handleAccountAction(accountId, action)
          })
        }
      })
    })
  }

  private toggleSelection(accountId: string) {
    if (this.selectedIds.has(accountId)) {
      this.selectedIds.delete(accountId)
    } else {
      this.selectedIds.add(accountId)
    }
    
    // 只更新相关的 UI 元素，不重新渲染整个页面
    this.updateSelectionUI()
  }

  private updateSelectionUI() {
    const filteredAccounts = accountStore.getFilteredAccounts()
    
    // 更新所有账号项的复选框状态
    const accountItems = this.container.querySelectorAll('.account-card, .account-list-item')
    accountItems.forEach(item => {
      const accountId = (item as HTMLElement).dataset.accountId
      if (!accountId) return
      
      const checkbox = item.querySelector('.custom-checkbox[data-action="toggle-select"]')
      if (checkbox) {
        const isSelected = this.selectedIds.has(accountId)
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
    const selectAllCheckbox = this.container.querySelector('#select-all-checkbox')
    if (selectAllCheckbox) {
      const allSelected = this.selectedIds.size > 0 && this.selectedIds.size === filteredAccounts.length
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
    const selectionTextContainer = this.container.querySelector('.select-all-wrapper')
    if (selectionTextContainer) {
      const existingText = selectionTextContainer.querySelector('.selection-text')
      if (this.selectedIds.size > 0) {
        if (existingText) {
          existingText.textContent = `已选中 ${this.selectedIds.size} 个`
        } else {
          const textSpan = document.createElement('span')
          textSpan.className = 'selection-text'
          textSpan.textContent = `已选中 ${this.selectedIds.size} 个`
          selectionTextContainer.appendChild(textSpan)
        }
      } else {
        if (existingText) {
          existingText.remove()
        }
      }
    }
    
    // 更新批量操作按钮的禁用状态
    const batchCheckBtn = this.container.querySelector('#batch-check-btn') as HTMLButtonElement
    const batchRefreshBtn = this.container.querySelector('#batch-refresh-btn') as HTMLButtonElement
    const batchDeleteBtn = this.container.querySelector('#batch-delete-btn') as HTMLButtonElement
    
    const isDisabled = this.selectedIds.size === 0
    if (batchCheckBtn) batchCheckBtn.disabled = isDisabled
    if (batchRefreshBtn) batchRefreshBtn.disabled = isDisabled
    if (batchDeleteBtn) batchDeleteBtn.disabled = isDisabled
  }

  private async handleAccountAction(accountId: string, action: string) {
    const accounts = accountStore.getAccounts()
    const account = accounts.find(a => a.id === accountId)
    if (!account) return

    switch (action) {
      case 'detail':
        this.showAccountDetailDialog(account)
        break
      case 'refresh':
        await this.refreshAccount(account)
        break
      case 'copy':
        navigator.clipboard.writeText(JSON.stringify(account.credentials, null, 2))
        window.UI?.toast.success('凭证已复制到剪贴板')
        break
      case 'edit':
        this.showEditAccountDialog(account)
        break
      case 'delete':
        this.deleteAccount(accountId)
        break
    }
  }

  private showAccountDetailDialog(account: Account) {
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
    
    window.UI?.modal.open({
      title: '',
      html: `
        <div class="account-detail-modal">
          <!-- 头部信息 -->
          <div class="detail-header">
            <div class="detail-email">${account.email}</div>
            <div class="detail-header-bottom">
              <span class="detail-badge">
                ${account.subscription.title || account.subscription.type}
              </span>
              <div class="detail-sync-time">
                上次同步: ${lastUsedAt}
              </div>
            </div>
          </div>
          
          <!-- 使用量卡片 -->
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

  private async refreshAccount(account: Account) {
    if (!account.credentials.refreshToken || !account.credentials.clientId || !account.credentials.clientSecret) {
      window.UI?.toast.error('账号缺少刷新凭证')
      return
    }

    window.UI?.toast.info(`正在刷新账号: ${account.email}`)
    
    try {
      const result = await (window as any).__TAURI__.core.invoke('verify_account_credentials', {
        refreshToken: account.credentials.refreshToken,
        clientId: account.credentials.clientId,
        clientSecret: account.credentials.clientSecret,
        region: account.credentials.region || 'us-east-1'
      })

      if (result.success && result.data) {
        const now = Date.now()
        accountStore.updateAccount(account.id, {
          email: result.data.email,
          userId: result.data.user_id,
          credentials: {
            ...account.credentials,
            accessToken: result.data.access_token,
            refreshToken: result.data.refresh_token,
            expiresAt: now + (result.data.expires_in || 3600) * 1000
          },
          subscription: {
            type: result.data.subscription_type,
            title: result.data.subscription_title,
            daysRemaining: result.data.days_remaining
          },
          usage: {
            current: result.data.usage.current,
            limit: result.data.usage.limit,
            percentUsed: result.data.usage.current / result.data.usage.limit,
            lastUpdated: now,
            nextResetDate: result.data.next_reset_date
          },
          status: 'active',
          lastUsedAt: now
        })

        // 检查是否是当前活跃账号，如果是则更新侧边栏显示
        await this.updateCurrentAccountIfMatch(account.id)

        window.UI?.toast.success('账号刷新成功')
      } else {
        window.UI?.toast.error(result.error || '刷新失败')
      }
    } catch (error) {
      window.UI?.toast.error('刷新失败: ' + (error as Error).message)
    }
  }

  private async updateCurrentAccountIfMatch(accountId: string) {
    try {
      // 获取本地活跃账号的凭证
      const localResult = await (window as any).__TAURI__.core.invoke('get_local_active_account')
      
      if (!localResult.success || !localResult.data) {
        return
      }
      
      const { refresh_token, client_id } = localResult.data
      
      // 获取刚刚更新的账号
      const accounts = accountStore.getAccounts()
      const updatedAccount = accounts.find(a => a.id === accountId)
      
      if (!updatedAccount) return
      
      // 检查是否匹配当前活跃账号
      if (updatedAccount.credentials.refreshToken === refresh_token ||
          updatedAccount.credentials.clientId === client_id) {
        // 更新侧边栏显示
        this.renderCurrentAccount(updatedAccount)
      }
    } catch (error) {
      console.log('[更新当前账号] 检查失败:', (error as Error).message)
    }
  }

  private showAddAccountDialog() {
    const modal = window.UI?.modal.open({
      title: '添加账号',
      html: `
        <div class="modal-form">
          <div class="form-section">
            <label class="form-label">导入方式</label>
            <div class="mode-switch">
              <button class="mode-btn active" id="mode-single" onclick="window.switchImportMode('single')">单个导入</button>
              <button class="mode-btn" id="mode-batch" onclick="window.switchImportMode('batch')">批量导入</button>
            </div>
          </div>
          
          <div id="single-import-form">
            <div class="form-section">
              <label class="form-label">登录类型</label>
              <div class="login-type-switch">
                <button class="login-type-btn active" id="type-builderid" onclick="window.selectLoginType('BuilderId')">BuilderId</button>
                <button class="login-type-btn" id="type-enterprise" onclick="window.selectLoginType('Enterprise')">Enterprise</button>
                <button class="login-type-btn" id="type-social" onclick="window.selectLoginType('Social')">Social</button>
              </div>
            </div>
            
            <div id="social-provider-section" class="form-section" style="display: none;">
              <label class="form-label">Social Provider</label>
              <div class="provider-switch">
                <button class="provider-btn active" id="provider-google" onclick="window.selectSocialProvider('Google')">Google</button>
                <button class="provider-btn" id="provider-github" onclick="window.selectSocialProvider('Github')">GitHub</button>
              </div>
              <p class="form-hint">社交登录不需要 Client ID 和 Client Secret</p>
            </div>
            
            <div class="form-section">
              <label class="form-label">Refresh Token <span class="required">*</span></label>
              <input type="text" class="form-input" id="refresh-token" placeholder="刷新令牌" required>
            </div>
            
            <div id="credentials-section">
              <div class="form-row">
                <div class="form-section">
                  <label class="form-label">Client ID <span class="required">*</span></label>
                  <input type="text" class="form-input" id="client-id" placeholder="客户端 ID" required>
                </div>
                <div class="form-section">
                  <label class="form-label">Client Secret <span class="required">*</span></label>
                  <input type="password" class="form-input" id="client-secret" placeholder="客户端密钥" required>
                </div>
              </div>
              <div class="form-section">
                <label class="form-label">Region</label>
                <div class="ui-dropdown dropdown-up" style="width: 100%;">
                  <button class="ui-btn ui-btn-secondary" data-dropdown style="width: 100%; justify-content: space-between;" id="region-btn">
                    <span id="region-text">us-east-1 (N. Virginia)</span>
                    <span>▲</span>
                  </button>
                  <div class="ui-dropdown-menu" style="width: 100%; max-height: 300px; overflow-y: auto;">
                    <div class="dropdown-group-label">US</div>
                    <button class="ui-dropdown-item" onclick="window.selectRegion('us-east-1', 'us-east-1 (N. Virginia)')">us-east-1 (N. Virginia)</button>
                    <button class="ui-dropdown-item" onclick="window.selectRegion('us-east-2', 'us-east-2 (Ohio)')">us-east-2 (Ohio)</button>
                    <button class="ui-dropdown-item" onclick="window.selectRegion('us-west-1', 'us-west-1 (N. California)')">us-west-1 (N. California)</button>
                    <button class="ui-dropdown-item" onclick="window.selectRegion('us-west-2', 'us-west-2 (Oregon)')">us-west-2 (Oregon)</button>
                    <div class="dropdown-group-label">Europe</div>
                    <button class="ui-dropdown-item" onclick="window.selectRegion('eu-west-1', 'eu-west-1 (Ireland)')">eu-west-1 (Ireland)</button>
                    <button class="ui-dropdown-item" onclick="window.selectRegion('eu-west-2', 'eu-west-2 (London)')">eu-west-2 (London)</button>
                    <button class="ui-dropdown-item" onclick="window.selectRegion('eu-west-3', 'eu-west-3 (Paris)')">eu-west-3 (Paris)</button>
                    <button class="ui-dropdown-item" onclick="window.selectRegion('eu-central-1', 'eu-central-1 (Frankfurt)')">eu-central-1 (Frankfurt)</button>
                    <button class="ui-dropdown-item" onclick="window.selectRegion('eu-north-1', 'eu-north-1 (Stockholm)')">eu-north-1 (Stockholm)</button>
                    <button class="ui-dropdown-item" onclick="window.selectRegion('eu-south-1', 'eu-south-1 (Milan)')">eu-south-1 (Milan)</button>
                    <div class="dropdown-group-label">Asia Pacific</div>
                    <button class="ui-dropdown-item" onclick="window.selectRegion('ap-northeast-1', 'ap-northeast-1 (Tokyo)')">ap-northeast-1 (Tokyo)</button>
                    <button class="ui-dropdown-item" onclick="window.selectRegion('ap-northeast-2', 'ap-northeast-2 (Seoul)')">ap-northeast-2 (Seoul)</button>
                    <button class="ui-dropdown-item" onclick="window.selectRegion('ap-northeast-3', 'ap-northeast-3 (Osaka)')">ap-northeast-3 (Osaka)</button>
                    <button class="ui-dropdown-item" onclick="window.selectRegion('ap-southeast-1', 'ap-southeast-1 (Singapore)')">ap-southeast-1 (Singapore)</button>
                    <button class="ui-dropdown-item" onclick="window.selectRegion('ap-southeast-2', 'ap-southeast-2 (Sydney)')">ap-southeast-2 (Sydney)</button>
                    <button class="ui-dropdown-item" onclick="window.selectRegion('ap-south-1', 'ap-south-1 (Mumbai)')">ap-south-1 (Mumbai)</button>
                    <button class="ui-dropdown-item" onclick="window.selectRegion('ap-east-1', 'ap-east-1 (Hong Kong)')">ap-east-1 (Hong Kong)</button>
                    <div class="dropdown-group-label">Other</div>
                    <button class="ui-dropdown-item" onclick="window.selectRegion('ca-central-1', 'ca-central-1 (Canada)')">ca-central-1 (Canada)</button>
                    <button class="ui-dropdown-item" onclick="window.selectRegion('sa-east-1', 'sa-east-1 (São Paulo)')">sa-east-1 (São Paulo)</button>
                    <button class="ui-dropdown-item" onclick="window.selectRegion('me-south-1', 'me-south-1 (Bahrain)')">me-south-1 (Bahrain)</button>
                    <button class="ui-dropdown-item" onclick="window.selectRegion('af-south-1', 'af-south-1 (Cape Town)')">af-south-1 (Cape Town)</button>
                  </div>
                </div>
                <input type="hidden" id="region" value="us-east-1">
              </div>
            </div>
          </div>
          
          <div id="batch-import-form" style="display: none;">
            <div class="form-section">
              <label class="form-label">批量凭证（JSON 格式）</label>
              <textarea class="form-input form-textarea" id="batch-credentials" placeholder='[
  {
    "refreshToken": "xxx",
    "clientId": "xxx",
    "clientSecret": "xxx",
    "provider": "BuilderId",
    "region": "us-east-1"
  },
  {
    "refreshToken": "yyy",
    "clientId": "yyy",
    "clientSecret": "yyy",
    "provider": "Enterprise"
  },
  {
    "refreshToken": "zzz",
    "provider": "Google"
  },
  {
    "refreshToken": "aaa",
    "provider": "Github"
  }
]' rows="10"></textarea>
              <p class="form-hint">
                格式：JSON 数组，每个对象包含 refreshToken（必填）、provider（BuilderId/Enterprise/Google/Github）、clientId、clientSecret、region（可选）
              </p>
            </div>
          </div>
          
          <div id="import-result" class="import-result" style="display: none;">
            <div class="result-box">
              <div class="result-title">导入结果</div>
              <p class="result-text" id="result-text"></p>
            </div>
          </div>
        </div>
      `,
      footer: `
        <button class="ui-btn ui-btn-secondary" onclick="window.closeAddAccountModal()">取消</button>
        <button class="ui-btn ui-btn-primary" id="submit-btn" onclick="window.submitAddAccount()">
          <span id="submit-text">验证并添加</span>
        </button>
      `,
      size: 'lg',
      closable: true
    })

    let currentMode: 'single' | 'batch' = 'single'
    let currentLoginType: string = 'BuilderId'
    let currentSocialProvider: string = 'Google'

    window.selectRegion = (region: string, displayText: string) => {
      const regionInput = document.getElementById('region') as HTMLInputElement
      const regionText = document.getElementById('region-text')
      if (regionInput) regionInput.value = region
      if (regionText) regionText.textContent = displayText
    }

    window.selectLoginType = (type: string) => {
      currentLoginType = type
      const buttons = document.querySelectorAll('.login-type-btn')
      buttons.forEach(btn => btn.classList.remove('active'))
      document.getElementById(`type-${type.toLowerCase()}`)?.classList.add('active')

      const socialProviderSection = document.getElementById('social-provider-section')
      const credentialsSection = document.getElementById('credentials-section')

      if (type === 'Social') {
        socialProviderSection!.style.display = 'block'
        credentialsSection!.style.display = 'none'
      } else {
        socialProviderSection!.style.display = 'none'
        credentialsSection!.style.display = 'block'
      }
    }

    window.selectSocialProvider = (provider: string) => {
      currentSocialProvider = provider
      const buttons = document.querySelectorAll('.provider-btn')
      buttons.forEach(btn => btn.classList.remove('active'))
      document.getElementById(`provider-${provider.toLowerCase()}`)?.classList.add('active')
    }

    window.switchImportMode = (mode: 'single' | 'batch') => {
      currentMode = mode
      const singleForm = document.getElementById('single-import-form')
      const batchForm = document.getElementById('batch-import-form')
      const singleBtn = document.getElementById('mode-single')
      const batchBtn = document.getElementById('mode-batch')
      const submitText = document.getElementById('submit-text')

      if (mode === 'single') {
        singleForm!.style.display = 'block'
        batchForm!.style.display = 'none'
        singleBtn!.classList.add('active')
        singleBtn!.classList.remove('inactive')
        batchBtn!.classList.remove('active')
        batchBtn!.classList.add('inactive')
        submitText!.textContent = '验证并添加'
      } else {
        singleForm!.style.display = 'none'
        batchForm!.style.display = 'block'
        singleBtn!.classList.remove('active')
        singleBtn!.classList.add('inactive')
        batchBtn!.classList.add('active')
        batchBtn!.classList.remove('inactive')
        submitText!.textContent = '批量导入'
      }
    }

    window.closeAddAccountModal = () => {
      window.UI?.modal.close(modal)
      delete window.closeAddAccountModal
      delete window.submitAddAccount
      delete window.switchImportMode
      delete window.selectRegion
      delete window.selectLoginType
      delete window.selectSocialProvider
    }

    window.submitAddAccount = async () => {
      const submitBtn = document.getElementById('submit-btn') as HTMLButtonElement
      const submitText = document.getElementById('submit-text')
      const resultDiv = document.getElementById('import-result')
      const resultText = document.getElementById('result-text')

      if (currentMode === 'single') {
        // 单个导入
        const refreshToken = (document.getElementById('refresh-token') as HTMLInputElement)?.value.trim()
        const clientId = (document.getElementById('client-id') as HTMLInputElement)?.value.trim()
        const clientSecret = (document.getElementById('client-secret') as HTMLInputElement)?.value.trim()
        const region = (document.getElementById('region') as HTMLInputElement)?.value

        if (!refreshToken) {
          window.UI?.toast.error('请填写 Refresh Token')
          return
        }

        // Social 登录不需要 clientId 和 clientSecret
        if (currentLoginType !== 'Social' && (!clientId || !clientSecret)) {
          window.UI?.toast.error('请填写所有必填项')
          return
        }

        submitBtn.disabled = true
        submitText!.textContent = '验证中...'

        try {
          // 确定 provider
          const provider = currentLoginType === 'Social' ? currentSocialProvider : currentLoginType
          
          const result = await (window as any).__TAURI__.core.invoke('verify_account_credentials', {
            refreshToken,
            clientId: currentLoginType === 'Social' ? '' : clientId,
            clientSecret: currentLoginType === 'Social' ? '' : clientSecret,
            region,
            authMethod: currentLoginType === 'Social' ? 'social' : 'IdC',
            provider
          })

          if (result.success && result.data) {
            const now = Date.now()
            accountStore.addAccount({
              email: result.data.email,
              nickname: result.data.email ? result.data.email.split('@')[0] : undefined,
              idp: provider as any,
              userId: result.data.user_id,
              credentials: {
                accessToken: result.data.access_token,
                csrfToken: '',
                refreshToken: result.data.refresh_token,
                clientId: currentLoginType === 'Social' ? '' : clientId,
                clientSecret: currentLoginType === 'Social' ? '' : clientSecret,
                region: region,
                expiresAt: result.data.expires_in ? now + result.data.expires_in * 1000 : now + 3600 * 1000,
                authMethod: currentLoginType === 'Social' ? 'social' : 'IdC',
                provider: provider
              },
              subscription: {
                type: result.data.subscription_type,
                title: result.data.subscription_title,
                daysRemaining: result.data.days_remaining,
                expiresAt: result.data.expires_at,
                managementTarget: result.data.subscription?.managementTarget,
                upgradeCapability: result.data.subscription?.upgradeCapability,
                overageCapability: result.data.subscription?.overageCapability
              },
              usage: {
                current: result.data.usage.current,
                limit: result.data.usage.limit,
                percentUsed: result.data.usage.limit > 0 ? result.data.usage.current / result.data.usage.limit : 0,
                lastUpdated: now,
                baseLimit: result.data.usage.baseLimit,
                baseCurrent: result.data.usage.baseCurrent,
                freeTrialLimit: result.data.usage.freeTrialLimit,
                freeTrialCurrent: result.data.usage.freeTrialCurrent,
                freeTrialExpiry: result.data.usage.freeTrialExpiry,
                bonuses: result.data.usage.bonuses,
                nextResetDate: result.data.next_reset_date,
                resourceDetail: result.data.usage.resourceDetail
              },
              groupId: undefined,
              tags: [],
              status: 'active',
              lastUsedAt: now
            })

            window.UI?.toast.success('账号添加成功')
            window.UI?.modal.close(modal)
            delete window.closeAddAccountModal
            delete window.submitAddAccount
            delete window.switchImportMode
            delete window.selectRegion
            delete window.selectLoginType
            delete window.selectSocialProvider
          } else {
            window.UI?.toast.error(result.error || '验证失败')
          }
        } catch (error) {
          window.UI?.toast.error('验证失败: ' + (error as Error).message)
        } finally {
          submitBtn.disabled = false
          submitText!.textContent = '验证并添加'
        }
      } else {
        // 批量导入
        const batchData = (document.getElementById('batch-credentials') as HTMLTextAreaElement)?.value.trim()

        if (!batchData) {
          window.UI?.toast.error('请输入批量凭证数据')
          return
        }

        let credentials: Array<{
          refreshToken: string
          clientId?: string
          clientSecret?: string
          region?: string
          provider?: string
        }>

        try {
          const parsed = JSON.parse(batchData)
          credentials = Array.isArray(parsed) ? parsed : [parsed]
        } catch {
          window.UI?.toast.error('JSON 格式错误')
          return
        }

        submitBtn.disabled = true
        submitText!.textContent = '导入中...'
        resultDiv!.style.display = 'none'

        let successCount = 0
        let failedCount = 0
        const errors: string[] = []

        for (let i = 0; i < credentials.length; i++) {
          const cred = credentials[i]
          
          if (!cred.refreshToken) {
            failedCount++
            errors.push(`#${i + 1}: 缺少 refreshToken`)
            continue
          }

          // 确定 provider 和 authMethod
          const provider = cred.provider || 'BuilderId'
          const isSocial = provider === 'Google' || provider === 'Github'
          const authMethod = isSocial ? 'social' : 'IdC'

          // 非社交登录需要 clientId 和 clientSecret
          if (!isSocial && (!cred.clientId || !cred.clientSecret)) {
            failedCount++
            errors.push(`#${i + 1}: ${provider} 登录需要 clientId 和 clientSecret`)
            continue
          }

          try {
            const result = await (window as any).__TAURI__.core.invoke('verify_account_credentials', {
              refreshToken: cred.refreshToken,
              clientId: cred.clientId || '',
              clientSecret: cred.clientSecret || '',
              region: cred.region || 'us-east-1',
              authMethod,
              provider
            })

            if (result.success && result.data) {
              const now = Date.now()
              accountStore.addAccount({
                email: result.data.email,
                nickname: result.data.email ? result.data.email.split('@')[0] : undefined,
                idp: provider as any,
                userId: result.data.user_id,
                credentials: {
                  accessToken: result.data.access_token,
                  csrfToken: '',
                  refreshToken: result.data.refresh_token,
                  clientId: cred.clientId || '',
                  clientSecret: cred.clientSecret || '',
                  region: cred.region || 'us-east-1',
                  expiresAt: result.data.expires_in ? now + result.data.expires_in * 1000 : now + 3600 * 1000,
                  authMethod,
                  provider
                },
                subscription: {
                  type: result.data.subscription_type,
                  title: result.data.subscription_title,
                  daysRemaining: result.data.days_remaining,
                  expiresAt: result.data.expires_at,
                  managementTarget: result.data.subscription?.managementTarget,
                  upgradeCapability: result.data.subscription?.upgradeCapability,
                  overageCapability: result.data.subscription?.overageCapability
                },
                usage: {
                  current: result.data.usage.current,
                  limit: result.data.usage.limit,
                  percentUsed: result.data.usage.limit > 0 ? result.data.usage.current / result.data.usage.limit : 0,
                  lastUpdated: now,
                  baseLimit: result.data.usage.baseLimit,
                  baseCurrent: result.data.usage.baseCurrent,
                  freeTrialLimit: result.data.usage.freeTrialLimit,
                  freeTrialCurrent: result.data.usage.freeTrialCurrent,
                  freeTrialExpiry: result.data.usage.freeTrialExpiry,
                  bonuses: result.data.usage.bonuses,
                  nextResetDate: result.data.next_reset_date,
                  resourceDetail: result.data.usage.resourceDetail
                },
                groupId: undefined,
                tags: [],
                status: 'active',
                lastUsedAt: now
              })
              successCount++
            } else {
              failedCount++
              errors.push(`#${i + 1}: ${result.error || '验证失败'}`)
            }
          } catch (error) {
            failedCount++
            errors.push(`#${i + 1}: ${(error as Error).message}`)
          }

          // 更新进度
          submitText!.textContent = `导入中... (${i + 1}/${credentials.length})`
        }

        // 显示结果
        resultDiv!.style.display = 'block'
        resultText!.textContent = `成功: ${successCount} 个，失败: ${failedCount} 个${errors.length > 0 ? '\n\n错误详情:\n' + errors.join('\n') : ''}`

        if (successCount > 0) {
          window.UI?.toast.success(`成功导入 ${successCount} 个账号`)
        }

        if (failedCount === 0) {
          setTimeout(() => {
            window.UI?.modal.close(modal)
            delete window.closeAddAccountModal
            delete window.submitAddAccount
            delete window.switchImportMode
            delete window.selectRegion
            delete window.selectLoginType
            delete window.selectSocialProvider
          }, 2000)
        }

        submitBtn.disabled = false
        submitText!.textContent = '批量导入'
      }
    }
  }

  private showEditAccountDialog(account: Account) {
    const modal = window.UI?.modal.open({
      title: '编辑账号',
      html: `
        <div class="modal-form">
          <div class="form-section">
            <label class="form-label">邮箱 <span class="required">*</span></label>
            <input type="email" class="form-input" id="edit-account-email" value="${account.email}" required>
          </div>
          <div class="form-row">
            <div class="form-section">
              <label class="form-label">昵称</label>
              <input type="text" class="form-input" id="edit-account-nickname" value="${account.nickname || ''}" placeholder="我的账号">
            </div>
            <div class="form-section">
              <label class="form-label">登录方式</label>
              <div class="ui-dropdown" style="width: 100%;">
                <button class="ui-btn ui-btn-secondary" data-dropdown style="width: 100%; justify-content: space-between;" id="edit-idp-btn">
                  <span id="edit-idp-text">${this.getIdpDisplayName(account.idp)}</span>
                  <span>▼</span>
                </button>
                <div class="ui-dropdown-menu" style="width: 100%;">
                  <button class="ui-dropdown-item" onclick="window.selectEditIdp('BuilderId', 'Builder ID')">Builder ID</button>
                  <button class="ui-dropdown-item" onclick="window.selectEditIdp('Enterprise', 'Enterprise')">Enterprise</button>
                  <button class="ui-dropdown-item" onclick="window.selectEditIdp('Google', 'Google')">Google</button>
                  <button class="ui-dropdown-item" onclick="window.selectEditIdp('Github', 'GitHub')">GitHub</button>
                </div>
              </div>
              <input type="hidden" id="edit-account-idp" value="${account.idp}">
            </div>
          </div>
          <div class="form-section">
            <label class="form-label">Access Token <span class="required">*</span></label>
            <textarea class="form-input form-textarea" id="edit-account-access-token" rows="3">${account.credentials.accessToken}</textarea>
          </div>
          <div class="form-section">
            <label class="form-label">Refresh Token</label>
            <textarea class="form-input form-textarea" id="edit-account-refresh-token" rows="3">${account.credentials.refreshToken || ''}</textarea>
          </div>
        </div>
      `,
      footer: `
        <button class="ui-btn ui-btn-secondary" onclick="window.closeEditAccountModal()">取消</button>
        <button class="ui-btn ui-btn-primary" onclick="window.submitEditAccount()">保存</button>
      `,
      size: 'lg',
      closable: true
    })

    window.selectEditIdp = (idp: string, displayName: string) => {
      const idpInput = document.getElementById('edit-account-idp') as HTMLInputElement
      const idpText = document.getElementById('edit-idp-text')
      if (idpInput) idpInput.value = idp
      if (idpText) idpText.textContent = displayName
    }

    window.closeEditAccountModal = () => {
      window.UI?.modal.close(modal)
      delete window.closeEditAccountModal
      delete window.submitEditAccount
      delete window.selectEditIdp
    }

    window.submitEditAccount = () => {
      const email = (document.getElementById('edit-account-email') as HTMLInputElement)?.value
      const nickname = (document.getElementById('edit-account-nickname') as HTMLInputElement)?.value
      const idp = (document.getElementById('edit-account-idp') as HTMLInputElement)?.value
      const accessToken = (document.getElementById('edit-account-access-token') as HTMLTextAreaElement)?.value
      const refreshToken = (document.getElementById('edit-account-refresh-token') as HTMLTextAreaElement)?.value

      if (!email || !accessToken) {
        window.UI?.toast.error('请填写必填项')
        return
      }

      accountStore.updateAccount(account.id, {
        email,
        nickname: nickname || undefined,
        idp: idp as any,
        credentials: {
          ...account.credentials,
          accessToken,
          refreshToken: refreshToken || undefined
        }
      })

      window.UI?.toast.success('账号更新成功')
      window.UI?.modal.close(modal)
      delete window.closeEditAccountModal
      delete window.submitEditAccount
      delete window.selectEditIdp
    }
  }

  private getIdpDisplayName(idp: string): string {
    const displayNames: Record<string, string> = {
      'BuilderId': 'Builder ID',
      'Enterprise': 'Enterprise',
      'Google': 'Google',
      'Github': 'GitHub'
    }
    return displayNames[idp] || idp
  }

  private deleteAccount(accountId: string) {
    const accounts = accountStore.getAccounts()
    const account = accounts.find(a => a.id === accountId)
    if (!account) return

    if (confirm(`确定要删除账号 ${account.email} 吗？`)) {
      accountStore.deleteAccount(accountId)
      this.selectedIds.delete(accountId)
      window.UI?.toast.success('账号已删除')
    }
  }

  private async handleBatchCheck() {
    const selectedAccounts = accountStore.getAccounts().filter(a => this.selectedIds.has(a.id))
    
    if (selectedAccounts.length === 0) {
      window.UI?.toast.warning('请先选择要检查的账号')
      return
    }

    window.UI?.toast.info(`正在检查 ${selectedAccounts.length} 个账号状态...`)
    
    let successCount = 0
    let failedCount = 0
    
    for (const account of selectedAccounts) {
      if (!account.credentials.refreshToken || !account.credentials.clientId || !account.credentials.clientSecret) {
        failedCount++
        accountStore.updateAccount(account.id, { status: 'error', lastError: '缺少凭证信息' })
        continue
      }

      try {
        // 只验证凭证是否有效，不更新详细信息
        const result = await (window as any).__TAURI__.core.invoke('verify_account_credentials', {
          refreshToken: account.credentials.refreshToken,
          clientId: account.credentials.clientId,
          clientSecret: account.credentials.clientSecret,
          region: account.credentials.region || 'us-east-1',
          authMethod: account.credentials.authMethod || 'IdC',
          provider: account.credentials.provider || account.idp
        })

        if (result.success) {
          accountStore.updateAccount(account.id, { 
            status: 'active',
            lastError: undefined
          })
          successCount++
        } else {
          accountStore.updateAccount(account.id, { 
            status: 'error',
            lastError: result.error || '验证失败'
          })
          failedCount++
        }
      } catch (error) {
        accountStore.updateAccount(account.id, { 
          status: 'error',
          lastError: (error as Error).message
        })
        failedCount++
      }
    }

    if (failedCount === 0) {
      window.UI?.toast.success(`检查完成：${successCount} 个账号状态正常`)
    } else {
      window.UI?.toast.warning(`检查完成：${successCount} 个正常，${failedCount} 个异常`)
    }
  }

  private async handleBatchRefresh() {
    const selectedAccounts = accountStore.getAccounts().filter(a => this.selectedIds.has(a.id))
    
    if (selectedAccounts.length === 0) {
      window.UI?.toast.warning('请先选择要刷新的账号')
      return
    }

    window.UI?.toast.info(`正在刷新 ${selectedAccounts.length} 个账号...`)
    
    let successCount = 0
    let failedCount = 0
    
    for (const account of selectedAccounts) {
      try {
        await this.refreshAccount(account)
        successCount++
      } catch (error) {
        failedCount++
      }
    }

    if (failedCount === 0) {
      window.UI?.toast.success(`刷新完成：${successCount} 个账号已更新`)
    } else {
      window.UI?.toast.warning(`刷新完成：${successCount} 个成功，${failedCount} 个失败`)
    }
  }

  private handleBatchDelete() {
    const selectedCount = this.selectedIds.size
    
    if (selectedCount === 0) {
      window.UI?.toast.warning('请先选择要删除的账号')
      return
    }

    if (confirm(`确定要删除选中的 ${selectedCount} 个账号吗？此操作不可恢复。`)) {
      this.selectedIds.forEach(id => {
        accountStore.deleteAccount(id)
      })
      this.selectedIds.clear()
      window.UI?.toast.success(`已删除 ${selectedCount} 个账号`)
      this.renderContent()
    }
  }

  private handleExport() {
    const accounts = accountStore.getAccounts()
    const selectedAccounts = this.selectedIds.size > 0 
      ? accounts.filter(a => this.selectedIds.has(a.id))
      : accounts

    if (selectedAccounts.length === 0) {
      window.UI?.toast.warning('没有可导出的账号')
      return
    }

    this.showExportDialog(selectedAccounts)
  }

  private showExportDialog(accounts: Account[]) {
    let selectedFormat: 'json' | 'txt' | 'csv' | 'clipboard' = 'json'
    let includeCredentials = true

    const updatePreview = () => {
      const formatDesc = document.getElementById('format-desc')
      const credentialsOption = document.getElementById('credentials-option')
      
      const descriptions = {
        json: '完整数据，可用于导入',
        txt: includeCredentials ? '可导入格式：邮箱,Token,昵称,登录方式' : '纯文本格式，每行一个账号',
        csv: includeCredentials ? '可导入格式，Excel 兼容' : 'Excel 兼容格式',
        clipboard: includeCredentials ? '可导入格式：邮箱,Token' : '复制到剪贴板'
      }
      
      if (formatDesc) formatDesc.textContent = descriptions[selectedFormat]
      if (credentialsOption) {
        credentialsOption.style.display = selectedFormat === 'json' ? 'flex' : 'none'
      }
    }

    const modal = window.UI?.modal.open({
      title: '导出账号',
      html: `
        <div class="export-dialog">
          <div class="export-count">
            ${this.selectedIds.size > 0 ? `${this.selectedIds.size} 个选中` : `全部 ${accounts.length} 个`}
          </div>
          
          <div class="export-formats">
            <button class="export-format-btn active" data-format="json">
              <div class="export-format-name">JSON</div>
              <div class="export-format-desc" id="format-desc">完整数据，可用于导入</div>
            </button>
            <button class="export-format-btn" data-format="txt">
              <div class="export-format-name">TXT</div>
              <div class="export-format-desc">可导入格式</div>
            </button>
            <button class="export-format-btn" data-format="csv">
              <div class="export-format-name">CSV</div>
              <div class="export-format-desc">Excel 兼容</div>
            </button>
            <button class="export-format-btn" data-format="clipboard">
              <div class="export-format-name">剪贴板</div>
              <div class="export-format-desc">复制到剪贴板</div>
            </button>
          </div>

          <div class="export-option" id="credentials-option">
            <label class="export-checkbox">
              <input type="checkbox" id="include-credentials" checked>
              <span class="export-checkbox-label">
                <div class="export-option-title">包含凭证信息</div>
                <div class="export-option-desc">包含 Token 等敏感数据，可用于完整导入</div>
              </span>
            </label>
          </div>
        </div>
      `,
      footer: `
        <button class="ui-btn ui-btn-secondary" onclick="window.closeExportDialog()">取消</button>
        <button class="ui-btn ui-btn-primary" onclick="window.submitExport()">
          <span id="export-btn-text">导出</span>
        </button>
      `,
      size: 'default',
      closable: true
    })

    // 格式选择
    const formatBtns = document.querySelectorAll('.export-format-btn')
    formatBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        formatBtns.forEach(b => b.classList.remove('active'))
        btn.classList.add('active')
        selectedFormat = (btn as HTMLElement).dataset.format as any
        updatePreview()
        
        const btnText = document.getElementById('export-btn-text')
        if (btnText) {
          btnText.textContent = selectedFormat === 'clipboard' ? '复制到剪贴板' : '导出'
        }
      })
    })

    // 凭证选项
    const credentialsCheckbox = document.getElementById('include-credentials') as HTMLInputElement
    if (credentialsCheckbox) {
      credentialsCheckbox.addEventListener('change', () => {
        includeCredentials = credentialsCheckbox.checked
        updatePreview()
      })
    }

    window.closeExportDialog = () => {
      window.UI?.modal.close(modal)
      delete window.closeExportDialog
      delete window.submitExport
    }

    window.submitExport = async () => {
      const content = this.generateExportContent(accounts, selectedFormat, includeCredentials)
      
      if (selectedFormat === 'clipboard') {
        await navigator.clipboard.writeText(content)
        window.UI?.toast.success('已复制到剪贴板')
        window.UI?.modal.close(modal)
        delete window.closeExportDialog
        delete window.submitExport
        return
      }

      const extensions = { json: 'json', txt: 'txt', csv: 'csv' }
      const ext = extensions[selectedFormat]
      const defaultFilename = `kiro-accounts-${new Date().toISOString().slice(0, 10)}.${ext}`
      
      try {
        // 使用 Tauri 的 save 对话框
        const filePath = await (window as any).__TAURI__.dialog.save({
          title: '导出账号数据',
          defaultPath: defaultFilename,
          filters: [{
            name: selectedFormat.toUpperCase(),
            extensions: [ext]
          }]
        })

        if (filePath) {
          // 写入文件
          await (window as any).__TAURI__.fs.writeTextFile(filePath, content)
          window.UI?.toast.success(`已导出 ${accounts.length} 个账号`)
          window.UI?.modal.close(modal)
          delete window.closeExportDialog
          delete window.submitExport
        }
      } catch (error) {
        window.UI?.toast.error('导出失败: ' + (error as Error).message)
      }
    }
  }

  private generateExportContent(accounts: Account[], format: string, includeCredentials: boolean): string {
    switch (format) {
      case 'json':
        const exportData = {
          version: '1.0',
          exportedAt: new Date().toISOString(),
          accounts: includeCredentials 
            ? accounts 
            : accounts.map(acc => ({
                ...acc,
                credentials: {
                  ...acc.credentials,
                  accessToken: '',
                  refreshToken: '',
                  csrfToken: ''
                }
              }))
        }
        return JSON.stringify(exportData, null, 2)

      case 'txt':
        if (includeCredentials) {
          return accounts.map(acc => 
            [
              acc.email,
              acc.credentials?.refreshToken || '',
              acc.nickname || '',
              acc.idp || 'BuilderId'
            ].join(',')
          ).join('\n')
        }
        return accounts.map(acc => {
          const lines = [
            `邮箱: ${acc.email}`,
            acc.nickname ? `昵称: ${acc.nickname}` : null,
            acc.idp ? `登录方式: ${acc.idp}` : null,
            acc.subscription?.title ? `订阅: ${acc.subscription.title}` : null,
            acc.usage ? `用量: ${acc.usage.current ?? 0}/${acc.usage.limit ?? 0}` : null,
          ].filter(Boolean)
          return lines.join('\n')
        }).join('\n\n---\n\n')

      case 'csv':
        const headers = includeCredentials 
          ? ['邮箱', '昵称', '登录方式', 'RefreshToken', 'ClientId', 'ClientSecret', 'Region']
          : ['邮箱', '昵称', '登录方式', '订阅类型', '订阅标题', '已用量', '总额度']
        const rows = accounts.map(acc => includeCredentials 
          ? [
              acc.email,
              acc.nickname || '',
              acc.idp || '',
              acc.credentials?.refreshToken || '',
              acc.credentials?.clientId || '',
              acc.credentials?.clientSecret || '',
              acc.credentials?.region || 'us-east-1'
            ]
          : [
              acc.email,
              acc.nickname || '',
              acc.idp || '',
              acc.subscription?.type || '',
              acc.subscription?.title || '',
              String(acc.usage?.current ?? ''),
              String(acc.usage?.limit ?? '')
            ]
        )
        return '\ufeff' + [headers, ...rows].map(row => 
          row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        ).join('\n')

      case 'clipboard':
        if (includeCredentials) {
          return accounts.map(acc => 
            `${acc.email},${acc.credentials?.refreshToken || ''}`
          ).join('\n')
        }
        return accounts.map(acc => 
          `${acc.email}${acc.nickname ? ` (${acc.nickname})` : ''} - ${acc.subscription?.title || '未知订阅'}`
        ).join('\n')

      default:
        return ''
    }
  }
}

declare global {
  interface Window {
    UI?: {
      toast: {
        show: (message: string) => void
        success: (message: string) => void
        error: (message: string) => void
        warning: (message: string) => void
        info: (message: string) => void
      }
      modal: {
        open: (options: {
          title: string
          content?: string
          html?: string
          size?: 'default' | 'lg' | 'xl'
          closable?: boolean
          showClose?: boolean
          footer?: string
          onClose?: () => void
        }) => any
        close: (modal?: any) => void
        closeAll: () => void
      }
    }
    closeAddAccountModal?: () => void
    submitAddAccount?: () => void
    closeEditAccountModal?: () => void
    submitEditAccount?: () => void
    selectEditIdp?: (idp: string, displayName: string) => void
    switchImportMode?: (mode: 'single' | 'batch') => void
    selectRegion?: (region: string, displayText: string) => void
    selectLoginType?: (type: string) => void
    selectSocialProvider?: (provider: string) => void
    closeExportDialog?: () => void
    submitExport?: () => void
    closeAccountDetailModal?: () => void
    copyAccountJson?: () => void
  }
}
