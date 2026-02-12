import type { Account } from '../types'
import { accountStore } from '../store'
import { showAccountDetailDialog } from '../dialogs/detail-dialog'
import { showEditAccountDialog } from '../dialogs/edit-account-dialog'
import { showModelsDialog } from '../dialogs/models-dialog'
import { refreshAccount, deleteAccount, switchToAccount } from '../actions/account-actions'

export async function autoImportCurrentAccount(
  renderCurrentAccountFn: (account?: Account | null) => void
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
      console.log('[自动导入] 账号已存在:', existingAccount.email)
      
      // 检查 token 是否即将过期（小于5分钟）
      const now = Date.now()
      const expiresAt = existingAccount.credentials.expiresAt || 0
      const needsRefresh = expiresAt - now < 5 * 60 * 1000
      
      if (needsRefresh) {
        console.log('[自动导入] Token 即将过期，正在刷新')
        await refreshAccount(existingAccount)
        
        // 刷新后获取更新的账号并同步到本地缓存
        const updatedAccount = accountStore.getAccounts().find(a => a.id === existingAccount.id)
        if (updatedAccount) {
          console.log('[自动导入] 刷新成功，同步新 token 到本地缓存')
          await (window as any).__TAURI__.core.invoke('switch_account', {
            accessToken: updatedAccount.credentials.accessToken,
            refreshToken: updatedAccount.credentials.refreshToken,
            clientId: updatedAccount.credentials.clientId || '',
            clientSecret: updatedAccount.credentials.clientSecret || '',
            region: updatedAccount.credentials.region || 'us-east-1',
            startUrl: updatedAccount.credentials.startUrl,
            authMethod: updatedAccount.credentials.authMethod || 'IdC',
            provider: updatedAccount.credentials.provider || updatedAccount.idp
          })
        }
        
        // 获取最终的账号状态
        const finalAccount = accountStore.getAccounts().find(a => a.id === existingAccount.id)
        renderCurrentAccountFn(finalAccount || existingAccount)
      } else {
        console.log('[自动导入] Token 仍然有效，无需刷新')
        renderCurrentAccountFn(existingAccount)
      }
      
      // 导入后立即同步激活状态
      await accountStore.syncActiveAccountFromLocal()
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
      window.UI?.toast.success(`已自动导入当前账号: ${result.data.email}`)
      
      // 将新账号写入本地缓存
      if (newAccount) {
        await (window as any).__TAURI__.core.invoke('switch_account', {
          accessToken: newAccount.credentials.accessToken,
          refreshToken: newAccount.credentials.refreshToken,
          clientId: newAccount.credentials.clientId || '',
          clientSecret: newAccount.credentials.clientSecret || '',
          region: newAccount.credentials.region || 'us-east-1',
          startUrl: newAccount.credentials.startUrl,
          authMethod: newAccount.credentials.authMethod || 'IdC',
          provider: newAccount.credentials.provider || newAccount.idp
        })
      }
      
      renderCurrentAccountFn(newAccount || null)
      
      // 导入后立即同步激活状态
      await accountStore.syncActiveAccountFromLocal()
    } else {
      console.log('[自动导入] 验证失败:', result.error)
      renderCurrentAccountFn(null)
    }
  } catch (error) {
    console.log('[自动导入] 导入失败:', (error as Error).message)
    renderCurrentAccountFn(null)
  }
}

export async function handleAccountAction(
  accountId: string,
  action: string,
  selectedIds: Set<string>
) {
  const accounts = accountStore.getAccounts()
  const account = accounts.find(a => a.id === accountId)
  if (!account) return

  try {
    switch (action) {
      case 'detail':
        showAccountDetailDialog(account)
        break
      case 'models':
        showModelsDialog(account)
        break
      case 'switch':
        await switchToAccount(account)
        break
      case 'refresh':
        await refreshAccount(account)
        
        // 刷新成功后，如果是当前激活账号，同步新 token 到本地缓存
        const activeAccountId = accountStore.getActiveAccountId()
        if (activeAccountId === accountId) {
          console.log('[账号操作] 刷新的是当前激活账号，同步新 token 到本地缓存')
          const updatedAccount = accountStore.getAccounts().find(a => a.id === accountId)
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
                console.log('[账号操作] 后端返回了新 token，再次更新账号')
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
              console.error('[账号操作] 同步 token 到本地缓存失败:', syncError)
            }
          }
        }
        
        window.UI?.toast.success('账号刷新成功')
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
  } catch (error) {
    // 只在刷新操作时显示错误提示
    if (action === 'refresh') {
      window.UI?.toast.error('刷新失败: ' + (error as Error).message)
    }
  }
}
