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

    // Verify customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
    })

    if (!customer) {
      return NextResponse.json(
        { error: 'Pelanggan tidak ditemukan' },
        { status: 404 }
      )
    }

    const projects = await prisma.project.findMany({
      where: { customerId: params.id },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
      include: {
        _count: {
          select: {
            transactions: true,
          },
        },
      },
    })

    return NextResponse.json({ projects })
  } catch (error) {
    console.error('Get projects error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan' },
      { status: 500 }
    )
  }
}

export async function POST(
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

    // Verify customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
    })

    if (!customer) {
      return NextResponse.json(
        { error: 'Pelanggan tidak ditemukan' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { name, description, isDefault } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Nama proyek wajib diisi' },
        { status: 400 }
      )
    }

    // Check if project name already exists for this customer
    const existingProject = await prisma.project.findFirst({
      where: {
        customerId: params.id,
        name: name,
      },
    })

    if (existingProject) {
      return NextResponse.json(
        { error: 'Nama proyek sudah ada untuk pelanggan ini' },
        { status: 400 }
      )
    }

    // Check if there's already a default project
    const hasDefaultProject = await prisma.project.findFirst({
      where: {
        customerId: params.id,
        isDefault: true,
      },
    })

    const shouldBeDefault = isDefault || !hasDefaultProject

    // If setting as default and there's already a default, unset the old one
    if (shouldBeDefault && hasDefaultProject) {
      await prisma.project.updateMany({
        where: {
          customerId: params.id,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      })
    }

    const project = await prisma.project.create({
      data: {
        name,
        customerId: params.id,
        isDefault: shouldBeDefault,
        description: description || undefined,
      },
    })

    return NextResponse.json({
      success: true,
      project,
    })
  } catch (error: any) {
    console.error('Create project error:', error)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Nama proyek sudah ada untuk pelanggan ini' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Terjadi kesalahan', details: error.message },
      { status: 500 }
    )
  }
}

