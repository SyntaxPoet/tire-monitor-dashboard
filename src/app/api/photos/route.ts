import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { saveTireImage } from '@/utils/file-utils'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const tireId = formData.get('tireId') as string
    const notes = formData.get('notes') as string || null

    if (!file || !tireId) {
      return NextResponse.json(
        { error: 'File and tireId are required' },
        { status: 400 }
      )
    }

    // Verify tire exists
    const tire = await prisma.tire.findUnique({
      where: { id: tireId }
    })

    if (!tire) {
      return NextResponse.json(
        { error: 'Tire not found' },
        { status: 404 }
      )
    }

    // Save the image file
    const { filePath, fileName } = await saveTireImage(file, tireId, file.name)

    // Create photo record in database
    const photo = await prisma.tirePhoto.create({
      data: {
        tireId,
        filePath,
        fileName,
        notes,
        processed: false
      }
    })

    return NextResponse.json(photo)
  } catch (error) {
    console.error('Error uploading photo:', error)
    return NextResponse.json(
      { error: 'Failed to upload photo' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tireId = searchParams.get('tireId')

    if (!tireId) {
      return NextResponse.json(
        { error: 'tireId parameter is required' },
        { status: 400 }
      )
    }

    const photos = await prisma.tirePhoto.findMany({
      where: { tireId },
      orderBy: { takenAt: 'desc' },
      include: {
        measurements: true
      }
    })

    return NextResponse.json(photos)
  } catch (error) {
    console.error('Error fetching photos:', error)
    return NextResponse.json(
      { error: 'Failed to fetch photos' },
      { status: 500 }
    )
  }
}
