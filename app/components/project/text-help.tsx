import { memo, type ReactNode } from 'react'
import { CircleHelp } from 'lucide-react'
import { Tooltip } from 'antd'

export const TextHelp = memo(
  (props: {
    text: string | ReactNode
    delay?: number
    size?: number
    width?: number
  }) => {
    return (
      <Tooltip title={props.text}>
        <CircleHelp
          className={'dark:text-white/60 text-black/60 inline-block'}
          size={props.size || 14}
        />
      </Tooltip>
    )
  }
)
