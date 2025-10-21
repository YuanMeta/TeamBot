import { observer } from 'mobx-react-lite'
import { Button } from '~/components/ui/button'

export const Header = observer(() => {
  return (
    <div
      className={
        'h-12 flex items-center justify-between border-b border-border px-4'
      }
    >
      <div>sdf</div>
      <div>
        <Button size={'sm'} variant={'outline'}>
          共享
        </Button>
      </div>
    </div>
  )
})
