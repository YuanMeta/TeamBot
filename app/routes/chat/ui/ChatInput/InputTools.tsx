import {
  Earth,
  FileText,
  GitBranchPlus,
  Image,
  Sparkle,
  Wrench
} from 'lucide-react'
import { observer } from 'mobx-react-lite'
import { Button } from '~/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from '~/components/ui/dropdown-menu'
import { useStore } from '../../store/store'
import { useMemo } from 'react'

export const InputTools = observer(() => {
  const store = useStore()
  const tools = useMemo(() => {
    if (store.state.assistant) {
      return store.state.assistant.tools
        .map((t) => store.toolsMap.get(t)!)
        .filter(Boolean)
    }
    return []
  }, [store.state.tools, store.state.assistant])
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size={'icon-sm'} variant={'ghost'}>
          <Sparkle />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className='w-36' align='start'>
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <FileText />
            文档
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Image />
            图片
          </DropdownMenuItem>
        </DropdownMenuGroup>
        {!!tools.length && (
          <DropdownMenuGroup>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Wrench />
                工具
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  {tools.map((t) => (
                    <DropdownMenuItem
                      key={t.id}
                      onClick={() => {
                        store.addTool(t.id)
                      }}
                    >
                      {t.type === 'http' ? <GitBranchPlus /> : <Earth />}
                      {t.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          </DropdownMenuGroup>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
})
