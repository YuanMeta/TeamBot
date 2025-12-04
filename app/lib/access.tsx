import { createContext, useContext, useLayoutEffect } from 'react'
import { trpc } from '~/.client/trpc'
import { useGetSetState } from '~/hooks/useState'

export const AccessContext = createContext<{
  access: string[]
  hasAccess: (access: string) => boolean
}>({ access: [], hasAccess: () => false })

export const useAccess = () => {
  return useContext(AccessContext)
}

export function AccessProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useGetSetState({
    access: [] as string[],
    accessSet: new Set<string>(),
    ready: false
  })
  useLayoutEffect(() => {
    trpc.common.getUserAccess.query().then((res) => {
      setState({ access: res, ready: true, accessSet: new Set(res) })
    })
  }, [])
  const hasAccess = (access: string) => {
    return state().accessSet.has(access)
  }
  if (!state().ready) return null
  return (
    <AccessContext value={{ access: state().access, hasAccess }}>
      {children}
    </AccessContext>
  )
}

export function Access(props: { children: React.ReactNode; access: string[] }) {
  const { access } = useAccess()
  if (props.access.some((item) => !access.includes(item))) return null
  return props.children
}
