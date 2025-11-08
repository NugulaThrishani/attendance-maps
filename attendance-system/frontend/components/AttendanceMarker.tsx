'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, Wifi, MapPin, Clock, CheckCircle, AlertCircle, X } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { SimpleFaceCapture } from './SimpleFaceCapture'
import { attendanceApi } from '../lib/api'
import { getNetworkInfo, checkNetworkAccess, detectCurrentNetwork } from '../lib/network-utils'

interface AttendanceMarkerProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface AttendanceStep {
  id: 'network' | 'camera' | 'verify' | 'complete'
  title: string
  description: string
  status: 'pending' | 'in-progress' | 'completed' | 'failed'
}

export default function AttendanceMarker({ isOpen, onClose, onSuccess }: AttendanceMarkerProps) {
  const [currentStep, setCurrentStep] = useState<'network' | 'camera' | 'verify' | 'complete'>('network')
  const [networkInfo, setNetworkInfo] = useState<any>(null)
  const [faceImages, setFaceImages] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showFaceCapture, setShowFaceCapture] = useState(false)

  const [steps, setSteps] = useState<AttendanceStep[]>([
    { id: 'network', title: 'Network Verification', description: 'Checking campus network connection', status: 'pending' },
    { id: 'camera', title: 'Face Capture', description: 'Capture your face for verification', status: 'pending' },
    { id: 'verify', title: 'Identity Verification', description: 'Verifying your identity', status: 'pending' },
    { id: 'complete', title: 'Attendance Recorded', description: 'Your attendance has been marked', status: 'pending' }
  ])

  const updateStepStatus = (stepId: string, status: 'pending' | 'in-progress' | 'completed' | 'failed') => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, status } : step
    ))
  }

  const startNetworkVerification = async () => {
    try {
      setError('')
      setCurrentStep('network')
      updateStepStatus('network', 'in-progress')
      
      // Get network requirements from backend
      const requirements = await attendanceApi.getNetworkRequirements()
      
      // Check if user is on allowed network
      const networkCheck = await checkNetworkAccess({
        allowed_networks: ['Dhanush'], // Your specified network
        location_name: 'KL University Campus'
      })

      if (networkCheck.allowed) {
        const networkInfo = await getNetworkInfo()
        setNetworkInfo({
          ...networkInfo,
          networkName: networkCheck.networkName,
          verified: true
        })
        
        updateStepStatus('network', 'completed')
        setSuccess('Network verified! Connected to campus WiFi.')
        
        setTimeout(() => {
          setCurrentStep('camera')
          setSuccess('')
        }, 1500)
      } else {
        updateStepStatus('network', 'failed')
        setError(networkCheck.reason)
      }
    } catch (error: any) {
      console.error('Network verification failed:', error)
      updateStepStatus('network', 'failed')
      setError('Network verification failed. Please ensure you are connected to campus WiFi.')
    }
  }

  const startFaceCapture = () => {
    setCurrentStep('camera')
    updateStepStatus('camera', 'in-progress')
    setShowFaceCapture(true)
  }

  const handleFaceCapture = (images: string[]) => {
    console.log('🔍 Face capture completed with images:', images.length)
    console.log('🔍 First image length:', images[0]?.length || 0)
    setFaceImages(images)
    setShowFaceCapture(false)
    updateStepStatus('camera', 'completed')
    setSuccess('Face captured successfully!')
    
    setTimeout(() => {
      console.log('🔍 About to mark attendance with images from param:', images.length)
      markAttendance(images) // Pass images directly to avoid state timing issues
    }, 1000)
  }

  const markAttendance = async (capturedImages?: string[]) => {
    try {
      setCurrentStep('verify')
      updateStepStatus('verify', 'in-progress')
      setError('')
      setIsLoading(true)

      // Use passed images or fallback to state
      const imagesToUse = capturedImages || faceImages
      console.log('🔍 markAttendance called with images:', imagesToUse.length)
      
      if (imagesToUse.length === 0) {
        console.error('❌ No face images available!')
        throw new Error('No face images captured')
      }

      console.log('🔍 Creating attendance data with images:', imagesToUse.length)
      const attendanceData = {
        live_image: imagesToUse[0], // Use the first captured image
        liveness_sequence: imagesToUse.slice(1), // Use remaining images for liveness
        network_info: networkInfo || {}
      }

      const response = await attendanceApi.markAttendance(attendanceData)
      
      // Check if the attendance was actually successful
      if (response.success) {
        // Success case
        updateStepStatus('verify', 'completed')
        updateStepStatus('complete', 'completed')
        setCurrentStep('complete')
        setSuccess('Attendance marked successfully!')
        
        setTimeout(() => {
          onSuccess()
          handleClose()
        }, 3000)
      } else {
        // Failure case (e.g., face verification failed)
        updateStepStatus('verify', 'failed')
        
        // Get detailed error message from response
        let errorMessage = response.message || 'Attendance verification failed.'
        
        // Add specific guidance based on verification details
        if (response.verification_details?.face_verification) {
          const faceVerif = response.verification_details.face_verification
          const confidence = faceVerif.confidence || 0
          const threshold = faceVerif.threshold || 0.3
          
          if (confidence < 0.1) {
            errorMessage += ' Face not detected clearly. Please ensure good lighting and face the camera directly.'
          } else if (confidence < threshold) {
            errorMessage += ` Face confidence too low (${(confidence * 100).toFixed(1)}% vs ${(threshold * 100)}% required). Try better lighting or re-register your face.`
          }
        }
        
        if (response.verification_details?.liveness_verification && !response.verification_details.liveness_verification.liveness_passed) {
          errorMessage += ' Liveness detection failed. Please ensure you are physically present.'
        }
        
        if (response.verification_details?.network_verification && !response.verification_details.network_verification.network_verified) {
          errorMessage += ' Network verification failed. Please connect to the correct Wi-Fi network.'
        }
        
        setError(errorMessage)
        throw new Error(errorMessage)
      }

    } catch (error: any) {
      console.error('Attendance marking failed:', error)
      updateStepStatus('verify', 'failed')
      
      let errorMessage = 'Attendance marking failed. '
      if (error.response?.data?.detail) {
        if (typeof error.response.data.detail === 'string') {
          errorMessage += error.response.data.detail
        } else if (Array.isArray(error.response.data.detail)) {
          errorMessage += error.response.data.detail.map((e: any) => e.msg || e.message || e).join(', ')
        }
      } else {
        errorMessage += error.message || 'Please try again.'
      }
      
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    // Reset state
    setCurrentStep('network')
    setSteps(prev => prev.map(step => ({ ...step, status: 'pending' })))
    setNetworkInfo(null)
    setFaceImages([])
    setError('')
    setSuccess('')
    setIsLoading(false)
    setShowFaceCapture(false)
    onClose()
  }

  const retryCurrentStep = () => {
    setError('')
    setSuccess('')
    
    switch (currentStep) {
      case 'network':
        startNetworkVerification()
        break
      case 'camera':
        startFaceCapture()
        break
      case 'verify':
        markAttendance()
        break
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-xl font-bold text-gray-800">Mark Attendance</h2>
            <Button
              onClick={handleClose}
              variant="ghost"
              size="sm"
              className="w-8 h-8 p-0 rounded-full hover:bg-gray-100"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Progress Steps */}
          <div className="p-6 pb-4">
            <div className="space-y-4">
              {steps.map((step, index) => (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex items-center space-x-4 p-3 rounded-lg transition-colors ${
                    step.status === 'completed' 
                      ? 'bg-green-50 border border-green-200' 
                      : step.status === 'in-progress'
                      ? 'bg-blue-50 border border-blue-200'
                      : step.status === 'failed'
                      ? 'bg-red-50 border border-red-200'
                      : 'bg-gray-50 border border-gray-200'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    step.status === 'completed'
                      ? 'bg-green-500 text-white'
                      : step.status === 'in-progress'
                      ? 'bg-blue-500 text-white'
                      : step.status === 'failed'
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-300 text-gray-600'
                  }`}>
                    {step.status === 'completed' ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : step.status === 'failed' ? (
                      <AlertCircle className="w-4 h-4" />
                    ) : step.status === 'in-progress' ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span className="text-xs font-bold">{index + 1}</span>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <p className={`font-medium ${
                      step.status === 'completed' ? 'text-green-700' :
                      step.status === 'in-progress' ? 'text-blue-700' :
                      step.status === 'failed' ? 'text-red-700' : 'text-gray-700'
                    }`}>
                      {step.title}
                    </p>
                    <p className="text-sm text-gray-600">{step.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div className="px-6 pb-4">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-red-100 border border-red-300 rounded-lg text-red-700 text-sm mb-4"
              >
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              </motion.div>
            )}

            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-green-100 border border-green-300 rounded-lg text-green-700 text-sm mb-4"
              >
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>{success}</span>
                </div>
              </motion.div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="p-6 pt-2 border-t bg-gray-50">
            {currentStep === 'network' && (
              <Button 
                onClick={startNetworkVerification}
                className="w-full"
                disabled={isLoading}
              >
                <Wifi className="w-4 h-4 mr-2" />
                Verify Network Connection
              </Button>
            )}

            {currentStep === 'camera' && (
              <Button 
                onClick={startFaceCapture}
                className="w-full"
                disabled={isLoading}
              >
                <Camera className="w-4 h-4 mr-2" />
                Capture Face
              </Button>
            )}

            {currentStep === 'verify' && (
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-gray-600">Verifying your identity...</p>
              </div>
            )}

            {currentStep === 'complete' && (
              <div className="text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="font-medium text-green-700 mb-2">Attendance Marked Successfully!</p>
                <p className="text-sm text-gray-600">Your attendance has been recorded.</p>
              </div>
            )}

            {error && (
              <Button 
                onClick={retryCurrentStep}
                variant="outline"
                className="w-full mt-3"
                disabled={isLoading}
              >
                Try Again
              </Button>
            )}
          </div>
        </motion.div>

        {/* Face Capture Modal */}
        {showFaceCapture && (
          <SimpleFaceCapture
            isOpen={showFaceCapture}
            onComplete={handleFaceCapture}
            onClose={() => setShowFaceCapture(false)}
          />
        )}
      </motion.div>
    </AnimatePresence>
  )
}