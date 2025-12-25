import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

async function main() {
  // Create default admin user if not exists
  const adminUser = await prisma.user.findUnique({
    where: { username: 'admin' },
  })

  if (!adminUser) {
    const hashedPassword = await hashPassword('admin123')
    await prisma.user.create({
      data: {
        username: 'admin',
        password: hashedPassword,
        name: 'Administrator',
        role: 'admin',
      },
    })
    console.log('✅ Default admin user created (username: admin, password: admin123)')
  } else {
    console.log('ℹ️  Admin user already exists')
  }

  // Create default cashier user if not exists
  const cashierUser = await prisma.user.findUnique({
    where: { username: 'cashier' },
  })

  if (!cashierUser) {
    const hashedPassword = await hashPassword('cashier123')
    await prisma.user.create({
      data: {
        username: 'cashier',
        password: hashedPassword,
        name: 'Cashier',
        role: 'cashier',
      },
    })
    console.log('✅ Default cashier user created (username: cashier, password: cashier123)')
  } else {
    console.log('ℹ️  Cashier user already exists')
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

