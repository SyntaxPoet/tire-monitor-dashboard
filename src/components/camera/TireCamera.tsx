'use client'

import { useRef, useState, useCallback } from 'react'
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

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot()
    if (imageSrc) {
      setCapturedImage(imageSrc)
      setIsCapturing(true)

      // Convert base64 to File object
      fetch(imageSrc)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], `tire-${Date.now()}.jpg`, { type: 'image/jpeg' })
          onCapture(imageSrc, file)
          setIsCapturing(false)
        })
    }
  }, [onCapture])

  const retake = () => {
    setCapturedImage(null)
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
              />
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-4">
                Position your camera to capture the entire tire, including sidewall and tread
              </p>
              <Button onClick={capture} size="lg" className="w-full">
                <Camera className="h-4 w-4 mr-2" />
                Capture Photo
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
