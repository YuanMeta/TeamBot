import {
  getDocument,
  GlobalWorkerOptions
} from 'pdfjs-dist/legacy/build/pdf.mjs'
import pdfWorker from 'pdfjs-dist/legacy/build/pdf.worker.mjs?url'
GlobalWorkerOptions.workerSrc = pdfWorker

export interface PDFParseResult {
  text: string
  metadata: {
    pageCount: number
    title?: string
    author?: string
  }
}

// PDF.js TextItem 类型定义
interface PDFTextItem {
  str: string
  dir: string
  transform: number[]
  width: number
  height: number
  fontName: string
  hasEOL: boolean
}

interface TextBlock {
  text: string
  x: number
  y: number
  width: number
  height: number
  fontSize: number
  fontName: string
  isBold: boolean
  isItalic: boolean
}

interface Line {
  blocks: TextBlock[]
  y: number
  avgFontSize: number
  text: string
  minX: number
  maxX: number
  indent: number
  pageHeight: number
  isBoldLine: boolean
}

interface ListMatch {
  type: 'ordered' | 'unordered'
  marker: string
  depth: number
}

export class PDFParser {
  /**
   * 从PDF文件读取内容
   * @param file PDF文件对象
   * @returns 解析结果，包含文本内容和元数据
   */
  public static async parsePDF(file: File): Promise<PDFParseResult> {
    try {
      // 将文件转换为 ArrayBuffer
      const arrayBuffer = await file.arrayBuffer()

      // 加载PDF文档
      const loadingTask = getDocument({ data: arrayBuffer })
      const pdf = await loadingTask.promise

      // 获取元数据
      const metadata = await pdf.getMetadata()

      // 提取所有页面的文本
      const markdownPages: string[] = []

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const pageMarkdown = await this.parsePageToMarkdown(
          page,
          i - 1,
          pdf.numPages
        )
        markdownPages.push(pageMarkdown)
      }

      return {
        text: markdownPages.join('\n\n---\n\n'),
        metadata: {
          pageCount: pdf.numPages,
          // @ts-ignore
          title: metadata.info?.Title,
          // @ts-ignore
          author: metadata.info?.Author
        }
      }
    } catch (error: any) {
      throw new Error(`PDF解析错误: ${error.message}`)
    }
  }

  /**
   * 解析单个页面为Markdown
   */
  private static async parsePageToMarkdown(
    page: any,
    pageIndex: number,
    totalPages: number
  ): Promise<string> {
    const content = await page.getTextContent()
    const viewport = page.getViewport({ scale: 1.0 })

    // 提取文本块
    const textBlocks: TextBlock[] = []

    for (const item of content.items) {
      if ('str' in item && item.str.trim()) {
        const textItem = item as PDFTextItem
        const fontName = textItem.fontName || ''
        const normalizedFont = fontName.toLowerCase()
        const isBold = /bold|semibold|demibold|heavy|black/.test(normalizedFont)
        const isItalic = /italic|oblique/.test(normalizedFont)

        textBlocks.push({
          text: textItem.str,
          x: textItem.transform[4],
          y: viewport.height - textItem.transform[5], // 转换Y坐标
          width: textItem.width,
          height: textItem.height,
          fontSize: Math.round(textItem.transform[0] * 10) / 10,
          fontName,
          isBold,
          isItalic
        })
      }
    }

    // 按行分组
    const lines = this.groupIntoLines(textBlocks, viewport.height)

    // 转换为Markdown
    return this.convertLinesToMarkdown(lines, pageIndex, totalPages)
  }

  /**
   * 将文本块分组为行
   */
  private static groupIntoLines(
    blocks: TextBlock[],
    pageHeight: number
  ): Line[] {
    if (blocks.length === 0) return []

    // 按Y坐标排序
    blocks.sort((a, b) => a.y - b.y)

    const lines: Line[] = []
    let currentLine: TextBlock[] = [blocks[0]]
    let currentY = blocks[0].y
    let currentTolerance = this.getLineMergeTolerance(blocks[0])

    for (let i = 1; i < blocks.length; i++) {
      const block = blocks[i]
      const blockTolerance = this.getLineMergeTolerance(block)
      const tolerance = Math.max(currentTolerance, blockTolerance)

      // 如果Y坐标相近，认为是同一行（允许5个单位的误差）
      if (Math.abs(block.y - currentY) <= tolerance) {
        currentLine.push(block)
      } else {
        // 新行
        if (currentLine.length > 0) {
          currentLine.sort((a, b) => a.x - b.x) // 按X坐标排序
          lines.push(this.createLine(currentLine, pageHeight))
        }
        currentLine = [block]
        currentY = block.y
        currentTolerance = blockTolerance
        continue
      }

      currentY = block.y
      currentTolerance = blockTolerance
    }

    // 添加最后一行
    if (currentLine.length > 0) {
      currentLine.sort((a, b) => a.x - b.x)
      lines.push(this.createLine(currentLine, pageHeight))
    }

    return lines
  }

  private static getLineMergeTolerance(block: TextBlock): number {
    const base = block.height || block.fontSize || 12
    return Math.max(3, Math.min(14, base * 0.7))
  }

  /**
   * 创建行对象
   */
  private static createLine(blocks: TextBlock[], pageHeight: number): Line {
    const orderedBlocks = [...blocks].sort((a, b) => a.x - b.x)
    const avgFontSize =
      orderedBlocks.reduce((sum, b) => sum + b.fontSize, 0) /
      orderedBlocks.length
    const text = orderedBlocks.map((b) => b.text).join(' ')
    const minX = Math.min(...orderedBlocks.map((b) => b.x))
    const maxX = Math.max(...orderedBlocks.map((b) => b.x + (b.width || 0)))
    const avgY =
      orderedBlocks.reduce((sum, b) => sum + b.y, 0) / orderedBlocks.length

    return {
      blocks: orderedBlocks,
      y: avgY,
      avgFontSize,
      text: text.trim(),
      minX,
      maxX,
      indent: minX,
      pageHeight,
      isBoldLine: orderedBlocks.some((b) => b.isBold)
    }
  }

  /**
   * 将行转换为Markdown
   */
  private static convertLinesToMarkdown(
    lines: Line[],
    pageIndex: number,
    totalPages: number
  ): string {
    if (lines.length === 0) return ''

    const processedLines = this.preprocessLines(lines, pageIndex, totalPages)
    if (processedLines.length === 0) return ''

    const avgFontSize =
      processedLines.reduce((sum, l) => sum + l.avgFontSize, 0) /
      processedLines.length
    const baseIndent = Math.min(...processedLines.map((l) => l.indent))

    const result: string[] = []
    let tableMode = false
    let tableRows: string[][] = []
    let inList = false
    let inCodeBlock = false
    let previousParagraphLine: Line | null = null

    const flushTable = () => {
      if (!tableMode || tableRows.length === 0) return
      if (result.length > 0 && result[result.length - 1] !== '') {
        result.push('')
      }
      result.push(this.formatTable(tableRows))
      tableRows = []
      tableMode = false
      result.push('')
    }

    for (const line of processedLines) {
      if (this.detectCodeBlock(line, baseIndent)) {
        if (inList) {
          inList = false
          if (result.length > 0 && result[result.length - 1] !== '') {
            result.push('')
          }
        }
        flushTable()
        if (!inCodeBlock) {
          result.push('```')
          inCodeBlock = true
        }
        result.push(line.text)
        previousParagraphLine = null
        continue
      } else if (inCodeBlock) {
        result.push('```')
        inCodeBlock = false
      }

      const listMatch = this.detectList(line, baseIndent)
      if (listMatch) {
        flushTable()
        if (!inList && result.length > 0 && result[result.length - 1] !== '') {
          result.push('')
        }
        inList = true
        const indentSpaces = '  '.repeat(listMatch.depth)
        const marker =
          listMatch.type === 'ordered' ? `${listMatch.marker}.` : '-'
        const content = this.formatListContent(line)
        result.push(`${indentSpaces}${marker} ${content}`)
        previousParagraphLine = null
        continue
      } else if (inList) {
        inList = false
        if (result.length > 0 && result[result.length - 1] !== '') {
          result.push('')
        }
      }

      if (this.looksLikeTableRow(line)) {
        if (!tableMode) {
          tableMode = true
          tableRows = []
        }
        tableRows.push(this.extractTableColumns(line))
        previousParagraphLine = null
        continue
      } else if (tableMode) {
        flushTable()
      }

      const headingLevel = this.detectHeading(line, avgFontSize, baseIndent)
      if (headingLevel > 0) {
        if (result.length > 0 && result[result.length - 1] !== '') {
          result.push('')
        }
        result.push(
          '#'.repeat(headingLevel) + ' ' + this.formatInlineStyles(line)
        )
        result.push('')
        previousParagraphLine = null
        continue
      }

      const formatted = this.formatInlineStyles(line)
      if (!formatted) continue

      if (
        previousParagraphLine &&
        this.shouldJoinParagraph(previousParagraphLine, line) &&
        result.length > 0
      ) {
        result[result.length - 1] += ' ' + formatted
      } else {
        if (result.length > 0 && result[result.length - 1] !== '') {
          result.push('')
        }
        result.push(formatted)
      }

      previousParagraphLine = line
    }

    if (tableMode) {
      flushTable()
    }

    if (inCodeBlock) {
      result.push('```')
    }

    return result
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }

  private static preprocessLines(
    lines: Line[],
    pageIndex: number,
    totalPages: number
  ): Line[] {
    if (lines.length === 0) return []

    const trimmed = lines
      .map((line) => ({
        ...line,
        text: line.text.replace(/\s+/g, ' ').trim()
      }))
      .filter((line) => line.text.length > 0)
      .filter((line) => !this.shouldDropLine(line, pageIndex, totalPages))

    if (trimmed.length === 0) return []

    const avgFontSize =
      trimmed.reduce((sum, line) => sum + line.avgFontSize, 0) / trimmed.length

    const merged: Line[] = []
    for (let i = 0; i < trimmed.length; i++) {
      let current = trimmed[i]
      while (
        i + 1 < trimmed.length &&
        this.shouldMergeWithNext(current, trimmed[i + 1], avgFontSize)
      ) {
        current = this.mergeLines(current, trimmed[i + 1])
        i++
      }
      merged.push(current)
    }

    return merged
  }

  private static shouldDropLine(
    line: Line,
    pageIndex: number,
    totalPages: number
  ): boolean {
    const normalized = line.text.replace(/[·•●○◦▪▫⁃‣⁌⁍\s]/g, '')
    if (!normalized) return true

    if (this.isPageNumberLine(line, normalized, pageIndex, totalPages)) {
      return true
    }

    if (/^[-–—=]{3,}$/.test(normalized)) return true

    return false
  }

  private static isPageNumberLine(
    line: Line,
    normalized: string,
    pageIndex: number,
    totalPages: number
  ): boolean {
    const nearTop = line.y < line.pageHeight * 0.08
    const nearBottom = line.y > line.pageHeight * 0.92
    if (!nearTop && !nearBottom) return false

    if (/^\d+$/.test(normalized)) return true
    if (/^page\d+$/i.test(normalized)) return true
    if (/^第\d+页$/.test(normalized)) return true
    if (totalPages > 1 && normalized === `${pageIndex + 1}/${totalPages}`) {
      return true
    }

    return false
  }

  private static shouldMergeWithNext(
    current: Line,
    next: Line,
    avgFontSize: number
  ): boolean {
    if (!current.text || !next.text) return false
    if (this.looksLikeTableRow(next)) return false
    if (this.looksLikePotentialList(next.text)) return false
    if (this.detectHeading(next, avgFontSize, current.indent) > 0) return false

    const verticalGap = Math.abs(next.y - current.y)
    const indentDiff = Math.abs(next.indent - current.indent)
    const endsWithHyphen =
      current.text.endsWith('-') && !current.text.endsWith('--')
    const endsWithSentence = /[。.!?:;)]$/.test(current.text.trim())

    if (endsWithHyphen) return true
    if (verticalGap > avgFontSize * 1.9) return false
    if (indentDiff > Math.max(20, avgFontSize)) return false
    if (!endsWithSentence) return true

    return verticalGap < avgFontSize * 1.1 && indentDiff < 8
  }

  private static mergeLines(current: Line, next: Line): Line {
    const combinedBlocks = [...current.blocks, ...next.blocks]
    const avgFontSize =
      combinedBlocks.reduce((sum, b) => sum + b.fontSize, 0) /
      combinedBlocks.length
    const avgY =
      combinedBlocks.reduce((sum, b) => sum + b.y, 0) / combinedBlocks.length
    const minX = Math.min(current.minX, next.minX)
    const maxX = Math.max(current.maxX, next.maxX)
    const needsHyphenJoin =
      current.text.endsWith('-') && !current.text.endsWith('--')
    const mergedText = needsHyphenJoin
      ? current.text.slice(0, -1) + next.text
      : `${current.text} ${next.text}`

    return {
      ...current,
      blocks: combinedBlocks,
      avgFontSize,
      y: avgY,
      text: mergedText.replace(/\s+/g, ' ').trim(),
      minX,
      maxX,
      indent: minX,
      isBoldLine: combinedBlocks.some((b) => b.isBold)
    }
  }

  private static looksLikePotentialList(text: string): boolean {
    return /^[\s]*((\d+|[a-zA-Z])[.)、]|[•●○◦▪▫⁃‣⁌⁍*\-])/.test(text)
  }

  private static detectCodeBlock(line: Line, baseIndent: number): boolean {
    if (line.blocks.length === 0) return false
    const relativeIndent = line.indent - baseIndent
    const trimmed = line.text.trim()
    if (trimmed.startsWith('```')) return false
    const monospaced = line.blocks.every((b) =>
      /mono|code|courier|consolas|menlo|andale|lucida/i.test(b.fontName)
    )
    const looksLikeCode =
      /[{}`;]/.test(line.text) ||
      /\b(class|const|let|var|function|if|for|while|return)\b/.test(
        line.text
      ) ||
      trimmed.startsWith('//')
    return monospaced || (relativeIndent > 45 && looksLikeCode)
  }

  private static detectList(line: Line, baseIndent: number): ListMatch | null {
    const text = line.text
    if (!text || text.length > 500) return null

    const relativeIndent = Math.max(0, line.indent - baseIndent)
    const depth =
      relativeIndent > 5 ? Math.min(3, Math.round(relativeIndent / 25)) : 0

    const unorderedMatch = text.match(/^[\s]*([•●○◦▪▫⁃‣⁌⁍*\-])\s*(.+)$/)
    if (unorderedMatch) {
      return { type: 'unordered', marker: '-', depth }
    }

    const orderedMatch = text.match(/^[\s]*((\d+)|([a-zA-Z]))[.)、]\s*(.+)$/)
    if (orderedMatch) {
      return {
        type: 'ordered',
        marker: orderedMatch[1],
        depth
      }
    }

    return null
  }

  private static formatListContent(line: Line): string {
    const strippedBlocks = this.stripListMarkerBlocks(line)
    if (strippedBlocks !== line.blocks) {
      const formatted = this.formatInlineStyles(line, strippedBlocks)
      if (formatted.length > 0) return formatted
    }

    return line.text
      .replace(/^[\s]*([•●○◦▪▫⁃‣⁌⁍*\-])+/, '')
      .replace(/^[\s]*((\d+)|([a-zA-Z]))[.)、]/, '')
      .trim()
  }

  private static stripListMarkerBlocks(line: Line): TextBlock[] {
    const blocks = [...line.blocks]

    while (blocks.length > 0) {
      const text = blocks[0].text.trim()
      if (!text.length) {
        blocks.shift()
        continue
      }

      if (/^[•●○◦▪▫⁃‣⁌⁍*\-]+$/.test(text)) {
        blocks.shift()
        continue
      }

      if (/^((\d+)|([a-zA-Z]))[.)、]?$/i.test(text)) {
        blocks.shift()
        break
      }

      break
    }

    return blocks.length === line.blocks.length ? line.blocks : blocks
  }

  private static shouldJoinParagraph(previous: Line, current: Line): boolean {
    if (previous.text.endsWith('-') && !previous.text.endsWith('--')) {
      return true
    }

    const endsWithSentence = /[。.!?:;)]$/.test(previous.text.trim())
    if (endsWithSentence) return false

    const verticalGap = Math.abs(current.y - previous.y)
    const indentDiff = Math.abs(current.indent - previous.indent)
    return verticalGap < previous.avgFontSize * 1.5 && indentDiff < 12
  }

  /**
   * 检测标题级别
   */
  private static detectHeading(
    line: Line,
    avgFontSize: number,
    baseIndent = 0
  ): number {
    if (!line.text) return 0

    const fontSize = line.avgFontSize || avgFontSize || 1
    const normalizedAvg = avgFontSize || fontSize || 1
    const text = line.text.trim()
    if (!text || text.length > 200) return 0

    const sizeRatio = fontSize / normalizedAvg
    const hasBold = line.isBoldLine || line.blocks.some((b) => b.isBold)
    const centered = Math.abs(line.indent - baseIndent) < 6
    const shortAndClean =
      text.length < 80 && !/[。.!?]$/.test(text) && !text.includes('：')
    const isUppercase =
      /^[A-Z0-9\s\-:]+$/.test(text) &&
      text === text.toUpperCase() &&
      text.length < 70

    if (sizeRatio > 2.1 || (sizeRatio > 1.8 && hasBold && shortAndClean)) {
      return 1
    }

    if (
      sizeRatio > 1.6 ||
      (sizeRatio > 1.35 && hasBold && (centered || shortAndClean))
    ) {
      return 2
    }

    if (
      sizeRatio > 1.3 ||
      (hasBold && shortAndClean) ||
      isUppercase ||
      /^((第\s*\d+\s*章)|(chapter\s+\d+)|(appendix))/i.test(text)
    ) {
      return 3
    }

    if (hasBold && text.length < 50 && shortAndClean) {
      return 4
    }

    return 0
  }

  /**
   * 格式化行内样式（粗体、斜体）
   */
  private static formatInlineStyles(
    line: Line,
    overrideBlocks?: TextBlock[]
  ): string {
    const blocks = overrideBlocks ?? line.blocks
    if (blocks.length === 0) return line.text.trim()

    const parts: string[] = []
    let boldOpen = false
    let italicOpen = false

    for (const block of blocks) {
      const desiredBold = !!block.isBold
      const desiredItalic = !!block.isItalic && !block.isBold

      if (boldOpen !== desiredBold) {
        parts.push('**')
        boldOpen = desiredBold
      }

      if (italicOpen !== desiredItalic) {
        parts.push('*')
        italicOpen = desiredItalic
      }

      parts.push(block.text)
      if (!block.text.endsWith(' ')) {
        parts.push(' ')
      }
    }

    if (italicOpen) {
      parts.push('*')
    }
    if (boldOpen) {
      parts.push('**')
    }

    return parts.join('').replace(/\s+/g, ' ').trim()
  }

  /**
   * 检测是否看起来像表格行
   */
  private static looksLikeTableRow(line: Line): boolean {
    // 至少3个块，且间距相对均匀
    if (line.blocks.length < 3) return false

    const gaps = this.getBlockGaps(line).filter((gap) => gap > 0)
    if (gaps.length < 2) return false

    // 检查间距是否相似（标准差较小）
    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length
    if (avgGap < 12) return false // 间距太小，可能是普通文本

    const variance =
      gaps.reduce((sum, gap) => sum + Math.pow(gap - avgGap, 2), 0) /
      gaps.length
    const stdDev = Math.sqrt(variance)

    return stdDev < avgGap * 0.6
  }

  /**
   * 提取表格列
   */
  private static extractTableColumns(line: Line): string[] {
    if (line.blocks.length === 0) return []

    const gaps = this.getBlockGaps(line)
    const avgGap =
      gaps.length > 0
        ? gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length
        : 0
    const threshold = Math.max(12, avgGap ? avgGap * 0.7 : 18)

    const columns: string[] = []
    let currentText = line.blocks[0].text

    for (let i = 1; i < line.blocks.length; i++) {
      const gap = gaps[i - 1] ?? 0
      if (gap > threshold) {
        columns.push(currentText.trim())
        currentText = line.blocks[i].text
      } else {
        currentText += ' ' + line.blocks[i].text
      }
    }

    columns.push(currentText.trim())

    return columns
      .map((col) => col.replace(/\s+/g, ' ').trim())
      .filter((col) => col.length > 0)
  }

  private static getBlockGaps(line: Line): number[] {
    const gaps: number[] = []
    for (let i = 1; i < line.blocks.length; i++) {
      const prev = line.blocks[i - 1]
      const current = line.blocks[i]
      gaps.push(current.x - (prev.x + (prev.width || 0)))
    }
    return gaps
  }

  /**
   * 格式化表格为Markdown
   */
  private static formatTable(rows: string[][]): string {
    if (rows.length === 0) return ''

    const maxCols = Math.max(...rows.map((r) => r.length))

    // 规范化所有行的列数
    const normalizedRows = rows.map((row) => {
      const newRow = [...row]
      while (newRow.length < maxCols) newRow.push('')
      return newRow
    })

    // 创建表头分隔符
    const separator = '|' + ' --- |'.repeat(maxCols)

    // 格式化表格
    const tableLines = normalizedRows.map((row, index) => {
      const line = '| ' + row.join(' | ') + ' |'
      if (index === 0) {
        return line + '\n' + separator
      }
      return line
    })

    return tableLines.join('\n')
  }

  /**
   * 将PDF内容处理成适合大模型使用的格式
   * @param text PDF原始文本
   * @returns 处理后的文本
   */
  public static formatForLLM(text: string): string {
    return (
      text
        .trim()
        // 移除多余的空白行（3个以上换行符改为2个）
        .replace(/\n{3,}/g, '\n\n')
        // 规范化多个空格为一个
        .replace(/[^\S\n]+/g, ' ')
        // 确保标题前后有空行
        .replace(/([^\n])\n(#{1,6}\s)/g, '$1\n\n$2')
        .replace(/(#{1,6}\s[^\n]+)\n([^\n#])/g, '$1\n\n$2')
        // 确保列表前有空行
        .replace(/([^\n])\n(\s*[-*]|\s*\d+\.)\s/g, '$1\n\n$2 ')
        // 确保表格前后有空行
        .replace(/([^\n])\n(\|)/g, '$1\n\n$2')
        .replace(/(\|[^\n]+)\n([^\n|])/g, '$1\n\n$2')
        // 清理行尾空格
        .replace(/[ \t]+$/gm, '')
        // 移除页面分隔符周围多余的空行
        .replace(/\n+---\n+/g, '\n\n---\n\n')
    )
  }

  /**
   * 完整的PDF处理流程
   * @param file PDF文件对象
   * @returs 处理后的文本
   */
  public static async processForLLM(file: File): Promise<string> {
    const { text } = await this.parsePDF(file)

    return this.formatForLLM(text)
  }
}
