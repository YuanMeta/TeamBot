import { observer } from 'mobx-react-lite'
import { toast } from 'sonner'
import { useStore } from '../../store/store'
import { Button } from '~/components/ui/button'

export const SwiftchModel = observer(() => {
  const store = useStore()
  return (
    <Button size={'sm'} variant={'ghost'}>
      Model
    </Button>
  )
})
