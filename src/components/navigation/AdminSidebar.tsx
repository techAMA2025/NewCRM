'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FaUsers, FaChartPie, FaCog, FaFileAlt, FaHistory } from 'react-icons/fa'

const AdminSidebar = () => {
  const pathname = usePathname()
  
  const isActive = (path: string) => {
    return pathname === path ? 'bg-blue-800' : ''
  }

  return (
    <div className="bg-blue-900 text-white w-64 min-h-screen flex-shrink-0 py-6">
      <div className="px-6 mb-8">
        <h2 className="text-xl font-bold">Admin Portal</h2>
      </div>
      
      <nav className="mt-4">
        <ul>
          <li>
            <Link href="/dashboard" className={`flex items-center px-6 py-3 hover:bg-blue-800 ${isActive('/dashboard')}`}>
              <FaChartPie className="mr-3" />
              <span>Dashboard</span>
            </Link>
          </li>
          <li>
            <Link href="/sales/leads" className={`flex items-center px-6 py-3 hover:bg-blue-800 ${isActive('/admin/users')}`}>
              <FaUsers className="mr-3" />
              <span>Leads</span>
            </Link>
          </li>
          {/* <li>
            <Link href="/admin/reports" className={`flex items-center px-6 py-3 hover:bg-blue-800 ${isActive('/admin/reports')}`}>
              <FaFileAlt className="mr-3" />
              <span>System Reports</span>
            </Link>
          </li>
          <li>
            <Link href="/admin/audit" className={`flex items-center px-6 py-3 hover:bg-blue-800 ${isActive('/admin/audit')}`}>
              <FaHistory className="mr-3" />
              <span>Audit Logs</span>
            </Link>
          </li>
          <li>
            <Link href="/admin/settings" className={`flex items-center px-6 py-3 hover:bg-blue-800 ${isActive('/admin/settings')}`}>
              <FaCog className="mr-3" />
              <span>System Settings</span>
            </Link>
          </li> */}
        </ul>
      </nav>
    </div>
  )
}

export default AdminSidebar 