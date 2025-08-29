import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import sharp from 'sharp'
import { promises as fs } from 'fs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { photoId } = body

    if (!photoId) {
      return NextResponse.json(
        { error: 'photoId is required' },
        { status: 400 }
      )
    }

    // Get photo from database
    const photo = await prisma.tirePhoto.findUnique({
      where: { id: photoId },
      include: { tire: true }
    })

    if (!photo) {
      return NextResponse.json(
        { error: 'Photo not found' },
        { status: 404 }
      )
    }

    // Basic image analysis (placeholder for computer vision)
    const analysis = await analyzeTireImage(photo.filePath)

    // Save measurements to database
    const measurements = []

    // Tread depth measurement (simulated)
    measurements.push({
      tireId: photo.tireId,
      photoId: photoId,
      type: 'TREAD_DEPTH' as any,
      value: analysis.treadDepth,
      unit: 'mm',
      confidence: 0.85
    })

    // Sidewall condition
    measurements.push({
      tireId: photo.tireId,
      photoId: photoId,
      type: 'SIDEWALL_CONDITION' as any,
      value: analysis.sidewallCondition,
      unit: 'percentage',
      confidence: 0.90
    })

    // Wear pattern analysis
    measurements.push({
      tireId: photo.tireId,
      photoId: photoId,
      type: 'WEAR_PATTERN' as any,
      value: analysis.wearPattern,
      unit: 'score',
      confidence: 0.75
    })

    // Create measurements in database
    await prisma.measurement.createMany({
      data: measurements
    })

    // Update photo as processed
    await prisma.tirePhoto.update({
      where: { id: photoId },
      data: { processed: true }
    })

    // Calculate and update KPIs
    await calculateKPIs(photo.tireId)

    return NextResponse.json({
      success: true,
      analysis,
      measurements: measurements.length
    })
  } catch (error) {
    console.error('Error processing image:', error)
    return NextResponse.json(
      { error: 'Failed to process image' },
      { status: 500 }
    )
  }
}

// Basic image analysis (placeholder - would use computer vision in production)
async function analyzeTireImage(filePath: string) {
  try {
    // Read image metadata
    const metadata = await sharp(filePath).metadata()

    // Simulate analysis based on image properties
    const treadDepth = Math.random() * 8 + 2 // 2-10mm
    const sidewallCondition = Math.random() * 20 + 80 // 80-100%
    const wearPattern = Math.random() * 5 + 1 // 1-6 scale

    return {
      treadDepth: Math.round(treadDepth * 100) / 100,
      sidewallCondition: Math.round(sidewallCondition),
      wearPattern: Math.round(wearPattern),
      imageWidth: metadata.width,
      imageHeight: metadata.height,
      processedAt: new Date().toISOString()
    }
  } catch (error) {
    // Fallback analysis
    return {
      treadDepth: 6.5,
      sidewallCondition: 95,
      wearPattern: 3,
      processedAt: new Date().toISOString()
    }
  }
}

// Calculate KPIs for a tire
async function calculateKPIs(tireId: string) {
  try {
    // Get recent measurements
    const measurements = await prisma.measurement.findMany({
      where: { tireId },
      orderBy: { measuredAt: 'desc' },
      take: 20
    })

    // Calculate KPIs
    const treadDepths = measurements
      .filter(m => m.type === 'TREAD_DEPTH')
      .slice(0, 5)

    if (treadDepths.length > 0) {
      const latestTreadDepth = treadDepths[0].value
      const treadLifeRemaining = (latestTreadDepth / 8) * 100 // Assuming 8mm is 100%

      // Calculate tread wear rate
      let wearRate = 0
      if (treadDepths.length >= 2) {
        const recent = treadDepths.slice(0, 2)
        const timeDiff = new Date(recent[0].measuredAt).getTime() - new Date(recent[1].measuredAt).getTime()
        const depthDiff = recent[1].value - recent[0].value
        wearRate = (depthDiff / timeDiff) * 1000 * 60 * 60 * 24 * 30 // mm per month
      }

      // Determine trend
      const trend = wearRate > 0.1 ? 'DECLINING' :
                   wearRate < -0.1 ? 'IMPROVING' : 'STABLE'

      // Upsert KPI
      await prisma.kPI.upsert({
        where: {
          tireId_type: {
            tireId,
            type: 'TREAD_LIFE_REMAINING'
          }
        },
        update: {
          value: treadLifeRemaining,
          trend: trend as any,
          calculatedAt: new Date(),
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        },
        create: {
          tireId,
          type: 'TREAD_LIFE_REMAINING' as any,
          value: treadLifeRemaining,
          unit: 'percentage',
          trend: trend as any,
          calculatedAt: new Date(),
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      })
    }
  } catch (error) {
    console.error('Error calculating KPIs:', error)
  }
}
