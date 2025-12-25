import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

export async function initializeDatabase() {
  const prisma = new PrismaClient()

  try {
    // First, try to ensure schema exists by attempting a simple query
    // This will trigger Prisma to create tables if they don't exist (if using db push)
    try {
      await prisma.$queryRaw`SELECT 1`
    } catch (schemaError: any) {
      // If schema doesn't exist, we need to handle it
      // In production, Prisma should auto-create schema on first connection
      // But if it fails, we'll catch it below
    }

    // Check if database is already initialized by checking if admin user exists
    const adminUser = await prisma.user.findUnique({
      where: { username: 'admin' },
    })

    if (adminUser) {
      // Database already initialized
      await prisma.$disconnect()
      return { initialized: false, message: 'Database already initialized' }
    }

    // Create default admin user
    const hashedAdminPassword = await bcrypt.hash('admin123', 10)
    await prisma.user.create({
      data: {
        username: 'admin',
        password: hashedAdminPassword,
        name: 'Administrator',
        role: 'admin',
      },
    })

    // Create default cashier user
    const hashedCashierPassword = await bcrypt.hash('cashier123', 10)
    await prisma.user.create({
      data: {
        username: 'cashier',
        password: hashedCashierPassword,
        name: 'Cashier',
        role: 'cashier',
      },
    })

    await prisma.$disconnect()
    return { initialized: true, message: 'Database initialized successfully' }
  } catch (error: any) {
    await prisma.$disconnect()
    
    // If error is about missing tables, database needs schema push
    if (error.code === 'P2021' || error.message?.includes('does not exist') || error.code === 'P2003' || error.code === 'P2010') {
      return { 
        initialized: false, 
        needsSchema: true,
        error: 'Database schema needs to be initialized. Please ensure Prisma schema is properly set up.' 
      }
    }
    
    throw error
  }
}

