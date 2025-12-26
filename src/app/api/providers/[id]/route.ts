import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const provider = await prisma.provider.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            purchaseOrders: true,
          },
        },
      },
    })

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider tidak ditemukan' },
        { status: 404 }
      )
    }

    return NextResponse.json({ provider })
  } catch (error) {
    console.error('Get provider error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const provider = await prisma.provider.update({
      where: { id: params.id },
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
    console.error('Update provider error:', error)
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Provider tidak ditemukan' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: 'Terjadi kesalahan', details: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if provider has purchase orders
    const purchaseOrderCount = await prisma.purchaseOrder.count({
      where: { providerId: params.id },
    })

    if (purchaseOrderCount > 0) {
      return NextResponse.json(
        { error: 'Tidak dapat menghapus provider yang sudah memiliki Purchase Order' },
        { status: 400 }
      )
    }

    await prisma.provider.delete({
      where: { id: params.id },
    })

    return NextResponse.json({
      success: true,
      message: 'Provider berhasil dihapus',
    })
  } catch (error: any) {
    console.error('Delete provider error:', error)
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Provider tidak ditemukan' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: 'Terjadi kesalahan', details: error.message },
      { status: 500 }
    )
  }
}

