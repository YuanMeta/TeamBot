import Knex from 'knex'
import { tableSchema } from './table'

const globalForKnex = globalThis as unknown as {
  knex: Knex.Knex | undefined
}

export const kdb = async () => {
  if (globalForKnex.knex) {
    return globalForKnex.knex
  } else {
    const db = Knex.knex({
      client: 'better-sqlite3',
      connection: {
        filename: './db.sqlite'
      },
      useNullAsDefault: true
    })
    await tableSchema(db)
    globalForKnex.knex = db
    return db
  }
}
