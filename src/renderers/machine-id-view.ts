// 机器码管理页面渲染器
export function renderMachineIdView(): string {
  return `
    <div class="settings-page">
      <!-- 当前机器码 -->
      <div class="settings-section">
        <h3 class="settings-section-title">当前机器码</h3>
        <div class="settings-item">
          <div class="settings-item-info">
            <div class="settings-item-label">系统机器码</div>
            <div class="settings-item-desc" id="current-machine-id-display">
              <span style="font-family: 'Consolas', 'Monaco', monospace; color: var(--text-main);">加载中...</span>
            </div>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="ui-btn ui-btn-secondary ui-btn-sm" onclick="window.copyMachineId('current')">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14" style="margin-right: 4px;">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              复制
            </button>
            <button class="ui-btn ui-btn-secondary ui-btn-sm" onclick="window.refreshMachineId()">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14" style="margin-right: 4px;">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              刷新
            </button>
          </div>
        </div>
      </div>

      <!-- 原始机器码备份 -->
      <div class="settings-section">
        <h3 class="settings-section-title">上一次的机器码</h3>
        <div class="settings-item">
          <div class="settings-item-info">
            <div class="settings-item-label">备份的上一次机器码</div>
            <div class="settings-item-desc" id="original-machine-id-display">
              <span style="color: var(--text-muted);">每次更新机器码时会自动备份当前值</span>
            </div>
          </div>
          <div style="display: flex; gap: 8px;" id="original-actions" style="display: none;">
            <button class="ui-btn ui-btn-secondary ui-btn-sm" onclick="window.copyMachineId('original')">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14" style="margin-right: 4px;">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              复制
            </button>
            <button class="ui-btn ui-btn-primary ui-btn-sm" onclick="window.restoreOriginalMachineId()" id="restore-btn">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14" style="margin-right: 4px;">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              恢复上一次
            </button>
          </div>
        </div>
      </div>

      <!-- 机器码操作 -->
      <div class="settings-section">
        <h3 class="settings-section-title">机器码操作</h3>
        
        <!-- 权限警告 -->
        <div id="admin-warning" class="settings-info-box" style="display: none; background: rgba(251, 191, 36, 0.1); border: 1px solid rgba(251, 191, 36, 0.3); color: rgb(217, 119, 6);">
          <p style="margin: 0; display: flex; align-items: center; gap: 8px;">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <strong>需要管理员权限：</strong>修改机器码需要以管理员身份运行应用
          </p>
        </div>

        <!-- 随机生成 -->
        <div class="settings-item">
          <div class="settings-item-info">
            <div class="settings-item-label">随机生成机器码</div>
            <div class="settings-item-desc">一键生成 UUID 格式的随机机器码并应用</div>
          </div>
          <button class="ui-btn ui-btn-primary" onclick="window.generateRandomMachineId()">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16" style="margin-right: 4px;">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
            随机生成并应用
          </button>
        </div>

        <!-- 自定义输入 -->
        <div class="settings-item">
          <div class="settings-item-info">
            <div class="settings-item-label">自定义机器码</div>
            <div class="settings-item-desc">输入指定的 UUID 格式机器码</div>
          </div>
          <div style="display: flex; gap: 8px; align-items: center;">
            <input 
              type="text" 
              id="custom-machine-id-input" 
              class="ui-input" 
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              style="width: 280px; padding: 6px 10px; font-family: 'Consolas', 'Monaco', monospace; font-size: 12px;"
            />
            <button class="ui-btn ui-btn-secondary ui-btn-sm" onclick="window.applyCustomMachineId()">
              应用
            </button>
          </div>
        </div>
      </div>

      <!-- 快捷操作 -->
      <div class="settings-section">
        <h3 class="settings-section-title">管理</h3>
        
        <div class="settings-item">
          <div class="settings-item-info">
            <div class="settings-item-label">账户机器码管理</div>
            <div class="settings-item-desc" id="account-binding-desc">查看和管理每个账户绑定的机器码</div>
          </div>
          <button class="ui-btn ui-btn-secondary ui-btn-sm" onclick="window.openAccountBindingManager()">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14" style="margin-right: 4px;">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            管理绑定
          </button>
        </div>

        <div class="settings-item">
          <div class="settings-item-info">
            <div class="settings-item-label">变更历史记录</div>
            <div class="settings-item-desc" id="history-desc">查看机器码的变更历史</div>
          </div>
          <button class="ui-btn ui-btn-secondary ui-btn-sm" onclick="window.openMachineIdHistory()">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14" style="margin-right: 4px;">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            查看历史
          </button>
        </div>
      </div>
    </div>
  `
}
