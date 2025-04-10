'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FaChartPie, FaUserFriends, FaCalendarAlt, FaFileAlt, FaFolder, FaComments } from 'react-icons/fa'

const AdvocateSidebar = () => {
  const pathname = usePathname()
  const [userName, setUserName] = useState('')
  
  useEffect(() => {
    // Access localStorage after component mounts (client-side only)
    const storedUserName = localStorage.getItem('userName') || 'Advocate'
    setUserName(storedUserName)
  }, [])
  
  const isActive = (path: string) => {
    return pathname === path ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' : ''
  }

  return (
    <div className="bg-gradient-to-b from-gray-900 to-black text-gray-100 w-64 min-h-screen flex-shrink-0 py-6 border-r border-gray-800 shadow-xl">
      <div className="px-6 mb-8">
        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-400">{userName}'s Portal</h2>
        {/* <p className="text-gray-400 text-sm mt-2">{userName}</p> */}
      </div>
      
      
      
      <nav className="mt-4">
        <ul className="space-y-1">
          <li>
            <Link href="/dashboard" className={`flex items-center px-6 py-3 rounded-r-full hover:bg-gray-800/50 transition-all duration-200 ${isActive('/dashboard')}`}>
              <FaChartPie className="mr-3 text-indigo-400" />
              <span>Dashboard</span>
            </Link>
          </li>
          <li>
            <Link href="/paymentreminder" className={`flex items-center px-6 py-3 rounded-r-full hover:bg-gray-800/50 transition-all duration-200 ${isActive('/advocate/cases')}`}>
              <FaFolder className="mr-3 text-indigo-400" />
              <span>Payments</span>
            </Link>
          </li>
          <li>
            <Link href="/advocate/clients" className={`flex items-center px-6 py-3 rounded-r-full hover:bg-gray-800/50 transition-all duration-200 ${isActive('/advocate/clients')}`}>
              <FaUserFriends className="mr-3 text-indigo-400" />
              <span>Clients</span>
            </Link>
          </li>
          <li>
            <Link href="/reminders" className={`flex items-center px-6 py-3 rounded-r-full hover:bg-gray-800/50 transition-all duration-200 ${isActive('/advocate/clientpaymentrequest')}`}>
              <FaCalendarAlt className="mr-3 text-indigo-400" />
              <span>Reminders</span>
            </Link>
          </li>
          <li>
            <Link href="/advocate/communications" className={`flex items-center px-6 py-3 rounded-r-full hover:bg-gray-800/50 transition-all duration-200 ${isActive('/advocate/communications')}`}>
              <FaComments className="mr-3 text-indigo-400" />
              <span>Communications</span>
            </Link>
          </li>
          <li>
            <Link href="/advocate/documents" className={`flex items-center px-6 py-3 rounded-r-full hover:bg-gray-800/50 transition-all duration-200 ${isActive('/advocate/documents')}`}>
              <FaFileAlt className="mr-3 text-indigo-400" />
              <span>Documents</span>
            </Link>
          </li>
        </ul>
      </nav>
      
      <div className="px-6 mt-10">
        <div className="p-4 rounded-lg bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border border-purple-800/30">
          <h3 className="text-sm font-medium text-indigo-300">Quick Stats</h3>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <div className="bg-black/20 p-2 rounded">
              <p className="text-gray-400">Active Cases</p>
              <p className="text-xl font-bold text-white">12</p>
            </div>
            <div className="bg-black/20 p-2 rounded">
              <p className="text-gray-400">Pending</p>
              <p className="text-xl font-bold text-white">5</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdvocateSidebar 