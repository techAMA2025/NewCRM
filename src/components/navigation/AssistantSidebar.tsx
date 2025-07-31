'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { FaChartPie, FaUserFriends, FaCalendarAlt, FaFileAlt, FaFolder, FaComments, FaSignOutAlt, FaBalanceScale, FaMoneyCheckAlt, FaEnvelopeOpenText, FaUniversity, FaCompass, FaCompressAlt, FaBell, FaCheckSquare } from 'react-icons/fa'
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
    return pathname === path ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' : ''
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
    <div className="bg-gradient-to-b from-gray-900 to-black text-gray-100 w-64 min-h-screen flex-shrink-0 py-6 border-r border-gray-800 shadow-xl">
      <div className="px-6 mb-8">
        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-400">{userName}'s Portal</h2>
        <p className="text-gray-400 text-sm mt-2">Assistant Dashboard</p>
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
            <Link href="/clients" className={`flex items-center px-6 py-3 rounded-r-full hover:bg-gray-800/50 transition-all duration-200 ${isActive('/clients')}`}>
              <FaUserFriends className="mr-3 text-indigo-400" />
              <span>Clients</span>
            </Link>
          </li>
          <li>
            <Link href="/advocate/complaints" className={`flex items-center px-6 py-3 rounded-r-full hover:bg-gray-800/50 transition-all duration-200 ${isActive('/advocate/complaints')}`}>
              <FaCompressAlt className="mr-3 text-indigo-400" />
              <span>Complaints</span>
            </Link>
          </li>
          <li>
            <Link href="/reminders" className={`flex items-center px-6 py-3 rounded-r-full hover:bg-gray-800/50 transition-all duration-200 ${isActive('/reminders')}`}>
              <FaBell className="mr-3 text-indigo-400" />
              <span>Reminders</span>
            </Link>
          </li>
          <li>
            <Link href="/assigntasks" className={`flex items-center px-6 py-3 rounded-r-full hover:bg-gray-800/50 transition-all duration-200 ${isActive('/assigntasks')}`}>
              <FaCheckSquare className="mr-3 text-indigo-400" />
              <span>Assign Tasks</span>
            </Link>
          </li>
          <li>
            <Link href="/advocate/documents" className={`flex items-center px-6 py-3 rounded-r-full hover:bg-gray-800/50 transition-all duration-200 ${isActive('/advocate/documents')}`}>
              <FaFileAlt className="mr-3 text-indigo-400" />
              <span>Documents</span>
            </Link>
          </li>
          <li>
            <Link href="/advocate/emailcompose" className={`flex items-center px-6 py-3 rounded-r-full hover:bg-gray-800/50 transition-all duration-200 ${isActive('/advocate/emailcompose')}`}>
              <FaEnvelopeOpenText className="mr-3 text-indigo-400" />
              <span>Email Compose</span>
            </Link>
          </li>
          <li className="mt-8 pt-4 border-t border-gray-800">
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-6 py-3 text-gray-300 transition-all duration-200 hover:bg-red-700/70 hover:text-white group"
            >
              <FaSignOutAlt className="mr-3 text-gray-500 group-hover:text-white transition-colors duration-200" />
              <span>Logout</span>
            </button>
          </li>
        </ul>
      </nav>
    </div>
  )
}

export default AssistantSidebar 