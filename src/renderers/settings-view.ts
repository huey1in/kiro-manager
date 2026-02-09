import { autoRefreshService } from '../services/auto-refresh-service'
import { accountStore } from '../store'

export function renderSettingsView(): string {
  const config = autoRefreshService.getConfig()
  const settings = accountStore.getSettings()
  
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
            <div class="settings-item-desc">Token 过期前自动刷新，并同步更新账户信息</div>
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
              <p>• Token 刷新后自动更新账户用量、订阅等信息</p>
              <p>• 开启自动换号时，会定期检查所有账户余额</p>
            </div>

            <div class="settings-item">
              <div class="settings-item-info">
                <div class="settings-item-label">检查间隔</div>
                <div class="settings-item-desc">每隔多久检查一次账户状态</div>
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
                <div class="settings-item-label">同步账户信息</div>
                <div class="settings-item-desc">刷新 Token 时同步检测用量、订阅、封禁状态</div>
              </div>
              <label class="ui-switch">
                <input type="checkbox" id="sync-info-switch" ${config.syncInfo ? 'checked' : ''}>
                <span class="ui-switch-track">
                  <span class="ui-switch-thumb"></span>
                </span>
              </label>
            </div>
          </div>
        ` : ''}
      </div>
    </div>
  `
}

export function attachSettingsEvents(container: Element) {
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
        contentArea.innerHTML = renderSettingsView()
        attachSettingsEvents(contentArea)
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
          contentArea.innerHTML = renderSettingsView()
          attachSettingsEvents(contentArea)
        }
        
        window.UI?.toast.success('自定义 Logo 已保存')
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
        contentArea.innerHTML = renderSettingsView()
        attachSettingsEvents(contentArea)
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
        contentArea.innerHTML = renderSettingsView()
        attachSettingsEvents(contentArea)
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
}
