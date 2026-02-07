import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Button, Badge } from '../ui'
import { X, FileJson, FileText, Table, Clipboard, Check, Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAccountsStore } from '@/store/accounts'
import { useTranslation } from '@/hooks/useTranslation'
import type { Account } from '@/types/account'

type ExportFormat = 'json' | 'txt' | 'csv' | 'clipboard'

interface ExportDialogProps {
  open: boolean
  onClose: () => void
  accounts: Account[]
  selectedCount: number
}

export function ExportDialog({ open, onClose, accounts, selectedCount }: ExportDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('json')
  const [includeCredentials, setIncludeCredentials] = useState(true)
  const [copied, setCopied] = useState(false)
  const { exportAccounts } = useAccountsStore()
  const { t } = useTranslation()
  const isEn = t('common.unknown') === 'Unknown'

  if (!open) return null

  const formats: { id: ExportFormat; name: string; icon: typeof FileJson; desc: string }[] = [
    { id: 'json', name: 'JSON', icon: FileJson, desc: isEn ? 'Full data, can be imported' : '完整数据，可用于导入' },
    { id: 'txt', name: 'TXT', icon: FileText, desc: isEn ? 'Text format' : (includeCredentials ? '可导入格式：邮箱,Token,昵称,登录方式' : '纯文本格式，每行一个账号') },
    { id: 'csv', name: 'CSV', icon: Table, desc: isEn ? 'Excel compatible' : (includeCredentials ? '可导入格式，Excel 兼容' : 'Excel 兼容格式') },
    { id: 'clipboard', name: isEn ? 'Clipboard' : '剪贴板', icon: Clipboard, desc: isEn ? 'Copy to clipboard' : (includeCredentials ? '可导入格式：邮箱,Token' : '复制到剪贴板') },
  ]

  // 生成导出内容
  const generateContent = (format: ExportFormat): string => {
    switch (format) {
      case 'json':
        // 使用 store 的 exportAccounts 函数导出完整数据
        const exportData = exportAccounts(accounts.map(a => a.id))
        // 如果不包含凭证，移除敏感信息
        if (!includeCredentials) {
          exportData.accounts = exportData.accounts.map(acc => ({
            ...acc,
            credentials: {
              ...acc.credentials,
              accessToken: '',
              refreshToken: '',
              csrfToken: ''
            }
          }))
        }
        return JSON.stringify(exportData, null, 2)

      case 'txt':
        if (includeCredentials) {
          // 包含凭证时导出可导入格式：邮箱,RefreshToken,昵称,登录方式
          return accounts.map(acc => 
            [
              acc.email,
              acc.credentials?.refreshToken || '',
              acc.nickname || '',
              acc.idp || 'Google'
            ].join(',')
          ).join('\n')
        }
        // 不包含凭证时导出摘要信息
        return accounts.map(acc => {
          const lines = [
            `邮箱: ${acc.email}`,
            acc.nickname ? `昵称: ${acc.nickname}` : null,
            acc.idp ? `登录方式: ${acc.idp}` : null,
            acc.subscription?.title ? `订阅: ${acc.subscription.title}` : null,
            acc.usage ? `用量: ${acc.usage.current ?? 0}/${acc.usage.limit ?? 0}` : null,
          ].filter(Boolean)
          return lines.join('\n')
        }).join('\n\n---\n\n')

      case 'csv':
        // CSV 格式：包含凭证时可用于导入
        const headers = includeCredentials 
          ? ['邮箱', '昵称', '登录方式', 'RefreshToken', 'ClientId', 'ClientSecret', 'Region']
          : ['邮箱', '昵称', '登录方式', '订阅类型', '订阅标题', '已用量', '总额度']
        const rows = accounts.map(acc => includeCredentials 
          ? [
              acc.email,
              acc.nickname || '',
              acc.idp || '',
              acc.credentials?.refreshToken || '',
              acc.credentials?.clientId || '',
              acc.credentials?.clientSecret || '',
              acc.credentials?.region || 'us-east-1'
            ]
          : [
              acc.email,
              acc.nickname || '',
              acc.idp || '',
              acc.subscription?.type || '',
              acc.subscription?.title || '',
              String(acc.usage?.current ?? ''),
              String(acc.usage?.limit ?? '')
            ]
        )
        // 添加 BOM 以支持 Excel 中文
        return '\ufeff' + [headers, ...rows].map(row => 
          row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        ).join('\n')

      case 'clipboard':
        if (includeCredentials) {
          // 包含凭证时导出可导入格式：邮箱,RefreshToken
          return accounts.map(acc => 
            `${acc.email},${acc.credentials?.refreshToken || ''}`
          ).join('\n')
        }
        // 不包含凭证时导出摘要信息
        return accounts.map(acc => 
          `${acc.email}${acc.nickname ? ` (${acc.nickname})` : ''} - ${acc.subscription?.title || '未知订阅'}`
        ).join('\n')

      default:
        return ''
    }
  }

  // 导出处理
  const handleExport = async () => {
    const content = generateContent(selectedFormat)
    const count = accounts.length

    if (selectedFormat === 'clipboard') {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => {
        setCopied(false)
        onClose()
      }, 1500)
      return
    }

    const extensions: Record<string, string> = {
      json: 'json',
      txt: 'txt',
      csv: 'csv'
    }
    const filename = `kiro-accounts-${new Date().toISOString().slice(0, 10)}.${extensions[selectedFormat]}`
    
    const success = await window.api.exportToFile(content, filename)
    if (success) {
      alert(isEn ? `Exported ${count} accounts` : `已导出 ${count} 个账号`)
      onClose()
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* 对话框 */}
      <div className="relative bg-background rounded-xl shadow-2xl w-[450px] animate-in fade-in zoom-in-95 duration-200">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            <h2 className="text-lg font-semibold">{isEn ? 'Export Accounts' : '导出账号'}</h2>
            <Badge variant="secondary">
              {selectedCount > 0 ? (isEn ? `${selectedCount} selected` : `${selectedCount} 个选中`) : (isEn ? `All ${accounts.length}` : `全部 ${accounts.length} 个`)}
            </Badge>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* 格式选择 */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {formats.map(format => {
              const Icon = format.icon
              const isSelected = selectedFormat === format.id
              return (
                <button
                  key={format.id}
                  onClick={() => setSelectedFormat(format.id)}
                  className={cn(
                    "p-4 rounded-lg border-2 text-left transition-all",
                    isSelected 
                      ? "border-primary bg-primary/5" 
                      : "border-muted hover:border-muted-foreground/30"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={cn("h-4 w-4", isSelected && "text-primary")} />
                    <span className={cn("font-medium", isSelected && "text-primary")}>
                      {format.name}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{format.desc}</p>
                </button>
              )
            })}
          </div>

          {/* 选项 */}
          {selectedFormat === 'json' && (
            <label className="flex items-center gap-2 p-3 bg-muted rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={includeCredentials}
                onChange={(e) => setIncludeCredentials(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <div>
                <p className="text-sm font-medium">{isEn ? 'Include credentials' : '包含凭证信息'}</p>
                <p className="text-xs text-muted-foreground">{isEn ? 'Include sensitive data for full import' : '包含 Token 等敏感数据，可用于完整导入'}</p>
              </div>
            </label>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-muted/30">
          <Button variant="outline" onClick={onClose}>
            {isEn ? 'Cancel' : '取消'}
          </Button>
          <Button onClick={handleExport} disabled={copied}>
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                {isEn ? 'Copied' : '已复制'}
              </>
            ) : selectedFormat === 'clipboard' ? (
              <>
                <Clipboard className="h-4 w-4 mr-2" />
                {isEn ? 'Copy' : '复制到剪贴板'}
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                {isEn ? 'Export' : '导出'}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
