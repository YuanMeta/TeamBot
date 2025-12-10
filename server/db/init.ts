import { PasswordManager } from 'server/lib/password'
import { accesses, accessRoles, roles, users } from './drizzle/schema'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'

export const initDbData = async (db: NodePgDatabase) => {
  const accessCount = await db.$count(accesses)
  if (!accessCount) {
    await db.insert(accesses).values([
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
      }
    ])
  }
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
      .returning({ id: roles.id })
    const accesssData = await db
      .select({
        id: accesses.id
      })
      .from(accesses)
    await db.insert(accessRoles).values(
      accesssData.map((d) => {
        return {
          roleId: res[0].id,
          accessId: d.id
        }
      })
    )
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
