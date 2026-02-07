import { useState } from 'react'
import { useAccountsStore } from '@/store/accounts'
import { useTranslation } from '@/hooks/useTranslation'
import { AccountToolbar } from './AccountToolbar'
import { AccountGrid } from './AccountGrid'
import { AddAccountDialog } from './AddAccountDialog'
import { EditAccountDialog } from './EditAccountDialog'
import { GroupManageDialog } from './GroupManageDialog'
import { TagManageDialog } from './TagManageDialog'
import { ExportDialog } from './ExportDialog'
import { Button } from '../ui'
import type { Account } from '@/types/account'
import { ArrowLeft, Loader2, Users } from 'lucide-react'

interface AccountManagerProps {
  onBack?: () => void
}

export function AccountManager({ onBack }: AccountManagerProps): React.ReactNode {
  const {
    isLoading,
    accounts,
    importFromExportData,
    importAccounts,
    selectedIds
  } = useAccountsStore()

  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [showGroupDialog, setShowGroupDialog] = useState(false)
  const [showTagDialog, setShowTagDialog] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [isFilterExpanded, setIsFilterExpanded] = useState(false)
  const { t } = useTranslation()
  const isEn = t('common.unknown') === 'Unknown'

  // 获取要导出的账号列表
  const getExportAccounts = () => {
    const accountList = Array.from(accounts.values())
    if (selectedIds.size > 0) {
      return accountList.filter(acc => selectedIds.has(acc.id))
    }
    return accountList
  }

  // 导出
  const handleExport = (): void => {
    setShowExportDialog(true)
  }

  // 解析 CSV 行（处理引号和逗号）
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    result.push(current.trim())
    return result
  }

  // 导入
  const handleImport = async (): Promise<void> => {
    const fileData = await window.api.importFromFile()

    if (!fileData) return

    const { content, format } = fileData

    try {
      if (format === 'json') {
        // JSON 格式：完整导出数据
        const data = JSON.parse(content)
        if (data.version && data.accounts) {
          const result = importFromExportData(data)
          const skippedInfo = result.errors.find(e => e.id === 'skipped')
          const skippedMsg = skippedInfo ? `，${skippedInfo.error}` : ''
          alert(`导入完成：成功 ${result.success} 个${skippedMsg}`)
        } else {
          alert('无效的 JSON 文件格式')
        }
      } else if (format === 'csv') {
        // CSV 格式：邮箱,昵称,登录方式,RefreshToken,ClientId,ClientSecret,Region
        const lines = content.split('\n').filter(line => line.trim())
        if (lines.length < 2) {
          alert('CSV 文件为空或只有标题行')
          return
        }

        // 跳过标题行，解析数据行
        const items = lines.slice(1).map(line => {
          const cols = parseCSVLine(line)
          return {
            email: cols[0] || '',
            nickname: cols[1] || undefined,
            idp: cols[2] || 'Google',
            refreshToken: cols[3] || '',
            clientId: cols[4] || '',
            clientSecret: cols[5] || '',
            region: cols[6] || 'us-east-1'
          }
        }).filter(item => item.email && item.refreshToken)

        if (items.length === 0) {
          alert('未找到有效的账号数据（需要邮箱和 RefreshToken）')
          return
        }

        const result = importAccounts(items)
        alert(`导入完成：成功 ${result.success} 个，失败 ${result.failed} 个`)
      } else if (format === 'txt') {
        // TXT 格式：每行一个账号，格式为 邮箱,RefreshToken 或 邮箱|RefreshToken
        const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'))
        
        const items = lines.map(line => {
          // 支持逗号或竖线分隔
          const parts = line.includes('|') ? line.split('|') : line.split(',')
          return {
            email: parts[0]?.trim() || '',
            refreshToken: parts[1]?.trim() || '',
            nickname: parts[2]?.trim() || undefined,
            idp: parts[3]?.trim() || 'Google'
          }
        }).filter(item => item.email && item.refreshToken)

        if (items.length === 0) {
          alert('未找到有效的账号数据（格式：邮箱,RefreshToken）')
          return
        }

        const result = importAccounts(items)
        alert(`导入完成：成功 ${result.success} 个，失败 ${result.failed} 个`)
      } else {
        alert(`不支持的文件格式：${format}`)
      }
    } catch (e) {
      console.error('Import error:', e)
      alert('解析导入文件失败')
    }
  }

  // 管理分组
  const handleManageGroups = (): void => {
    setShowGroupDialog(true)
  }

  // 管理标签
  const handleManageTags = (): void => {
    setShowTagDialog(true)
  }

  // 编辑账号
  const handleEditAccount = (account: Account): void => {
    setEditingAccount(account)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">加载账号数据...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* 顶部工具栏 */}
      <header className="flex items-center justify-between gap-4 px-6 py-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-lg font-semibold text-primary">{isEn ? 'Accounts' : '账户管理'}</h1>
          </div>
        </div>
        
        {/* 工具栏 */}
        <AccountToolbar
          onAddAccount={() => setShowAddDialog(true)}
          onImport={handleImport}
          onExport={handleExport}
          onManageGroups={handleManageGroups}
          onManageTags={handleManageTags}
          isFilterExpanded={isFilterExpanded}
          onToggleFilter={() => setIsFilterExpanded(!isFilterExpanded)}
        />
      </header>

      {/* 主内容区域 */}
      <div className="flex-1 overflow-hidden flex flex-col px-6 py-4 gap-4">
        {/* 账号网格 */}
        <div className="flex-1 overflow-hidden">
          <AccountGrid
            onAddAccount={() => setShowAddDialog(true)}
            onEditAccount={handleEditAccount}
          />
        </div>
      </div>

      {/* 添加账号对话框 */}
      <AddAccountDialog
        isOpen={showAddDialog}
        onClose={() => setShowAddDialog(false)}
      />

      {/* 编辑账号对话框 */}
      <EditAccountDialog
        open={!!editingAccount}
        onOpenChange={(open) => !open && setEditingAccount(null)}
        account={editingAccount}
      />

      {/* 分组管理对话框 */}
      <GroupManageDialog
        isOpen={showGroupDialog}
        onClose={() => setShowGroupDialog(false)}
      />

      {/* 标签管理对话框 */}
      <TagManageDialog
        isOpen={showTagDialog}
        onClose={() => setShowTagDialog(false)}
      />

      {/* 导出对话框 */}
      <ExportDialog
        open={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        accounts={getExportAccounts()}
        selectedCount={selectedIds.size}
      />
    </div>
  )
}
