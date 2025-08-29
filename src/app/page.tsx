'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TireCamera } from '@/components/camera/TireCamera'
import { RecentActivity } from '@/components/dashboard/RecentActivity'
import { TireHealthChart } from '@/components/dashboard/TireHealthChart'
import { AddVehicleForm } from '@/components/dashboard/AddVehicleForm'
import { ContinuousLearningStats } from '@/components/dashboard/ContinuousLearningStats'
import { Car, Camera, BarChart3, Settings, Plus } from 'lucide-react'

interface Vehicle {
  id: string
  name: string
  make?: string
  model?: string
  year?: number
}

interface Tire {
  id: string
  position: string
  vehicleId: string
  photos: any[]
  measurements: any[]
}

export default function Home() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [showCamera, setShowCamera] = useState(false)
  const [selectedTire, setSelectedTire] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalVehicles: 0,
    totalTires: 0,
    photosToday: 0,
    alerts: 0
  })
  const [showAddVehicle, setShowAddVehicle] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  // Critical: Check environment on startup
  useEffect(() => {
    console.log('🚀 CLIENT: Page loaded, checking critical dependencies...')

    // Check if we can reach the API
    fetch('/api/vehicles', { method: 'HEAD' })
      .then(response => {
        console.log('✅ CLIENT: API is reachable, status:', response.status)
        if (!response.ok) {
          console.error('❌ CLIENT: API returned error status:', response.status)
        }
      })
      .catch(error => {
        console.error('❌ CLIENT: Cannot reach API:', error.message)
        console.error('❌ CLIENT: This likely means DATABASE_URL is not set or server failed to start')
      })

    fetchVehicles()
  }, [])

  const fetchVehicles = async () => {
    console.log('🔄 CLIENT: fetchVehicles called')
    try {
      console.log('🔄 CLIENT: Making GET request to /api/vehicles...')
      const response = await fetch('/api/vehicles')
      console.log('🔄 CLIENT: Vehicles API response status:', response.status)
      console.log('🔄 CLIENT: Vehicles API response ok:', response.ok)

      if (response.ok) {
        const data = await response.json()
        console.log('✅ CLIENT: Vehicles data received:', data.length, 'vehicles')
        console.log('✅ CLIENT: Vehicle details:', data.map(v => ({
          name: v.name,
          tires: v.tires?.length || 0
        })))
        setVehicles(data)
        calculateStats(data)
      } else {
        const errorText = await response.text()
        console.error('❌ CLIENT: Failed to fetch vehicles:', errorText)
      }
    } catch (error) {
      console.error('❌ CLIENT: Error fetching vehicles:', error)
      console.error('❌ CLIENT: Error details:', error instanceof Error ? error.message : 'Unknown error')
    } finally {
      console.log('🔄 CLIENT: Setting loading to false')
      setLoading(false)
    }
  }

  const calculateStats = (vehicleData: Vehicle[]) => {
    console.log('📊 CLIENT: Calculating stats for vehicles:', vehicleData.length)
    const totalTires = vehicleData.reduce((sum, vehicle) => {
      console.log('📊 CLIENT: Vehicle', vehicle.name, 'has', vehicle.tires?.length || 0, 'tires')
      return sum + (vehicle.tires?.length || 0)
    }, 0)
    console.log('📊 CLIENT: Total tires calculated:', totalTires)
    setStats({
      totalVehicles: vehicleData.length,
      totalTires,
      photosToday: 0, // TODO: Calculate from today's photos
      alerts: 0 // TODO: Calculate from KPI alerts
    })
  }

  const handleCapture = async (imageData: string, file: File) => {
    console.log('📸 CLIENT: Starting photo capture process')
    console.log('📸 CLIENT: File details:', {
      name: file.name,
      size: file.size,
      type: file.type,
      selectedTire
    })
    console.log('📸 CLIENT: Current URL:', typeof window !== 'undefined' ? window.location.href : 'Server-side')

    try {
      // Find the tire for the selected position
      console.log('📸 CLIENT: Looking for tire with position:', selectedTire)
      const tire = vehicles
        .flatMap(vehicle => {
          console.log('📸 CLIENT: Checking vehicle:', vehicle.name, 'with tires:', vehicle.tires?.length)
          return vehicle.tires || []
        })
        .find(t => t.position === selectedTire)

      if (!tire) {
        console.error('❌ CLIENT: Tire not found for position:', selectedTire)
        console.error('❌ CLIENT: Available vehicles:', vehicles.map(v => ({
          name: v.name,
          tireCount: v.tires?.length,
          positions: v.tires?.map(t => t.position)
        })))
        setShowCamera(false)
        return
      }

      console.log('✅ CLIENT: Found tire:', tire.id, 'for position:', selectedTire)

      // Create form data for upload
      const formData = new FormData()
      formData.append('file', file)
      formData.append('tireId', tire.id)
      formData.append('notes', `Photo captured from ${selectedTire.toLowerCase().replace('_', ' ')}`)

      console.log('📤 CLIENT: Uploading photo to /api/photos...')

      // Upload the photo
      const uploadResponse = await fetch('/api/photos', {
        method: 'POST',
        body: formData
      })

      console.log('📤 CLIENT: Photo upload response status:', uploadResponse.status)
      console.log('📤 CLIENT: Photo upload response ok:', uploadResponse.ok)

      if (uploadResponse.ok) {
        const photoData = await uploadResponse.json()
        console.log('✅ CLIENT: Photo uploaded successfully:', photoData.id)

        console.log('🔄 CLIENT: Processing image with /api/process...')

        // Process the image for analysis
        const processResponse = await fetch('/api/process', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ photoId: photoData.id })
        })

        console.log('🔄 CLIENT: Process response status:', processResponse.status)

        if (processResponse.ok) {
          console.log('✅ CLIENT: Image processed successfully')
          // Refresh vehicle data to show updated stats
          await fetchVehicles()
        } else {
          const processError = await processResponse.text()
          console.error('❌ CLIENT: Image processing failed:', processError)
        }
      } else {
        const uploadError = await uploadResponse.text()
        console.error('❌ CLIENT: Photo upload failed:', uploadError)
      }
    } catch (error) {
      console.error('❌ CLIENT: Error handling captured image:', error)
      console.error('❌ CLIENT: Error details:', error instanceof Error ? error.message : 'Unknown error')
      console.error('❌ CLIENT: Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    } finally {
      console.log('📸 CLIENT: Photo capture process completed')
      setShowCamera(false)
    }
  }

  if (showCamera) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-4">
            <Button
              variant="outline"
              onClick={() => setShowCamera(false)}
            >
              ← Back to Dashboard
            </Button>
          </div>
          <TireCamera
            onCapture={handleCapture}
            tirePosition={selectedTire}
          />
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Car className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-pulse" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Tire Monitor</h2>
          <p className="text-gray-600">Fetching your vehicle data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Car className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Tire Monitor</h1>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(true)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vehicles</CardTitle>
              <Car className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalVehicles}</div>
              <p className="text-xs text-muted-foreground">Active vehicles</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tires</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTires}</div>
              <p className="text-xs text-muted-foreground">Total tires monitored</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Photos Today</CardTitle>
              <Camera className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.photosToday}</div>
              <p className="text-xs text-muted-foreground">Photos captured</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Alerts</CardTitle>
              <div className="h-4 w-4 rounded-full bg-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.alerts}</div>
              <p className="text-xs text-muted-foreground">Issues detected</p>
            </CardContent>
          </Card>
        </div>

        {/* AI Learning Section */}
        <div className="mb-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900">AI Learning Progress</h2>
            <p className="text-sm text-gray-600">See how your tire photos are helping the AI get smarter</p>
          </div>
          <ContinuousLearningStats />
        </div>

        {/* Vehicles Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Your Vehicles</h2>
            <Button onClick={() => {
              console.log('🚗 CLIENT: Add Vehicle button clicked')
              console.log('🚗 CLIENT: Setting showAddVehicle to true')
              setShowAddVehicle(true)
              console.log('✅ CLIENT: Add Vehicle form should now be visible')
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Vehicle
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vehicles.map((vehicle) => (
              <Card key={vehicle.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Car className="h-5 w-5" />
                    {vehicle.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {['FRONT_LEFT', 'FRONT_RIGHT', 'REAR_LEFT', 'REAR_RIGHT'].map((position) => (
                        <Button
                          key={position}
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedTire(position)
                            setShowCamera(true)
                          }}
                          className="text-xs"
                        >
                          <Camera className="h-3 w-3 mr-1" />
                          {position.replace('_', ' ')}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Tire Health Overview */}
        {vehicles.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Tire Health Overview</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {vehicles[0].tires.slice(0, 2).map((tire: any) => (
                <TireHealthChart
                  key={tire.id}
                  tireId={tire.id}
                  tireName={`${tire.position.replace('_', ' ')} - ${vehicles[0].name}`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <RecentActivity vehicles={vehicles} />

        {/* Add Vehicle Form */}
        {showAddVehicle && (
          <AddVehicleForm
            onClose={() => {
              console.log('🚗 CLIENT: AddVehicleForm onClose called')
              console.log('🚗 CLIENT: Setting showAddVehicle to false')
              setShowAddVehicle(false)
              console.log('✅ CLIENT: Add Vehicle form should now be hidden')
            }}
            onVehicleAdded={() => {
              console.log('🚗 CLIENT: AddVehicleForm onVehicleAdded called')
              console.log('🚗 CLIENT: Refreshing vehicle data...')
              fetchVehicles()
              console.log('✅ CLIENT: Vehicle data refresh initiated')
            }}
          />
        )}

        {/* Settings Modal */}
        {showSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Settings</h3>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-2">AI Learning</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Configure how the AI learns from your photos
                  </p>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-2" defaultChecked />
                      <span className="text-sm">Enable automatic photo analysis</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-2" defaultChecked />
                      <span className="text-sm">Save photos for ML training</span>
                    </label>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-2">Notifications</h4>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-2" defaultChecked />
                      <span className="text-sm">Maintenance reminders</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-2" defaultChecked />
                      <span className="text-sm">Tire health alerts</span>
                    </label>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-2">System Info</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>Vehicles: {stats.totalVehicles}</p>
                    <p>Tires: {stats.totalTires}</p>
                    <p>Photos Today: {stats.photosToday}</p>
                    <p>Server: http://localhost:3001</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={() => setShowSettings(false)}
                    className="flex-1"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
