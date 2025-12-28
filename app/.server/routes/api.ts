import z from 'zod'
import { generateToken, PasswordManager } from '../lib/password'
import { userCookie, oauthStateCookie } from '../session'
import { completions } from './completions'
import { TRPCError } from '@trpc/server'
import { createClient } from '~/.server/lib/connect'
import { APICallError, convertToModelMessages, streamText, tool } from 'ai'
import { aesDecrypt, randomString, tid } from '~/.server/lib/utils'
import ky from 'ky'
import { createHash } from 'node:crypto'
import { join, resolve } from 'node:path'
import { existsSync, createReadStream, statSync } from 'node:fs'
import { lookup } from 'mime-types'
import { Readable } from 'node:stream'
import { chats, oauthAccounts, userRoles, users } from 'drizzle/schema'
import { and, eq, or } from 'drizzle-orm'
import type { DbInstance } from '../db'
import { recordRequest } from '../db/query'
import { cacheManage } from '../lib/cache'
// import logger from 'pino'
import type { Hono } from 'hono'
import { getUrlContent } from '../lib/tools'

// const log = logger({
//   transport: {
//     target: 'pino/file',
//     options: {
//       destination: 'logs/api.log',
//       mkdir: true
//     }
//   }
// })

// 防暴力破解：登录尝试记录
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>()
const MAX_ATTEMPTS = 5
const LOCK_DURATION = 15 * 60 * 1000

function recordFailedAttempt(key: string) {
  const attempts = loginAttempts.get(key) || { count: 0, lockedUntil: 0 }
  attempts.count += 1

  if (attempts.count >= MAX_ATTEMPTS) {
    attempts.lockedUntil = Date.now() + LOCK_DURATION
  }

  loginAttempts.set(key, attempts)

  setTimeout(() => {
    loginAttempts.delete(key)
  }, LOCK_DURATION)
}

const LoginInputSchema = z.object({
  nameOrEmail: z.string().min(1),
  password: z.string().min(6)
})

export const registerRoutes = (app: Hono, db: DbInstance) => {
  app.post('/public/login', async (c) => {
    const input: { nameOrEmail: string; password: string } = await c.req.json()
    try {
      LoginInputSchema.parse(input)
    } catch (e) {
      throw new Response((e as Error).message, { status: 400 })
    }
    const attemptKey = `login:${input.nameOrEmail}`
    const attempts = loginAttempts.get(attemptKey) || {
      count: 0,
      lockedUntil: 0
    }

    if (attempts.lockedUntil > Date.now()) {
      const remainingMinutes = Math.ceil(
        (attempts.lockedUntil - Date.now()) / 60000
      )
      return c.json(
        { error: `账户已被锁定，请在 ${remainingMinutes} 分钟后重试` },
        429
      )
    }

    if (attempts.lockedUntil > 0 && attempts.lockedUntil <= Date.now()) {
      loginAttempts.delete(attemptKey)
    }
    const [user] = await db
      .select()
      .from(users)
      .where(
        or(
          eq(users.email, input.nameOrEmail),
          eq(users.name, input.nameOrEmail)
        )
      )
    if (!user) {
      recordFailedAttempt(attemptKey)
      return c.json({ error: '用户名或密码错误', try: 5 - attempts.count }, 429)
    }

    if (user.deleted) {
      return c.json({ error: '该账户已被禁用' }, 401)
    }

    if (!user.password) {
      return c.json({ error: '用户名或密码错误', try: 5 - attempts.count }, 401)
    }

    const isPasswordValid = await PasswordManager.verifyPassword(
      input.password,
      user.password
    )

    if (!isPasswordValid) {
      recordFailedAttempt(attemptKey)
      return c.json({ error: '用户名或密码错误', try: 5 - attempts.count }, 401)
    }

    // 登录成功，清除失败记录
    loginAttempts.delete(attemptKey)
    const token = generateToken({ uid: user.id, root: user.root! })
    c.header('Set-Cookie', await userCookie.serialize(token))
    return c.json({
      success: true
    })
  })

  app.post('/api/logout', async (c) => {
    const clearedCookie = await userCookie.serialize('', {
      maxAge: 0
    })
    c.header('Set-Cookie', clearedCookie)
    return c.json({
      success: true
    })
  })

  app.post('/stream/completions', async (c) => {
    return completions(c, db)
  })

  // 支持多级路径：使用 :path(*) 来匹配包含斜杠的路径
  // 例如：/files/2025-12/image.png -> req.params.path = '2025-12/image.png'
  app.get('/stream/files/:path{.+}', async (c) => {
    try {
      const requestedPath = c.req.param('path')
      const filesDir = join(process.cwd(), 'files')
      const fullPath = join(filesDir, requestedPath)
      const resolvedPath = resolve(fullPath)
      const resolvedFilesDir = resolve(filesDir)
      if (
        !resolvedPath.startsWith(resolvedFilesDir + '/') &&
        resolvedPath !== resolvedFilesDir
      ) {
        return c.json({ error: '禁止访问' }, 403)
      }

      if (!existsSync(fullPath)) {
        return c.json({ error: '文件不存在' }, 404)
      }

      const stat = statSync(fullPath)

      if (stat.isDirectory()) {
        return c.json({ error: '不支持读取目录' }, 400)
      }

      const mimeType = lookup(fullPath)
      c.header('Content-Type', mimeType || 'application/octet-stream')
      c.header('Content-Length', String(stat.size))
      c.header('Cache-Control', 'public, max-age=31536000')
      const fileStream = createReadStream(fullPath)
      const stream = Readable.toWeb(fileStream) as ReadableStream
      return new Response(stream, {
        headers: {
          'Content-Type': mimeType || 'application/octet-stream',
          'Content-Length': String(stat.size),
          'Cache-Control': 'public, max-age=31536000'
        }
      })
    } catch (error) {
      console.error('处理文件请求错误:', error)
      return c.json({ error: '服务器错误' }, 500)
    }
  })
  app.post('/stream/title', async (c) => {
    const InputSchema = z.object({
      chatId: z.string(),
      userPrompt: z.string(),
      aiResponse: z.string(),
      assistantId: z.number(),
      model: z.string()
    })
    const json: z.infer<typeof InputSchema> = await c.req.json()
    try {
      InputSchema.parse(json)
    } catch (e) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: (e as Error).message
      })
    }
    const [chat] = await db
      .select()
      .from(chats)
      .where(eq(chats.id, json.chatId))
    if (!chat) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Chat not found'
      })
    }
    let taskModel = await cacheManage.getTaskModel({
      assistantId: json.assistantId,
      model: json.model
    })

    if (!taskModel) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Assistant not found'
      })
    }
    const client = createClient({
      mode: taskModel.mode,
      api_key: taskModel.apiKey ? await aesDecrypt(taskModel.apiKey) : null,
      base_url: taskModel.baseUrl ?? null
    })!
    const messages = [
      {
        role: 'user',
        text: json.userPrompt
      },
      {
        role: 'assistant',
        text: json.aiResponse
      }
    ]
    const result = streamText({
      model: client(taskModel.taskModel!),
      prompt: `You are a conversational assistant and you need to summarize the user's conversation into a title of 10 words or less., The summary needs to maintain the original language.
The historical dialogue is as follows: \n${messages
        .map((m) => `${m.role}: ${m.text}`)
        .join('\n')}`,
      onFinish: async (data) => {
        if (data.finishReason === 'stop') {
          let text = data.content.find((c) => c.type === 'text')?.text
          if (text) {
            await db
              .update(chats)
              .set({ title: text })
              .where(eq(chats.id, json.chatId))
          }
          if (data.usage) {
            await recordRequest(db, {
              model: taskModel.taskModel!,
              assistantId: taskModel.id,
              usage: data.usage,
              body: data.request.body,
              task: 'title'
            })
          }
        }
      },
      onError: (error) => {
        let err = error.error as APICallError
        console.log('err request', JSON.stringify(err.requestBodyValues))
      }
    })
    return result.toUIMessageStreamResponse()
  })

  app.get('/oauth/login/:provider', async (c) => {
    const state = randomString(24)
    const provider = await db.query.authProviders.findFirst({
      where: { id: Number(c.req.param('provider')) }
    })
    if (!provider) {
      return c.json({ error: 'Provider not found' }, 404)
    }
    const origin = `${
      process.env.NODE_ENV === 'production' ? 'https' : 'http'
    }://${c.req.header('host')}`
    const oauthState: Record<string, any> = {
      state,
      provider: provider.id,
      createdAt: Date.now()
    }
    let codeChallenge: string | undefined, codeVerifier: string | undefined
    if (provider.usePkce) {
      codeVerifier = randomString(64)
      const digest = createHash('sha256').update(codeVerifier).digest()
      codeChallenge = digest.toString('base64url')
      oauthState.codeVerifier = codeVerifier
    }
    c.header('Set-Cookie', await oauthStateCookie.serialize(oauthState))
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: provider.clientId,
      redirect_uri: `${origin}/oauth/callback/${provider.id}`,
      scope: provider.scopes || 'read:user user:email',
      state
    })
    if (codeChallenge) {
      params.set('code_challenge', codeChallenge)
      params.set('code_challenge_method', 'S256')
    }
    const redirectUrl = `${provider.authUrl}?${params.toString()}`
    return c.redirect(redirectUrl)
  })

  app.get('/oauth/callback/:provider', async (c) => {
    try {
      const { code, state } = c.req.query()

      const provider = await db.query.authProviders.findFirst({
        where: { id: Number(c.req.param('provider')) }
      })

      if (!provider) {
        return c.json({ error: 'Provider not found' }, 404)
        return
      }

      const cookieHeader = c.req.header('cookie')
      const oauthState = cookieHeader
        ? await oauthStateCookie.parse(cookieHeader)
        : null

      if (!oauthState || oauthState.state !== state) {
        return c.json({ error: 'Invalid state parameter' }, 400)
      }

      // 验证 provider 是否匹配
      if (oauthState.provider !== provider.id) {
        return c.json({ error: 'Provider mismatch' }, 400)
      }

      if (Date.now() - oauthState.createdAt > 10 * 60 * 1000) {
        return c.json({ error: 'State expired' }, 400)
      }

      const origin = `${
        process.env.NODE_ENV === 'production' ? 'https' : 'http'
      }://${c.req.header('host')}`
      const tokenResp = await ky
        .post(provider.tokenUrl, {
          json: {
            client_id: provider.clientId,
            client_secret: provider.clientSecret
              ? await aesDecrypt(provider.clientSecret)
              : undefined,
            code,
            redirect_uri: `${origin}/oauth/callback/${provider.id}`,
            code_verifier: oauthState.codeVerifier || undefined
          }
        })
        .json<{ access_token: string }>()
      const access_token = tokenResp.access_token
      const userResp = await ky
        .get(provider.userinfoUrl!, {
          headers: {
            Authorization: `Bearer ${access_token}`
          }
        })
        .json<{ id: string; email?: string; phone?: string; name?: string }>()
      // log.info({ tokenResp, userResp }, 'auth callback')
      if (userResp?.id) {
        const [userData] = await db
          .select({
            id: users.id,
            deleted: users.deleted
          })
          .from(oauthAccounts)
          .innerJoin(users, eq(oauthAccounts.userId, users.id))
          .where(
            and(
              eq(oauthAccounts.providerId, provider.id),
              eq(oauthAccounts.providerUserId, userResp.id)
            )
          )
        if (userData) {
          if (userData.deleted) {
            return c.json(
              {
                error: 'Your account has been disabled.'
              },
              400
            )
          } else {
            const token = generateToken({ uid: userData.id, root: false })
            c.header('Set-Cookie', await userCookie.serialize(token))
          }
        } else {
          if (userResp.email || userResp.phone) {
            let user: { id: number } | undefined
            if (userResp.email) {
              user = await db.query.users.findFirst({
                columns: { id: true },
                where: { email: userResp.email }
              })
            }
            if (!user && userResp.phone) {
              user = await db.query.users.findFirst({
                columns: { id: true },
                where: { phone: userResp.phone }
              })
            }
            if (user) {
              await db.insert(oauthAccounts).values({
                providerId: provider.id,
                providerUserId: userResp.id,
                userId: user.id,
                profileJson: JSON.stringify(userResp) as any
              })
            } else {
              const user = await db.transaction(async (t) => {
                const [newUser] = await t
                  .insert(users)
                  .values({
                    email: userResp.email ?? null,
                    phone: userResp.phone ?? null,
                    name: userResp.name ?? null,
                    password: null
                  })
                  .returning()
                await t.insert(oauthAccounts).values({
                  providerId: provider.id,
                  providerUserId: userResp.id,
                  userId: newUser.id,
                  profileJson: JSON.stringify(userResp) as any
                })
                await t.insert(userRoles).values({
                  userId: newUser.id,
                  roleId: provider.roleId
                })
                return newUser
              })
              const token = generateToken({ uid: user.id!, root: false })
              c.header('Set-Cookie', await userCookie.serialize(token))
            }
          } else {
            const user = await db.transaction(async (t) => {
              const id = tid(13)
              const [newUser] = await t
                .insert(users)
                .values({
                  name: `访客:${id}`,
                  email: `${id}@teambot.com`,
                  password: null
                })
                .returning()
              await t.insert(oauthAccounts).values({
                providerId: provider.id,
                providerUserId: userResp.id,
                userId: newUser.id,
                profileJson: JSON.stringify(userResp) as any
              })
              await t.insert(userRoles).values({
                userId: newUser.id,
                roleId: provider.roleId
              })
              return newUser
            })
            const token = generateToken({ uid: user.id!, root: false })
            c.header('Set-Cookie', await userCookie.serialize(token))
          }
        }
        return c.html(`
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>登录成功</title>
  </head>
  <body>
    <script>
      if (window.opener) {
        window.opener.postMessage({ type: 'oauth-success' }, '*');
      }
      window.close();
      setTimeout(() => {
        document.body.innerHTML = '<div style="text-align: center; padding: 50px; font-family: sans-serif;"><h2>登录成功！</h2><p>您可以关闭此页面</p></div>';
      }, 100);
    </script>
  </body>
  </html>
`)
      } else {
        return c.json({
          error: 'Failed to get user info'
        })
      }
    } catch (e: any) {
      return c.json({
        error: e.message || 'Authorization failed'
      })
    }
  })

  app.post('/api/chat', async (c) => {
    const { messages } = await c.req.json()
    const client = createClient({
      mode: 'deepseek',
      api_key: 'sk-0857cc37c4d04f398924529404f084b4'
    })!
    const result = streamText({
      model: client('deepseek-chat'),
      system:
        'You are a weather assistant, you need to get the weather in a location',
      messages: await convertToModelMessages(messages),
      tools: {
        getWeather: tool({
          description: 'Get the weather in a location',
          inputSchema: z.object({
            city: z.string()
          }),
          needsApproval: true,
          execute: async ({ city }) => {
            await new Promise((resolve) => setTimeout(resolve, 1000))
            return `天气晴，26度`
          }
        })
      },
      onFinish: (data) => {
        console.log('response', JSON.stringify(data.steps))
      }
    })

    return result.toUIMessageStreamResponse()
  })
}
