// 导出对话框
import type { Account } from '../types'
import { generateExportContent } from '../utils/account-utils'

/**
 * 显示导出对话框
 */
export function showExportDialog(accounts: Account[], selectedCount: number): void {
  let selectedFormat: 'json' | 'txt' | 'csv' | 'clipboard' = 'json'
  let includeCredentials = true

  const updatePreview = () => {
    const formatDesc = document.getElementById('format-desc')
    const credentialsOption = document.getElementById('credentials-option')

    const descriptions = {
      json: '完整数据，可用于导入',
      txt: includeCredentials ? '可导入格式：邮箱,Token,昵称,登录方式' : '纯文本格式，每行一个账号',
      csv: includeCredentials ? '可导入格式，Excel 兼容' : 'Excel 兼容格式',
      clipboard: includeCredentials ? '可导入格式：邮箱,Token' : '复制到剪贴板'
    }

    if (formatDesc) formatDesc.textContent = descriptions[selectedFormat]
    if (credentialsOption) {
      credentialsOption.style.display = selectedFormat === 'json' ? 'flex' : 'none'
    }
  }

  const modal = window.UI?.modal.open({
    title: '导出账号',
    html: `
      <div class="export-dialog">
        <div class="export-count">
          ${selectedCount > 0 ? `${selectedCount} 个选中` : `全部 ${accounts.length} 个`}
        </div>

        <div class="export-formats">
          <button class="export-format-btn active" data-format="json">
            <div class="export-format-name">JSON</div>
            <div class="export-format-desc" id="format-desc">完整数据，可用于导入</div>
          </button>
          <button class="export-format-btn" data-format="txt">
            <div class="export-format-name">TXT</div>
            <div class="export-format-desc">可导入格式</div>
          </button>
          <button class="export-format-btn" data-format="csv">
            <div class="export-format-name">CSV</div>
            <div class="export-format-desc">Excel 兼容</div>
          </button>
          <button class="export-format-btn" data-format="clipboard">
            <div class="export-format-name">剪贴板</div>
            <div class="export-format-desc">复制到剪贴板</div>
          </button>
        </div>

        <div class="export-option" id="credentials-option">
          <label class="export-checkbox">
            <input type="checkbox" id="include-credentials" checked>
            <span class="export-checkbox-label">
              <div class="export-option-title">包含凭证信息</div>
              <div class="export-option-desc">包含 Token 等敏感数据，可用于完整导入</div>
            </span>
          </label>
        </div>
      </div>
    `,
    footer: `
      <button class="ui-btn ui-btn-secondary" onclick="window.closeExportDialog()">取消</button>
      <button class="ui-btn ui-btn-primary" onclick="window.submitExport()">
        <span id="export-btn-text">导出</span>
      </button>
    `,
    size: 'default',
    closable: true
  })

  // 格式选择
  const formatBtns = document.querySelectorAll('.export-format-btn')
  formatBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      formatBtns.forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      selectedFormat = (btn as HTMLElement).dataset.format as any
      updatePreview()

      const btnText = document.getElementById('export-btn-text')
      if (btnText) {
        btnText.textContent = selectedFormat === 'clipboard' ? '复制到剪贴板' : '导出'
      }
    })
  })

  // 凭证选项
  const credentialsCheckbox = document.getElementById('include-credentials') as HTMLInputElement
  if (credentialsCheckbox) {
    credentialsCheckbox.addEventListener('change', () => {
      includeCredentials = credentialsCheckbox.checked
      updatePreview()
    })
  }

  window.closeExportDialog = () => {
    window.UI?.modal.close(modal)
    delete window.closeExportDialog
    delete window.submitExport
  }

  window.submitExport = async () => {
    const content = generateExportContent(accounts, selectedFormat, includeCredentials)

    if (selectedFormat === 'clipboard') {
      await navigator.clipboard.writeText(content)
      window.UI?.toast.success('已复制到剪贴板')
      window.UI?.modal.close(modal)
      delete window.closeExportDialog
      delete window.submitExport
      return
    }

    const extensions = { json: 'json', txt: 'txt', csv: 'csv' }
    const ext = extensions[selectedFormat]
    const defaultFilename = `kiro-accounts-${new Date().toISOString().slice(0, 10)}.${ext}`

    try {
      // 使用 Tauri 的 save 对话框
      const filePath = await (window as any).__TAURI__.dialog.save({
        title: '导出账号数据',
        defaultPath: defaultFilename,
        filters: [{
          name: selectedFormat.toUpperCase(),
          extensions: [ext]
        }]
      })

      if (filePath) {
        // 写入文件
        await (window as any).__TAURI__.fs.writeTextFile(filePath, content)
        window.UI?.toast.success(`已导出 ${accounts.length} 个账号`)
        window.UI?.modal.close(modal)
        delete window.closeExportDialog
        delete window.submitExport
      }
    } catch (error) {
      window.UI?.toast.error('导出失败: ' + (error as Error).message)
    }
  }
}
