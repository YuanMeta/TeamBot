import crypto from 'crypto'
import jwt from 'jsonwebtoken'

const secret = process.env.APP_SECRET!

if (process.env.NODE_ENV === 'production' && !process.env.APP_SECRET) {
  throw new Error('APP_SECRET environment variable must be set in production')
}
const pbkdf2Async = (
  password: string,
  salt: Buffer,
  iterations: number,
  keylen: number,
  algorithm: string
) =>
  new Promise<Buffer>((resolve, reject): void => {
    crypto.pbkdf2(password, salt, iterations, keylen, algorithm, (err, key) => {
      err ? reject(err) : resolve(key)
    })
  })

export class PasswordManager {
  static async hashPassword(
    password: string,
    saltLength = 32,
    iterations = 100000
  ) {
    const salt = crypto.randomBytes(saltLength)
    const hash = await pbkdf2Async(password, salt, iterations, 64, 'sha256')

    return `pbkdf2_sha256$${iterations}$${salt.toString('hex')}$${hash.toString(
      'hex'
    )}`
  }

  static async verifyPassword(password: string, storedHash: string) {
    try {
      const [prefix, iterationsStr, saltHex, originalHash] =
        storedHash.split('$')
      const iterations = parseInt(iterationsStr)
      const salt = Buffer.from(saltHex, 'hex')
      const [_, algorithm] = prefix.split('_')
      const newHash = await pbkdf2Async(
        password,
        salt,
        iterations,
        64,
        algorithm
      )
      return newHash.toString('hex') === originalHash
    } catch (e) {
      return false
    }
  }
}

export const generateToken = (data: { uid: number; root: boolean }): string => {
  return jwt.sign(data, secret, { expiresIn: '7d' })
}

export const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, secret) as { uid: number; root: boolean }
  } catch {
    return null
  }
}
