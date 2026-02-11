// 重命名对话框

/**
 * 显示重命名对话框
 */
export function showRenameDialog(
  title: string,
  currentName: string,
  onRename?: (newName: string) => void
): void {
  const modal = window.UI?.modal.open({
    title,
    html: `
      <div class="modal-form">
        <div class="form-section">
          <label class="form-label">新名称 <span class="required">*</span></label>
          <input type="text" class="form-input" id="rename-input" value="${currentName}" required autofocus>
          <p class="form-hint">文件名必须以 .md 结尾</p>
        </div>
      </div>
    `,
    footer: `
      <button class="ui-btn ui-btn-secondary" onclick="window.closeRenameDialog()">取消</button>
      <button class="ui-btn ui-btn-primary" onclick="window.submitRename()">确定</button>
    `,
    closable: true
  })

  // 自动选中文件名（不包括扩展名）
  setTimeout(() => {
    const input = document.getElementById('rename-input') as HTMLInputElement
    if (input) {
      const dotIndex = currentName.lastIndexOf('.')
      if (dotIndex > 0) {
        input.setSelectionRange(0, dotIndex)
      } else {
        input.select()
      }
      input.focus()
    }
  }, 100)

  window.closeRenameDialog = () => {
    window.UI?.modal.close(modal)
    delete window.closeRenameDialog
    delete window.submitRename
  }

  window.submitRename = () => {
    const input = document.getElementById('rename-input') as HTMLInputElement
    let newName = input?.value.trim()

    if (!newName) {
      window.UI?.toast.error('请输入新名称')
      return
    }

    // 确保文件名以 .md 结尾
    if (!newName.endsWith('.md')) {
      newName += '.md'
    }

    if (newName === currentName) {
      window.UI?.toast.info('名称未改变')
      window.UI?.modal.close(modal)
      delete window.closeRenameDialog
      delete window.submitRename
      return
    }

    if (onRename) {
      onRename(newName)
    }

    window.UI?.modal.close(modal)
    delete window.closeRenameDialog
    delete window.submitRename
  }

  // 支持回车键提交
  setTimeout(() => {
    const input = document.getElementById('rename-input') as HTMLInputElement
    if (input && window.submitRename) {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          window.submitRename?.()
        }
      })
    }
  }, 100)
}
