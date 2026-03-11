'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AdminDashboard from './admin'
import AdvocateDashboard from './advocate'
import AssistantDashboard from './assistant'
import SalesDashboard from './sales'
import { useAuth } from '@/context/AuthContext'
import AdminSidebar from '@/components/navigation/AdminSidebar'
import AdvocateSidebar from '@/components/navigation/AdvocateSidebar'
import AssistantSidebar from '@/components/navigation/AssistantSidebar'
import SalesSidebar from '@/components/navigation/SalesSidebar'
import OverlordSidebar from '@/components/navigation/OverlordSidebar'
import SuperAdminDashboard from './superadmin'
import BillcutSidebar from '@/components/navigation/BillcutSidebar'
import BillcutDashboard from '@/app/dashboard/billcut'
import BillcutLeadReport from '../billcutLeadReport/page'

const DashboardPage = () => {
  const { user, userRole, userName, loading, logout } = useAuth()
  const router = useRouter()
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = (typeof window !== 'undefined') ? require('react').useState(false) : [false, () => {}];

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
        return (
          <div className={`fixed inset-y-0 left-0 z-50 transform ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-300 ease-in-out flex-shrink-0`}>
            <AdminSidebar />
          </div>
        )
      case 'advocate':
        return (
          <div className={`fixed inset-y-0 left-0 z-50 transform ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-300 ease-in-out flex-shrink-0`}>
            <AdvocateSidebar />
          </div>
        )
      case 'assistant':
        return (
          <div className={`fixed inset-y-0 left-0 z-50 transform ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-300 ease-in-out flex-shrink-0`}>
            <AssistantSidebar />
          </div>
        )
      case 'sales':
        return (
          <div className={`fixed inset-y-0 left-0 z-50 transform ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-300 ease-in-out flex-shrink-0`}>
            <SalesSidebar />
          </div>
        )
      case 'overlord':
        return (
          <OverlordSidebar>
            <div className="flex flex-col h-full bg-gray-100">
              <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                  <div className="flex items-center">
                    {/* The toggle is now handled by OverlordSidebar internally if we want, 
                        or we can use our state. Since we have isMobileSidebarOpen in DashboardPage, 
                        let's use that but OverlordSidebar doesn't have a prop for it yet.
                        Actually, OverlordSidebar now has its own internal toggle.
                     */}
                    <h1 className="text-lg sm:text-xl font-bold text-gray-900">AMA Workspace</h1>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs sm:text-sm text-gray-600 hidden sm:inline">Welcome, {userName}</span>
                    <button 
                      onClick={() => logout()}
                      className="bg-red-600 text-white px-3 py-1 rounded text-xs sm:text-sm hover:bg-red-700"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              </header>
              <main className="flex-1 overflow-y-auto w-full">
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
      case 'assistant':
        return <AssistantDashboard />
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
    return renderSidebar()
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Role-specific Sidebar */}
      {renderSidebar()}
      
      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && userRole !== 'overlord' && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden w-full">
        {/* Header */}
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <div className="flex items-center">
              <button
                onClick={() => setIsMobileSidebarOpen(true)}
                className="md:hidden mr-3 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h1 className="text-lg sm:text-xl font-bold text-gray-900">AMA Workspace</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs sm:text-sm text-gray-600 hidden sm:inline">Welcome, {userName}</span>
              <button 
                onClick={() => logout()}
                className="bg-red-600 text-white px-3 py-1 rounded text-xs sm:text-sm hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 overflow-y-auto bg-gray-100 w-full">
          {renderDashboard()}
        </main>
      </div>
    </div>
  )
}

export default DashboardPage
