'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { 
  Calendar, 
  Clock, 
  Users, 
  TrendingUp, 
  Camera, 
  Wifi, 
  CheckCircle, 
  AlertCircle,
  BarChart3,
  Settings,
  LogOut,
  User,
  Bell,
  Menu,
  X,
  ChevronDown
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { useAuthStore } from '../../lib/auth-store'
import { authApi, attendanceApi } from '../../lib/api'
import ClientOnly from '../../components/ClientOnly'
import AttendanceMarker from '../../components/AttendanceMarker'
import AttendanceHistory from '../../components/AttendanceHistory'
// import AdminDashboard from '../../components/AdminDashboard'

interface AttendanceStats {
  totalDays: number
  presentDays: number
  percentage: number
  streak: number
}

interface RecentAttendance {
  id: string
  date: string
  time: string
  status: 'present' | 'absent'
  confidence: number
  location: string
}

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats>({
    totalDays: 0,
    presentDays: 0,
    percentage: 0,
    streak: 0
  })
  const [recentAttendance, setRecentAttendance] = useState<RecentAttendance[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [showAttendanceMarker, setShowAttendanceMarker] = useState(false)
  const [showAttendanceHistory, setShowAttendanceHistory] = useState(false)
  const [showAdminDashboard, setShowAdminDashboard] = useState(false)
  
  const router = useRouter()
  const { user, logout, isAuthenticated, isHydrated, initializeAuth } = useAuthStore()

  useEffect(() => {
    setMounted(true)
    initializeAuth()
  }, [initializeAuth])

  useEffect(() => {
    if (!mounted || !isHydrated) return
    
    if (!isAuthenticated) {
      router.push('/')
      return
    }
    
    // Add a small delay to ensure cookies are properly set before loading data
    const timer = setTimeout(() => {
      loadAttendanceData()
    }, 100)
    
    return () => clearTimeout(timer)
  }, [isAuthenticated, isHydrated, router, mounted])

  const loadAttendanceData = async () => {
    try {
      console.log('Loading attendance data...')
      setIsLoading(true)
      setError(null)
      
      // Check if we have a token before making API calls
      const token = document.cookie.split('; ').find(row => row.startsWith('access_token='))
      console.log('Token available for API call:', !!token)
      
      // Get recent attendance records
      console.log('Fetching my records...')
      const records = await attendanceApi.getMyRecords(10, 0)
      console.log('Records received:', records)
      
      // Get today's summary
      console.log('Fetching today summary...')
      const todaySummary = await attendanceApi.getTodaySummary()
      console.log('Today summary received:', todaySummary)
      
      // Calculate stats from records
      const totalDays = records.length > 0 ? records.length : 0
      const presentDays = records.filter((r: any) => r.status === 'present').length
      const percentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0
      
      // Calculate streak (consecutive present days)
      let streak = 0
      const sortedRecords = [...records].sort((a: any, b: any) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      
      for (const record of sortedRecords) {
        if (record.status === 'present') {
          streak++
        } else {
          break
        }
      }
      
      setAttendanceStats({
        totalDays,
        presentDays,
        percentage,
        streak
      })
      
      // Format recent attendance for display
      const formattedRecords = records.map((record: any) => ({
        id: record.id,
        date: new Date(record.timestamp).toISOString().split('T')[0],
        time: new Date(record.timestamp).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }),
        status: record.status,
        confidence: record.confidence_score,
        location: record.location_verified ? 'Campus Verified' : 'Location Unknown'
      }))
      
      setRecentAttendance(formattedRecords)
      
    } catch (error: any) {
      console.error('Error loading attendance data:', error)
      const errorMessage = error.response?.data?.detail || 'Failed to load attendance data'
      setError(errorMessage)
      
      // Set empty data on error
      setAttendanceStats({
        totalDays: 0,
        presentDays: 0,
        percentage: 0,
        streak: 0
      })
      setRecentAttendance([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    authApi.logout()
    logout()
    router.push('/')
  }

  const handleAttendanceSuccess = () => {
    // Reload attendance data after successful attendance marking
    loadAttendanceData()
  }

  useEffect(() => {
    // Initialize time on client
    setCurrentTime(new Date())
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  }

  const sidebarVariants = {
    closed: { x: '-100%' },
    open: { x: 0 }
  }

  const StatCard = ({ title, value, icon: Icon, color, subtitle }: any) => (
    <motion.div
      variants={itemVariants}
      whileHover={{ scale: 1.02, y: -2 }}
      className="relative overflow-hidden"
    >
      <Card className="bg-gradient-to-br from-white to-gray-50 border-0 shadow-lg hover:shadow-xl transition-all duration-300">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className={`p-3 rounded-xl bg-gradient-to-br ${color}`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
              className="text-right"
            >
              <p className="text-2xl font-bold text-gray-800">{value}</p>
              <p className="text-sm text-gray-600">{title}</p>
            </motion.div>
          </div>
        </CardHeader>
        {subtitle && (
          <CardContent className="pt-0">
            <p className="text-xs text-gray-500">{subtitle}</p>
          </CardContent>
        )}
      </Card>
    </motion.div>
  )

  if (!mounted || !isHydrated || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <ClientOnly>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <motion.aside
        variants={sidebarVariants}
        animate={sidebarOpen ? 'open' : 'closed'}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed left-0 top-0 h-full w-64 bg-white shadow-xl z-50 lg:translate-x-0"
      >
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">{user?.full_name || 'Faculty Member'}</h3>
                <p className="text-sm text-gray-600">{user?.department || 'Department'}</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <nav className="p-4 space-y-2">
          {[
            { icon: BarChart3, label: 'Dashboard', active: true, onClick: () => {} },
            { icon: Camera, label: 'Mark Attendance', onClick: () => setShowAttendanceMarker(true) },
            { icon: Calendar, label: 'Attendance History', onClick: () => setShowAttendanceHistory(true) },
            { icon: Users, label: 'Admin Dashboard', onClick: () => setShowAdminDashboard(true), adminOnly: true },
            { icon: Settings, label: 'Profile Settings', onClick: () => {} },
            { icon: Bell, label: 'Notifications', onClick: () => {} },
          ].filter(item => !item.adminOnly || user?.designation === 'Professor').map((item, index) => (
            <motion.button
              key={item.label}
              onClick={item.onClick}
              whileHover={{ x: 4 }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                item.active 
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' 
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </motion.button>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5 mr-3" />
            Sign Out
          </Button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="lg:ml-64 min-h-screen">
        {/* Header */}
        <header className="bg-white shadow-sm border-b sticky top-0 z-30">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
                <p className="text-gray-600">Welcome back, Dr. Faculty</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-800">
                  {currentTime ? currentTime.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  }) : 'Loading...'}
                </p>
                <p className="text-lg font-bold text-blue-600">
                  {currentTime ? currentTime.toLocaleTimeString() : '--:--:--'}
                </p>
              </div>
              <div className="relative">
                <button className="p-2 rounded-full bg-blue-100 hover:bg-blue-200 transition-colors">
                  <Bell className="w-5 h-5 text-blue-600" />
                </button>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="p-6">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-8"
          >
            {/* Quick Actions */}
            <motion.div variants={itemVariants} className="mb-8">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full transform translate-x-16 -translate-y-16"></div>
                <div className="relative z-10">
                  <h2 className="text-2xl font-bold mb-2">Ready to mark attendance?</h2>
                  <p className="text-blue-100 mb-6">Use face recognition for quick and secure attendance marking</p>
                  <Button 
                    onClick={() => setShowAttendanceMarker(true)}
                    className="bg-white text-blue-600 hover:bg-blue-50 font-semibold"
                  >
                    <Camera className="w-5 h-5 mr-2" />
                    Mark Attendance Now
                  </Button>
                </div>
              </div>
            </motion.div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Attendance Rate"
                value={`${attendanceStats.percentage}%`}
                icon={TrendingUp}
                color="from-green-500 to-emerald-600"
                subtitle={`${attendanceStats.presentDays}/${attendanceStats.totalDays} days present`}
              />
              <StatCard
                title="Current Streak"
                value={`${attendanceStats.streak} days`}
                icon={CheckCircle}
                color="from-blue-500 to-blue-600"
                subtitle="Consecutive present days"
              />
              <StatCard
                title="This Month"
                value="20/22"
                icon={Calendar}
                color="from-purple-500 to-purple-600"
                subtitle="September 2025"
              />
              <StatCard
                title="Network Status"
                value="Connected"
                icon={Wifi}
                color="from-orange-500 to-red-600"
                subtitle="Dhanush Hotspot"
              />
            </div>

            {/* Recent Activity */}
            <motion.div variants={itemVariants}>
              <Card className="bg-white shadow-lg border-0">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        <Clock className="w-5 h-5 text-blue-600" />
                        <span>Recent Attendance</span>
                      </CardTitle>
                      <CardDescription>Your attendance history for the past week</CardDescription>
                    </div>
                    <Button
                      onClick={() => setShowAttendanceHistory(true)}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <BarChart3 className="w-4 h-4" />
                      View All
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {error && (
                    <div className="text-center py-8">
                      <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                      <p className="text-gray-600 mb-4">Failed to load attendance data</p>
                      <Button onClick={loadAttendanceData} size="sm" variant="outline">
                        Try Again
                      </Button>
                    </div>
                  )}
                  
                  {!error && recentAttendance.length === 0 && (
                    <div className="text-center py-8">
                      <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-2">No attendance records yet</p>
                      <p className="text-sm text-gray-500">Start marking your attendance to see your history here</p>
                    </div>
                  )}

                  {!error && recentAttendance.length > 0 && (
                    <div className="space-y-4">
                      {recentAttendance.map((record, index) => (
                        <motion.div
                          key={record.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center space-x-4">
                            <div className={`w-3 h-3 rounded-full ${
                              record.status === 'present' ? 'bg-green-500' : 'bg-red-500'
                            }`}></div>
                            <div>
                              <p className="font-medium text-gray-800">
                                {new Date(record.date).toLocaleDateString('en-US', { 
                                  weekday: 'short', 
                                  month: 'short', 
                                  day: 'numeric' 
                                })}
                              </p>
                              <p className="text-sm text-gray-600">{record.time}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-medium capitalize ${
                              record.status === 'present' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {record.status}
                            </p>
                            {record.confidence > 0 && (
                              <p className="text-sm text-gray-500">
                                {record.confidence}% confidence
                              </p>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </main>
      </div>
    </div>

    {/* Attendance Marker Modal */}
    <AttendanceMarker
      isOpen={showAttendanceMarker}
      onClose={() => setShowAttendanceMarker(false)}
      onSuccess={handleAttendanceSuccess}
    />

    {/* Attendance History Modal */}
    <AttendanceHistory
      isOpen={showAttendanceHistory}
      onClose={() => setShowAttendanceHistory(false)}
    />

    {/* Admin Dashboard Modal */}
    {/* <AdminDashboard
      isOpen={showAdminDashboard}
      onClose={() => setShowAdminDashboard(false)}
    /> */}
    </ClientOnly>
  )
}