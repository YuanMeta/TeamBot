import { Paperclip, Settings2 } from 'lucide-react'
import { observer } from 'mobx-react-lite'
import { Button } from '~/components/ui/button'

export const FileChoose = observer(() => {
  return (
    <Button size={'icon-sm'} variant={'ghost'}>
      <Paperclip />
    </Button>
  )
})
