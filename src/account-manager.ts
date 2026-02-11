import type { Account } from './types'
import { accountStore } from './store'
import { renderCurrentAccount } from './renderers/current-account'
import { renderAccountsView } from './renderers/accounts-view'
import { renderSettingsView, attachSettingsEvents } from './renderers/settings-view'
import { renderMachineIdView } from './renderers/machine-id-view'
import { initMachineIdPage } from './handlers/machine-id-events'
import { showExportDialog } from './dialogs/export-dialog'
import { attachTitlebarEvents } from './handlers/titlebar-events'
import { attachAccountsEvents } from './handlers/accounts-events'
import { attachAccountCardEvents } from './handlers/account-card-events'
import { toggleSelection, updateSelectionUI } from './managers/selection-manager'
import { updateAccountList } from './managers/filter-manager'
import {
  autoImportCurrentAccount,
  handleAccountAction
} from './services/account-service'
import { autoRefreshService } from './services/auto-refresh-service'
import logoSvg from './assets/logo.svg'
import kiroIconSvg from './assets/kiro-icon.svg'

export class AccountManager {
  private container: HTMLElement
  private selectedIds: Set<string> = new Set()
  private isFilterExpanded: boolean = false
  private unsubscribe: (() => void) | null = null
  private syncInterval: NodeJS.Timeout | null = null

  constructor(container: HTMLElement) {
    this.container = container
  }

  async init() {
    await accountStore.loadAccounts()
    
    // 同步本地激活账号
    await accountStore.syncActiveAccountFromLocal()
    
    this.unsubscribe = accountStore.subscribe(() => {
      this.renderContent()
      // 账号数据或激活状态变化时更新当前账号显示
      this.updateCurrentAccountDisplay()
    })

    // 监听单个账号更新事件
    window.addEventListener('account-updated', this.handleAccountUpdate.bind(this))

    // 启动时自动导入当前活跃账号
    await this.autoImportCurrentAccount()

    // 初始化并启动自动刷新服务
    autoRefreshService.loadConfig()
    const config = autoRefreshService.getConfig()
    if (config.enabled) {
      autoRefreshService.start()
    }
    
    // 定期同步本地激活账号（每5秒检查一次）
    this.syncInterval = setInterval(() => {
      accountStore.syncActiveAccountFromLocal()
    }, 5000)
  }

  private updateCurrentAccountDisplay() {
    const activeAccountId = accountStore.getActiveAccountId()
    if (activeAccountId) {
      const accounts = accountStore.getAccounts()
      const activeAccount = accounts.find(a => a.id === activeAccountId)
      this.renderCurrentAccount(activeAccount || null)
    } else {
      this.renderCurrentAccount(null)
    }
  }

  private async autoImportCurrentAccount() {
    await autoImportCurrentAccount(
      (account) => this.renderCurrentAccount(account)
    )
  }

  private renderCurrentAccount(account?: Account | null) {
    renderCurrentAccount(this.container, account)
  }

  public destroy() {
    if (this.unsubscribe) {
      this.unsubscribe()
    }
    // 移除账号更新监听器
    window.removeEventListener('account-updated', this.handleAccountUpdate.bind(this))
    // 停止自动刷新服务
    autoRefreshService.stop()
    // 清除同步定时器
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
  }

  // 处理单个账号更新
  private handleAccountUpdate(event: Event) {
    const customEvent = event as CustomEvent<{ accountId: string }>
    const { accountId } = customEvent.detail
    
    // 只在账号管理视图时更新
    const activeView = this.container.querySelector('.sidebar-link.active')?.getAttribute('data-view')
    if (activeView !== 'accounts') return
    
    // 查找对应的账号卡片
    const cardElement = this.container.querySelector(`[data-account-id="${accountId}"]`)
    if (!cardElement) return
    
    // 获取更新后的账号数据
    const accounts = accountStore.getAccounts()
    const account = accounts.find(a => a.id === accountId)
    if (!account) return
    
    // 获取当前选中状态
    const isSelected = this.selectedIds.has(accountId)
    
    // 获取当前视图模式
    const settings = accountStore.getSettings()
    const viewMode = settings.viewMode
    
    // 重新渲染单个卡片
    import('./renderers/account-card').then(({ renderAccountCard, renderAccountListItem }) => {
      const newCardHtml = viewMode === 'grid' 
        ? renderAccountCard(account, isSelected)
        : renderAccountListItem(account, isSelected)
      
      // 替换卡片内容
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = newCardHtml
      const newCard = tempDiv.firstElementChild
      
      if (newCard) {
        cardElement.replaceWith(newCard)
        // 重新绑定事件
        this.attachAccountCardEvents()
      }
    })
  }

  public render() {
    const settings = accountStore.getSettings()
    const logoSrc = settings.customLogoPath || logoSvg
    const sidebarTitle = settings.sidebarTitle || 'Kiro Manager'
    
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
            ${settings.showSidebarLogo ? `<img src="${logoSrc}" alt="Logo" class="sidebar-logo" />` : ''}
            <h1 class="sidebar-title">${sidebarTitle}</h1>
          </div>
          <nav class="sidebar-nav">
            <button class="sidebar-link active" data-view="accounts">
              <svg class="sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>账号管理</span>
            </button>
            <button class="sidebar-link" data-view="machine-id">
              <svg class="sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
              </svg>
              <span>机器码管理</span>
            </button>
            <button class="sidebar-link" data-view="kiro-settings">
              <img src="${kiroIconSvg}" alt="Kiro" class="sidebar-icon" style="width: 20px; height: 20px;" />
              <span>Kiro 设置</span>
            </button>
            <button class="sidebar-link" data-view="proxy">
              <svg class="sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
              </svg>
              <span>API 反代</span>
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
    // DOM 渲染完成后更新当前账号显示
    this.updateCurrentAccountDisplay()
  }

  private attachTitlebarEvents() {
    attachTitlebarEvents(this.container, () => this.renderContent())
  }

  private renderContent() {
    const contentArea = this.container.querySelector('#content-area')
    if (!contentArea) return

    const activeView = this.container.querySelector('.sidebar-link.active')?.getAttribute('data-view') || 'accounts'

    if (activeView === 'accounts') {
      this.renderAccountsView(contentArea)
    } else if (activeView === 'machine-id') {
      this.renderMachineIdView(contentArea)
    } else if (activeView === 'kiro-settings') {
      this.renderKiroSettingsView(contentArea)
    } else if (activeView === 'proxy') {
      this.renderProxyView(contentArea)
    } else if (activeView === 'settings') {
      this.renderSettingsView(contentArea)
    }
  }

  private renderAccountsView(container: Element) {
    const settings = accountStore.getSettings()
    container.innerHTML = renderAccountsView(
      this.selectedIds,
      this.isFilterExpanded,
      settings.viewMode
    )

    this.attachAccountsEvents()
  }

  private async renderSettingsView(container: Element) {
    const html = await renderSettingsView()
    container.innerHTML = html
    attachSettingsEvents(container)
  }

  private renderMachineIdView(container: Element) {
    container.innerHTML = renderMachineIdView()
    // 初始化机器码页面
    initMachineIdPage()
  }

  private renderKiroSettingsView(container: Element) {
    import('./renderers/kiro-settings-view').then(({ renderKiroSettingsView, initKiroSettingsPage }) => {
      container.innerHTML = renderKiroSettingsView()
      initKiroSettingsPage(container as HTMLElement)
    })
  }

  private renderProxyView(container: Element) {
    import('./renderers/proxy-view').then(({ renderProxyView, initProxyPage }) => {
      container.innerHTML = renderProxyView()
      initProxyPage(container as HTMLElement)
    })
  }

  private attachAccountsEvents() {
    attachAccountsEvents(
      this.container,
      this.selectedIds,
      () => this.handleFilterToggle(),
      (mode) => this.handleViewModeChange(mode),
      () => this.handleExport(),
      () => this.updateAccountList(),
      () => this.updateSelectionUI(),
      () => this.attachAccountCardEvents()
    )
  }

  private attachAccountCardEvents() {
    attachAccountCardEvents(
      this.container,
      (accountId) => this.toggleSelection(accountId),
      (accountId, action) => this.handleAccountAction(accountId, action)
    )
  }

  private handleFilterToggle() {
    this.isFilterExpanded = !this.isFilterExpanded
    this.renderContent()
  }

  private handleViewModeChange(mode: 'grid' | 'list') {
    accountStore.setViewMode(mode)
    this.renderContent()
  }

  private toggleSelection(accountId: string) {
    toggleSelection(accountId, this.selectedIds, () => this.updateSelectionUI())
  }

  private updateSelectionUI() {
    updateSelectionUI(this.container, this.selectedIds)
  }

  private updateAccountList() {
    const settings = accountStore.getSettings()
    updateAccountList(
      this.container,
      this.selectedIds,
      settings.viewMode,
      () => this.attachAccountCardEvents()
    )
  }

  private async handleAccountAction(accountId: string, action: string) {
    await handleAccountAction(
      accountId,
      action,
      this.selectedIds
    )
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

    showExportDialog(selectedAccounts, this.selectedIds.size)
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
      theme: {
        get: () => string
        toggle: () => void
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
    
    // MCP 服务器对话框
    closeMcpServerDialog?: () => void
    submitMcpServer?: () => void
    
    // Steering 文件对话框
    closeSteeringFileDialog?: () => void
    submitSteeringFile?: () => void
    
    // JSON 编辑器对话框
    closeJsonEditorDialog?: () => void
    formatJson?: () => void
    submitJsonEditor?: () => void
    
    // 重命名对话框
    closeRenameDialog?: () => void
    submitRename?: () => void
    
    // 反代账号选择对话框
    selectAllProxyAccounts?: () => void
    deselectAllProxyAccounts?: () => void
    closeProxyAccountSelectDialog?: () => void
    confirmProxyAccountSelect?: () => void
    
    // Kiro 设置页面函数
    selectAgentAutonomy?: (value: string) => void
    selectConfigureMcp?: (value: string) => void
    addMcpServer?: () => void
    editMcpServer?: (name: string) => void
    deleteMcpServer?: (name: string) => void
    openUserMcpConfig?: () => void
    openWorkspaceMcpConfig?: () => void
    createSteeringFile?: () => void
    editSteeringFile?: (filename: string) => void
    renameSteeringFile?: (filename: string) => void
    openSteeringFile?: (filename: string) => void
    deleteSteeringFile?: (filename: string) => void
    openSteeringFolder?: () => void
    addTrustedCommand?: () => void
    removeTrustedCommand?: (index: number) => void
    addDenyCommand?: () => void
    removeDenyCommand?: (index: number) => void
    addDefaultDenyCommands?: () => void
  }
}
