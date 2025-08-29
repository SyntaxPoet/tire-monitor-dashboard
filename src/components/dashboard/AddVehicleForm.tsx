'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Car, X } from 'lucide-react'

interface AddVehicleFormProps {
  onClose: () => void
  onVehicleAdded: () => void
}

export function AddVehicleForm({ onClose, onVehicleAdded }: AddVehicleFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    make: '',
    model: '',
    year: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('🚗 FORM: Submit button clicked')
    console.log('🚗 FORM: Form data:', formData)

    setLoading(true)
    setError('')

    try {
      console.log('🚗 FORM: Making API request to /api/vehicles...')
      console.log('🚗 FORM: Request payload:', JSON.stringify(formData, null, 2))

      const response = await fetch('/api/vehicles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      console.log('🚗 FORM: API response status:', response.status)
      console.log('🚗 FORM: API response ok:', response.ok)

      if (response.ok) {
        const responseData = await response.json()
        console.log('✅ FORM: Vehicle created successfully:', responseData)
        console.log('🚗 FORM: Calling onVehicleAdded callback...')
        onVehicleAdded()
        console.log('🚗 FORM: Calling onClose callback...')
        onClose()
        console.log('✅ FORM: Form submission completed successfully')
      } else {
        const errorData = await response.json()
        console.error('❌ FORM: API returned error:', errorData)
        console.error('❌ FORM: Error details:', errorData.details)
        setError(errorData.error || errorData.details || 'Failed to add vehicle')
      }
    } catch (err) {
      console.error('❌ FORM: Network or other error:', err)
      console.error('❌ FORM: Error details:', err instanceof Error ? err.message : 'Unknown error')
      console.error('❌ FORM: Error stack:', err instanceof Error ? err.stack : 'No stack trace')
      setError('Network error. Please try again.')
    } finally {
      console.log('🚗 FORM: Setting loading to false')
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              Add New Vehicle
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Vehicle Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Daily Driver"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="make" className="block text-sm font-medium text-gray-700 mb-1">
                  Make
                </label>
                <input
                  type="text"
                  id="make"
                  name="make"
                  value={formData.make}
                  onChange={handleChange}
                  placeholder="e.g., Toyota"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-1">
                  Model
                </label>
                <input
                  type="text"
                  id="model"
                  name="model"
                  value={formData.model}
                  onChange={handleChange}
                  placeholder="e.g., Camry"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-1">
                Year
              </label>
              <input
                type="number"
                id="year"
                name="year"
                value={formData.year}
                onChange={handleChange}
                placeholder="e.g., 2020"
                min="1900"
                max={new Date().getFullYear() + 1}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={loading}
              >
                {loading ? 'Adding...' : 'Add Vehicle'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
