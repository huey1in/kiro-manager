// Kiro 设置服务
import type { KiroSettings, McpConfig, McpServer, KiroModel } from '../types/kiro-settings'

// 默认设置
export const DEFAULT_KIRO_SETTINGS: KiroSettings = {
  agentAutonomy: 'Autopilot',
  modelSelection: 'auto',
  enableDebugLogs: false,
  enableTabAutocomplete: false,
  enableCodebaseIndexing: false,
  usageSummary: true,
  codeReferences: false,
  configureMCP: 'Enabled',
  trustedCommands: [],
  commandDenylist: [],
  notificationsActionRequired: true,
  notificationsFailure: false,
  notificationsSuccess: false,
  notificationsBilling: true
}

class KiroSettingsService {
  /**
   * 加载 Kiro 设置
   */
  async loadSettings(): Promise<{
    settings: KiroSettings
    mcpConfig: McpConfig
    steeringFiles: string[]
  }> {
    try {
      const result = await (window as any).__TAURI__.core.invoke('get_kiro_settings')
      
      // 处理后端返回的 Option 类型字段
      const settings = result.settings || {}
      const processedSettings: KiroSettings = {
        agentAutonomy: settings.agentAutonomy || DEFAULT_KIRO_SETTINGS.agentAutonomy,
        modelSelection: settings.modelSelection || DEFAULT_KIRO_SETTINGS.modelSelection,
        enableDebugLogs: settings.enableDebugLogs ?? DEFAULT_KIRO_SETTINGS.enableDebugLogs,
        enableTabAutocomplete: settings.enableTabAutocomplete ?? DEFAULT_KIRO_SETTINGS.enableTabAutocomplete,
        enableCodebaseIndexing: settings.enableCodebaseIndexing ?? DEFAULT_KIRO_SETTINGS.enableCodebaseIndexing,
        usageSummary: settings.usageSummary ?? DEFAULT_KIRO_SETTINGS.usageSummary,
        codeReferences: settings.codeReferences ?? DEFAULT_KIRO_SETTINGS.codeReferences,
        configureMCP: settings.configureMCP || DEFAULT_KIRO_SETTINGS.configureMCP,
        trustedCommands: Array.isArray(settings.trustedCommands) ? settings.trustedCommands : [],
        commandDenylist: Array.isArray(settings.commandDenylist) ? settings.commandDenylist : [],
        notificationsActionRequired: settings.notificationsActionRequired ?? DEFAULT_KIRO_SETTINGS.notificationsActionRequired,
        notificationsFailure: settings.notificationsFailure ?? DEFAULT_KIRO_SETTINGS.notificationsFailure,
        notificationsSuccess: settings.notificationsSuccess ?? DEFAULT_KIRO_SETTINGS.notificationsSuccess,
        notificationsBilling: settings.notificationsBilling ?? DEFAULT_KIRO_SETTINGS.notificationsBilling
      }
      
      return {
        settings: processedSettings,
        mcpConfig: result.mcpConfig || { mcpServers: {} },
        steeringFiles: Array.isArray(result.steeringFiles) ? result.steeringFiles : []
      }
    } catch (error) {
      console.error('[Kiro设置] 加载失败:', error)
      return {
        settings: DEFAULT_KIRO_SETTINGS,
        mcpConfig: { mcpServers: {} },
        steeringFiles: []
      }
    }
  }

  /**
   * 保存 Kiro 设置
   */
  async saveSettings(settings: KiroSettings): Promise<void> {
    try {
      await (window as any).__TAURI__.core.invoke('save_kiro_settings', { settings })
      console.log('[Kiro设置] 保存成功')
    } catch (error) {
      console.error('[Kiro设置] 保存失败:', error)
      throw error
    }
  }

  /**
   * 获取可用模型列表
   */
  async getAvailableModels(): Promise<KiroModel[]> {
    try {
      const result = await (window as any).__TAURI__.core.invoke('get_kiro_available_models')
      return result.models || []
    } catch (error) {
      console.error('[Kiro设置] 获取模型列表失败:', error)
      return []
    }
  }

  /**
   * 打开 Kiro 设置文件
   */
  async openSettingsFile(): Promise<void> {
    try {
      await (window as any).__TAURI__.core.invoke('open_kiro_settings_file')
    } catch (error) {
      console.error('[Kiro设置] 打开设置文件失败:', error)
      throw error
    }
  }

  /**
   * 打开用户 MCP 配置文件
   */
  async openUserMcpConfig(): Promise<void> {
    try {
      await (window as any).__TAURI__.core.invoke('open_kiro_mcp_config', { type: 'user' })
    } catch (error) {
      console.error('[Kiro设置] 打开用户 MCP 配置失败:', error)
      throw error
    }
  }

  /**
   * 打开工作区 MCP 配置文件
   */
  async openWorkspaceMcpConfig(): Promise<void> {
    try {
      await (window as any).__TAURI__.core.invoke('open_kiro_mcp_config', { type: 'workspace' })
    } catch (error) {
      console.error('[Kiro设置] 打开工作区 MCP 配置失败:', error)
      throw error
    }
  }

  /**
   * 读取 MCP 配置文件内容
   */
  async readMcpConfig(type: 'user' | 'workspace'): Promise<string> {
    try {
      return await (window as any).__TAURI__.core.invoke('read_kiro_mcp_config', { type })
    } catch (error) {
      console.error('[Kiro设置] 读取 MCP 配置失败:', error)
      throw error
    }
  }

  /**
   * 保存 MCP 配置文件内容
   */
  async writeMcpConfig(type: 'user' | 'workspace', content: string): Promise<void> {
    try {
      await (window as any).__TAURI__.core.invoke('write_kiro_mcp_config', { type, content })
    } catch (error) {
      console.error('[Kiro设置] 保存 MCP 配置失败:', error)
      throw error
    }
  }

  /**
   * 打开 Steering 目录
   */
  async openSteeringFolder(): Promise<void> {
    try {
      await (window as any).__TAURI__.core.invoke('open_kiro_steering_folder')
    } catch (error) {
      console.error('[Kiro设置] 打开 Steering 目录失败:', error)
      throw error
    }
  }

  /**
   * 打开 Steering 文件
   */
  async openSteeringFile(filename: string): Promise<void> {
    try {
      await (window as any).__TAURI__.core.invoke('open_kiro_steering_file', { filename })
    } catch (error) {
      console.error('[Kiro设置] 打开 Steering 文件失败:', error)
      throw error
    }
  }

  /**
   * 读取 Steering 文件内容
   */
  async readSteeringFile(filename: string): Promise<string> {
    try {
      const result = await (window as any).__TAURI__.core.invoke('read_kiro_steering_file', { filename })
      return result.content || ''
    } catch (error) {
      console.error('[Kiro设置] 读取 Steering 文件失败:', error)
      throw error
    }
  }

  /**
   * 保存 Steering 文件内容
   */
  async saveSteeringFile(filename: string, content: string): Promise<void> {
    try {
      await (window as any).__TAURI__.core.invoke('save_kiro_steering_file', { filename, content })
      console.log('[Kiro设置] Steering 文件保存成功')
    } catch (error) {
      console.error('[Kiro设置] 保存 Steering 文件失败:', error)
      throw error
    }
  }

  /**
   * 删除 Steering 文件
   */
  async deleteSteeringFile(filename: string): Promise<void> {
    try {
      await (window as any).__TAURI__.core.invoke('delete_kiro_steering_file', { filename })
      console.log('[Kiro设置] Steering 文件删除成功')
    } catch (error) {
      console.error('[Kiro设置] 删除 Steering 文件失败:', error)
      throw error
    }
  }

  /**
   * 重命名 Steering 文件
   */
  async renameSteeringFile(oldFilename: string, newFilename: string): Promise<void> {
    try {
      await (window as any).__TAURI__.core.invoke('rename_kiro_steering_file', { 
        oldFilename, 
        newFilename 
      })
      console.log('[Kiro设置] Steering 文件重命名成功')
    } catch (error) {
      console.error('[Kiro设置] 重命名 Steering 文件失败:', error)
      throw error
    }
  }

  /**
   * 创建默认规则文件
   */
  async createDefaultRules(): Promise<void> {
    try {
      await (window as any).__TAURI__.core.invoke('create_kiro_default_rules')
      console.log('[Kiro设置] 默认规则创建成功')
    } catch (error) {
      console.error('[Kiro设置] 创建默认规则失败:', error)
      throw error
    }
  }

  /**
   * 保存 MCP 服务器配置
   */
  async saveMcpServer(name: string, server: any, oldName?: string): Promise<void> {
    try {
      await (window as any).__TAURI__.core.invoke('save_mcp_server', { name, server, oldName })
      console.log('[Kiro设置] MCP 服务器保存成功')
    } catch (error) {
      console.error('[Kiro设置] 保存 MCP 服务器失败:', error)
      throw error
    }
  }

  /**
   * 删除 MCP 服务器
   */
  async deleteMcpServer(name: string): Promise<void> {
    try {
      await (window as any).__TAURI__.core.invoke('delete_mcp_server', { name })
      console.log('[Kiro设置] MCP 服务器删除成功')
    } catch (error) {
      console.error('[Kiro设置] 删除 MCP 服务器失败:', error)
      throw error
    }
  }
}

export const kiroSettingsService = new KiroSettingsService()
