import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FiPieChart, FiSun, FiMoon } from 'react-icons/fi'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

const BillcutSidebar = () => {
  const pathname = usePathname()
  const router = useRouter()
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [expanded, setExpanded] = useState(true)
  const [user, setUser] = useState<string>('')

  useEffect(() => {
    // Check system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    setIsDarkMode(prefersDark)
    
    // Get user from localStorage
    const storedUser = localStorage.getItem('userName')
    setUser(storedUser || '')
  }, [])

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode)
  }

  const handleLogout = () => {
    router.push('/login')
  }

  const isActive = (path: string) => {
    return pathname === path
  }

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/billcutLeadReport',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
          <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
        </svg>
      ),
    },
    {
      name: 'Leads',
      href: '/billcutleads',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
        </svg>
      ),
    },
    {
      name: 'Payment Requests',
      href: '/paymentrequests',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
        </svg>
      ),
    },
    {
      name: 'Payment Report',
      href: '/billcut-paymentreport',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
        </svg>
      ),
    },
  ]
  
  return (
    <div className={`flex flex-col min-h-screen transition-all duration-300 ${
      isDarkMode 
        ? 'bg-gray-900 border-r border-gray-700' 
        : 'bg-white border-r border-gray-200'
    }`}
    style={{ 
      width: expanded ? '250px' : '80px',
      transform: 'scale(1)',
      transformOrigin: 'left top'
    }}>
      {/* Logo Section */}
      <div className="sticky top-0 z-10 bg-gray-900">
        <div className="flex items-center justify-between px-2 py-5">
          {expanded ? (
            <div className="flex items-center">
              <div className="p-2 mr-2 bg-[#FFD46F] rounded-lg">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor" />
                  <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="flex flex-col">
                <h1 className="text-xl font-bold text-white">Welcome,</h1>
                {user && <span className="text-sm text-gray-300">{user}</span>}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-2">
            </div>
          )}
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setExpanded(!expanded)} 
              className="p-1 text-gray-400 rounded-full hover:bg-gray-800 hover:text-white"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                {expanded ? (
                  <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                ) : (
                  <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                )}
              </svg>
            </button>
          </div>
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent" />
      </div>

      {/* Navigation Section */}
      <nav className="flex-1 overflow-y-auto py-4">
        <div className="px-3 space-y-2">
          {navigationItems.map((item) => {
            const isItemActive = isActive(item.href)
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                  isItemActive
                    ? isDarkMode
                      ? 'bg-[#FFD46F] text-gray-900 shadow-lg'
                      : 'bg-[#FFD46F] text-gray-900 shadow-lg'
                    : isDarkMode
                      ? 'text-gray-300 hover:bg-gray-800 hover:text-[#FFD46F]'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <span className={`mr-3 ${
                  isItemActive
                    ? 'text-gray-900'
                    : isDarkMode
                      ? 'text-gray-400 group-hover:text-[#FFD46F]'
                      : 'text-gray-500 group-hover:text-gray-900'
                }`}>
                  {item.icon}
                </span>
                {expanded && item.name}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* User Section */}
      <div className={`p-4 border-t ${
        isDarkMode ? 'border-gray-700' : 'border-gray-200'
      }`}>
        <button
          onClick={handleLogout}
          className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
            isDarkMode
              ? 'text-gray-300 hover:bg-gray-800 hover:text-red-400'
              : 'text-gray-600 hover:bg-gray-100 hover:text-red-500'
          }`}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className={`h-5 w-5 mr-3 transition-colors duration-200 ${
              isDarkMode ? 'text-gray-400 group-hover:text-red-400' : 'text-gray-500 group-hover:text-red-500'
            }`} 
            viewBox="0 0 20 20" 
            fill="currentColor"
          >
            <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm11 4a1 1 0 10-2 0v4a1 1 0 102 0V7zm-3 1a1 1 0 10-2 0v3a1 1 0 102 0V8zM8 9a1 1 0 00-2 0v2a1 1 0 102 0V9z" clipRule="evenodd" />
          </svg>
          {expanded && <span>Logout</span>}
        </button>
      </div>
    </div>
  )
}

export default BillcutSidebar


