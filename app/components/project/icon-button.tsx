import type { ReactNode } from 'react'
import { cn } from '~/lib/utils'

export function IconButton(props: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  hidden?: boolean
  className?: string
}) {
  return (
    <div
      onClick={props.onClick}
      className={cn(
        'bg-background rounded-md hover:bg-neutral-100 border border-border dark:hover:bg-neutral-700/80 shadow-xs cursor-pointer dark:shadow-neutral-900 shadow-neutral-100 p-[5px] inline-flex [&>svg]:size-3.5 duration-150 data-disabled:opacity-60 data-disabled:cursor-not-allowed data-disabled:pointer-events-none',
        props.hidden ? 'hidden' : '',
        props.className
      )}
      data-disabled={props.disabled}
    >
      {props.children}
    </div>
  )
}
