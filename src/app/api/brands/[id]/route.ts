import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const brand = await prisma.brand.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { products: true },
        },
      },
    })

    if (!brand) {
      return NextResponse.json(
        { error: 'Brand tidak ditemukan' },
        { status: 404 }
      )
    }

    return NextResponse.json({ brand })
  } catch (error: any) {
    console.error('Get brand error:', error)
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

    const { name, photo } = await request.json()

    if (!name) {
      return NextResponse.json(
        { error: 'Nama brand harus diisi' },
        { status: 400 }
      )
    }

    const brand = await prisma.brand.update({
      where: { id: params.id },
      data: {
        name: name.trim(),
        photo: photo || undefined,
      },
    })

    return NextResponse.json({
      success: true,
      brand,
    })
  } catch (error: any) {
    console.error('Update brand error:', error)
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Brand tidak ditemukan' },
        { status: 404 }
      )
    }
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Brand dengan nama ini sudah ada' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Terjadi kesalahan' },
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

    await prisma.brand.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete brand error:', error)
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Brand tidak ditemukan' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: 'Terjadi kesalahan' },
      { status: 500 }
    )
  }
}

