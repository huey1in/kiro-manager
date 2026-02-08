export function renderSettingsView(): string {
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
}
