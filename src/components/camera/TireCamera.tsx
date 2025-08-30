'use client'

import React, { useRef, useState, useCallback, useEffect } from 'react'
import Webcam from 'react-webcam'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Camera, RotateCcw, Check } from 'lucide-react'

interface TireCameraProps {
  onCapture: (imageData: string, file: File) => void
  tirePosition?: string
}

interface BrowserCompatibilityInfo {
  supportsCamera: boolean
  browserName: string
  browserVersion: string
  recommendations: string[]
}

export function TireCamera({ onCapture, tirePosition }: TireCameraProps) {
  const webcamRef = useRef<Webcam>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [isRequestingPermission, setIsRequestingPermission] = useState(false)
  const [browserCompatibility, setBrowserCompatibility] = useState<BrowserCompatibilityInfo | null>(null)

  // Browser detection helper
  const getBrowserInfo = () => {
    const ua = navigator.userAgent
    let browser = 'Unknown'
    let version = 'Unknown'

    // Detect browser
    if (ua.includes('Chrome')) {
      browser = 'Chrome'
      const match = ua.match(/Chrome\/(\d+)/)
      version = match ? match[1] : 'Unknown'
    } else if (ua.includes('Firefox')) {
      browser = 'Firefox'
      const match = ua.match(/Firefox\/(\d+)/)
      version = match ? match[1] : 'Unknown'
    } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
      browser = 'Safari'
      const match = ua.match(/Version\/(\d+)/)
      version = match ? match[1] : 'Unknown'
    } else if (ua.includes('Edge')) {
      browser = 'Edge'
      const match = ua.match(/Edge\/(\d+)/)
      version = match ? match[1] : 'Unknown'
    } else if (ua.includes('Opera')) {
      browser = 'Opera'
      const match = ua.match(/Opera\/(\d+)/)
      version = match ? match[1] : 'Unknown'
    }

    return { name: browser, version }
  }

  // Check browser compatibility
  const checkBrowserCompatibility = (): BrowserCompatibilityInfo => {
    const browserInfo = getBrowserInfo()
    const supportsCamera = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)

    let recommendations: string[] = []

    if (!supportsCamera) {
      // Check if it's a known browser that should support it
      if (browserInfo.name === 'Chrome' && parseInt(browserInfo.version) >= 14) {
        recommendations = [
          'Chrome should support camera - try refreshing the page',
          'Check if you\'re in incognito/private mode',
          'Disable browser extensions temporarily',
          'Try restarting Chrome completely'
        ]
      } else if (browserInfo.name === 'Firefox' && parseInt(browserInfo.version) >= 17) {
        recommendations = [
          'Firefox should support camera - try refreshing the page',
          'Check media permissions in Firefox settings',
          'Try disabling browser extensions'
        ]
      } else if (browserInfo.name === 'Safari') {
        recommendations = [
          'Safari should support camera - try these steps:',
          'Settings → Safari → Camera → Allow',
          'Clear History and Website Data',
          'Restart Safari completely'
        ]
      } else {
        recommendations = [
          '❌ CRITICAL: This browser does not support camera access',
          '✅ RECOMMENDED: Use Chrome, Firefox, or Safari',
          '✅ Download Chrome: google.com/chrome',
          '✅ Or use the file upload option below',
          'ℹ️  Some browsers (especially older versions) lack camera API support'
        ]
      }
    }

    return {
      supportsCamera,
      browserName: browserInfo.name,
      browserVersion: browserInfo.version,
      recommendations
    }
  }

  // Handle file upload as fallback
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      console.log('📸 File upload: Processing uploaded image')
      setIsCapturing(true)
      const reader = new FileReader()
      reader.onload = (e) => {
        const imageData = e.target?.result as string
        onCapture(imageData, file)
        setCapturedImage(imageData)
        setIsCapturing(false)
        console.log('📸 File upload: Successfully processed image')
      }
      reader.onerror = (error) => {
        console.error('📸 File upload: Failed to read file', error)
        setError('Failed to process uploaded image')
        setIsCapturing(false)
      }
      reader.readAsDataURL(file)
    }
  }

  // Alternative: Try to use input with capture attribute for mobile
  const handleCameraCapture = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.capture = 'environment' // Try to use back camera on mobile
    input.onchange = (e) => handleFileUpload(e as any)
    input.click()
  }

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
        const browserInfo = getBrowserInfo()
        throw new Error(`GetUserMedia is not implemented in this browser (${browserInfo.name} ${browserInfo.version}). Camera access requires a modern browser with WebRTC support.`)
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
      } else if (err.message?.includes('GetUserMedia is not implemented')) {
        errorMessage = 'Camera not supported in this browser'
        troubleshootingSteps = [
          '✅ RECOMMENDED: Use Chrome, Firefox, or Safari',
          '✅ Update your browser to the latest version',
          '✅ Try on a different device with a modern browser',
          'ℹ️  Some browsers (especially older versions) don\'t support camera access',
          'ℹ️  Check if you\'re using an embedded browser or app'
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

  // Initialize camera permission status and check browser compatibility
  useEffect(() => {
    const compatibility = checkBrowserCompatibility()
    setBrowserCompatibility(compatibility)
    console.log('📸 Camera: Component mounted')
    console.log('📸 Browser Compatibility:', compatibility)
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
        {/* Browser Compatibility Warning */}
        {browserCompatibility && !browserCompatibility.supportsCamera && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800 text-lg font-bold">
              🚫 Camera API Not Supported in {browserCompatibility.browserName}
            </p>
            <div className="mt-3 text-sm text-red-700">
              <p className="font-medium mb-2">This browser doesn't support camera access. Here are your options:</p>

              {/* Primary Solution */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                <p className="font-semibold text-blue-800 mb-2">✅ RECOMMENDED: Use a Modern Browser</p>
                <ul className="list-disc list-inside space-y-1 text-blue-700">
                  {browserCompatibility.recommendations.slice(0, 3).map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>

              {/* Alternative Solution */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="font-semibold text-green-800 mb-2">📁 ALTERNATIVE: Upload Photos from Device</p>
                <p className="text-green-700 mb-3">You can still take tire photos and get AI analysis using file upload:</p>
                <ol className="list-decimal list-inside space-y-1 text-green-700">
                  <li>Take photos with your phone's camera app</li>
                  <li>Use the upload button below to select photos</li>
                  <li>Get the same AI tire analysis and tracking</li>
                </ol>
              </div>
            </div>
          </div>
        )}

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
            {/* Only show webcam if camera API is supported */}
            {browserCompatibility?.supportsCamera !== false && (
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

                    // Provide specific error messages
                    let errorMessage = 'Camera access failed. '
                    if (err.name === 'NotAllowedError') {
                      errorMessage += 'Please allow camera permissions in your browser settings.'
                    } else if (err.name === 'NotFoundError') {
                      errorMessage += 'No camera found on this device.'
                    } else if (err.name === 'NotReadableError') {
                      errorMessage += 'Camera is already in use by another app.'
                    } else if (err.name === 'OverconstrainedError') {
                      errorMessage += 'Camera does not support the requested settings.'
                    } else {
                      errorMessage += 'Please check your browser settings and try again.'
                    }

                    setError(errorMessage)
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

              {/* Show camera placeholder when API not supported */}
              {browserCompatibility?.supportsCamera === false && (
                <div className="relative rounded-lg overflow-hidden bg-gray-100 h-64 flex items-center justify-center">
                  <div className="text-center p-6">
                    <Camera className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium">Camera Not Available</p>
                    <p className="text-sm text-gray-400 mt-1">Use the upload options below</p>
                  </div>
                </div>
              )}
            </div>

            {/* Only show debug info and controls if camera API is supported */}
            {browserCompatibility?.supportsCamera !== false && (
              <div className="text-center">
              <p className="text-sm text-gray-600 mb-4">
                Position your camera to capture the entire tire, including sidewall and tread
              </p>

                                   {/* Debug Info */}
                     <div className="text-xs text-gray-500 mb-4 p-2 bg-gray-50 rounded">
                       <p>Camera Status: {hasPermission === null ? 'Initializing...' : hasPermission ? '✅ Ready' : '❌ Access Denied'}</p>
                       <p>Permission Request: {isRequestingPermission ? 'In Progress...' : 'Idle'}</p>
                       <p>Device: {typeof window !== 'undefined' ? (window.navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop') : 'Unknown'}</p>
                       {browserCompatibility && (
                         <p>Browser: {browserCompatibility.browserName} {browserCompatibility.browserVersion} {browserCompatibility.supportsCamera ? '(✅ Camera Supported)' : '(❌ Camera Not Supported)'}</p>
                       )}
                     </div>

                     {/* Debug Buttons */}
                     <div className="mb-4 flex gap-2">
                       <Button
                         onClick={() => {
                           console.log('🔍 DEBUG INFO:')
                           console.log('Browser:', navigator.userAgent)
                           console.log('Has mediaDevices:', !!navigator.mediaDevices)
                           console.log('Has getUserMedia:', !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia))
                           console.log('Browser compatibility:', browserCompatibility)
                           console.log('Has permission:', hasPermission)
                           alert('Debug info logged to console. Press F12 to view.')
                         }}
                         variant="outline"
                         size="sm"
                         className="text-xs"
                       >
                         🔍 Debug Info
                       </Button>

                       <Button
                         onClick={async () => {
                           console.log('🧪 TESTING BASIC CAMERA API...')
                           try {
                             if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                               throw new Error('getUserMedia not supported')
                             }

                             const stream = await navigator.mediaDevices.getUserMedia({
                               video: { width: 640, height: 480 },
                               audio: false
                             })

                             console.log('✅ Basic camera API works!')
                             console.log('Stream tracks:', stream.getTracks().length)

                             // Stop the stream immediately
                             stream.getTracks().forEach(track => track.stop())

                             alert('✅ Camera API is working! The issue is with the webcam component.')
                           } catch (err: any) {
                             console.error('❌ Basic camera API failed:', err)
                             alert(`❌ Camera API failed: ${err.message}`)
                           }
                         }}
                         variant="outline"
                         size="sm"
                         className="text-xs"
                       >
                         🧪 Test Camera API
                       </Button>
                     </div>

                                   {/* Permission Request Button */}
                     {hasPermission === false && (
                       <div className="mb-4 space-y-3">
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
                         <p className="text-xs text-gray-500 text-center">
                           Click to manually request camera permissions
                         </p>

                         {/* File Upload Fallback */}
                         {browserCompatibility && !browserCompatibility.supportsCamera && (
                           <div className="border-t pt-4 mt-4">
                             <p className="text-lg font-bold text-gray-800 mb-3">
                               📸 Take Photos with Your Phone Camera
                             </p>
                             <div className="space-y-3">
                               {/* Option 1: Direct Camera Capture */}
                               <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                 <p className="font-semibold text-green-800 mb-2">📱 Option 1: Use Phone Camera App</p>
                                 <p className="text-sm text-green-700 mb-2">Take photos with your phone's built-in camera app, then upload them here:</p>
                                 <Button
                                   onClick={() => {
                                     const input = document.createElement('input')
                                     input.type = 'file'
                                     input.accept = 'image/*'
                                     input.multiple = true
                                     input.onchange = (e) => handleFileUpload(e as any)
                                     input.click()
                                   }}
                                   className="w-full bg-green-600 hover:bg-green-700"
                                   disabled={isCapturing}
                                 >
                                   <Camera className="h-4 w-4 mr-2" />
                                   {isCapturing ? 'Processing...' : '📁 Upload Tire Photos'}
                                 </Button>
                               </div>

                               {/* Option 2: Try HTML5 Camera Capture */}
                               <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                 <p className="font-semibold text-blue-800 mb-2">📷 Option 2: Try Direct Camera Capture</p>
                                 <p className="text-sm text-blue-700 mb-2">Some mobile browsers support direct camera capture:</p>
                                 <Button
                                   onClick={handleCameraCapture}
                                   variant="outline"
                                   className="w-full border-blue-300 text-blue-700 hover:bg-blue-50"
                                   disabled={isCapturing}
                                 >
                                   <Camera className="h-4 w-4 mr-2" />
                                   {isCapturing ? 'Processing...' : '📷 Try Camera Capture'}
                                 </Button>
                               </div>

                               {/* Instructions */}
                               <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                 <p className="font-semibold text-yellow-800 mb-2">📋 How to Use:</p>
                                 <ol className="text-sm text-yellow-700 list-decimal list-inside space-y-1">
                                   <li>Open your phone's camera app</li>
                                   <li>Take clear photos of your tires</li>
                                   <li>Click "Upload Tire Photos" above</li>
                                   <li>Select the photos you just took</li>
                                   <li>Get AI analysis and tracking as usual!</li>
                                 </ol>
                               </div>
                             </div>
                           </div>
                         )}
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
            )}
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
