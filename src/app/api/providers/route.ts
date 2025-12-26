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

    const where: any = {}

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
      ]
    }

    const providers = await prisma.provider.findMany({
      where,
      include: {
        _count: {
          select: {
            purchaseOrders: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ providers })
  } catch (error) {
    console.error('Get providers error:', error)
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
    const { name, phone, email, address, notes } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Nama provider wajib diisi' },
        { status: 400 }
      )
    }

    const provider = await prisma.provider.create({
      data: {
        name,
        phone: phone || undefined,
        email: email || undefined,
        address: address || undefined,
        notes: notes || undefined,
      },
    })

    return NextResponse.json({
      success: true,
      provider,
    })
  } catch (error: any) {
    console.error('Create provider error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan', details: error.message },
      { status: 500 }
    )
  }
}

