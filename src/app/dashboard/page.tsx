'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AdminDashboard from './admin'
import AdvocateDashboard from './advocate'
import SalesDashboard from './sales'
import { useAuth } from '@/context/AuthContext'
import AdminSidebar from '@/components/navigation/AdminSidebar'
import AdvocateSidebar from '@/components/navigation/AdvocateSidebar'
import SalesSidebar from '@/components/navigation/SalesSidebar'
import OverlordSidebar from '@/components/navigation/OverlordSidebar'
import SuperAdminDashboard from './superadmin'
import BillcutSidebar from '@/components/navigation/BillcutSidebar'
import BillcutDashboard from '@/app/dashboard/billcut'
import BillcutLeadReport from '../billcutLeadReport/page'

const DashboardPage = () => {
  const { user, userRole, userName, loading, logout } = useAuth()
  const router = useRouter()

  // Handle redirects for unauthenticated users
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">Loading dashboard...</p>
      </div>
    )
  }

  if (!user || !userRole) {
    return null // Will redirect in useEffect
  }

  // Determine which sidebar to show based on role
  const renderSidebar = () => {
    switch (userRole) {
      case 'admin':
        return <AdminSidebar />
      case 'advocate':
        return <AdvocateSidebar />
      case 'sales':
        return <SalesSidebar />
      case 'overlord':
        return (
          <OverlordSidebar>
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Header */}
              <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                  <h1 className="text-xl font-bold text-gray-900">AMA Workspace</h1>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">Welcome, {userName}</span>
                    <button 
                      onClick={logout}
                      className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              </header>

              {/* Dashboard Content */}
              <main className="flex-1 overflow-y-auto bg-gray-100">
                {renderDashboard()}
              </main>
            </div>
          </OverlordSidebar>
        )
      default:
        return null
    }
  }

  // Determine which dashboard to show based on role
  const renderDashboard = () => {
    switch (userRole) {
      case 'admin':
        return <AdminDashboard />
      case 'advocate':
        return <AdvocateDashboard />
      case 'sales':
        return <SalesDashboard />
      case 'overlord':
        return <SuperAdminDashboard />
      case 'billcut':
        return <BillcutLeadReport />
      default:
        return <div>Unknown role</div>
    }
  }

  // For overlord users, the sidebar already includes the content
  if (userRole === 'overlord') {
    return (
      <div className="flex h-screen bg-gray-100">
        {renderSidebar()}
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Role-specific Sidebar */}
      {renderSidebar()}
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <h1 className="text-xl font-bold text-gray-900">AMA Workspace</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Welcome, {userName}</span>
              <button 
                onClick={logout}
                className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 overflow-y-auto bg-gray-100">
          {renderDashboard()}
        </main>
      </div>
    </div>
  )
}

export default DashboardPage
