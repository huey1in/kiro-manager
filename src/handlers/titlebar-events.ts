export function attachTitlebarEvents(container: HTMLElement, onViewChange: () => void) {
  const minimizeBtn = container.querySelector('#minimize-btn')
  const closeBtn = container.querySelector('#close-btn')

  if (minimizeBtn) {
    minimizeBtn.addEventListener('click', async () => {
      await (window as any).__TAURI__.window.getCurrentWindow().minimize()
    })
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', async () => {
      await (window as any).__TAURI__.window.getCurrentWindow().close()
    })
  }

  // 侧边栏导航
  const sidebarLinks = container.querySelectorAll('.sidebar-link')
  sidebarLinks.forEach(link => {
    link.addEventListener('click', () => {
      sidebarLinks.forEach(l => l.classList.remove('active'))
      link.classList.add('active')
      onViewChange()
    })
  })
}
