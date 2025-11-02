import * as React from 'react'
import { CheckIcon, ChevronDownIcon, XIcon } from 'lucide-react'
import { cn } from '~/lib/utils'
import { Badge } from '~/components/ui/badge'

import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '~/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '~/components/ui/command'

export interface SelectFilterOption {
  value: string
  label: string
  render?: React.ReactNode
  disabled?: boolean
}

export interface SelectFilterProps {
  options: SelectFilterOption[]
  value?: string | string[]
  defaultValue?: string | string[]
  onValueChange?: (value: string | string[]) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  className?: string
  size?: 'sm' | 'default'
  allowClear?: boolean
  multiple?: boolean
  maxDisplay?: number
  showSearch?: boolean
  allowCreateOnEnter?: boolean
}

function SelectFilter({
  options,
  value,
  defaultValue,
  onValueChange,
  placeholder = '请选择...',
  searchPlaceholder = '搜索选项...',
  emptyText = '无匹配选项',
  disabled,
  className,
  size = 'default',
  allowClear = false,
  multiple = false,
  showSearch = true,
  allowCreateOnEnter = false
}: SelectFilterProps) {
  const [open, setOpen] = React.useState(false)
  const [internalValue, setInternalValue] = React.useState<string | string[]>(
    defaultValue || (multiple ? [] : '')
  )
  const [search, setSearch] = React.useState('')
  const [extraOptions, setExtraOptions] = React.useState<SelectFilterOption[]>(
    []
  )

  const currentValue = value !== undefined ? value : internalValue

  const allOptions = React.useMemo(() => {
    return [...options, ...extraOptions]
  }, [options, extraOptions])
  // 标准化当前值为数组格式（方便处理）
  const currentValueArray = React.useMemo(() => {
    if (multiple) {
      return Array.isArray(currentValue)
        ? currentValue
        : currentValue
          ? [currentValue]
          : []
    }
    return currentValue ? [currentValue as string] : []
  }, [currentValue, multiple])

  // 获取当前选中项（当选中值不在 options 中时，使用回退显示）
  const selectedOptions = React.useMemo(() => {
    return currentValueArray.map((val) => {
      const found = allOptions.find((option) => option.value === val)
      return found ?? { value: val, label: val }
    })
  }, [allOptions, currentValueArray])

  const handleValueChange = (newValue: string | string[]) => {
    if (value === undefined) {
      setInternalValue(newValue)
    }
    onValueChange?.(newValue)
    if (!multiple) {
      setOpen(false)
    }
  }

  const handleSelectOption = (optionValue: string) => {
    if (multiple) {
      const newValue = currentValueArray.includes(optionValue)
        ? currentValueArray.filter((v) => v !== optionValue)
        : [...currentValueArray, optionValue]
      handleValueChange(newValue)
    } else {
      const newValue = currentValueArray.includes(optionValue)
        ? ''
        : optionValue
      handleValueChange(newValue)
    }
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    handleValueChange(multiple ? [] : '')
  }

  const handleRemoveOption = (e: React.MouseEvent, optionValue: string) => {
    e.stopPropagation()
    if (multiple) {
      const newValue = currentValueArray.filter((v) => v !== optionValue)
      handleValueChange(newValue)
    }
  }

  const handleCreateFromSearch = () => {
    const trimmed = search.trim()
    if (!allowCreateOnEnter || !trimmed) return
    const exists = allOptions.some(
      (o) =>
        o.value.toLowerCase() === trimmed.toLowerCase() ||
        o.label.toLowerCase() === trimmed.toLowerCase()
    )
    if (exists) return
    const newOption: SelectFilterOption = { value: trimmed, label: trimmed }
    setExtraOptions((prev) => [...prev, newOption])
    if (multiple) {
      const newValue = [...currentValueArray, newOption.value]
      handleValueChange(newValue)
    } else {
      handleValueChange(newOption.value)
      setOpen(false)
    }
    setSearch('')
  }

  return (
    <div className={cn('relative', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type='button'
            role='combobox'
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              'inline-flex items-center justify-between gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
              'border bg-background shadow-xs hover:ring-[1px] ring-neutral-200 hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50',
              'w-full max-w-full text-left font-normal px-2 py-1.5',
              size === 'default' ? 'min-h-9' : 'min-h-8',
              selectedOptions.length === 0 && 'text-muted-foreground',
              className
            )}
          >
            <div className='flex-1 min-w-0'>
              {selectedOptions.length === 0 ? (
                <span className='truncate text-sm leading-5 px-1'>
                  {placeholder}
                </span>
              ) : multiple ? (
                <div className='flex flex-wrap gap-1'>
                  {selectedOptions.map((option) => (
                    <Badge
                      key={option.value}
                      variant='secondary'
                      className='text-xs max-w-[200px]'
                    >
                      <span className='truncate'>{option.label}</span>
                      <div
                        className={'shrink-0'}
                        onClick={(e) => handleRemoveOption(e, option.value)}
                      >
                        <XIcon className='size-3 ml-1 hover:text-destructive shrink-0' />
                      </div>
                    </Badge>
                  ))}
                </div>
              ) : (
                <span className='truncate'>{selectedOptions[0]?.label}</span>
              )}
            </div>
            <div className='flex items-center gap-1 ml-2 shrink-0'>
              {allowClear && selectedOptions.length > 0 && !disabled && (
                <XIcon
                  className='size-4 opacity-50 hover:opacity-100 cursor-pointer transition-opacity'
                  onClick={handleClear}
                />
              )}
              <ChevronDownIcon className='size-4 shrink-0 opacity-50' />
            </div>
          </button>
        </PopoverTrigger>
        <PopoverContent className='w-[360px] p-0' align='start' sideOffset={4}>
          <Command>
            {showSearch && (
              <CommandInput
                placeholder={searchPlaceholder}
                value={search}
                onValueChange={setSearch}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateFromSearch()
                  }
                }}
              />
            )}
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {allOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    className='gap-2'
                    disabled={option.disabled}
                    onSelect={() => handleSelectOption(option.value)}
                  >
                    <CheckIcon
                      className={cn(
                        'h-4 w-4 shrink-0',
                        currentValueArray.includes(option.value)
                          ? 'opacity-100'
                          : 'opacity-0'
                      )}
                    />
                    {option.render ? (
                      <div className={'flex-1'}>{option.render}</div>
                    ) : (
                      <span className='flex-1 truncate'>{option.label}</span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}

SelectFilter.displayName = 'SelectFilter'

export { SelectFilter }
