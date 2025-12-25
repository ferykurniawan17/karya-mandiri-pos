import { prisma } from './db'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export async function createUser(username: string, password: string, name: string, role: string = 'cashier') {
  const hashedPassword = await hashPassword(password)
  return prisma.user.create({
    data: {
      username,
      password: hashedPassword,
      name,
      role,
    },
  })
}

export async function loginUser(username: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { username },
  })

  if (!user) {
    return null
  }

  const isValid = await verifyPassword(password, user.password)
  if (!isValid) {
    return null
  }

  const { password: _, ...userWithoutPassword } = user
  return userWithoutPassword
}

export async function getCurrentUser() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get('session')?.value

  if (!sessionId) {
    return null
  }

  // In a real app, you'd store sessions in a database
  // For simplicity, we'll use a simple session storage
  // This should be replaced with proper session management
  try {
    const user = await prisma.user.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        createdAt: true,
      },
    })
    return user
  } catch {
    return null
  }
}

export async function setSession(userId: string) {
  const cookieStore = await cookies()
  cookieStore.set('session', userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })
}

export async function clearSession() {
  const cookieStore = await cookies()
  cookieStore.delete('session')
}

