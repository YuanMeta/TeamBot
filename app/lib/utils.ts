import type { FieldApi } from '@tanstack/react-form'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

import * as gfm from 'turndown-plugin-gfm'
import turndown from 'turndown'
import { copyToClipboard } from '~/.client/copy'
import { toast } from 'sonner'
import { customAlphabet } from 'nanoid'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const isFormInValid = (field: any) => {
  return field.state.meta.isTouched && !field.state.meta.isValid
}

export const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const isClient = typeof window !== 'undefined'

export const htmlToMarkdown = (html: string) => {
  const t = new turndown()
  t.use(gfm.gfm)
  t.addRule('preWithLang', {
    filter: ['pre'],
    replacement: function (content, node) {
      const classes = Array.from((node as HTMLElement).classList)
      const code = node.querySelector('code') as HTMLElement
      classes.push(...Array.from(code?.classList || []))
      const lang =
        classes
          .find((c) => c.startsWith('language-'))
          ?.replace('language-', '') || ''
      return `\n\`\`\`${lang}\n${content}\n\`\`\`\n`
    }
  })
  t.addRule('image', {
    filter: ['img'],
    replacement: function (content, node) {
      const img = node as HTMLImageElement
      const src = img.src || img.getAttribute('src') || ''
      const alt = img.alt || img.getAttribute('alt') || ''
      const height = img.height || img.getAttribute('height') || ''
      const align = img.getAttribute('data-align') || ''
      if (height) {
        return `<img src="${src}" alt="${alt}" height="${height}" ${align ? `data-align="${align}"` : ''}/>`
      } else if (align) {
        return `<img src="${src}" alt="${alt}" ${align ? `data-align="${align}"` : ''}/>`
      } else {
        return `![${alt}](${src})`
      }
    }
  })
  return t.turndown(html).replace(/\\\[/g, '[').replace(/\\\]/g, ']')
}

export const copyAction = (text: string) => {
  copyToClipboard(text)
  toast.success('已复制到剪贴板', {
    duration: 1500
  })
}

export const getDomain = (url: string) => {
  try {
    return new URL(url).host || url
  } catch (e) {
    return url
  }
}

export const findLast = <T>(
  array: T[],
  predicate: (item: T) => boolean
): T | null => {
  for (let i = array.length - 1; i >= 0; i--) {
    if (predicate(array[i])) {
      return array[i]
    }
  }
  return null
}

export const getTrpcErrorMessage = (error: any) => {
  let fieldErrors = error?.meta?.data?.zodError?.fieldErrors
  if (fieldErrors) {
    const keys = Object.keys(fieldErrors)
    return `[${keys[0]}] ${fieldErrors[keys[0]][0]}`
  }
  if (error?.meta?.message) {
    return error.meta?.message
  }
  return error?.message
}

const nanoid = customAlphabet(
  '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
  21
)
export const cid = () => nanoid()

export const mediaType = (name?: string) => {
  name = name || ''
  name = name.split('?')[0]
  const ext = name.toLowerCase().match(/\.\w+$/)?.[0]
  if (!ext) return 'other'
  if (['.md', '.markdown'].includes(ext)) return 'markdown'
  if (['.png', '.jpg', '.gif', '.svg', '.jpeg', '.webp'].includes(ext))
    return 'image'
  if (['.mp3', '.ogg', '.aac', '.wav', '.oga', '.m4a'].includes(ext))
    return 'audio'
  if (
    [
      '.mpg',
      '.mp4',
      '.webm',
      '.mpeg',
      '.ogv',
      '.wmv',
      '.m4v',
      '.ogg',
      '.av1'
    ].includes(ext)
  )
    return 'video'
  if (
    [
      '.pdf',
      '.doc',
      '.docx',
      '.xls',
      '.xlsx',
      '.ppt',
      '.pptx',
      '.txt',
      '.html'
    ].includes(ext)
  )
    return 'document'
  return 'other'
}

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      console.log('reader', reader)

      if (typeof result === 'string') {
        resolve(result)
      } else {
        reject(new Error('Failed to convert file to Base64 string'))
      }
    }
    reader.onerror = (error) => {
      reject(error)
    }
    reader.readAsDataURL(file)
  })
}
