import type { Knex } from 'knex'

export const insertAccesses = async (db: Knex) => {
  await db('accesses').insert([
    {
      name: 'admin'
    },
    {
      name: 'viewAssistant',
      trpc_access: JSON.stringify([
        'manage.getAssistant',
        'manage.getAssistants'
      ]) as unknown as string[]
    },
    {
      name: 'manageAssistant',
      trpc_access: JSON.stringify([
        'manage.createAssistant',
        'manage.updateAssistant',
        'manage.deleteAssistant'
      ]) as unknown as string[]
    },
    {
      name: 'viewAssistantUsage',
      trpc_access: JSON.stringify([
        'manage.getUsageInfo'
      ]) as unknown as string[]
    },
    {
      name: 'viewMember',
      trpc_access: JSON.stringify([
        'manage.getMembers',
        'manage.getMember'
      ]) as unknown as string[]
    },
    {
      name: 'manageMember',
      trpc_access: JSON.stringify([
        'manage.createMember',
        'manage.updateMember',
        'manage.deleteMember'
      ]) as unknown as string[]
    },
    {
      name: 'manageSso',
      trpc_access: JSON.stringify([
        'manage.getAuthProviders',
        'manage.createAuthProvider',
        'manage.updateAuthProvider',
        'manage.deleteAuthProvider'
      ]) as unknown as string[]
    },
    {
      name: 'viewTools',
      trpc_access: JSON.stringify([
        'manage.getTools',
        'manage.getTool'
      ]) as unknown as string[]
    },
    {
      name: 'manageTools',
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
