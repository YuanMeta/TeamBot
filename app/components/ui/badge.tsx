import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { X } from 'lucide-react'

import { cn } from '~/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/90',
        destructive:
          'border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
        outline:
          'text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground border-deep'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
)

export interface BadgeProps
  extends React.ComponentProps<'span'>,
    VariantProps<typeof badgeVariants> {
  asChild?: boolean
  removeable?: boolean
  onRemove?: (e: React.MouseEvent<HTMLButtonElement>) => void
}

function Badge({
  className,
  variant,
  asChild = false,
  removeable = false,
  onRemove,
  children,
  ...props
}: BadgeProps) {
  const Comp = asChild ? Slot : 'span'

  if (removeable && !asChild) {
    return (
      <Comp
        data-slot='badge'
        className={cn(badgeVariants({ variant }), 'pr-1', className)}
        {...props}
      >
        {children}
        <button
          type='button'
          onClick={onRemove}
          className='ml-1 p-0.5 inline-flex items-center justify-center rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors pointer-events-auto'
          aria-label='Remove'
        >
          <X className='size-3' />
        </button>
      </Comp>
    )
  }

  return (
    <Comp
      data-slot='badge'
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    >
      {children}
    </Comp>
  )
}

export { Badge, badgeVariants }
