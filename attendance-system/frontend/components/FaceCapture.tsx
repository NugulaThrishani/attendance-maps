'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, Check, RotateCcw, AlertCircle, User } from 'lucide-react'
import { Button } from './ui/button'

interface FaceCaptureProps {
  onImagesCapture: (images: string[]) => void
  isOpen: boolean
  onClose: () => void
  requiredImages?: number
}

export default function FaceCapture({ 
  onImagesCapture, 
  isOpen, 
  onClose, 
  requiredImages = 5 
}: FaceCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [capturedImages, setCapturedImages] = useState<string[]>([])
  const [currentStep, setCurrentStep] = useState<'setup' | 'capturing' | 'preview'>('setup')
  const [error, setError] = useState('')
  const [isCapturing, setIsCapturing] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)

  const startCamera = useCallback(async () => {
    try {
      setError('')
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: 640, 
          height: 480,
          facingMode: 'user'
        } 
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setIsStreaming(true)
        setCurrentStep('capturing')
      }
    } catch (err: any) {
      console.error('Camera access error:', err)
      setError('Unable to access camera. Please ensure camera permissions are enabled.')
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
      videoRef.current.srcObject = null
    }
    setIsStreaming(false)
  }, [])

  const captureImage = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || isCapturing) return

    setIsCapturing(true)
    
    // Countdown effect
    let count = 3
    setCountdown(count)
    
    const countdownInterval = setInterval(() => {
      count--
      setCountdown(count)
      
      if (count === 0) {
        clearInterval(countdownInterval)
        setCountdown(null)
        
        // Actual capture
        const canvas = canvasRef.current!
        const video = videoRef.current!
        const ctx = canvas.getContext('2d')!

        // Set canvas dimensions to match video
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight

        // Flip the image horizontally for natural selfie effect
        ctx.scale(-1, 1)
        ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height)
        ctx.scale(-1, 1) // Reset scale

        // Convert to base64
        const imageData = canvas.toDataURL('image/jpeg', 0.8)
        
        setCapturedImages(prev => {
          const newImages = [...prev, imageData]
          
          if (newImages.length >= requiredImages) {
            stopCamera()
            setCurrentStep('preview')
          }
          
          return newImages
        })
        
        setIsCapturing(false)
      }
    }, 1000)
  }, [requiredImages, stopCamera, isCapturing])

  const resetCapture = useCallback(() => {
    setCapturedImages([])
    setCurrentStep('setup')
    setCountdown(null)
    setIsCapturing(false)
    stopCamera()
  }, [stopCamera])

  const confirmImages = useCallback(() => {
    onImagesCapture(capturedImages)
    onClose()
  }, [capturedImages, onImagesCapture, onClose])

  useEffect(() => {
    if (!isOpen) {
      stopCamera()
      setCapturedImages([])
      setCurrentStep('setup')
      setError('')
    }
  }, [isOpen, stopCamera])

  if (!isOpen) return null

  return (
    <motion.div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Camera className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Face Registration</h2>
              <p className="text-gray-600">Capture {requiredImages} clear photos of your face</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {currentStep === 'setup' && (
            <motion.div
              className="text-center space-y-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="bg-blue-50 p-6 rounded-xl">
                <User className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Setup Instructions</h3>
                <ul className="text-sm text-gray-600 space-y-2 text-left max-w-md mx-auto">
                  <li className="flex items-start space-x-2">
                    <span className="w-2 h-2 bg-blue-600 rounded-full mt-1.5 flex-shrink-0"></span>
                    <span>Position your face clearly in the camera frame</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="w-2 h-2 bg-blue-600 rounded-full mt-1.5 flex-shrink-0"></span>
                    <span>Look directly at the camera</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="w-2 h-2 bg-blue-600 rounded-full mt-1.5 flex-shrink-0"></span>
                    <span>Ensure good lighting</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="w-2 h-2 bg-blue-600 rounded-full mt-1.5 flex-shrink-0"></span>
                    <span>Try different angles for better recognition</span>
                  </li>
                </ul>
              </div>

              {error && (
                <motion.div
                  className="flex items-center space-x-2 p-3 bg-red-100 border border-red-300 rounded-lg text-red-700"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-sm">{error}</span>
                </motion.div>
              )}

              <Button
                onClick={startCamera}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium"
              >
                <Camera className="w-5 h-5 mr-2" />
                Start Camera
              </Button>
            </motion.div>
          )}

          {currentStep === 'capturing' && (
            <motion.div
              className="space-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-96 object-cover rounded-lg"
                  style={{ transform: 'scaleX(-1)' }} // Mirror effect for better UX
                />
                <canvas
                  ref={canvasRef}
                  className="hidden"
                />
                
                {/* Enhanced face outline guide with animations */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <motion.div 
                    className="relative"
                    animate={{ 
                      scale: isStreaming ? [1, 1.02, 1] : 1,
                    }}
                    transition={{ 
                      repeat: Infinity, 
                      duration: 2,
                      ease: "easeInOut"
                    }}
                  >
                    {/* Main face guide */}
                    <div className="w-64 h-80 border-4 border-blue-400 border-dashed rounded-full opacity-70"></div>
                    
                    {/* Corner markers */}
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                    </div>
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                    </div>
                    <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                    </div>
                    <div className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                    </div>
                  </motion.div>
                </div>

                {/* Camera status indicator */}
                <div className="absolute top-4 left-4 flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-white text-sm font-medium bg-black/50 px-2 py-1 rounded">
                    LIVE
                  </span>
                </div>

                {/* Instructions overlay */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-black/70 text-white px-4 py-2 rounded-lg text-sm text-center max-w-xs">
                    Position your face within the oval guide
                  </div>
                </div>

                {/* Countdown overlay */}
                {countdown !== null && (
                  <motion.div
                    className="absolute inset-0 bg-black/50 flex items-center justify-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <motion.div
                      className="bg-white rounded-full w-24 h-24 flex items-center justify-center"
                      initial={{ scale: 0 }}
                      animate={{ scale: [0, 1.2, 1] }}
                      key={countdown}
                      transition={{ duration: 0.6 }}
                    >
                      <span className="text-4xl font-bold text-blue-600">
                        {countdown === 0 ? '📸' : countdown}
                      </span>
                    </motion.div>
                  </motion.div>
                )}
              </div>

              {/* Enhanced progress indicator */}
              <div className="text-center space-y-4">
                <div className="flex justify-center space-x-3">
                  {Array.from({ length: requiredImages }).map((_, index) => (
                    <motion.div
                      key={index}
                      className={`w-4 h-4 rounded-full flex items-center justify-center ${
                        index < capturedImages.length
                          ? 'bg-green-500 text-white'
                          : index === capturedImages.length
                          ? 'bg-blue-500 animate-pulse'
                          : 'bg-gray-300'
                      }`}
                      animate={{
                        scale: index === capturedImages.length ? [1, 1.2, 1] : 1
                      }}
                      transition={{
                        repeat: index === capturedImages.length ? Infinity : 0,
                        duration: 1
                      }}
                    >
                      {index < capturedImages.length && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="text-xs font-bold"
                        >
                          ✓
                        </motion.div>
                      )}
                    </motion.div>
                  ))}
                </div>
                <div className="space-y-2">
                  <p className="text-xl font-bold text-gray-800">
                    {capturedImages.length} / {requiredImages} photos captured
                  </p>
                  {capturedImages.length < requiredImages && (
                    <motion.p 
                      className="text-blue-600 text-sm"
                      animate={{ opacity: [0.7, 1, 0.7] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    >
                      {capturedImages.length === 0 
                        ? "Click 'Capture Photo' when ready"
                        : `${requiredImages - capturedImages.length} more photos needed`
                      }
                    </motion.p>
                  )}
                </div>

                {/* Show thumbnails of captured images */}
                {capturedImages.length > 0 && (
                  <motion.div
                    className="flex justify-center space-x-2 mt-4"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {capturedImages.map((image, index) => (
                      <motion.div
                        key={index}
                        className="relative w-12 h-12 rounded-lg overflow-hidden border-2 border-green-300"
                        initial={{ scale: 0, rotate: -10 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <img
                          src={image}
                          alt={`Captured ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </div>

              <div className="flex justify-center space-x-4">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    onClick={captureImage}
                    disabled={!isStreaming || isCapturing}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg disabled:opacity-50 flex items-center space-x-3"
                  >
                    <motion.div
                      animate={{ 
                        rotate: isCapturing ? 360 : 0,
                        scale: isCapturing ? [1, 1.2, 1] : 1
                      }}
                      transition={{ 
                        rotate: { duration: 0.8, repeat: isCapturing ? Infinity : 0 },
                        scale: { duration: 0.6, repeat: isCapturing ? Infinity : 0 }
                      }}
                    >
                      <Camera className="w-6 h-6" />
                    </motion.div>
                    <span>
                      {isCapturing
                        ? 'Get Ready...'
                        : capturedImages.length === 0 
                          ? 'Take First Photo'
                          : `Capture Photo ${capturedImages.length + 1}`
                      }
                    </span>
                  </Button>
                </motion.div>
                
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    onClick={resetCapture}
                    variant="outline"
                    className="px-6 py-4 rounded-xl font-medium border-2 hover:bg-gray-50"
                  >
                    <RotateCcw className="w-5 h-5 mr-2" />
                    Start Over
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          )}

          {currentStep === 'preview' && (
            <motion.div
              className="space-y-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Review Your Photos</h3>
                <p className="text-gray-600">Make sure all photos are clear and show your face properly</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {capturedImages.map((image, index) => (
                  <motion.div
                    key={index}
                    className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <img
                      src={image}
                      alt={`Face capture ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 bg-green-500 rounded-full p-1">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="flex justify-center space-x-4">
                <Button
                  onClick={confirmImages}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium"
                >
                  <Check className="w-5 h-5 mr-2" />
                  Use These Photos
                </Button>
                <Button
                  onClick={resetCapture}
                  variant="outline"
                  className="px-6 py-3 rounded-lg"
                >
                  <RotateCcw className="w-5 h-5 mr-2" />
                  Retake Photos
                </Button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 text-center">
          <Button
            onClick={onClose}
            variant="ghost"
            className="text-gray-600 hover:text-gray-800"
          >
            Cancel
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}