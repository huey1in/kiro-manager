// 代理服务器日志模块
import * as fs from 'fs'
import * as path from 'path'
import { app } from 'electron'

export interface LogEntry {
  timestamp: string
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'
  category: string
  message: string
  data?: unknown
}

export interface LoggerConfig {
  enabled: boolean
  logDir?: string
  maxFileSize?: number // 最大文件大小 (bytes)
  maxFiles?: number // 最大文件数量
  logToConsole?: boolean
}

const DEFAULT_CONFIG: LoggerConfig = {
  enabled: false,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 5,
  logToConsole: true
}

class ProxyLogger {
  private config: LoggerConfig
  private logStream: fs.WriteStream | null = null
  private currentLogFile: string = ''
  private currentFileSize: number = 0

  constructor() {
    this.config = { ...DEFAULT_CONFIG }
  }

  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config }
    
    if (this.config.enabled && !this.config.logDir) {
      // 默认日志目录
      this.config.logDir = path.join(app.getPath('userData'), 'logs', 'proxy')
    }

    if (this.config.enabled) {
      this.initLogFile()
    } else {
      this.close()
    }
  }

  private initLogFile(): void {
    if (!this.config.logDir) return

    try {
      // 确保目录存在
      fs.mkdirSync(this.config.logDir, { recursive: true })

      // 创建新的日志文件
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      this.currentLogFile = path.join(this.config.logDir, `proxy-${timestamp}.log`)
      this.logStream = fs.createWriteStream(this.currentLogFile, { flags: 'a' })
      this.currentFileSize = 0

      this.info('Logger', 'Log file initialized', { file: this.currentLogFile })
    } catch (error) {
      console.error('[ProxyLogger] Failed to init log file:', error)
    }
  }

  private rotateIfNeeded(): void {
    if (!this.config.maxFileSize || this.currentFileSize < this.config.maxFileSize) {
      return
    }

    this.close()
    this.cleanOldLogs()
    this.initLogFile()
  }

  private cleanOldLogs(): void {
    if (!this.config.logDir || !this.config.maxFiles) return

    try {
      const files = fs.readdirSync(this.config.logDir)
        .filter(f => f.startsWith('proxy-') && f.endsWith('.log'))
        .map(f => ({
          name: f,
          path: path.join(this.config.logDir!, f),
          time: fs.statSync(path.join(this.config.logDir!, f)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time)

      // 删除超出数量限制的旧文件
      while (files.length >= this.config.maxFiles) {
        const oldest = files.pop()
        if (oldest) {
          fs.unlinkSync(oldest.path)
        }
      }
    } catch (error) {
      console.error('[ProxyLogger] Failed to clean old logs:', error)
    }
  }

  private write(entry: LogEntry): void {
    const line = JSON.stringify(entry) + '\n'

    if (this.config.logToConsole) {
      const prefix = `[${entry.level}][${entry.category}]`
      if (entry.level === 'ERROR') {
        console.error(prefix, entry.message, entry.data || '')
      } else if (entry.level === 'WARN') {
        console.warn(prefix, entry.message, entry.data || '')
      } else {
        console.log(prefix, entry.message, entry.data || '')
      }
    }

    if (this.config.enabled && this.logStream) {
      this.logStream.write(line)
      this.currentFileSize += Buffer.byteLength(line)
      this.rotateIfNeeded()
    }

    // 同时添加到内存存储（用于 UI 显示）
    proxyLogStore.add(entry)
  }

  debug(category: string, message: string, data?: unknown): void {
    this.write({
      timestamp: new Date().toISOString(),
      level: 'DEBUG',
      category,
      message,
      data
    })
  }

  info(category: string, message: string, data?: unknown): void {
    this.write({
      timestamp: new Date().toISOString(),
      level: 'INFO',
      category,
      message,
      data
    })
  }

  warn(category: string, message: string, data?: unknown): void {
    this.write({
      timestamp: new Date().toISOString(),
      level: 'WARN',
      category,
      message,
      data
    })
  }

  error(category: string, message: string, data?: unknown): void {
    this.write({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      category,
      message,
      data
    })
  }

  // 记录请求
  request(info: {
    path: string
    method: string
    model?: string
    accountId?: string
  }): void {
    this.info('Request', `${info.method} ${info.path}`, info)
  }

  // 记录响应
  response(info: {
    path: string
    status: number
    tokens?: number
    responseTime?: number
    error?: string
  }): void {
    if (info.error) {
      this.error('Response', `${info.path} -> ${info.status}`, info)
    } else {
      this.info('Response', `${info.path} -> ${info.status}`, info)
    }
  }

  // 记录 Token 刷新
  tokenRefresh(accountId: string, success: boolean, error?: string): void {
    if (success) {
      this.info('TokenRefresh', `Account ${accountId} refreshed successfully`)
    } else {
      this.error('TokenRefresh', `Account ${accountId} refresh failed`, { error })
    }
  }

  close(): void {
    if (this.logStream) {
      this.logStream.end()
      this.logStream = null
    }
  }

  getLogDir(): string | undefined {
    return this.config.logDir
  }
}

// 内存日志存储（用于 UI 显示）
class ProxyLogStore {
  private logs: LogEntry[] = []
  private maxLogs: number = 1000000 // 最大保存条数（100万）
  private listeners: ((entry: LogEntry) => void)[] = []
  private storePath: string = ''

  initialize(userDataPath: string): void {
    this.storePath = path.join(userDataPath, 'proxy-logs.json')
    this.load()
  }

  private load(): void {
    try {
      if (fs.existsSync(this.storePath)) {
        const data = fs.readFileSync(this.storePath, 'utf-8')
        const parsed = JSON.parse(data)
        // 验证并过滤有效的日志条目
        this.logs = Array.isArray(parsed) ? parsed.filter((log: LogEntry) => {
          // 必须有有效的 timestamp
          if (!log.timestamp || isNaN(new Date(log.timestamp).getTime())) {
            return false
          }
          // 必须有 level 和 category
          if (!log.level || !log.category) {
            return false
          }
          return true
        }) : []
        console.log(`[ProxyLogStore] Loaded ${this.logs.length} valid logs`)
      }
    } catch (error) {
      console.error('[ProxyLogStore] Failed to load logs:', error)
      this.logs = []
    }
  }

  save(): void {
    try {
      fs.writeFileSync(this.storePath, JSON.stringify(this.logs), 'utf-8')
    } catch (error) {
      console.error('[ProxyLogStore] Failed to save logs:', error)
    }
  }

  private saveTimer: NodeJS.Timeout | null = null
  private pendingSave = false

  add(entry: LogEntry): void {
    this.logs.push(entry)
    
    // 超过最大数量时删除最旧的
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }

    // 通知监听器
    for (const listener of this.listeners) {
      try {
        listener(entry)
      } catch (e) {
        // ignore
      }
    }

    // 延迟保存（避免频繁写入）
    this.scheduleSave()
  }

  private scheduleSave(): void {
    if (this.pendingSave) return
    this.pendingSave = true
    
    if (this.saveTimer) {
      clearTimeout(this.saveTimer)
    }
    
    this.saveTimer = setTimeout(() => {
      this.save()
      this.pendingSave = false
    }, 5000) // 5秒后保存
  }

  getAll(): LogEntry[] {
    return [...this.logs]
  }

  getLast(count: number): LogEntry[] {
    return this.logs.slice(-count)
  }

  clear(): void {
    this.logs = []
    this.save()
  }

  count(): number {
    return this.logs.length
  }

  onLog(listener: (entry: LogEntry) => void): () => void {
    this.listeners.push(listener)
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index >= 0) {
        this.listeners.splice(index, 1)
      }
    }
  }
}

export const proxyLogStore = new ProxyLogStore()

// 单例导出
export const proxyLogger = new ProxyLogger()
