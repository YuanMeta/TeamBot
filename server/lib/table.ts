import type { Knex } from 'knex'
import { tid } from './utils'
import { PasswordManager } from './password'
import type {
  TableAssistant,
  TableChat,
  TableIdp,
  TableMessage,
  TableMessageFile,
  TableRelationIdp,
  TableUser
} from 'types/table'

declare module 'knex/types/tables' {
  interface Tables {
    users: TableUser
    idps: TableIdp
    relation_idps: TableRelationIdp
    assistants: TableAssistant
    chats: TableChat
    messages: TableMessage
    message_files: TableMessageFile
  }
}

// 辅助类型：带关联 files 的 Message
export type MessageWithFiles = TableMessage & {
  files: Array<{
    id: string
    name: string
    path: string
    size: number
  }>
}

export const tableSchema = async (db: Knex) => {
  if (!(await db.schema.hasTable('users'))) {
    await db.schema.createTable('users', (table) => {
      table.string('id').primary()
      table.string('email').unique()
      table.string('avatar').nullable()
      table.string('name').nullable()
      table.string('password').nullable()
      table.string('role').notNullable()
      table.boolean('deleted').defaultTo(false)
      table.timestamp('created_at').defaultTo(db.fn.now())
      table.timestamp('updated_at').defaultTo(db.fn.now())
    })
  }
  if (!(await db.schema.hasTable('idps'))) {
    await db.schema.createTable('idps', (table) => {
      table.string('id').primary()
      table.string('name').notNullable()
      table.json('params').notNullable()
      table.timestamp('created_at').defaultTo(db.fn.now())
      table.timestamp('updated_at').defaultTo(db.fn.now())
    })
  }
  if (!(await db.schema.hasTable('relation_idps'))) {
    await db.schema.createTable('relation_idps', (table) => {
      table.string('id').primary()
      table.string('user_id').notNullable()
      table.string('idp_id').notNullable()
      table.timestamp('created_at').defaultTo(db.fn.now())
      table.timestamp('updated_at').defaultTo(db.fn.now())
      table.foreign('user_id').references('id').inTable('users')
      table.foreign('idp_id').references('id').inTable('idps')
      table.unique(['user_id', 'idp_id'])
    })
  }
  if (!(await db.schema.hasTable('assistants'))) {
    await db.schema.createTable('assistants', (table) => {
      table.string('id').primary()
      table.string('name').notNullable()
      table.string('mode').notNullable()
      table.string('api_key').nullable()
      table.string('base_url').nullable()
      table.string('prompt').nullable()
      table.json('models').notNullable()
      table.json('options').nullable()
      table.json('web_search').notNullable()
      table.timestamp('created_at').defaultTo(db.fn.now())
      table.timestamp('updated_at').defaultTo(db.fn.now())
    })
  }
  if (!(await db.schema.hasTable('chats'))) {
    await db.schema.createTable('chats', (table) => {
      table.string('id').primary()
      table.string('title').notNullable()
      table.string('user_id').notNullable()
      table.string('assistant_id').nullable()
      table.boolean('public').defaultTo(false)
      table.string('model').nullable()
      table.boolean('deleted').defaultTo(false)
      table.string('summary').nullable()
      table.integer('message_offset').notNullable().defaultTo(0)
      table.timestamp('created_at').defaultTo(db.fn.now())
      table.timestamp('updated_at').defaultTo(db.fn.now())
      table.timestamp('last_chat_time').defaultTo(db.fn.now())
      table.foreign('user_id').references('id').inTable('users')
      table.foreign('assistant_id').references('id').inTable('assistants')
      table.index('user_id')
      table.index('assistant_id')
    })
  }
  if (!(await db.schema.hasTable('messages'))) {
    await db.schema.createTable('messages', (table) => {
      table.string('id').primary()
      table.string('role').notNullable()
      table.string('user_id').notNullable()
      table.string('chat_id').notNullable()
      table.json('context').nullable()
      table.string('error').nullable()
      table.string('model').nullable()
      table.integer('reasoning_duration').nullable()
      table.json('parts').nullable()
      table.integer('input_tokens').notNullable().defaultTo(0)
      table.integer('output_tokens').notNullable().defaultTo(0)
      table.integer('total_tokens').notNullable().defaultTo(0)
      table.integer('reasoning_tokens').notNullable().defaultTo(0)
      table.integer('cached_input_tokens').notNullable().defaultTo(0)
      table.json('steps').nullable()
      table.boolean('terminated').defaultTo(false)
      table.timestamp('created_at').defaultTo(db.fn.now())
      table.timestamp('updated_at').defaultTo(db.fn.now())
      table.foreign('user_id').references('id').inTable('users')
      table.foreign('chat_id').references('id').inTable('chats')
      table.index(['user_id', 'chat_id'])
    })
  }
  if (!(await db.schema.hasTable('message_files'))) {
    await db.schema.createTable('message_files', (table) => {
      table.string('id').primary()
      table.string('name').notNullable()
      table.string('user_id').notNullable()
      table.string('message_id').notNullable()
      table.string('path').notNullable()
      table.integer('size').notNullable()
      table.string('origin').notNullable()
      table.timestamp('created_at').defaultTo(db.fn.now())
      table.foreign('user_id').references('id').inTable('users')
      table.foreign('message_id').references('id').inTable('messages')
      table.index('user_id')
      table.index('message_id')
    })
  }
  const user = await db('users').first()
  if (!user) {
    await db('users').insert({
      id: tid(),
      email: 'teambot@teambot.com',
      password: await PasswordManager.hashPassword('123456'),
      name: 'TeamBot',
      role: 'admin'
    })
  }
}

export const parseAssistant = (assistant: TableAssistant): TableAssistant => {
  return {
    ...assistant,
    models: assistant.models ? JSON.parse(assistant.models as any) : [],
    options: assistant.options ? JSON.parse(assistant.options as any) : {},
    web_search: assistant.web_search
      ? JSON.parse(assistant.web_search as any)
      : {}
  }
}

export const transformAssistant = (assistant: TableAssistant) => {
  return {
    ...assistant,
    models: assistant.models ? (JSON.stringify(assistant.models) as any) : null,
    options: assistant.options
      ? (JSON.stringify(assistant.options) as any)
      : null,
    web_search: assistant.web_search
      ? (JSON.stringify(assistant.web_search) as any)
      : null
  }
}
