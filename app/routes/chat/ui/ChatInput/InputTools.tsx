import { FileText, Image, Sparkle } from 'lucide-react'
import { observer } from 'mobx-react-lite'
import { Button } from '~/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '~/components/ui/dropdown-menu'
import { useStore } from '../../store/store'
import { chooseFile, type DocFile } from '~/lib/parser/chooseFile'
import { fileOpen } from 'browser-fs-access'

export const InputTools = observer(
  (props: {
    onSelectFile: (file: DocFile[]) => void
    onParseFile: (id: string, content: string | null) => void
    onSelectImage: (image: File) => void
  }) => {
    const store = useStore()
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
                chooseFile((id, content) => {
                  props.onParseFile(id, content)
                }).then((res) => {
                  props.onSelectFile(res)
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
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }
)
