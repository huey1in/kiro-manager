// K-Proxy 模块入口
import { app } from 'electron'
import * as path from 'path'
import { CertManager, createCertManager } from './certManager'
import { MitmProxy } from './mitmProxy'
import type { 
  KProxyConfig, 
  KProxyStats, 
  KProxyEvents,
  CACertInfo,
  DeviceIdMapping
} from './types'
import { DEFAULT_KPROXY_CONFIG } from './types'

// 导出类型
export * from './types'
export { CertManager } from './certManager'
export { MitmProxy } from './mitmProxy'

/**
 * K-Proxy 服务管理器
 */
export class KProxyService {
  private certManager: CertManager | null = null
  private mitmProxy: MitmProxy | null = null
  private config: KProxyConfig
  private events: KProxyEvents
  private deviceIdMappings: Map<string, DeviceIdMapping> = new Map()
  private dataPath: string
  private initialized: boolean = false
  private cachedCaInfo: CACertInfo | null = null

  constructor(config: Partial<KProxyConfig> = {}, events: KProxyEvents = {}) {
    this.config = { ...DEFAULT_KPROXY_CONFIG, ...config }
    this.events = events
    this.dataPath = path.join(app.getPath('userData'), 'kproxy')
  }

  /**
   * 初始化服务（只初始化一次）
   */
  async initialize(): Promise<CACertInfo> {
    // 如果已初始化，直接返回缓存的 CA 信息
    if (this.initialized && this.cachedCaInfo) {
      console.log('[KProxyService] Already initialized, returning cached CA info')
      return this.cachedCaInfo
    }

    // 初始化证书管理器
    this.certManager = createCertManager(this.dataPath)
    const caInfo = await this.certManager.initialize()

    // 初始化 MITM 代理
    this.mitmProxy = new MitmProxy(this.certManager, this.config, this.events)

    this.initialized = true
    this.cachedCaInfo = caInfo
    console.log('[KProxyService] Initialized')
    return caInfo
  }

  /**
   * 启动代理服务
   */
  async start(): Promise<void> {
    if (!this.mitmProxy) {
      await this.initialize()
    }
    await this.mitmProxy!.start()
    this.config.enabled = true
  }

  /**
   * 停止代理服务
   */
  async stop(): Promise<void> {
    if (this.mitmProxy) {
      await this.mitmProxy.stop()
    }
    this.config.enabled = false
  }

  /**
   * 重启代理服务
   */
  async restart(): Promise<void> {
    await this.stop()
    await this.start()
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<KProxyConfig>): void {
    this.config = { ...this.config, ...config }
    if (this.mitmProxy) {
      this.mitmProxy.updateConfig(this.config)
    }
  }

  /**
   * 获取配置
   */
  getConfig(): KProxyConfig {
    return { ...this.config }
  }

  /**
   * 获取统计信息
   */
  getStats(): KProxyStats | null {
    return this.mitmProxy?.getStats() || null
  }

  /**
   * 获取 CA 证书信息
   */
  getCACertInfo(): CACertInfo | null {
    return this.certManager?.getCACertInfo() || null
  }

  /**
   * 获取 CA 证书 PEM（用于导出/安装）
   */
  getCACertPem(): string | null {
    return this.certManager?.getCACertPem() || null
  }

  /**
   * 设置当前设备 ID
   */
  setDeviceId(deviceId: string): void {
    this.config.deviceId = deviceId
    if (this.mitmProxy) {
      this.mitmProxy.updateConfig({ deviceId })
    }
  }

  /**
   * 获取当前设备 ID
   */
  getDeviceId(): string | undefined {
    return this.config.deviceId
  }

  /**
   * 添加设备 ID 映射
   */
  addDeviceIdMapping(mapping: DeviceIdMapping): void {
    this.deviceIdMappings.set(mapping.accountId, mapping)
  }

  /**
   * 移除设备 ID 映射
   */
  removeDeviceIdMapping(accountId: string): void {
    this.deviceIdMappings.delete(accountId)
  }

  /**
   * 获取账号的设备 ID
   */
  getDeviceIdForAccount(accountId: string): string | undefined {
    return this.deviceIdMappings.get(accountId)?.deviceId
  }

  /**
   * 获取所有设备 ID 映射
   */
  getAllDeviceIdMappings(): DeviceIdMapping[] {
    return Array.from(this.deviceIdMappings.values())
  }

  /**
   * 切换到账号的设备 ID
   */
  switchToAccount(accountId: string): boolean {
    const mapping = this.deviceIdMappings.get(accountId)
    if (mapping) {
      this.setDeviceId(mapping.deviceId)
      mapping.lastUsed = Date.now()
      return true
    }
    return false
  }

  /**
   * 检查是否运行中
   */
  isRunning(): boolean {
    return this.mitmProxy?.isRunning() || false
  }

  /**
   * 重置统计
   */
  resetStats(): void {
    this.mitmProxy?.resetStats()
  }

  /**
   * 清除证书缓存
   */
  clearCertCache(): void {
    this.certManager?.clearCache()
  }
}

// 单例实例
let kproxyService: KProxyService | null = null

/**
 * 获取 K-Proxy 服务实例
 */
export function getKProxyService(): KProxyService | null {
  return kproxyService
}

/**
 * 初始化 K-Proxy 服务
 */
export function initKProxyService(
  config: Partial<KProxyConfig> = {},
  events: KProxyEvents = {}
): KProxyService {
  if (!kproxyService) {
    kproxyService = new KProxyService(config, events)
  }
  return kproxyService
}

/**
 * 生成随机设备 ID（64位十六进制）
 */
export function generateDeviceId(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * 验证设备 ID 格式
 */
export function isValidDeviceId(deviceId: string): boolean {
  return /^[a-f0-9]{64}$/i.test(deviceId)
}
