// 自动刷新服务
import { accountStore } from '../store'
import { refreshAccount, refreshTokenOnly } from '../actions/account-actions'

// 自动刷新配置
interface AutoRefreshConfig {
  enabled: boolean
  interval: number // 分钟
  syncInfo: boolean // 是否同步更新账号信息
  maxBatchSize: number // 单次最多刷新账号数量
  concurrency: number // 并发刷新数量
}

class AutoRefreshService {
  private config: AutoRefreshConfig = {
    enabled: false,
    interval: 5,
    syncInfo: true,
    maxBatchSize: 20,
    concurrency: 3
  }
  
  private timerId: ReturnType<typeof setInterval> | null = null
  private countdownTimerId: ReturnType<typeof setInterval> | null = null
  private nextCheckTime: number = 0
  private isRefreshing: boolean = false

  /**
   * 加载配置
   */
  loadConfig() {
    const saved = localStorage.getItem('autoRefreshConfig')
    if (saved) {
      const savedConfig = JSON.parse(saved)
      // 合并配置，保留默认值
      this.config = {
        ...this.config,
        ...savedConfig
      }
      console.log('[自动刷新] 加载配置:', this.config)
      
      // 如果配置中缺少新字段，保存一次以更新
      if (savedConfig.maxBatchSize === undefined || savedConfig.concurrency === undefined) {
        this.saveConfig()
        console.log('[自动刷新] 更新配置以包含新字段')
      }
    } else {
      console.log('[自动刷新] 使用默认配置:', this.config)
    }
  }

  /**
   * 保存配置
   */
  private saveConfig() {
    localStorage.setItem('autoRefreshConfig', JSON.stringify(this.config))
    console.log('[自动刷新] 保存配置:', this.config)
  }

  /**
   * 获取配置
   */
  getConfig(): AutoRefreshConfig {
    return { ...this.config }
  }

  /**
   * 设置自动刷新
   */
  setAutoRefresh(enabled: boolean, interval?: number) {
    console.log(`[自动刷新] 设置自动刷新: enabled=${enabled}, interval=${interval}`)
    
    this.config.enabled = enabled
    if (interval !== undefined) {
      this.config.interval = interval
    }
    this.saveConfig()

    if (enabled) {
      this.start()
    } else {
      this.stop()
    }
  }

  /**
   * 设置是否同步账号信息
   */
  setSyncInfo(enabled: boolean) {
    console.log(`[自动刷新] 设置同步账号信息: ${enabled}`)
    this.config.syncInfo = enabled
    this.saveConfig()
  }

  /**
   * 设置单次最多刷新账号数量
   */
  setMaxBatchSize(size: number) {
    if (size < 1 || size > 100) {
      console.error('[自动刷新] 无效的批量大小，必须在 1-100 之间')
      return
    }
    console.log(`[自动刷新] 设置单次最多刷新: ${size} 个`)
    this.config.maxBatchSize = size
    this.saveConfig()
  }

  /**
   * 设置并发刷新数量
   */
  setConcurrency(count: number) {
    if (count < 1 || count > 10) {
      console.error('[自动刷新] 无效的并发数量，必须在 1-10 之间')
      return
    }
    console.log(`[自动刷新] 设置并发刷新: ${count} 个`)
    this.config.concurrency = count
    this.saveConfig()
  }

  /**
   * 启动倒计时显示
   */
  private startCountdown() {
    // 清除旧的倒计时
    if (this.countdownTimerId) {
      window.clearInterval(this.countdownTimerId)
    }

    // 每秒更新一次倒计时
    this.countdownTimerId = setInterval(() => {
      const now = Date.now()
      const timeLeft = this.nextCheckTime - now
      
      if (timeLeft > 0) {
        const seconds = Math.floor(timeLeft / 1000)
        const minutes = Math.floor(seconds / 60)
        const remainingSeconds = seconds % 60
        
        if (minutes > 0) {
          console.log(`[自动刷新] 距离下次检查还有 ${minutes} 分 ${remainingSeconds} 秒`)
        } else {
          console.log(`[自动刷新] 距离下次检查还有 ${remainingSeconds} 秒`)
        }
      }
    }, 1000) as any
  }

  /**
   * 停止倒计时显示
   */
  private stopCountdown() {
    if (this.countdownTimerId) {
      clearInterval(this.countdownTimerId as any)
      this.countdownTimerId = null
    }
  }

  /**
   * 启动自动刷新
   */
  start() {
    console.log('[自动刷新] 准备启动服务...')
    
    if (this.timerId) {
      console.log('[自动刷新] 检测到已有定时器，先停止')
      this.stop()
    }

    const intervalMs = this.config.interval * 60 * 1000
    console.log(`[自动刷新] 检查间隔: ${this.config.interval} 分钟 (${intervalMs}ms)`)
    console.log(`[自动刷新] 同步账号信息: ${this.config.syncInfo ? '是' : '否'}`)

    // 立即执行一次
    console.log('[自动刷新] 立即执行首次检查')
    this.checkAndRefresh()

    // 设置下次检查时间
    this.nextCheckTime = Date.now() + intervalMs

    // 设置定时器
    this.timerId = setInterval(() => {
      console.log('[自动刷新] 定时器触发，开始检查')
      this.checkAndRefresh()
      // 更新下次检查时间
      this.nextCheckTime = Date.now() + intervalMs
    }, intervalMs) as any

    // 启动倒计时显示
    this.startCountdown()

    console.log(`[自动刷新] 服务已启动，定时器 ID: ${this.timerId}`)
  }

  /**
   * 停止自动刷新
   */
  stop() {
    if (this.timerId) {
      console.log(`[自动刷新] 停止服务，清除定时器 ID: ${this.timerId}`)
      clearInterval(this.timerId as any)
      this.timerId = null
    } else {
      console.log('[自动刷新] 服务未运行，无需停止')
    }
    
    // 停止倒计时
    this.stopCountdown()
  }

  /**
   * 检查并刷新即将过期的 Token
   */
  async checkAndRefresh() {
    // 防止并发执行
    if (this.isRefreshing) {
      console.log('[自动刷新] 上次检查尚未完成，跳过本次')
      return
    }

    this.isRefreshing = true
    const startTime = Date.now()
    console.log('[自动刷新] 开始检查')
    console.log(`[自动刷新] 检查时间: ${new Date().toLocaleString()}`)
    
    try {
      if (!this.config.enabled) {
        console.log('[自动刷新] 服务未启用，跳过检查')
        return
      }

      const accounts = accountStore.getAccounts()
      const now = Date.now()
      const threshold = 10 * 60 * 1000 // 10分钟

      console.log(`[自动刷新] 账号总数: ${accounts.length}`)
      console.log(`[自动刷新] 过期阈值: 10 分钟`)
      console.log(`[自动刷新] 刷新模式: ${this.config.syncInfo ? '完整刷新' : '仅刷新 Token'}`)

      let refreshCount = 0
      let skipCount = 0
      let normalCount = 0
      let failedCount = 0

      // 筛选需要刷新的账号
      const accountsToRefresh = accounts.filter(account => {
        if (account.status === 'suspended' || account.status === 'error') {
          skipCount++
          return false
        }
        
        if (!account.credentials.expiresAt) {
          skipCount++
          return false
        }
        
        const timeLeft = account.credentials.expiresAt - now
        if (timeLeft >= threshold) {
          normalCount++
          return false
        }
        
        return true
      })

      console.log(`[自动刷新] 需要刷新: ${accountsToRefresh.length} 个`)

      // 限制批量刷新数量
      if (accountsToRefresh.length > this.config.maxBatchSize) {
        console.log(`[自动刷新] 警告: 需要刷新的账号过多 (${accountsToRefresh.length})，限制为 ${this.config.maxBatchSize} 个`)
        accountsToRefresh.splice(this.config.maxBatchSize)
      }

      // 并发控制
      const batchSize = this.config.concurrency
      console.log(`[自动刷新] 并发数量: ${batchSize}`)
      
      for (let i = 0; i < accountsToRefresh.length; i += batchSize) {
        const batch = accountsToRefresh.slice(i, i + batchSize)
        await Promise.all(batch.map(async (account) => {
          const timeLeft = account.credentials.expiresAt! - now
          const timeLeftMinutes = Math.floor(timeLeft / 60000)
          const timeLeftSeconds = Math.floor((timeLeft % 60000) / 1000)

          const refreshMode = this.config.syncInfo ? '完整刷新' : '仅刷新 Token'
          const status = timeLeft <= 0 ? '已过期' : `剩余 ${timeLeftMinutes} 分 ${timeLeftSeconds} 秒`
          console.log(`[自动刷新] 账号 ${account.email}`)
          console.log(`[自动刷新]   Token 状态: ${status}`)
          console.log(`[自动刷新]   刷新模式: ${refreshMode}`)
          
          const beforeData = this.config.syncInfo ? {
            usage: { current: account.usage.current, limit: account.usage.limit, percent: account.usage.percentUsed },
            subscription: { type: account.subscription.type, daysRemaining: account.subscription.daysRemaining },
            status: account.status
          } : null
          
          try {
            if (this.config.syncInfo) {
              await refreshAccount(account)
              
              const updatedAccount = accountStore.getAccounts().find(a => a.id === account.id)
              if (updatedAccount && beforeData) {
                console.log(`[自动刷新]   结果: 成功`)
                console.log(`[自动刷新]   同步信息:`)
                console.log(`[自动刷新]     - 用量: ${beforeData.usage.current.toFixed(2)} → ${updatedAccount.usage.current.toFixed(2)} / ${updatedAccount.usage.limit}`)
                console.log(`[自动刷新]     - 使用率: ${(beforeData.usage.percent * 100).toFixed(2)}% → ${(updatedAccount.usage.percentUsed * 100).toFixed(2)}%`)
                console.log(`[自动刷新]     - 订阅: ${beforeData.subscription.type} → ${updatedAccount.subscription.type}`)
                if (updatedAccount.subscription.daysRemaining !== undefined) {
                  console.log(`[自动刷新]     - 剩余天数: ${beforeData.subscription.daysRemaining ?? '-'} → ${updatedAccount.subscription.daysRemaining} 天`)
                }
                console.log(`[自动刷新]     - 状态: ${beforeData.status} → ${updatedAccount.status}`)
                
                // 如果是当前激活账号，同步新 token 到本地缓存
                const activeAccountId = accountStore.getActiveAccountId()
                if (activeAccountId === account.id) {
                  console.log(`[自动刷新]   这是当前激活账号，同步新 token 到本地缓存`)
                  try {
                    const syncResult = await (window as any).__TAURI__.core.invoke('switch_account', {
                      accessToken: updatedAccount.credentials.accessToken,
                      refreshToken: updatedAccount.credentials.refreshToken,
                      clientId: updatedAccount.credentials.clientId || '',
                      clientSecret: updatedAccount.credentials.clientSecret || '',
                      region: updatedAccount.credentials.region || 'us-east-1',
                      startUrl: updatedAccount.credentials.startUrl,
                      authMethod: updatedAccount.credentials.authMethod || 'IdC',
                      provider: updatedAccount.credentials.provider || updatedAccount.idp
                    })
                    
                    // 如果后端返回了新 token，再次更新账号
                    if (syncResult.success && syncResult.access_token && syncResult.access_token !== updatedAccount.credentials.accessToken) {
                      console.log(`[自动刷新]   后端返回了新 token，再次更新账号`)
                      const now = Date.now()
                      accountStore.updateAccount(updatedAccount.id, {
                        credentials: {
                          ...updatedAccount.credentials,
                          accessToken: syncResult.access_token,
                          refreshToken: syncResult.refresh_token || updatedAccount.credentials.refreshToken,
                          expiresAt: syncResult.expires_in ? now + syncResult.expires_in * 1000 : updatedAccount.credentials.expiresAt
                        }
                      })
                    }
                  } catch (syncError) {
                    console.error(`[自动刷新]   同步 token 到本地缓存失败:`, syncError)
                  }
                }
              }
            } else {
              await refreshTokenOnly(account)
              console.log(`[自动刷新]   结果: 成功`)
              
              // 如果是当前激活账号，同步新 token 到本地缓存
              const activeAccountId = accountStore.getActiveAccountId()
              if (activeAccountId === account.id) {
                console.log(`[自动刷新]   这是当前激活账号，同步新 token 到本地缓存`)
                const updatedAccount = accountStore.getAccounts().find(a => a.id === account.id)
                if (updatedAccount) {
                  try {
                    const syncResult = await (window as any).__TAURI__.core.invoke('switch_account', {
                      accessToken: updatedAccount.credentials.accessToken,
                      refreshToken: updatedAccount.credentials.refreshToken,
                      clientId: updatedAccount.credentials.clientId || '',
                      clientSecret: updatedAccount.credentials.clientSecret || '',
                      region: updatedAccount.credentials.region || 'us-east-1',
                      startUrl: updatedAccount.credentials.startUrl,
                      authMethod: updatedAccount.credentials.authMethod || 'IdC',
                      provider: updatedAccount.credentials.provider || updatedAccount.idp
                    })
                    
                    // 如果后端返回了新 token，再次更新账号
                    if (syncResult.success && syncResult.access_token && syncResult.access_token !== updatedAccount.credentials.accessToken) {
                      console.log(`[自动刷新]   后端返回了新 token，再次更新账号`)
                      const now = Date.now()
                      accountStore.updateAccount(updatedAccount.id, {
                        credentials: {
                          ...updatedAccount.credentials,
                          accessToken: syncResult.access_token,
                          refreshToken: syncResult.refresh_token || updatedAccount.credentials.refreshToken,
                          expiresAt: syncResult.expires_in ? now + syncResult.expires_in * 1000 : updatedAccount.credentials.expiresAt
                        }
                      })
                    }
                  } catch (syncError) {
                    console.error(`[自动刷新]   同步 token 到本地缓存失败:`, syncError)
                  }
                }
              }
            }
            refreshCount++
          } catch (error) {
            console.error(`[自动刷新]   结果: 失败`, error)
            failedCount++
          }
        }))

        // 批次间延迟
        if (i + batchSize < accountsToRefresh.length) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }

      const duration = Date.now() - startTime
      console.log('[自动刷新] 检查完成')
      console.log(`[自动刷新] 统计: 刷新成功 ${refreshCount} 个, 失败 ${failedCount} 个, Token 正常 ${normalCount} 个, 跳过 ${skipCount} 个, 耗时 ${duration}ms`)
    } catch (error) {
      console.error('[自动刷新] 检查过程出错:', error)
    } finally {
      this.isRefreshing = false
    }
  }

  /**
   * 手动触发一次刷新
   */
  async triggerManual() {
    console.log('[自动刷新] 手动触发检查')
    await this.checkAndRefresh()
  }
}

export const autoRefreshService = new AutoRefreshService()
