import type { DB } from './types' // this is the Database interface we defined earlier
import { Pool } from 'pg'
import { Kysely, PostgresDialect, sql } from 'kysely'
import { tableSchema } from './table'

const dialect = new PostgresDialect({
  pool: new Pool({
    connectionString: process.env.DATABASE_URL,
    // connectionString:
    //   'postgresql://huangjie@localhost:5432/teambot?schema=public',
    max: 10
  })
})

export type KDB = Kysely<DB>

const globalForDb = globalThis as unknown as {
  db: KDB | undefined
}

export const kdb = async () => {
  if (globalForDb.db) {
    return globalForDb.db
  } else {
    const db = new Kysely<DB>({
      dialect
    })
    await tableSchema(db)
    globalForDb.db = db
    return db
  }
}
