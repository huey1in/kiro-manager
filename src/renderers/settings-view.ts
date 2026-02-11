import { autoRefreshService } from '../services/auto-refresh-service'
import { accountStore } from '../store'
import { proxyService } from '../services/proxy-service'

export async function renderSettingsView(): Promise<string> {
  const config = autoRefreshService.getConfig()
  const settings = accountStore.getSettings()
  
  // 加载代理配置
  let proxyConfig: any = {
    port: 5580,
    host: '127.0.0.1',
    logRequests: true,
    maxRetries: 3,
    enableOpenAI: true,
    enableClaude: true
  }
  
  try {
    const status = await proxyService.getStatus()
    if (status.config) {
      proxyConfig = status.config
    }
  } catch (error) {
    console.error('[设置] 加载代理配置失败:', error)
  }
  
  // 格式化显示文本
  let intervalText = ''
  if (config.interval < 1) {
    intervalText = `${config.interval * 60} 秒`
  } else {
    intervalText = `${config.interval} 分钟`
  }
  
  return `
    <div class="settings-page">
      <div class="settings-section">
        <h3 class="settings-section-title">外观</h3>
        <div class="settings-item">
          <div class="settings-item-info">
            <div class="settings-item-label">深色模式</div>
            <div class="settings-item-desc">切换深色/浅色主题</div>
          </div>
          <label class="ui-switch">
            <input type="checkbox" id="theme-switch">
            <span class="ui-switch-track">
              <span class="ui-switch-thumb"></span>
            </span>
          </label>
        </div>
        
        <div class="settings-item">
          <div class="settings-item-info">
            <div class="settings-item-label">显示侧边栏 Logo</div>
            <div class="settings-item-desc">在侧边栏标题左侧显示应用图标</div>
          </div>
          <label class="ui-switch">
            <input type="checkbox" id="sidebar-logo-switch" ${settings.showSidebarLogo ? 'checked' : ''}>
            <span class="ui-switch-track">
              <span class="ui-switch-thumb"></span>
            </span>
          </label>
        </div>
        
        ${settings.showSidebarLogo ? `
          <div class="settings-subsection">
            <div class="settings-item">
              <div class="settings-item-info">
                <div class="settings-item-label">自定义 Logo</div>
                <div class="settings-item-desc">上传自定义图标替换默认 Logo（建议尺寸 28x28 或更大）</div>
              </div>
              <div style="display: flex; gap: 8px; align-items: center;">
                ${settings.customLogoPath ? `
                  <img src="${settings.customLogoPath}" alt="Custom Logo" style="width: 28px; height: 28px; border-radius: 4px; border: 1px solid var(--border-color);" />
                ` : ''}
                <button class="ui-btn ui-btn-secondary ui-btn-sm" onclick="window.selectCustomLogo()">选择图片</button>
                ${settings.customLogoPath ? `
                  <button class="ui-btn ui-btn-secondary ui-btn-sm" onclick="window.resetCustomLogo()">恢复默认</button>
                ` : ''}
              </div>
            </div>
          </div>
        ` : ''}
        
        <div class="settings-item">
          <div class="settings-item-info">
            <div class="settings-item-label">侧边栏标题</div>
            <div class="settings-item-desc">自定义侧边栏显示的标题文本</div>
          </div>
          <div style="display: flex; gap: 8px; align-items: center;">
            <input type="text" id="sidebar-title-input" class="ui-input" value="${settings.sidebarTitle}" placeholder="Kiro Manager" style="width: 140px; padding: 6px 10px;" />
            <button class="ui-btn ui-btn-secondary ui-btn-sm" onclick="window.saveSidebarTitle()">保存</button>
            <button class="ui-btn ui-btn-secondary ui-btn-sm" onclick="window.resetSidebarTitle()">恢复默认</button>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <h3 class="settings-section-title">隐私</h3>
        <div class="settings-item">
          <div class="settings-item-info">
            <div class="settings-item-label">隐私模式</div>
            <div class="settings-item-desc">隐藏邮箱和账号敏感信息</div>
          </div>
          <label class="ui-switch">
            <input type="checkbox" id="privacy-switch" ${settings.privacyMode ? 'checked' : ''}>
            <span class="ui-switch-track">
              <span class="ui-switch-thumb"></span>
            </span>
          </label>
        </div>
        
        <div class="settings-item">
          <div class="settings-item-info">
            <div class="settings-item-label">使用量精度</div>
            <div class="settings-item-desc">显示使用量的小数精度（如 1.22 而非 1）</div>
          </div>
          <label class="ui-switch">
            <input type="checkbox" id="precision-switch" ${settings.usagePrecision ? 'checked' : ''}>
            <span class="ui-switch-track">
              <span class="ui-switch-thumb"></span>
            </span>
          </label>
        </div>
      </div>

      <div class="settings-section">
        <h3 class="settings-section-title">自动刷新</h3>
        <div class="settings-item">
          <div class="settings-item-info">
            <div class="settings-item-label">启用自动刷新</div>
            <div class="settings-item-desc">Token 过期前自动刷新，并同步更新账号信息</div>
          </div>
          <label class="ui-switch">
            <input type="checkbox" id="auto-refresh-switch" ${config.enabled ? 'checked' : ''}>
            <span class="ui-switch-track">
              <span class="ui-switch-thumb"></span>
            </span>
          </label>
        </div>

        ${config.enabled ? `
          <div class="settings-subsection">
            <div class="settings-info-box">
              <p>• Token 即将过期时自动刷新，保持登录状态</p>
              <p>• Token 刷新后自动更新账号用量、订阅等信息</p>
              <p>• 开启自动换号时，会定期检查所有账号余额</p>
            </div>

            <div class="settings-item">
              <div class="settings-item-info">
                <div class="settings-item-label">检查间隔</div>
                <div class="settings-item-desc">每隔多久检查一次账号状态</div>
              </div>
              <div class="ui-dropdown" style="width: 120px;">
                <button class="ui-btn ui-btn-secondary" data-dropdown style="width: 100%; justify-content: space-between;">
                  <span id="interval-text">${intervalText}</span>
                  <span>▼</span>
                </button>
                <div class="ui-dropdown-menu" style="width: 100%; max-height: 160px; overflow-y: auto;">
                  <button class="ui-dropdown-item" onclick="window.selectInterval(0.5)">30 秒</button>
                  <button class="ui-dropdown-item" onclick="window.selectInterval(1)">1 分钟</button>
                  <button class="ui-dropdown-item" onclick="window.selectInterval(3)">3 分钟</button>
                  <button class="ui-dropdown-item" onclick="window.selectInterval(5)">5 分钟</button>
                  <button class="ui-dropdown-item" onclick="window.selectInterval(10)">10 分钟</button>
                  <button class="ui-dropdown-item" onclick="window.selectInterval(15)">15 分钟</button>
                  <button class="ui-dropdown-item" onclick="window.selectInterval(30)">30 分钟</button>
                </div>
              </div>
            </div>

            <div class="settings-item">
              <div class="settings-item-info">
                <div class="settings-item-label">同步账号信息</div>
                <div class="settings-item-desc">刷新 Token 时同步检测用量、订阅、封禁状态</div>
              </div>
              <label class="ui-switch">
                <input type="checkbox" id="sync-info-switch" ${config.syncInfo ? 'checked' : ''}>
                <span class="ui-switch-track">
                  <span class="ui-switch-thumb"></span>
                </span>
              </label>
            </div>

            <div class="settings-item">
              <div class="settings-item-info">
                <div class="settings-item-label">单次最多刷新账号数</div>
                <div class="settings-item-desc">限制每次检查时最多刷新的账号数量（1-100）</div>
              </div>
              <div style="display: flex; gap: 8px; align-items: center;">
                <button class="ui-btn ui-btn-secondary ui-btn-sm" onclick="window.adjustMaxBatchSize(-5)" style="width: 32px; padding: 6px;">-</button>
                <input type="number" id="max-batch-size-input" class="ui-input" value="${config.maxBatchSize}" min="1" max="100" style="width: 60px; padding: 6px 10px; text-align: center; -moz-appearance: textfield;" />
                <button class="ui-btn ui-btn-secondary ui-btn-sm" onclick="window.adjustMaxBatchSize(5)" style="width: 32px; padding: 6px;">+</button>
                <span style="color: var(--text-muted); font-size: 13px;">个</span>
              </div>
            </div>

            <div class="settings-item">
              <div class="settings-item-info">
                <div class="settings-item-label">并发刷新数量</div>
                <div class="settings-item-desc">同时刷新的账号数量，数值越大速度越快（1-10）</div>
              </div>
              <div style="display: flex; gap: 8px; align-items: center;">
                <button class="ui-btn ui-btn-secondary ui-btn-sm" onclick="window.adjustConcurrency(-1)" style="width: 32px; padding: 6px;">-</button>
                <input type="number" id="concurrency-input" class="ui-input" value="${config.concurrency}" min="1" max="10" style="width: 60px; padding: 6px 10px; text-align: center; -moz-appearance: textfield;" />
                <button class="ui-btn ui-btn-secondary ui-btn-sm" onclick="window.adjustConcurrency(1)" style="width: 32px; padding: 6px;">+</button>
                <span style="color: var(--text-muted); font-size: 13px;">个</span>
              </div>
            </div>
          </div>
        ` : ''}
      </div>

      <div class="settings-section">
        <h3 class="settings-section-title">API 反代服务</h3>
        
        <div class="settings-item">
          <div class="settings-item-info">
            <div class="settings-item-label">监听端口</div>
            <div class="settings-item-desc">代理服务器监听的端口号</div>
          </div>
          <input type="number" class="ui-input" id="proxy-port" value="${proxyConfig.port}" min="1024" max="65535" style="width: 120px; padding: 6px 10px;" />
        </div>

        <div class="settings-item">
          <div class="settings-item-info">
            <div class="settings-item-label">监听地址</div>
            <div class="settings-item-desc">代理服务器监听的 IP 地址</div>
          </div>
          <input type="text" class="ui-input" id="proxy-host" value="${proxyConfig.host}" placeholder="127.0.0.1" style="width: 200px; padding: 6px 10px;" />
        </div>

        <div class="settings-item">
          <div class="settings-item-info">
            <div class="settings-item-label">记录请求日志</div>
            <div class="settings-item-desc">记录所有 API 请求的详细信息</div>
          </div>
          <label class="ui-switch">
            <input type="checkbox" id="log-requests" ${proxyConfig.logRequests ? 'checked' : ''}>
            <span class="ui-switch-track">
              <span class="ui-switch-thumb"></span>
            </span>
          </label>
        </div>

        <div class="settings-item">
          <div class="settings-item-info">
            <div class="settings-item-label">最大重试次数</div>
            <div class="settings-item-desc">请求失败时的最大重试次数</div>
          </div>
          <input type="number" class="ui-input" id="max-retries" value="${proxyConfig.maxRetries || 3}" min="0" max="10" style="width: 100px; padding: 6px 10px;" />
        </div>

        <div class="settings-item">
          <div class="settings-item-info">
            <div class="settings-item-label">启用 OpenAI API</div>
            <div class="settings-item-desc">启用 /v1/chat/completions 端点</div>
          </div>
          <label class="ui-switch">
            <input type="checkbox" id="enable-openai" ${proxyConfig.enableOpenAI !== false ? 'checked' : ''}>
            <span class="ui-switch-track">
              <span class="ui-switch-thumb"></span>
            </span>
          </label>
        </div>

        <div class="settings-item">
          <div class="settings-item-info">
            <div class="settings-item-label">启用 Claude API</div>
            <div class="settings-item-desc">启用 /v1/messages 端点</div>
          </div>
          <label class="ui-switch">
            <input type="checkbox" id="enable-claude" ${proxyConfig.enableClaude !== false ? 'checked' : ''}>
            <span class="ui-switch-track">
              <span class="ui-switch-thumb"></span>
            </span>
          </label>
        </div>
      </div>

      <div class="settings-section">
        <h3 class="settings-section-title">机器码自动化</h3>
        
        <!-- 切换账号时自动更换机器码 -->
        <div class="settings-item">
          <div class="settings-item-info">
            <div class="settings-item-label">切换账号时自动更换机器码</div>
            <div class="settings-item-desc">每次切换账号时自动生成并应用新的机器码（需要管理员权限）</div>
          </div>
          <label class="ui-switch">
            <input type="checkbox" id="auto-switch-machine-id">
            <span class="ui-switch-track">
              <span class="ui-switch-thumb"></span>
            </span>
          </label>
        </div>

        <!-- 账户机器码绑定 -->
        <div class="settings-subsection" id="machine-id-binding-subsection" style="display: none;">
          <div class="settings-item">
            <div class="settings-item-info">
              <div class="settings-item-label">账号机器码绑定</div>
              <div class="settings-item-desc" id="binding-count-desc">为每个账号分配唯一的机器码，切换时自动使用</div>
            </div>
            <label class="ui-switch">
              <input type="checkbox" id="bind-machine-id">
              <span class="ui-switch-track">
                <span class="ui-switch-thumb"></span>
              </span>
            </label>
          </div>

          <!-- 使用绑定的机器码 -->
          <div class="settings-item" id="use-bound-item" style="display: none;">
            <div class="settings-item-info">
              <div class="settings-item-label">使用绑定的唯一机器码</div>
              <div class="settings-item-desc">关闭时每次切换将随机生成新机器码</div>
            </div>
            <label class="ui-switch">
              <input type="checkbox" id="use-bound-machine-id">
              <span class="ui-switch-track">
                <span class="ui-switch-thumb"></span>
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>
  `
}

export function attachSettingsEvents(container: Element) {
  // 代理配置保存函数
  const saveProxyConfig = async () => {
    try {
      const status = await proxyService.getStatus()
      if (!status.config) return
      
      const config = status.config
      
      const portInput = container.querySelector('#proxy-port') as HTMLInputElement
      const hostInput = container.querySelector('#proxy-host') as HTMLInputElement
      const logRequestsToggle = container.querySelector('#log-requests') as HTMLInputElement
      const maxRetriesInput = container.querySelector('#max-retries') as HTMLInputElement
      const enableOpenAIToggle = container.querySelector('#enable-openai') as HTMLInputElement
      const enableClaudeToggle = container.querySelector('#enable-claude') as HTMLInputElement
      
      if (portInput) config.port = parseInt(portInput.value)
      if (hostInput) config.host = hostInput.value
      if (logRequestsToggle) config.logRequests = logRequestsToggle.checked
      if (maxRetriesInput) config.maxRetries = parseInt(maxRetriesInput.value)
      if (enableOpenAIToggle) config.enableOpenAI = enableOpenAIToggle.checked
      if (enableClaudeToggle) config.enableClaude = enableClaudeToggle.checked
      
      await proxyService.updateConfig(config)
    } catch (error) {
      console.error('[设置] 保存代理配置失败:', error)
    }
  }
  
  // 代理配置事件绑定
  const proxyPortInput = container.querySelector('#proxy-port') as HTMLInputElement
  if (proxyPortInput) {
    proxyPortInput.addEventListener('change', saveProxyConfig)
  }
  
  const proxyHostInput = container.querySelector('#proxy-host') as HTMLInputElement
  if (proxyHostInput) {
    proxyHostInput.addEventListener('change', saveProxyConfig)
  }
  
  const logRequestsToggle = container.querySelector('#log-requests') as HTMLInputElement
  if (logRequestsToggle) {
    logRequestsToggle.addEventListener('change', saveProxyConfig)
  }
  
  const maxRetriesInput = container.querySelector('#max-retries') as HTMLInputElement
  if (maxRetriesInput) {
    maxRetriesInput.addEventListener('change', saveProxyConfig)
  }
  
  const enableOpenAIToggle = container.querySelector('#enable-openai') as HTMLInputElement
  if (enableOpenAIToggle) {
    enableOpenAIToggle.addEventListener('change', saveProxyConfig)
  }
  
  const enableClaudeToggle = container.querySelector('#enable-claude') as HTMLInputElement
  if (enableClaudeToggle) {
    enableClaudeToggle.addEventListener('change', saveProxyConfig)
  }
  
  // 初始化主题开关状态
  const themeSwitch = container.querySelector('#theme-switch') as HTMLInputElement
  if (themeSwitch) {
    const currentTheme = (window as any).UI?.theme.get()
    themeSwitch.checked = currentTheme === 'dark'

    themeSwitch.addEventListener('change', () => {
      if ((window as any).UI?.theme) {
        (window as any).UI.theme.toggle()
      }
    })
  }

  // 隐私模式开关
  const privacySwitch = container.querySelector('#privacy-switch') as HTMLInputElement
  if (privacySwitch) {
    privacySwitch.addEventListener('change', () => {
      accountStore.setPrivacyMode(privacySwitch.checked)
    })
  }

  // 使用量精度开关
  const precisionSwitch = container.querySelector('#precision-switch') as HTMLInputElement
  if (precisionSwitch) {
    precisionSwitch.addEventListener('change', () => {
      accountStore.setUsagePrecision(precisionSwitch.checked)
    })
  }

  // 侧边栏 Logo 开关
  const sidebarLogoSwitch = container.querySelector('#sidebar-logo-switch') as HTMLInputElement
  if (sidebarLogoSwitch) {
    sidebarLogoSwitch.addEventListener('change', () => {
      accountStore.setShowSidebarLogo(sidebarLogoSwitch.checked)
      // 重新渲染设置页面以显示/隐藏子选项
      const contentArea = document.querySelector('#content-area')
      if (contentArea) {
        renderSettingsView().then(html => {
          contentArea.innerHTML = html
          attachSettingsEvents(contentArea)
        })
      }
      
      // 直接操作 DOM 更新侧边栏 Logo
      const sidebarLogo = document.querySelector('.sidebar-logo') as HTMLImageElement
      if (sidebarLogoSwitch.checked) {
        // 显示 Logo
        if (!sidebarLogo) {
          const sidebarHeader = document.querySelector('.sidebar-header')
          const sidebarTitle = document.querySelector('.sidebar-title')
          if (sidebarHeader && sidebarTitle) {
            const img = document.createElement('img')
            img.className = 'sidebar-logo'
            img.alt = 'Logo'
            const settings = accountStore.getSettings()
            if (settings.customLogoPath) {
              img.src = settings.customLogoPath
            } else {
              import('../assets/logo.svg').then(module => {
                img.src = module.default
              })
            }
            sidebarHeader.insertBefore(img, sidebarTitle)
          }
        }
      } else {
        // 隐藏 Logo
        if (sidebarLogo) {
          sidebarLogo.remove()
        }
      }
    })
  }

  // 注册全局函数：选择自定义 Logo
  (window as any).selectCustomLogo = async () => {
    try {
      const result = await (window as any).__TAURI__.dialog.open({
        multiple: false,
        filters: [{
          name: '图片',
          extensions: ['png', 'jpg', 'jpeg', 'svg', 'webp']
        }]
      })
      
      if (result) {
        // 调用后端保存文件到应用数据目录
        const savedPath = await (window as any).__TAURI__.core.invoke('save_custom_logo', {
          sourcePath: result
        })
        
        // 使用 convertFileSrc 转换保存后的文件路径
        const filePath = (window as any).__TAURI__.core.convertFileSrc(savedPath)
        accountStore.setCustomLogoPath(filePath)
        
        // 更新侧边栏 Logo
        const sidebarLogo = document.querySelector('.sidebar-logo') as HTMLImageElement
        if (sidebarLogo) {
          sidebarLogo.src = filePath
        }
        
        // 重新渲染设置页面以显示预览
        const contentArea = document.querySelector('#content-area')
        if (contentArea) {
          renderSettingsView().then(html => {
            contentArea.innerHTML = html
            attachSettingsEvents(contentArea)
          })
        }
        
        window.UI?.toast.success('Logo已保存')
      }
    } catch (error) {
      console.error('[设置] 选择图片失败:', error)
      window.UI?.toast.error('选择图片失败')
    }
  }

  // 注册全局函数：恢复默认 Logo
  (window as any).resetCustomLogo = async () => {
    try {
      // 调用后端删除自定义 Logo 文件
      await (window as any).__TAURI__.core.invoke('delete_custom_logo')
      
      accountStore.setCustomLogoPath('')
      
      // 更新侧边栏 Logo
      const sidebarLogo = document.querySelector('.sidebar-logo') as HTMLImageElement
      if (sidebarLogo) {
        const logoModule = await import('../assets/logo.svg')
        sidebarLogo.src = logoModule.default
      }
      
      // 重新渲染设置页面
      const contentArea = document.querySelector('#content-area')
      if (contentArea) {
        renderSettingsView().then(html => {
          contentArea.innerHTML = html
          attachSettingsEvents(contentArea)
        })
      }
      
      window.UI?.toast.success('已恢复默认 Logo')
    } catch (error) {
      console.error('[设置] 恢复默认 Logo 失败:', error)
      window.UI?.toast.error('恢复默认 Logo 失败')
    }
  }

  // 注册全局函数：保存侧边栏标题
  (window as any).saveSidebarTitle = () => {
    const input = document.querySelector('#sidebar-title-input') as HTMLInputElement
    if (input) {
      const title = input.value.trim() || 'Kiro Manager'
      accountStore.setSidebarTitle(title)
      
      // 更新侧边栏标题
      const sidebarTitle = document.querySelector('.sidebar-title') as HTMLElement
      if (sidebarTitle) {
        sidebarTitle.textContent = title
      }
      
      window.UI?.toast.success('侧边栏标题已保存')
    }
  }

  // 注册全局函数：恢复默认标题
  (window as any).resetSidebarTitle = () => {
    accountStore.setSidebarTitle('Kiro Manager')
    
    // 更新输入框
    const input = document.querySelector('#sidebar-title-input') as HTMLInputElement
    if (input) {
      input.value = 'Kiro Manager'
    }
    
    // 更新侧边栏标题
    const sidebarTitle = document.querySelector('.sidebar-title') as HTMLElement
    if (sidebarTitle) {
      sidebarTitle.textContent = 'Kiro Manager'
    }
    
    window.UI?.toast.success('已恢复默认标题')
  }

  // 自动刷新开关
  const autoRefreshSwitch = container.querySelector('#auto-refresh-switch') as HTMLInputElement
  if (autoRefreshSwitch) {
    autoRefreshSwitch.addEventListener('change', () => {
      autoRefreshService.setAutoRefresh(autoRefreshSwitch.checked)
      // 重新渲染设置页面以显示/隐藏子选项
      const contentArea = document.querySelector('#content-area')
      if (contentArea) {
        renderSettingsView().then(html => {
          contentArea.innerHTML = html
          attachSettingsEvents(contentArea)
        })
      }
    })
  }

  // 注册全局选择间隔函数
  (window as any).selectInterval = (interval: number) => {
    const intervalText = document.querySelector('#interval-text')
    if (intervalText) {
      if (interval < 1) {
        intervalText.textContent = `${interval * 60} 秒`
      } else {
        intervalText.textContent = `${interval} 分钟`
      }
    }
    autoRefreshService.setAutoRefresh(true, interval)
  }

  // 同步信息开关
  const syncInfoSwitch = container.querySelector('#sync-info-switch') as HTMLInputElement
  if (syncInfoSwitch) {
    syncInfoSwitch.addEventListener('change', () => {
      autoRefreshService.setSyncInfo(syncInfoSwitch.checked)
    })
  }

  // 单次最多刷新账号数
  const maxBatchSizeInput = container.querySelector('#max-batch-size-input') as HTMLInputElement
  if (maxBatchSizeInput) {
    maxBatchSizeInput.addEventListener('change', () => {
      const value = parseInt(maxBatchSizeInput.value)
      if (value >= 1 && value <= 100) {
        autoRefreshService.setMaxBatchSize(value)
        window.UI?.toast.success('已保存')
      } else {
        window.UI?.toast.error('数值必须在 1-100 之间')
        const config = autoRefreshService.getConfig()
        maxBatchSizeInput.value = String(config.maxBatchSize)
      }
    })
  }

  // 并发刷新数量
  const concurrencyInput = container.querySelector('#concurrency-input') as HTMLInputElement
  if (concurrencyInput) {
    concurrencyInput.addEventListener('change', () => {
      const value = parseInt(concurrencyInput.value)
      if (value >= 1 && value <= 10) {
        autoRefreshService.setConcurrency(value)
        window.UI?.toast.success('已保存')
      } else {
        window.UI?.toast.error('数值必须在 1-10 之间')
        const config = autoRefreshService.getConfig()
        concurrencyInput.value = String(config.concurrency)
      }
    })
  }

  // 注册全局调整函数
  (window as any).adjustMaxBatchSize = (delta: number) => {
    const input = document.querySelector('#max-batch-size-input') as HTMLInputElement
    if (!input) return
    
    const currentValue = parseInt(input.value)
    const newValue = Math.max(1, Math.min(100, currentValue + delta))
    input.value = String(newValue)
    
    autoRefreshService.setMaxBatchSize(newValue)
    window.UI?.toast.success('已保存')
  }

  (window as any).adjustConcurrency = (delta: number) => {
    const input = document.querySelector('#concurrency-input') as HTMLInputElement
    if (!input) return
    
    const currentValue = parseInt(input.value)
    const newValue = Math.max(1, Math.min(10, currentValue + delta))
    input.value = String(newValue)
    
    autoRefreshService.setConcurrency(newValue)
    window.UI?.toast.success('已保存')
  }

  // 机器码自动化配置
  initMachineIdSettings(container)
}

// 初始化机器码设置
function initMachineIdSettings(container: Element) {
  // 加载配置
  const config = loadMachineIdConfig()
  const bindings = loadAccountBindings()
  
  // 初始化开关状态
  const autoSwitchCheckbox = container.querySelector('#auto-switch-machine-id') as HTMLInputElement
  const bindCheckbox = container.querySelector('#bind-machine-id') as HTMLInputElement
  const useBoundCheckbox = container.querySelector('#use-bound-machine-id') as HTMLInputElement
  
  if (autoSwitchCheckbox) autoSwitchCheckbox.checked = config.autoSwitchOnAccountChange
  if (bindCheckbox) bindCheckbox.checked = config.bindMachineIdToAccount
  if (useBoundCheckbox) useBoundCheckbox.checked = config.useBoundMachineId
  
  // 更新UI显示
  updateMachineIdSettingsUI(config, bindings)
  
  // 绑定事件
  if (autoSwitchCheckbox) {
    autoSwitchCheckbox.addEventListener('change', () => {
      config.autoSwitchOnAccountChange = autoSwitchCheckbox.checked
      saveMachineIdConfig(config)
      updateMachineIdSettingsUI(config, bindings)
      
      if (config.autoSwitchOnAccountChange) {
        window.UI?.toast.success('已开启切换账号时自动更换机器码')
      } else {
        window.UI?.toast.info('已关闭切换账号时自动更换机器码')
      }
    })
  }
  
  if (bindCheckbox) {
    bindCheckbox.addEventListener('change', () => {
      config.bindMachineIdToAccount = bindCheckbox.checked
      saveMachineIdConfig(config)
      updateMachineIdSettingsUI(config, bindings)
      
      if (config.bindMachineIdToAccount) {
        window.UI?.toast.success('已开启账号机器码绑定')
      } else {
        window.UI?.toast.info('已关闭账号机器码绑定')
      }
    })
  }
  
  if (useBoundCheckbox) {
    useBoundCheckbox.addEventListener('change', () => {
      config.useBoundMachineId = useBoundCheckbox.checked
      saveMachineIdConfig(config)
      
      if (config.useBoundMachineId) {
        window.UI?.toast.success('将使用绑定的唯一机器码')
      } else {
        window.UI?.toast.info('每次切换将随机生成新机器码')
      }
    })
  }
}

// 更新机器码设置UI
function updateMachineIdSettingsUI(config: any, bindings: any) {
  const bindingSubsection = document.getElementById('machine-id-binding-subsection')
  const useBoundItem = document.getElementById('use-bound-item')
  const bindingCountDesc = document.getElementById('binding-count-desc')
  
  // 显示/隐藏子选项
  if (bindingSubsection) {
    bindingSubsection.style.display = config.autoSwitchOnAccountChange ? 'block' : 'none'
  }
  
  if (useBoundItem) {
    useBoundItem.style.display = config.bindMachineIdToAccount ? 'block' : 'none'
  }
  
  // 更新绑定数量（排除已封禁的账号）
  if (bindingCountDesc) {
    const bindingCount = Object.keys(bindings).length
    if (bindingCount > 0) {
      bindingCountDesc.textContent = `为每个账号分配唯一的机器码，切换时自动使用（已绑定 ${bindingCount} 个账号）`
    } else {
      bindingCountDesc.textContent = `为每个账号分配唯一的机器码，切换时自动使用`
    }
  }
}

// 加载机器码配置
function loadMachineIdConfig() {
  const saved = localStorage.getItem('machine_id_config')
  if (saved) {
    return JSON.parse(saved)
  }
  return {
    autoSwitchOnAccountChange: false,
    bindMachineIdToAccount: false,
    useBoundMachineId: true
  }
}

// 保存机器码配置
function saveMachineIdConfig(config: any) {
  localStorage.setItem('machine_id_config', JSON.stringify(config))
}

// 加载账户绑定
function loadAccountBindings() {
  const saved = localStorage.getItem('account_machine_id_bindings')
  if (saved) {
    return JSON.parse(saved)
  }
  return {}
}
