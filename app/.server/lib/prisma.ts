import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

prisma.$queryRaw`PRAGMA journal_mode = WAL;`.catch((err) => {
  console.log('wal mode err', err)
})
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
