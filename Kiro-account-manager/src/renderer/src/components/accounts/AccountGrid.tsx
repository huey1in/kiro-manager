import { useRef, useMemo, useState, useEffect } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useAccountsStore } from '@/store/accounts'
import { useTranslation } from '@/hooks/useTranslation'
import { AccountCard } from './AccountCard'
import { AccountDetailDialog } from './AccountDetailDialog'
import type { Account } from '@/types/account'
import { Plus } from 'lucide-react'

interface AccountGridProps {
  onAddAccount: () => void
  onEditAccount: (account: Account) => void
}

// 卡片高度（包含间距）- 需要足够容纳有多个奖励的 PRO 账号
const CARD_HEIGHT = 340
// 卡片固定宽度
const CARD_WIDTH = 340
// 卡片间距
const GAP = 16

export function AccountGrid({ onAddAccount, onEditAccount }: AccountGridProps): React.ReactNode {
  const parentRef = useRef<HTMLDivElement>(null)
  const [detailAccount, setDetailAccount] = useState<Account | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [columns, setColumns] = useState(3)

  // 根据容器宽度动态计算列数
  useEffect(() => {
    const container = parentRef.current
    if (!container) return

    const updateColumns = () => {
      const width = container.clientWidth
      // 计算能放下多少列：(宽度 + 间距) / (卡片宽度 + 间距)
      const cols = Math.max(1, Math.floor((width + GAP) / (CARD_WIDTH + GAP)))
      setColumns(cols)
    }

    updateColumns()

    const resizeObserver = new ResizeObserver(updateColumns)
    resizeObserver.observe(container)

    return () => resizeObserver.disconnect()
  }, [])

  const {
    getFilteredAccounts,
    tags,
    groups,
    selectedIds,
    toggleSelection,
    checkAccountStatus
  } = useAccountsStore()
  const { t } = useTranslation()
  const isEn = t('common.unknown') === 'Unknown'

  const handleShowDetail = (account: Account) => {
    setDetailAccount(account)
  }

  const handleRefreshDetail = async () => {
    if (!detailAccount) return
    setIsRefreshing(true)
    try {
      await checkAccountStatus(detailAccount.id)
      // 刷新后重新获取账号数据
      const accounts = getFilteredAccounts()
      const updated = accounts.find(a => a.id === detailAccount.id)
      if (updated) setDetailAccount(updated)
    } finally {
      setIsRefreshing(false)
    }
  }

  const accounts = getFilteredAccounts()

  // 将账号按行分组（包含添加按钮作为虚拟项）
  const rows = useMemo(() => {
    const result: (Account | 'add')[][] = []
    const allItems: (Account | 'add')[] = [...accounts, 'add']
    for (let i = 0; i < allItems.length; i += columns) {
      result.push(allItems.slice(i, i + columns))
    }
    return result
  }, [accounts, columns])

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => CARD_HEIGHT,
    overscan: 2
  })

  const items = virtualizer.getVirtualItems()

  return (
    <div
      ref={parentRef}
      className="h-full overflow-auto"
      style={{ contain: 'strict' }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize() + 8}px`,
          width: '100%',
          position: 'relative'
        }}
      >
        {items.map((virtualRow) => {
          const row = rows[virtualRow.index]

          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start + 8}px)` // +8px 为标签光环留空间
              }}
            >
              <div className="flex gap-4 px-2 items-start">
                {row.map((item) => 
                  item === 'add' ? (
                    <div
                      key="add-button"
                      className="flex items-center justify-center border-2 border-dashed border-muted-foreground/20 rounded-xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors flex-shrink-0"
                      style={{ width: CARD_WIDTH, height: CARD_HEIGHT - GAP }}
                      onClick={onAddAccount}
                    >
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Plus className="h-8 w-8" />
                        <span className="text-sm">{isEn ? 'Add Account' : '添加账号'}</span>
                      </div>
                    </div>
                  ) : (
                    <div key={item.id} className="flex-shrink-0" style={{ width: CARD_WIDTH, height: CARD_HEIGHT - GAP }}>
                      <AccountCard
                        account={item}
                        tags={tags}
                        groups={groups}
                        isSelected={selectedIds.has(item.id)}
                        onSelect={() => toggleSelection(item.id)}
                        onEdit={() => onEditAccount(item)}
                        onShowDetail={() => handleShowDetail(item)}
                      />
                    </div>
                  )
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* 空状态 */}
      {accounts.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">{isEn ? 'No accounts yet' : '暂无账号'}</p>
            <button
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={onAddAccount}
            >
              <Plus className="h-4 w-4" />
              {isEn ? 'Add First Account' : '添加第一个账号'}
            </button>
          </div>
        </div>
      )}

      {/* 账号详情对话框 */}
      <AccountDetailDialog
        open={!!detailAccount}
        onOpenChange={(open) => !open && setDetailAccount(null)}
        account={detailAccount}
        onRefresh={handleRefreshDetail}
        isRefreshing={isRefreshing}
      />
    </div>
  )
}
