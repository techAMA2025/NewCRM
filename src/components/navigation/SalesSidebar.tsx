'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { FaChartPie, FaUserPlus, FaHandshake, FaClipboardList, FaMoneyBillWave, FaChartLine, FaCalendarAlt, FaMoon, FaSun, FaBars, FaChevronLeft, FaSignOutAlt, FaFileAlt, FaCalculator, FaClipboardCheck } from 'react-icons/fa'
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
    <div className={`bg-green-800 dark:bg-gray-900 text-white flex-shrink-0 py-6 transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'}`}>
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
      
      <nav className="mt-4">
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
            <Link href="/sales/leads" 
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
            <Link href="/payapproval" 
              className={`flex items-center py-3 hover:bg-green-700 dark:hover:bg-gray-800 ${isCollapsed ? 'justify-center px-0' : 'px-6'} ${isActive('/sales/opportunities')}`}
              title={isCollapsed ? "Payment Approvals" : ""}
            >
              <FaMoneyBillWave className={isCollapsed ? '' : 'mr-3'} />
              {!isCollapsed && <span>Payment Approvals</span>}
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
          {/* <li>
            <Link href="/pendingdetails" 
              className={`flex items-center py-3 hover:bg-green-700 dark:hover:bg-gray-800 ${isCollapsed ? 'justify-center px-0' : 'px-6'} ${isActive('/pendingdetails')}`}
              title={isCollapsed ? "Pending Details" : ""}
            >
              <FaClipboardList className={isCollapsed ? '' : 'mr-3'} />
              {!isCollapsed && <span>Pending Details</span>}
            </Link>
          </li> */}
          {/* <li>
            <Link href="/sales/pipeline" className={`flex items-center px-6 py-3 hover:bg-green-800 ${isActive('/sales/pipeline')}`}>
              <FaClipboardList className="mr-3" />
              <span>Pipeline</span>
            </Link>
          </li>
          <li>
            <Link href="/sales/quotes" className={`flex items-center px-6 py-3 hover:bg-green-800 ${isActive('/sales/quotes')}`}>
              <FaMoneyBillWave className="mr-3" />
              <span>Quotes & Proposals</span>
            </Link>
          </li>
          <li>
            <Link href="/sales/reports" className={`flex items-center px-6 py-3 hover:bg-green-800 ${isActive('/sales/reports')}`}>
              <FaChartLine className="mr-3" />
              <span>Sales Reports</span>
            </Link>
          </li>
          <li>
            <Link href="/sales/calendar" className={`flex items-center px-6 py-3 hover:bg-green-800 ${isActive('/sales/calendar')}`}>
              <FaCalendarAlt className="mr-3" />
              <span>Sales Calendar</span>
            </Link>
          </li> */}
          
          {/* Add a separator before logout */}
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
  )
}

export default SalesSidebar 