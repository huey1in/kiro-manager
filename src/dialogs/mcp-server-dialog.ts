// MCP 服务器编辑对话框
import type { McpServer } from '../types/kiro-settings'

/**
 * 显示 MCP 服务器编辑对话框
 */
export function showMcpServerDialog(
  serverName?: string,
  server?: McpServer,
  onSave?: (name: string, server: McpServer) => void
): void {
  const isEdit = !!serverName

  const modal = window.UI?.modal.open({
    title: isEdit ? '编辑 MCP 服务器' : '添加 MCP 服务器',
    html: `
      <div class="modal-form">
        <div class="form-section">
          <label class="form-label">服务器名称 <span class="required">*</span></label>
          <input type="text" class="form-input" id="mcp-server-name" value="${serverName || ''}" placeholder="例如: filesystem" ${isEdit ? 'readonly' : ''} required>
          <p class="form-hint">服务器的唯一标识符</p>
        </div>

        <div class="form-section">
          <label class="form-label">命令 <span class="required">*</span></label>
          <input type="text" class="form-input" id="mcp-server-command" value="${server?.command || ''}" placeholder="例如: npx" required>
          <p class="form-hint">启动 MCP 服务器的命令</p>
        </div>

        <div class="form-section">
          <label class="form-label">参数</label>
          <textarea class="form-input form-textarea" id="mcp-server-args" placeholder="每行一个参数，例如:&#10;-y&#10;@modelcontextprotocol/server-filesystem&#10;/path/to/allowed/files" rows="4">${server?.args?.join('\n') || ''}</textarea>
          <p class="form-hint">命令行参数，每行一个</p>
        </div>

        <div class="form-section">
          <label class="form-label">环境变量</label>
          <textarea class="form-input form-textarea" id="mcp-server-env" placeholder="每行一个，格式: KEY=VALUE&#10;例如:&#10;NODE_ENV=production&#10;DEBUG=true" rows="4">${server?.env ? Object.entries(server.env).map(([k, v]) => `${k}=${v}`).join('\n') : ''}</textarea>
          <p class="form-hint">环境变量，每行一个，格式: KEY=VALUE</p>
        </div>

        <div class="form-section">
          <label class="form-label">
            <input type="checkbox" id="mcp-server-disabled" ${server?.disabled ? 'checked' : ''}>
            禁用此服务器
          </label>
        </div>
      </div>
    `,
    footer: `
      <button class="ui-btn ui-btn-secondary" onclick="window.closeMcpServerDialog()">取消</button>
      <button class="ui-btn ui-btn-primary" onclick="window.submitMcpServer()">保存</button>
    `,
    size: 'lg',
    closable: true
  })

  window.closeMcpServerDialog = () => {
    window.UI?.modal.close(modal)
    delete window.closeMcpServerDialog
    delete window.submitMcpServer
  }

  window.submitMcpServer = () => {
    const name = (document.getElementById('mcp-server-name') as HTMLInputElement)?.value.trim()
    const command = (document.getElementById('mcp-server-command') as HTMLInputElement)?.value.trim()
    const argsText = (document.getElementById('mcp-server-args') as HTMLTextAreaElement)?.value.trim()
    const envText = (document.getElementById('mcp-server-env') as HTMLTextAreaElement)?.value.trim()
    const disabled = (document.getElementById('mcp-server-disabled') as HTMLInputElement)?.checked

    if (!name) {
      window.UI?.toast.error('请输入服务器名称')
      return
    }

    if (!command) {
      window.UI?.toast.error('请输入命令')
      return
    }

    // 解析参数
    const args = argsText ? argsText.split('\n').map(s => s.trim()).filter(s => s) : undefined

    // 解析环境变量
    let env: Record<string, string> | undefined
    if (envText) {
      env = {}
      const lines = envText.split('\n')
      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed) {
          const index = trimmed.indexOf('=')
          if (index > 0) {
            const key = trimmed.substring(0, index).trim()
            const value = trimmed.substring(index + 1).trim()
            env[key] = value
          }
        }
      }
      if (Object.keys(env).length === 0) {
        env = undefined
      }
    }

    const newServer: McpServer = {
      command,
      args,
      env,
      disabled: disabled || undefined
    }

    if (onSave) {
      onSave(name, newServer)
    }

    window.UI?.modal.close(modal)
    delete window.closeMcpServerDialog
    delete window.submitMcpServer
  }
}
