import { JSDOM } from 'jsdom'
import { Readability } from '@mozilla/readability'
import { customAlphabet } from 'nanoid'
import { randomBytes } from 'crypto'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import dayjs from 'dayjs'

export const getReadability = (html: string, url: string) => {
  let urlObj = new URL(url)
  const dom = new JSDOM(html, {
    url: urlObj.origin
  })
  const doc = dom.window.document
  const reader = new Readability(doc)
  return reader.parse()
}

const nanoid = customAlphabet(
  '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
  21
)
export const tid = () => nanoid()

export const isJsonObject = (obj: any) => {
  if (typeof obj !== 'object' || obj === null) {
    return false
  }

  if (Array.isArray(obj)) {
    return true
  }

  if (
    obj instanceof Date ||
    obj instanceof RegExp ||
    obj instanceof Map ||
    obj instanceof Set
  ) {
    return false
  }

  return true
}

export function randomString(len = 48) {
  return randomBytes(len).toString('base64url')
}

export function saveFileByBase64(base64: string) {
  // 解析 data URL 格式: data:image/png;base64,xxxxx
  const rootPath = process.cwd()
  const matches = base64.match(/^data:(.+?);base64,(.+)$/)
  if (!matches) {
    throw new Error('Invalid base64 format')
  }

  const mimeType = matches[1]
  const base64Data = matches[2]
  const ext = mimeType.split('/')[1] || 'bin'
  const yearMonth = dayjs().format('YYYY-MM')
  const dirPath = join(rootPath, 'files', yearMonth)
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true })
  }

  const filename = `${tid()}.${ext}`
  const filePath = join(dirPath, filename)

  const buffer = Buffer.from(base64Data, 'base64')
  writeFileSync(filePath, buffer)

  return join(yearMonth, filename)
}
