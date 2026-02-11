// JSON 编辑器对话框

/**
 * 显示 JSON 编辑对话框
 */
export async function showJsonEditorDialog(
  title: string,
  loadContent: () => Promise<string>,
  saveContent: (content: string) => Promise<void>
): Promise<void> {
  let content = ''

  try {
    content = await loadContent()
  } catch (error) {
    window.UI?.toast.error('读取文件失败')
    return
  }

  const modal = window.UI?.modal.open({
    title,
    html: `
      <div class="modal-form">
        <div class="form-section">
          <label class="form-label">JSON 内容</label>
          <textarea class="form-input form-textarea" id="json-editor-content" rows="20" style="font-family: 'Consolas', 'Monaco', monospace; font-size: 13px;">${content}</textarea>
          <p class="form-hint">编辑 JSON 配置文件，保存前会自动验证格式</p>
        </div>
      </div>
    `,
    footer: `
      <button class="ui-btn ui-btn-secondary" onclick="window.closeJsonEditorDialog()">取消</button>
      <button class="ui-btn ui-btn-secondary" onclick="window.formatJson()">格式化</button>
      <button class="ui-btn ui-btn-primary" onclick="window.submitJsonEditor()">保存</button>
    `,
    size: 'lg',
    closable: true
  })

  window.closeJsonEditorDialog = () => {
    window.UI?.modal.close(modal)
    delete window.closeJsonEditorDialog
    delete window.formatJson
    delete window.submitJsonEditor
  }

  window.formatJson = () => {
    const textarea = document.getElementById('json-editor-content') as HTMLTextAreaElement
    if (!textarea) return

    try {
      const parsed = JSON.parse(textarea.value)
      textarea.value = JSON.stringify(parsed, null, 2)
      window.UI?.toast.success('格式化成功')
    } catch (error) {
      window.UI?.toast.error('JSON 格式错误: ' + (error as Error).message)
    }
  }

  window.submitJsonEditor = async () => {
    const textarea = document.getElementById('json-editor-content') as HTMLTextAreaElement
    if (!textarea) return

    const newContent = textarea.value.trim()

    if (!newContent) {
      window.UI?.toast.error('内容不能为空')
      return
    }

    // 验证 JSON 格式
    try {
      JSON.parse(newContent)
    } catch (error) {
      window.UI?.toast.error('JSON 格式错误: ' + (error as Error).message)
      return
    }

    try {
      await saveContent(newContent)
      window.UI?.toast.success('保存成功')
      window.UI?.modal.close(modal)
      delete window.closeJsonEditorDialog
      delete window.formatJson
      delete window.submitJsonEditor
    } catch (error) {
      window.UI?.toast.error('保存失败: ' + (error as Error).message)
    }
  }
}
