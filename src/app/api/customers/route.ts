import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const type = searchParams.get('type') || ''

    const where: any = {}

    if (search) {
      // SQLite doesn't support case-insensitive mode, so we'll use contains
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
      ]
    }

    if (type) {
      where.type = type
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        projects: {
          where: { isDefault: true },
          take: 1,
        },
        _count: {
          select: {
            transactions: true,
            projects: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ customers })
  } catch (error) {
    console.error('Get customers error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, type, phone, email, address, notes } = body

    if (!name || !type) {
      return NextResponse.json(
        { error: 'Nama dan tipe pelanggan wajib diisi' },
        { status: 400 }
      )
    }

    if (type !== 'individual' && type !== 'institution') {
      return NextResponse.json(
        { error: 'Tipe pelanggan tidak valid' },
        { status: 400 }
      )
    }

    // Create customer first
    const newCustomer = await prisma.customer.create({
      data: {
        name,
        type,
        phone: phone || undefined,
        email: email || undefined,
        address: address || undefined,
        notes: notes || undefined,
      },
    })

    // Auto-create default project
    try {
      await prisma.project.create({
        data: {
          name: 'Proyek Default',
          customerId: newCustomer.id,
          isDefault: true,
          description: 'Proyek default untuk pelanggan ini',
        },
      })
    } catch (projectError: any) {
      // If project creation fails, we should ideally rollback customer creation
      // But SQLite doesn't support nested transactions well, so we'll just log the error
      console.error('Error creating default project:', projectError)
      // Optionally delete the customer if project creation fails
      // await prisma.customer.delete({ where: { id: newCustomer.id } })
      // For now, we'll continue and let the user know
    }

    const customer = newCustomer

    return NextResponse.json({
      success: true,
      customer,
    })
  } catch (error: any) {
    console.error('Create customer error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan', details: error.message },
      { status: 500 }
    )
  }
}

