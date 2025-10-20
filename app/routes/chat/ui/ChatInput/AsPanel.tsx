import { Settings2 } from 'lucide-react'
import { observer } from 'mobx-react-lite'
import { Button } from '~/components/ui/button'

export const AsPanel = observer(() => {
  return (
    <Button size={'icon-sm'} variant={'ghost'}>
      <Settings2 />
    </Button>
  )
})
