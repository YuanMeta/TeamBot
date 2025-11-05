declare module '@codemirror/theme-one-dark' {
  import type { Extension } from '@codemirror/state'
  import type { HighlightStyle } from '@codemirror/language'

  export const color: Record<string, string>
  export const oneDarkTheme: Extension
  export const oneDarkHighlightStyle: HighlightStyle
  export const oneDark: Extension
}

