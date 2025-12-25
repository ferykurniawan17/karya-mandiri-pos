import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir, access } from 'fs/promises'
import { join } from 'path'
import { getCurrentUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'Tidak ada file yang diunggah' },
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'products')
    
    // Ensure directory exists
    try {
      await access(uploadsDir)
    } catch {
      await mkdir(uploadsDir, { recursive: true })
    }
    
    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`
    const filePath = join(uploadsDir, fileName)

    // In production, you might want to use a proper file system library
    // For now, we'll use a simple approach
    await writeFile(filePath, buffer)

    const fileUrl = `/uploads/products/${fileName}`

    return NextResponse.json({
      success: true,
      url: fileUrl,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Gagal mengunggah file' },
      { status: 500 }
    )
  }
}

