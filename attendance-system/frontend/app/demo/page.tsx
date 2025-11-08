'use client'

export default function DemoSetup() {
  const setupDemoUser = async () => {
    try {
      const response = await fetch('http://localhost:8000/auth/setup-dhanush-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      const result = await response.json()
      
      if (response.ok) {
        alert(`Demo user created successfully! 
        
Email: ${result.user.email}
Password: dhanush123
Faculty ID: ${result.user.faculty_id}

You can now login with these credentials.`)
      } else {
        alert(`Setup result: ${result.detail || result.message}`)
      }
    } catch (error) {
      console.error('Setup error:', error)
      alert('Error setting up demo user. Please check the console.')
    }
  }

  return (
    <div className="p-4">
      <h2>Demo Setup</h2>
      <button 
        onClick={setupDemoUser}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        Setup Demo User (Dhanush)
      </button>
    </div>
  )
}