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
      client: 'pg',
      connection: {
        connectionString: process.env.DATABASE_URL
      },
      useNullAsDefault: true
      // debug: process.env.NODE_ENV === 'development'
    })
    await tableSchema(db)
    globalForKnex.knex = db
    return db
  }
}
