import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  out: 'app/.server/drizzle/migrations',
  schema: 'app/.server/drizzle/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!
  }
})
