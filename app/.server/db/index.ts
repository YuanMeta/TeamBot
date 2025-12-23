import { sql, type AnyColumn } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { relations } from '../drizzle/relations'
export const db = drizzle({
  connection: process.env.DATABASE_URL!,
  relations: relations
})

export type DbInstance = typeof db
export const increment = (column: AnyColumn, value = 0) => {
  return sql`${column} + ${value}`
}
