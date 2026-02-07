// K-Proxy 类型定义

/**
 * K-Proxy 配置
 */
export interface KProxyConfig {
  enabled: boolean
  port: number
  host: string
  // MITM 白名单域名
  mitmDomains: string[]
  // 当前使用的设备 ID
  deviceId?: string
  // 是否自动启动
  autoStart: boolean
  // 日志记录
  logRequests: boolean
  // CA 证书路径
  caPath?: string
  // CA 私钥路径
  caKeyPath?: string
}

/**
 * K-Proxy 统计信息
 */
export interface KProxyStats {
  totalRequests: number
  mitmRequests: number
  bypassRequests: number
  modifiedRequests: number
  startTime: number
  lastRequestTime: number
}

/**
 * K-Proxy 事件回调
 */
export interface KProxyEvents {
  onRequest?: (info: KProxyRequestInfo) => void
  onResponse?: (info: KProxyResponseInfo) => void
  onError?: (error: Error) => void
  onStatusChange?: (running: boolean, port: number) => void
  onMitmIntercept?: (host: string, modified: boolean) => void
}

/**
 * 请求信息
 */
export interface KProxyRequestInfo {
  timestamp: number
  method: string
  host: string
  path: string
  isMitm: boolean
  deviceIdReplaced: boolean
  originalDeviceId?: string
  newDeviceId?: string
}

/**
 * 响应信息
 */
export interface KProxyResponseInfo {
  timestamp: number
  host: string
  statusCode: number
  duration: number
}

/**
 * CA 证书信息
 */
export interface CACertInfo {
  certPath: string
  keyPath: string
  certPem: string
  keyPem: string
  fingerprint: string
  validFrom: Date
  validTo: Date
}

/**
 * 设备 ID 配置（用于账号关联）
 */
export interface DeviceIdMapping {
  accountId: string
  deviceId: string
  description?: string
  createdAt: number
  lastUsed?: number
}

/**
 * MITM 拦截规则
 */
export interface MitmRule {
  // 域名匹配模式（支持通配符）
  domainPattern: string
  // 要修改的请求头
  headerModifications?: {
    name: string
    // 正则表达式模式
    pattern: string
    // 替换值（支持 $DEVICE_ID 变量）
    replacement: string
  }[]
  // 是否启用
  enabled: boolean
}

/**
 * 默认 MITM 域名白名单
 */
export const DEFAULT_MITM_DOMAINS = [
  'amazonaws.com',
  'amazon.com'
]

/**
 * 默认 K-Proxy 配置
 */
export const DEFAULT_KPROXY_CONFIG: KProxyConfig = {
  enabled: false,
  port: 8899,
  host: '127.0.0.1',
  mitmDomains: DEFAULT_MITM_DOMAINS,
  autoStart: false,
  logRequests: true
}
