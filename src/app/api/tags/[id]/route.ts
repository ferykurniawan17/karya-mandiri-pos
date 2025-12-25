import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tag = await prisma.tag.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { products: true },
        },
      },
    })

    if (!tag) {
      return NextResponse.json(
        { error: 'Tag tidak ditemukan' },
        { status: 404 }
      )
    }

    return NextResponse.json({ tag })
  } catch (error: any) {
    console.error('Get tag error:', error)
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

    const { name } = await request.json()

    if (!name) {
      return NextResponse.json(
        { error: 'Nama tag harus diisi' },
        { status: 400 }
      )
    }

    const tag = await prisma.tag.update({
      where: { id: params.id },
      data: {
        name: name.trim(),
      },
    })

    return NextResponse.json({
      success: true,
      tag,
    })
  } catch (error: any) {
    console.error('Update tag error:', error)
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Tag tidak ditemukan' },
        { status: 404 }
      )
    }
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Tag dengan nama ini sudah ada' },
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

    await prisma.tag.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete tag error:', error)
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Tag tidak ditemukan' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: 'Terjadi kesalahan' },
      { status: 500 }
    )
  }
}

