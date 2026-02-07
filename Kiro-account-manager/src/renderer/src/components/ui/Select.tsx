import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '../../lib/utils'

interface SelectOption {
  value: string
  label: string
  description?: string
}

interface SelectProps {
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function Select({ value, options, onChange, placeholder = '请选择', className }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selectedOption = options.find(opt => opt.value === value)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={ref} className={cn('relative', className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center justify-between gap-2 px-3 py-2 w-full rounded-lg border bg-background text-sm transition-all duration-200',
          'hover:border-primary/50 hover:bg-muted/50',
          isOpen && 'border-primary ring-2 ring-primary/20',
          !isOpen && 'border-border'
        )}
      >
        <span className={cn(!selectedOption && 'text-muted-foreground')}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown className={cn(
          'h-4 w-4 text-muted-foreground transition-transform duration-200',
          isOpen && 'rotate-180'
        )} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 py-1 rounded-lg border bg-background shadow-lg shadow-black/10 z-50 animate-in fade-in-0 zoom-in-95 duration-100">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value)
                setIsOpen(false)
              }}
              className={cn(
                'flex items-center justify-between w-full px-3 py-2 text-sm text-left transition-colors',
                'hover:bg-primary/10',
                option.value === value && 'bg-primary/5'
              )}
            >
              <div>
                <p className={cn(
                  'font-medium',
                  option.value === value && 'text-primary'
                )}>
                  {option.label}
                </p>
                {option.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{option.description}</p>
                )}
              </div>
              {option.value === value && (
                <Check className="h-4 w-4 text-primary shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
