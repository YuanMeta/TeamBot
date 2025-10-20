interface CopyToClipboardOptions {
  text?: string
  html?: string
}

export async function copyToClipboard(
  options: string | CopyToClipboardOptions
): Promise<boolean> {
  try {
    const copyOptions: CopyToClipboardOptions =
      typeof options === 'string' ? { text: options } : options

    const { text, html } = copyOptions

    if (!text && !html) {
      console.warn('copyToClipboard: 至少需要提供 text 或 html')
      return false
    }

    // 优先使用现代 Clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      const clipboardItems: Record<string, Blob> = {}

      // 添加纯文本格式
      if (text) {
        clipboardItems['text/plain'] = new Blob([text], { type: 'text/plain' })
      }

      // 添加 HTML 格式
      if (html) {
        clipboardItems['text/html'] = new Blob([html], { type: 'text/html' })
      }

      const clipboardItem = new ClipboardItem(clipboardItems)
      await navigator.clipboard.write([clipboardItem])
      return true
    }

    // 降级方案：使用传统方法（仅支持纯文本）
    const fallbackText = text || html || ''
    const textArea = document.createElement('textarea')
    textArea.value = fallbackText

    // 设置样式使其不可见
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    textArea.style.opacity = '0'

    document.body.appendChild(textArea)

    // 选择文本
    textArea.focus()
    textArea.select()

    try {
      // 尝试使用 document.execCommand
      const success = document.execCommand('copy')
      document.body.removeChild(textArea)

      if (html && !text) {
        console.warn(
          'copyToClipboard: 降级方案仅支持纯文本，HTML 内容可能未正确复制'
        )
      }

      return success
    } catch (err) {
      document.body.removeChild(textArea)
      return false
    }
  } catch (err) {
    console.error('复制失败:', err)
    return false
  }
}
