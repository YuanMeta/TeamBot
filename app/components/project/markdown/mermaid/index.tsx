import { memo } from 'react'

import FullFeatured from './fullFeatured'
import { useMermaid } from './useMermaid'

const Mermaid = memo(({ children }: { children: string }) => {
  const tirmedChildren = children.trim()
  const MermaidRender = useMermaid(tirmedChildren)

  return (
    <FullFeatured content={tirmedChildren} showLanguage={true} type={'block'}>
      <MermaidRender />
    </FullFeatured>
  )
})

export default Mermaid

export { type MermaidProps } from './type'
