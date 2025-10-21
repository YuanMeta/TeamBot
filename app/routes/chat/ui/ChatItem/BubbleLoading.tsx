import type { IconType } from '@lobehub/icons'
import { forwardRef, memo } from 'react'

const BubblesLoadingIcon: IconType = forwardRef(
  ({ size = '1em', style, className, ...rest }, ref) => {
    return (
      <svg
        className={'bubble-loading'}
        fill='currentColor'
        fillRule='evenodd'
        height={size}
        ref={ref}
        style={{ flex: 'none', lineHeight: 1, ...style }}
        viewBox='0 0 60 32'
        xmlns='http://www.w3.org/2000/svg'
        {...rest}
      >
        <circle cx='7' cy='16' r='6' />
        <circle cx='30' cy='16' r='6' />
        <circle cx='53' cy='16' r='6' />
      </svg>
    )
  }
)

const BubblesLoading = memo(() => {
  return (
    <div
      className={'flex items-center justify-center'}
      style={{ fill: 'currentColor', height: 24, width: 32 }}
    >
      <BubblesLoadingIcon size={14} />
    </div>
  )
})

export default BubblesLoading
