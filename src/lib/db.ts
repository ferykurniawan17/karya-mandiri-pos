import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// PostgreSQL connection configuration for multi-user access
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })

// Connection retry logic for production
if (process.env.NODE_ENV === 'production') {
  prisma.$connect().catch((error) => {
    console.error('Failed to connect to PostgreSQL:', error)
    // Retry connection after 5 seconds
    setTimeout(() => {
      prisma.$connect().catch(console.error)
    }, 5000)
  })
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

