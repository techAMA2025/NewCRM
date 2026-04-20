'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { FaChartPie, FaUserPlus, FaHandshake, FaClipboardList, FaMoneyBillWave, FaChartLine, FaCalendarAlt, FaMoon, FaSun, FaBars, FaChevronLeft, FaSignOutAlt, FaFileAlt, FaCalculator, FaClipboardCheck, FaEnvelopeOpenText } from 'react-icons/fa'
import { getAuth, signOut } from 'firebase/auth'
import { toast } from 'react-hot-toast'
import { app } from '@/firebase/firebase'

// Add interface for component props
interface SalesSidebarProps {
  collapsed?: boolean;
}

const SalesSidebar: React.FC<SalesSidebarProps> = ({ collapsed }) => {
  const pathname = usePathname()
  const router = useRouter()
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  
  // Check system preference or stored preference on component mount
  useEffect(() => {
    // Check for saved theme preference or use system preference
    const savedTheme = localStorage.getItem('theme')
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    
    const shouldUseDark = savedTheme === 'dark' || (!savedTheme && systemPrefersDark)
    setIsDarkMode(shouldUseDark)
    
    if (shouldUseDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }

    // Load saved sidebar state
    const savedSidebarState = localStorage.getItem('sidebarCollapsed')
    if (savedSidebarState) {
      setIsCollapsed(savedSidebarState === 'true')
    }
  }, [])
  
  // Toggle dark mode
  const toggleDarkMode = () => {
    setIsDarkMode(prev => {
      const newMode = !prev
      localStorage.setItem('theme', newMode ? 'dark' : 'light')
      
      if (newMode) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
      
      return newMode
    })
  }

  // Toggle sidebar collapse
  const toggleSidebar = () => {
    setIsCollapsed(prev => {
      const newState = !prev
      localStorage.setItem('sidebarCollapsed', String(newState))
      return newState
    })
  }
  
  const isActive = (path: string) => {
    return pathname === path ? 'bg-green-700 dark:bg-gray-700' : ''
  }

  const handleLogout = async () => {
    try {
      const auth = getAuth(app);
      await signOut(auth);
      localStorage.removeItem('userName');
      toast.success('Logged out successfully');
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to log out');
    }
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      {!isMobileOpen && (
        <button
          onClick={() => setIsMobileOpen(true)}
          className="md:hidden fixed top-4 left-4 z-40 p-2 bg-green-800 text-white rounded-lg shadow-lg"
        >
          <FaBars />
        </button>
      )}

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <div className={`fixed md:relative inset-y-0 left-0 z-50 transform ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out bg-green-800 dark:bg-gray-900 text-white flex-shrink-0 py-6 transition-all duration-300 min-h-screen flex flex-col ${isCollapsed ? 'w-16' : 'w-64'}`}>
        <div className={`px-6 mb-8 flex ${isCollapsed ? 'justify-center' : 'justify-between'} items-center`}>
          {!isCollapsed && <h2 className="text-xl font-bold">Sales Portal</h2>}
          <div className="flex items-center">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-full hover:bg-green-700 dark:hover:bg-gray-800"
              aria-label="Toggle sidebar"
            >
              {isCollapsed ? <FaBars /> : <FaChevronLeft />}
            </button>
          </div>
        </div>
        
        <nav className="mt-4 flex-1">
          <ul>
            <li>
              <Link href="/dashboard" 
                className={`flex items-center py-3 hover:bg-green-700 dark:hover:bg-gray-800 ${isCollapsed ? 'justify-center px-0' : 'px-6'} ${isActive('/dashboard')}`}
                title={isCollapsed ? "Dashboard" : ""}
              >
                <FaChartPie className={isCollapsed ? '' : 'mr-3'} />
                {!isCollapsed && <span>Dashboard</span>}
              </Link>
            </li>
            <li>
              <Link href="/ama_leads" 
                className={`flex items-center py-3 hover:bg-green-700 dark:hover:bg-gray-800 ${isCollapsed ? 'justify-center px-0' : 'px-6'} ${isActive('/sales/leads')}`}
                title={isCollapsed ? "Leads" : ""}
              >
                <FaUserPlus className={isCollapsed ? '' : 'mr-3'} />
                {!isCollapsed && <span>Leads</span>}
              </Link>
            </li>
            <li>
              <Link href="/billcutleads" 
                className={`flex items-center py-3 hover:bg-green-700 dark:hover:bg-gray-800 ${isCollapsed ? 'justify-center px-0' : 'px-6'} ${isActive('/billcut-leads')}`}
                title={isCollapsed ? "Billcut Leads" : ""}
              >
                <FaClipboardCheck className={isCollapsed ? '' : 'mr-3'} />
                {!isCollapsed && <span>Billcut Leads</span>}
              </Link>
            </li>
            <li>
              <Link href="/pendingdetails" 
                className={`flex items-center py-3 hover:bg-green-700 dark:hover:bg-gray-800 ${isCollapsed ? 'justify-center px-0' : 'px-6'} ${isActive('/pendingdetails')}`}
                title={isCollapsed ? "Pending Details" : ""}
              >
                <FaClipboardList className={isCollapsed ? '' : 'mr-3'} />
                {!isCollapsed && <span>Pending Details</span>}
              </Link>
            </li>
            <li>
              <Link href="/myclients" 
                className={`flex items-center py-3 hover:bg-green-700 dark:hover:bg-gray-800 ${isCollapsed ? 'justify-center px-0' : 'px-6'} ${isActive('/myclients')}`}
                title={isCollapsed ? "My Clients" : ""}
              >
                <FaHandshake className={isCollapsed ? '' : 'mr-3'} />
                {!isCollapsed && <span>My Clients</span>}
              </Link>
            </li>
            <li>
              <Link href="/appLeads" 
                className={`flex items-center py-3 hover:bg-green-700 dark:hover:bg-gray-800 ${isCollapsed ? 'justify-center px-0' : 'px-6'} ${isActive('/appLeads')}`}
                title={isCollapsed ? "App Users" : ""}
              >
                <FaClipboardList className={isCollapsed ? '' : 'mr-3'} />
                {!isCollapsed && <span>App Users</span>}
              </Link>
            </li>
            <li>
              <Link href="/appDisputes" 
                className={`flex items-center py-3 hover:bg-green-700 dark:hover:bg-gray-800 ${isCollapsed ? 'justify-center px-0' : 'px-6'} ${isActive('/appDisputes')}`}
                title={isCollapsed ? "App Leads" : ""}
              >
                <FaClipboardList className={isCollapsed ? '' : 'mr-3'} />
                {!isCollapsed && <span>App Leads</span>}
              </Link>
            </li>
            <li>
              <Link href="/payapproval" 
                className={`flex items-center py-3 hover:bg-green-700 dark:hover:bg-gray-800 ${isCollapsed ? 'justify-center px-0' : 'px-6'} ${isActive('/sales/opportunities')}`}
                title={isCollapsed ? "Payment Approvals" : ""}
              >
                <FaMoneyBillWave className={isCollapsed ? '' : 'mr-3'} />
                {!isCollapsed && <span>Payment Approvals</span>}
              </Link>
            </li>
            <li>
              <Link href="/send-agreement" 
                className={`flex items-center py-3 hover:bg-green-700 dark:hover:bg-gray-800 ${isCollapsed ? 'justify-center px-0' : 'px-6'} ${isActive('/send-agreement')}`}
                title={isCollapsed ? "Send Agreement" : ""}
              >
                <FaEnvelopeOpenText className={isCollapsed ? '' : 'mr-3'} />
                {!isCollapsed && <span>Send Agreement</span>}
              </Link>
            </li>
            <li>
              <Link href="/escalations" 
                className={`flex items-center py-3 hover:bg-green-700 dark:hover:bg-gray-800 ${isCollapsed ? 'justify-center px-0' : 'px-6'} ${isActive('/escalations')}`}
                title={isCollapsed ? "Escalations" : ""}
              >
                <FaEnvelopeOpenText className={isCollapsed ? '' : 'mr-3'} />
                {!isCollapsed && <span>Escalations</span>}
              </Link>
            </li>
            <li>
              <Link href="/calculator" 
                className={`flex items-center py-3 hover:bg-green-700 dark:hover:bg-gray-800 ${isCollapsed ? 'justify-center px-0' : 'px-6'} ${isActive('/calculator')}`}
                title={isCollapsed ? "Calculator" : ""}
              >
                <FaCalculator className={isCollapsed ? '' : 'mr-3'} />
                {!isCollapsed && <span>Calculator</span>}
              </Link>
            </li>
            <li>
              <Link href="/settlement-analysis" 
                className={`flex items-center py-3 hover:bg-green-700 dark:hover:bg-gray-800 ${isCollapsed ? 'justify-center px-0' : 'px-6'} ${isActive('/settlement-analysis')}`}
                title={isCollapsed ? "Settlement Analysis" : ""}
              >
                <FaChartPie className={isCollapsed ? '' : 'mr-3'} />
                {!isCollapsed && <span>Settlement Analysis</span>}
              </Link>
            </li>
            
            <div className="my-4 mx-6 border-t border-green-700 dark:border-gray-700"></div>
            
            <li>
              <button
                onClick={handleLogout}
                className={`flex items-center py-3 hover:bg-red-700 dark:hover:bg-red-800 w-full ${isCollapsed ? 'justify-center px-0' : 'px-6'}`}
                title={isCollapsed ? "Logout" : ""}
              >
                <FaSignOutAlt className={isCollapsed ? '' : 'mr-3'} />
                {!isCollapsed && <span>Logout</span>}
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </>
  )
}

export default SalesSidebar