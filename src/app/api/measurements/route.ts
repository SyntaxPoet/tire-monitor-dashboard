import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tireId = searchParams.get('tireId')
    const limit = parseInt(searchParams.get('limit') || '50')

    if (!tireId) {
      return NextResponse.json(
        { error: 'tireId parameter is required' },
        { status: 400 }
      )
    }

    const measurements = await prisma.measurement.findMany({
      where: { tireId },
      orderBy: { measuredAt: 'desc' },
      take: limit
    })

    return NextResponse.json(measurements)
  } catch (error) {
    console.error('Error fetching measurements:', error)
    return NextResponse.json(
      { error: 'Failed to fetch measurements' },
      { status: 500 }
    )
  }
}
