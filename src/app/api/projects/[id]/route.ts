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

    const project = await prisma.project.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        _count: {
          select: {
            transactions: true,
          },
        },
      },
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Proyek tidak ditemukan' },
        { status: 404 }
      )
    }

    return NextResponse.json({ project })
  } catch (error) {
    console.error('Get project error:', error)
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
    const { name, description, isDefault } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Nama proyek wajib diisi' },
        { status: 400 }
      )
    }

    // Get current project
    const currentProject = await prisma.project.findUnique({
      where: { id: params.id },
    })

    if (!currentProject) {
      return NextResponse.json(
        { error: 'Proyek tidak ditemukan' },
        { status: 404 }
      )
    }

    // Check if name already exists for this customer (excluding current project)
    if (name !== currentProject.name) {
      const existingProject = await prisma.project.findFirst({
        where: {
          customerId: currentProject.customerId,
          name: name,
          id: { not: params.id },
        },
      })

      if (existingProject) {
        return NextResponse.json(
          { error: 'Nama proyek sudah ada untuk pelanggan ini' },
          { status: 400 }
        )
      }
    }

    // Handle default project logic
    if (isDefault && !currentProject.isDefault) {
      // Unset other default projects for this customer
      await prisma.project.updateMany({
        where: {
          customerId: currentProject.customerId,
          isDefault: true,
          id: { not: params.id },
        },
        data: {
          isDefault: false,
        },
      })
    }

    const project = await prisma.project.update({
      where: { id: params.id },
      data: {
        name,
        description: description || undefined,
        isDefault: isDefault !== undefined ? isDefault : currentProject.isDefault,
      },
      include: {
        customer: true,
      },
    })

    return NextResponse.json({
      success: true,
      project,
    })
  } catch (error: any) {
    console.error('Update project error:', error)
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Proyek tidak ditemukan' },
        { status: 404 }
      )
    }
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

    // Check if project has transactions
    const transactionCount = await prisma.transaction.count({
      where: { projectId: params.id },
    })

    if (transactionCount > 0) {
      return NextResponse.json(
        { error: 'Tidak dapat menghapus proyek yang sudah memiliki transaksi' },
        { status: 400 }
      )
    }

    // Check if it's the default project
    const project = await prisma.project.findUnique({
      where: { id: params.id },
    })

    if (project?.isDefault) {
      // Set another project as default if exists
      const otherProject = await prisma.project.findFirst({
        where: {
          customerId: project.customerId,
          id: { not: params.id },
        },
        orderBy: { createdAt: 'asc' },
      })

      if (otherProject) {
        await prisma.project.update({
          where: { id: otherProject.id },
          data: { isDefault: true },
        })
      }
    }

    // Delete project
    await prisma.project.delete({
      where: { id: params.id },
    })

    return NextResponse.json({
      success: true,
      message: 'Proyek berhasil dihapus',
    })
  } catch (error: any) {
    console.error('Delete project error:', error)
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Proyek tidak ditemukan' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: 'Terjadi kesalahan', details: error.message },
      { status: 500 }
    )
  }
}

