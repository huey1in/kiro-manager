import type { Account } from '../types'
import { accountStore } from '../store'
import { showAccountDetailDialog } from '../dialogs/detail-dialog'
import { showEditAccountDialog } from '../dialogs/edit-account-dialog'
import { showModelsDialog } from '../dialogs/models-dialog'
import { refreshAccount, deleteAccount } from '../actions/account-actions'

export async function checkAndUpdateCurrentAccount(
  renderCurrentAccountFn: (account?: Account | null) => void
) {
  try {
    // 获取本地活跃账号的凭证
    const localResult = await (window as any).__TAURI__.core.invoke('get_local_active_account')

    if (!localResult.success || !localResult.data) {
      return
    }

    const { refresh_token, client_id } = localResult.data

    // 在所有账号中查找匹配的账号
    const accounts = accountStore.getAccounts()
    const currentAccount = accounts.find(a =>
      a.credentials.refreshToken === refresh_token ||
      a.credentials.clientId === client_id
    )

    if (currentAccount) {
      renderCurrentAccountFn(currentAccount)
    }
  } catch (error) {
    // 静默失败，不影响主流程
  }
}

export async function autoImportCurrentAccount(
  renderCurrentAccountFn: (account?: Account | null) => void,
  updateCurrentAccountIfMatchFn: (accountId: string) => Promise<void>
) {
  try {
    // 调用后端读取本地 SSO 缓存
    const localResult = await (window as any).__TAURI__.core.invoke('get_local_active_account')

    if (!localResult.success || !localResult.data) {
      console.log('[自动导入] 未找到本地活跃账号:', localResult.error)
      renderCurrentAccountFn(null)
      return
    }

    const { refresh_token, client_id, client_secret, region } = localResult.data

    // 检查是否已存在相同的账号
    const accounts = accountStore.getAccounts()
    const existingAccount = accounts.find(a =>
      a.credentials.refreshToken === refresh_token ||
      a.credentials.clientId === client_id
    )

    if (existingAccount) {
      console.log('[自动导入] 账号已存在,正在刷新:', existingAccount.email)
      await refreshAccount(existingAccount, updateCurrentAccountIfMatchFn)
      renderCurrentAccountFn(existingAccount)
      return
    }

    // 验证凭证并添加账号
    console.log('[自动导入] 正在验证新账号...')

    const result = await (window as any).__TAURI__.core.invoke('verify_account_credentials', {
      refreshToken: refresh_token,
      clientId: client_id,
      clientSecret: client_secret,
      region: region
    })

    if (result.success && result.data) {
      const now = Date.now()
      const newAccountId = accountStore.addAccount({
        email: result.data.email,
        nickname: result.data.email.split('@')[0],
        idp: 'BuilderId',
        userId: result.data.user_id,
        credentials: {
          accessToken: result.data.access_token,
          csrfToken: '',
          refreshToken: result.data.refresh_token,
          clientId: client_id,
          clientSecret: client_secret,
          region: region,
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
        groupId: undefined,
        tags: [],
        status: 'active',
        lastUsedAt: now
      })

      const newAccount = accountStore.getAccounts().find(a => a.id === newAccountId)
      console.log('[自动导入] 成功导入当前账号:', result.data.email)
      console.log('[自动导入] 账号数据:', newAccount)
      console.log('[自动导入] usage.nextResetDate:', newAccount?.usage.nextResetDate)
      console.log('[自动导入] usage.resourceDetail:', newAccount?.usage.resourceDetail)
      window.UI?.toast.success(`已自动导入当前账号: ${result.data.email}`)
      renderCurrentAccountFn(newAccount || null)
    } else {
      console.log('[自动导入] 验证失败:', result.error)
      renderCurrentAccountFn(null)
    }
  } catch (error) {
    console.log('[自动导入] 导入失败:', (error as Error).message)
    renderCurrentAccountFn(null)
  }
}

export async function updateCurrentAccountIfMatch(
  accountId: string,
  renderCurrentAccountFn: (account?: Account | null) => void
) {
  try {
    // 获取本地活跃账号的凭证
    const localResult = await (window as any).__TAURI__.core.invoke('get_local_active_account')

    if (!localResult.success || !localResult.data) {
      return
    }

    const { refresh_token, client_id } = localResult.data

    // 获取刚刚更新的账号
    const accounts = accountStore.getAccounts()
    const updatedAccount = accounts.find(a => a.id === accountId)

    if (!updatedAccount) return

    // 检查是否匹配当前活跃账号
    if (updatedAccount.credentials.refreshToken === refresh_token ||
        updatedAccount.credentials.clientId === client_id) {
      // 更新侧边栏显示
      renderCurrentAccountFn(updatedAccount)
    }
  } catch (error) {
    console.log('[更新当前账号] 检查失败:', (error as Error).message)
  }
}

export async function handleAccountAction(
  accountId: string,
  action: string,
  selectedIds: Set<string>,
  updateCurrentAccountIfMatchFn: (accountId: string) => Promise<void>
) {
  const accounts = accountStore.getAccounts()
  const account = accounts.find(a => a.id === accountId)
  if (!account) return

  switch (action) {
    case 'detail':
      showAccountDetailDialog(account)
      break
    case 'models':
      showModelsDialog(account)
      break
    case 'refresh':
      await refreshAccount(account, updateCurrentAccountIfMatchFn)
      break
    case 'copy':
      navigator.clipboard.writeText(JSON.stringify(account.credentials, null, 2))
      window.UI?.toast.success('凭证已复制到剪贴板')
      break
    case 'edit':
      showEditAccountDialog(account)
      break
    case 'delete':
      deleteAccount(accountId, (id) => selectedIds.delete(id))
      break
  }
}
