// API Keys 管理对话框
import type { ApiKey } from '../types/proxy'

export function showApiKeysDialog(apiKeys: ApiKey[], onConfirm?: (keys: ApiKey[]) => void): void {
  const keys = [...apiKeys]

  function renderList(): void {
    const listEl = document.getElementById('api-keys-list')
    if (!listEl) return

    if (keys.length === 0) {
      listEl.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--text-muted);">暂无 API Keys</div>'
      return
    }

    const html = keys.map((key, index) => {
      const checked = key.enabled ? 'checked' : ''
      return `<div style="padding: 16px; border-bottom: 1px solid var(--border-color);">
        <div style="display: flex; align-items: center; gap: 12px;">
          <input type="checkbox" class="api-key-enabled" data-index="${index}" ${checked} style="width: 16px; height: 16px; cursor: pointer;" />
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 600; color: var(--text-main); margin-bottom: 4px;">${key.name}</div>
            <div style="font-family: monospace; font-size: 12px; color: var(--text-muted);">${key.key}</div>
          </div>
          <button class="ui-btn ui-btn-danger ui-btn-sm" onclick="window.removeApiKey(${index})">删除</button>
        </div>
      </div>`
    }).join('')
    
    listEl.innerHTML = html
    bindEvents()
  }

  function bindEvents(): void {
    const checkboxes = document.querySelectorAll('.api-key-enabled') as NodeListOf<HTMLInputElement>
    checkboxes.forEach(cb => {
      cb.addEventListener('change', () => {
        const index = parseInt(cb.getAttribute('data-index') || '0')
        if (keys[index]) {
          keys[index].enabled = cb.checked
        }
      })
    })
  }

  function showAddKeyForm(): void {
    const formHtml = `
      <div style="padding: 16px; background: var(--slate-50); border-radius: 6px; margin-bottom: 12px;" id="add-key-form">
        <div style="margin-bottom: 12px;">
          <label style="display: block; margin-bottom: 4px; font-size: 13px; font-weight: 500;">Key 名称</label>
          <input type="text" id="new-key-name" class="ui-input" placeholder="例如: 生产环境" style="width: 100%; padding: 8px;" />
        </div>
        <div style="display: flex; gap: 8px; justify-content: flex-end;">
          <button class="ui-btn ui-btn-secondary ui-btn-sm" onclick="window.cancelAddKey()">取消</button>
          <button class="ui-btn ui-btn-primary ui-btn-sm" onclick="window.confirmAddKey()">确定</button>
        </div>
      </div>
    `
    
    const container = document.getElementById('add-key-container')
    if (container) {
      container.innerHTML = formHtml
      setTimeout(() => {
        const input = document.getElementById('new-key-name') as HTMLInputElement
        input?.focus()
      }, 50)
    }
  }

  function hideAddKeyForm(): void {
    const container = document.getElementById('add-key-container')
    if (container) {
      container.innerHTML = '<button class="ui-btn ui-btn-primary ui-btn-sm" onclick="window.addApiKey()">添加 Key</button>'
    }
  }

  const modalHtml = `<div class="modal-form">
    <div class="form-section">
      <div class="form-hint" style="margin-bottom: 16px;">管理用于访问代理服务的 API Keys</div>
      <div id="add-key-container" style="margin-bottom: 12px;">
        <button class="ui-btn ui-btn-primary ui-btn-sm" onclick="window.addApiKey()">添加 Key</button>
      </div>
      <div id="api-keys-list" style="max-height: 400px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 6px;"></div>
    </div>
  </div>`

  const footerHtml = `<button class="ui-btn ui-btn-secondary" onclick="window.closeApiKeysDialog()">取消</button>
    <button class="ui-btn ui-btn-primary" onclick="window.confirmApiKeys()">确定</button>`

  const modal = window.UI?.modal.open({
    title: 'API Keys 管理',
    html: modalHtml,
    footer: footerHtml,
    size: 'lg',
    closable: true
  })

  setTimeout(() => renderList(), 50)

  window.addApiKey = () => {
    showAddKeyForm()
  }

  window.cancelAddKey = () => {
    hideAddKeyForm()
  }

  window.confirmAddKey = () => {
    const input = document.getElementById('new-key-name') as HTMLInputElement
    const name = input?.value.trim()
    
    if (!name) {
      window.UI?.toast.error('请输入 Key 名称')
      return
    }

    const key = 'sk-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    keys.push({
      id: Date.now().toString(),
      name,
      key,
      enabled: true,
      usage: { totalRequests: 0, totalCredits: 0, totalInputTokens: 0, totalOutputTokens: 0, daily: {}, byModel: {} },
      createdAt: Date.now()
    })
    
    hideAddKeyForm()
    renderList()
  }

  window.removeApiKey = (index: number) => {
    keys.splice(index, 1)
    renderList()
  }

  window.closeApiKeysDialog = () => {
    window.UI?.modal.close(modal)
    delete window.addApiKey
    delete window.cancelAddKey
    delete window.confirmAddKey
    delete window.removeApiKey
    delete window.closeApiKeysDialog
    delete window.confirmApiKeys
  }

  window.confirmApiKeys = () => {
    if (onConfirm) onConfirm(keys)
    window.UI?.modal.close(modal)
    delete window.addApiKey
    delete window.cancelAddKey
    delete window.confirmAddKey
    delete window.removeApiKey
    delete window.closeApiKeysDialog
    delete window.confirmApiKeys
  }
}
