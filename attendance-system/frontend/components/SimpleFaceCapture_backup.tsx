'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface SimpleFaceCaptureProps {
  isOpen: boolean
  onClose: () => void
  onComplete: (images: string[]) => void
}

export function SimpleFaceCapture({ isOpen, onClose, onComplete }: SimpleFaceCaptureProps) {
  const [isStreaming, setIsStreaming] = useState(false)
  const [capturedImages, setCapturedImages] = useState<string[]>([])
  const [isCapturing, setIsCapturing] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [step, setStep] = useState<'setup' | 'starting' | 'ready' | 'capturing' | 'preview'>('setup')
  const [error, setError] = useState('')

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const requiredPhotos = 3

  // Initialize camera
  const startCamera = async () => {
    try {
      setError('')
      setStep('starting') // Add loading state
      
      // Check if mediaDevices is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported in this browser')
      }

      console.log('Requesting camera access...')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          facingMode: 'user'
        },
        audio: false
      })

      console.log('Camera access granted, setting up video...')

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        
        videoRef.current.onloadedmetadata = () => {
          console.log('Video metadata loaded')
          videoRef.current?.play().then(() => {
            console.log('Video playing successfully')
            setIsStreaming(true)
            setStep('ready')
          }).catch((playError) => {
            console.error('Error playing video:', playError)
            setError('Error starting video playback')
          })
        }

        videoRef.current.onerror = (e) => {
          console.error('Video error:', e)
          setError('Video playback error')
        }
      }
    } catch (error: any) {
      console.error('Camera error:', error)
      let errorMessage = 'Unable to access camera. '
      
      if (error.name === 'NotAllowedError') {
        errorMessage += 'Please allow camera access and try again.'
      } else if (error.name === 'NotFoundError') {
        errorMessage += 'No camera found on this device.'
      } else if (error.name === 'NotReadableError') {
        errorMessage += 'Camera is already in use by another application.'
      } else {
        errorMessage += `Error: ${error.message || error.name}`
      }
      
      setError(errorMessage)
      setStep('setup')
    }
  }

  // Capture photo
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current || isCapturing) return

    setIsCapturing(true)
    
    // Start countdown
    setCountdown(3)
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev && prev <= 1) {
          clearInterval(countdownInterval)
          setTimeout(() => {
            setCountdown(null)
            takePhoto()
          }, 500)
          return 0
        }
        return prev ? prev - 1 : 0
      })
    }, 1000)
  }

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    if (!ctx) return

    // Set canvas size to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Mirror the image horizontally
    ctx.scale(-1, 1)
    ctx.drawImage(video, -canvas.width, 0)

    const imageData = canvas.toDataURL('image/jpeg', 0.9)
    
    setCapturedImages(prev => {
      const newImages = [...prev, imageData]
      
      if (newImages.length >= requiredPhotos) {
        setTimeout(() => {
          setStep('preview')
        }, 500)
      }
      
      return newImages
    })

    setIsCapturing(false)
  }

  // Complete capture process
  const handleComplete = () => {
    onComplete(capturedImages)
    handleClose()
  }

  // Reset and try again
  const handleRetry = () => {
    setCapturedImages([])
    setStep('ready')
  }

  // Close and cleanup
  const handleClose = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setIsStreaming(false)
    setCapturedImages([])
    setStep('setup')
    setError('')
    onClose()
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative w-full max-w-2xl mx-4 bg-gray-900 rounded-2xl overflow-hidden shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <div>
              <h2 className="text-2xl font-bold text-white">Face Capture</h2>
              <p className="text-gray-400 mt-1">Take {requiredPhotos} clear photos for verification</p>
            </div>
            <button
              onClick={handleClose}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {error && (
              <div className="mb-4 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
                {error}
              </div>
            )}

            {/* Setup Step */}
            {step === 'setup' && (
              <div className="text-center py-12">
                <div className="mb-6">
                  <div className="w-24 h-24 mx-auto bg-blue-600 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">Ready to Start</h3>
                  <p className="text-gray-400">We'll guide you through taking clear photos</p>
                </div>

                <button
                  onClick={startCamera}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors"
                >
                  Start Camera
                </button>
              </div>
            )}

            {/* Starting/Loading Step */}
            {step === 'starting' && (
              <div className="text-center py-12">
                <div className="mb-6">
                  <div className="w-24 h-24 mx-auto bg-blue-600 rounded-full flex items-center justify-center mb-4 animate-pulse">
                    <svg className="w-12 h-12 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">Starting Camera...</h3>
                  <p className="text-gray-400">Please allow camera access when prompted</p>
                </div>
              </div>
            )}

            {/* Camera View */}
            {(step === 'ready' || step === 'capturing') && (
              <div className="relative">
                <div className="relative aspect-video bg-gray-800 rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                  
                  {/* Face guide overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-64 h-80 border-4 border-blue-400 border-dashed rounded-full opacity-70"></div>
                  </div>

                  {/* Countdown overlay */}
                  {countdown !== null && countdown > 0 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <motion.div
                        key={countdown}
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1.2, opacity: 1 }}
                        exit={{ scale: 1.5, opacity: 0 }}
                        className="text-8xl font-bold text-white"
                      >
                        {countdown}
                      </motion.div>
                    </div>
                  )}

                  {/* Progress indicator */}
                  <div className="absolute top-4 left-4">
                    <div className="bg-black/70 text-white px-4 py-2 rounded-lg">
                      {capturedImages.length} / {requiredPhotos} photos
                    </div>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex justify-center mt-6 space-x-4">
                  <button
                    onClick={capturePhoto}
                    disabled={isCapturing}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-8 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{isCapturing ? 'Capturing...' : 'Take Photo'}</span>
                  </button>
                </div>

                {/* Captured photos preview */}
                {capturedImages.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-white font-medium mb-3">Captured Photos:</h4>
                    <div className="flex space-x-3">
                      {capturedImages.map((image, index) => (
                        <div key={index} className="relative">
                          <img
                            src={image}
                            alt={`Captured ${index + 1}`}
                            className="w-20 h-20 rounded-lg object-cover"
                          />
                          <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs">✓</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Preview Step */}
            {step === 'preview' && (
              <div className="text-center py-6">
                <div className="mb-6">
                  <div className="w-16 h-16 mx-auto bg-green-600 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">Photos Captured!</h3>
                  <p className="text-gray-400">Review your photos and confirm</p>
                </div>

                <div className="flex justify-center space-x-4 mb-6">
                  {capturedImages.map((image, index) => (
                    <img
                      key={index}
                      src={image}
                      alt={`Preview ${index + 1}`}
                      className="w-24 h-24 rounded-lg object-cover"
                    />
                  ))}
                </div>

                <div className="flex justify-center space-x-4">
                  <button
                    onClick={handleRetry}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    Retake Photos
                  </button>
                  <button
                    onClick={handleComplete}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    Confirm & Continue
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Hidden canvas for image capture */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}