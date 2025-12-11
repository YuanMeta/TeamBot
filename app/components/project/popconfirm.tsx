import { observer } from 'mobx-react-lite'
import { useState, type ReactNode } from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '~/components/ui/popover'
import { Button } from '~/components/ui/button'
import { Loader2, CircleHelp, Info } from 'lucide-react'

export function PopConfirm(props: {
  children: ReactNode
  title?: string
  okText?: string
  cancelText?: string
  description: string
  onOk: () => void | Promise<any>
  onCancel?: () => void
  okButtonProps?: React.ComponentProps<typeof Button>
  cancelButtonProps?: React.ComponentProps<typeof Button>
}) {
  const {
    children,
    title = '提示',
    okText = '确定',
    cancelText = '取消',
    description,
    onOk,
    onCancel,
    okButtonProps,
    cancelButtonProps
  } = props

  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleOk = async () => {
    try {
      setLoading(true)
      const result = onOk()
      if (result instanceof Promise) {
        await result
      }
      setOpen(false)
    } catch (error) {
      console.error('PopConfirm onOk error:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    }
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className='w-80 py-2.5' align='center'>
        <div className='space-y-3 pt-1'>
          <div className='space-y-1.5'>
            <div className='flex gap-1 text-sm leading-5'>
              <Info className='size-4 text-secondary-foreground/70 mt-0.5' />
              <span className={'flex-1 w-0 text-[13px] font-medium'}>
                {title}
              </span>
            </div>
            <div className='text-sm leading-5'>{description}</div>
          </div>
          <div className='flex justify-end gap-2 pt-1'>
            <Button
              variant='outline'
              size='sm'
              onClick={handleCancel}
              disabled={loading}
              {...cancelButtonProps}
            >
              {cancelText}
            </Button>
            <Button
              size='sm'
              onClick={handleOk}
              disabled={loading}
              {...okButtonProps}
            >
              {loading && <Loader2 className='animate-spin' />}
              {okText}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
