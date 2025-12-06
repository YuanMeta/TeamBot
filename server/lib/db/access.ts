import type { Knex } from 'knex'

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
export const insertAccesses = async (db: Knex) => {
  await db('accesses').insert([
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
      ]) as unknown as string[]
    },
    {
      id: 'viewAssistantUsage',
      trpc_access: JSON.stringify([
        'manage.getUsageInfo'
      ]) as unknown as string[]
    },
    {
      id: 'manageMember',
      trpc_access: JSON.stringify([
        'manage.createMember',
        'manage.updateMember',
        'manage.deleteMember'
      ]) as unknown as string[]
    },
    {
      id: 'manageRole',
      trpc_access: JSON.stringify([
        'manage.createRole',
        'manage.updateRole',
        'manage.deleteRole',
        'manage.remoteRoleFromUser',
        'manage.addRoleToUser'
      ]) as unknown as string[]
    },
    {
      id: 'manageSso',
      trpc_access: JSON.stringify([
        'manage.getAuthProviders',
        'manage.createAuthProvider',
        'manage.updateAuthProvider',
        'manage.deleteAuthProvider'
      ]) as unknown as string[]
    },
    {
      id: 'manageTools',
      trpc_access: JSON.stringify([
        'manage.createTool',
        'manage.updateTool',
        'manage.deleteTool'
      ]) as unknown as string[]
    }
  ])
}

export const insertRoles = async (db: Knex) => {
  const res = await db('roles')
    .insert([
      {
        name: '管理员',
        assistants: JSON.stringify([0]) as unknown as number[],
        remark: '可进入后台系统，管理所有功能'
      },
      {
        name: '成员',
        assistants: JSON.stringify([0]) as unknown as number[],
        remark: '不可进入后台系统，仅使用助手对话功能'
      }
    ])
    .returning('id')
  const accesses = await db('accesses').select('id')
  await db('access_roles').insert(
    accesses.map((access) => ({
      role_id: res[0].id,
      access_id: access.id
    }))
  )
}
