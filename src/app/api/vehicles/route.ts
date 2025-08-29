import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  console.log('🔍 VEHICLES API: GET request received')
  try {
    console.log('🔍 VEHICLES API: Connecting to database...')
    const vehicles = await prisma.vehicle.findMany({
      include: {
        tires: {
          include: {
            photos: {
              orderBy: { takenAt: 'desc' },
              take: 1
            },
            measurements: {
              orderBy: { measuredAt: 'desc' },
              take: 5
            }
          }
        }
      }
    })
    console.log('✅ VEHICLES API: Successfully fetched vehicles:', vehicles.length)

    return NextResponse.json(vehicles)
  } catch (error) {
    console.error('❌ VEHICLES API ERROR:', error)
    console.error('❌ VEHICLES API ERROR STACK:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { error: 'Failed to fetch vehicles', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  console.log('🔍 VEHICLES API: POST request received')
  try {
    console.log('🔍 VEHICLES API: Parsing request body...')
    const body = await request.json()
    console.log('📝 VEHICLES API: Received body:', JSON.stringify(body, null, 2))

    const { name, make, model, year } = body
    console.log('🔍 VEHICLES API: Extracted data:', { name, make, model, year })

    if (!name || name.trim() === '') {
      console.log('❌ VEHICLES API: Validation failed - name is required')
      return NextResponse.json(
        { error: 'Vehicle name is required' },
        { status: 400 }
      )
    }

    console.log('🔍 VEHICLES API: Creating vehicle in database...')
    const vehicle = await prisma.vehicle.create({
      data: {
        name: name.trim(),
        make: make?.trim() || null,
        model: model?.trim() || null,
        year: year ? parseInt(year) : null
      }
    })
    console.log('✅ VEHICLES API: Vehicle created successfully:', vehicle.id)

    // Create default tires for the vehicle
    const tirePositions = ['FRONT_LEFT', 'FRONT_RIGHT', 'REAR_LEFT', 'REAR_RIGHT']
    console.log('🔍 VEHICLES API: Creating tires for vehicle...')

    await prisma.tire.createMany({
      data: tirePositions.map(position => ({
        vehicleId: vehicle.id,
        position: position as any
      }))
    })
    console.log('✅ VEHICLES API: Tires created successfully')

    // Fetch the complete vehicle with tires
    console.log('🔍 VEHICLES API: Fetching complete vehicle data...')
    const completeVehicle = await prisma.vehicle.findUnique({
      where: { id: vehicle.id },
      include: { tires: true }
    })
    console.log('✅ VEHICLES API: Complete vehicle fetched:', completeVehicle?.tires?.length, 'tires')

    console.log('🎉 VEHICLES API: Vehicle creation completed successfully')
    return NextResponse.json(completeVehicle)
  } catch (error) {
    console.error('❌ VEHICLES API ERROR:', error)
    console.error('❌ VEHICLES API ERROR STACK:', error instanceof Error ? error.stack : 'No stack trace')
    console.error('❌ VEHICLES API ERROR TYPE:', error?.constructor?.name || 'Unknown')

    // Try to get more specific error information
    if (error instanceof Error) {
      console.error('❌ VEHICLES API ERROR MESSAGE:', error.message)
      console.error('❌ VEHICLES API ERROR CAUSE:', error.cause)
    }

    return NextResponse.json(
      {
        error: 'Failed to create vehicle',
        details: error instanceof Error ? error.message : 'Unknown error',
        type: error?.constructor?.name || 'Unknown'
      },
      { status: 500 }
    )
  }
}
