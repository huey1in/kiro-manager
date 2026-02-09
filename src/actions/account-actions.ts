// 账号操作模块
import type { Account } from '../types'
import { accountStore } from '../store'

/**
 * 刷新账号信息
 */
export async function refreshAccount(account: Account, onUpdate?: (accountId: string) => Promise<void>): Promise<void> {
  if (!account.credentials.refreshToken || !account.credentials.clientId || !account.credentials.clientSecret) {
    window.UI?.toast.error('账号缺少刷新凭证')
    throw new Error('账号缺少刷新凭证')
  }

  window.UI?.toast.info(`正在刷新账号: ${account.email}`)

  try {
    const result = await (window as any).__TAURI__.core.invoke('verify_account_credentials', {
      refreshToken: account.credentials.refreshToken,
      clientId: account.credentials.clientId,
      clientSecret: account.credentials.clientSecret,
      region: account.credentials.region || 'us-east-1'
    })

    if (result.success && result.data) {
      const now = Date.now()
      accountStore.updateAccount(account.id, {
        email: result.data.email,
        userId: result.data.user_id,
        credentials: {
          ...account.credentials,
          accessToken: result.data.access_token,
          refreshToken: result.data.refresh_token,
          expiresAt: now + (result.data.expires_in || 3600) * 1000
        },
        subscription: {
          type: result.data.subscription_type,
          title: result.data.subscription_title,
          rawType: result.data.raw_type,
          upgradeCapability: result.data.upgrade_capability,
          overageCapability: result.data.overage_capability,
          managementTarget: result.data.management_target,
          daysRemaining: result.data.days_remaining
        },
        usage: {
          current: result.data.usage.current,
          limit: result.data.usage.limit,
          percentUsed: result.data.usage.current / result.data.usage.limit,
          lastUpdated: now,
          nextResetDate: result.data.usage.nextResetDate,
          baseLimit: result.data.usage.baseLimit,
          baseCurrent: result.data.usage.baseCurrent,
          freeTrialLimit: result.data.usage.freeTrialLimit,
          freeTrialCurrent: result.data.usage.freeTrialCurrent,
          freeTrialExpiry: result.data.usage.freeTrialExpiry,
          resourceDetail: result.data.usage.resourceDetail
        },
        status: 'active',
        lastError: undefined,
        lastUsedAt: now
      })

      // 如果提供了更新回调，调用它
      if (onUpdate) {
        await onUpdate(account.id)
      }

      window.UI?.toast.success('账号刷新成功')
    } else {
      // 根据错误类型设置状态
      const errorMsg = result.error || '刷新失败'
      const isSuspended = errorMsg.includes('封禁') || errorMsg.includes('suspended')

      accountStore.updateAccount(account.id, {
        status: isSuspended ? 'suspended' : 'error',
        lastError: errorMsg
      })

      window.UI?.toast.error(errorMsg)
      throw new Error(errorMsg)
    }
  } catch (error) {
    window.UI?.toast.error('刷新失败: ' + (error as Error).message)
    throw error
  }
}

/**
 * 只刷新 Token（不更新账户信息）
 */
export async function refreshTokenOnly(account: Account): Promise<void> {
  if (!account.credentials.refreshToken || !account.credentials.clientId || !account.credentials.clientSecret) {
    throw new Error('账号缺少刷新凭证')
  }

  try {
    const result = await (window as any).__TAURI__.core.invoke('verify_account_credentials', {
      refreshToken: account.credentials.refreshToken,
      clientId: account.credentials.clientId,
      clientSecret: account.credentials.clientSecret,
      region: account.credentials.region || 'us-east-1'
    })

    if (result.success && result.data) {
      const now = Date.now()
      // 只更新 Token 相关信息
      accountStore.updateAccount(account.id, {
        credentials: {
          ...account.credentials,
          accessToken: result.data.access_token,
          refreshToken: result.data.refresh_token,
          expiresAt: now + (result.data.expires_in || 3600) * 1000
        },
        status: 'active',
        lastError: undefined
      })
    } else {
      const errorMsg = result.error || '刷新失败'
      const isSuspended = errorMsg.includes('封禁') || errorMsg.includes('suspended')

      accountStore.updateAccount(account.id, {
        status: isSuspended ? 'suspended' : 'error',
        lastError: errorMsg
      })

      throw new Error(errorMsg)
    }
  } catch (error) {
    throw error
  }
}

/**
 * 删除账号
 */
export function deleteAccount(accountId: string, onDelete?: (accountId: string) => void): void {
  const accounts = accountStore.getAccounts()
  const account = accounts.find(a => a.id === accountId)
  if (!account) return

  if (confirm(`确定要删除账号 ${account.email} 吗？`)) {
    accountStore.deleteAccount(accountId)
    if (onDelete) {
      onDelete(accountId)
    }
    window.UI?.toast.success('账号已删除')
  }
}

/**
 * 批量检查账号状态
 */
export async function handleBatchCheck(selectedIds: Set<string>): Promise<void> {
  const selectedAccounts = accountStore.getAccounts().filter(a => selectedIds.has(a.id))

  if (selectedAccounts.length === 0) {
    window.UI?.toast.warning('请先选择要检查的账号')
    return
  }

  window.UI?.toast.info(`正在检查 ${selectedAccounts.length} 个账号状态...`)

  let successCount = 0
  let failedCount = 0

  for (const account of selectedAccounts) {
    if (!account.credentials.refreshToken || !account.credentials.clientId || !account.credentials.clientSecret) {
      failedCount++
      accountStore.updateAccount(account.id, { status: 'error', lastError: '缺少凭证信息' })
      continue
    }

    try {
      // 只验证凭证是否有效，不更新详细信息
      const result = await (window as any).__TAURI__.core.invoke('verify_account_credentials', {
        refreshToken: account.credentials.refreshToken,
        clientId: account.credentials.clientId,
        clientSecret: account.credentials.clientSecret,
        region: account.credentials.region || 'us-east-1',
        authMethod: account.credentials.authMethod || 'IdC',
        provider: account.credentials.provider || account.idp
      })

      if (result.success) {
        accountStore.updateAccount(account.id, {
          status: 'active',
          lastError: undefined
        })
        successCount++
      } else {
        const errorMsg = result.error || '验证失败'
        const isSuspended = errorMsg.includes('封禁') || errorMsg.includes('suspended')

        accountStore.updateAccount(account.id, {
          status: isSuspended ? 'suspended' : 'error',
          lastError: errorMsg
        })
        failedCount++
      }
    } catch (error) {
      accountStore.updateAccount(account.id, {
        status: 'error',
        lastError: (error as Error).message
      })
      failedCount++
    }
  }

  if (failedCount === 0) {
    window.UI?.toast.success(`检查完成：${successCount} 个账号状态正常`)
  } else {
    window.UI?.toast.warning(`检查完成：${successCount} 个正常，${failedCount} 个异常`)
  }
}

/**
 * 批量刷新账号
 */
export async function handleBatchRefresh(selectedIds: Set<string>, onUpdate?: (accountId: string) => Promise<void>): Promise<void> {
  const selectedAccounts = accountStore.getAccounts().filter(a => selectedIds.has(a.id))

  if (selectedAccounts.length === 0) {
    window.UI?.toast.warning('请先选择要刷新的账号')
    return
  }

  window.UI?.toast.info(`正在刷新 ${selectedAccounts.length} 个账号...`)

  let successCount = 0
  let failedCount = 0

  for (const account of selectedAccounts) {
    try {
      await refreshAccount(account, onUpdate)
      successCount++
    } catch (error) {
      failedCount++
    }
  }

  if (failedCount === 0) {
    window.UI?.toast.success(`刷新完成：${successCount} 个账号已更新`)
  } else {
    window.UI?.toast.warning(`刷新完成：${successCount} 个成功，${failedCount} 个失败`)
  }
}

/**
 * 批量删除账号
 */
export function handleBatchDelete(selectedIds: Set<string>, onClear: () => void): void {
  const selectedCount = selectedIds.size

  if (selectedCount === 0) {
    window.UI?.toast.warning('请先选择要删除的账号')
    return
  }

  if (confirm(`确定要删除选中的 ${selectedCount} 个账号吗？此操作不可恢复。`)) {
    selectedIds.forEach(id => {
      accountStore.deleteAccount(id)
    })
    onClear()
    window.UI?.toast.success(`已删除 ${selectedCount} 个账号`)
  }
}
