'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, User, Mail, Building, Users, Camera, Check, ArrowLeft, ArrowRight, Lock } from 'lucide-react'
import { SimpleFaceCapture } from './SimpleFaceCapture'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { authApi } from '../lib/api'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '../lib/auth-store'

interface RegistrationFormData {
  email: string
  password: string
  confirmPassword: string
  fullName: string
  facultyId: string
  department: string
  designation: string
}

export function EnhancedRegistration() {
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showFaceCapture, setShowFaceCapture] = useState(false)
  const [faceImages, setFaceImages] = useState<string[]>([])
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  const router = useRouter()
  const { login } = useAuthStore()

  const [formData, setFormData] = useState<RegistrationFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    facultyId: '',
    department: '',
    designation: ''
  })

  const [validationErrors, setValidationErrors] = useState<Partial<RegistrationFormData>>({})

  // Validation functions
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validatePassword = (password: string) => {
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
    }
    return checks
  }

  const validateStep1 = () => {
    const errors: Partial<RegistrationFormData> = {}

    if (!formData.email) {
      errors.email = 'Email is required'
    } else if (!validateEmail(formData.email)) {
      errors.email = 'Please enter a valid email address'
    }

    if (!formData.password) {
      errors.password = 'Password is required'
    } else {
      const passwordChecks = validatePassword(formData.password)
      if (!passwordChecks.length) errors.password = 'Password must be at least 8 characters'
      else if (!passwordChecks.uppercase) errors.password = 'Password must contain an uppercase letter'
      else if (!passwordChecks.lowercase) errors.password = 'Password must contain a lowercase letter'
      else if (!passwordChecks.number) errors.password = 'Password must contain a number'
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password'
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match'
    }

    if (!formData.fullName) {
      errors.fullName = 'Full name is required'
    } else if (formData.fullName.length < 2) {
      errors.fullName = 'Full name must be at least 2 characters'
    }

    if (!formData.facultyId) {
      errors.facultyId = 'Faculty ID is required'
    } else if (formData.facultyId.length < 5) {
      errors.facultyId = 'Faculty ID must be at least 5 characters'
    }

    if (!formData.department) {
      errors.department = 'Department is required'
    }

    if (!formData.designation) {
      errors.designation = 'Designation is required'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleInputChange = (field: keyof RegistrationFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: undefined }))
    }
    setError('')
  }

  const handleNextStep = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2)
    } else if (currentStep === 2 && faceImages.length >= 3) {
      setCurrentStep(3)
    }
  }

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleFaceCapture = (images: string[]) => {
    setFaceImages(images)
    setShowFaceCapture(false)
    setError('')
  }

  const handleFinalRegistration = async () => {
    setIsLoading(true)
    setError('')

    try {
      await authApi.register({
        email: formData.email,
        password: formData.password,
        full_name: formData.fullName,
        faculty_id: formData.facultyId,
        department: formData.department,
        designation: formData.designation,
        face_images: faceImages
      })

      // Auto-login after successful registration
      const loginResponse = await authApi.login(formData.email, formData.password)
      login(loginResponse.user, loginResponse.access_token)
      router.push('/dashboard')
    } catch (err: any) {
      console.error('Registration error:', err)
      let errorMessage = 'Registration failed. Please try again.'
      
      if (err.response?.data?.detail) {
        if (typeof err.response.data.detail === 'string') {
          errorMessage = err.response.data.detail
        } else if (Array.isArray(err.response.data.detail)) {
          errorMessage = err.response.data.detail.map((e: any) => e.msg).join(', ')
        }
      }
      
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const steps = [
    { number: 1, title: 'Basic Information', description: 'Enter your details' },
    { number: 2, title: 'Face Capture', description: 'Take photos for verification' },
    { number: 3, title: 'Confirm', description: 'Review and submit' }
  ]

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Card className="bg-white/95 backdrop-blur-sm shadow-2xl border-0">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl font-bold text-gray-800">Create Account</CardTitle>
          <CardDescription className="text-gray-600">
            Join the KL University Faculty Attendance System
          </CardDescription>
          
          {/* Progress Indicator */}
          <div className="flex items-center justify-center mt-6 space-x-4">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div className={`flex flex-col items-center ${index < steps.length - 1 ? 'mr-4' : ''}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-300 ${
                    currentStep > step.number 
                      ? 'bg-green-500 text-white' 
                      : currentStep === step.number 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-200 text-gray-600'
                  }`}>
                    {currentStep > step.number ? <Check className="w-5 h-5" /> : step.number}
                  </div>
                  <div className="text-xs mt-1 text-center">
                    <div className="font-medium">{step.title}</div>
                    <div className="text-gray-500">{step.description}</div>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-12 h-0.5 transition-all duration-300 ${
                    currentStep > step.number ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
            >
              {error}
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Email */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                          validationErrors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                        placeholder="your.email@domain.com"
                      />
                    </div>
                    {validationErrors.email && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.email}</p>
                    )}
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                          validationErrors.password ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {validationErrors.password && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.password}</p>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={formData.confirmPassword}
                        onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                        className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                          validationErrors.confirmPassword ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                      >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {validationErrors.confirmPassword && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.confirmPassword}</p>
                    )}
                  </div>

                  {/* Full Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        value={formData.fullName}
                        onChange={(e) => handleInputChange('fullName', e.target.value)}
                        className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                          validationErrors.fullName ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                        placeholder="Dr. John Smith"
                      />
                    </div>
                    {validationErrors.fullName && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.fullName}</p>
                    )}
                  </div>

                  {/* Faculty ID */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Faculty ID
                    </label>
                    <input
                      type="text"
                      value={formData.facultyId}
                      onChange={(e) => handleInputChange('facultyId', e.target.value.toUpperCase())}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                        validationErrors.facultyId ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="FAC-12345"
                    />
                    {validationErrors.facultyId && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.facultyId}</p>
                    )}
                  </div>

                  {/* Department */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Department
                    </label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <select
                        value={formData.department}
                        onChange={(e) => handleInputChange('department', e.target.value)}
                        className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors appearance-none ${
                          validationErrors.department ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Select Department</option>
                        <option value="Computer Science">Computer Science</option>
                        <option value="Information Technology">Information Technology</option>
                        <option value="Electronics & Communication">Electronics & Communication</option>
                        <option value="Mechanical Engineering">Mechanical Engineering</option>
                        <option value="Civil Engineering">Civil Engineering</option>
                        <option value="Electrical Engineering">Electrical Engineering</option>
                        <option value="Mathematics">Mathematics</option>
                        <option value="Physics">Physics</option>
                        <option value="Chemistry">Chemistry</option>
                        <option value="Management Studies">Management Studies</option>
                      </select>
                    </div>
                    {validationErrors.department && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.department}</p>
                    )}
                  </div>

                  {/* Designation */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Designation
                    </label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <select
                        value={formData.designation}
                        onChange={(e) => handleInputChange('designation', e.target.value)}
                        className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors appearance-none ${
                          validationErrors.designation ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Select Designation</option>
                        <option value="Professor">Professor</option>
                        <option value="Associate Professor">Associate Professor</option>
                        <option value="Assistant Professor">Assistant Professor</option>
                        <option value="Lecturer">Lecturer</option>
                        <option value="Senior Lecturer">Senior Lecturer</option>
                        <option value="Research Associate">Research Associate</option>
                        <option value="Teaching Assistant">Teaching Assistant</option>
                      </select>
                    </div>
                    {validationErrors.designation && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.designation}</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    onClick={handleNextStep}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3"
                  >
                    Continue to Face Capture
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Face Capture */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="text-center space-y-6"
              >
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Face Recognition Setup</h3>
                  <p className="text-gray-600">
                    We need to capture clear photos of your face for attendance verification
                  </p>
                </div>

                {faceImages.length === 0 ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <Camera className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-blue-800 mb-2">Ready to Capture</h4>
                    <p className="text-blue-600 mb-4">
                      We'll guide you through taking 3 clear photos of your face
                    </p>
                    <Button
                      onClick={() => setShowFaceCapture(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Start Face Capture
                    </Button>
                  </div>
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <Check className="w-16 h-16 text-green-600 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-green-800 mb-2">Photos Captured Successfully!</h4>
                    <p className="text-green-600 mb-4">
                      {faceImages.length} photos captured and ready for verification
                    </p>
                    
                    {/* Show captured images */}
                    <div className="flex justify-center space-x-3 mb-4">
                      {faceImages.map((image, index) => (
                        <img
                          key={index}
                          src={image}
                          alt={`Face capture ${index + 1}`}
                          className="w-16 h-16 rounded-lg object-cover border-2 border-green-300"
                        />
                      ))}
                    </div>
                    
                    <Button
                      onClick={() => setShowFaceCapture(true)}
                      variant="outline"
                      className="mr-3"
                    >
                      Retake Photos
                    </Button>
                  </div>
                )}

                <div className="flex justify-between pt-4">
                  <Button
                    onClick={handlePrevStep}
                    variant="outline"
                    className="px-6 py-3"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  
                  {faceImages.length >= 3 && (
                    <Button
                      onClick={handleNextStep}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3"
                    >
                      Review & Submit
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                </div>
              </motion.div>
            )}

            {/* Step 3: Confirmation */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Review Your Information</h3>
                  <p className="text-gray-600">
                    Please confirm your details are correct before submitting
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-gray-700">Email</h4>
                      <p className="text-gray-600">{formData.email}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-700">Full Name</h4>
                      <p className="text-gray-600">{formData.fullName}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-700">Faculty ID</h4>
                      <p className="text-gray-600">{formData.facultyId}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-700">Department</h4>
                      <p className="text-gray-600">{formData.department}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-700">Designation</h4>
                      <p className="text-gray-600">{formData.designation}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-700">Face Photos</h4>
                      <p className="text-gray-600">{faceImages.length} photos captured</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <Button
                    onClick={handlePrevStep}
                    variant="outline"
                    className="px-6 py-3"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  
                  <Button
                    onClick={handleFinalRegistration}
                    disabled={isLoading}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-3"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Creating Account...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Create Account
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Face Capture Modal */}
      <SimpleFaceCapture
        isOpen={showFaceCapture}
        onClose={() => setShowFaceCapture(false)}
        onComplete={handleFaceCapture}
      />
    </div>
  )
}