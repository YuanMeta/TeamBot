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
  'manage.searchMembers',
  'manage.getWebSearches',
  'manage.getWebSearch',
  'manage.getTaskModel'
]

export const privateAccess = [
  {
    id: 'admin'
  },
  {
    id: 'manageAssistant',
    trpcAccess: [
      'manage.createAssistant',
      'manage.updateAssistant',
      'manage.deleteAssistant',
      'manage.getSystemTools',
      'manage.addTaskModel'
    ]
  },
  {
    id: 'viewAssistantUsage',
    trpcAccess: ['manage.getUsageInfo', 'manage.getAssistantUsageInfo']
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
    trpcAccess: ['manage.createTool', 'manage.updateTool', 'manage.deleteTool']
  },
  {
    id: 'manageWebSearch',
    trpcAccess: [
      'manage.connectSearch',
      'manage.deleteWebSearch',
      'manage.createWebSearch',
      'manage.updateWebSearch'
    ]
  }
]
