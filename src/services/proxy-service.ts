// 反代服务前端服务
import type { ProxyConfig, ProxyAccount, ProxyStats, SessionStats, RequestLog } from '../types/proxy'

class ProxyService {
  /**
   * 启动代理服务器
   */
  async startServer(): Promise<void> {
    try {
      await (window as any).__TAURI__.core.invoke('start_proxy_server')
      console.log('[ProxyService] 服务器已启动')
    } catch (error) {
      console.error('[ProxyService] 启动失败:', error)
      throw error
    }
  }

  /**
   * 停止代理服务器
   */
  async stopServer(): Promise<void> {
    try {
      await (window as any).__TAURI__.core.invoke('stop_proxy_server')
      console.log('[ProxyService] 服务器已停止')
    } catch (error) {
      console.error('[ProxyService] 停止失败:', error)
      throw error
    }
  }

  /**
   * 获取服务器状态
   */
  async getStatus(): Promise<{
    running: boolean
    config: ProxyConfig | null
    stats: ProxyStats | null
    sessionStats: SessionStats | null
  }> {
    try {
      const result = await (window as any).__TAURI__.core.invoke('get_proxy_status')
      return result
    } catch (error) {
      console.error('[ProxyService] 获取状态失败:', error)
      throw error
    }
  }

  /**
   * 更新配置
   */
  async updateConfig(config: ProxyConfig): Promise<void> {
    try {
      await (window as any).__TAURI__.core.invoke('update_proxy_config', { config })
      console.log('[ProxyService] 配置已更新')
    } catch (error) {
      console.error('[ProxyService] 更新配置失败:', error)
      throw error
    }
  }

  /**
   * 同步账号
   */
  async syncAccounts(accounts: ProxyAccount[]): Promise<number> {
    try {
      const result = await (window as any).__TAURI__.core.invoke('sync_proxy_accounts', { accounts })
      console.log('[ProxyService] 账号已同步:', result.accountCount)
      return result.accountCount
    } catch (error) {
      console.error('[ProxyService] 同步账号失败:', error)
      throw error
    }
  }

  /**
   * 获取账号信息
   */
  async getAccounts(): Promise<{
    accounts: ProxyAccount[]
    availableCount: number
  }> {
    try {
      const result = await (window as any).__TAURI__.core.invoke('get_proxy_accounts')
      return result
    } catch (error) {
      console.error('[ProxyService] 获取账号失败:', error)
      throw error
    }
  }

  /**
   * 获取可用模型
   */
  async getModels(): Promise<{
    models: any[]
    fromCache: boolean
  }> {
    try {
      // 获取账号池中的所有账号
      const accountsInfo = await this.getAccounts()
      if (accountsInfo.accounts.length === 0) {
        throw new Error('账号池为空，请先同步账号')
      }

      // 使用第一个账号获取模型
      const firstAccount = accountsInfo.accounts[0]
      const result = await (window as any).__TAURI__.core.invoke('get_account_models', {
        accessToken: firstAccount.accessToken,
        region: firstAccount.region || 'us-east-1'
      })
      
      return {
        models: result.models || [],
        fromCache: false
      }
    } catch (error) {
      console.error('[ProxyService] 获取模型失败:', error)
      throw error
    }
  }

  /**
   * 获取日志
   */
  async getLogs(limit?: number): Promise<RequestLog[]> {
    try {
      const result = await (window as any).__TAURI__.core.invoke('get_proxy_logs', { limit })
      return result.logs
    } catch (error) {
      console.error('[ProxyService] 获取日志失败:', error)
      throw error
    }
  }

  /**
   * 重置统计
   */
  async resetStats(): Promise<void> {
    try {
      await (window as any).__TAURI__.core.invoke('reset_proxy_stats')
      console.log('[ProxyService] 统计已重置')
    } catch (error) {
      console.error('[ProxyService] 重置统计失败:', error)
      throw error
    }
  }
}

export const proxyService = new ProxyService()
