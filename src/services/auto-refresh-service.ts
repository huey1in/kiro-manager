// 自动刷新服务
import { accountStore } from '../store'
import { refreshAccount, refreshTokenOnly } from '../actions/account-actions'

// 自动刷新配置
interface AutoRefreshConfig {
  enabled: boolean
  interval: number // 分钟
  syncInfo: boolean // 是否同步更新账户信息
}

class AutoRefreshService {
  private config: AutoRefreshConfig = {
    enabled: false,
    interval: 5,
    syncInfo: true
  }
  
  private timerId: number | null = null
  private countdownTimerId: number | null = null
  private nextCheckTime: number = 0

  /**
   * 加载配置
   */
  loadConfig() {
    const saved = localStorage.getItem('autoRefreshConfig')
    if (saved) {
      this.config = JSON.parse(saved)
      console.log('[自动刷新] 加载配置:', this.config)
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
   * 设置是否同步账户信息
   */
  setSyncInfo(enabled: boolean) {
    console.log(`[自动刷新] 设置同步账户信息: ${enabled}`)
    this.config.syncInfo = enabled
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
    this.countdownTimerId = window.setInterval(() => {
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
    }, 1000)
  }

  /**
   * 停止倒计时显示
   */
  private stopCountdown() {
    if (this.countdownTimerId) {
      window.clearInterval(this.countdownTimerId)
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
    console.log(`[自动刷新] 同步账户信息: ${this.config.syncInfo ? '是' : '否'}`)

    // 立即执行一次
    console.log('[自动刷新] 立即执行首次检查')
    this.checkAndRefresh()

    // 设置下次检查时间
    this.nextCheckTime = Date.now() + intervalMs

    // 设置定时器
    this.timerId = window.setInterval(() => {
      console.log('[自动刷新] 定时器触发，开始检查')
      this.checkAndRefresh()
      // 更新下次检查时间
      this.nextCheckTime = Date.now() + intervalMs
    }, intervalMs)

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
      window.clearInterval(this.timerId)
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
    const startTime = Date.now()
    console.log('[自动刷新] 开始检查')
    console.log(`[自动刷新] 检查时间: ${new Date().toLocaleString()}`)
    
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

    for (const account of accounts) {
      // 跳过已封禁或错误的账号
      if (account.status === 'suspended' || account.status === 'error') {
        console.log(`[自动刷新] 跳过账号 ${account.email} (状态: ${account.status})`)
        skipCount++
        continue
      }

      // 检查 Token 是否即将过期或已过期
      if (account.credentials.expiresAt) {
        const timeLeft = account.credentials.expiresAt - now
        const timeLeftMinutes = Math.floor(timeLeft / 60000)
        const timeLeftSeconds = Math.floor((timeLeft % 60000) / 1000)

        // 刷新即将过期（10分钟内）或已过期的 Token
        if (timeLeft < threshold) {
          const refreshMode = this.config.syncInfo ? '完整刷新' : '仅刷新 Token'
          const status = timeLeft <= 0 ? '已过期' : `剩余 ${timeLeftMinutes} 分 ${timeLeftSeconds} 秒`
          console.log(`[自动刷新] 账号 ${account.email}`)
          console.log(`[自动刷新]   Token 状态: ${status}`)
          console.log(`[自动刷新]   刷新模式: ${refreshMode}`)
          
          // 记录刷新前的数据（用于对比）
          const beforeData = this.config.syncInfo ? {
            usage: { current: account.usage.current, limit: account.usage.limit, percent: account.usage.percentUsed },
            subscription: { type: account.subscription.type, daysRemaining: account.subscription.daysRemaining },
            status: account.status
          } : null
          
          try {
            // 根据配置选择刷新方式
            if (this.config.syncInfo) {
              // 完整刷新：更新 Token、用量、订阅等所有信息
              await refreshAccount(account)
              
              // 刷新后获取最新数据
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
              }
            } else {
              // 只刷新 Token：仅更新 Token 和过期时间
              await refreshTokenOnly(account)
              console.log(`[自动刷新]   结果: 成功`)
            }
            refreshCount++
          } catch (error) {
            console.error(`[自动刷新]   结果: 失败`, error)
          }

          // 添加延迟避免请求过快
          await new Promise(resolve => setTimeout(resolve, 1000))
        } else {
          console.log(`[自动刷新] 账号 ${account.email} Token 正常 (剩余 ${timeLeftMinutes} 分 ${timeLeftSeconds} 秒)`)
          normalCount++
        }
      } else {
        console.log(`[自动刷新] 账号 ${account.email} 无 Token 过期时间`)
        skipCount++
      }
    }

    const duration = Date.now() - startTime
    console.log('[自动刷新] 检查完成')
    console.log(`[自动刷新] 统计: 刷新成功 ${refreshCount} 个, Token 正常 ${normalCount} 个, 跳过 ${skipCount} 个, 耗时 ${duration}ms`)
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
