import { PasswordManager } from 'server/lib/password'
import { accesses, accessRoles, roles, tools, users } from './drizzle/schema'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'

export const initDbData = async (db: NodePgDatabase) => {
  await db
    .insert(tools)
    .values([
      {
        id: 'fetch_url_content',
        name: '获取URL内容',
        description:
          '以Markdown格式提取并返回所提供URL的可读文本内容。仅当需要验证或检索模型内部知识可能未涵盖的网页内容时才调用此工具——请勿用于获取基本已知信息。',
        type: 'system'
      }
    ])
    .onConflictDoNothing()
  await db
    .insert(accesses)
    .values([
      {
        id: 'admin'
      },
      {
        id: 'manageAssistant',
        trpcAccess: [
          'manage.createAssistant',
          'manage.updateAssistant',
          'manage.deleteAssistant',
          'manage.getSystemTools'
        ]
      },
      {
        id: 'viewAssistantUsage',
        trpcAccess: ['manage.getUsageInfo']
      },
      {
        id: 'manageMemberAndRole',
        trpcAccess: [
          'manage.createMember',
          'manage.updateMember',
          'manage.deleteMember',
          'manage.createRole',
          'manage.updateRole',
          'manage.deleteRole',
          'manage.remoteRoleFromUser',
          'manage.addRoleToUser'
        ]
      },
      {
        id: 'manageSso',
        trpcAccess: [
          'manage.getAuthProviders',
          'manage.createAuthProvider',
          'manage.updateAuthProvider',
          'manage.deleteAuthProvider'
        ]
      },
      {
        id: 'manageTools',
        trpcAccess: [
          'manage.createTool',
          'manage.updateTool',
          'manage.deleteTool'
        ]
      },
      {
        id: 'manageWebSearch',
        trpcAccess: [
          'manage.connectSearch',
          'manage.getWebSearch',
          'manage.deleteWebSearch',
          'manage.createWebSearch',
          'manage.updateWebSearch'
        ]
      }
    ])
    .onConflictDoNothing()
  const rolesCount = await db.$count(roles)
  if (!rolesCount) {
    const res = await db
      .insert(roles)
      .values([
        {
          name: '管理员',
          assistants: [],
          allAssistants: true,
          remark: '可进入后台系统，管理所有功能'
        },
        {
          name: '成员',
          assistants: [],
          allAssistants: true,
          remark: '不可进入后台系统，仅使用助手对话功能'
        }
      ])
      .onConflictDoNothing()
      .returning({ id: roles.id })
    const accesssData = await db
      .select({
        id: accesses.id
      })
      .from(accesses)
    await db
      .insert(accessRoles)
      .values(
        accesssData.map((d) => {
          return {
            roleId: res[0].id,
            accessId: d.id
          }
        })
      )
      .onConflictDoNothing()
  }
  const userCount = await db.$count(users)
  if (!userCount) {
    await db.insert(users).values({
      email: 'teambot@teambot.com',
      password: await PasswordManager.hashPassword('123456'),
      name: 'TeamBot',
      root: true
    })
  }
  await db.execute('CREATE EXTENSION IF NOT EXISTS vector')
  await db.execute('CREATE EXTENSION IF NOT EXISTS pg_jieba')
}
