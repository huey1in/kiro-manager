import { KProxyPanel } from '../kproxy'
import { useTranslation } from '@/hooks/useTranslation'
import { Shield } from 'lucide-react'

export function KProxyPage() {
  const { t } = useTranslation()
  const isEn = t('common.unknown') === 'Unknown'

  return (
    <div className="flex-1 p-6 space-y-6 overflow-auto">
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-purple-500/10 via-purple-500/5 to-purple-500/10 p-6 border border-purple-500/20">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/20 to-transparent rounded-full blur-2xl" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-purple-500/20 to-transparent rounded-full blur-2xl" />
        <div className="relative flex items-center gap-4">
          <div className="p-3 rounded-xl bg-purple-500 shadow-lg shadow-purple-500/25">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-purple-600 dark:text-purple-400">K-Proxy MITM</h1>
            <p className="text-muted-foreground">
              {isEn 
                ? 'MITM proxy for Machine ID replacement, reduces ban risk'
                : 'MITM 代理，替换 Machine ID，降低封禁风险'
              }
            </p>
          </div>
        </div>
      </div>
      <KProxyPanel />
    </div>
  )
}
