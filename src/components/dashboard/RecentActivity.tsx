'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Camera, TrendingUp, AlertTriangle } from 'lucide-react'

interface RecentPhoto {
  id: string
  fileName: string
  takenAt: string
  tire: {
    position: string
    vehicle: {
      name: string
    }
  }
  measurements: Array<{
    type: string
    value: number
    unit: string
  }>
}

interface RecentActivityProps {
  vehicles: any[]
}

export function RecentActivity({ vehicles }: RecentActivityProps) {
  const [recentPhotos, setRecentPhotos] = useState<RecentPhoto[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRecentActivity()
  }, [vehicles])

  const fetchRecentActivity = async () => {
    if (vehicles.length === 0) {
      setLoading(false)
      return
    }

    try {
      // Get recent photos from all vehicles
      const allPhotos: RecentPhoto[] = []

      for (const vehicle of vehicles) {
        for (const tire of vehicle.tires) {
          const response = await fetch(`/api/photos?tireId=${tire.id}`)
          if (response.ok) {
            const photos = await response.json()
            allPhotos.push(...photos.slice(0, 3)) // Get up to 3 photos per tire
          }
        }
      }

      // Sort by taken date and take the most recent 10
      const sortedPhotos = allPhotos
        .sort((a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime())
        .slice(0, 10)

      setRecentPhotos(sortedPhotos)
    } catch (error) {
      console.error('Error fetching recent activity:', error)
    } finally {
      setLoading(false)
    }
  }

  const getHealthColor = (measurements: any[]) => {
    if (measurements.length === 0) return 'text-gray-500'

    const treadDepth = measurements.find(m => m.type === 'TREAD_DEPTH')?.value || 6.5
    if (treadDepth < 3) return 'text-red-600'
    if (treadDepth < 5) return 'text-yellow-600'
    return 'text-green-600'
  }

  const getHealthIcon = (measurements: any[]) => {
    if (measurements.length === 0) return <Camera className="h-4 w-4" />

    const treadDepth = measurements.find(m => m.type === 'TREAD_DEPTH')?.value || 6.5
    if (treadDepth < 3) return <AlertTriangle className="h-4 w-4" />
    if (treadDepth < 5) return <TrendingUp className="h-4 w-4" />
    return <Camera className="h-4 w-4" />
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-4 animate-pulse">
                <div className="w-10 h-10 bg-gray-200 rounded"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (recentPhotos.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-8">
            No recent activity. Start by capturing some tire photos!
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentPhotos.map((photo) => (
            <div key={photo.id} className="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50">
              <div className={`p-2 rounded-full ${getHealthColor(photo.measurements)} bg-gray-100`}>
                {getHealthIcon(photo.measurements)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {photo.tire.vehicle.name} - {photo.tire.position.replace('_', ' ')}
                </p>
                <p className="text-sm text-gray-500">
                  {new Date(photo.takenAt).toLocaleDateString()} at{' '}
                  {new Date(photo.takenAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
                {photo.measurements.length > 0 && (
                  <div className="flex gap-2 mt-1">
                    {photo.measurements.slice(0, 2).map((measurement, index) => (
                      <span key={index} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {measurement.type.replace('_', ' ')}: {measurement.value}{measurement.unit}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        {recentPhotos.length >= 10 && (
          <div className="mt-4 text-center">
            <button className="text-sm text-blue-600 hover:text-blue-800">
              View all activity →
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
