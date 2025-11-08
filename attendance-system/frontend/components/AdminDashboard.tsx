'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Users, 
  Calendar, 
  Download, 
  Search, 
  Filter,
  ChevronDown,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  TrendingUp,
  UserCheck,
  AlertCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { authApi, adminApi } from '../lib/api'

interface StudentRecord {
  id: string
  student_id: string
  full_name: string
  department: string
  email: string
  totalDays: number
  presentDays: number
  percentage: number
  lastAttendance?: string | null
  status: 'active' | 'low_attendance' | 'inactive'
  embeddings_count?: number
}

interface AdminDashboardProps {
  isOpen: boolean
  onClose: () => void
}

export default function AdminDashboard({ isOpen, onClose }: AdminDashboardProps) {
  const [students, setStudents] = useState<StudentRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterDepartment, setFilterDepartment] = useState('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'low_attendance'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'percentage' | 'department'>('name')
  const [currentPage, setCurrentPage] = useState(1)
  const [adminStats, setAdminStats] = useState({
    totalStudents: 0,
    avgAttendance: 0,
    lowAttendanceCount: 0,
    activeToday: 0
  })

  const studentsPerPage = 10

  useEffect(() => {
    if (isOpen) {
      loadAdminData()
    }
  }, [isOpen])

  const loadAdminData = async () => {
    try {
      setIsLoading(true)
      
      // Load real data from admin APIs
      const [stats, users, logs] = await Promise.all([
        adminApi.getStats(),
        adminApi.getUsers({ limit: 100 }),
        adminApi.getAttendanceLogs({ limit: 1000 })
      ])

      // Process users and calculate attendance statistics
      const studentsWithAttendance: StudentRecord[] = users.map((user: any) => {
        // Calculate attendance from logs for this user
        const userLogs = logs.records.filter((log: any) => log.user_id === user.id)
        const totalDays = 30 // This could be calculated based on semester/course dates
        const presentDays = userLogs.length
        const percentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0
        
        // Find last attendance
        const lastAttendance = userLogs.length > 0 
          ? userLogs.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0].timestamp
          : null

        return {
          id: user.id,
          student_id: user.student_id || 'N/A',
          full_name: user.full_name,
          department: user.department || 'Unknown',
          email: user.email,
          totalDays,
          presentDays,
          percentage,
          lastAttendance,
          status: percentage < 75 ? 'low_attendance' : 'active',
          embeddings_count: user.embeddings_count
        }
      })
      
      setStudents(studentsWithAttendance)
      
      // Update admin stats from real API data
      setAdminStats({
        totalStudents: stats.total_users,
        avgAttendance: Math.round(stats.verification_success_rate * 100),
        lowAttendanceCount: studentsWithAttendance.filter(s => s.percentage < 75).length,
        activeToday: stats.total_attendance_today
      })

    } catch (error) {
      console.error('Failed to load admin data:', error)
      // Fallback to empty data
      setStudents([])
      setAdminStats({
        totalStudents: 0,
        avgAttendance: 0,
        lowAttendanceCount: 0,
        activeToday: 0
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  const departments = ['all', ...Array.from(new Set(students.map(s => s.department)))]
  
  const filteredStudents = students.filter(student => {
    const matchesSearch = searchTerm === '' || 
      student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.student_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesDepartment = filterDepartment === 'all' || student.department === filterDepartment
    
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && student.status === 'active') ||
      (filterStatus === 'low_attendance' && student.percentage < 75)
    
    return matchesSearch && matchesDepartment && matchesStatus
  }).sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.full_name.localeCompare(b.full_name)
      case 'percentage':
        return b.percentage - a.percentage
      case 'department':
        return a.department.localeCompare(b.department)
      default:
        return 0
    }
  })

  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * studentsPerPage,
    currentPage * studentsPerPage
  )

  const totalPages = Math.ceil(filteredStudents.length / studentsPerPage)

  const exportToCSV = () => {
    const csvContent = [
      ['Name', 'Faculty ID', 'Department', 'Email', 'Total Days', 'Present Days', 'Percentage', 'Last Attendance'].join(','),
      ...filteredStudents.map(student => [
        student.full_name,
        student.student_id,
        student.department,
        student.email,
        student.totalDays.toString(),
        student.presentDays.toString(),
        `${student.percentage}%`,
        student.lastAttendance ? new Date(student.lastAttendance).toLocaleDateString() : 'Never'
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendance_report_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
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
          className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full max-h-[95vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-purple-600 to-blue-600 text-white">
            <div>
              <h2 className="text-2xl font-bold">Admin Dashboard</h2>
              <p className="text-purple-100">Manage student attendance and view analytics</p>
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 rounded-full"
            >
              ✕
            </Button>
          </div>

          <div className="p-6 max-h-[calc(95vh-140px)] overflow-y-auto">
            {/* Admin Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Students</p>
                      <p className="text-2xl font-bold text-gray-900">{adminStats.totalStudents}</p>
                    </div>
                    <Users className="w-8 h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Avg Attendance</p>
                      <p className="text-2xl font-bold text-gray-900">{adminStats.avgAttendance}%</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Low Attendance</p>
                      <p className="text-2xl font-bold text-gray-900">{adminStats.lowAttendanceCount}</p>
                    </div>
                    <AlertCircle className="w-8 h-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Today</p>
                      <p className="text-2xl font-bold text-gray-900">{adminStats.activeToday}</p>
                    </div>
                    <UserCheck className="w-8 h-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="lg:col-span-2">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search students..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 w-full border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  
                  <select
                    value={filterDepartment}
                    onChange={(e) => setFilterDepartment(e.target.value)}
                    className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {departments.map(dept => (
                      <option key={dept} value={dept}>
                        {dept === 'all' ? 'All Departments' : dept}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Students</option>
                    <option value="active">Active</option>
                    <option value="low_attendance">Low Attendance</option>
                  </select>

                  <Button onClick={exportToCSV} variant="outline" className="flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Export
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Student List */}
            <Card>
              <CardHeader>
                <CardTitle>Student Attendance Records</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Loading student data...</p>
                  </div>
                ) : paginatedStudents.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No students found</p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Student
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Department
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Attendance
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Last Seen
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {paginatedStudents.map((student, index) => (
                            <motion.tr
                              key={student.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className="hover:bg-gray-50"
                            >
                              <td className="px-6 py-4">
                                <div>
                                  <p className="font-medium text-gray-900">{student.full_name}</p>
                                  <p className="text-sm text-gray-500">{student.student_id}</p>
                                  <p className="text-sm text-gray-500">{student.email}</p>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900">
                                {student.department}
                              </td>
                              <td className="px-6 py-4">
                                <div>
                                  <p className={`font-semibold ${
                                    student.percentage >= 90 ? 'text-green-600' :
                                    student.percentage >= 75 ? 'text-yellow-600' : 'text-red-600'
                                  }`}>
                                    {student.percentage}%
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    {student.presentDays}/{student.totalDays} days
                                  </p>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900">
                                {student.lastAttendance
                                  ? new Date(student.lastAttendance).toLocaleDateString()
                                  : 'Never'
                                }
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                  student.percentage >= 75 
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {student.percentage >= 75 ? 'Good' : 'Poor'}
                                </span>
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="mt-6 flex items-center justify-between">
                        <p className="text-sm text-gray-600">
                          Showing {((currentPage - 1) * studentsPerPage) + 1} to {Math.min(currentPage * studentsPerPage, filteredStudents.length)} of {filteredStudents.length} students
                        </p>
                        
                        <div className="flex space-x-2">
                          <Button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            variant="outline"
                            size="sm"
                          >
                            Previous
                          </Button>
                          
                          {[...Array(totalPages)].map((_, i) => (
                            <Button
                              key={i + 1}
                              onClick={() => setCurrentPage(i + 1)}
                              variant={currentPage === i + 1 ? "default" : "outline"}
                              size="sm"
                              className="w-10"
                            >
                              {i + 1}
                            </Button>
                          ))}
                          
                          <Button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            variant="outline"
                            size="sm"
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}