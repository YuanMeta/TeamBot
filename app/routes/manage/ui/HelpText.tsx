import { QuestionCircleOutlined } from '@ant-design/icons'
import { Tooltip } from 'antd'

export function HelpText({
  text,
  className
}: {
  text: string
  className?: string
}) {
  return (
    <Tooltip title={text}>
      <QuestionCircleOutlined className={className} />
    </Tooltip>
  )
}
