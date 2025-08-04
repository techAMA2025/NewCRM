'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { FaChartPie, FaUserFriends, FaCalendarAlt, FaFileAlt, FaFolder, FaComments, FaSignOutAlt, FaBalanceScale, FaMoneyCheckAlt, FaEnvelopeOpenText, FaUniversity, FaCompass, FaCompressAlt, FaBell, FaCheckSquare, FaChartBar } from 'react-icons/fa'
import { getAuth, signOut } from 'firebase/auth'
import { toast } from 'react-hot-toast'
import { app } from '@/firebase/firebase'

const AssistantSidebar = () => {
  const pathname = usePathname()
  const router = useRouter()
  const [userName, setUserName] = useState('')
  
  useEffect(() => {
    // Access localStorage after component mounts (client-side only)
    const storedUserName = localStorage.getItem('userName') || 'Assistant'
    setUserName(storedUserName)
  }, [])
  
  const isActive = (path: string) => {
    return pathname === path ? 'bg-gray-800 text-white border-l-4 border-blue-500' : ''
  }

  const handleLogout = async () => {
    // Add confirmation dialog
    if (!window.confirm('Are you sure you want to log out?')) {
      return; // If user cancels, don't proceed with logout
    }
    
    try {
      const auth = getAuth(app);
      await signOut(auth);
      localStorage.removeItem('userName');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userEmail');
      toast.success('Logged out successfully');
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to log out');
    }
  }

  return (
    <div className="bg-gray-900 text-gray-300 w-64 min-h-screen flex-shrink-0 py-6 border-r border-gray-700">
      <div className="px-6 mb-8">
        <div className="relative">
          <h2 className="text-xl font-semibold text-white">
            {userName}'s Portal
          </h2>
          <p className="text-gray-400 text-sm mt-1">Assistant Dashboard</p>
          <div className="h-px w-12 bg-blue-500 mt-3"></div>
        </div>
      </div>
      
      <nav className="mt-6">
        <ul className="space-y-1 px-3">
          <li>
            <Link href="/dashboard" className={`flex items-center px-4 py-3 rounded-lg hover:bg-gray-800 hover:text-white transition-all duration-200 group ${isActive('/dashboard')}`}>
              <FaChartPie className="mr-3 text-gray-400 group-hover:text-blue-400 transition-colors duration-200" />
              <span className="font-medium">Dashboard</span>
            </Link>
          </li>
          <li>
            <Link href="/clients" className={`flex items-center px-4 py-3 rounded-lg hover:bg-gray-800 hover:text-white transition-all duration-200 group ${isActive('/clients')}`}>
              <FaUserFriends className="mr-3 text-gray-400 group-hover:text-blue-400 transition-colors duration-200" />
              <span className="font-medium">Clients</span>
            </Link>
          </li>
          <li>
            <Link href="/advocate/ops-payments-request" className={`flex items-center px-4 py-3 rounded-lg hover:bg-gray-800 hover:text-white transition-all duration-200 group ${isActive('/advocate/ops-payments-request')}`}>
              <FaMoneyCheckAlt className="mr-3 text-gray-400 group-hover:text-blue-400 transition-colors duration-200" />
              <span className="font-medium">Payment Request</span>
            </Link>
          </li>
          <li>
            <Link href="/advocate/complaints" className={`flex items-center px-4 py-3 rounded-lg hover:bg-gray-800 hover:text-white transition-all duration-200 group ${isActive('/advocate/complaints')}`}>
              <FaCompressAlt className="mr-3 text-gray-400 group-hover:text-blue-400 transition-colors duration-200" />
              <span className="font-medium">Complaints</span>
            </Link>
          </li>
          <li>
            <Link href="/reminders" className={`flex items-center px-4 py-3 rounded-lg hover:bg-gray-800 hover:text-white transition-all duration-200 group ${isActive('/reminders')}`}>
              <FaBell className="mr-3 text-gray-400 group-hover:text-blue-400 transition-colors duration-200" />
              <span className="font-medium">Reminders</span>
            </Link>
          </li>
          <li>
            <Link href="/assigntasks" className={`flex items-center px-4 py-3 rounded-lg hover:bg-gray-800 hover:text-white transition-all duration-200 group ${isActive('/assigntasks')}`}>
              <FaCheckSquare className="mr-3 text-gray-400 group-hover:text-blue-400 transition-colors duration-200" />
              <span className="font-medium">Assign Tasks</span>
            </Link>
          </li>
          <li>
            <Link href="/arbtracker" className={`flex items-center px-4 py-3 rounded-lg hover:bg-gray-800 hover:text-white transition-all duration-200 group ${isActive('/arbtracker')}`}>
              <FaBalanceScale className="mr-3 text-gray-400 group-hover:text-blue-400 transition-colors duration-200" />
              <span className="font-medium">Arbitration Tracker</span>
            </Link>
          </li>
          <li>
            <Link href="/advocate/documents" className={`flex items-center px-4 py-3 rounded-lg hover:bg-gray-800 hover:text-white transition-all duration-200 group ${isActive('/advocate/documents')}`}>
              <FaFileAlt className="mr-3 text-gray-400 group-hover:text-blue-400 transition-colors duration-200" />
              <span className="font-medium">Documents</span>
            </Link>
          </li>
          <li>
            <Link href="/advocate/emailcompose" className={`flex items-center px-4 py-3 rounded-lg hover:bg-gray-800 hover:text-white transition-all duration-200 group ${isActive('/advocate/emailcompose')}`}>
              <FaEnvelopeOpenText className="mr-3 text-gray-400 group-hover:text-blue-400 transition-colors duration-200" />
              <span className="font-medium">Email Compose</span>
            </Link>
          </li>
          <li>
            <Link href="/opsreport" className={`flex items-center px-4 py-3 rounded-lg hover:bg-gray-800 hover:text-white transition-all duration-200 group ${isActive('/opsreport')}`}>
              <FaChartBar className="mr-3 text-gray-400 group-hover:text-blue-400 transition-colors duration-200" />
              <span className="font-medium">Operations Report</span>
            </Link>
          </li>
          
          {/* Divider */}
          <li className="pt-4">
            <div className="h-px bg-gray-700 mx-4 mb-4"></div>
          </li>
          
          <li>
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-3 mx-0 rounded-lg text-gray-300 transition-all duration-200 hover:bg-red-900/20 hover:text-red-300 group"
            >
              <FaSignOutAlt className="mr-3 text-gray-400 group-hover:text-red-400 transition-colors duration-200" />
              <span className="font-medium">Logout</span>
            </button>
          </li>
        </ul>
      </nav>
    </div>
  )
}

export default AssistantSidebar 