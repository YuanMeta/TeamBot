import { JSDOM } from 'jsdom'
import { Readability } from '@mozilla/readability'
import { customAlphabet } from 'nanoid'
import { randomBytes, createCipheriv, createDecipheriv, scrypt } from 'crypto'
import { promisify } from 'util'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import dayjs from 'dayjs'

const scryptAsync = promisify(scrypt)

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
export const tid = (size?: number) => nanoid(size)

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

/**
 * 对称加密函数 (AES-256-GCM)
 * @param text 要加密的文本
 * @param password 加密密码（可选，默认使用环境变量 ENCRYPTION_KEY）
 * @returns 加密后的字符串，格式: iv:authTag:encryptedData
 */
export async function aesEncrypt(text: string): Promise<string> {
  const encryptionKey = process.env.APP_SECRET!

  // 使用 scrypt 从密码派生密钥
  const key = (await scryptAsync(encryptionKey, 'salt', 32)) as Buffer

  // 生成随机 IV (初始化向量)
  const iv = randomBytes(12)

  // 创建加密器
  const cipher = createCipheriv('aes-256-gcm', key, iv)

  // 加密数据
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  // 获取认证标签
  const authTag = cipher.getAuthTag()

  // 返回格式: iv:authTag:encryptedData
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

/**
 * 对称解密函数 (AES-256-GCM)
 * @param encryptedText 加密的文本，格式: iv:authTag:encryptedData
 * @param password 解密密码（可选，默认使用环境变量 ENCRYPTION_KEY）
 * @returns 解密后的原始文本
 */
export async function aesDecrypt(
  encryptedText: string
): Promise<string | null> {
  try {
    const encryptionKey = process.env.APP_SECRET!

    // 使用 scrypt 从密码派生密钥
    const key = (await scryptAsync(encryptionKey, 'salt', 32)) as Buffer

    // 分解加密数据
    const parts = encryptedText.split(':')
    if (parts.length !== 3) {
      console.log('Invalid encrypted text format')
      return null
    }

    const iv = Buffer.from(parts[0], 'hex')
    const authTag = Buffer.from(parts[1], 'hex')
    const encrypted = parts[2]

    // 创建解密器
    const decipher = createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(authTag)

    // 解密数据
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  } catch (e) {
    console.log('aesDecrypt error', e)
    return null
  }
}
