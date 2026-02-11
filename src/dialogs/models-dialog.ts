// 账号可用模型对话框
import type { Account } from '../types'
import { accountStore } from '../store'
import awsIcon from '../assets/aws-color.svg'
import chatglmIcon from '../assets/chatglm-color.svg'
import claudeIcon from '../assets/claude-color.svg'
import deepseekIcon from '../assets/deepseek-color.svg'
import doubaoIcon from '../assets/doubao-color.svg'
import geminiIcon from '../assets/gemini-color.svg'
import grokIcon from '../assets/grok.svg'
import ollamaIcon from '../assets/ollama.svg'
import openaiIcon from '../assets/openai.svg'
import qwenIcon from '../assets/qwen-color.svg'
import minimaxIcon from '../assets/minimax-color.svg'

interface Model {
  id: string
  name: string
  description: string
  inputTypes?: string[]
  maxInputTokens?: number | null
  maxOutputTokens?: number | null
  rateMultiplier?: number
  rateUnit?: string
}

export function showModelsDialog(account: Account) {
  window.UI?.modal.open({
    title: '可用模型',
    html: `
      <div class="models-dialog-content" id="models-content">
        <div class="models-loading">
          <div class="models-loading-spinner"></div>
          <div>正在加载模型列表...</div>
        </div>
      </div>
    `,
    footer: `
      <button class="ui-btn ui-btn-secondary ui-btn-sm" onclick="window.refreshModels()">刷新</button>
      <button class="ui-btn ui-btn-primary ui-btn-sm" onclick="window.closeModelsModal()">关闭</button>
    `,
    size: 'lg',
    closable: true
  })

  // 注册全局函数
  window.refreshModels = () => {
    loadModels(account)
  }

  window.closeModelsModal = () => {
    window.UI?.modal.closeAll()
    delete window.refreshModels
    delete window.closeModelsModal
  }

  // 加载模型列表
  loadModels(account)
}

async function loadModels(account: Account) {
  const content = document.querySelector('#models-content')
  if (!content) return

  try {
    // 调用后端 API 获取模型列表
    const result = await (window as any).__TAURI__.core.invoke('get_account_models', {
      accessToken: account.credentials.accessToken,
      region: account.credentials.region || 'us-east-1'
    })

    if (result.success && result.models) {
      content.innerHTML = renderModels(result.models)
    } else {
      throw new Error(result.error || '获取模型列表失败')
    }
  } catch (error) {
    console.error('[模型列表] 加载失败:', error)
    const errorMessage = (error as Error).message
    
    // 检查是否是 403 错误（账号被封禁）
    if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
      content.innerHTML = `
        <div class="models-error">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
          </svg>
          <div class="models-error-text">账号已被封禁</div>
          <div class="models-error-desc">此账号无法访问模型列表，请检查账号状态</div>
        </div>
      `
    } else {
      content.innerHTML = `
        <div class="models-error">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <div class="models-error-text">加载失败</div>
          <div class="models-error-desc">${errorMessage}</div>
        </div>
      `
    }
  }
}

function getModelIcon(modelId: string, modelName: string): string {
  const id = modelId.toLowerCase()
  const name = modelName.toLowerCase()
  
  // 根据模型 ID 或名称匹配对应的图标
  if (id.includes('claude') || name.includes('claude') || name.includes('anthropic')) {
    return `<img class="model-icon" src="${claudeIcon}" alt="${modelName}" />`
  }
  
  if (id.includes('gpt') || id.includes('openai') || name.includes('openai')) {
    return `<img class="model-icon" src="${openaiIcon}" alt="${modelName}" />`
  }
  
  if (id.includes('gemini') || name.includes('gemini') || name.includes('google')) {
    return `<img class="model-icon" src="${geminiIcon}" alt="${modelName}" />`
  }
  
  if (id.includes('deepseek') || name.includes('deepseek')) {
    return `<img class="model-icon" src="${deepseekIcon}" alt="${modelName}" />`
  }
  
  if (id.includes('qwen') || name.includes('qwen') || name.includes('通义')) {
    return `<img class="model-icon" src="${qwenIcon}" alt="${modelName}" />`
  }
  
  if (id.includes('chatglm') || name.includes('chatglm') || name.includes('智谱')) {
    return `<img class="model-icon" src="${chatglmIcon}" alt="${modelName}" />`
  }
  
  if (id.includes('doubao') || name.includes('doubao') || name.includes('豆包')) {
    return `<img class="model-icon" src="${doubaoIcon}" alt="${modelName}" />`
  }
  
  if (id.includes('grok') || name.includes('grok')) {
    return `<img class="model-icon" src="${grokIcon}" alt="${modelName}" />`
  }
  
  if (id.includes('ollama') || name.includes('ollama')) {
    return `<img class="model-icon" src="${ollamaIcon}" alt="${modelName}" />`
  }

  if (id.includes('minimax') || name.includes('minimax')) {
    return `<img class="model-icon" src="${minimaxIcon}" alt="${modelName}" />`
  }
  
  // auto 和默认都使用 AWS 图标
  return `<img class="model-icon" src="${awsIcon}" alt="${modelName}" />`
}

function renderModels(models: Model[]): string {
  if (models.length === 0) {
    return `
      <div class="models-empty">
        <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="9" y1="9" x2="15" y2="9"></line>
          <line x1="9" y1="15" x2="15" y2="15"></line>
        </svg>
        <div class="models-empty-text">暂无可用模型</div>
      </div>
    `
  }

  return `
    <div class="models-list">
      ${models.map(model => `
        <div class="model-item">
          <div class="model-header">
            ${getModelIcon(model.id, model.name)}
            <div class="model-info">
              <div class="model-name">${model.name}</div>
              <div class="model-id">${model.id}</div>
            </div>
          </div>
          <div class="model-details">
            ${model.maxInputTokens ? `
              <div class="model-detail-item">
                <span class="model-detail-label">输入:</span>
                <span class="model-detail-value">${formatTokens(model.maxInputTokens)}</span>
              </div>
            ` : ''}
            ${model.maxOutputTokens ? `
              <div class="model-detail-item">
                <span class="model-detail-label">输出:</span>
                <span class="model-detail-value">${formatTokens(model.maxOutputTokens)}</span>
              </div>
            ` : ''}
            ${model.rateMultiplier ? `
              <div class="model-detail-item">
                <span class="model-detail-label">费率:</span>
                <span class="model-detail-value">${model.rateMultiplier}x</span>
              </div>
            ` : ''}
          </div>
          ${model.inputTypes && model.inputTypes.length > 0 ? `
            <div class="model-input-types">
              ${model.inputTypes.map(type => `<span class="model-input-type">${type}</span>`).join('')}
            </div>
          ` : ''}
        </div>
      `).join('')}
    </div>
  `
}

function formatTokens(tokens: number): string {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(1)}M`
  }
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(0)}K`
  }
  return tokens.toString()
}
