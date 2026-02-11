// 反代服务视图渲染器
import type { ProxyConfig, ProxyStats, SessionStats } from '../types/proxy'
import { proxyService } from '../services/proxy-service'
import { accountStore } from '../store'
import type { Account } from '../types'
import { showProxyAccountSelectDialog } from '../dialogs/proxy-account-select-dialog'
import { showApiKeysDialog } from '../dialogs/api-keys-dialog'
import { showProxyModelsDialog } from '../dialogs/proxy-models-dialog'

export function renderProxyView(): string {
  return `
    <div class="settings-page">
      <div id="proxy-error" class="error-message" style="display: none;"></div>
      <div id="proxy-loading" class="loading-container" style="display: flex; justify-content: center; align-items: center; padding: 40px;">
        <div style="text-align: center; color: var(--text-muted);">加载中...</div>
      </div>
      <div id="proxy-content" style="display: none;"></div>
    </div>
  `
}

/**
 * 渲染反代内容
 */
export function renderProxyContent(
  isRunning: boolean,
  config: ProxyConfig,
  stats: ProxyStats | null,
  sessionStats: SessionStats | null,
  accountCount: number,
  availableCount: number
): string {
  return `
    ${renderStatusSection(isRunning, config)}
    ${renderStatsSection(stats, sessionStats, accountCount, availableCount)}
    ${renderAccountsSection(config)}
    ${renderManagementSection()}
  `
}

/**
 * 渲染状态部分
 */
function renderStatusSection(isRunning: boolean, config: ProxyConfig): string {
  const statusColor = isRunning ? 'var(--success-color)' : 'var(--text-muted)'
  const statusText = isRunning ? '运行中' : '已停止'
  const buttonText = isRunning ? '停止服务' : '启动服务'
  const buttonClass = isRunning ? 'ui-btn-danger' : 'ui-btn-primary'

  return `
    <div class="settings-section">
      <h3 class="settings-section-title">服务状态</h3>
      
      <div class="settings-item">
        <div class="settings-item-info">
          <div class="settings-item-label">当前状态</div>
          <div class="settings-item-desc" style="color: ${statusColor}; font-weight: 500;">${statusText}</div>
        </div>
        <button class="ui-btn ${buttonClass}" id="toggle-server">${buttonText}</button>
      </div>

      <div class="settings-item">
        <div class="settings-item-info">
          <div class="settings-item-label">服务地址</div>
          <div class="settings-item-desc">
            <code style="padding: 4px 8px; background: var(--slate-50); border-radius: 4px;">
              http://${config.host}:${config.port}
            </code>
          </div>
        </div>
        <button class="ui-btn ui-btn-secondary ui-btn-sm" id="copy-address">复制地址</button>
      </div>
    </div>
  `
}

/**
 * 渲染统计部分
 */
function renderStatsSection(stats: ProxyStats | null, sessionStats: SessionStats | null, accountCount: number, availableCount: number): string {
  if (!stats) {
    return ''
  }

  const successRate = stats.totalRequests > 0
    ? ((stats.successRequests / stats.totalRequests) * 100).toFixed(1)
    : '0.0'

  const suspendedCount = accountCount - availableCount

  return `
    <div class="settings-section">
      <h3 class="settings-section-title">统计信息</h3>
      
      <div class="settings-item">
        <div class="settings-item-info">
          <div class="settings-item-label">账号池状态</div>
          <div class="settings-item-desc" style="display: flex; gap: 24px; flex-wrap: wrap; margin-top: 8px;">
            <span>
              <span style="color: var(--text-muted); font-size: 12px;">总账号:</span>
              <span style="color: var(--text-main); font-weight: 600; margin-left: 4px;" id="account-pool-total">${accountCount}</span>
            </span>
            <span>
              <span style="color: var(--text-muted); font-size: 12px;">可用:</span>
              <span style="color: var(--success-color); font-weight: 600; margin-left: 4px;" id="account-pool-available">${availableCount}</span>
            </span>
            <span>
              <span style="color: var(--text-muted); font-size: 12px;">封禁:</span>
              <span style="color: var(--error-color); font-weight: 600; margin-left: 4px;" id="account-pool-suspended">${suspendedCount}</span>
            </span>
          </div>
        </div>
      </div>
      
      <div class="settings-item">
        <div class="settings-item-info">
          <div class="settings-item-label">累计统计</div>
          <div class="settings-item-desc" style="display: flex; gap: 24px; flex-wrap: wrap; margin-top: 8px;">
            <span>
              <span style="color: var(--text-muted); font-size: 12px;">总请求:</span>
              <span style="color: var(--text-main); font-weight: 600; margin-left: 4px;" id="stat-total-requests">${stats.totalRequests}</span>
            </span>
            <span>
              <span style="color: var(--text-muted); font-size: 12px;">成功率:</span>
              <span style="color: var(--text-main); font-weight: 600; margin-left: 4px;" id="stat-success-rate">${successRate}%</span>
            </span>
            <span>
              <span style="color: var(--text-muted); font-size: 12px;">总 Tokens:</span>
              <span style="color: var(--text-main); font-weight: 600; margin-left: 4px;" id="stat-total-tokens">${stats.totalTokens.toLocaleString()}</span>
            </span>
            <span>
              <span style="color: var(--text-muted); font-size: 12px;">总 Credits:</span>
              <span style="color: var(--text-main); font-weight: 600; margin-left: 4px;" id="stat-total-credits">${stats.totalCredits.toFixed(2)}</span>
            </span>
          </div>
        </div>
        <button class="ui-btn ui-btn-secondary ui-btn-sm" id="reset-stats">重置统计</button>
      </div>

      ${sessionStats ? `
        <div class="settings-item">
          <div class="settings-item-info">
            <div class="settings-item-label">本次会话</div>
            <div class="settings-item-desc" style="display: flex; gap: 24px; flex-wrap: wrap; margin-top: 8px;">
              <span>
                <span style="color: var(--text-muted); font-size: 12px;">请求数:</span>
                <span style="color: var(--text-main); font-weight: 600; margin-left: 4px;" id="stat-session-total">${sessionStats.totalRequests}</span>
              </span>
              <span>
                <span style="color: var(--text-muted); font-size: 12px;">成功:</span>
                <span style="color: var(--success-color); font-weight: 600; margin-left: 4px;" id="stat-session-success">${sessionStats.successRequests}</span>
              </span>
              <span>
                <span style="color: var(--text-muted); font-size: 12px;">失败:</span>
                <span style="color: var(--error-color); font-weight: 600; margin-left: 4px;" id="stat-session-failed">${sessionStats.failedRequests}</span>
              </span>
            </div>
          </div>
          <button class="ui-btn ui-btn-secondary ui-btn-sm" id="view-logs">查看日志</button>
        </div>
      ` : ''}
    </div>
  `
}

/**
 * 渲染账号部分
 */
function renderAccountsSection(config: ProxyConfig): string {
  return `
    <div class="settings-section">
      <h3 class="settings-section-title">账号管理</h3>

      <div class="settings-item">
        <div class="settings-item-info">
          <div class="settings-item-label">选择反代账号</div>
          <div class="settings-item-desc" id="selected-accounts-display">
            ${config.selectedAccountIds.length > 0 
              ? `已选择 ${config.selectedAccountIds.length} 个账号` 
              : '未选择账号（将使用所有可用账号）'}
          </div>
        </div>
        <button class="ui-btn ui-btn-secondary" id="select-accounts">选择账号</button>
      </div>
    </div>
  `
}

/**
 * 渲染管理部分
 */
function renderManagementSection(): string {
  return `
    <div class="settings-section">
      <h3 class="settings-section-title">模型管理</h3>
      
      <div class="settings-item">
        <div class="settings-item-info">
          <div class="settings-item-label">可用模型</div>
          <div class="settings-item-desc">查看账号池内所有账号的可用模型列表</div>
        </div>
        <button class="ui-btn ui-btn-secondary" id="view-models">查看模型</button>
      </div>
    </div>

    <div class="settings-section">
      <h3 class="settings-section-title">API Key 管理</h3>
      
      <div class="settings-item">
        <div class="settings-item-info">
          <div class="settings-item-label">API Keys</div>
          <div class="settings-item-desc">管理用于访问代理服务的 API Keys</div>
        </div>
        <button class="ui-btn ui-btn-secondary" id="manage-api-keys">管理 Keys</button>
      </div>
    </div>
  `
}

/**
 * 初始化反代页面
 */
export async function initProxyPage(container: HTMLElement) {
  let currentConfig: ProxyConfig | null = null
  let isRunning = false
  let syncInterval: number | null = null

  // 同步账号状态到账号池
  async function syncAccountStatus() {
    if (!currentConfig || currentConfig.selectedAccountIds.length === 0) {
      return
    }

    try {
      const allAccounts = accountStore.getAccounts()
      const selectedAccounts = allAccounts.filter(acc => 
        currentConfig!.selectedAccountIds.includes(acc.id)
      )
      
      const proxyAccounts = selectedAccounts
        .filter(acc => acc.credentials.accessToken)
        .map(acc => ({
          id: acc.id,
          email: acc.email,
          accessToken: acc.credentials.accessToken,
          refreshToken: acc.credentials.refreshToken,
          expiresAt: acc.credentials.expiresAt,
          clientId: acc.credentials.clientId,
          clientSecret: acc.credentials.clientSecret,
          region: acc.credentials.region,
          authMethod: acc.credentials.authMethod,
          isAvailable: acc.status !== 'suspended' && acc.status !== 'error',
          lastUsed: 0,
          requestCount: 0,
          errorCount: 0
        }))
      
      if (proxyAccounts.length > 0) {
        await proxyService.syncAccounts(proxyAccounts)
        
        // 更新显示
        const accountsInfo = await proxyService.getAccounts()
        const status = await proxyService.getStatus()
        updateStatsDisplay(
          status.stats!,
          status.sessionStats,
          accountsInfo.accounts.length,
          accountsInfo.availableCount
        )
      }
    } catch (error) {
      console.error('[Proxy] 同步账号状态失败:', error)
    }
  }

  // 更新统计信息显示
  function updateStatsDisplay(stats: ProxyStats, sessionStats: SessionStats | null, accountCount: number, availableCount: number) {
    // 更新账号池状态
    const poolTotalEl = container.querySelector('#account-pool-total')
    const poolAvailableEl = container.querySelector('#account-pool-available')
    const poolSuspendedEl = container.querySelector('#account-pool-suspended')
    if (poolTotalEl) poolTotalEl.textContent = accountCount.toString()
    if (poolAvailableEl) poolAvailableEl.textContent = availableCount.toString()
    if (poolSuspendedEl) poolSuspendedEl.textContent = (accountCount - availableCount).toString()
    
    // 更新累计统计
    const totalRequestsEl = container.querySelector('#stat-total-requests')
    const successRateEl = container.querySelector('#stat-success-rate')
    const totalTokensEl = container.querySelector('#stat-total-tokens')
    const totalCreditsEl = container.querySelector('#stat-total-credits')
    
    if (totalRequestsEl) totalRequestsEl.textContent = stats.totalRequests.toString()
    if (successRateEl) {
      const rate = stats.totalRequests > 0 
        ? ((stats.successRequests / stats.totalRequests) * 100).toFixed(1)
        : '0.0'
      successRateEl.textContent = `${rate}%`
    }
    if (totalTokensEl) totalTokensEl.textContent = stats.totalTokens.toLocaleString()
    if (totalCreditsEl) totalCreditsEl.textContent = stats.totalCredits.toFixed(2)
    
    // 更新会话统计
    if (sessionStats) {
      const sessionTotalEl = container.querySelector('#stat-session-total')
      const sessionSuccessEl = container.querySelector('#stat-session-success')
      const sessionFailedEl = container.querySelector('#stat-session-failed')
      
      if (sessionTotalEl) sessionTotalEl.textContent = sessionStats.totalRequests.toString()
      if (sessionSuccessEl) sessionSuccessEl.textContent = sessionStats.successRequests.toString()
      if (sessionFailedEl) sessionFailedEl.textContent = sessionStats.failedRequests.toString()
    }
  }
  function updateSelectedAccountsDisplay(selectedCount: number) {
    const displayEl = container.querySelector('#selected-accounts-display')
    if (displayEl) {
      displayEl.textContent = selectedCount > 0 
        ? `已选择 ${selectedCount} 个账号` 
        : '未选择账号（将使用所有可用账号）'
    }
  }

  // 加载状态
  async function loadStatus() {
    const loadingEl = container.querySelector('#proxy-loading') as HTMLElement
    const contentEl = container.querySelector('#proxy-content') as HTMLElement
    const errorEl = container.querySelector('#proxy-error') as HTMLElement

    loadingEl.style.display = 'flex'
    contentEl.style.display = 'none'
    errorEl.style.display = 'none'

    try {
      const status = await proxyService.getStatus()
      
      // 如果有选中的账号，同步最新状态到账号池
      if (status.config && status.config.selectedAccountIds.length > 0) {
        await syncAccountStatus()
      }
      
      const accountsInfo = await proxyService.getAccounts()

      isRunning = status.running
      currentConfig = status.config || {
        enabled: false,
        port: 5580,
        host: '127.0.0.1',
        enableMultiAccount: true,
        selectedAccountIds: [],
        logRequests: true
      }

      contentEl.innerHTML = renderProxyContent(
        isRunning,
        currentConfig,
        status.stats,
        status.sessionStats,
        accountsInfo.accounts.length,
        accountsInfo.availableCount
      )
      contentEl.style.display = 'block'
      loadingEl.style.display = 'none'

      bindEvents()
    } catch (error) {
      errorEl.textContent = '加载反代服务失败: ' + (error as Error).message
      errorEl.style.display = 'block'
      loadingEl.style.display = 'none'
    }
  }

  // 保存配置
  async function saveConfig() {
    if (!currentConfig) return

    try {
      await proxyService.updateConfig(currentConfig)
    } catch (error) {
      window.UI?.toast.error('保存配置失败: ' + (error as Error).message)
    }
  }

  // 绑定事件
  function bindEvents() {
    // 启动/停止服务
    const toggleBtn = container.querySelector('#toggle-server') as HTMLButtonElement
    toggleBtn?.addEventListener('click', async () => {
      toggleBtn.disabled = true
      try {
        if (isRunning) {
          await proxyService.stopServer()
          window.UI?.toast.success('服务已停止')
        } else {
          await proxyService.startServer()
          window.UI?.toast.success('服务已启动')
        }
        await loadStatus()
      } catch (error) {
        window.UI?.toast.error((error as Error).message)
      } finally {
        toggleBtn.disabled = false
      }
    })

    // 复制地址
    const copyBtn = container.querySelector('#copy-address') as HTMLButtonElement
    copyBtn?.addEventListener('click', () => {
      if (currentConfig) {
        const address = `http://${currentConfig.host}:${currentConfig.port}`
        navigator.clipboard.writeText(address)
        window.UI?.toast.success('地址已复制')
      }
    })

    // 选择账号
    const selectAccountsBtn = container.querySelector('#select-accounts') as HTMLButtonElement
    selectAccountsBtn?.addEventListener('click', () => {
      if (currentConfig) {
        showProxyAccountSelectDialog(currentConfig.selectedAccountIds, async (selectedIds) => {
          if (currentConfig) {
            currentConfig.selectedAccountIds = selectedIds
            await saveConfig()
            
            // 根据选择的账号 ID 同步到代理池
            const allAccounts = accountStore.getAccounts()
            const selectedAccounts = selectedIds.length > 0
              ? allAccounts.filter(acc => selectedIds.includes(acc.id))
              : allAccounts // 如果没有选择，使用所有账号
            
            const proxyAccounts = selectedAccounts
              .filter(acc => acc.credentials.accessToken) // 必须有 token
              .map(acc => ({
                id: acc.id,
                email: acc.email,
                accessToken: acc.credentials.accessToken,
                refreshToken: acc.credentials.refreshToken,
                expiresAt: acc.credentials.expiresAt,
                clientId: acc.credentials.clientId,
                clientSecret: acc.credentials.clientSecret,
                region: acc.credentials.region,
                authMethod: acc.credentials.authMethod,
                isAvailable: acc.status !== 'suspended' && acc.status !== 'error', // 排除封禁和错误状态
                lastUsed: 0,
                requestCount: 0,
                errorCount: 0
              }))
            
            await proxyService.syncAccounts(proxyAccounts)
            
            // 获取更新后的账号池信息
            const accountsInfo = await proxyService.getAccounts()
            
            // 局部更新显示
            updateSelectedAccountsDisplay(selectedIds.length)
            updateStatsDisplay(
              (await proxyService.getStatus()).stats!,
              (await proxyService.getStatus()).sessionStats,
              accountsInfo.accounts.length,
              accountsInfo.availableCount
            )
            window.UI?.toast.success(`已选择 ${selectedIds.length} 个账号，账号池已更新`)
          }
        })
      }
    })

    // 重置统计
    const resetStatsBtn = container.querySelector('#reset-stats') as HTMLButtonElement
    resetStatsBtn?.addEventListener('click', async () => {
      resetStatsBtn.disabled = true
      try {
        await proxyService.resetStats()
        window.UI?.toast.success('统计已重置')
        
        // 局部更新统计显示
        const status = await proxyService.getStatus()
        if (status.stats) {
          const accountsInfo = await proxyService.getAccounts()
          updateStatsDisplay(status.stats, status.sessionStats, accountsInfo.accounts.length, accountsInfo.availableCount)
        }
      } catch (error) {
        window.UI?.toast.error('重置失败')
      } finally {
        resetStatsBtn.disabled = false
      }
    })

    // 查看模型
    const viewModelsBtn = container.querySelector('#view-models') as HTMLButtonElement
    viewModelsBtn?.addEventListener('click', async () => {
      viewModelsBtn.disabled = true
      try {
        const result = await proxyService.getModels()
        showProxyModelsDialog(result.models, result.fromCache)
      } catch (error) {
        window.UI?.toast.error('获取模型失败: ' + (error as Error).message)
      } finally {
        viewModelsBtn.disabled = false
      }
    })

    // 管理 API Keys
    const manageApiKeysBtn = container.querySelector('#manage-api-keys') as HTMLButtonElement
    manageApiKeysBtn?.addEventListener('click', () => {
      if (currentConfig) {
        showApiKeysDialog(currentConfig.apiKeys || [], async (updatedKeys) => {
          if (currentConfig) {
            currentConfig.apiKeys = updatedKeys
            await saveConfig()
            window.UI?.toast.success('API Keys 已更新')
          }
        })
      }
    })

    // 查看日志
    const viewLogsBtn = container.querySelector('#view-logs') as HTMLButtonElement
    viewLogsBtn?.addEventListener('click', () => {
      window.UI?.toast.info('日志功能开发中')
    })
  }

  // 初始加载
  await loadStatus()
  
  // 启动定时同步（每 30 秒检查一次账号状态）
  syncInterval = window.setInterval(() => {
    syncAccountStatus()
  }, 30000)
  
  // 页面卸载时清理定时器
  const cleanup = () => {
    if (syncInterval !== null) {
      window.clearInterval(syncInterval)
      syncInterval = null
    }
  }
  
  // 监听页面切换事件
  window.addEventListener('beforeunload', cleanup)
  
  // 返回清理函数供外部调用
  return cleanup
}
