import { JSDOM } from 'jsdom'
import { Readability } from '@mozilla/readability'
import { customAlphabet } from 'nanoid'

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
