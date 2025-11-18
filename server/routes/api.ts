import type { Express } from 'express'
import type { Knex } from 'knex'
import z from 'zod'
import { generateToken, PasswordManager } from '../lib/password'
import { userCookie, oauthStateCookie } from '../session'
import { completions } from './completions'
import { TRPCError } from '@trpc/server'
import { createClient } from 'server/lib/checkConnect'
import { APICallError, streamText } from 'ai'
import { randomString, tid } from 'server/lib/utils'
import ky from 'ky'
import { createHash } from 'crypto'
import type { TableUser } from 'types/table'
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

export const registerRoutes = (app: Express, db: Knex) => {
  app.post('/api/login', async (req, res) => {
    const input: { nameOrEmail: string; password: string } = req.body
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
      throw new Response(`账户已被锁定，请在 ${remainingMinutes} 分钟后重试`, {
        status: 429
      })
    }

    if (attempts.lockedUntil > 0 && attempts.lockedUntil <= Date.now()) {
      loginAttempts.delete(attemptKey)
    }
    const user = await db('users')
      .where({ name: input.nameOrEmail })
      .orWhere({ email: input.nameOrEmail })
      .first()
    if (!user) {
      recordFailedAttempt(attemptKey)
      throw new Response(`用户名或密码错误`, {
        status: 429
      })
    }

    if (user.deleted) {
      throw new Response('该账户已被禁用', { status: 401 })
    }

    if (!user.password) {
      throw new Response('该账户未设置密码，请联系管理员', { status: 401 })
    }

    const isPasswordValid = await PasswordManager.verifyPassword(
      input.password,
      user.password
    )

    if (!isPasswordValid) {
      recordFailedAttempt(attemptKey)
      throw new Response('用户名或密码错误', { status: 401 })
    }

    // 登录成功，清除失败记录
    loginAttempts.delete(attemptKey)
    const token = generateToken({ uid: user.id })
    res.setHeader('Set-Cookie', await userCookie.serialize(token))
    res.json({
      success: true
    })
  })

  app.post('/api/logout', async (req, res) => {
    const clearedCookie = await userCookie.serialize('', {
      maxAge: 0
    })
    res.setHeader('Set-Cookie', clearedCookie)
    res.json({
      success: true
    })
  })

  app.post('/api/completions', async (req, res) => {
    await completions(req, res, db)
  })

  app.post('/api/title', async (req, res) => {
    const InputSchema = z.object({
      chatId: z.string(),
      userPrompt: z.string(),
      aiResponse: z.string(),
      assistantId: z.string(),
      model: z.string()
    })
    const json: z.infer<typeof InputSchema> = req.body
    try {
      InputSchema.parse(json)
    } catch (e) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: (e as Error).message
      })
    }
    const chat = await db('chats').where('id', json.chatId).first()
    if (!chat) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Chat not found'
      })
    }
    const assistant = await db('assistants')
      .where('id', json.assistantId)
      .first()
    const client = createClient({
      mode: assistant!.mode,
      api_key: assistant!.api_key,
      base_url: assistant!.base_url
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
      model: client(json.model!),
      prompt: `You are a conversational assistant and you need to summarize the user's conversation into a title of 10 words or less., The summary needs to maintain the original language.
The historical dialogue is as follows: \n${messages.map((m) => `${m.role}: ${m.text}`).join('\n')}`,
      onFinish: async (data) => {
        if (data.finishReason === 'stop') {
          let text = data.content.find((c) => c.type === 'text')?.text
          if (text) {
            await db('chats').where({ id: json.chatId }).update({ title: text })
          }
        }
      },
      onError: (error) => {
        let err = error.error as APICallError
        console.log('err request', JSON.stringify(err.requestBodyValues))
      }
    })
    result.pipeUIMessageStreamToResponse(res)
  })

  app.get('/oauth/login/:provider', async (req, res) => {
    const state = randomString(24)
    const provider = await db('auth_providers')
      .where('id', req.params.provider)
      .first()
    if (!provider) {
      res.status(404).json({ error: 'Provider not found' })
      return
    }
    const origin = `${req.protocol}://${req.get('host')}`
    const oauthState: Record<string, any> = {
      state,
      provider: provider.id,
      createdAt: Date.now()
    }
    let codeChallenge: string | undefined, codeVerifier: string | undefined
    if (provider.use_pkce) {
      codeVerifier = randomString(64)
      const digest = createHash('sha256').update(codeVerifier).digest()
      codeChallenge = digest.toString('base64url')
      oauthState.codeVerifier = codeVerifier
    }
    res.setHeader('Set-Cookie', await oauthStateCookie.serialize(oauthState))
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: provider.client_id,
      redirect_uri: `${origin}/oauth/callback/${provider.id}`,
      scope: provider.scopes || '',
      state
    })
    if (codeChallenge) {
      params.set('code_challenge', codeChallenge)
      params.set('code_challenge_method', 'S256')
    }
    const redirectUrl = `${provider.auth_url}?${params.toString()}`
    res.redirect(redirectUrl)
  })

  app.get('/oauth/callback/:provider', async (req, res) => {
    try {
      const { code, state } = req.query
      const provider = await db('auth_providers')
        .where('id', req.params.provider)
        .first()
      if (!provider) {
        res.status(404).json({ error: 'Provider not found' })
        return
      }

      const cookieHeader = req.headers.cookie
      const oauthState = cookieHeader
        ? await oauthStateCookie.parse(cookieHeader)
        : null

      if (!oauthState || oauthState.state !== state) {
        res.status(400).json({ error: 'Invalid state parameter' })
        return
      }

      // 验证 provider 是否匹配
      if (oauthState.provider !== provider.id) {
        res.status(400).json({ error: 'Provider mismatch' })
        return
      }

      if (Date.now() - oauthState.createdAt > 10 * 60 * 1000) {
        res.status(400).json({ error: 'State expired' })
        return
      }

      const origin = `${req.protocol}://${req.get('host')}`
      const tokenResp = await ky
        .post(provider.token_url, {
          json: {
            client_id: provider.client_id,
            client_secret: provider.client_secret,
            code,
            redirect_uri: `${origin}/oauth/callback/${provider.id}`,
            code_verifier: oauthState.codeVerifier || undefined
          }
        })
        .json<{ access_token: string }>()
      const access_token = tokenResp.access_token
      const userResp = await ky
        .get(provider.userinfo_url, {
          headers: {
            Authorization: `Bearer ${access_token}`
          }
        })
        .json<{ id: string; email?: string; phone?: string; name?: string }>()
      if (userResp?.id) {
        const user = await db('oauth_accounts')
          .where({
            provider_id: provider.id,
            provider_user_id: userResp.id
          })
          .first()
        if (user) {
          const token = generateToken({ uid: user.user_id })
          res.setHeader('Set-Cookie', await userCookie.serialize(token))
        } else {
          if (userResp.email || userResp.phone) {
            const handle = db('users')
            let user: TableUser | undefined
            if (userResp.email) {
              user = await handle.where({ email: userResp.email }).first()
            }
            if (userResp.phone) {
              user = await handle.where({ phone: userResp.phone }).first()
            }
            if (user) {
              await db('oauth_accounts').insert({
                id: tid(),
                provider_id: provider.id,
                provider_user_id: userResp.id,
                user_id: user.id,
                profile_json: JSON.stringify(userResp) as any
              })
            } else {
              const user = await db.transaction(async (trx) => {
                const user = await trx('users')
                  .insert({
                    id: tid(),
                    email: userResp.email,
                    phone: userResp.phone,
                    name: userResp.name,
                    password: null,
                    role: 'member'
                  })
                  .returning('*')
                await trx('oauth_accounts').insert({
                  id: tid(),
                  provider_id: provider.id,
                  provider_user_id: userResp.id,
                  user_id: user[0].id!,
                  profile_json: JSON.stringify(userResp) as any
                })
                return user
              })
              const token = generateToken({ uid: user[0].id! })
              res.setHeader('Set-Cookie', await userCookie.serialize(token))
            }
          } else {
            res
              .json({
                error: 'Missing email or phone'
              })
              .status(400)
          }
        }
        res.send(`
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
        res.json({
          error: 'Failed to get user info'
        })
      }
      res.json({ userResp })
    } catch (e: any) {
      res.json({
        error: e.message || 'Authorization failed'
      })
    }
  })
}
