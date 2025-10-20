import { observer } from 'mobx-react-lite'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store/store'

export const ChatEmpty = observer(() => {
  const { t } = useTranslation()
  const store = useStore()
  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12 && hour > 4) {
      return t('chat.greeting.morning')
    } else if (hour > 12 && hour < 19) {
      return t('chat.greeting.afternoon')
    } else {
      return t('chat.greeting.evening')
    }
  }, [t])
  return (
    <div className='pb-10 px-5 h-full flex items-center justify-center flex-col'>
      <div className={'w-[300px] text-center'}>
        <div className='text-2xl font-bold'>ChatBot, {greeting}</div>
      </div>
    </div>
  )
})
