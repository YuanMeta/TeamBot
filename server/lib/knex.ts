import Knex from 'knex'
import { tableSchema } from './table'
import path from 'path'
import { existsSync, mkdirSync } from 'fs'

const globalForKnex = globalThis as unknown as {
  knex: Knex.Knex | undefined
}

export const kdb = async () => {
  if (globalForKnex.knex) {
    return globalForKnex.knex
  } else {
    const dbDir = path.join(process.cwd(), 'db')
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true })
    }
    const db = Knex.knex({
      client: 'better-sqlite3',
      connection: {
        filename: './db/db.sqlite'
      },
      useNullAsDefault: true
    })
    await db.raw('PRAGMA journal_mode = WAL;')
    await tableSchema(db)
    globalForKnex.knex = db
    return db
  }
}
