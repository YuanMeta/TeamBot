import type { KDB } from './instance'

export const publicAccess = [
  'manage.getAssistant',
  'manage.getAssistants',
  'manage.getMembers',
  'manage.getMember',
  'manage.getTools',
  'manage.getTool',
  'manage.getRoles',
  'manage.getRole',
  'manage.getAccesses',
  'manage.getAssistantOptions',
  'manage.getRoleMembers',
  'manage.searchMembers'
]
export const insertAccesses = async (db: KDB) => {
  await db
    .insertInto('accesses')
    .values([
      {
        id: 'admin'
      },
      {
        id: 'manageAssistant',
        trpc_access: JSON.stringify([
          'manage.createAssistant',
          'manage.updateAssistant',
          'manage.deleteAssistant',
          'manage.getSystemTools'
        ])
      },
      {
        id: 'viewAssistantUsage',
        trpc_access: JSON.stringify(['manage.getUsageInfo'])
      },
      {
        id: 'manageMember',
        trpc_access: JSON.stringify([
          'manage.createMember',
          'manage.updateMember',
          'manage.deleteMember'
        ])
      },
      {
        id: 'manageRole',
        trpc_access: JSON.stringify([
          'manage.createRole',
          'manage.updateRole',
          'manage.deleteRole',
          'manage.remoteRoleFromUser',
          'manage.addRoleToUser'
        ])
      },
      {
        id: 'manageSso',
        trpc_access: JSON.stringify([
          'manage.getAuthProviders',
          'manage.createAuthProvider',
          'manage.updateAuthProvider',
          'manage.deleteAuthProvider'
        ])
      },
      {
        id: 'manageTools',
        trpc_access: JSON.stringify([
          'manage.createTool',
          'manage.updateTool',
          'manage.deleteTool'
        ])
      }
    ])
    .execute()
}

export const insertRoles = async (db: KDB) => {
  const res = await db
    .insertInto('roles')
    .values([
      {
        name: '管理员',
        assistants: JSON.stringify([0]),
        remark: '可进入后台系统，管理所有功能'
      },
      {
        name: '成员',
        assistants: JSON.stringify([0]),
        remark: '不可进入后台系统，仅使用助手对话功能'
      }
    ])
    .returning('id')
    .execute()
  const accesses = await db.selectFrom('accesses').select('id').execute()
  await db
    .insertInto('access_roles')
    .values(
      accesses.map((access) => ({
        role_id: res[0].id,
        access_id: access.id
      }))
    )
    .execute()
}
