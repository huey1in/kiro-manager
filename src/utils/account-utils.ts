// 账号相关工具函数

/**
 * 获取订阅类型对应的颜色类名
 */
export function getSubscriptionColor(type: string): string {
  const text = type.toUpperCase()
  if (text.includes('PRO+') || text.includes('PRO_PLUS')) return 'badge-pro'
  if (text.includes('PRO')) return 'badge-pro'
  return 'badge-free'
}

/**
 * 获取状态文本
 */
export function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    active: '正常',
    expired: '已过期',
    error: '错误',
    refreshing: '刷新中',
    unknown: '未知',
    suspended: '已封禁'
  }
  return statusMap[status] || status
}

/**
 * 获取 IDP 显示名称
 */
export function getIdpDisplayName(idp: string): string {
  const displayNames: Record<string, string> = {
    'BuilderId': 'Builder ID',
    'Enterprise': 'Enterprise',
    'Google': 'Google',
    'Github': 'GitHub'
  }
  return displayNames[idp] || idp
}

/**
 * 格式化 Token 到期时间
 */
export function formatTokenExpiry(expiresAt: number): string {
  const now = Date.now()
  const diff = expiresAt - now
  
  if (diff <= 0) return '已过期'
  
  const minutes = Math.floor(diff / (60 * 1000))
  const hours = Math.floor(diff / (60 * 60 * 1000))
  
  if (minutes < 60) {
    return `${minutes}分钟`
  } else if (hours < 24) {
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}小时${remainingMinutes}分` : `${hours}小时`
  } else {
    const days = Math.floor(hours / 24)
    const remainingHours = hours % 24
    return remainingHours > 0 ? `${days}天${remainingHours}小时` : `${days}天`
  }
}

/**
 * 生成导出内容
 */
export function generateExportContent(
  accounts: any[],
  format: string,
  includeCredentials: boolean
): string {
  switch (format) {
    case 'json':
      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        accounts: includeCredentials
          ? accounts
          : accounts.map(acc => ({
              ...acc,
              credentials: {
                ...acc.credentials,
                accessToken: '',
                refreshToken: '',
                csrfToken: ''
              }
            }))
      }
      return JSON.stringify(exportData, null, 2)

    case 'txt':
      if (includeCredentials) {
        return accounts.map(acc =>
          [
            acc.email,
            acc.credentials?.refreshToken || '',
            acc.nickname || '',
            acc.idp || 'BuilderId'
          ].join(',')
        ).join('\n')
      }
      return accounts.map(acc => {
        const lines = [
          `邮箱: ${acc.email}`,
          acc.nickname ? `昵称: ${acc.nickname}` : null,
          acc.idp ? `登录方式: ${acc.idp}` : null,
          acc.subscription?.title ? `订阅: ${acc.subscription.title}` : null,
          acc.usage ? `用量: ${acc.usage.current ?? 0}/${acc.usage.limit ?? 0}` : null,
        ].filter(Boolean)
        return lines.join('\n')
      }).join('\n\n---\n\n')

    case 'csv':
      const headers = includeCredentials
        ? ['邮箱', '昵称', '登录方式', 'RefreshToken', 'ClientId', 'ClientSecret', 'Region']
        : ['邮箱', '昵称', '登录方式', '订阅类型', '订阅标题', '已用量', '总额度']
      const rows = accounts.map(acc => includeCredentials
        ? [
            acc.email,
            acc.nickname || '',
            acc.idp || '',
            acc.credentials?.refreshToken || '',
            acc.credentials?.clientId || '',
            acc.credentials?.clientSecret || '',
            acc.credentials?.region || 'us-east-1'
          ]
        : [
            acc.email,
            acc.nickname || '',
            acc.idp || '',
            acc.subscription?.type || '',
            acc.subscription?.title || '',
            String(acc.usage?.current ?? ''),
            String(acc.usage?.limit ?? '')
          ]
      )
      return '\ufeff' + [headers, ...rows].map(row =>
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ).join('\n')

    case 'clipboard':
      if (includeCredentials) {
        return accounts.map(acc =>
          `${acc.email},${acc.credentials?.refreshToken || ''}`
        ).join('\n')
      }
      return accounts.map(acc =>
        `${acc.email}${acc.nickname ? ` (${acc.nickname})` : ''} - ${acc.subscription?.title || '未知订阅'}`
      ).join('\n')

    default:
      return ''
  }
}
