import type { Account } from './types'
import { accountStore } from './store'
import { renderCurrentAccount } from './renderers/current-account'
import { renderAccountsView } from './renderers/accounts-view'
import { renderSettingsView, attachSettingsEvents } from './renderers/settings-view'
import { showExportDialog } from './dialogs/export-dialog'
import { attachTitlebarEvents } from './handlers/titlebar-events'
import { attachAccountsEvents } from './handlers/accounts-events'
import { attachAccountCardEvents } from './handlers/account-card-events'
import { toggleSelection, updateSelectionUI } from './managers/selection-manager'
import { updateAccountList } from './managers/filter-manager'
import {
  checkAndUpdateCurrentAccount,
  autoImportCurrentAccount,
  updateCurrentAccountIfMatch,
  handleAccountAction
} from './services/account-service'
import { autoRefreshService } from './services/auto-refresh-service'
import logoSvg from './assets/logo.svg'

export class AccountManager {
  private container: HTMLElement
  private selectedIds: Set<string> = new Set()
  private isFilterExpanded: boolean = false
  private unsubscribe: (() => void) | null = null

  constructor(container: HTMLElement) {
    this.container = container
  }

  async init() {
    await accountStore.loadAccounts()
    this.unsubscribe = accountStore.subscribe(() => {
      this.renderContent()
      // 账号数据更新时，检查并更新当前账号显示
      this.checkAndUpdateCurrentAccount()
    })

    // 启动时自动导入当前活跃账号
    await this.autoImportCurrentAccount()

    // 初始化并启动自动刷新服务
    autoRefreshService.loadConfig()
    const config = autoRefreshService.getConfig()
    if (config.enabled) {
      autoRefreshService.start()
    }
  }

  private async checkAndUpdateCurrentAccount() {
    await checkAndUpdateCurrentAccount(
      (account) => this.renderCurrentAccount(account)
    )
  }

  private async autoImportCurrentAccount() {
    await autoImportCurrentAccount(
      (account) => this.renderCurrentAccount(account),
      (accountId) => this.updateCurrentAccountIfMatch(accountId)
    )
  }

  private renderCurrentAccount(account?: Account | null) {
    renderCurrentAccount(this.container, account)
  }

  private async updateCurrentAccountIfMatch(accountId: string) {
    await updateCurrentAccountIfMatch(
      accountId,
      (account) => this.renderCurrentAccount(account)
    )
  }

  public destroy() {
    if (this.unsubscribe) {
      this.unsubscribe()
    }
    // 停止自动刷新服务
    autoRefreshService.stop()
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
    // 初始化完成后再检查当前账号
    this.checkAndUpdateCurrentAccount()
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

  private renderSettingsView(container: Element) {
    container.innerHTML = renderSettingsView()
    attachSettingsEvents(container)
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
      () => this.attachAccountCardEvents(),
      (accountId) => this.updateCurrentAccountIfMatch(accountId)
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
      this.selectedIds,
      (accountId) => this.updateCurrentAccountIfMatch(accountId)
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
  }
}
