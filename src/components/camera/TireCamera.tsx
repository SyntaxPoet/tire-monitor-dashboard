'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import Webcam from 'react-webcam'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Camera, RotateCcw, Check } from 'lucide-react'

interface TireCameraProps {
  onCapture: (imageData: string, file: File) => void
  tirePosition?: string
}

export function TireCamera({ onCapture, tirePosition }: TireCameraProps) {
  const webcamRef = useRef<Webcam>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [isRequestingPermission, setIsRequestingPermission] = useState(false)

  const capture = useCallback(() => {
    console.log('📸 Camera: Capture button clicked')
    setError(null)

    try {
      const imageSrc = webcamRef.current?.getScreenshot()
      console.log('📸 Camera: Screenshot result:', imageSrc ? 'Success' : 'Failed')

      if (imageSrc) {
        setCapturedImage(imageSrc)
        setIsCapturing(true)

        // Convert base64 to File object
        fetch(imageSrc)
          .then(res => res.blob())
          .then(blob => {
            const file = new File([blob], `tire-${Date.now()}.jpg`, { type: 'image/jpeg' })
            console.log('📸 Camera: File created:', file.name, 'Size:', file.size)
            onCapture(imageSrc, file)
            setIsCapturing(false)
          })
          .catch(err => {
            console.error('📸 Camera: File creation error:', err)
            setError('Failed to process captured image')
            setIsCapturing(false)
          })
      } else {
        setError('Failed to capture image. Please check camera permissions.')
      }
    } catch (err) {
      console.error('📸 Camera: Capture error:', err)
      setError('Camera capture failed. Please try again.')
    }
  }, [onCapture])

  const retake = () => {
    setCapturedImage(null)
  }

  const requestCameraPermission = useCallback(async () => {
    console.log('📸 Camera: Requesting camera permission...')
    setIsRequestingPermission(true)
    setError(null)

    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported on this device/browser')
      }

      // Request camera permission explicitly
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 1280,
          height: 720,
          facingMode: 'environment' // Use back camera on mobile
        },
        audio: false
      })

      console.log('📸 Camera: Permission granted successfully')

      // Stop the stream immediately (we'll get it again from react-webcam)
      stream.getTracks().forEach(track => track.stop())

      setHasPermission(true)
      setError(null)

      // Force re-render of webcam component
      setTimeout(() => {
        if (webcamRef.current) {
          console.log('📸 Camera: Re-initializing webcam component')
        }
      }, 100)

    } catch (err: any) {
      console.error('📸 Camera: Permission request failed:', err)

      let errorMessage = 'Camera permission denied or failed'

      if (err.name === 'NotAllowedError') {
        errorMessage = 'Camera access denied. Please allow camera permissions in your browser settings.'
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No camera found on this device.'
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'Camera is already in use by another application.'
      } else if (err.name === 'OverconstrainedError') {
        errorMessage = 'Camera does not support the requested video quality.'
      } else if (err.name === 'SecurityError') {
        errorMessage = 'Camera access blocked due to security restrictions.'
      }

      setError(errorMessage)
      setHasPermission(false)
    } finally {
      setIsRequestingPermission(false)
    }
  }, [])

  // Auto-request permissions on mount (only if user has likely interacted)
  useEffect(() => {
    // Check if user has recently interacted with the page
    const hasRecentInteraction = sessionStorage.getItem('camera_interaction')

    if (hasPermission === null && !hasRecentInteraction) {
      // Small delay to allow component to render first
      const timer = setTimeout(() => {
        console.log('📸 Camera: Auto-requesting permissions on component mount')
        requestCameraPermission()
      }, 500)

      return () => clearTimeout(timer)
    }
  }, [hasPermission, requestCameraPermission])

  // Mark that user has interacted when they click anything
  const handleUserInteraction = () => {
    sessionStorage.setItem('camera_interaction', 'true')
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Tire Photo Capture
          {tirePosition && <span className="text-sm font-normal">({tirePosition})</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-800 text-sm">{error}</p>
            {error.includes('Camera access denied') && (
              <div className="mt-2 text-xs text-red-700">
                <p><strong>How to fix:</strong></p>
                <ol className="list-decimal list-inside mt-1 space-y-1">
                  <li>Click the "Grant Camera Access" button above</li>
                  <li>Allow camera permissions in the browser popup</li>
                  <li>If no popup appears, check browser settings</li>
                  <li>Try refreshing the page</li>
                </ol>
              </div>
            )}
          </div>
        )}

        {!capturedImage ? (
          <div className="space-y-4">
            <div className="relative rounded-lg overflow-hidden bg-gray-100">
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                videoConstraints={{
                  width: 1280,
                  height: 720,
                  facingMode: 'environment' // Use back camera on mobile
                }}
                className="w-full h-64 object-cover"
                onUserMedia={() => {
                  console.log('📸 Camera: Access granted')
                  setHasPermission(true)
                  setError(null)
                }}
                onUserMediaError={(err) => {
                  console.error('📸 Camera: Access denied or failed:', err)
                  setHasPermission(false)
                  setError('Camera access denied. Please allow camera permissions and refresh the page.')
                }}
              />

              {hasPermission === false && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                  <div className="text-center p-4">
                    <Camera className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600 text-sm mb-4">Camera access required</p>
                                      <Button
                    onClick={() => {
                      handleUserInteraction()
                      requestCameraPermission()
                    }}
                    disabled={isRequestingPermission}
                    className="mb-2"
                  >
                    {isRequestingPermission ? 'Requesting...' : 'Grant Camera Access'}
                  </Button>
                    <p className="text-gray-500 text-xs">
                      Click the button above to allow camera access
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-4">
                Position your camera to capture the entire tire, including sidewall and tread
              </p>

              {/* Debug Info */}
              <div className="text-xs text-gray-500 mb-4 p-2 bg-gray-50 rounded">
                <p>Camera Status: {hasPermission === null ? 'Initializing...' : hasPermission ? '✅ Ready' : '❌ Access Denied'}</p>
                <p>Permission Request: {isRequestingPermission ? 'In Progress...' : 'Idle'}</p>
                <p>Device: {typeof window !== 'undefined' ? (window.navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop') : 'Unknown'}</p>
              </div>

              {/* Permission Request Button */}
              {hasPermission === false && (
                <div className="mb-4">
                  <Button
                    onClick={() => {
                      handleUserInteraction()
                      requestCameraPermission()
                    }}
                    disabled={isRequestingPermission}
                    variant="outline"
                    className="w-full"
                  >
                    {isRequestingPermission ? '🔄 Requesting Camera Access...' : '📷 Grant Camera Access'}
                  </Button>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Click to manually request camera permissions
                  </p>
                </div>
              )}
              <Button
                onClick={() => {
                  handleUserInteraction()
                  capture()
                }}
                size="lg"
                className="w-full"
                disabled={hasPermission === false || isCapturing}
              >
                <Camera className="h-4 w-4 mr-2" />
                {hasPermission === false
                  ? 'Camera Access Required'
                  : isCapturing
                    ? 'Processing...'
                    : 'Capture Photo'
                }
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative rounded-lg overflow-hidden">
              <img
                src={capturedImage}
                alt="Captured tire"
                className="w-full h-64 object-cover"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={retake}
                variant="outline"
                className="flex-1"
                disabled={isCapturing}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Retake
              </Button>
              <Button
                onClick={() => {
                  if (capturedImage) {
                    fetch(capturedImage)
                      .then(res => res.blob())
                      .then(blob => {
                        const file = new File([blob], `tire-${Date.now()}.jpg`, { type: 'image/jpeg' })
                        onCapture(capturedImage, file)
                      })
                  }
                }}
                className="flex-1"
                disabled={isCapturing}
              >
                <Check className="h-4 w-4 mr-2" />
                {isCapturing ? 'Processing...' : 'Use Photo'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
