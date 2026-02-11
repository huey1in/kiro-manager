// Kiro 设置视图渲染器
import type { KiroSettings, McpConfig } from '../types/kiro-settings'
import { DEFAULT_DENY_COMMANDS } from '../types/kiro-settings'
import { kiroSettingsService, DEFAULT_KIRO_SETTINGS } from '../services/kiro-settings-service'
import { showMcpServerDialog } from '../dialogs/mcp-server-dialog'
import { showSteeringFileDialog } from '../dialogs/steering-file-dialog'
import { showJsonEditorDialog } from '../dialogs/json-editor-dialog'
import { showRenameDialog } from '../dialogs/rename-dialog'

export function renderKiroSettingsView(): string {
  return `
    <div class="settings-page">
      <div id="kiro-settings-error" class="error-message" style="display: none;"></div>
      <div id="kiro-settings-loading" class="loading-container" style="display: flex; justify-content: center; align-items: center; padding: 40px;">
        <div style="text-align: center; color: var(--text-muted);">加载中...</div>
      </div>
      <div id="kiro-settings-content" style="display: none;"></div>
    </div>
  `
}

/**
 * 渲染设置内容
 */
export function renderKiroSettingsContent(
  settings: KiroSettings,
  mcpConfig: McpConfig,
  steeringFiles: string[]
): string {
  return `
    ${renderAgentSection(settings)}
    ${renderMcpSection(settings, mcpConfig)}
    ${renderSteeringSection(steeringFiles)}
    ${renderCommandsSection(settings)}
  `
}

/**
 * 渲染 Agent 设置部分
 */
function renderAgentSection(settings: KiroSettings): string {
  return `
    <div class="settings-section">
      <h3 class="settings-section-title">Agent 设置</h3>
      
      <div class="settings-item">
        <div class="settings-item-info">
          <div class="settings-item-label">Agent 自主模式</div>
          <div class="settings-item-desc">决定 Agent 在工作流的每个检查点是否要求接受/拒绝</div>
        </div>
        <div class="ui-dropdown" style="width: 160px;">
          <button class="ui-btn ui-btn-secondary" data-dropdown style="width: 100%; justify-content: space-between;">
            <span id="agent-autonomy-text">${settings.agentAutonomy === 'Autopilot' ? 'Autopilot (自动)' : 'Supervised (需确认)'}</span>
            <span>▼</span>
          </button>
          <div class="ui-dropdown-menu" style="width: 100%;">
            <button class="ui-dropdown-item" onclick="window.selectAgentAutonomy('Autopilot')">Autopilot (自动)</button>
            <button class="ui-dropdown-item" onclick="window.selectAgentAutonomy('Supervised')">Supervised (需确认)</button>
          </div>
        </div>
      </div>

      <div class="settings-item">
        <div class="settings-item-info">
          <div class="settings-item-label">模型选择</div>
          <div class="settings-item-desc">选择 Agent 操作使用的模型</div>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <input type="text" class="ui-input" id="model-selection" value="${settings.modelSelection}" placeholder="claude-haiku-4.5" style="width: 200px; padding: 6px 10px;" />
          <button class="ui-btn ui-btn-secondary ui-btn-sm" id="refresh-models" title="刷新模型列表" style="padding: 6px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
            </svg>
          </button>
        </div>
      </div>

      <div class="settings-item">
        <div class="settings-item-info">
          <div class="settings-item-label">Tab 自动补全</div>
          <div class="settings-item-desc">Tab 自动补全允许 Kiro Agent 在输入时提供代码建议</div>
        </div>
        <label class="ui-switch">
          <input type="checkbox" id="enable-tab-autocomplete" ${settings.enableTabAutocomplete ? 'checked' : ''}>
          <span class="ui-switch-track">
            <span class="ui-switch-thumb"></span>
          </span>
        </label>
      </div>

      <div class="settings-item">
        <div class="settings-item-info">
          <div class="settings-item-label">使用统计</div>
          <div class="settings-item-desc">显示 Agent 执行的用量摘要和耗时</div>
        </div>
        <label class="ui-switch">
          <input type="checkbox" id="usage-summary" ${settings.usageSummary ? 'checked' : ''}>
          <span class="ui-switch-track">
            <span class="ui-switch-thumb"></span>
          </span>
        </label>
      </div>

      <div class="settings-item">
        <div class="settings-item-info">
          <div class="settings-item-label">代码引用追踪</div>
          <div class="settings-item-desc">允许 Kiro 生成带代码引用的代码。Kiro 生成的代码可能与公开可用代码相似。</div>
        </div>
        <label class="ui-switch">
          <input type="checkbox" id="code-references" ${settings.codeReferences ? 'checked' : ''}>
          <span class="ui-switch-track">
            <span class="ui-switch-thumb"></span>
          </span>
        </label>
      </div>

      <div class="settings-item">
        <div class="settings-item-info">
          <div class="settings-item-label">代码库索引</div>
          <div class="settings-item-desc">启用仓库索引（实验性）。这是一个实验性功能，不支持多文件夹工作区。</div>
        </div>
        <label class="ui-switch">
          <input type="checkbox" id="enable-codebase-indexing" ${settings.enableCodebaseIndexing ? 'checked' : ''}>
          <span class="ui-switch-track">
            <span class="ui-switch-thumb"></span>
          </span>
        </label>
      </div>

      <div class="settings-item">
        <div class="settings-item-info">
          <div class="settings-item-label">调试日志</div>
          <div class="settings-item-desc">在输出面板启用 Kiro 调试日志</div>
        </div>
        <label class="ui-switch">
          <input type="checkbox" id="enable-debug-logs" ${settings.enableDebugLogs ? 'checked' : ''}>
          <span class="ui-switch-track">
            <span class="ui-switch-thumb"></span>
          </span>
        </label>
      </div>
    </div>

    <div class="settings-section">
      <h3 class="settings-section-title">通知设置</h3>

      <div class="settings-item">
        <div class="settings-item-info">
          <div class="settings-item-label">Agent: 需要操作</div>
          <div class="settings-item-desc">Agent 需要输入时显示桌面通知，如执行 Shell 命令时</div>
        </div>
        <label class="ui-switch">
          <input type="checkbox" id="notifications-action-required" ${settings.notificationsActionRequired ? 'checked' : ''}>
          <span class="ui-switch-track">
            <span class="ui-switch-thumb"></span>
          </span>
        </label>
      </div>

      <div class="settings-item">
        <div class="settings-item-info">
          <div class="settings-item-label">Agent: 失败</div>
          <div class="settings-item-desc">Agent 遇到意外失败时显示桌面通知</div>
        </div>
        <label class="ui-switch">
          <input type="checkbox" id="notifications-failure" ${settings.notificationsFailure ? 'checked' : ''}>
          <span class="ui-switch-track">
            <span class="ui-switch-thumb"></span>
          </span>
        </label>
      </div>

      <div class="settings-item">
        <div class="settings-item-info">
          <div class="settings-item-label">Agent: 成功</div>
          <div class="settings-item-desc">Agent 成功完成任务时显示桌面通知</div>
        </div>
        <label class="ui-switch">
          <input type="checkbox" id="notifications-success" ${settings.notificationsSuccess ? 'checked' : ''}>
          <span class="ui-switch-track">
            <span class="ui-switch-thumb"></span>
          </span>
        </label>
      </div>

      <div class="settings-item">
        <div class="settings-item-info">
          <div class="settings-item-label">账单</div>
          <div class="settings-item-desc">显示账单和用量事件的应用内通知（用量重置、资源不足、超额）</div>
        </div>
        <label class="ui-switch">
          <input type="checkbox" id="notifications-billing" ${settings.notificationsBilling ? 'checked' : ''}>
          <span class="ui-switch-track">
            <span class="ui-switch-thumb"></span>
          </span>
        </label>
      </div>
    </div>
  `
}

/**
 * 渲染 MCP 设置部分
 */
function renderMcpSection(settings: KiroSettings, mcpConfig: McpConfig): string {
  const servers = Object.entries(mcpConfig.mcpServers)
  return `
    <div class="settings-section">
      <h3 class="settings-section-title">MCP 服务器 (${servers.length})</h3>
      
      <div class="settings-item">
        <div class="settings-item-info">
          <div class="settings-item-label">启用 MCP</div>
          <div class="settings-item-desc">允许连接外部工具和数据源</div>
        </div>
        <div class="ui-dropdown" style="width: 100px;">
          <button class="ui-btn ui-btn-secondary" data-dropdown style="width: 100%; justify-content: space-between;">
            <span id="configure-mcp-text">${settings.configureMCP === 'Enabled' ? '启用' : '禁用'}</span>
            <span>▼</span>
          </button>
          <div class="ui-dropdown-menu" style="width: 100%;">
            <button class="ui-dropdown-item" onclick="window.selectConfigureMcp('Enabled')">启用</button>
            <button class="ui-dropdown-item" onclick="window.selectConfigureMcp('Disabled')">禁用</button>
          </div>
        </div>
      </div>

      ${servers.length > 0 ? `
        <div class="settings-subsection">
          ${servers.map(([name, server]) => `
            <div class="settings-item">
              <div class="settings-item-info">
                <div class="settings-item-label">${name}</div>
                <div class="settings-item-desc">${server.command} ${(server.args || []).join(' ')}</div>
              </div>
              <div style="display: flex; gap: 8px;">
                <button class="ui-btn ui-btn-secondary ui-btn-sm" onclick="window.editMcpServer('${name}')">编辑</button>
                <button class="ui-btn ui-btn-secondary ui-btn-sm" onclick="window.deleteMcpServer('${name}')">删除</button>
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <div style="display: flex; gap: 8px; margin-top: 12px;">
        <button class="ui-btn ui-btn-secondary" onclick="window.addMcpServer()">添加 MCP 服务器</button>
        <button class="ui-btn ui-btn-secondary" onclick="window.openUserMcpConfig()">用户 MCP 配置</button>
        <button class="ui-btn ui-btn-secondary" onclick="window.openWorkspaceMcpConfig()">工作区 MCP 配置</button>
      </div>
    </div>
  `
}

/**
 * 渲染 Steering 设置部分
 */
function renderSteeringSection(steeringFiles: string[]): string {
  return `
    <div class="settings-section">
      <h3 class="settings-section-title">用户规则 (Steering) - ${steeringFiles.length} 个文件</h3>
      
      <div class="settings-info-box">
        <p>Steering 文件用于定义 AI 助手的行为规则和上下文</p>
      </div>

      ${steeringFiles.length > 0 ? `
        <div class="settings-subsection">
          ${steeringFiles.map(file => `
            <div class="settings-item">
              <div class="settings-item-info">
                <div class="settings-item-label">${file}</div>
              </div>
              <div style="display: flex; gap: 8px;">
                <button class="ui-btn ui-btn-secondary ui-btn-sm" onclick="window.editSteeringFile('${file}')">编辑</button>
                <button class="ui-btn ui-btn-secondary ui-btn-sm" onclick="window.renameSteeringFile('${file}')">重命名</button>
                <button class="ui-btn ui-btn-secondary ui-btn-sm" onclick="window.openSteeringFile('${file}')">外部打开</button>
                <button class="ui-btn ui-btn-secondary ui-btn-sm" onclick="window.deleteSteeringFile('${file}')">删除</button>
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <div style="display: flex; gap: 8px; margin-top: 12px;">
        <button class="ui-btn ui-btn-secondary" onclick="window.createSteeringFile()">创建规则文件</button>
        <button class="ui-btn ui-btn-secondary" onclick="window.openSteeringFolder()">打开 Steering 目录</button>
      </div>
    </div>
  `
}

/**
 * 渲染命令配置部分
 */
function renderCommandsSection(settings: KiroSettings): string {
  return `
    <div class="settings-section">
      <h3 class="settings-section-title">命令配置</h3>
      
      <div class="settings-item" style="flex-direction: column; align-items: flex-start;">
        <div class="settings-item-info" style="margin-bottom: 12px;">
          <div class="settings-item-label">信任的命令</div>
          <div class="settings-item-desc">这些命令将自动执行，无需确认</div>
        </div>
        
        ${settings.trustedCommands.length > 0 ? `
          <div style="width: 100%; margin-bottom: 12px;">
            ${settings.trustedCommands.map((cmd, index) => `
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <code style="flex: 1; padding: 6px 10px; background: var(--slate-50); border: 1px solid var(--border-color); border-radius: 4px; font-size: 12px;">${cmd}</code>
                <button class="ui-btn ui-btn-secondary ui-btn-sm" onclick="window.removeTrustedCommand(${index})">删除</button>
              </div>
            `).join('')}
          </div>
        ` : ''}
        
        <div style="display: flex; gap: 8px; width: 100%;">
          <input type="text" class="ui-input" id="new-trusted-command" placeholder="输入命令，如: npm install" style="flex: 1; padding: 6px 10px;" />
          <button class="ui-btn ui-btn-secondary" onclick="window.addTrustedCommand()">添加</button>
        </div>
      </div>

      <div class="settings-item" style="flex-direction: column; align-items: flex-start;">
        <div class="settings-item-info" style="margin-bottom: 12px;">
          <div class="settings-item-label">禁止的命令</div>
          <div class="settings-item-desc">这些命令将被阻止执行</div>
        </div>
        
        ${settings.commandDenylist.length > 0 ? `
          <div style="width: 100%; margin-bottom: 12px;">
            ${settings.commandDenylist.map((cmd, index) => `
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <code style="flex: 1; padding: 6px 10px; background: var(--slate-50); border: 1px solid var(--border-color); border-radius: 4px; font-size: 12px;">${cmd}</code>
                <button class="ui-btn ui-btn-secondary ui-btn-sm" onclick="window.removeDenyCommand(${index})">删除</button>
              </div>
            `).join('')}
          </div>
        ` : ''}
        
        <div style="display: flex; gap: 8px; width: 100%;">
          <input type="text" class="ui-input" id="new-deny-command" placeholder="输入要禁止的命令" style="flex: 1; padding: 6px 10px;" />
          <button class="ui-btn ui-btn-secondary" onclick="window.addDenyCommand()">添加</button>
          <button class="ui-btn ui-btn-secondary" onclick="window.addDefaultDenyCommands()">添加默认危险命令</button>
        </div>
      </div>
    </div>
  `
}

/**
 * 初始化 Kiro 设置页面
 */
export async function initKiroSettingsPage(container: HTMLElement) {
  let currentSettings: KiroSettings = DEFAULT_KIRO_SETTINGS
  let currentMcpConfig: McpConfig = { mcpServers: {} }
  let currentSteeringFiles: string[] = []

  // 加载设置
  async function loadSettings() {
    const loadingEl = container.querySelector('#kiro-settings-loading') as HTMLElement
    const contentEl = container.querySelector('#kiro-settings-content') as HTMLElement
    const errorEl = container.querySelector('#kiro-settings-error') as HTMLElement

    loadingEl.style.display = 'flex'
    contentEl.style.display = 'none'
    errorEl.style.display = 'none'

    try {
      const data = await kiroSettingsService.loadSettings()
      currentSettings = data.settings
      currentMcpConfig = data.mcpConfig
      currentSteeringFiles = data.steeringFiles

      contentEl.innerHTML = renderKiroSettingsContent(currentSettings, currentMcpConfig, currentSteeringFiles)
      contentEl.style.display = 'block'
      loadingEl.style.display = 'none'

      bindEvents()
    } catch (error) {
      errorEl.textContent = '加载 Kiro 设置失败: ' + (error as Error).message
      errorEl.style.display = 'block'
      loadingEl.style.display = 'none'
    }
  }

  // 保存设置
  async function saveSettings() {
    try {
      await kiroSettingsService.saveSettings(currentSettings)
      window.UI?.toast.success('Kiro 设置保存成功')
    } catch (error) {
      window.UI?.toast.error('保存失败: ' + (error as Error).message)
    }
  }

  // 绑定事件
  function bindEvents() {
    // Agent 自主模式
    (window as any).selectAgentAutonomy = (value: string) => {
      currentSettings.agentAutonomy = value
      const text = document.getElementById('agent-autonomy-text')
      if (text) {
        text.textContent = value === 'Autopilot' ? 'Autopilot (自动)' : 'Supervised (需确认)'
      }
      saveSettings()
    }

    // 模型选择
    const modelInput = container.querySelector('#model-selection') as HTMLInputElement
    modelInput?.addEventListener('change', () => {
      currentSettings.modelSelection = modelInput.value
      saveSettings()
    })

    // 刷新模型列表
    const refreshModelsBtn = container.querySelector('#refresh-models') as HTMLButtonElement
    refreshModelsBtn?.addEventListener('click', async () => {
      refreshModelsBtn.disabled = true
      try {
        const result = await kiroSettingsService.getAvailableModels()
        if (result.length > 0) {
          window.UI?.toast.info(`找到 ${result.length} 个可用模型`)
        } else {
          window.UI?.toast.info('暂无可用模型，请手动输入')
        }
      } catch (error) {
        window.UI?.toast.error('获取模型列表失败')
      } finally {
        refreshModelsBtn.disabled = false
      }
    })

    // Toggle 开关
    const toggle1 = container.querySelector('#enable-tab-autocomplete') as HTMLInputElement
    if (toggle1) {
      toggle1.addEventListener('change', () => {
        currentSettings.enableTabAutocomplete = toggle1.checked
        saveSettings()
      })
    }

    const toggle2 = container.querySelector('#usage-summary') as HTMLInputElement
    if (toggle2) {
      toggle2.addEventListener('change', () => {
        currentSettings.usageSummary = toggle2.checked
        saveSettings()
      })
    }

    const toggle3 = container.querySelector('#code-references') as HTMLInputElement
    if (toggle3) {
      toggle3.addEventListener('change', () => {
        currentSettings.codeReferences = toggle3.checked
        saveSettings()
      })
    }

    const toggle4 = container.querySelector('#enable-codebase-indexing') as HTMLInputElement
    if (toggle4) {
      toggle4.addEventListener('change', () => {
        currentSettings.enableCodebaseIndexing = toggle4.checked
        saveSettings()
      })
    }

    const toggle5 = container.querySelector('#enable-debug-logs') as HTMLInputElement
    if (toggle5) {
      toggle5.addEventListener('change', () => {
        currentSettings.enableDebugLogs = toggle5.checked
        saveSettings()
      })
    }

    const toggle6 = container.querySelector('#notifications-action-required') as HTMLInputElement
    if (toggle6) {
      toggle6.addEventListener('change', () => {
        currentSettings.notificationsActionRequired = toggle6.checked
        saveSettings()
      })
    }

    const toggle7 = container.querySelector('#notifications-failure') as HTMLInputElement
    if (toggle7) {
      toggle7.addEventListener('change', () => {
        currentSettings.notificationsFailure = toggle7.checked
        saveSettings()
      })
    }

    const toggle8 = container.querySelector('#notifications-success') as HTMLInputElement
    if (toggle8) {
      toggle8.addEventListener('change', () => {
        currentSettings.notificationsSuccess = toggle8.checked
        saveSettings()
      })
    }

    const toggle9 = container.querySelector('#notifications-billing') as HTMLInputElement
    if (toggle9) {
      toggle9.addEventListener('change', () => {
        currentSettings.notificationsBilling = toggle9.checked
        saveSettings()
      })
    }

    // MCP 配置
    (window as any).selectConfigureMcp = (value: string) => {
      currentSettings.configureMCP = value
      const text = document.getElementById('configure-mcp-text')
      if (text) {
        text.textContent = value === 'Enabled' ? '启用' : '禁用'
      }
      saveSettings()
    }

    // MCP 服务器管理
    bindMcpEvents()

    // Steering 文件管理
    bindSteeringEvents()

    // 命令管理
    bindCommandEvents()
  }

  function bindMcpEvents() {
    (window as any).addMcpServer = () => {
      showMcpServerDialog(undefined, undefined, async (name, server) => {
        try {
          await kiroSettingsService.saveMcpServer(name, server)
          // 只更新 MCP 配置，不重新加载整个页面
          const data = await kiroSettingsService.loadSettings()
          currentMcpConfig = data.mcpConfig
          refreshMcpSection()
          window.UI?.toast.success('MCP 服务器已添加')
        } catch (error) {
          window.UI?.toast.error('保存失败: ' + (error as Error).message)
        }
      })
    }

    (window as any).editMcpServer = (name: string) => {
      const server = currentMcpConfig.mcpServers[name]
      if (server) {
        showMcpServerDialog(name, server, async (newName, newServer) => {
          try {
            await kiroSettingsService.saveMcpServer(newName, newServer, name)
            // 只更新 MCP 配置
            const data = await kiroSettingsService.loadSettings()
            currentMcpConfig = data.mcpConfig
            refreshMcpSection()
            window.UI?.toast.success('MCP 服务器已更新')
          } catch (error) {
            window.UI?.toast.error('保存失败: ' + (error as Error).message)
          }
        })
      }
    }

    (window as any).deleteMcpServer = async (name: string) => {
      if (confirm(`确定要删除 MCP 服务器 "${name}" 吗？`)) {
        try {
          await kiroSettingsService.deleteMcpServer(name)
          // 只更新 MCP 配置
          const data = await kiroSettingsService.loadSettings()
          currentMcpConfig = data.mcpConfig
          refreshMcpSection()
          window.UI?.toast.success('已删除')
        } catch (error) {
          window.UI?.toast.error('删除失败: ' + (error as Error).message)
        }
      }
    }

    (window as any).openUserMcpConfig = async () => {
      showJsonEditorDialog(
        '用户 MCP 配置',
        () => kiroSettingsService.readMcpConfig('user'),
        async (content) => {
          await kiroSettingsService.writeMcpConfig('user', content)
          // 只更新 MCP 配置
          const data = await kiroSettingsService.loadSettings()
          currentMcpConfig = data.mcpConfig
          refreshMcpSection()
        }
      )
    }

    (window as any).openWorkspaceMcpConfig = async () => {
      showJsonEditorDialog(
        '工作区 MCP 配置',
        () => kiroSettingsService.readMcpConfig('workspace'),
        async (content) => {
          await kiroSettingsService.writeMcpConfig('workspace', content)
          // 只更新 MCP 配置
          const data = await kiroSettingsService.loadSettings()
          currentMcpConfig = data.mcpConfig
          refreshMcpSection()
        }
      )
    }
  }

  function bindSteeringEvents() {
    (window as any).createSteeringFile = () => {
      showSteeringFileDialog(undefined, async () => {
        // 只更新 Steering 文件列表
        const data = await kiroSettingsService.loadSettings()
        currentSteeringFiles = data.steeringFiles
        refreshSteeringSection()
      })
    }

    (window as any).editSteeringFile = (filename: string) => {
      showSteeringFileDialog(filename, async () => {
        // 只更新 Steering 文件列表
        const data = await kiroSettingsService.loadSettings()
        currentSteeringFiles = data.steeringFiles
        refreshSteeringSection()
      })
    }

    (window as any).renameSteeringFile = async (filename: string) => {
      showRenameDialog('重命名 Steering 文件', filename, async (newFilename) => {
        try {
          await kiroSettingsService.renameSteeringFile(filename, newFilename)
          // 只更新 Steering 文件列表
          const data = await kiroSettingsService.loadSettings()
          currentSteeringFiles = data.steeringFiles
          refreshSteeringSection()
          window.UI?.toast.success('文件已重命名')
        } catch (error) {
          window.UI?.toast.error('重命名失败: ' + (error as Error).message)
        }
      })
    }

    (window as any).openSteeringFile = async (filename: string) => {
      try {
        await kiroSettingsService.openSteeringFile(filename)
      } catch (error) {
        window.UI?.toast.error('打开文件失败')
      }
    }

    (window as any).deleteSteeringFile = async (filename: string) => {
      if (confirm(`确定要删除 "${filename}" 吗？`)) {
        try {
          await kiroSettingsService.deleteSteeringFile(filename)
          // 只更新 Steering 文件列表
          const data = await kiroSettingsService.loadSettings()
          currentSteeringFiles = data.steeringFiles
          refreshSteeringSection()
          window.UI?.toast.success('已删除')
        } catch (error) {
          window.UI?.toast.error('删除失败')
        }
      }
    }

    (window as any).openSteeringFolder = async () => {
      try {
        await kiroSettingsService.openSteeringFolder()
      } catch (error) {
        window.UI?.toast.error('打开目录失败')
      }
    }
  }

  function bindCommandEvents() {
    (window as any).addTrustedCommand = () => {
      const input = container.querySelector('#new-trusted-command') as HTMLInputElement
      const cmd = input.value.trim()
      if (cmd) {
        currentSettings.trustedCommands.push(cmd)
        input.value = ''
        refreshContent()
        saveSettings()
      }
    }

    (window as any).removeTrustedCommand = (index: number) => {
      currentSettings.trustedCommands.splice(index, 1)
      refreshContent()
      saveSettings()
    }

    (window as any).addDenyCommand = () => {
      const input = container.querySelector('#new-deny-command') as HTMLInputElement
      const cmd = input.value.trim()
      if (cmd) {
        currentSettings.commandDenylist.push(cmd)
        input.value = ''
        refreshContent()
        saveSettings()
      }
    }

    (window as any).removeDenyCommand = (index: number) => {
      currentSettings.commandDenylist.splice(index, 1)
      refreshContent()
      saveSettings()
    }

    (window as any).addDefaultDenyCommands = () => {
      const newCommands = DEFAULT_DENY_COMMANDS.filter(
        cmd => !currentSettings.commandDenylist.includes(cmd)
      )
      if (newCommands.length > 0) {
        currentSettings.commandDenylist.push(...newCommands)
        refreshContent()
        saveSettings()
        window.UI?.toast.success(`已添加 ${newCommands.length} 个默认危险命令`)
      } else {
        window.UI?.toast.info('所有默认危险命令已存在')
      }
    }
  }

  function refreshContent() {
    const contentEl = container.querySelector('#kiro-settings-content') as HTMLElement
    contentEl.innerHTML = renderKiroSettingsContent(currentSettings, currentMcpConfig, currentSteeringFiles)
    bindEvents()
  }

  // 只刷新 MCP 部分
  function refreshMcpSection() {
    const contentEl = container.querySelector('#kiro-settings-content') as HTMLElement
    const mcpSections = contentEl.querySelectorAll('.settings-section')
    
    // 找到 MCP 部分（第三个 section）
    if (mcpSections.length >= 3) {
      const mcpSection = mcpSections[2] as HTMLElement
      mcpSection.outerHTML = renderMcpSection(currentSettings, currentMcpConfig)
      
      // 重新绑定 MCP 相关事件
      bindMcpEvents()
    }
  }

  // 只刷新 Steering 部分
  function refreshSteeringSection() {
    const contentEl = container.querySelector('#kiro-settings-content') as HTMLElement
    const sections = contentEl.querySelectorAll('.settings-section')
    
    // 找到 Steering 部分（第四个 section）
    if (sections.length >= 4) {
      const steeringSection = sections[3] as HTMLElement
      steeringSection.outerHTML = renderSteeringSection(currentSteeringFiles)
      
      // 重新绑定 Steering 相关事件
      bindSteeringEvents()
    }
  }

  // 初始加载
  await loadSettings()
}
