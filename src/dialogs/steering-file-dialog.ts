// Steering 文件编辑对话框
import { kiroSettingsService } from '../services/kiro-settings-service'

/**
 * 显示 Steering 文件编辑对话框
 */
export async function showSteeringFileDialog(
  filename?: string,
  onSave?: () => void
): Promise<void> {
  const isEdit = !!filename
  let content = ''

  // 如果是编辑模式，加载文件内容
  if (isEdit && filename) {
    try {
      content = await kiroSettingsService.readSteeringFile(filename)
    } catch (error) {
      window.UI?.toast.error('读取文件失败')
      return
    }
  }

  const modal = window.UI?.modal.open({
    title: isEdit ? `编辑 ${filename}` : '创建 Steering 文件',
    html: `
      <div class="modal-form">
        ${!isEdit ? `
          <div class="form-section">
            <label class="form-label">文件名 <span class="required">*</span></label>
            <input type="text" class="form-input" id="steering-filename" placeholder="例如: 开发规范.md" required>
            <p class="form-hint">文件名必须以 .md 结尾</p>
          </div>
        ` : ''}

        <div class="form-section">
          <label class="form-label">文件内容 <span class="required">*</span></label>
          <textarea class="form-input form-textarea" id="steering-content" placeholder="输入 Markdown 格式的规则内容..." rows="15" required>${content}</textarea>
          <p class="form-hint">使用 Markdown 格式编写 AI 助手的行为规则</p>
        </div>
      </div>
    `,
    footer: `
      <button class="ui-btn ui-btn-secondary" onclick="window.closeSteeringFileDialog()">取消</button>
      <button class="ui-btn ui-btn-primary" onclick="window.submitSteeringFile()">保存</button>
    `,
    size: 'lg',
    closable: true
  })

  window.closeSteeringFileDialog = () => {
    window.UI?.modal.close(modal)
    delete window.closeSteeringFileDialog
    delete window.submitSteeringFile
  }

  window.submitSteeringFile = async () => {
    let finalFilename = filename
    
    if (!isEdit) {
      const filenameInput = document.getElementById('steering-filename') as HTMLInputElement
      finalFilename = filenameInput?.value.trim()
      
      if (!finalFilename) {
        window.UI?.toast.error('请输入文件名')
        return
      }

      if (!finalFilename.endsWith('.md')) {
        finalFilename += '.md'
      }
    }

    const contentInput = document.getElementById('steering-content') as HTMLTextAreaElement
    const fileContent = contentInput?.value.trim()

    if (!fileContent) {
      window.UI?.toast.error('请输入文件内容')
      return
    }

    try {
      await kiroSettingsService.saveSteeringFile(finalFilename!, fileContent)
      window.UI?.toast.success(isEdit ? '文件已保存' : '文件已创建')
      
      if (onSave) {
        onSave()
      }

      window.UI?.modal.close(modal)
      delete window.closeSteeringFileDialog
      delete window.submitSteeringFile
    } catch (error) {
      window.UI?.toast.error('保存失败: ' + (error as Error).message)
    }
  }
}
