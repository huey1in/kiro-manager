// 账号类型定义
export type IdpType = 'Google' | 'Github' | 'BuilderId' | 'Enterprise' | 'AWSIdC' | 'Internal' | 'IAM_SSO'
export type SubscriptionType = 'Free' | 'Pro' | 'Pro_Plus' | 'Enterprise' | 'Teams'
export type AccountStatus = 'active' | 'expired' | 'error' | 'refreshing' | 'unknown' | 'suspended'

// 筛选类型定义
export interface AccountFilter {
  search?: string
  subscriptionTypes?: SubscriptionType[]
  statuses?: AccountStatus[]
  idps?: IdpType[]
  usageMin?: number // 0-1 的百分比
  usageMax?: number // 0-1 的百分比
  daysRemainingMin?: number
  daysRemainingMax?: number
}

export interface AccountCredentials {
  accessToken: string
  csrfToken: string
  refreshToken?: string
  clientId?: string
  clientSecret?: string
  region?: string
  expiresAt: number
  authMethod?: 'IdC' | 'social'
  provider?: string
}

export interface BonusData {
  code: string
  name: string
  current: number
  limit: number
  expiresAt?: string
}

export interface ResourceDetail {
  displayName?: string
  displayNamePlural?: string
  resourceType?: string
  currency?: string
  unit?: string
  overageRate?: number
  overageCap?: number
  overageEnabled?: boolean
}

export interface AccountUsage {
  current: number
  limit: number
  percentUsed: number
  lastUpdated: number
  nextResetDate?: string
  baseLimit?: number
  baseCurrent?: number
  freeTrialLimit?: number
  freeTrialCurrent?: number
  freeTrialExpiry?: string
  bonuses?: BonusData[]
  resourceDetail?: ResourceDetail
}

export interface AccountSubscription {
  type: SubscriptionType
  title?: string
  rawType?: string
  expiresAt?: number
  daysRemaining?: number
  managementTarget?: string
  upgradeCapability?: string
  overageCapability?: string
}

export interface Account {
  id: string
  email: string
  nickname?: string
  idp: IdpType
  userId?: string
  credentials: AccountCredentials
  subscription: AccountSubscription
  usage: AccountUsage
  groupId?: string
  tags: string[]
  status: AccountStatus
  lastError?: string
  isActive: boolean
  createdAt: number
  lastUsedAt: number
}

export interface AccountGroup {
  id: string
  name: string
  description?: string
  color?: string
  order: number
  createdAt: number
}

export interface AccountTag {
  id: string
  name: string
  color: string
}

// Tauri 窗口类型扩展
declare global {
  interface Window {
    __TAURI__?: {
      core: {
        invoke: (cmd: string, args?: any) => Promise<any>
      }
      window: {
        getCurrentWindow: () => {
          outerPosition: () => Promise<{ x: number; y: number }>
          listen: (event: string, handler: () => void) => Promise<void>
        }
      }
    }
    // 全局函数
    showAccountModels?: () => void
    copyAccountJson?: () => void
    closeAccountDetailModal?: () => void
    refreshModels?: () => void
    closeModelsModal?: () => void
  }
}
