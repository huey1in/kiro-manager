import { Home, Users, Settings, Info, ChevronLeft, ChevronRight, Fingerprint, Sparkles, Server, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import kiroLogo from '@/assets/kiro-high-resolution-logo-transparent.png'
import kiroLogoSmall from '@/assets/Kiro Logo.svg'
import { useAccountsStore } from '@/store/accounts'
import { useTranslation } from '@/hooks/useTranslation'

export type PageType = 'home' | 'accounts' | 'machineId' | 'kiroSettings' | 'proxy' | 'kproxy' | 'settings' | 'about'

interface SidebarProps {
  currentPage: PageType
  onPageChange: (page: PageType) => void
  collapsed: boolean
  onToggleCollapse: () => void
}

const menuItemsConfig: { id: PageType; labelKey: string; icon: React.ElementType }[] = [
  { id: 'home', labelKey: 'nav.home', icon: Home },
  { id: 'accounts', labelKey: 'nav.accounts', icon: Users },
  { id: 'machineId', labelKey: 'nav.machineId', icon: Fingerprint },
  { id: 'kiroSettings', labelKey: 'nav.kiroSettings', icon: Sparkles },
  { id: 'proxy', labelKey: 'nav.proxy', icon: Server },
  { id: 'kproxy', labelKey: 'nav.kproxy', icon: Shield },
  { id: 'settings', labelKey: 'nav.settings', icon: Settings },
  { id: 'about', labelKey: 'nav.about', icon: Info },
]

export function Sidebar({ currentPage, onPageChange, collapsed, onToggleCollapse }: SidebarProps) {
  const { darkMode } = useAccountsStore()
  const { t } = useTranslation()

  return (
    <div 
      className={cn(
        "h-screen bg-card border-r flex flex-col transition-all duration-300",
        collapsed ? "w-16" : "w-52"
      )}
    >
      {/* Logo */}
      <div className="h-12 flex items-center justify-center border-b px-2 gap-2 overflow-hidden">
        {collapsed ? (
          <img 
            src={kiroLogoSmall} 
            alt="Kiro" 
            className={cn("h-14 w-14 object-contain transition-all", darkMode && "invert brightness-0")} 
          />
        ) : (
          <>
            <img 
              src={kiroLogo} 
              alt="Kiro" 
              className={cn("h-7 w-auto shrink-0 transition-all", darkMode && "invert brightness-0")} 
            />
            <span className="font-semibold text-foreground whitespace-nowrap">{t('common.unknown') === 'Unknown' ? 'Account Manager' : '账户管理器'}</span>
          </>
        )}
      </div>

      {/* Menu Items */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {menuItemsConfig.map((item) => {
          const Icon = item.icon
          const isActive = currentPage === item.id
          const label = t(item.labelKey)
          return (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={cn(
                "w-full flex items-center rounded-lg text-sm font-medium transition-all overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
                collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5"
              )}
              title={collapsed ? label : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && (
                <span className="whitespace-nowrap">
                  {label}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="p-2 border-t">
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          title={collapsed ? (t('common.unknown') === 'Unknown' ? 'Expand' : '展开侧边栏') : (t('common.unknown') === 'Unknown' ? 'Collapse' : '收起侧边栏')}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 shrink-0" />
              <span className="whitespace-nowrap">{t('common.unknown') === 'Unknown' ? 'Collapse' : '收起'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
