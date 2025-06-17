import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FiPieChart } from 'react-icons/fi'
import { useRouter } from 'next/navigation'

const BillcutSidebar = () => {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = () => {
    // Add your logout logic here
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
    <div className="flex flex-col w-64 bg-gray-900 border-r border-gray-800">
      {/* Logo Section */}
      <div className="flex items-center justify-center h-16 bg-gray-900 border-b border-gray-800">
        <span className="text-xl font-bold text-white">CRM System</span>
      </div>

      {/* Navigation Section */}
      <nav className="flex-1 overflow-y-auto">
        <div className="px-2 py-4 space-y-1">
          {navigationItems.map((item) => {
            const isItemActive = isActive(item.href)
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-150 ${
                  isItemActive
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <span className={`mr-3 ${isItemActive ? 'text-blue-400' : 'text-gray-400 group-hover:text-blue-400'}`}>
                  {item.icon}
                </span>
                {item.name}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* User Section */}
      <div className="flex flex-col px-4 py-3 border-t border-gray-800 bg-gray-900">
        <button
          onClick={handleLogout}
          className="flex items-center px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors duration-150"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm11 4a1 1 0 10-2 0v4a1 1 0 102 0V7zm-3 1a1 1 0 10-2 0v3a1 1 0 102 0V8zM8 9a1 1 0 00-2 0v2a1 1 0 102 0V9z" clipRule="evenodd" />
          </svg>
          Logout
        </button>
      </div>
    </div>
  )
}

export default BillcutSidebar
