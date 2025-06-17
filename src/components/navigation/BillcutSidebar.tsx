import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FiPieChart } from 'react-icons/fi'

const BillcutSidebar = () => {
  const pathname = usePathname()

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
      <div className="flex items-center px-4 py-3 border-t border-gray-800 bg-gray-900">
        <div className="flex-shrink-0">
          <div className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center">
            <span className="text-sm font-medium text-white">BC</span>
          </div>
        </div>
        <div className="ml-3">
          <p className="text-sm font-medium text-white">Billcut User</p>
          <p className="text-xs text-gray-400">Billcut Role</p>
        </div>
      </div>
    </div>
  )
}

export default BillcutSidebar
