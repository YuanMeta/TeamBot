import { FileText, GitBranchPlus, Image, Sparkle } from 'lucide-react'
import { observer } from 'mobx-react-lite'
import { Button } from '~/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '~/components/ui/dropdown-menu'
import { useStore } from '../../store/store'
import { useMemo } from 'react'
import { chooseFile } from '~/lib/parser/chooseFile'
import { fileOpen } from 'browser-fs-access'

export const InputTools = observer(
  (props: {
    onSelectFile: (file: { name: string; content: string }) => void
    onSelectImage: (image: File) => void
  }) => {
    const store = useStore()
    const tools = useMemo(() => {
      if (store.state.assistant) {
        return store.state.assistant.tools
          .map((t) => store.state.toolsMap.get(t)!)
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
            <DropdownMenuItem
              onClick={() => {
                chooseFile().then((res) => {
                  if (res.content) {
                    props.onSelectFile(res)
                  }
                })
              }}
            >
              <FileText />
              文档
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={store.state.notSupportImageInputMode.has(
                store.state.assistant?.mode!
              )}
              onClick={async () => {
                const file = await fileOpen({
                  extensions: ['.png', '.jpg', '.jpeg', '.webp', '.gif'],
                  multiple: false
                })
                props.onSelectImage(file)
              }}
            >
              <Image />
              图片
            </DropdownMenuItem>
          </DropdownMenuGroup>
          {!!tools.filter((t) => t.type === 'http').length && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                {tools
                  .filter((t) => t.type === 'http')
                  .map((t) => (
                    <DropdownMenuItem
                      key={t.id}
                      onClick={() => {
                        store.addTool(t.id)
                      }}
                    >
                      <GitBranchPlus />
                      {t.name}
                    </DropdownMenuItem>
                  ))}
              </DropdownMenuGroup>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }
)
