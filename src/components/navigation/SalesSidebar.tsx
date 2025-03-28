'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FaChartPie, FaUserPlus, FaHandshake, FaClipboardList, FaMoneyBillWave, FaChartLine, FaCalendarAlt } from 'react-icons/fa'

const SalesSidebar = () => {
  const pathname = usePathname()
  
  const isActive = (path: string) => {
    return pathname === path ? 'bg-green-800' : ''
  }

  return (
    <div className="bg-green-900 text-white w-64 min-h-screen flex-shrink-0 py-6">
      <div className="px-6 mb-8">
        <h2 className="text-xl font-bold">Sales Portal</h2>
      </div>
      
      <nav className="mt-4">
        <ul>
          <li>
            <Link href="/dashboard" className={`flex items-center px-6 py-3 hover:bg-green-800 ${isActive('/dashboard')}`}>
              <FaChartPie className="mr-3" />
              <span>Dashboard</span>
            </Link>
          </li>
          <li>
            <Link href="/sales/leads" className={`flex items-center px-6 py-3 hover:bg-green-800 ${isActive('/sales/leads')}`}>
              <FaUserPlus className="mr-3" />
              <span>Leads</span>
            </Link>
          </li>
          <li>
            <Link href="/myclients" className={`flex items-center px-6 py-3 hover:bg-green-800 ${isActive('/sales/opportunities')}`}>
              <FaHandshake className="mr-3" />
              <span>My Clients</span>
            </Link>
          </li>
          <li>
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
          </li>
        </ul>
      </nav>
    </div>
  )
}

export default SalesSidebar 