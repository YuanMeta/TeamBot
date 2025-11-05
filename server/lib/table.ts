import type { Knex } from 'knex'
import { isJsonObject, tid } from './utils'
import { PasswordManager } from './password'
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
      table.boolean('root').defaultTo(false)
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
      table.index('user_id')
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
      table.string('assistant_id').nullable()
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
  if (!(await db.schema.hasTable('tools'))) {
    await db.schema.createTable('tools', (table) => {
      table.string('id').primary()
      table.string('lid').unique().notNullable()
      table.string('name').notNullable()
      table.string('description').notNullable()
      table.string('type').notNullable()
      table.json('params').notNullable()
      table.boolean('auto').notNullable().defaultTo(true)
      table.timestamp('created_at').defaultTo(db.fn.now())
      table.timestamp('updated_at').defaultTo(db.fn.now())
    })
  }
  if (!(await db.schema.hasTable('assistant_tools'))) {
    await db.schema.createTable('assistant_tools', (table) => {
      table.string('assistant_id').notNullable()
      table.string('tool_id').notNullable()
      table.foreign('assistant_id').references('id').inTable('assistants')
      table.foreign('tool_id').references('id').inTable('tools')
      table.primary(['assistant_id', 'tool_id'])
      table.index('assistant_id')
      table.index('tool_id')
    })
  }

  const user = await db('users').first()
  if (!user) {
    await db('users').insert({
      id: tid(),
      email: 'teambot@teambot.com',
      password: await PasswordManager.hashPassword('123456'),
      name: 'TeamBot',
      role: 'admin',
      root: true
    })
  }
}

export const insertRecord = <T extends Record<string, any>>(data: T): T => {
  return Object.keys(data).reduce((acc, key) => {
    if (isJsonObject(data[key])) {
      acc[key] = JSON.stringify(data[key])
    } else {
      acc[key] = data[key]
    }
    return acc
  }, {} as any)
}

export const parseRecord = <T extends Record<string, any>>(
  data: T,
  boolFields?: string[]
): T => {
  return Object.keys(data).reduce((acc, key) => {
    let value = data[key]
    if (boolFields?.includes(key) && typeof value === 'number') {
      value = value === 1
    }
    if (
      typeof value === 'string' &&
      (value.startsWith('{') || value.startsWith('['))
    ) {
      try {
        acc[key] = JSON.parse(value)
      } catch (e) {
        acc[key] = value
      }
    } else {
      acc[key] = value
    }
    return acc
  }, {} as any)
}
