'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { FaChartPie, FaUserFriends, FaCalendarAlt, FaFileAlt, FaFolder, FaComments, FaSignOutAlt, FaBalanceScale, FaMoneyCheckAlt, FaEnvelopeOpenText, FaUniversity, FaCompass, FaCompressAlt, FaHandshake, FaBars, FaMoneyBillWave } from 'react-icons/fa'
import { getAuth, signOut } from 'firebase/auth'
import { toast } from 'react-hot-toast'
import { app } from '@/firebase/firebase'
import { FiCheckSquare } from 'react-icons/fi'

const AdvocateSidebar = () => {
  const pathname = usePathname()
  const router = useRouter()
  const [userName, setUserName] = useState('')
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  
  useEffect(() => {
    // Access localStorage after component mounts (client-side only)
    const storedUserName = localStorage.getItem('userName') || 'Advocate'
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
      toast.success('Logged out successfully');
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to log out');
    }
  }

  return (
    <>
      {/* Mobile Toggle Button */}
      {!isMobileOpen && (
        <button
          onClick={() => setIsMobileOpen(true)}
          className="md:hidden fixed top-4 left-4 z-40 p-2 bg-gray-900 text-white rounded-lg shadow-lg"
        >
          <FaBars />
        </button>
      )}

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <div className={`fixed md:relative ${isMobileOpen ? 'inset-y-0 left-0' : ''} z-50 transform ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out bg-gradient-to-b from-gray-900 to-black text-gray-100 w-64 h-screen overflow-y-auto flex-shrink-0 py-6 border-r border-gray-800 shadow-xl flex flex-col`}>
        <div className="px-6 mb-8 flex justify-between items-center">
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-400">{userName}'s Portal</h2>
        </div>
        
        <nav className="mt-4 flex-1">
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
              <Link href="/advocate/complaints" className={`flex items-center px-6 py-3 rounded-r-full hover:bg-gray-800/50 transition-all duration-200 ${isActive('/advocate/complaints')}`}>
                <FaCompressAlt className="mr-3 text-indigo-400" />
                <span>Complaints</span>
              </Link>
            </li>
            <li>
              <Link href="/settlement-tracker" className={`flex items-center px-6 py-3 rounded-r-full hover:bg-gray-800/50 transition-all duration-200 ${isActive('/settlement-tracker')}`}>
                <FaHandshake className="mr-3 text-indigo-400" />
                <span>Settlement Tracker</span>
              </Link>
            </li> 
            <li>
              <Link href="/recovery" className={`flex items-center px-6 py-3 rounded-r-full hover:bg-gray-800/50 transition-all duration-200 ${isActive('/recovery')}`}>
                <FaMoneyBillWave className="mr-3 text-indigo-400" />
                <span>Recovery</span>
              </Link>
            </li>
            <li>
              <Link href="/escalations" className={`flex items-center px-6 py-3 rounded-r-full hover:bg-gray-800/50 transition-all duration-200 ${isActive('/escalations')}`}>
                <FaComments className="mr-3 text-indigo-400" />
                <span>Escalations</span>
              </Link>
            </li>
            <li>
              <Link href="/settlement-analysis" className={`flex items-center px-6 py-3 rounded-r-full hover:bg-gray-800/50 transition-all duration-200 ${isActive('/settlement-analysis')}`}>
                <FaChartPie className="mr-3 text-indigo-400" />
                <span>Settlement Analysis</span>
              </Link>
            </li> 
            <li>
              <Link href="/advocate/clients" className={`flex items-center px-6 py-3 rounded-r-full hover:bg-gray-800/50 transition-all duration-200 ${isActive('/advocate/clients')}`}>
                <FaUserFriends className="mr-3 text-indigo-400" />
                <span>Clients</span>
              </Link>
            </li>
            <li>
              <Link href="/arbtracker" className={`flex items-center px-6 py-3 rounded-r-full hover:bg-gray-800/50 transition-all duration-200 ${isActive('/arbtracker')}`}>
                <FaBalanceScale className="mr-3 text-indigo-400" />
                <span>Arbitration</span>
              </Link>
            </li>
            <li>
              <Link href="/reminders" className={`flex items-center px-6 py-3 rounded-r-full hover:bg-gray-800/50 transition-all duration-200 ${isActive('/reminders')}`}>
                <FaCalendarAlt className="mr-3 text-indigo-400" />
                <span>Reminders</span>
              </Link>
            </li>
            <li>
              <Link href="/advocate/documents" className={`flex items-center px-6 py-3 rounded-r-full hover:bg-gray-800/50 transition-all duration-200 ${isActive('/advocate/documents')}`}>
                <FaFileAlt className="mr-3 text-indigo-400" />
                <span>Documents</span>
              </Link>
            </li>
            <li>
              <Link href="/advocate/ops-payments-request" className={`flex items-center px-6 py-3 rounded-r-full hover:bg-gray-800/50 transition-all duration-200 ${isActive('/advocate/ops-payments-request')}`}>
                <FaMoneyCheckAlt className="mr-3 text-indigo-400" />
                <span>Payment Request</span>
              </Link>
            </li> 
            {(userName === "Rahul Gour" || userName === "Advocate Shrey") && (
              <li>
                <Link href="/assigntasks" className={`flex items-center px-6 py-3 rounded-r-full hover:bg-gray-800/50 transition-all duration-200 ${isActive('/assigntasks')}`}>
                  <FiCheckSquare className="mr-3 text-indigo-400" />
                  <span>Tasks</span>
                </Link>
              </li>
            )}
             <li>
              <Link href="/advocate/emailcompose" className={`flex items-center px-6 py-3 rounded-r-full hover:bg-gray-800/50 transition-all duration-200 ${isActive('/advocate/emailcompose')}`}>
                <FaEnvelopeOpenText className="mr-3 text-indigo-400" />
                <span>Compose Email</span>
              </Link>
            </li> 
            <li>
              <Link href="/addBank" className={`flex items-center px-6 py-3 rounded-r-full hover:bg-gray-800/50 transition-all duration-200 ${isActive('/addBank')}`}>
                <FaUniversity className="mr-3 text-indigo-400" />
                <span>Banks Database</span>
              </Link>
            </li> 
          </ul>
        </nav>
         
        <div className="px-6 mt-auto pt-10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-6 py-3 rounded-lg bg-gradient-to-r from-red-700 to-red-900 hover:from-red-800 hover:to-red-950 text-white transition-all duration-200"
          >
            <FaSignOutAlt className="mr-3" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </>
  )
}

export default AdvocateSidebar