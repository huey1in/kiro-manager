// 对话配置页面渲染器

// Region 映射
const REGION_MAP: Record<string, string> = {
  'us-east-1': 'us-east-1 (N. Virginia)',
  'us-east-2': 'us-east-2 (Ohio)',
  'us-west-1': 'us-west-1 (N. California)',
  'us-west-2': 'us-west-2 (Oregon)',
  'eu-west-1': 'eu-west-1 (Ireland)',
  'eu-west-2': 'eu-west-2 (London)',
  'eu-west-3': 'eu-west-3 (Paris)',
  'eu-central-1': 'eu-central-1 (Frankfurt)',
  'eu-north-1': 'eu-north-1 (Stockholm)',
  'eu-south-1': 'eu-south-1 (Milan)',
  'ap-northeast-1': 'ap-northeast-1 (Tokyo)',
  'ap-northeast-2': 'ap-northeast-2 (Seoul)',
  'ap-northeast-3': 'ap-northeast-3 (Osaka)',
  'ap-southeast-1': 'ap-southeast-1 (Singapore)',
  'ap-southeast-2': 'ap-southeast-2 (Sydney)',
  'ap-south-1': 'ap-south-1 (Mumbai)',
  'ap-east-1': 'ap-east-1 (Hong Kong)',
  'ca-central-1': 'ca-central-1 (Canada)',
  'sa-east-1': 'sa-east-1 (São Paulo)',
  'me-south-1': 'me-south-1 (Bahrain)',
  'af-south-1': 'af-south-1 (Cape Town)'
}

// 获取 region 显示文本
function getRegionDisplayText(region: string): string {
  return REGION_MAP[region] || region
}

// 对话配置接口
export interface ChatConfig {
  systemPrompt: string
  useCustomApi: boolean
  useOpenAIFormat: boolean  // 新增：是否使用 OpenAI 格式
  customBaseUrl: string
  customApiKey: string
  customRefreshToken: string
  customClientId: string
  customClientSecret: string
  customRegion: string
}

// 默认配置
const DEFAULT_CONFIG: ChatConfig = {
  systemPrompt: '',
  useCustomApi: false,
  useOpenAIFormat: false,  // 默认使用 AWS 格式
  customBaseUrl: '',
  customApiKey: '',
  customRefreshToken: '',
  customClientId: '',
  customClientSecret: '',
  customRegion: 'us-east-1'
}

// 加载配置
export function loadChatConfig(): ChatConfig {
  try {
    const saved = localStorage.getItem('chat_config')
    if (saved) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(saved) }
    }
  } catch (error) {
    console.error('[Chat Config] 加载配置失败:', error)
  }
  return { ...DEFAULT_CONFIG }
}

// 保存配置
export function saveChatConfig(config: ChatConfig) {
  try {
    localStorage.setItem('chat_config', JSON.stringify(config))
  } catch (error) {
    console.error('[Chat Config] 保存配置失败:', error)
  }
}

// 渲染配置页面
export function renderChatConfigView(): string {
  const config = loadChatConfig()
  
  return `
    <div class="settings-page">
      <div class="settings-section">
        <h3 class="settings-section-title">基础配置</h3>
        
        <div class="settings-item" style="display: block;">
          <div class="settings-item-info" style="margin-bottom: 8px;">
            <div class="settings-item-label">System Prompt</div>
            <div class="settings-item-desc">设置 AI 的角色和行为规则</div>
          </div>
          <textarea 
            id="config-system-prompt" 
            class="ui-input" 
            placeholder="输入系统提示词（可选）"
            style="width: 100%; min-height: 120px; resize: vertical; font-family: inherit;"
          >${config.systemPrompt}</textarea>
        </div>
      </div>
      
      <div class="settings-section">
        <h3 class="settings-section-title">自定义 API</h3>
        
        <div class="settings-item">
          <div class="settings-item-info">
            <div class="settings-item-label">使用自定义 API</div>
            <div class="settings-item-desc">不使用当前激活账号，改用自定义凭证</div>
          </div>
          <label class="ui-switch">
            <input type="checkbox" id="config-use-custom-api" ${config.useCustomApi ? 'checked' : ''}>
            <span class="ui-switch-track">
              <span class="ui-switch-thumb"></span>
            </span>
          </label>
        </div>
        
        ${config.useCustomApi ? `
          <div class="settings-subsection">
            <div class="settings-item">
              <div class="settings-item-info">
                <div class="settings-item-label">API 格式</div>
                <div class="settings-item-desc">选择使用的 API 格式</div>
              </div>
              <label class="ui-switch">
                <input type="checkbox" id="config-use-openai-format" ${config.useOpenAIFormat ? 'checked' : ''}>
                <span class="ui-switch-track">
                  <span class="ui-switch-thumb"></span>
                </span>
              </label>
              <span style="margin-left: 12px; font-size: 13px; color: var(--text-main);">
                ${config.useOpenAIFormat ? 'OpenAI 格式' : 'AWS 格式'}
              </span>
            </div>
            
            ${config.useOpenAIFormat ? `
              <div class="settings-info-box">
                <p>• 使用 OpenAI 兼容的 API 格式（/v1/chat/completions）</p>
                <p>• 支持 OpenAI、Claude、本地模型等</p>
              </div>
              
              <div class="settings-item" style="display: block;">
                <div class="settings-item-info" style="margin-bottom: 8px;">
                  <div class="settings-item-label">Base URL</div>
                  <div class="settings-item-desc">API 基础地址</div>
                </div>
                <input 
                  type="text" 
                  id="config-base-url" 
                  class="ui-input" 
                  value="${config.customBaseUrl}" 
                  placeholder="https://api.openai.com"
                  style="width: 100%; max-width: 400px;"
                />
              </div>
              
              <div class="settings-item" style="display: block;">
                <div class="settings-item-info" style="margin-bottom: 8px;">
                  <div class="settings-item-label">API Key</div>
                  <div class="settings-item-desc">用于 Bearer Token 认证</div>
                </div>
                <input 
                  type="password" 
                  id="config-api-key" 
                  class="ui-input" 
                  value="${config.customApiKey}" 
                  placeholder="sk-..."
                  style="width: 100%; max-width: 400px;"
                />
              </div>
            ` : `
              <div class="settings-info-box">
                <p>• 使用 AWS Kiro API 格式</p>
                <p>• 需要提供 AWS 凭证或 Access Token</p>
              </div>
              
              <div class="settings-item" style="display: block;">
                <div class="settings-item-info" style="margin-bottom: 8px;">
                  <div class="settings-item-label">API Key / Access Token</div>
                  <div class="settings-item-desc">AWS Access Token（可选，优先使用）</div>
                </div>
                <input 
                  type="password" 
                  id="config-api-key" 
                  class="ui-input" 
                  value="${config.customApiKey}" 
                  placeholder="AWS Access Token"
                  style="width: 100%; max-width: 400px;"
                />
              </div>
              
              <div style="margin: 20px 0; padding: 12px; background: var(--slate-50); border-radius: 6px; text-align: center; color: var(--text-muted); font-size: 12px;">
                或使用 AWS 凭证
              </div>
            
            <div class="settings-item" style="display: block;">
              <div class="settings-item-info" style="margin-bottom: 8px;">
                <div class="settings-item-label">Refresh Token</div>
                <div class="settings-item-desc">AWS Refresh Token</div>
              </div>
              <input 
                type="password" 
                id="config-refresh-token" 
                class="ui-input" 
                value="${config.customRefreshToken}" 
                placeholder="AWS Refresh Token"
                style="width: 100%; max-width: 400px;"
              />
            </div>
            
            <div class="settings-item" style="display: block;">
              <div class="settings-item-info" style="margin-bottom: 8px;">
                <div class="settings-item-label">Client ID</div>
                <div class="settings-item-desc">AWS Client ID</div>
              </div>
              <input 
                type="text" 
                id="config-client-id" 
                class="ui-input" 
                value="${config.customClientId}" 
                placeholder="AWS Client ID"
                style="width: 100%; max-width: 400px;"
              />
            </div>
            
            <div class="settings-item" style="display: block;">
              <div class="settings-item-info" style="margin-bottom: 8px;">
                <div class="settings-item-label">Client Secret</div>
                <div class="settings-item-desc">AWS Client Secret</div>
              </div>
              <input 
                type="password" 
                id="config-client-secret" 
                class="ui-input" 
                value="${config.customClientSecret}" 
                placeholder="AWS Client Secret"
                style="width: 100%; max-width: 400px;"
              />
            </div>
            
            <div class="settings-item" style="display: block;">
              <div class="settings-item-info" style="margin-bottom: 8px;">
                <div class="settings-item-label">Region</div>
                <div class="settings-item-desc">AWS Region</div>
              </div>
              <div class="ui-dropdown dropdown-up" style="width: 100%; max-width: 400px;">
                <button class="ui-btn ui-btn-secondary" data-dropdown style="width: 100%; justify-content: space-between;" id="config-region-btn">
                  <span id="config-region-text">${getRegionDisplayText(config.customRegion)}</span>
                  <span>▲</span>
                </button>
                <div class="ui-dropdown-menu" style="width: 100%; max-height: 300px; overflow-y: auto;">
                  <div class="dropdown-group-label">US</div>
                  <button class="ui-dropdown-item" onclick="window.selectChatConfigRegion('us-east-1', 'us-east-1 (N. Virginia)')">us-east-1 (N. Virginia)</button>
                  <button class="ui-dropdown-item" onclick="window.selectChatConfigRegion('us-east-2', 'us-east-2 (Ohio)')">us-east-2 (Ohio)</button>
                  <button class="ui-dropdown-item" onclick="window.selectChatConfigRegion('us-west-1', 'us-west-1 (N. California)')">us-west-1 (N. California)</button>
                  <button class="ui-dropdown-item" onclick="window.selectChatConfigRegion('us-west-2', 'us-west-2 (Oregon)')">us-west-2 (Oregon)</button>
                  <div class="dropdown-group-label">Europe</div>
                  <button class="ui-dropdown-item" onclick="window.selectChatConfigRegion('eu-west-1', 'eu-west-1 (Ireland)')">eu-west-1 (Ireland)</button>
                  <button class="ui-dropdown-item" onclick="window.selectChatConfigRegion('eu-west-2', 'eu-west-2 (London)')">eu-west-2 (London)</button>
                  <button class="ui-dropdown-item" onclick="window.selectChatConfigRegion('eu-west-3', 'eu-west-3 (Paris)')">eu-west-3 (Paris)</button>
                  <button class="ui-dropdown-item" onclick="window.selectChatConfigRegion('eu-central-1', 'eu-central-1 (Frankfurt)')">eu-central-1 (Frankfurt)</button>
                  <button class="ui-dropdown-item" onclick="window.selectChatConfigRegion('eu-north-1', 'eu-north-1 (Stockholm)')">eu-north-1 (Stockholm)</button>
                  <button class="ui-dropdown-item" onclick="window.selectChatConfigRegion('eu-south-1', 'eu-south-1 (Milan)')">eu-south-1 (Milan)</button>
                  <div class="dropdown-group-label">Asia Pacific</div>
                  <button class="ui-dropdown-item" onclick="window.selectChatConfigRegion('ap-northeast-1', 'ap-northeast-1 (Tokyo)')">ap-northeast-1 (Tokyo)</button>
                  <button class="ui-dropdown-item" onclick="window.selectChatConfigRegion('ap-northeast-2', 'ap-northeast-2 (Seoul)')">ap-northeast-2 (Seoul)</button>
                  <button class="ui-dropdown-item" onclick="window.selectChatConfigRegion('ap-northeast-3', 'ap-northeast-3 (Osaka)')">ap-northeast-3 (Osaka)</button>
                  <button class="ui-dropdown-item" onclick="window.selectChatConfigRegion('ap-southeast-1', 'ap-southeast-1 (Singapore)')">ap-southeast-1 (Singapore)</button>
                  <button class="ui-dropdown-item" onclick="window.selectChatConfigRegion('ap-southeast-2', 'ap-southeast-2 (Sydney)')">ap-southeast-2 (Sydney)</button>
                  <button class="ui-dropdown-item" onclick="window.selectChatConfigRegion('ap-south-1', 'ap-south-1 (Mumbai)')">ap-south-1 (Mumbai)</button>
                  <button class="ui-dropdown-item" onclick="window.selectChatConfigRegion('ap-east-1', 'ap-east-1 (Hong Kong)')">ap-east-1 (Hong Kong)</button>
                  <div class="dropdown-group-label">Other</div>
                  <button class="ui-dropdown-item" onclick="window.selectChatConfigRegion('ca-central-1', 'ca-central-1 (Canada)')">ca-central-1 (Canada)</button>
                  <button class="ui-dropdown-item" onclick="window.selectChatConfigRegion('sa-east-1', 'sa-east-1 (São Paulo)')">sa-east-1 (São Paulo)</button>
                  <button class="ui-dropdown-item" onclick="window.selectChatConfigRegion('me-south-1', 'me-south-1 (Bahrain)')">me-south-1 (Bahrain)</button>
                  <button class="ui-dropdown-item" onclick="window.selectChatConfigRegion('af-south-1', 'af-south-1 (Cape Town)')">af-south-1 (Cape Town)</button>
                </div>
              </div>
              <input type="hidden" id="config-region" value="${config.customRegion}">
            </div>
            `}
          </div>
        ` : ''}
      </div>
      
      <div class="settings-section">
        <button class="ui-btn ui-btn-primary" id="save-chat-config-btn">保存配置</button>
        <button class="ui-btn ui-btn-secondary" id="back-to-chat-btn" style="margin-left: 8px;">返回对话</button>
      </div>
    </div>
  `
}

// 绑定配置页面事件
export function attachChatConfigEvents(container: HTMLElement, onSave: () => void, onBack: () => void) {
  // 注册全局 region 选择函数
  (window as any).selectChatConfigRegion = (region: string, displayText: string) => {
    const regionInput = document.getElementById('config-region') as HTMLInputElement
    const regionText = document.getElementById('config-region-text')
    if (regionInput) regionInput.value = region
    if (regionText) regionText.textContent = displayText
  }
  
  // 使用自定义 API 开关
  const useCustomApiToggle = container.querySelector('#config-use-custom-api') as HTMLInputElement
  if (useCustomApiToggle) {
    useCustomApiToggle.addEventListener('change', () => {
      // 先保存当前状态
      const currentConfig = loadChatConfig()
      currentConfig.useCustomApi = useCustomApiToggle.checked
      saveChatConfig(currentConfig)
      
      // 重新渲染页面以显示/隐藏子选项
      container.innerHTML = renderChatConfigView()
      attachChatConfigEvents(container, onSave, onBack)
    })
  }
  
  // API 格式开关
  const useOpenAIFormatToggle = container.querySelector('#config-use-openai-format') as HTMLInputElement
  if (useOpenAIFormatToggle) {
    useOpenAIFormatToggle.addEventListener('change', () => {
      // 先保存当前状态
      const currentConfig = loadChatConfig()
      currentConfig.useOpenAIFormat = useOpenAIFormatToggle.checked
      saveChatConfig(currentConfig)
      
      // 重新渲染页面以显示/隐藏对应字段
      container.innerHTML = renderChatConfigView()
      attachChatConfigEvents(container, onSave, onBack)
    })
  }
  
  // 保存按钮
  const saveBtn = container.querySelector('#save-chat-config-btn')
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const systemPromptInput = container.querySelector('#config-system-prompt') as HTMLTextAreaElement
      const useCustomApiInput = container.querySelector('#config-use-custom-api') as HTMLInputElement
      const useOpenAIFormatInput = container.querySelector('#config-use-openai-format') as HTMLInputElement
      const baseUrlInput = container.querySelector('#config-base-url') as HTMLInputElement
      const apiKeyInput = container.querySelector('#config-api-key') as HTMLInputElement
      const refreshTokenInput = container.querySelector('#config-refresh-token') as HTMLInputElement
      const clientIdInput = container.querySelector('#config-client-id') as HTMLInputElement
      const clientSecretInput = container.querySelector('#config-client-secret') as HTMLInputElement
      const regionInput = container.querySelector('#config-region') as HTMLInputElement
      
      if (systemPromptInput && useCustomApiInput) {
        const systemPrompt = systemPromptInput.value.trim()
        const useCustomApi = useCustomApiInput.checked
        const useOpenAIFormat = useOpenAIFormatInput?.checked || false
        
        saveChatConfig({
          systemPrompt,
          useCustomApi,
          useOpenAIFormat,
          customBaseUrl: baseUrlInput?.value.trim() || '',
          customApiKey: apiKeyInput?.value.trim() || '',
          customRefreshToken: refreshTokenInput?.value.trim() || '',
          customClientId: clientIdInput?.value.trim() || '',
          customClientSecret: clientSecretInput?.value.trim() || '',
          customRegion: regionInput?.value.trim() || 'us-east-1'
        })
        
        window.UI?.toast.success('配置已保存')
        
        // 清理全局函数
        delete (window as any).selectChatConfigRegion
        
        onSave()
      }
    })
  }
  
  // 返回按钮
  const backBtn = container.querySelector('#back-to-chat-btn')
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      // 清理全局函数
      delete (window as any).selectChatConfigRegion
      onBack()
    })
  }
}
