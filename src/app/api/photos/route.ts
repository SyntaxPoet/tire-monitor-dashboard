import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { saveTireImage } from '@/utils/file-utils'
import { continuousLearning } from '@/lib/ml/continuous-learning'

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

    // 🎯 CONTINUOUS LEARNING INTEGRATION
    // Automatically save photo for ML training in the background
    try {
      // Extract additional context from form data
      const userContext = {
        deviceInfo: formData.get('deviceInfo'),
        lighting: formData.get('lighting'),
        angle: formData.get('angle'),
        userId: formData.get('userId')
      };

      // This happens asynchronously and doesn't block the response
      continuousLearning.onPhotoCaptured(tireId, file, userContext)
        .then((trainingSample) => {
          console.log(`🧠 Photo saved for continuous learning: ${trainingSample?.id}`);

          // Mark photo as processed for ML training
          prisma.tirePhoto.update({
            where: { id: photo.id },
            data: { processed: true }
          }).catch(err => console.error('Failed to update photo processed status:', err));
        })
        .catch((error) => {
          console.error('❌ Continuous learning failed:', error);
          // Don't fail the entire request if ML training fails
        });

    } catch (error) {
      console.error('❌ Continuous learning integration error:', error);
      // Continue with normal response even if ML fails
    }

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
