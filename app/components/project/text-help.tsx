import { memo, type ReactNode } from 'react'
import { CircleHelp } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'

export const TextHelp = memo(
  (props: {
    text: string | ReactNode
    delay?: number
    size?: number
    width?: number
    children?: ReactNode
  }) => {
    return (
      <Tooltip delayDuration={props.delay}>
        <TooltipTrigger asChild>
          {props.children ? (
            props.children
          ) : (
            <CircleHelp
              className={'dark:text-white/60 text-black/60 inline-block'}
              size={props.size || 14}
            />
          )}
        </TooltipTrigger>
        <TooltipContent
          className={'break-words whitespace-pre-line'}
          style={{ maxWidth: props.width }}
        >
          {props.text}
        </TooltipContent>
      </Tooltip>
    )
  }
)
