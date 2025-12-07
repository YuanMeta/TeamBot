import { isJsonObject } from '../utils'
import { PasswordManager } from '../password'
import { insertAccesses, insertRoles } from './access'
import type { KDB } from './instance'
import { sql } from 'kysely'
const hasTable = async (db: KDB, table: string): Promise<boolean> => {
  const result = await sql<{ exists: boolean }>`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = ${table}
    ) as exists
  `.execute(db)

  return result.rows[0]?.exists ?? false
}
export const tableSchema = async (db: KDB) => {
  // await db.schema.dropTable('user_roles').ifExists().execute()
  // await db.schema.dropTable('access_roles').ifExists().execute()
  // await db.schema.dropTable('accesses').ifExists().execute()
  // await db.schema.dropTable('roles').ifExists().execute()
  // await db.schema.dropTable('messages').ifExists().execute()
  // await db.schema.dropTable('chats').ifExists().execute()
  // await db.schema.dropTable('assistant_tools').ifExists().execute()
  // await db.schema.dropTable('tools').ifExists().execute()
  // await db.schema.dropTable('assistant_usages').ifExists().execute()
  // await db.schema.dropTable('assistants').ifExists().execute()
  // await db.schema.dropTable('oauth_accounts').ifExists().execute()
  // await db.schema.dropTable('users').ifExists().execute()
  // await db.schema.dropTable('auth_providers').ifExists().execute()
  // await db.schema.dropTable('models').ifExists().execute()
  if (!(await hasTable(db, 'users'))) {
    await db.schema
      .createTable('users')
      .ifNotExists()
      .addColumn('id', 'serial', (col) => col.primaryKey())
      .addColumn('email', 'varchar', (col) => col.unique())
      .addColumn('phone', 'varchar', (col) => col.unique())
      .addColumn('avatar', 'varchar')
      .addColumn('name', 'varchar')
      .addColumn('password', 'varchar')
      .addColumn('deleted', 'boolean', (col) => col.defaultTo(false))
      .addColumn('root', 'boolean', (col) => col.defaultTo(false))
      .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`now()`))
      .addColumn('updated_at', 'timestamp', (col) => col.defaultTo(sql`now()`))
      .execute()
  }

  // Create assistants table
  if (!(await hasTable(db, 'assistants'))) {
    await db.schema
      .createTable('assistants')
      .ifNotExists()
      .addColumn('id', 'serial', (col) => col.primaryKey())
      .addColumn('name', 'varchar', (col) => col.notNull())
      .addColumn('mode', 'varchar', (col) => col.notNull())
      .addColumn('api_key', 'varchar')
      .addColumn('base_url', 'text')
      .addColumn('prompt', 'text')
      .addColumn('models', 'jsonb', (col) => col.notNull())
      .addColumn('options', 'jsonb', (col) => col.notNull())
      .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`now()`))
      .addColumn('updated_at', 'timestamp', (col) => col.defaultTo(sql`now()`))
      .execute()
  }

  // Create chats table
  if (!(await hasTable(db, 'chats'))) {
    await db.schema
      .createTable('chats')
      .ifNotExists()
      .addColumn('id', 'varchar', (col) => col.primaryKey())
      .addColumn('title', 'text', (col) => col.notNull())
      .addColumn('user_id', 'integer', (col) => col.notNull())
      .addColumn('assistant_id', 'integer')
      .addColumn('public', 'boolean', (col) => col.defaultTo(false))
      .addColumn('model', 'varchar')
      .addColumn('deleted', 'boolean', (col) => col.defaultTo(false))
      .addColumn('summary', 'text')
      .addColumn('message_offset', 'integer', (col) =>
        col.notNull().defaultTo(0)
      )
      .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`now()`))
      .addColumn('updated_at', 'timestamp', (col) => col.defaultTo(sql`now()`))
      .addColumn('last_chat_time', 'timestamp', (col) =>
        col.defaultTo(sql`now()`)
      )
      .addForeignKeyConstraint('chats_user_id_foreign', ['user_id'], 'users', [
        'id'
      ])
      .addForeignKeyConstraint(
        'chats_assistant_id_foreign',
        ['assistant_id'],
        'assistants',
        ['id'],
        (constraint) => constraint.onDelete('set null')
      )
      .execute()

    await db.schema
      .createIndex('chats_user_id_index')
      .ifNotExists()
      .on('chats')
      .column('user_id')
      .execute()
  }
  if (!(await hasTable(db, 'messages'))) {
    await db.schema
      .createTable('messages')
      .ifNotExists()
      .addColumn('id', 'varchar', (col) => col.primaryKey())
      .addColumn('role', 'varchar', (col) => col.notNull())
      .addColumn('user_id', 'integer', (col) => col.notNull())
      .addColumn('chat_id', 'varchar', (col) => col.notNull())
      .addColumn('docs', 'text')
      .addColumn('error', 'text')
      .addColumn('model', 'varchar')
      .addColumn('assistant_id', 'integer')
      .addColumn('reasoning_duration', 'integer')
      .addColumn('parts', 'text')
      .addColumn('files', 'text')
      .addColumn('text', 'text')
      .addColumn('input_tokens', 'integer', (col) => col.notNull().defaultTo(0))
      .addColumn('output_tokens', 'integer', (col) =>
        col.notNull().defaultTo(0)
      )
      .addColumn('total_tokens', 'integer', (col) => col.notNull().defaultTo(0))
      .addColumn('reasoning_tokens', 'integer', (col) =>
        col.notNull().defaultTo(0)
      )
      .addColumn('cached_input_tokens', 'integer', (col) =>
        col.notNull().defaultTo(0)
      )
      .addColumn('steps', 'text')
      .addColumn('terminated', 'boolean', (col) => col.defaultTo(false))
      .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`now()`))
      .addColumn('updated_at', 'timestamp', (col) => col.defaultTo(sql`now()`))
      .addForeignKeyConstraint(
        'messages_user_id_foreign',
        ['user_id'],
        'users',
        ['id']
      )
      .addForeignKeyConstraint(
        'messages_chat_id_foreign',
        ['chat_id'],
        'chats',
        ['id']
      )
      .addForeignKeyConstraint(
        'messages_assistant_id_foreign',
        ['assistant_id'],
        'assistants',
        ['id']
      )
      .execute()
    await db.schema
      .createIndex('messages_user_id_chat_id_index')
      .ifNotExists()
      .on('messages')
      .columns(['user_id', 'chat_id'])
      .execute()
  }

  // Create tools table
  if (!(await hasTable(db, 'tools'))) {
    await db.schema
      .createTable('tools')
      .ifNotExists()
      .addColumn('id', 'varchar', (col) => col.primaryKey())
      .addColumn('name', 'varchar', (col) => col.notNull())
      .addColumn('description', 'text', (col) => col.notNull())
      .addColumn('type', 'varchar', (col) => col.notNull())
      .addColumn('params', 'jsonb', (col) => col.notNull())
      .addColumn('auto', 'boolean', (col) => col.notNull().defaultTo(true))
      .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`now()`))
      .addColumn('updated_at', 'timestamp', (col) => col.defaultTo(sql`now()`))
      .execute()
  }
  if (!(await hasTable(db, 'assistant_tools'))) {
    await db.schema
      .createTable('assistant_tools')
      .ifNotExists()
      .addColumn('assistant_id', 'integer', (col) => col.notNull())
      .addColumn('tool_id', 'varchar')
      .addColumn('system_tool_id', 'varchar')
      .addForeignKeyConstraint(
        'assistant_tools_assistant_id_foreign',
        ['assistant_id'],
        'assistants',
        ['id']
      )
      .addForeignKeyConstraint(
        'assistant_tools_tool_id_foreign',
        ['tool_id'],
        'tools',
        ['id']
      )
      .addUniqueConstraint('assistant_tools_assistant_id_tool_id_unique', [
        'assistant_id',
        'tool_id'
      ])
      .addUniqueConstraint(
        'assistant_tools_assistant_id_system_tool_id_unique',
        ['assistant_id', 'system_tool_id']
      )
      .execute()

    // Create index for assistant_tools.assistant_id
    await db.schema
      .createIndex('assistant_tools_assistant_id_index')
      .ifNotExists()
      .on('assistant_tools')
      .column('assistant_id')
      .execute()
  }

  // Create models table
  if (!(await hasTable(db, 'models'))) {
    await db.schema
      .createTable('models')
      .ifNotExists()
      .addColumn('id', 'serial', (col) => col.primaryKey())
      .addColumn('model', 'varchar', (col) => col.notNull())
      .addColumn('provider', 'varchar', (col) => col.notNull())
      .addColumn('options', 'text')
      .addUniqueConstraint('models_model_provider_unique', [
        'model',
        'provider'
      ])
      .execute()
  }

  if (!(await hasTable(db, 'auth_providers'))) {
    await db.schema
      .createTable('auth_providers')
      .ifNotExists()
      .addColumn('id', 'serial', (col) => col.primaryKey())
      .addColumn('name', 'varchar', (col) => col.notNull())
      .addColumn('issuer', 'varchar')
      .addColumn('auth_url', 'text', (col) => col.notNull())
      .addColumn('token_url', 'text', (col) => col.notNull())
      .addColumn('userinfo_url', 'text')
      .addColumn('jwks_uri', 'text')
      .addColumn('client_id', 'text', (col) => col.notNull())
      .addColumn('client_secret', 'text')
      .addColumn('scopes', 'varchar')
      .addColumn('use_pkce', 'boolean', (col) => col.notNull().defaultTo(false))
      .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`now()`))
      .addColumn('updated_at', 'timestamp', (col) => col.defaultTo(sql`now()`))
      .execute()
  }

  if (!(await hasTable(db, 'oauth_accounts'))) {
    await db.schema
      .createTable('oauth_accounts')
      .ifNotExists()
      .addColumn('provider_id', 'integer', (col) => col.notNull())
      .addColumn('provider_user_id', 'varchar', (col) => col.notNull())
      .addColumn('user_id', 'integer', (col) => col.notNull())
      .addColumn('profile_json', 'text')
      .addForeignKeyConstraint(
        'oauth_accounts_provider_id_foreign',
        ['provider_id'],
        'auth_providers',
        ['id']
      )
      .addForeignKeyConstraint(
        'oauth_accounts_user_id_foreign',
        ['user_id'],
        'users',
        ['id']
      )
      .addPrimaryKeyConstraint('oauth_accounts_pkey', [
        'provider_id',
        'provider_user_id'
      ])
      .execute()
  }

  if (!(await hasTable(db, 'assistant_usages'))) {
    await db.schema
      .createTable('assistant_usages')
      .ifNotExists()
      .addColumn('id', 'uuid', (col) =>
        col.primaryKey().defaultTo(sql`gen_random_uuid()`)
      )
      .addColumn('assistant_id', 'integer', (col) => col.notNull())
      .addColumn('input_tokens', 'integer', (col) => col.notNull().defaultTo(0))
      .addColumn('output_tokens', 'integer', (col) =>
        col.notNull().defaultTo(0)
      )
      .addColumn('total_tokens', 'integer', (col) => col.notNull().defaultTo(0))
      .addColumn('reasoning_tokens', 'integer', (col) =>
        col.notNull().defaultTo(0)
      )
      .addColumn('cached_input_tokens', 'integer', (col) =>
        col.notNull().defaultTo(0)
      )
      .addColumn('created_at', 'date', (col) =>
        col.defaultTo(sql`current_date`)
      )
      .addForeignKeyConstraint(
        'assistant_usages_assistant_id_foreign',
        ['assistant_id'],
        'assistants',
        ['id']
      )
      .execute()

    // Create indexes for assistant_usages
    await db.schema
      .createIndex('assistant_usages_created_at_index')
      .ifNotExists()
      .on('assistant_usages')
      .column('created_at')
      .execute()
    await db.schema
      .createIndex('assistant_usages_assistant_id_created_at_unique_index')
      .ifNotExists()
      .on('assistant_usages')
      .columns(['assistant_id', 'created_at'])
      .execute()
  }

  if (!(await hasTable(db, 'accesses'))) {
    await db.schema
      .createTable('accesses')
      .ifNotExists()
      .addColumn('id', 'varchar', (col) => col.primaryKey())
      .addColumn('remark', 'text')
      .addColumn('trpc_access', 'jsonb')
      .execute()
    await insertAccesses(db)
  }

  if (!(await hasTable(db, 'roles'))) {
    await db.schema
      .createTable('roles')
      .ifNotExists()
      .addColumn('id', 'serial', (col) => col.primaryKey())
      .addColumn('name', 'varchar', (col) => col.notNull())
      .addColumn('assistants', 'jsonb', (col) => col.notNull())
      .addColumn('remark', 'text')
      .execute()
  }

  // Create access_roles table
  if (!(await hasTable(db, 'access_roles'))) {
    await db.schema
      .createTable('access_roles')
      .ifNotExists()
      .addColumn('role_id', 'integer', (col) => col.notNull())
      .addColumn('access_id', 'varchar', (col) => col.notNull())
      .addForeignKeyConstraint(
        'access_roles_role_id_foreign',
        ['role_id'],
        'roles',
        ['id']
      )
      .addForeignKeyConstraint(
        'access_roles_access_id_foreign',
        ['access_id'],
        'accesses',
        ['id']
      )
      .addPrimaryKeyConstraint('access_roles_pkey', ['role_id', 'access_id'])
      .execute()
    await db.schema
      .createIndex('access_roles_role_id_index')
      .ifNotExists()
      .on('access_roles')
      .column('role_id')
      .execute()
    await insertRoles(db)
  }

  if (!(await hasTable(db, 'user_roles'))) {
    await db.schema
      .createTable('user_roles')
      .ifNotExists()
      .addColumn('user_id', 'integer', (col) => col.notNull())
      .addColumn('role_id', 'integer', (col) => col.notNull())
      .addForeignKeyConstraint(
        'user_roles_user_id_foreign',
        ['user_id'],
        'users',
        ['id']
      )
      .addForeignKeyConstraint(
        'user_roles_role_id_foreign',
        ['role_id'],
        'roles',
        ['id']
      )
      .addPrimaryKeyConstraint('user_roles_pkey', ['user_id', 'role_id'])
      .execute()

    await db.schema
      .createIndex('user_roles_user_id_index')
      .ifNotExists()
      .on('user_roles')
      .column('user_id')
      .execute()
  }

  const userCount = await db
    .selectFrom('users')
    .select((ctx) => [ctx.fn.count<string>('id').as('count')])
    .executeTakeFirstOrThrow()

  if (userCount.count === '0') {
    const result = await db
      .insertInto('users')
      .values({
        email: 'teambot@teambot.com',
        password: await PasswordManager.hashPassword('123456'),
        name: 'TeamBot',
        root: true
      })
      .returning('id')
      .executeTakeFirstOrThrow()

    await db
      .insertInto('user_roles')
      .values({
        user_id: result.id,
        role_id: 1
      })
      .execute()
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
