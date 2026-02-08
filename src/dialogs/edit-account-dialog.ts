// 编辑账号对话框
import type { Account } from '../types'
import { accountStore } from '../store'
import { getIdpDisplayName } from '../utils/account-utils'

/**
 * 显示编辑账号对话框
 */
export function showEditAccountDialog(account: Account): void {
  const modal = window.UI?.modal.open({
    title: '编辑账号',
    html: `
      <div class="modal-form">
        <div class="form-section">
          <label class="form-label">邮箱 <span class="required">*</span></label>
          <input type="email" class="form-input" id="edit-account-email" value="${account.email}" required>
        </div>
        <div class="form-row">
          <div class="form-section">
            <label class="form-label">昵称</label>
            <input type="text" class="form-input" id="edit-account-nickname" value="${account.nickname || ''}" placeholder="我的账号">
          </div>
          <div class="form-section">
            <label class="form-label">登录方式</label>
            <div class="ui-dropdown" style="width: 100%;">
              <button class="ui-btn ui-btn-secondary" data-dropdown style="width: 100%; justify-content: space-between;" id="edit-idp-btn">
                <span id="edit-idp-text">${getIdpDisplayName(account.idp)}</span>
                <span>▼</span>
              </button>
              <div class="ui-dropdown-menu" style="width: 100%;">
                <button class="ui-dropdown-item" onclick="window.selectEditIdp('BuilderId', 'Builder ID')">Builder ID</button>
                <button class="ui-dropdown-item" onclick="window.selectEditIdp('Enterprise', 'Enterprise')">Enterprise</button>
                <button class="ui-dropdown-item" onclick="window.selectEditIdp('Google', 'Google')">Google</button>
                <button class="ui-dropdown-item" onclick="window.selectEditIdp('Github', 'GitHub')">GitHub</button>
              </div>
            </div>
            <input type="hidden" id="edit-account-idp" value="${account.idp}">
          </div>
        </div>
        <div class="form-section">
          <label class="form-label">Access Token <span class="required">*</span></label>
          <textarea class="form-input form-textarea" id="edit-account-access-token" rows="3">${account.credentials.accessToken}</textarea>
        </div>
        <div class="form-section">
          <label class="form-label">Refresh Token</label>
          <textarea class="form-input form-textarea" id="edit-account-refresh-token" rows="3">${account.credentials.refreshToken || ''}</textarea>
        </div>
      </div>
    `,
    footer: `
      <button class="ui-btn ui-btn-secondary" onclick="window.closeEditAccountModal()">取消</button>
      <button class="ui-btn ui-btn-primary" onclick="window.submitEditAccount()">保存</button>
    `,
    size: 'lg',
    closable: true
  })

  window.selectEditIdp = (idp: string, displayName: string) => {
    const idpInput = document.getElementById('edit-account-idp') as HTMLInputElement
    const idpText = document.getElementById('edit-idp-text')
    if (idpInput) idpInput.value = idp
    if (idpText) idpText.textContent = displayName
  }

  window.closeEditAccountModal = () => {
    window.UI?.modal.close(modal)
    delete window.closeEditAccountModal
    delete window.submitEditAccount
    delete window.selectEditIdp
  }

  window.submitEditAccount = () => {
    const email = (document.getElementById('edit-account-email') as HTMLInputElement)?.value
    const nickname = (document.getElementById('edit-account-nickname') as HTMLInputElement)?.value
    const idp = (document.getElementById('edit-account-idp') as HTMLInputElement)?.value
    const accessToken = (document.getElementById('edit-account-access-token') as HTMLTextAreaElement)?.value
    const refreshToken = (document.getElementById('edit-account-refresh-token') as HTMLTextAreaElement)?.value

    if (!email || !accessToken) {
      window.UI?.toast.error('请填写必填项')
      return
    }

    accountStore.updateAccount(account.id, {
      email,
      nickname: nickname || undefined,
      idp: idp as any,
      credentials: {
        ...account.credentials,
        accessToken,
        refreshToken: refreshToken || undefined
      }
    })

    window.UI?.toast.success('账号更新成功')
    window.UI?.modal.close(modal)
    delete window.closeEditAccountModal
    delete window.submitEditAccount
    delete window.selectEditIdp
  }
}
