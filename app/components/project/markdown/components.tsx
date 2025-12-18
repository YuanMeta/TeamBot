import { useMemo } from 'react'
import type { Components } from 'react-markdown'
import { CodeLite } from './code/code-block'
import { Checkbox } from '~/components/ui/checkbox'
import { Badge } from '~/components/ui/badge'
import { getDomain } from '~/lib/utils'

export const useComponents = () => {
  return useMemo(
    () =>
      ({
        a: (props: any) => {
          if (props.children === 'source') {
            return (
              <a className={'mx-1'} href={props.href} target={'_blank'}>
                <Badge variant='outline'>{getDomain(props.href || '')}</Badge>
              </a>
            )
          }
          return (
            <a
              {...props}
              target={'_blank'}
              className={'underline opacity-80 duration-150 hover:opacity-100'}
            />
          )
        },
        h1: (props: any) => (
          <h1
            {...props}
            className={
              '[&:not(:first-child)]:mt-7 scroll-m-20 text-2xl font-extrabold tracking-tight text-balance'
            }
          />
        ),
        h2: (props: any) => (
          <h2
            {...props}
            className={
              '[&:not(:first-child)]:mt-6 scroll-m-20 text-xl font-semibold tracking-tight text-balance'
            }
          />
        ),
        h3: (props: any) => (
          <h3
            {...props}
            className={
              '[&:not(:first-child)]:mt-5 scroll-m-20 text-lg font-semibold tracking-tight text-balance'
            }
          />
        ),
        h4: (props: any) => (
          <h4
            {...props}
            className={
              '[&:not(:first-child)]:mt-4 scroll-m-20 text-base font-medium tracking-tight text-balance'
            }
          />
        ),
        h5: (props: any) => (
          <h5
            {...props}
            className={
              '[&:not(:first-child)]:mt-3 scroll-m-20 text-base font-medium tracking-tight text-balance'
            }
          />
        ),
        p: (props: any) => (
          <p {...props} className={'[&:not(:first-child)]:mt-3'} />
        ),
        table: (props: any) => (
          <table
            {...props}
            className={
              'md-table w-full my-6 rounded-sm border-collapse text-sm'
            }
          />
        ),
        tr: (props: any) => (
          <tr {...props} className={'m-0 [&:not(:last-child)]:border-b p-0'} />
        ),
        th: (props: any) => (
          <th
            {...props}
            className={
              'border-b px-4 py-2 text-left font-bold [&[align=center]]:text-center [&[align=right]]:text-right'
            }
          />
        ),
        td: (props: any) => (
          <td
            {...props}
            className={
              'px-4 py-2 text-left [&[align=center]]:text-center [&[align=right]]:text-right'
            }
          />
        ),
        blockquote: (props: any) => (
          <blockquote
            {...props}
            className={
              'dark:text-neutral-300 text-neutral-700 mt-5 pl-5 relative italic before:absolute before:w-1 before:h-full before:left-0 before:top-0 before:bg-black/20 dark:before:bg-white/20 before:rounded-xs'
            }
          />
        ),
        code: (props: any) => (
          <code
            {...props}
            className={
              'bg-neutral-200/70 dark:bg-neutral-700/80 relative rounded px-[0.3rem] py-[0.2rem] font-mono text-sm'
            }
          />
        ),
        // img: enableImageGallery
        //   ? (props: any) => (
        //     <Image
        //       {...props}
        //       {...componentProps?.img}
        //       style={
        //         isChatMode
        //           ? { height: 'auto', maxWidth: 640, ...componentProps?.img?.style }
        //           : componentProps?.img?.style
        //       }
        //     />
        //   )
        //   : undefined,
        ol: (props: any) => (
          <ol {...props} className={'my-2 pl-8 list-decimal [&>li]:mt-2'} />
        ),
        ul: (props: any) => (
          <ul {...props} className={'my-2 pl-8 list-disc [&>li]:mt-2'} />
        ),
        li: ({ node, ...props }: any) => {
          return (
            <li {...props}>
              {node.children[0]?.tagName === 'input' && (
                <Checkbox checked={!!node.children[0]?.properties.checked} />
              )}
              {props.children}
            </li>
          )
        },
        pre: (props: any) => <CodeLite enableMermaid={true} {...props} />,
        section: (props: any) => <section {...props} />
      } as Components),
    []
  )
}
