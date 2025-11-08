'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Camera, Lightbulb, Focus, Target, RotateCcw, TrendingUp } from 'lucide-react'

interface FaceDetection {
  detected: boolean
  confidence: number
  position: {
    x: number
    y: number
    width: number
    height: number
  }
  quality: {
    lighting: number
    sharpness: number
    faceSize: number
    angle: number
    overall: number
  }
}

interface AdvancedFaceCaptureProps {
  isOpen: boolean
  onClose: () => void
  onComplete: (images: string[]) => void
}

const captureStyles = {
  modern: {
    name: 'Modern Clean',
    description: 'Minimal design with smooth animations',
    primaryColor: '#6366f1',
    successColor: '#10b981',
    warningColor: '#f59e0b'
  }
}

// Define the capture phases for the guided face capture process
const capturePhases = [
  {
    id: 'front',
    name: 'Front',
    icon: '🙂',
    color: '#6366f1',
    angle: 0,
    instruction: 'Look straight ahead',
    details: 'Face the camera directly for a clear front photo.'
  },
  {
    id: 'left',
    name: 'Left',
    icon: '👈',
    color: '#f59e0b',
    angle: -20,
    instruction: 'Turn your face left',
    details: 'Slightly turn your face to the left for a profile photo.'
  },
  {
    id: 'right',
    name: 'Right',
    icon: '👉',
    color: '#10b981',
    angle: 20,
    instruction: 'Turn your face right',
    details: 'Slightly turn your face to the right for a profile photo.'
  },
  {
    id: 'verify',
    name: 'Smile',
    icon: '😄',
    color: '#f43f5e',
    angle: 0,
    instruction: 'Smile at the camera',
    details: 'Give a natural smile for the final verification photo.'
  }
]

export function AdvancedFaceCapture({ isOpen, onClose, onComplete }: AdvancedFaceCaptureProps) {
  // Phase images: stores images for each phase by id
  const [phaseImages, setPhaseImages] = useState<{ [key: string]: string }>({})
  // Ready state for phase guidance
  const [isReadyForPhase, setIsReadyForPhase] = useState(false)
  // Track when a phase started (for timing, optional)
  const [phaseStartTime, setPhaseStartTime] = useState<number | null>(null)
  // Capture mode: 'guided' or 'free' (default to 'guided')
  const [captureMode, setCaptureMode] = useState<'guided' | 'free'>('guided')
  const [currentStep, setCurrentStep] = useState<'setup' | 'capturing' | 'preview' | 'complete'>('setup')
  // Add currentPhase state for phase index
  const [currentPhase, setCurrentPhase] = useState(0)
  const [capturedImages, setCapturedImages] = useState<string[]>([])
  const [faceDetection, setFaceDetection] = useState<FaceDetection | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [autoCapture, setAutoCapture] = useState(true)
  const [audioEnabled, setAudioEnabled] = useState(true)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const analysisCanvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)

  const requiredImages = capturePhases.length
  const qualityThreshold = 75

  const getQualityColor = (score: number) => {
    if (score >= 80) return 'text-green-500'
    if (score >= 60) return 'text-yellow-500'
    return 'text-red-500'
  }

  const playSound = (type: 'capture' | 'countdown' | 'complete' | 'error') => {
    if (!audioEnabled || !audioContextRef.current) return
    
    const audioContext = audioContextRef.current
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    switch (type) {
      case 'capture':
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1)
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2)
        oscillator.stop(audioContext.currentTime + 0.2)
        break
      case 'countdown':
        oscillator.frequency.setValueAtTime(400, audioContext.currentTime)
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)
        oscillator.stop(audioContext.currentTime + 0.1)
        break
      case 'complete':
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
        oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1)
        oscillator.frequency.setValueAtTime(1200, audioContext.currentTime + 0.2)
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
        oscillator.stop(audioContext.currentTime + 0.3)
        break
      case 'error':
        oscillator.frequency.setValueAtTime(300, audioContext.currentTime)
        oscillator.frequency.setValueAtTime(250, audioContext.currentTime + 0.1)
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2)
        oscillator.stop(audioContext.currentTime + 0.2)
        break
    }
    
    oscillator.start(audioContext.currentTime)
  }

  const startCamera = async () => {
    try {
      setError('')
      console.log('🚀 Starting camera initialization...')
      
      // Set step to capturing immediately to show the video area
      setCurrentStep('capturing')
      setIsStreaming(false)
      
      // Get available video devices
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter(device => device.kind === 'videoinput')
      console.log('📹 Available video devices:', videoDevices)
      
      if (videoDevices.length === 0) {
        throw new Error('No camera devices found')
      }

      // Try to get user media with high-quality constraints first, then fallback
      let stream: MediaStream
      try {
        const constraints: MediaStreamConstraints = {
          video: {
            width: { min: 640, ideal: 1280, max: 1920 },
            height: { min: 480, ideal: 720, max: 1080 },
            frameRate: { min: 15, ideal: 30, max: 60 },
            facingMode: 'user'
          },
          audio: false
        }

        console.log('🎯 Requesting camera access with constraints:', constraints)
        stream = await navigator.mediaDevices.getUserMedia(constraints)
        console.log('✅ Advanced constraints successful')
      } catch (constraintsError) {
        console.log('❌ Advanced constraints failed, trying basic constraints:', constraintsError)
        // Fallback to basic constraints
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false
        })
        console.log('✅ Basic constraints successful')
      }
      
      console.log('🎥 Camera stream obtained with tracks:', stream.getTracks().map(t => t.kind))
      streamRef.current = stream
      
      if (videoRef.current) {
        console.log('🎬 Configuring video element...')
        videoRef.current.srcObject = stream
        
        // Set up event handlers before playing
        videoRef.current.onloadedmetadata = async () => {
          console.log('📊 Video metadata loaded - dimensions:', videoRef.current?.videoWidth, 'x', videoRef.current?.videoHeight)
          
          try {
            // Explicitly play the video
            console.log('▶️ Attempting to play video...')
            await videoRef.current!.play()
            console.log('🎉 Video playing successfully!')
            setIsStreaming(true)
            startFaceDetection()
          } catch (playError) {
            console.error('❌ Video play error:', playError)
            setError('Camera initialized but unable to display video. Please try clicking the "Try Play Video" button below.')
            // Don't set streaming to true, keep showing debug buttons
          }
        }
        
        videoRef.current.oncanplay = () => {
          console.log('✅ Video can play - ready to start')
        }
        
        videoRef.current.onplay = () => {
          console.log('🎬 Video onplay event fired')
          setIsStreaming(true)
        }
        
        videoRef.current.onerror = (err) => {
          console.error('❌ Video error:', err)
          setError('Video display error. Please check camera permissions and try refreshing.')
        }
        
        videoRef.current.onloadstart = () => {
          console.log('🚀 Video load started')
        }
        
        videoRef.current.onloadeddata = () => {
          console.log('📥 Video data loaded')
        }
        
        // Force load the video
        console.log('🔄 Forcing video load...')
        videoRef.current.load()
      } else {
        console.error('❌ Video element not available!')
        setError('Video element not found. Please try refreshing the page.')
      }
      
      // Initialize audio context
      if (audioEnabled && !audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
        console.log('🔊 Audio context initialized')
      }
      
    } catch (error) {
      console.error('❌ Camera access error:', error)
      let errorMessage = 'Camera access failed'
      
      if (error instanceof DOMException) {
        switch (error.name) {
          case 'NotAllowedError':
            errorMessage = 'Camera access denied. Please allow camera permission and refresh.'
            break
          case 'NotFoundError':
            errorMessage = 'No camera found. Please connect a camera device.'
            break
          case 'NotReadableError':
            errorMessage = 'Camera is busy or unavailable. Please close other camera apps.'
            break
          case 'OverconstrainedError':
            errorMessage = 'Camera constraints not supported. Trying basic settings...'
            // Try with basic constraints
            try {
              const basicStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
              streamRef.current = basicStream
              if (videoRef.current) {
                videoRef.current.srcObject = basicStream
              }
              setCurrentStep('capturing')
              startFaceDetection()
              return
            } catch (basicError) {
              errorMessage = 'Camera not compatible with this browser.'
            }
            break
          default:
            errorMessage = `Camera error: ${error.message}`
        }
      }
      
      setError(errorMessage)
      playSound('error')
    }
  }

  const startFaceDetection = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current)
    }

    detectionIntervalRef.current = setInterval(() => {
      detectFace()
    }, 100)
  }

  const detectFace = () => {
    if (!videoRef.current || !canvasRef.current || !analysisCanvasRef.current) return
    
    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const analysisCanvas = analysisCanvasRef.current
    const analysisCtx = analysisCanvas.getContext('2d')
    
    if (!ctx || !analysisCtx || video.readyState !== video.HAVE_ENOUGH_DATA) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    analysisCanvas.width = video.videoWidth
    analysisCanvas.height = video.videoHeight
    
    ctx.drawImage(video, 0, 0)
    analysisCtx.drawImage(video, 0, 0)

    const imageData = analysisCtx.getImageData(0, 0, analysisCanvas.width, analysisCanvas.height)
    const detection = analyzeFace(imageData)
    
    setFaceDetection(detection)

    if (autoCapture && detection.detected && detection.quality.overall > qualityThreshold && 
        capturedImages.length < requiredImages && !isCapturing && countdown === null) {
      triggerAutoCapture()
    }
  }

  const analyzeFace = (imageData: ImageData): FaceDetection => {
    const { width, height, data } = imageData
    
    // Simple face detection simulation (in real app, use a library like MediaPipe)
    const centerX = width / 2
    const centerY = height / 2
    const faceWidth = width * 0.3
    const faceHeight = height * 0.4
    
    // Calculate quality metrics
    const lighting = calculateLighting(data, width, height)
    const sharpness = calculateSharpness(data, width, height)
    const faceSize = Math.min((faceWidth / width) * 200, 100)
    const angle = Math.random() * 20 + 80 // Simulate angle detection
    const overall = (lighting + sharpness + faceSize + angle) / 4
    
    return {
      detected: Math.random() > 0.3, // Simulate detection
      confidence: Math.min(overall + Math.random() * 10, 100),
      position: {
        x: centerX - faceWidth / 2,
        y: centerY - faceHeight / 2,
        width: faceWidth,
        height: faceHeight
      },
      quality: {
        lighting,
        sharpness,
        faceSize,
        angle,
        overall
      }
    }
  }

  const calculateLighting = (data: Uint8ClampedArray, width: number, height: number): number => {
    let total = 0
    let count = 0
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const brightness = (r + g + b) / 3
      total += brightness
      count++
    }
    
    const avgBrightness = total / count
    return Math.min(avgBrightness / 255 * 100, 100)
  }

  const calculateSharpness = (data: Uint8ClampedArray, width: number, height: number): number => {
    let sharpness = 0
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4
        const current = data[idx]
        const right = data[idx + 4]
        const bottom = data[(y + 1) * width * 4 + x * 4]
        
        sharpness += Math.abs(current - right) + Math.abs(current - bottom)
      }
    }
    
    return Math.min(sharpness / (width * height) * 2, 100)
  }

  const triggerAutoCapture = () => {
    setCountdown(3)
    
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null) return null
        
        playSound('countdown')
        
        if (prev <= 1) {
          clearInterval(countdownInterval)
          setTimeout(() => {
            setCountdown(null)
            captureImage()
          }, 800)
          return 0
        }
        
        return prev - 1
      })
    }, 1000)
  }

  const captureImage = async () => {
    if (!videoRef.current || !canvasRef.current || isCapturing) return
    
    setIsCapturing(true)
    playSound('capture')
    
    try {
      const video = videoRef.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      
      if (!ctx) throw new Error('Canvas context not available')
      
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      
      // Apply mirror effect to match what user sees
      ctx.scale(-1, 1)
      ctx.drawImage(video, -canvas.width, 0)
      
      const imageData = canvas.toDataURL('image/jpeg', 0.9)
      const currentPhaseId = capturePhases[currentPhase].id
      
      // Store image for current phase
      setPhaseImages(prev => ({
        ...prev,
        [currentPhaseId]: imageData
      }))
      
      setCapturedImages(prev => [...prev, imageData])
      
      // Check if we've completed all phases (front, left, right, verify)
      const completedPhases = Object.keys(phaseImages).length + 1
      
      if (completedPhases >= capturePhases.length) {
        setTimeout(() => {
          setCurrentStep('preview')
          playSound('complete')
        }, 1000)
      } else {
        // Move to next phase with guidance
        setTimeout(() => {
          setCurrentPhase(prev => (prev + 1) % capturePhases.length)
          setIsReadyForPhase(false)
          setPhaseStartTime(Date.now())
          playSound('countdown')
        }, 1500)
      }
      
    } catch (error) {
      console.error('Capture error:', error)
      setError('Failed to capture image')
      playSound('error')
    } finally {
      setIsCapturing(false)
    }
  }

  const resetCapture = () => {
    setCapturedImages([])
    setCurrentPhase(0)
    setError('')
    setCurrentStep('capturing')
  }

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current)
      detectionIntervalRef.current = null
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    
    setIsStreaming(false)
    setFaceDetection(null)
    setCountdown(null)
  }

  const handleComplete = () => {
    onComplete(capturedImages)
    cleanup()
    setCapturedImages([])
    setCurrentStep('setup')
    onClose()
  }

  useEffect(() => {
    return cleanup
  }, [])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-3xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  AI Face Capture
                </h2>
                <p className="text-gray-600 mt-1">Advanced biometric registration system</p>
              </div>
              <Button
                onClick={onClose}
                variant="ghost"
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </Button>
            </div>

            {error && (
              <motion.div
                className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <p className="font-medium">{error}</p>
                <Button
                  onClick={() => setError('')}
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-red-600 hover:text-red-800"
                >
                  Dismiss
                </Button>
              </motion.div>
            )}

            {currentStep === 'setup' && (
              <motion.div
                className="text-center space-y-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="space-y-6">
                  <motion.div
                    className="w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mx-auto flex items-center justify-center shadow-2xl"
                    animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.05, 1] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Camera className="w-16 h-16 text-white" />
                  </motion.div>

                  <div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-3">
                      Ready to Capture Your Face
                    </h3>
                    <p className="text-gray-600 text-lg max-w-md mx-auto">
                      Our advanced AI will guide you through capturing {requiredImages} high-quality photos 
                      for secure biometric registration.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
                    <div className="text-blue-600 text-4xl mb-3">🎯</div>
                    <h4 className="font-bold text-blue-800 mb-2">Perfect Positioning</h4>
                    <p className="text-blue-700 text-sm">AI-powered guides help you position your face perfectly</p>
                  </div>
                  <div className="bg-green-50 rounded-2xl p-6 border border-green-100">
                    <div className="text-green-600 text-4xl mb-3">⚡</div>
                    <h4 className="font-bold text-green-800 mb-2">Quality Analysis</h4>
                    <p className="text-green-700 text-sm">Real-time quality checks ensure the best results</p>
                  </div>
                </div>

                <Button
                  onClick={startCamera}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-12 py-4 rounded-2xl font-bold text-lg shadow-xl"
                >
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    🚀 Initialize AI Camera
                  </motion.div>
                </Button>
              </motion.div>
            )}

            {currentStep === 'capturing' && (
              <motion.div
                className="space-y-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {/* Full-Screen Live Video Preview */}
                <div className="relative bg-gradient-to-br from-gray-900 to-black rounded-3xl overflow-hidden shadow-2xl border-4 border-blue-500/20">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    controls={false}
                    preload="metadata"
                    className="w-full h-[500px] object-cover bg-gray-900"
                    style={{ 
                      transform: 'scaleX(-1)', // Mirror effect so you see yourself naturally
                      minHeight: '500px',
                      maxHeight: '500px'
                    }}
                    onPlay={() => {
                      console.log('🎬 Video onPlay event - setting streaming to true')
                      setIsStreaming(true)
                    }}
                    onLoadedData={() => {
                      console.log('📊 Video data loaded event')
                    }}
                    onCanPlay={() => {
                      console.log('✅ Video onCanPlay event')
                    }}
                    onClick={async () => {
                      console.log('🖱️ Video clicked - attempting manual play...')
                      if (videoRef.current) {
                        try {
                          await videoRef.current.play()
                          console.log('✅ Manual click play successful')
                        } catch (err) {
                          console.error('❌ Manual click play failed:', err)
                        }
                      }
                    }}
                  />

                  {/* Enhanced Loading state when camera is initializing */}
                  {!isStreaming && currentStep === 'capturing' && (
                    <div className="absolute inset-0 bg-black/90 flex items-center justify-center">
                      <div className="text-center text-white">
                        <motion.div
                          className="w-20 h-20 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-6"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        />
                        <p className="text-2xl font-bold mb-2">Initializing Camera...</p>
                        <p className="text-lg opacity-75">Setting up your video feed</p>
                        
                        {/* Enhanced Debug buttons */}
                        <div className="mt-6 space-y-3">
                          <div className="text-sm text-gray-400">
                            🔧 Debug Tools:
                          </div>
                          
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={async () => {
                                console.log('🔄 Manual video play attempt...')
                                if (videoRef.current) {
                                  console.log('📊 Video state:', {
                                    readyState: videoRef.current.readyState,
                                    paused: videoRef.current.paused,
                                    ended: videoRef.current.ended,
                                    currentTime: videoRef.current.currentTime,
                                    duration: videoRef.current.duration,
                                    videoWidth: videoRef.current.videoWidth,
                                    videoHeight: videoRef.current.videoHeight
                                  })
                                  try {
                                    await videoRef.current.play()
                                    console.log('✅ Manual play successful')
                                    setIsStreaming(true)
                                  } catch (err) {
                                    console.error('❌ Manual play failed:', err)
                                  }
                                }
                              }}
                              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
                            >
                              ▶️ Try Play Video
                            </button>
                            
                            <button
                              onClick={() => {
                                console.log('🔍 Video element debug info:')
                                if (videoRef.current) {
                                  console.log('Video element:', videoRef.current)
                                  console.log('Video src:', videoRef.current.srcObject)
                                  console.log('Video ready state:', videoRef.current.readyState)
                                  console.log('Stream tracks:', streamRef.current?.getTracks())
                                } else {
                                  console.log('❌ No video element found')
                                }
                              }}
                              className="bg-gray-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-700 transition-colors"
                            >
                              🔍 Debug Info
                            </button>
                          </div>
                          
                          <div className="text-xs opacity-60 max-w-xs mx-auto">
                            If the camera doesn't appear, try the buttons above or check the browser console (F12)
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <canvas ref={canvasRef} className="hidden" />
                  <canvas ref={analysisCanvasRef} className="hidden" />
                  
                  {/* Enhanced Live Face Detection Overlay */}
                  {faceDetection?.detected && isStreaming && (
                    <motion.div
                      className={`absolute border-4 rounded-2xl shadow-lg ${
                        faceDetection.quality.overall > qualityThreshold 
                          ? 'border-green-400 bg-green-400/10' 
                          : 'border-yellow-400 bg-yellow-400/10'
                      }`}
                      style={{
                        left: `${(1 - (faceDetection.position.x + faceDetection.position.width) / (videoRef.current?.videoWidth || 1)) * 100}%`, // Flipped for mirror
                        top: `${(faceDetection.position.y / (videoRef.current?.videoHeight || 1)) * 100}%`,
                        width: `${(faceDetection.position.width / (videoRef.current?.videoWidth || 1)) * 100}%`,
                        height: `${(faceDetection.position.height / (videoRef.current?.videoHeight || 1)) * 100}%`
                      }}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      {/* Face detection label */}
                      <div className={`absolute -top-8 left-0 px-3 py-1 rounded-lg text-sm font-bold ${
                        faceDetection.quality.overall > qualityThreshold 
                          ? 'bg-green-500 text-white' 
                          : 'bg-yellow-500 text-black'
                      }`}>
                        {faceDetection.quality.overall > qualityThreshold ? '✓ Perfect!' : '⚠ Adjust Position'}
                      </div>
                    </motion.div>
                  )}

                  {/* Advanced Positioning Guide - Always Visible */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <motion.div 
                      className="relative"
                      animate={{ 
                        scale: faceDetection?.detected 
                          ? faceDetection.quality.overall > qualityThreshold 
                            ? [1, 1.02, 1] 
                            : [1, 1.05, 1]
                          : [1, 1.03, 1],
                      }}
                      transition={{ 
                        repeat: Infinity, 
                        duration: faceDetection?.detected ? 1.5 : 2,
                        ease: "easeInOut"
                      }}
                    >
                      {/* Main face guide oval */}
                      <div className={`w-80 h-96 border-4 border-dashed rounded-full transition-all duration-500 ${
                        faceDetection?.detected 
                          ? faceDetection.quality.overall > qualityThreshold 
                            ? 'border-green-400 shadow-lg shadow-green-400/30' 
                            : 'border-yellow-400 shadow-lg shadow-yellow-400/30'
                          : 'border-blue-400 shadow-lg shadow-blue-400/30'
                      }`} style={{ opacity: 0.8 }}>
                        
                        {/* Center crosshair */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className={`w-6 h-6 border-2 rounded-full transition-colors duration-500 ${
                            faceDetection?.detected 
                              ? faceDetection.quality.overall > qualityThreshold 
                                ? 'border-green-400 bg-green-400' 
                                : 'border-yellow-400 bg-yellow-400'
                              : 'border-blue-400 bg-blue-400'
                          }`}>
                            <div className="absolute inset-1 bg-white rounded-full"></div>
                          </div>
                          
                          {/* Crosshair lines */}
                          <div className={`absolute w-8 h-0.5 transition-colors duration-500 ${
                            faceDetection?.detected 
                              ? faceDetection.quality.overall > qualityThreshold 
                                ? 'bg-green-400' 
                                : 'bg-yellow-400'
                              : 'bg-blue-400'
                          }`}></div>
                          <div className={`absolute w-0.5 h-8 transition-colors duration-500 ${
                            faceDetection?.detected 
                              ? faceDetection.quality.overall > qualityThreshold 
                                ? 'bg-green-400' 
                                : 'bg-yellow-400'
                              : 'bg-blue-400'
                          }`}></div>
                        </div>

                        {/* Angle Guidance Indicators - Jio Style */}
                        {capturePhases[currentPhase].angle !== 0 && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <motion.div 
                              className="absolute w-16 h-0.5 bg-white/60 rounded"
                              style={{
                                transformOrigin: 'center',
                                transform: `rotate(${capturePhases[currentPhase].angle}deg)`
                              }}
                              animate={{ opacity: [0.6, 1, 0.6] }}
                              transition={{ duration: 1.5, repeat: Infinity }}
                            />
                            <motion.div 
                              className="absolute w-3 h-3 bg-white rounded-full"
                              style={{
                                transform: `translate(${capturePhases[currentPhase].angle > 0 ? '30px' : '-30px'}, 0)`
                              }}
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ duration: 1, repeat: Infinity }}
                            />
                            <div 
                              className="absolute text-white text-xs font-bold"
                              style={{
                                transform: `translate(${capturePhases[currentPhase].angle > 0 ? '45px' : '-45px'}, 0)`
                              }}
                            >
                              {capturePhases[currentPhase].angle > 0 ? '→' : '←'}
                            </div>
                          </div>
                        )}

                      </div>
                      
                      {/* Corner position markers */}
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                        <motion.div 
                          className={`w-3 h-3 rounded-full transition-colors duration-500 ${
                            faceDetection?.detected 
                              ? faceDetection.quality.overall > qualityThreshold 
                                ? 'bg-green-400' 
                                : 'bg-yellow-400'
                              : 'bg-blue-400'
                          }`}
                          animate={{ scale: [1, 1.5, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        ></motion.div>
                      </div>
                      <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2">
                        <motion.div 
                          className={`w-3 h-3 rounded-full transition-colors duration-500 ${
                            faceDetection?.detected 
                              ? faceDetection.quality.overall > qualityThreshold 
                                ? 'bg-green-400' 
                                : 'bg-yellow-400'
                              : 'bg-blue-400'
                          }`}
                          animate={{ scale: [1, 1.5, 1] }}
                          transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                        ></motion.div>
                      </div>
                      <div className="absolute -left-4 top-1/2 transform -translate-y-1/2">
                        <motion.div 
                          className={`w-3 h-3 rounded-full transition-colors duration-500 ${
                            faceDetection?.detected 
                              ? faceDetection.quality.overall > qualityThreshold 
                                ? 'bg-green-400' 
                                : 'bg-yellow-400'
                              : 'bg-blue-400'
                          }`}
                          animate={{ scale: [1, 1.5, 1] }}
                          transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                        ></motion.div>
                      </div>
                      <div className="absolute -right-4 top-1/2 transform -translate-y-1/2">
                        <motion.div 
                          className={`w-3 h-3 rounded-full transition-colors duration-500 ${
                            faceDetection?.detected 
                              ? faceDetection.quality.overall > qualityThreshold 
                                ? 'bg-green-400' 
                                : 'bg-yellow-400'
                              : 'bg-blue-400'
                          }`}
                          animate={{ scale: [1, 1.5, 1] }}
                          transition={{ duration: 2, repeat: Infinity, delay: 1.5 }}
                        ></motion.div>
                      </div>
                    </motion.div>
                  </div>

                  {/* Live Status and Instructions */}
                  <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
                    {/* Status indicators */}
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2 bg-black/70 rounded-full px-4 py-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                        <span className="text-white text-sm font-bold">LIVE</span>
                      </div>
                      {faceDetection?.detected && (
                        <motion.div 
                          className={`px-4 py-2 rounded-full text-sm font-bold ${
                            faceDetection.quality.overall > qualityThreshold
                              ? 'bg-green-500 text-white'
                              : 'bg-yellow-500 text-black'
                          }`}
                          initial={{ scale: 0, x: -20 }}
                          animate={{ scale: 1, x: 0 }}
                          transition={{ type: "spring", stiffness: 200 }}
                        >
                          Face: {Math.round(faceDetection.confidence)}%
                        </motion.div>
                      )}
                    </div>

                    {/* Quality score */}
                    {faceDetection?.detected && (
                      <motion.div 
                        className={`px-4 py-2 rounded-full text-lg font-bold ${
                          faceDetection.quality.overall > qualityThreshold
                            ? 'bg-green-500/90 text-white'
                            : 'bg-yellow-500/90 text-black'
                        }`}
                        initial={{ scale: 0, x: 20 }}
                        animate={{ scale: 1, x: 0 }}
                        transition={{ type: "spring", stiffness: 200 }}
                      >
                        {Math.round(faceDetection.quality.overall)}%
                      </motion.div>
                    )}
                  </div>

                  {/* Phase Progress Indicator - Jio Style */}
                  <div className="absolute top-20 left-1/2 transform -translate-x-1/2">
                    <motion.div 
                      className="bg-black/80 text-white px-6 py-3 rounded-2xl"
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                    >
                      <div className="flex items-center space-x-4">
                        {capturePhases.map((phase, index) => (
                          <div key={phase.id} className="flex items-center">
                            <motion.div
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                index < currentPhase 
                                  ? 'bg-green-500 text-white' 
                                  : index === currentPhase
                                  ? 'bg-blue-500 text-white animate-pulse'
                                  : 'bg-gray-600 text-gray-300'
                              }`}
                              animate={index === currentPhase ? { scale: [1, 1.1, 1] } : {}}
                              transition={{ duration: 1, repeat: Infinity }}
                            >
                              {index < currentPhase ? '✓' : phase.icon}
                            </motion.div>
                            {index < capturePhases.length - 1 && (
                              <div className={`w-6 h-0.5 mx-2 ${
                                index < currentPhase ? 'bg-green-500' : 'bg-gray-600'
                              }`} />
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="text-center mt-2 text-sm">
                        Step {currentPhase + 1} of {capturePhases.length}: {capturePhases[currentPhase].name}
                      </div>
                    </motion.div>
                  </div>

                  {/* Position Instructions - Dynamic */}
                  <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
                    <motion.div
                      className="bg-black/80 text-white px-8 py-4 rounded-2xl text-center max-w-md"
                      animate={{ 
                        y: [0, -5, 0],
                        scale: faceDetection?.detected && faceDetection.quality.overall > qualityThreshold ? [1, 1.05, 1] : 1
                      }}
                      transition={{ 
                        y: { duration: 2, repeat: Infinity },
                        scale: { duration: 1, repeat: Infinity }
                      }}
                    >
                      {!faceDetection?.detected ? (
                        <>
                          <div className="text-2xl mb-2">👤</div>
                          <div className="font-bold text-lg">Position Your Face</div>
                          <div className="text-sm text-gray-300">
                            {capturePhases[currentPhase].details}
                          </div>
                        </>
                      ) : faceDetection.quality.overall > qualityThreshold ? (
                        <>
                          <div className="text-2xl mb-2">✅</div>
                          <div className="font-bold text-lg text-green-400">Perfect Position!</div>
                          <div className="text-sm text-green-300">
                            {autoCapture 
                              ? `Auto-capturing ${capturePhases[currentPhase].name}...` 
                              : `Ready for ${capturePhases[currentPhase].name}`
                            }
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-2xl mb-2" style={{ color: capturePhases[currentPhase].color }}>
                            {capturePhases[currentPhase].icon}
                          </div>
                          <div className="font-bold text-lg text-yellow-400">
                            {capturePhases[currentPhase].instruction}
                          </div>
                          <div className="text-sm text-yellow-300">
                            {capturePhases[currentPhase].details}
                          </div>
                        </>
                      )}
                    </motion.div>
                  </div>

                  {/* Guided pose indicator */}
                  {captureMode === 'guided' && (
                    <div className="absolute top-1/2 left-6 transform -translate-y-1/2">
                      <motion.div
                        className="bg-black/80 text-white px-6 py-3 rounded-2xl text-center"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <div className="text-2xl mb-1">{capturePhases[currentPhase].icon}</div>
                        <div className="font-bold">{capturePhases[currentPhase].name}</div>
                        <div className="text-sm text-gray-300">{capturePhases[currentPhase].instruction}</div>
                      </motion.div>
                    </div>
                  )}

                  {/* Countdown overlay */}
                  {countdown !== null && (
                    <motion.div
                      className="absolute inset-0 bg-black/70 flex items-center justify-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <motion.div
                        className="bg-white rounded-3xl w-40 h-40 flex items-center justify-center shadow-2xl"
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: [0, 1.4, 1], rotate: 0 }}
                        key={countdown}
                        transition={{ duration: 0.8, ease: "backOut" }}
                      >
                        <div className="text-center">
                          <div className="text-6xl font-black text-blue-600 mb-2">
                            {countdown === 0 ? '📸' : countdown}
                          </div>
                          {countdown > 0 && (
                            <div className="text-sm font-bold text-gray-600">
                              Get Ready
                            </div>
                          )}
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </div>

                {/* Real-time quality metrics */}
                {faceDetection?.detected && (
                  <motion.div
                    className="bg-white rounded-xl p-4 border-2 border-gray-100 shadow-lg"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="grid grid-cols-5 gap-4 text-center">
                      <div>
                        <Lightbulb className={`w-6 h-6 mx-auto mb-2 ${getQualityColor(faceDetection.quality.lighting)}`} />
                        <div className={`font-bold ${getQualityColor(faceDetection.quality.lighting)}`}>
                          {Math.round(faceDetection.quality.lighting)}%
                        </div>
                        <div className="text-xs text-gray-500">Lighting</div>
                      </div>
                      <div>
                        <Focus className={`w-6 h-6 mx-auto mb-2 ${getQualityColor(faceDetection.quality.sharpness)}`} />
                        <div className={`font-bold ${getQualityColor(faceDetection.quality.sharpness)}`}>
                          {Math.round(faceDetection.quality.sharpness)}%
                        </div>
                        <div className="text-xs text-gray-500">Sharpness</div>
                      </div>
                      <div>
                        <Target className={`w-6 h-6 mx-auto mb-2 ${getQualityColor(faceDetection.quality.faceSize)}`} />
                        <div className={`font-bold ${getQualityColor(faceDetection.quality.faceSize)}`}>
                          {Math.round(faceDetection.quality.faceSize)}%
                        </div>
                        <div className="text-xs text-gray-500">Position</div>
                      </div>
                      <div>
                        <RotateCcw className={`w-6 h-6 mx-auto mb-2 ${getQualityColor(faceDetection.quality.angle)}`} />
                        <div className={`font-bold ${getQualityColor(faceDetection.quality.angle)}`}>
                          {Math.round(faceDetection.quality.angle)}%
                        </div>
                        <div className="text-xs text-gray-500">Angle</div>
                      </div>
                      <div>
                        <TrendingUp className={`w-6 h-6 mx-auto mb-2 ${getQualityColor(faceDetection.quality.overall)}`} />
                        <div className={`font-bold text-lg ${getQualityColor(faceDetection.quality.overall)}`}>
                          {Math.round(faceDetection.quality.overall)}%
                        </div>
                        <div className="text-xs text-gray-500">Overall</div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Enhanced progress tracking */}
                <div className="text-center space-y-6">
                  <div className="flex justify-center space-x-4">
                    {Array.from({ length: requiredImages }).map((_, index) => (
                      <motion.div
                        key={index}
                        className={`relative w-6 h-6 rounded-full flex items-center justify-center ${
                          index < capturedImages.length
                            ? 'bg-gradient-to-r from-green-400 to-green-600 text-white shadow-lg'
                            : index === capturedImages.length
                            ? 'bg-gradient-to-r from-blue-400 to-blue-600 text-white animate-pulse shadow-lg'
                            : 'bg-gray-200 text-gray-400'
                        }`}
                        animate={{
                          scale: index === capturedImages.length ? [1, 1.3, 1] : 1,
                          rotate: index < capturedImages.length ? 360 : 0
                        }}
                        transition={{
                          scale: { repeat: index === capturedImages.length ? Infinity : 0, duration: 1.5 },
                          rotate: { duration: 0.5 }
                        }}
                      >
                        {index < capturedImages.length && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="font-black text-sm"
                          >
                            ✓
                          </motion.span>
                        )}
                        {index === capturedImages.length && (
                          <div className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-30"></div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                  
                  <div className="space-y-3">
                    <p className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      {capturedImages.length} / {requiredImages} Photos Captured
                    </p>
                    {capturedImages.length < requiredImages && (
                      <motion.p 
                        className="text-lg text-blue-600 font-medium"
                        animate={{ opacity: [0.6, 1, 0.6] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                      >
                        {autoCapture && faceDetection?.detected && faceDetection.quality.overall > qualityThreshold
                          ? "Perfect! Auto-capturing..."
                          : capturedImages.length === 0 
                            ? "Click 'Capture Photo' when ready"
                            : `${requiredImages - capturedImages.length} more photos needed`
                        }
                      </motion.p>
                    )}
                  </div>

                  {/* Live thumbnails */}
                  {capturedImages.length > 0 && (
                    <motion.div
                      className="flex justify-center space-x-3 mt-6"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      {capturedImages.map((image, index) => (
                        <motion.div
                          key={index}
                          className="relative w-16 h-16 rounded-xl overflow-hidden border-4 border-green-300 shadow-lg"
                          initial={{ scale: 0, rotate: -20, opacity: 0 }}
                          animate={{ scale: 1, rotate: 0, opacity: 1 }}
                          transition={{ 
                            delay: index * 0.1,
                            type: "spring",
                            stiffness: 300,
                            damping: 20
                          }}
                        >
                          <img
                            src={image}
                            alt={`Captured ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                            <span className="text-white text-sm font-bold">✓</span>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs py-1 text-center">
                            {capturePhases[index % capturePhases.length].icon}
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </div>

                {/* Enhanced controls */}
                <div className="flex justify-center space-x-6">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      onClick={captureImage}
                      disabled={!isStreaming || isCapturing || (autoCapture && faceDetection?.quality.overall !== undefined && faceDetection.quality.overall < qualityThreshold)}
                      className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-10 py-4 rounded-2xl font-bold text-lg shadow-xl disabled:opacity-50 flex items-center space-x-3"
                    >
                      <motion.div
                        animate={{ 
                          rotate: isCapturing ? 360 : 0,
                          scale: isCapturing ? [1, 1.2, 1] : 1
                        }}
                        transition={{ 
                          rotate: { duration: 1, repeat: isCapturing ? Infinity : 0 },
                          scale: { duration: 0.8, repeat: isCapturing ? Infinity : 0 }
                        }}
                      >
                        <Camera className="w-7 h-7" />
                      </motion.div>
                      <span>
                        {isCapturing
                          ? 'Capturing...'
                          : autoCapture
                            ? 'Manual Capture'
                            : capturedImages.length === 0 
                              ? 'Take First Photo'
                              : `Capture ${capturePhases[currentPhase].name}`
                        }
                      </span>
                    </Button>
                  </motion.div>
                  
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      onClick={resetCapture}
                      variant="outline"
                      className="px-8 py-4 rounded-2xl font-bold border-2 hover:bg-gray-50 shadow-lg"
                    >
                      <RotateCcw className="w-6 h-6 mr-3" />
                      Reset Session
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
            )}

            {currentStep === 'preview' && (
              <motion.div
                className="space-y-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                  >
                    <div className="w-20 h-20 bg-green-500 rounded-full mx-auto flex items-center justify-center mb-4">
                      <span className="text-white text-3xl">✓</span>
                    </div>
                  </motion.div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">All Photos Captured!</h3>
                  <p className="text-gray-600">Review your photos before completing registration</p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {capturedImages.map((image, index) => (
                    <motion.div
                      key={index}
                      className="relative aspect-square rounded-2xl overflow-hidden shadow-lg border-4 border-green-200"
                      initial={{ scale: 0, rotate: -10 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: index * 0.1, type: "spring", stiffness: 200 }}
                    >
                      <img
                        src={image}
                        alt={`Captured ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center">
                        <span className="text-sm font-bold">{index + 1}</span>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-2 text-center">
                        <span className="text-sm font-medium">{capturePhases[index].name}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="flex justify-center space-x-6">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      onClick={resetCapture}
                      variant="outline"
                      className="px-8 py-3 rounded-2xl font-bold border-2"
                    >
                      <RotateCcw className="w-5 h-5 mr-2" />
                      Retake Photos
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      onClick={handleComplete}
                      className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-12 py-3 rounded-2xl font-bold"
                    >
                      ✓ Complete Registration
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}