import { JSDOM } from 'jsdom'
import { Readability } from '@mozilla/readability'
import { customAlphabet } from 'nanoid'
import { randomBytes } from 'crypto'

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
