// 对话视图渲染器
import { accountStore } from '../store'
import { loadChatConfig, type ChatConfig } from './chat-config-view'
import claudeSvg from '../assets/claude-color.svg'
import openaiSvg from '../assets/openai.svg'
import geminiSvg from '../assets/gemini-color.svg'
import deepseekSvg from '../assets/deepseek-color.svg'
import qwenSvg from '../assets/qwen-color.svg'
import chatglmSvg from '../assets/chatglm-color.svg'
import doubaoSvg from '../assets/doubao-color.svg'
import minimaxSvg from '../assets/minimax-color.svg'
import grokSvg from '../assets/grok.svg'
import ollamaSvg from '../assets/ollama.svg'
import awsSvg from '../assets/aws-color.svg'

// 模型图标映射
const MODEL_ICONS: Record<string, string> = {
  'auto': awsSvg,
  'claude': claudeSvg,
  'anthropic': claudeSvg,
  'gpt': openaiSvg,
  'openai': openaiSvg,
  'o1': openaiSvg,
  'gemini': geminiSvg,
  'deepseek': deepseekSvg,
  'qwen': qwenSvg,
  'chatglm': chatglmSvg,
  'glm': chatglmSvg,
  'doubao': doubaoSvg,
  'minimax': minimaxSvg,
  'grok': grokSvg,
  'ollama': ollamaSvg
}

// 当前配置（从 localStorage 加载）
let chatConfig: ChatConfig = loadChatConfig()

// 对话历史存储键
const CHAT_HISTORY_KEY = 'chat_history'

// 对话消息类型
interface StoredMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

// 加载对话历史
function loadChatHistory(): StoredMessage[] {
  try {
    const saved = localStorage.getItem(CHAT_HISTORY_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (error) {
    console.error('[Chat] 加载对话历史失败:', error)
  }
  return []
}

// 保存对话历史
function saveChatHistory(messages: StoredMessage[]) {
  try {
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages))
  } catch (error) {
    console.error('[Chat] 保存对话历史失败:', error)
  }
}

// 清空对话历史
function clearChatHistory() {
  try {
    localStorage.removeItem(CHAT_HISTORY_KEY)
  } catch (error) {
    console.error('[Chat] 清空对话历史失败:', error)
  }
}

// 根据模型 ID 获取图标
function getModelIcon(modelId: string): string {
  const lowerModelId = modelId.toLowerCase()
  for (const [key, icon] of Object.entries(MODEL_ICONS)) {
    if (lowerModelId.includes(key)) {
      return icon
    }
  }
  return claudeSvg // 默认使用 Claude 图标
}

export function renderChatView(): string {
  return `
    <div class="chat-container">
      <div class="chat-header">
        <h2>Chat Now!</h2>
        <div class="chat-controls">
          <div class="ui-dropdown" style="min-width: 200px; max-width: 500px;">
            <button class="ui-btn ui-btn-secondary" data-dropdown style="width: 100%; justify-content: space-between;" id="chat-model-btn">
              <span id="chat-model-text" style="display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1;">
                <span class="chat-model-loading">加载中...</span>
              </span>
              <span style="flex-shrink: 0; margin-left: 8px;">▼</span>
            </button>
            <div class="ui-dropdown-menu" id="chat-model-menu" style="width: 100%; max-height: 200px; overflow-y: auto;">
              <div class="ui-dropdown-item">加载中...</div>
            </div>
          </div>
          <button id="chat-config-btn" class="ui-btn ui-btn-secondary" title="对话配置">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <button id="clear-chat-btn" class="ui-btn ui-btn-secondary" title="清空对话">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
      
      <div class="chat-messages" id="chat-messages">
        <div class="chat-welcome">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <h3>开始对话</h3>
          <p>选择模型后即可开始与 AI 对话</p>
        </div>
      </div>
      
      <div class="chat-input-container">
        <div class="chat-input-wrapper">
          <textarea 
            id="chat-input" 
            class="chat-input" 
            placeholder="输入消息..."
            rows="1"
          ></textarea>
          <button id="send-chat-btn" class="chat-send-btn" disabled>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <div class="chat-status" id="chat-status"></div>
      </div>
    </div>
  `
}

export async function initChatPage(container: HTMLElement) {
  // 重新加载配置（可能在配置页面被修改）
  chatConfig = loadChatConfig()
  
  // 立即恢复对话历史，不等待模型加载
  restoreChatHistory()
  
  // 绑定事件
  attachChatEvents(container)
  
  // 自动调整输入框高度
  const chatInput = container.querySelector('#chat-input') as HTMLTextAreaElement
  if (chatInput) {
    chatInput.addEventListener('input', () => {
      chatInput.style.height = 'auto'
      chatInput.style.height = Math.min(chatInput.scrollHeight, 200) + 'px'
      
      // 更新发送按钮状态
      const sendBtn = container.querySelector('#send-chat-btn') as HTMLButtonElement
      if (sendBtn) {
        sendBtn.disabled = !chatInput.value.trim()
      }
    })
    
    // 支持 Ctrl+Enter 发送
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault()
        sendMessage()
      }
    })
  }
  
  // 异步加载可用模型（不阻塞页面渲染）
  loadChatModels()
}

// 恢复对话历史
function restoreChatHistory() {
  const messagesContainer = document.querySelector('#chat-messages') as HTMLElement
  if (!messagesContainer) return
  
  const history = loadChatHistory()
  
  if (history.length === 0) return
  
  // 清除欢迎消息
  const welcome = messagesContainer.querySelector('.chat-welcome')
  if (welcome) {
    welcome.remove()
  }
  
  // 恢复历史消息
  history.forEach(msg => {
    addMessage(msg.role, msg.content, false)
  })
}

async function loadChatModels() {
  const modelText = document.querySelector('#chat-model-text') as HTMLElement
  const modelMenu = document.querySelector('#chat-model-menu') as HTMLElement
  
  if (!modelText || !modelMenu) return
  
  try {
    // 如果使用 OpenAI 格式，调用 /v1/models 端点
    if (chatConfig.useCustomApi && chatConfig.useOpenAIFormat) {
      if (!chatConfig.customBaseUrl || !chatConfig.customApiKey) {
        modelText.innerHTML = '请配置 Base URL 和 API Key'
        modelMenu.innerHTML = '<div class="ui-dropdown-item">请配置 Base URL 和 API Key</div>'
        return
      }
      
      const baseUrl = chatConfig.customBaseUrl.trim().replace(/\/$/, '')
      const url = `${baseUrl}/v1/models`
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${chatConfig.customApiKey}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        modelText.innerHTML = '获取模型列表失败'
        modelMenu.innerHTML = '<div class="ui-dropdown-item">获取模型列表失败</div>'
        return
      }
      
      const data = await response.json()
      const models = data.data || []
      
      if (models.length === 0) {
        modelText.innerHTML = '没有可用模型'
        modelMenu.innerHTML = '<div class="ui-dropdown-item">没有可用模型</div>'
        return
      }
      
      // 填充模型列表
      modelMenu.innerHTML = ''
      models.forEach((model: any) => {
        const item = document.createElement('button')
        item.className = 'ui-dropdown-item'
        const modelIcon = getModelIcon(model.id)
        item.innerHTML = `
          <img src="${modelIcon}" alt="" style="width: 16px; height: 16px; margin-right: 8px; flex-shrink: 0;" />
          <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${model.id}</span>
        `
        item.setAttribute('onclick', `window.selectChatModel('${model.id}', '${model.id.replace(/'/g, "\\'")}')`)
        modelMenu.appendChild(item)
      })
      
      // 默认选择第一个模型
      if (models.length > 0) {
        selectModel(models[0].id, models[0].id)
      }
      
      return
    }
    
    if (!window.__TAURI__) return
    const { invoke } = window.__TAURI__.core
    
    let accessToken: string
    let region: string
    
    // 如果启用了自定义 AWS API
    if (chatConfig.useCustomApi && !chatConfig.useOpenAIFormat) {
      // 优先使用 API Key
      if (chatConfig.customApiKey) {
        accessToken = chatConfig.customApiKey
        region = chatConfig.customRegion || 'us-east-1'
      }
      // 否则使用 AWS 凭证
      else if (chatConfig.customRefreshToken && chatConfig.customClientId && chatConfig.customClientSecret) {
        const result = await invoke('verify_account_credentials', {
          refreshToken: chatConfig.customRefreshToken,
          clientId: chatConfig.customClientId,
          clientSecret: chatConfig.customClientSecret,
          region: chatConfig.customRegion || 'us-east-1'
        }) as any
        
        if (!result.success || !result.data) {
          modelText.innerHTML = '自定义凭证验证失败'
          modelMenu.innerHTML = '<div class="ui-dropdown-item">自定义凭证验证失败</div>'
          return
        }
        
        accessToken = result.data.access_token
        region = chatConfig.customRegion || 'us-east-1'
      } else {
        modelText.innerHTML = '请配置自定义凭证'
        modelMenu.innerHTML = '<div class="ui-dropdown-item">请配置自定义凭证</div>'
        return
      }
    } else {
      // 使用当前激活账号
      const activeToken = await invoke('get_active_account') as string | null
      
      if (!activeToken) {
        modelText.innerHTML = '请先激活一个账号'
        modelMenu.innerHTML = '<div class="ui-dropdown-item">请先激活一个账号</div>'
        return
      }
      
      const accounts = accountStore.getAccounts()
      const activeAccount = accounts.find(acc => acc.credentials.accessToken === activeToken)
      
      if (!activeAccount) {
        modelText.innerHTML = '未找到激活账号'
        modelMenu.innerHTML = '<div class="ui-dropdown-item">未找到激活账号</div>'
        return
      }
      
      accessToken = activeAccount.credentials.accessToken
      region = activeAccount.credentials.region || 'us-east-1'
    }
    
    // 获取可用模型
    const response = await invoke('get_account_models', {
      accessToken: accessToken,
      region: region
    }) as any
    
    if (!response.success || !response.models || response.models.length === 0) {
      modelText.innerHTML = '没有可用模型'
      modelMenu.innerHTML = '<div class="ui-dropdown-item">没有可用模型</div>'
      return
    }
    
    // 填充模型列表
    modelMenu.innerHTML = ''
    response.models.forEach((model: any) => {
      const item = document.createElement('button')
      item.className = 'ui-dropdown-item'
      const modelIcon = getModelIcon(model.id)
      item.innerHTML = `
        <img src="${modelIcon}" alt="" style="width: 16px; height: 16px; margin-right: 8px; flex-shrink: 0;" />
        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${model.name || model.id}</span>
      `
      item.setAttribute('onclick', `window.selectChatModel('${model.id}', '${(model.name || model.id).replace(/'/g, "\\'")}')`)
      modelMenu.appendChild(item)
    })
    
    // 默认选择第一个模型
    if (response.models.length > 0) {
      selectModel(response.models[0].id, response.models[0].name || response.models[0].id)
    }
  } catch (error) {
    console.error('[Chat] 加载模型失败:', error)
    modelText.innerHTML = '加载失败'
    modelMenu.innerHTML = '<div class="ui-dropdown-item">加载失败</div>'
  }
}

// 选择模型
function selectModel(modelId: string, modelName: string) {
  const modelText = document.querySelector('#chat-model-text') as HTMLElement
  if (modelText) {
    const modelIcon = getModelIcon(modelId)
    modelText.innerHTML = `
      <img src="${modelIcon}" alt="" style="width: 16px; height: 16px; flex-shrink: 0;" />
      <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${modelName}</span>
    `
    modelText.setAttribute('data-model-id', modelId)
  }
}

function attachChatEvents(container: HTMLElement) {
  // 发送按钮
  const sendBtn = container.querySelector('#send-chat-btn')
  if (sendBtn) {
    sendBtn.addEventListener('click', () => sendMessage())
  }
  
  // 清空对话按钮
  const clearBtn = container.querySelector('#clear-chat-btn')
  if (clearBtn) {
    clearBtn.addEventListener('click', () => clearChat())
  }
  
  // 配置按钮 - 切换到配置页面
  const configBtn = container.querySelector('#chat-config-btn')
  if (configBtn) {
    configBtn.addEventListener('click', () => {
      // 触发自定义事件通知父组件切换页面
      window.dispatchEvent(new CustomEvent('switch-chat-page', { detail: { page: 'config' } }))
    })
  }
  
  // 注册全局选择模型函数
  (window as any).selectChatModel = (modelId: string, modelName: string) => {
    selectModel(modelId, modelName)
  }
}

async function sendMessage() {
  const chatInput = document.querySelector('#chat-input') as HTMLTextAreaElement
  const sendBtn = document.querySelector('#send-chat-btn') as HTMLButtonElement
  const modelText = document.querySelector('#chat-model-text') as HTMLElement
  const messagesContainer = document.querySelector('#chat-messages') as HTMLElement
  const statusDiv = document.querySelector('#chat-status') as HTMLElement
  
  if (!chatInput || !sendBtn || !modelText || !messagesContainer) return
  
  const message = chatInput.value.trim()
  const model = modelText.getAttribute('data-model-id')
  
  if (!message || !model) {
    if (!model) {
      showStatus('请先选择模型', 'error')
    }
    return
  }
  
  // 立即清除欢迎消息
  const welcome = messagesContainer.querySelector('.chat-welcome')
  if (welcome) {
    welcome.remove()
  }
  
  // 立即添加用户消息
  addMessage('user', message)
  
  // 清空输入框
  chatInput.value = ''
  chatInput.style.height = 'auto'
  sendBtn.disabled = true
  
  // 显示加载状态
  const loadingId = addMessage('assistant', '', true)
  showStatus('正在思考...', 'loading')
  
  // 获取当前激活账号
  try {
    if (!window.__TAURI__) {
      showStatus('Tauri 环境未就绪', 'error')
      removeMessage(loadingId)
      return
    }
    const { invoke } = window.__TAURI__.core
    
    let accessToken: string
    let region: string
    
    // 如果启用了自定义 API
    if (chatConfig.useCustomApi) {
      // 优先使用 API Key
      if (chatConfig.customApiKey) {
        accessToken = chatConfig.customApiKey
        region = chatConfig.customRegion || 'us-east-1'
      }
      // 否则使用 AWS 凭证
      else if (chatConfig.customRefreshToken && chatConfig.customClientId && chatConfig.customClientSecret) {
        // 使用自定义 AWS 凭证获取 access token
        const result = await invoke('verify_account_credentials', {
          refreshToken: chatConfig.customRefreshToken,
          clientId: chatConfig.customClientId,
          clientSecret: chatConfig.customClientSecret,
          region: chatConfig.customRegion || 'us-east-1'
        }) as any
        
        if (!result.success || !result.data) {
          showStatus('自定义凭证验证失败', 'error')
          removeMessage(loadingId)
          return
        }
        
        accessToken = result.data.access_token
        region = chatConfig.customRegion || 'us-east-1'
      } else {
        showStatus('请配置 API Key 或完整的 AWS 凭证', 'error')
        removeMessage(loadingId)
        return
      }
    } else {
      // 使用当前激活账号
      const activeToken = await invoke('get_active_account') as string | null
      
      if (!activeToken) {
        showStatus('请先激活一个账号或配置自定义 API', 'error')
        removeMessage(loadingId)
        return
      }
      
      // 从 store 获取账号列表,找到匹配的账号
      const accounts = accountStore.getAccounts()
      const activeAccount = accounts.find(acc => acc.credentials.accessToken === activeToken)
      
      if (!activeAccount) {
        showStatus('未找到激活账号', 'error')
        removeMessage(loadingId)
        return
      }
      
      accessToken = activeAccount.credentials.accessToken
      region = activeAccount.credentials.region || 'us-east-1'
    }
    
    // 获取对话历史
    const messages = getConversationHistory()
    
    // 如果配置了系统提示词，添加到消息开头
    if (chatConfig.systemPrompt) {
      messages.unshift({ role: 'system', content: chatConfig.systemPrompt })
    }
    
    messages.push({ role: 'user', content: message })
    
    // 调用对话 API
    const useOpenAI = chatConfig.useCustomApi && chatConfig.useOpenAIFormat
    const response = await invoke('send_chat_message', {
      model,
      messages,
      accessToken: accessToken,
      region: region,
      temperature: useOpenAI ? 0.7 : null,
      maxTokens: useOpenAI ? 4096 : null,
      useCustomApi: useOpenAI,
      customBaseUrl: useOpenAI ? chatConfig.customBaseUrl : null
    }) as any
    
    // 移除加载消息
    removeMessage(loadingId)
    
    // 添加助手回复
    if (response.success) {
      addMessage('assistant', response.content)
      
      // 显示 token 信息
      if (response.inputTokens || response.outputTokens || response.credits) {
        const tokenInfo = []
        if (response.inputTokens) tokenInfo.push(`输入: ${response.inputTokens}`)
        if (response.outputTokens) tokenInfo.push(`输出: ${response.outputTokens}`)
        if (response.credits) tokenInfo.push(`消耗: ${response.credits.toFixed(2)} credits`)
        showStatus(tokenInfo.join(' | '), 'success')
      } else {
        showStatus('', '')
      }
    } else {
      addMessage('assistant', `错误: ${response.error}`)
      showStatus('发送失败', 'error')
    }
  } catch (error) {
    console.error('[Chat] 发送消息失败:', error)
    const loadingId = `msg-${Date.now()}`
    removeMessage(loadingId)
    addMessage('assistant', `错误: ${error}`)
    showStatus('发送失败', 'error')
  }
}

function addMessage(role: 'user' | 'assistant', content: string, isLoading = false): string {
  const messagesContainer = document.querySelector('#chat-messages') as HTMLElement
  if (!messagesContainer) return ''
  
  const messageId = `msg-${Date.now()}-${Math.random()}`
  const messageDiv = document.createElement('div')
  messageDiv.id = messageId
  
  if (isLoading) {
    // 加载状态不使用气泡，直接显示三个点
    messageDiv.className = 'chat-message chat-message-assistant'
    messageDiv.innerHTML = `
      <div class="chat-loading">正在思考</div>
    `
  } else {
    messageDiv.className = `chat-message chat-message-${role}`
    messageDiv.innerHTML = `
      <div class="chat-message-content">${escapeHtml(content)}</div>
    `
    
    // 保存到历史记录（不保存加载状态的消息）
    const history = loadChatHistory()
    history.push({
      role,
      content,
      timestamp: Date.now()
    })
    saveChatHistory(history)
  }
  
  messagesContainer.appendChild(messageDiv)
  messagesContainer.scrollTop = messagesContainer.scrollHeight
  
  return messageId
}

function removeMessage(messageId: string) {
  const message = document.getElementById(messageId)
  if (message) {
    message.remove()
  }
}

function clearChat() {
  const messagesContainer = document.querySelector('#chat-messages') as HTMLElement
  if (!messagesContainer) return
  
  messagesContainer.innerHTML = `
    <div class="chat-welcome">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
      <h3>开始对话</h3>
      <p>选择模型后即可开始与 AI 对话</p>
    </div>
  `
  
  // 清空历史记录
  clearChatHistory()
  
  showStatus('对话已清空', 'success')
  setTimeout(() => showStatus('', ''), 2000)
}

function getConversationHistory(): Array<{ role: string; content: string }> {
  const messagesContainer = document.querySelector('#chat-messages') as HTMLElement
  if (!messagesContainer) return []
  
  const messages: Array<{ role: string; content: string }> = []
  const messageElements = messagesContainer.querySelectorAll('.chat-message')
  
  messageElements.forEach(el => {
    if (el.classList.contains('chat-message-user')) {
      const content = el.querySelector('.chat-message-content')?.textContent?.trim()
      if (content) {
        messages.push({ role: 'user', content })
      }
    } else if (el.classList.contains('chat-message-assistant')) {
      const content = el.querySelector('.chat-message-content')?.textContent?.trim()
      if (content && !el.querySelector('.chat-loading')) {
        messages.push({ role: 'assistant', content })
      }
    }
  })
  
  return messages
}

function showStatus(message: string, type: 'loading' | 'success' | 'error' | '') {
  const statusDiv = document.querySelector('#chat-status') as HTMLElement
  if (!statusDiv) return
  
  statusDiv.textContent = message
  statusDiv.className = 'chat-status'
  if (type) {
    statusDiv.classList.add(`chat-status-${type}`)
  }
}

function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML.replace(/\n/g, '<br>')
}
