import { type ReactNode, memo } from 'react'

import type { MermaidProps } from './type'
import { useSetState } from 'react-use'

export const MermaidFullFeatured = memo<
  Omit<MermaidProps, 'children'> & { children: ReactNode; content: string }
>(({ showLanguage, content, children, className, ...rest }) => {
  const [state, setState] = useSetState({
    copied: false,
    expand: true
  })
  return (
    <div
      className={`relative my-5 overflow-hidden rounded-md transition-colors ${className || ''}`}
      data-code-type="mermaid"
      {...rest}
    >
      <div style={state.expand ? {} : { height: 0, overflow: 'hidden' }}>{children}</div>
    </div>
  )
})

export default MermaidFullFeatured
