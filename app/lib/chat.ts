import type { MessagePart } from 'types'

export const getUserPrompt = (parts: MessagePart[]) => {
  return parts.find((p) => p.type === 'text')?.text
}

export const formatStreamText = (text: string) => {
  return fixMarkdownBold(escapeMhchem(escapeBrackets(filterLatestSymbol(text))))
}

function filterLatestSymbol(text: string) {
  if (!text) return text

  const lines = text.split('\n')
  if (lines.length === 0) return text

  const lastLine = lines[lines.length - 1]

  const onlyMarkdownSymbols = /^[\s#\-*|`]+$/

  if (onlyMarkdownSymbols.test(lastLine)) {
    // 如果最后一行只有格式符号，移除它
    lines.pop()
    return lines.join('\n')
  }

  return text
}

function escapeBrackets(text: string) {
  const pattern = /(```[\S\s]*?```|`.*?`)|\\\[([\S\s]*?[^\\])\\]|\\\((.*?)\\\)/g
  // @ts-ignore
  return text.replaceAll(
    pattern,
    (match, codeBlock, squareBracket, roundBracket) => {
      if (codeBlock) {
        return codeBlock
      } else if (squareBracket) {
        return `$$${squareBracket}$$`
      } else if (roundBracket) {
        return `$${roundBracket}$`
      }
      return match
    }
  )
}

function escapeMhchem(text: string) {
  // @ts-ignore
  return text.replaceAll('$\\ce{', '$\\\\ce{').replaceAll('$\\pu{', '$\\\\pu{')
}

function fixMarkdownBold(text: string): string {
  let count = 0
  let count2 = 0
  let result = ''
  let inCodeBlock = false
  let inInlineCode = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]

    if (text.slice(i, i + 3) === '```') {
      inCodeBlock = !inCodeBlock
      result += '```'
      i += 2
      continue
    }
    if (char === '`') {
      inInlineCode = !inInlineCode
      result += '`'
      continue
    }

    if (char === '*' && !inInlineCode && !inCodeBlock) {
      count++
      if (count === 2) {
        count2++
      }
      if (count > 2) {
        result += char
        continue
      }
      if (count === 2 && count2 % 2 === 0) {
        const prevChar = i > 0 ? text[i - 2] : ''
        const isPrevCharSymbol = /[\p{P}\p{S}]/u.test(prevChar)

        result +=
          i + 1 < text.length && text[i + 1] !== ' ' && isPrevCharSymbol
            ? '* '
            : '*'
      } else {
        result += '*'
      }
    } else {
      result += char
      count = 0
    }
  }
  return result
}
