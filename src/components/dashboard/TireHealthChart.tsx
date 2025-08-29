'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp } from 'lucide-react'

interface HealthData {
  date: string
  treadDepth: number
  sidewallCondition: number
  overallHealth: number
}

interface TireHealthChartProps {
  tireId: string
  tireName: string
}

export function TireHealthChart({ tireId, tireName }: TireHealthChartProps) {
  const [healthData, setHealthData] = useState<HealthData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchHealthData()
  }, [tireId])

  const fetchHealthData = async () => {
    try {
      // Fetch measurements for this tire
      const response = await fetch(`/api/measurements?tireId=${tireId}&limit=20`)
      if (response.ok) {
        const measurements = await response.json()

        // Group measurements by date
        const groupedByDate: { [key: string]: any } = {}

        measurements.forEach((measurement: any) => {
          const date = new Date(measurement.measuredAt).toISOString().split('T')[0]
          if (!groupedByDate[date]) {
            groupedByDate[date] = { date }
          }

          if (measurement.type === 'TREAD_DEPTH') {
            groupedByDate[date].treadDepth = measurement.value
          } else if (measurement.type === 'SIDEWALL_CONDITION') {
            groupedByDate[date].sidewallCondition = measurement.value
          }
        })

        // Calculate overall health and convert to array
        const chartData = Object.values(groupedByDate)
          .map((item: any) => ({
            ...item,
            overallHealth: calculateOverallHealth(item.treadDepth, item.sidewallCondition)
          }))
          .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .slice(-10) // Show last 10 data points

        setHealthData(chartData)
      }
    } catch (error) {
      console.error('Error fetching health data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateOverallHealth = (treadDepth?: number, sidewallCondition?: number): number => {
    let health = 100

    if (treadDepth !== undefined) {
      // Tread depth contribution (8mm = 100%, 2mm = 25%)
      health *= Math.max(0.25, treadDepth / 8)
    }

    if (sidewallCondition !== undefined) {
      // Sidewall condition contribution (100% = perfect, 50% = poor)
      health *= sidewallCondition / 100
    }

    return Math.round(health)
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {tireName} Health Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="animate-pulse text-gray-500">Loading health data...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (healthData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {tireName} Health Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <p className="text-gray-500">No health data available yet</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          {tireName} Health Trend
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={healthData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => new Date(value).toLocaleDateString()}
                fontSize={12}
              />
              <YAxis domain={[0, 100]} fontSize={12} />
              <Tooltip
                labelFormatter={(value) => new Date(value).toLocaleDateString()}
                formatter={(value: number, name: string) => [
                  `${value}${name === 'overallHealth' ? '%' : name === 'treadDepth' ? 'mm' : '%'}`,
                  name === 'treadDepth' ? 'Tread Depth' :
                  name === 'sidewallCondition' ? 'Sidewall' : 'Overall Health'
                ]}
              />
              <Line
                type="monotone"
                dataKey="overallHealth"
                stroke="#2563eb"
                strokeWidth={2}
                dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
                name="overallHealth"
              />
              <Line
                type="monotone"
                dataKey="treadDepth"
                stroke="#10b981"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
                name="treadDepth"
              />
              <Line
                type="monotone"
                dataKey="sidewallCondition"
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: '#f59e0b', strokeWidth: 2, r: 3 }}
                name="sidewallCondition"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-blue-600"></div>
            <span>Overall Health</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-green-600 opacity-60 border-dashed border-t"></div>
            <span>Tread Depth</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-yellow-600 opacity-60 border-dashed border-t"></div>
            <span>Sidewall</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
