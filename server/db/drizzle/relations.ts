import { defineRelations } from 'drizzle-orm'
import * as schema from './schema'

export const relations = defineRelations(schema, (r) => ({
  accesses: {
    roles: r.many.roles({
      from: r.accesses.id.through(r.accessRoles.accessId),
      to: r.roles.id.through(r.accessRoles.roleId)
    })
  },
  roles: {
    accesses: r.many.accesses(),
    users: r.many.users({
      from: r.roles.id.through(r.userRoles.roleId),
      to: r.users.id.through(r.userRoles.userId)
    })
  },
  assistants: {
    tools: r.many.tools({
      from: r.assistants.id.through(r.assistantTools.assistantId),
      to: r.tools.id.through(r.assistantTools.toolId)
    }),
    assistantUsages: r.many.assistantUsages(),
    users: r.many.users({
      from: r.assistants.id.through(r.chats.assistantId),
      to: r.users.id.through(r.chats.userId)
    }),
    messages: r.many.messages(),
    webSearch: r.one.webSearches({
      from: r.assistants.webSearchId,
      to: r.webSearches.id
    })
  },
  tools: {
    assistants: r.many.assistants()
  },
  assistantUsages: {
    assistant: r.one.assistants({
      from: r.assistantUsages.assistantId,
      to: r.assistants.id
    })
  },
  users: {
    assistants: r.many.assistants(),
    messages: r.many.messages(),
    authProviders: r.many.authProviders(),
    roles: r.many.roles()
  },
  messages: {
    assistant: r.one.assistants({
      from: r.messages.assistantId,
      to: r.assistants.id
    }),
    chat: r.one.chats({
      from: r.messages.chatId,
      to: r.chats.id
    }),
    user: r.one.users({
      from: r.messages.userId,
      to: r.users.id
    })
  },
  chats: {
    messages: r.many.messages()
  },
  authProviders: {
    users: r.many.users({
      from: r.authProviders.id.through(r.oauthAccounts.providerId),
      to: r.users.id.through(r.oauthAccounts.userId)
    })
  }
}))
