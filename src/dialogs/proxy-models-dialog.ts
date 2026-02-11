// 反代模型列表对话框

// 模型图标映射
const MODEL_ICONS: Record<string, string> = {
  'claude': '/src/assets/claude-color.svg',
  'gpt': '/src/assets/openai.svg',
  'openai': '/src/assets/openai.svg',
  'gemini': '/src/assets/gemini-color.svg',
  'deepseek': '/src/assets/deepseek-color.svg',
  'qwen': '/src/assets/qwen-color.svg',
  'glm': '/src/assets/chatglm-color.svg',
  'chatglm': '/src/assets/chatglm-color.svg',
  'doubao': '/src/assets/doubao-color.svg',
  'minimax': '/src/assets/minimax-color.svg',
  'grok': '/src/assets/grok.svg',
  'ollama': '/src/assets/ollama.svg',
  'aws': '/src/assets/aws-color.svg',
  'amazon': '/src/assets/aws-color.svg'
}

/**
 * 获取模型图标
 */
function getModelIcon(modelId: string): string {
  const lowerModelId = modelId.toLowerCase()
  
  for (const [key, icon] of Object.entries(MODEL_ICONS)) {
    if (lowerModelId.includes(key)) {
      return icon
    }
  }
  
  return '/src/assets/kiro-icon.svg'
}

/**
 * 显示模型列表对话框
 */
export function showProxyModelsDialog(models: any[], fromCache: boolean) {
  const modal = window.UI?.modal.open({
    title: `可用模型 ${fromCache ? '(缓存)' : ''}`,
    html: `
      <div class="modal-form">
        <div class="form-section">
          ${models.length === 0 ? `
            <div style="padding: 40px; text-align: center; color: var(--text-muted);">
              暂无可用模型
            </div>
          ` : `
            <div style="max-height: 500px; overflow-y: auto;">
              ${models.map(model => {
                const modelId = model.id || model.name || '未知模型'
                const icon = getModelIcon(modelId)
                return `
                  <div style="display: flex; align-items: center; gap: 12px; padding: 12px; border-bottom: 1px solid var(--border-color);">
                    <img src="${icon}" alt="${modelId}" style="width: 24px; height: 24px; flex-shrink: 0;" />
                    <div style="flex: 1; min-width: 0;">
                      <div style="font-weight: 600; color: var(--text-main); margin-bottom: 4px;">
                        ${modelId}
                      </div>
                      ${model.description ? `
                        <div style="font-size: 12px; color: var(--text-muted);">
                          ${model.description}
                        </div>
                      ` : ''}
                    </div>
                  </div>
                `
              }).join('')}
            </div>
          `}
        </div>
      </div>
    `,
    footer: `
      <button class="ui-btn ui-btn-primary" onclick="window.closeProxyModelsDialog()">关闭</button>
    `,
    size: 'lg',
    closable: true
  })

  window.closeProxyModelsDialog = () => {
    window.UI?.modal.close(modal)
    delete window.closeProxyModelsDialog
  }
}
