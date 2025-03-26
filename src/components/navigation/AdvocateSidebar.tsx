'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FaChartPie, FaUserFriends, FaCalendarAlt, FaFileAlt, FaFolder, FaComments } from 'react-icons/fa'

const AdvocateSidebar = () => {
  const pathname = usePathname()
  
  const isActive = (path: string) => {
    return pathname === path ? 'bg-purple-800' : ''
  }

  return (
    <div className="bg-purple-900 text-white w-64 min-h-screen flex-shrink-0 py-6">
      <div className="px-6 mb-8">
        <h2 className="text-xl font-bold">Advocate Portal</h2>
      </div>
      
      <nav className="mt-4">
        <ul>
          <li>
            <Link href="/dashboard" className={`flex items-center px-6 py-3 hover:bg-purple-800 ${isActive('/dashboard')}`}>
              <FaChartPie className="mr-3" />
              <span>Dashboard</span>
            </Link>
          </li>
          <li>
            <Link href="/advocate/cases" className={`flex items-center px-6 py-3 hover:bg-purple-800 ${isActive('/advocate/cases')}`}>
              <FaFolder className="mr-3" />
              <span>Case Management</span>
            </Link>
          </li>
          <li>
            <Link href="/advocate/clients" className={`flex items-center px-6 py-3 hover:bg-purple-800 ${isActive('/advocate/clients')}`}>
              <FaUserFriends className="mr-3" />
              <span>Clients</span>
            </Link>
          </li>
          <li>
            <Link href="/advocate/schedule" className={`flex items-center px-6 py-3 hover:bg-purple-800 ${isActive('/advocate/schedule')}`}>
              <FaCalendarAlt className="mr-3" />
              <span>Schedule</span>
            </Link>
          </li>
          <li>
            <Link href="/advocate/communications" className={`flex items-center px-6 py-3 hover:bg-purple-800 ${isActive('/advocate/communications')}`}>
              <FaComments className="mr-3" />
              <span>Communications</span>
            </Link>
          </li>
          <li>
            <Link href="/advocate/documents" className={`flex items-center px-6 py-3 hover:bg-purple-800 ${isActive('/advocate/documents')}`}>
              <FaFileAlt className="mr-3" />
              <span>Documents</span>
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  )
}

export default AdvocateSidebar 