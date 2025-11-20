import { ChevronDown, SquareArrowOutUpRight } from 'lucide-react'
import { observer } from 'mobx-react-lite'
import { Button } from '~/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from '~/components/ui/dropdown-menu'
import { ModelIcon } from '~/lib/ModelIcon'
import { useStore } from '../store/store'
import { Fragment } from 'react/jsx-runtime'
import { Skeleton } from '~/components/ui/skeleton'
import OpenAI from 'openai'
const client = new OpenAI({
  apiKey: 'bb3ba9b9-fe48-4048-9df0-8bc21af4fd9d',
  baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
  // apiKey: 'sk-W31XBGVSAvsayQTWk29BXQrass9CymopBQvkth3hsWPehEWv',
  // baseURL: 'https://api.moonshot.cn/v1',
  dangerouslyAllowBrowser: true
})
export const Header = observer(() => {
  const store = useStore()
  return (
    <div className={'h-[52px] flex items-center justify-between px-3'}>
      <div>
        <DropdownMenu>
          <DropdownMenuTrigger autoFocus={false} asChild>
            <Button variant={'ghost'} autoFocus={false}>
              <ModelIcon mode={'openai'} size={16} />
              {store.state.ready ? (
                <div
                  className={`flex items-center gap-1 ${store.state.ready ? '' : 'hidden'}`}
                >
                  <span className={'text-sm'}>
                    {store.state.model || '未设置模型'}
                  </span>
                  <ChevronDown />
                </div>
              ) : (
                <Skeleton className='h-6 w-48' />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className='w-60' align='start'>
            {store.state.assistants.map((a) => (
              <Fragment key={a.id}>
                <DropdownMenuLabel className={'flex items-center gap-1.5'}>
                  <ModelIcon mode={a.mode} size={16} />
                  {a.name}
                </DropdownMenuLabel>
                <DropdownMenuGroup>
                  {(a.models as string[]).map((m) => (
                    <DropdownMenuCheckboxItem
                      checked={
                        store.state.assistant?.id === a.id &&
                        store.state.model === m
                      }
                      onCheckedChange={() => {
                        store.selectModel(a.id, m)
                      }}
                      key={m}
                    >
                      {m}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuGroup>
              </Fragment>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className={'flex gap-1'}>
        <Button
          variant={'ghost'}
          onClick={async () => {
            const stream = await client.responses.create({
              model: 'doubao-seed-1-6-251015',
              // model: 'kimi-k2-thinking',
              tools: [
                {
                  // @ts-ignore
                  type: 'web_search',
                  // @ts-ignore
                  max_keyword: 3
                }
              ],
              input: '没有关于苹果m6芯片的消息？',
              stream: true
            })
            for await (const event of stream) {
              console.log(event)
            }
          }}
        >
          <SquareArrowOutUpRight />
          共享
        </Button>
      </div>
    </div>
  )
})
