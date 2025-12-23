import z from 'zod'
import { adminProcedure } from '../core'
import {
  accesses,
  accessRoles,
  roleAssistants,
  authProviders,
  oauthAccounts,
  roles,
  userRoles,
  users
} from 'drizzle/schema'
import { and, count, desc, eq, like, or, sql } from 'drizzle-orm'
import { TRPCError, type TRPCRouterRecord } from '@trpc/server'
import { PasswordManager } from '~/.server/lib/password'
import { cacheManage } from '~/.server/lib/cache'
import { aesDecrypt, aesEncrypt } from '~/.server/lib/utils'

export const memberRouter = {
  getRoleMembers: adminProcedure
    .input(
      z.object({
        roleId: z.number(),
        page: z.number(),
        pageSize: z.number()
      })
    )
    .query(async ({ input, ctx }) => {
      const list = await ctx.db.query.roles.findFirst({
        columns: {},
        where: {
          id: input.roleId
        },
        with: {
          users: {
            columns: { id: true, email: true, name: true },
            orderBy: {
              id: 'desc'
            },
            offset: (input.page - 1) * input.pageSize,
            limit: input.pageSize
          }
        }
      })
      const [totalResult] = await ctx.db
        .select({ total: count(userRoles.userId) })
        .from(userRoles)
        .where(eq(userRoles.roleId, input.roleId))
      return {
        list: list?.users || [],
        total: totalResult?.total || 0
      }
    }),
  removeRoleFromUser: adminProcedure
    .input(
      z.object({
        roleId: z.number(),
        userId: z.number()
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.db
        .delete(userRoles)
        .where(
          and(
            eq(userRoles.userId, input.userId),
            eq(userRoles.roleId, input.roleId)
          )
        )
      return { success: true }
    }),
  searchMembers: adminProcedure
    .input(
      z.object({
        keyword: z.string().optional()
      })
    )
    .query(async ({ input, ctx }) => {
      return ctx.db.query.users.findMany({
        columns: { id: true, name: true, email: true },
        where: {
          OR: [
            { name: { like: `%${input.keyword}%` } },
            { email: { like: `%${input.keyword}%` } }
          ]
        },
        orderBy: {
          id: 'desc'
        }
      })
    }),
  addRoleToUser: adminProcedure
    .input(
      z.object({
        roleId: z.number(),
        userId: z.number()
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [record] = await ctx.db
        .select()
        .from(userRoles)
        .where(
          and(
            eq(userRoles.userId, input.userId),
            eq(userRoles.roleId, input.roleId)
          )
        )
      if (record) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '用户已拥有该角色'
        })
      }
      await ctx.db
        .insert(userRoles)
        .values({ userId: input.userId, roleId: input.roleId })
      return { success: true }
    }),
  getRoles: adminProcedure
    .input(
      z.object({
        page: z.number(),
        pageSize: z.number()
      })
    )
    .query(async ({ ctx, input }) => {
      const list = await ctx.db
        .select({
          id: roles.id,
          name: roles.name,
          remark: roles.remark
        })
        .from(roles)
        .offset((input.page - 1) * input.pageSize)
        .limit(input.pageSize)
        .orderBy(desc(roles.id))
      const [totalResult] = await ctx.db
        .select({ total: count(roles.id) })
        .from(roles)
      return {
        list,
        total: +(totalResult?.total || 0)
      }
    }),
  getRole: adminProcedure.input(z.number()).query(async ({ input, ctx }) => {
    const role = await ctx.db.query.roles.findFirst({
      where: { id: input },
      with: {
        accesses: {
          columns: { id: true }
        },
        assistants: {
          columns: { id: true }
        }
      }
    })
    return role
  }),
  deleteRole: adminProcedure
    .input(z.number())
    .mutation(async ({ input, ctx }) => {
      const user = await ctx.db.query.users.findFirst({
        columns: { id: true },
        where: {
          roles: {
            id: input
          }
        }
      })
      if (user) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '角色已被用户使用，无法删除'
        })
      }
      const authProvider = await ctx.db.query.authProviders.findFirst({
        columns: { id: true },
        where: { roleId: input }
      })
      if (authProvider) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '角色已被SSO提供者使用，无法删除'
        })
      }
      await ctx.db.transaction(async (trx) => {
        await trx.delete(accessRoles).where(eq(accessRoles.roleId, input))
        await trx.delete(roles).where(eq(roles.id, input))
      })
      return { success: true }
    }),
  createRole: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        remark: z.string().optional(),
        access: z.array(z.string()),
        assistants: z.array(z.number()),
        allAssistants: z.boolean()
      })
    )
    .mutation(async ({ input, ctx }) => {
      return ctx.db.transaction(async (trx) => {
        const [role] = await trx
          .insert(roles)
          .values({
            name: input.name,
            remark: input.remark,
            allAssistants: input.allAssistants
          })
          .returning({ id: roles.id })
        if (input.access.length) {
          await trx.insert(accessRoles).values(
            input.access.map((access) => ({
              roleId: role.id,
              accessId: access
            }))
          )
        }
        if (input.assistants.length) {
          await trx.insert(roleAssistants).values(
            input.assistants.map((assistant) => ({
              roleId: role.id,
              assistantId: assistant
            }))
          )
        }
        return role
      })
    }),
  updateRole: adminProcedure
    .input(
      z.object({
        id: z.number(),
        data: z.object({
          name: z.string().min(1).optional(),
          remark: z.string().optional(),
          access: z.array(z.string()),
          assistants: z.array(z.number()),
          allAssistants: z.boolean()
        })
      })
    )
    .mutation(async ({ input, ctx }) => {
      return ctx.db.transaction(async (trx) => {
        await trx
          .update(roles)
          .set({
            name: input.data.name,
            remark: input.data.remark,
            allAssistants: input.data.allAssistants
          })
          .where(eq(roles.id, input.id))
        await trx.delete(accessRoles).where(eq(accessRoles.roleId, input.id))
        if (input.data.access.length) {
          await trx.insert(accessRoles).values(
            input.data.access.map((access) => ({
              roleId: input.id,
              accessId: access
            }))
          )
        }
        await trx
          .delete(roleAssistants)
          .where(eq(roleAssistants.roleId, input.id))
        if (input.data.assistants.length) {
          await trx.insert(roleAssistants).values(
            input.data.assistants.map((assistant) => ({
              roleId: input.id,
              assistantId: assistant
            }))
          )
        }
        return input.id
      })
    }),
  getAccesses: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.select({ id: accesses.id }).from(accesses)
  }),
  getAuthProviders: adminProcedure
    .input(
      z.object({
        page: z.number(),
        pageSize: z.number()
      })
    )
    .query(async ({ ctx, input }) => {
      const list = await ctx.db.query.authProviders.findMany({
        columns: {
          id: true,
          name: true,
          scopes: true,
          createdAt: true,
          usePkce: true,
          updatedAt: true,
          description: true,
          disabled: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        offset: (input.page - 1) * input.pageSize,
        limit: input.pageSize
      })
      const total = await ctx.db.$count(authProviders)
      return {
        list,
        total
      }
    }),
  createAuthProvider: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        issuer: z.string().optional(),
        auth_url: z.string().min(1),
        token_url: z.string().min(1),
        userinfo_url: z.string().optional(),
        jwks_uri: z.string().optional(),
        client_id: z.string().min(1),
        client_secret: z.string().optional(),
        scopes: z.string().optional(),
        use_pkce: z.boolean().optional(),
        description: z.string().optional(),
        roleId: z.number()
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.db.insert(authProviders).values({
        name: input.name,
        issuer: input.issuer,
        authUrl: input.auth_url,
        tokenUrl: input.token_url,
        userinfoUrl: input.userinfo_url,
        jwksUri: input.jwks_uri,
        clientId: input.client_id,
        clientSecret: input.client_secret
          ? await aesEncrypt(input.client_secret)
          : undefined,
        scopes: input.scopes,
        usePkce: input.use_pkce,
        description: input.description,
        roleId: input.roleId
      })
      return { success: true }
    }),
  toggleDisableAuthProvider: adminProcedure
    .input(z.number())
    .mutation(({ input, ctx }) => {
      return ctx.db
        .update(authProviders)
        .set({ disabled: sql<boolean>`NOT ${authProviders.disabled}` })
        .where(eq(authProviders.id, input))
    }),
  updateAuthProvider: adminProcedure
    .input(
      z.object({
        id: z.number(),
        data: z.object({
          name: z.string().min(1).optional(),
          issuer: z.string().optional(),
          auth_url: z.string().min(1),
          token_url: z.string().min(1),
          userinfo_url: z.string().optional(),
          jwks_uri: z.string().optional(),
          client_id: z.string().min(1),
          client_secret: z.string().optional(),
          scopes: z.string().optional(),
          use_pkce: z.boolean().optional(),
          description: z.string().optional(),
          roleId: z.number()
        })
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.db
        .update(authProviders)
        .set({
          name: input.data.name,
          issuer: input.data.issuer,
          authUrl: input.data.auth_url,
          tokenUrl: input.data.token_url,
          userinfoUrl: input.data.userinfo_url,
          jwksUri: input.data.jwks_uri,
          clientId: input.data.client_id,
          clientSecret: input.data.client_secret
            ? await aesEncrypt(input.data.client_secret)
            : undefined,
          scopes: input.data.scopes,
          usePkce: input.data.use_pkce,
          description: input.data.description,
          roleId: input.data.roleId
        })
        .where(eq(authProviders.id, input.id))
      return { success: true }
    }),
  deleteAuthProvider: adminProcedure
    .input(
      z.object({
        providerId: z.number()
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.db.transaction(async (trx) => {
        await trx
          .delete(oauthAccounts)
          .where(eq(oauthAccounts.providerId, input.providerId))
        await trx
          .delete(authProviders)
          .where(eq(authProviders.id, input.providerId))
      })
      return { success: true }
    }),
  getAuthProvider: adminProcedure
    .input(z.number())
    .query(async ({ input, ctx }) => {
      const data = await ctx.db.query.authProviders.findFirst({
        where: { id: input }
      })
      return {
        ...data,
        clientSecret: data?.clientSecret
          ? await aesDecrypt(data.clientSecret)
          : undefined
      }
    }),
  deleteMember: adminProcedure
    .input(
      z.object({
        memberId: z.number()
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.userId === input.memberId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '不可删除自己的账号'
        })
      }
      await ctx.db
        .update(users)
        .set({ deleted: true })
        .where(eq(users.id, input.memberId))
      await cacheManage.deleteUser(input.memberId)
      return { success: true }
    }),
  getMember: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const member = await ctx.db.query.users.findFirst({
        columns: {
          id: true,
          email: true,
          avatar: true,
          name: true,
          root: true,
          createdAt: true,
          deleted: true
        },
        with: {
          roles: {
            columns: {
              id: true
            }
          }
        },
        where: {
          id: input.id
        }
      })
      return member
    }),
  getMembers: adminProcedure
    .input(
      z.object({
        page: z.number(),
        pageSize: z.number(),
        keyword: z.string().optional(),
        deleted: z.boolean().default(false)
      })
    )
    .query(async ({ input, ctx }) => {
      const where = input.keyword
        ? {
            AND: [
              { deleted: input.deleted },
              {
                OR: [
                  { name: { like: `%${input.keyword}%` } },
                  { email: { like: `%${input.keyword}%` } }
                ]
              }
            ]
          }
        : { deleted: input.deleted }
      const members = await ctx.db.query.users.findMany({
        columns: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          root: true,
          createdAt: true,
          deleted: true
        },
        orderBy: {
          id: 'desc'
        },
        offset: (input.page - 1) * input.pageSize,
        limit: input.pageSize,
        with: {
          roles: {
            columns: {
              id: true,
              name: true
            }
          }
        },
        where
      })

      const total = await ctx.db.$count(
        users,
        input.keyword
          ? and(
              eq(users.deleted, input.deleted),
              or(
                like(users.name, `%${input.keyword}%`),
                like(users.email, `%${input.keyword}%`)
              )
            )
          : eq(users.deleted, input.deleted)
      )

      return { members, total }
    }),
  createMember: adminProcedure
    .input(
      z.object({
        email: z.email().optional(),
        password: z.string().min(6).max(30),
        name: z.string().min(1),
        roles: z.number().array()
      })
    )
    .mutation(async ({ input, ctx }) => {
      return ctx.db.transaction(async (trx) => {
        const [user] = await trx
          .insert(users)
          .values({
            email: input.email,
            password: await PasswordManager.hashPassword(input.password),
            name: input.name
          })
          .returning({ id: users.id })
        if (input.roles.length) {
          await trx.insert(userRoles).values(
            input.roles.map((role) => ({
              userId: user.id,
              roleId: role
            }))
          )
        }
        return user.id
      })
    }),
  restoreMember: adminProcedure
    .input(z.number())
    .mutation(async ({ input, ctx }) => {
      await ctx.db
        .update(users)
        .set({ deleted: false })
        .where(eq(users.id, input))
      return { success: true }
    }),
  updateMember: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        email: z.email().optional(),
        password: z.string().min(8).max(50).optional(),
        name: z.string().min(1).optional(),
        roles: z.number().array()
      })
    )
    .mutation(async ({ input, ctx }) => {
      return ctx.db.transaction(async (trx) => {
        await trx
          .update(users)
          .set({
            email: input.email,
            password: input.password
              ? await PasswordManager.hashPassword(input.password)
              : undefined,
            name: input.name
          })
          .where(eq(users.id, input.userId))
        await trx.delete(userRoles).where(eq(userRoles.userId, input.userId))
        if (input.roles.length) {
          await trx.insert(userRoles).values(
            input.roles.map((role) => ({
              userId: input.userId,
              roleId: role
            }))
          )
        }
        return input.userId
      })
    })
} satisfies TRPCRouterRecord
