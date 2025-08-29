import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tireId = searchParams.get('tireId')
    const vehicleId = searchParams.get('vehicleId')

    if (!tireId && !vehicleId) {
      return NextResponse.json(
        { error: 'Either tireId or vehicleId parameter is required' },
        { status: 400 }
      )
    }

    let whereClause: any = {}

    if (tireId) {
      whereClause.tireId = tireId
    } else if (vehicleId) {
      // Get all tires for the vehicle
      const tires = await prisma.tire.findMany({
        where: { vehicleId },
        select: { id: true }
      })
      whereClause.tireId = { in: tires.map(t => t.id) }
    }

    const kpis = await prisma.kPI.findMany({
      where: {
        ...whereClause,
        validUntil: {
          gt: new Date()
        }
      },
      include: {
        tire: {
          include: {
            vehicle: true
          }
        }
      },
      orderBy: { calculatedAt: 'desc' }
    })

    return NextResponse.json(kpis)
  } catch (error) {
    console.error('Error fetching KPIs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch KPIs' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tireId } = body

    if (!tireId) {
      return NextResponse.json(
        { error: 'tireId is required' },
        { status: 400 }
      )
    }

    // Trigger KPI recalculation for a tire
    await recalculateTireKPIs(tireId)

    const updatedKpis = await prisma.kPI.findMany({
      where: { tireId },
      orderBy: { calculatedAt: 'desc' }
    })

    return NextResponse.json(updatedKpis)
  } catch (error) {
    console.error('Error recalculating KPIs:', error)
    return NextResponse.json(
      { error: 'Failed to recalculate KPIs' },
      { status: 500 }
    )
  }
}

// Recalculate all KPIs for a tire
async function recalculateTireKPIs(tireId: string) {
  try {
    // Get recent measurements
    const measurements = await prisma.measurement.findMany({
      where: { tireId },
      orderBy: { measuredAt: 'desc' },
      take: 50
    })

    // Calculate tread life remaining
    const treadDepths = measurements
      .filter(m => m.type === 'TREAD_DEPTH')
      .slice(0, 10)

    if (treadDepths.length > 0) {
      const latestTreadDepth = treadDepths[0].value
      const treadLifeRemaining = Math.max(0, (latestTreadDepth / 8) * 100)

      // Calculate wear rate
      let wearRate = 0
      if (treadDepths.length >= 2) {
        const recent = treadDepths.slice(0, 3)
        const avgWear = recent.reduce((acc, curr, index) => {
          if (index === 0) return acc
          const timeDiff = new Date(recent[index - 1].measuredAt).getTime() - new Date(curr.measuredAt).getTime()
          const depthDiff = curr.value - recent[index - 1].value
          return acc + (depthDiff / timeDiff) * 1000 * 60 * 60 * 24 * 30 // mm per month
        }, 0) / (recent.length - 1)

        wearRate = avgWear
      }

      // Determine trend
      const trend = wearRate > 0.1 ? 'DECLINING' :
                   wearRate < -0.1 ? 'IMPROVING' : 'STABLE'

      // Update or create KPI
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
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
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

      // Calculate overall health score
      const sidewallConditions = measurements
        .filter(m => m.type === 'SIDEWALL_CONDITION')
        .slice(0, 5)

      const wearPatterns = measurements
        .filter(m => m.type === 'WEAR_PATTERN')
        .slice(0, 5)

      const avgSidewall = sidewallConditions.length > 0
        ? sidewallConditions.reduce((sum, m) => sum + m.value, 0) / sidewallConditions.length
        : 100

      const avgWearPattern = wearPatterns.length > 0
        ? wearPatterns.reduce((sum, m) => sum + m.value, 0) / wearPatterns.length
        : 3

      const overallHealth = (treadLifeRemaining * 0.5) + (avgSidewall * 0.3) + ((6 - avgWearPattern) / 6 * 100 * 0.2)

      await prisma.kPI.upsert({
        where: {
          tireId_type: {
            tireId,
            type: 'OVERALL_HEALTH'
          }
        },
        update: {
          value: Math.max(0, Math.min(100, overallHealth)),
          trend: trend as any,
          calculatedAt: new Date(),
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        },
        create: {
          tireId,
          type: 'OVERALL_HEALTH' as any,
          value: Math.max(0, Math.min(100, overallHealth)),
          unit: 'score',
          trend: trend as any,
          calculatedAt: new Date(),
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      })
    }
  } catch (error) {
    console.error('Error recalculating KPIs:', error)
  }
}
