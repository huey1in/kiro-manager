// 反代服务类型定义

export interface ProxyAccount {
  id: string
  email?: string
  accessToken: string
  refreshToken?: string
  profileArn?: string
  expiresAt?: number
  clientId?: string
  clientSecret?: string
  region?: string
  authMethod?: string
  isAvailable?: boolean
  lastUsed?: number
  requestCount?: number
  errorCount?: number
}

export interface ApiKey {
  id: string
  name: string
  key: string
  enabled: boolean
  creditsLimit?: number
  usage: ApiKeyUsage
  createdAt: number
  lastUsedAt?: number
}

export interface ApiKeyUsage {
  totalRequests: number
  totalCredits: number
  totalInputTokens: number
  totalOutputTokens: number
  daily: Record<string, DailyUsage>
  byModel: Record<string, ModelUsage>
}

export interface DailyUsage {
  requests: number
  credits: number
  inputTokens: number
  outputTokens: number
}

export interface ModelUsage {
  requests: number
  credits: number
  inputTokens: number
  outputTokens: number
}

export interface ModelMappingRule {
  id: string
  name: string
  enabled: boolean
  type: 'replace' | 'alias' | 'loadbalance'
  sourceModel: string
  targetModels: string[]
  weights?: number[]
  priority: number
  apiKeyIds?: string[]
}

export interface ProxyConfig {
  enabled: boolean
  port: number
  host: string
  apiKey?: string
  apiKeys?: ApiKey[]
  enableMultiAccount: boolean
  selectedAccountIds: string[]
  logRequests: boolean
  maxRetries?: number
  preferredEndpoint?: string
  autoStart?: boolean
  autoContinueRounds?: number
  disableTools?: boolean
  autoSwitchOnQuotaExhausted?: boolean
  modelMappings?: ModelMappingRule[]
  enableOpenAI?: boolean
  enableClaude?: boolean
}

export interface ProxyStats {
  totalRequests: number
  successRequests: number
  failedRequests: number
  totalTokens: number
  totalCredits: number
  inputTokens: number
  outputTokens: number
  startTime: number
}

export interface SessionStats {
  totalRequests: number
  successRequests: number
  failedRequests: number
  startTime: number
}

export interface RequestLog {
  time: string
  path: string
  model?: string
  status: number
  tokens?: number
  inputTokens?: number
  outputTokens?: number
  credits?: number
  error?: string
}
