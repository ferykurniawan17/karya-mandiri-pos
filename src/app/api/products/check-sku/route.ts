import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const sku = searchParams.get('sku')
    const excludeId = searchParams.get('excludeId')

    if (!sku) {
      return NextResponse.json(
        { error: 'SKU parameter is required' },
        { status: 400 }
      )
    }

    // Check if SKU exists
    const where: any = {
      sku: sku,
    }

    // Exclude current product if editing
    if (excludeId) {
      where.id = { not: excludeId }
    }

    const existingProduct = await prisma.product.findFirst({
      where,
    })

    return NextResponse.json({
      exists: !!existingProduct,
    })
  } catch (error: any) {
    console.error('Check SKU error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan', exists: false },
      { status: 500 }
    )
  }
}

