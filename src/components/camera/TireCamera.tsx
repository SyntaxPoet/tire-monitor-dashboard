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

      // Try different constraint approaches for better compatibility
      const constraints = [
        // First try: Back camera with specific resolution
        {
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: { exact: 'environment' }
          },
          audio: false
        },
        // Second try: Back camera without exact constraint
        {
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'environment'
          },
          audio: false
        },
        // Third try: Any camera
        {
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 }
          },
          audio: false
        },
        // Last try: Basic video
        {
          video: true,
          audio: false
        }
      ]

      let stream = null
      let lastError = null

      // Try each constraint until one works
      for (const constraint of constraints) {
        try {
          console.log('📸 Camera: Trying constraint:', constraint)
          stream = await navigator.mediaDevices.getUserMedia(constraint)
          console.log('📸 Camera: Constraint worked!')
          break
        } catch (err) {
          console.log('📸 Camera: Constraint failed:', err.message)
          lastError = err
        }
      }

      if (!stream) {
        throw lastError || new Error('All camera constraints failed')
      }

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
      let troubleshootingSteps = []

      if (err.name === 'NotAllowedError') {
        errorMessage = 'Camera access denied by user or browser'
        troubleshootingSteps = [
          'Click "Allow" in the browser popup (if shown)',
          'Check browser settings for camera permissions',
          'Try refreshing the page and clicking again',
          'Make sure no other app is using the camera'
        ]
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No camera found on this device'
        troubleshootingSteps = [
          'Check if your device has a camera',
          'Try using a different browser',
          'Restart your browser'
        ]
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'Camera is already in use'
        troubleshootingSteps = [
          'Close other apps that might be using the camera',
          'Restart your browser',
          'Try a different browser'
        ]
      } else if (err.name === 'OverconstrainedError') {
        errorMessage = 'Camera does not support requested settings'
        troubleshootingSteps = [
          'Try a different browser',
          'Check camera capabilities',
          'Try on a different device'
        ]
      } else if (err.name === 'SecurityError') {
        errorMessage = 'Camera access blocked for security reasons'
        troubleshootingSteps = [
          'Make sure you\'re on HTTPS (required for camera access)',
          'Check if you\'re on the same WiFi network as the server',
          'Try a different browser'
        ]
      } else if (err.message?.includes('Camera not supported')) {
        errorMessage = 'Camera not supported on this browser'
        troubleshootingSteps = [
          'Try Chrome, Firefox, or Safari',
          'Update your browser to the latest version',
          'Try on a different device'
        ]
      }

      setError(errorMessage)
      setHasPermission(false)

      // Show troubleshooting steps in console
      if (troubleshootingSteps.length > 0) {
        console.log('🔧 Troubleshooting steps:')
        troubleshootingSteps.forEach((step, i) => {
          console.log(`  ${i + 1}. ${step}`)
        })
      }
    } finally {
      setIsRequestingPermission(false)
    }
  }, [])

  // Initialize camera permission status
  useEffect(() => {
    // Just set initial state, don't auto-request permissions
    console.log('📸 Camera: Component mounted, waiting for user interaction')
  }, [])

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
            <p className="text-red-800 text-sm font-medium">{error}</p>
            <div className="mt-3 text-xs text-red-700">
              <p className="font-medium mb-2">🔧 Troubleshooting steps:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Click the "Grant Camera Access" button above</li>
                <li>Look for a browser popup asking for camera permission</li>
                <li>If no popup appears, check your browser's address bar</li>
                <li>Click the camera icon in the address bar to allow access</li>
                <li>Try refreshing the page and clicking the button again</li>
                <li>Make sure no other apps are using the camera</li>
                <li>Try a different browser (Chrome, Firefox, Safari)</li>
              </ol>
              <p className="mt-2 text-blue-600 font-medium">
                💡 Tip: Check your browser settings → Privacy → Camera permissions
              </p>
            </div>
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
