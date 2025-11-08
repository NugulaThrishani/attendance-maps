'use client'

import { SimpleFaceCapture } from '@/components/SimpleFaceCapture'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Lock, Mail, User, Wifi, Shield, Camera } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { authApi } from '../lib/api'
import { useAuthStore } from '../lib/auth-store'

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showFaceCapture, setShowFaceCapture] = useState(false)
  const [faceImages, setFaceImages] = useState<string[]>([])
  const router = useRouter()
  const { login, isAuthenticated, isHydrated, initializeAuth } = useAuthStore()
  
  useEffect(() => {
    initializeAuth()
  }, [initializeAuth])

  useEffect(() => {
    if (isHydrated && isAuthenticated) {
      router.push('/dashboard')
    }
  }, [isHydrated, isAuthenticated, router])

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    facultyId: '',
    department: '',
    designation: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      if (isLogin) {
        // Login
        setSuccess('Logging in...')
        const response = await authApi.login(formData.email, formData.password)
        
        // Map backend user format to frontend user format
        const mappedUser = {
          id: response.user.id,
          email: response.user.email,
          name: response.user.full_name,
          role: response.user.designation || 'Student',
          student_id: response.user.faculty_id,
          network_name: 'Dhanush',
          full_name: response.user.full_name,
          department: response.user.department,
          designation: response.user.designation,
          faculty_id: response.user.faculty_id
        }
        
        await login(mappedUser, response.access_token)
        setSuccess('Login successful! Redirecting to dashboard...')
        
        router.push('/dashboard')
      } else {
        // Register - check if face images are captured
        if (faceImages.length < 3) {
          setError('Please capture your face images first')
          setIsLoading(false)
          setShowFaceCapture(true)
          return
        }

        setSuccess('Creating your account...')
        await authApi.register({
          email: formData.email,
          password: formData.password,
          full_name: formData.fullName,
          faculty_id: formData.facultyId,
          department: formData.department,
          designation: formData.designation,
          face_images: faceImages
        })
        
        setSuccess('Registration successful! Please sign in with your credentials.')
        
        // Reset form and switch to login mode
        setFaceImages([])
        setFormData({
          email: formData.email, // Keep email for convenience
          password: '',
          fullName: '',
          facultyId: '',
          department: '',
          designation: ''
        })
        
        setTimeout(() => {
          setIsLogin(true) // Switch to login mode
          setSuccess('Account created successfully! You can now sign in.')
        }, 1500)
      }
    } catch (err: any) {
      console.error('Auth error:', err)
      let errorMessage = 'An error occurred. Please try again.'
      
      if (err.response?.data) {
        const errorData = err.response.data
        if (typeof errorData === 'string') {
          errorMessage = errorData
        } else if (errorData.detail) {
          // Handle FastAPI validation errors
          if (Array.isArray(errorData.detail)) {
            errorMessage = errorData.detail.map((error: any) => error.msg).join(', ')
          } else if (typeof errorData.detail === 'string') {
            errorMessage = errorData.detail
          } else {
            errorMessage = 'Validation error occurred.'
          }
        } else if (errorData.message) {
          errorMessage = errorData.message
        }
      }
      
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFaceCapture = (images: string[]) => {
    setFaceImages(images)
    setShowFaceCapture(false)
    setError('')
    setSuccess(`✓ ${images.length} face photos captured successfully!`)
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      setSuccess('')
    }, 3000)
  }

  const openFaceCapture = () => {
    setShowFaceCapture(true)
  }

  const switchMode = () => {
    setIsLogin(!isLogin)
    setError('')
    setSuccess('')
    setFaceImages([])
  }

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 }
  }

  const features = [
    {
      icon: Camera,
      title: "Face Recognition",
      description: "Advanced AI-powered facial recognition for secure attendance"
    },
    {
      icon: Wifi,
      title: "Network Verification",
      description: "Automatic campus Wi-Fi detection for location verification"
    },
    {
      icon: Shield,
      title: "Secure & Private",
      description: "Bank-grade security with encrypted data storage"
    }
  ]

  // Show loading while auth is initializing
  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Initializing...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
      {/* Background Animation */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute bg-white/5 rounded-full"
            style={{
              width: Math.random() * 300 + 50,
              height: Math.random() * 300 + 50,
              left: Math.random() * 100 + '%',
              top: Math.random() * 100 + '%',
            }}
            animate={{
              x: [0, Math.random() * 100 - 50],
              y: [0, Math.random() * 100 - 50],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              repeatType: "reverse",
            }}
          />
        ))}
      </div>

      <motion.div
        className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 relative z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Left Side - Features */}
        <motion.div
          className="hidden lg:flex flex-col justify-center space-y-8"
          variants={itemVariants}
        >
          <div>
            <motion.h1 
              className="text-5xl font-bold text-white mb-4"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              KL University
            </motion.h1>
            <motion.h2 
              className="text-3xl font-semibold text-blue-200 mb-6"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              Faculty Attendance System
            </motion.h2>
            <motion.p 
              className="text-lg text-blue-100"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              Next-generation attendance management with AI-powered face recognition and smart campus integration.
            </motion.p>
          </div>

          <motion.div className="space-y-6" variants={containerVariants}>
            {features.map((feature, index) => (
              <motion.div
                key={index}
                className="flex items-start space-x-4 bg-white/10 p-4 rounded-xl backdrop-blur-sm"
                variants={itemVariants}
                whileHover={{ scale: 1.02, x: 10 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="bg-blue-500 p-3 rounded-lg">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg">{feature.title}</h3>
                  <p className="text-blue-100 text-sm">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Right Side - Login Form */}
        <motion.div
          className="flex items-center justify-center"
          variants={itemVariants}
        >
          <Card className="w-full max-w-md bg-white/95 backdrop-blur-lg shadow-2xl border-0">
            <CardHeader className="text-center pb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.8 }}
                className="mx-auto mb-4 w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center"
              >
                <User className="w-8 h-8 text-white" />
              </motion.div>
              <CardTitle className="text-2xl font-bold text-gray-800">
                {isLogin ? 'Faculty Login' : 'Create Account'}
              </CardTitle>
              <CardDescription className="text-gray-600">
                {isLogin 
                  ? 'Access your attendance dashboard' 
                  : 'Join the KL University faculty system'
                }
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-red-100 border border-red-300 rounded-lg text-red-700 text-sm"
                >
                  {typeof error === 'string' ? error : 'An unexpected error occurred. Please try again.'}
                </motion.div>
              )}

              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-green-100 border border-green-300 rounded-lg text-green-700 text-sm flex items-center space-x-2"
                >
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{success}</span>
                </motion.div>
              )}

              <motion.form
                className="space-y-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                onSubmit={handleSubmit}
              >
                {!isLogin && (
                  <>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        placeholder="Full Name"
                        className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50/50"
                        value={formData.fullName}
                        onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="text"
                        placeholder="Faculty ID"
                        className="px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50/50"
                        value={formData.facultyId}
                        onChange={(e) => setFormData({...formData, facultyId: e.target.value})}
                      />
                      <select
                        className="px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50/50"
                        value={formData.department}
                        onChange={(e) => setFormData({...formData, department: e.target.value})}
                      >
                        <option value="">Department</option>
                        <option value="Computer Science">Computer Science</option>
                        <option value="Information Technology">Information Technology</option>
                        <option value="Electronics">Electronics</option>
                        <option value="Mechanical">Mechanical</option>
                        <option value="Civil">Civil</option>
                      </select>
                    </div>

                    <select
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50/50"
                      value={formData.designation}
                      onChange={(e) => setFormData({...formData, designation: e.target.value})}
                    >
                      <option value="">Designation</option>
                      <option value="Professor">Professor</option>
                      <option value="Associate Professor">Associate Professor</option>
                      <option value="Assistant Professor">Assistant Professor</option>
                      <option value="Lecturer">Lecturer</option>
                    </select>
                  </>
                )}

                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="email"
                    placeholder="Email Address"
                    className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50/50"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    className="w-full pl-11 pr-11 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50/50"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {/* Face Capture Section - Only for Registration */}
                {!isLogin && (
                  <motion.div
                    className="space-y-3"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                      <div className="flex items-center space-x-3">
                        <Camera className="w-6 h-6 text-blue-600" />
                        <div>
                          <h4 className="font-medium text-gray-800">Face Recognition Setup</h4>
                          <p className="text-sm text-gray-600">
                            {faceImages.length > 0 
                              ? `${faceImages.length} photos captured ✓` 
                              : 'Capture your face for attendance verification'
                            }
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        onClick={openFaceCapture}
                        variant="outline"
                        size="sm"
                        className={`${
                          faceImages.length > 0 
                            ? 'border-green-300 text-green-700 bg-green-50 hover:bg-green-100' 
                            : 'border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100'
                        }`}
                      >
                        {faceImages.length > 0 ? 'Retake Photos' : 'Capture Face'}
                      </Button>
                    </div>
                  </motion.div>
                )}

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button 
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 rounded-lg font-semibold text-lg shadow-lg disabled:opacity-50"
                  >
                    {isLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Please wait...</span>
                      </div>
                    ) : (
                      isLogin ? 'Sign In' : 'Create Account'
                    )}
                  </Button>
                </motion.div>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={switchMode}
                    className="text-blue-600 hover:text-blue-700 font-medium transition-colors duration-200"
                  >
                    {isLogin 
                      ? "Don't have an account? Sign up" 
                      : "Already have an account? Sign in"
                    }
                  </button>
                </div>
              </motion.form>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Simple Face Capture Modal */}
      <SimpleFaceCapture
        isOpen={showFaceCapture}
        onClose={() => setShowFaceCapture(false)}
        onComplete={handleFaceCapture}
      />
    </div>
  )
}