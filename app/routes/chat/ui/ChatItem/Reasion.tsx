import { AnimatePresence, motion } from 'framer-motion'
import { AtomIcon, ChevronDown, ChevronRight, Copy, Check } from 'lucide-react'
import { memo, useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import Markdown from '~/components/project/markdown/markdown'

interface ThinkingProps {
  content?: string
  duration?: number | null
  style?: CSSProperties
  thinking?: boolean
}

export const Thinking = memo<ThinkingProps>(
  ({ content, duration, thinking, style }) => {
    const { t } = useTranslation()

    const [showDetail, setShowDetail] = useState(false)

    useEffect(() => {
      setShowDetail(!!thinking)
    }, [thinking])

    return (
      <div
        className={`flex flex-col gap-2 w-fit py-1 px-2 rounded-md text-gray-500 transition-colors duration-200 transform-gpu ${
          showDetail
            ? 'bg-neutral-50 dark:bg-neutral-800'
            : 'hover:bg-neutral-50 dark:hover:bg-neutral-800'
        }`}
        style={{
          ...style,
          fontSize: '0.9em',
          willChange: showDetail ? 'transform' : 'auto',
          contain: 'layout style paint'
        }}
      >
        <div
          className='flex items-center justify-between cursor-default gap-1 select-none'
          onClick={() => {
            setShowDetail(!showDetail)
          }}
        >
          {thinking ? (
            <div className={'flex items-center gap-2'}>
              <AtomIcon
                size={16}
                className='text-gray-500 dark:text-gray-400'
              />
              <div className='shine-text'>深度思考中...</div>
            </div>
          ) : (
            <div className={'flex items-center'}>
              <AtomIcon
                size={16}
                className='text-gray-500 dark:text-gray-400'
              />
              <div className={'flex'}>
                {!duration
                  ? '已深度思考'
                  : `已深度思考 (用时 ${((duration || 0) / 1000).toFixed(1)} 秒)`}
              </div>
            </div>
          )}
          <div className={'flex gap-1'}>
            <ChevronRight
              size={16}
              className={`text-gray-500 dark:text-gray-400 ${showDetail ? 'rotate-90' : ''}`}
            />
          </div>
        </div>

        <AnimatePresence mode='wait' initial={false}>
          {showDetail && (
            <motion.div
              key='reasoning-content'
              animate='open'
              exit='collapsed'
              initial='collapsed'
              className='will-change-[height,opacity] transform-gpu'
              style={{
                overflow: 'hidden',
                backfaceVisibility: 'hidden',
                perspective: 1000
              }}
              transition={{
                duration: 0.15,
                ease: [0.25, 0.1, 0.25, 1], // 更流畅的 ease 曲线
                layout: {
                  duration: 0.15,
                  ease: [0.25, 0.1, 0.25, 1]
                }
              }}
              variants={{
                collapsed: {
                  height: 0,
                  opacity: 0,
                  transition: {
                    duration: 0.1,
                    ease: [0.4, 0, 1, 1]
                  }
                },
                open: {
                  height: 'auto',
                  opacity: 1,
                  transition: {
                    duration: 0.15,
                    ease: [0, 0, 0.2, 1]
                  }
                }
              }}
            >
              <motion.div transition={{ duration: 0.15, delay: 0.05 }}>
                {typeof content === 'string' ? (
                  <Markdown variant={'chat'}>{content}</Markdown>
                ) : (
                  content
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }
)

interface ReasoningProps {
  content?: string
  duration?: number | null
  thinking?: boolean
}

export const Reasoning = memo<ReasoningProps>(
  ({ content = '', duration, thinking }) => {
    return (
      <Thinking content={content} duration={duration} thinking={thinking} />
    )
  }
)
