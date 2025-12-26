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

    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
      include: {
        projects: {
          orderBy: [
            { isDefault: 'desc' },
            { createdAt: 'desc' },
          ],
        },
        _count: {
          select: {
            transactions: true,
            projects: true,
          },
        },
      },
    })

    if (!customer) {
      return NextResponse.json(
        { error: 'Pelanggan tidak ditemukan' },
        { status: 404 }
      )
    }

    return NextResponse.json({ customer })
  } catch (error) {
    console.error('Get customer error:', error)
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

    const customer = await prisma.customer.update({
      where: { id: params.id },
      data: {
        name,
        type,
        phone: phone || undefined,
        email: email || undefined,
        address: address || undefined,
        notes: notes || undefined,
      },
      include: {
        projects: {
          orderBy: [
            { isDefault: 'desc' },
            { createdAt: 'desc' },
          ],
        },
      },
    })

    return NextResponse.json({
      success: true,
      customer,
    })
  } catch (error: any) {
    console.error('Update customer error:', error)
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Pelanggan tidak ditemukan' },
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

    // Check if customer has transactions
    const transactionCount = await prisma.transaction.count({
      where: { customerId: params.id },
    })

    if (transactionCount > 0) {
      return NextResponse.json(
        { error: 'Tidak dapat menghapus pelanggan yang sudah memiliki transaksi' },
        { status: 400 }
      )
    }

    // Delete customer (projects will be cascade deleted)
    await prisma.customer.delete({
      where: { id: params.id },
    })

    return NextResponse.json({
      success: true,
      message: 'Pelanggan berhasil dihapus',
    })
  } catch (error: any) {
    console.error('Delete customer error:', error)
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Pelanggan tidak ditemukan' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: 'Terjadi kesalahan', details: error.message },
      { status: 500 }
    )
  }
}

