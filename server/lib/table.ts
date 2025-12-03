import type { Knex } from 'knex'
import { isJsonObject, tid } from './utils'
import { PasswordManager } from './password'
export const tableSchema = async (db: Knex) => {
  // try {
  //   await db.raw('CREATE EXTENSION IF NOT EXISTS vector')
  //   console.log('pgvector extension enabled')
  // } catch (error) {
  //   console.warn('Failed to create pgvector extension:', error)
  // }

  // await db.schema.dropTableIfExists('message_files')
  // await db.schema.dropTableIfExists('messages')
  // await db.schema.dropTableIfExists('chats')
  // await db.schema.dropTableIfExists('assistant_tools')
  // await db.schema.dropTableIfExists('assistant_usages')
  // await db.schema.dropTableIfExists('assistants')
  // await db.schema.dropTableIfExists('tools')
  // await db.schema.dropTableIfExists('oauth_accounts')
  // await db.schema.dropTableIfExists('auth_providers')
  // await db.schema.dropTableIfExists('users')
  // await db.schema.dropTableIfExists('models')

  if (!(await db.schema.hasTable('users'))) {
    await db.schema.createTable('users', (table) => {
      table.string('id').primary().notNullable()
      table.string('email').unique().nullable()
      table.string('phone').unique().nullable()
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

  if (!(await db.schema.hasTable('assistants'))) {
    await db.schema.createTable('assistants', (table) => {
      table.string('id').primary().notNullable()
      table.string('name').notNullable()
      table.string('mode').notNullable()
      table.string('api_key').nullable()
      table.text('base_url').nullable()
      table.text('prompt').nullable()
      table.text('models').notNullable()
      table.text('options').nullable()
      table.timestamp('created_at').defaultTo(db.fn.now())
      table.timestamp('updated_at').defaultTo(db.fn.now())
    })
  }
  if (!(await db.schema.hasTable('chats'))) {
    await db.schema.createTable('chats', (table) => {
      table.string('id').primary().notNullable()
      table.text('title').notNullable()
      table.string('user_id').notNullable()
      table.string('assistant_id').nullable()
      table.boolean('public').defaultTo(false)
      table.string('model').nullable()
      table.boolean('deleted').defaultTo(false)
      table.text('summary').nullable()
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
      table.string('id').primary().notNullable()
      table.string('role').notNullable()
      table.string('user_id').notNullable()
      table.string('chat_id').notNullable()
      table.text('docs').nullable()
      table.text('error').nullable()
      table.string('model').nullable()
      table.string('assistant_id').nullable()
      table.integer('reasoning_duration').nullable()
      table.text('parts').nullable()
      table.text('files').nullable()
      table.text('text').nullable()
      table.integer('input_tokens').notNullable().defaultTo(0)
      table.integer('output_tokens').notNullable().defaultTo(0)
      table.integer('total_tokens').notNullable().defaultTo(0)
      table.integer('reasoning_tokens').notNullable().defaultTo(0)
      table.integer('cached_input_tokens').notNullable().defaultTo(0)
      table.text('steps').nullable()
      table.boolean('terminated').defaultTo(false)
      table.timestamp('created_at').defaultTo(db.fn.now())
      table.timestamp('updated_at').defaultTo(db.fn.now())
      table.foreign('user_id').references('id').inTable('users')
      table.foreign('chat_id').references('id').inTable('chats')
      table.index(['user_id', 'chat_id'])
    })
  }

  if (!(await db.schema.hasTable('tools'))) {
    await db.schema.createTable('tools', (table) => {
      table.string('id').primary().notNullable()
      table.string('name').notNullable()
      table.text('description').notNullable()
      table.string('type').notNullable()
      table.text('params').notNullable()
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

  if (!(await db.schema.hasTable('models'))) {
    await db.schema.createTable('models', (table) => {
      table.string('id').primary().notNullable()
      table.string('model').notNullable()
      table.string('provider').notNullable()
      table.text('options').nullable()
      table.unique(['model', 'provider'])
    })
  }

  if (!(await db.schema.hasTable('auth_providers'))) {
    await db.schema.createTable('auth_providers', (table) => {
      table.string('id').primary().notNullable()
      table.string('name').notNullable()
      table.string('issuer').nullable()
      table.text('auth_url').notNullable()
      table.text('token_url').notNullable()
      table.text('userinfo_url').nullable()
      table.text('jwks_uri').nullable()
      table.text('client_id').notNullable()
      table.text('client_secret').nullable()
      table.string('scopes').nullable()
      table.boolean('use_pkce').notNullable().defaultTo(false)
      table.timestamp('created_at').defaultTo(db.fn.now())
      table.timestamp('updated_at').defaultTo(db.fn.now())
    })
  }

  if (!(await db.schema.hasTable('oauth_accounts'))) {
    await db.schema.createTable('oauth_accounts', (table) => {
      table.string('id').primary().notNullable()
      table.string('provider_id').notNullable()
      table.string('provider_user_id').notNullable()
      table.string('user_id').notNullable()
      table.text('profile_json').nullable()
      table.foreign('provider_id').references('id').inTable('auth_providers')
      table.foreign('user_id').references('id').inTable('users')
      table.unique(['provider_id', 'provider_user_id'])
    })
  }
  if (!(await db.schema.hasTable('assistant_usages'))) {
    await db.schema.createTable('assistant_usages', (table) => {
      table.string('id').primary().notNullable()
      table.string('assistant_id').notNullable()
      table.integer('input_tokens').notNullable().defaultTo(0)
      table.integer('output_tokens').notNullable().defaultTo(0)
      table.integer('total_tokens').notNullable().defaultTo(0)
      table.integer('reasoning_tokens').notNullable().defaultTo(0)
      table.integer('cached_input_tokens').notNullable().defaultTo(0)
      table.date('created_at').defaultTo(db.fn.now())
      table.index('created_at')
      table.unique(['assistant_id', 'created_at'])
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
