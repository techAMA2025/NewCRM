'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { FaUsers, FaChartPie, FaCog, FaFileAlt, FaHistory, FaMoneyBillWave, FaSignOutAlt, FaBriefcase, FaUserPlus } from 'react-icons/fa'
import { getAuth, signOut } from 'firebase/auth'
import { toast } from 'react-hot-toast'
import { app } from '@/firebase/firebase'

const AdminSidebar = () => {
  const pathname = usePathname()
  const router = useRouter()
  
  const isActive = (path: string) => {
    return pathname === path ? 'border-l-4 border-indigo-500 bg-gray-800/50 text-indigo-400' : 'text-gray-300 border-l-4 border-transparent'
  }

  const handleLogout = async () => {
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
  };

  return (
    <div className="bg-gradient-to-b from-gray-900 to-gray-950 text-white w-64 min-h-screen flex-shrink-0 py-6 shadow-xl">
      <div className="px-6 mb-8 border-b border-gray-800 pb-6">
        <div className="flex items-center justify-center mb-4">
        </div>
        <h2 className="text-xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Admin Portal</h2>
      </div>
      
      <nav className="mt-4">
        <ul className="space-y-1">
          <li>
            <Link href="/dashboard" className={`flex items-center px-6 py-3 ${isActive('/dashboard')} transition-all duration-200 hover:bg-gray-800/70 hover:text-indigo-400 group`}>
              <FaChartPie className="mr-3 text-gray-500 group-hover:text-indigo-400 transition-colors duration-200" />
              <span>Dashboard</span>
            </Link>
          </li>
          <li>
            <Link href="/sales/leads" className={`flex items-center px-6 py-3 ${isActive('/sales/leads')} transition-all duration-200 hover:bg-gray-800/70 hover:text-indigo-400 group`}>
              <FaUsers className="mr-3 text-gray-500 group-hover:text-indigo-400 transition-colors duration-200" />
              <span>Leads</span>
            </Link>
          </li>
          <li>
            <Link href="/billcutleads" className={`flex items-center px-6 py-3 ${isActive('/billcutleads')} transition-all duration-200 hover:bg-gray-800/70 hover:text-indigo-400 group`}>
              <FaUsers className="mr-3 text-gray-500 group-hover:text-indigo-400 transition-colors duration-200" />
              <span>Billcut Leads</span>
            </Link>
          </li>
          <li>
            <Link href="/paymentrequests" className={`flex items-center px-6 py-3 ${isActive('/paymentrequests')} transition-all duration-200 hover:bg-gray-800/70 hover:text-indigo-400 group`}>
              <FaMoneyBillWave className="mr-3 text-gray-500 group-hover:text-indigo-400 transition-colors duration-200" />
              <span>Payment Requests</span>
            </Link>
          </li>
          <li>
            <Link href="/clients" className={`flex items-center px-6 py-3 ${isActive('/clients')} transition-all duration-200 hover:bg-gray-800/70 hover:text-indigo-400 group`}>
              <FaBriefcase className="mr-3 text-gray-500 group-hover:text-indigo-400 transition-colors duration-200" />
              <span>Clients</span>
            </Link>
          </li>
          <li>
            <Link href="/clientalloc" className={`flex items-center px-6 py-3 ${isActive('/clientalloc')} transition-all duration-200 hover:bg-gray-800/70 hover:text-indigo-400 group`}>
              <FaUserPlus className="mr-3 text-gray-500 group-hover:text-indigo-400 transition-colors duration-200" />
              <span>Client Allocation</span>
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
          <li className="mt-8 pt-4 border-t border-gray-800">
            <button
              onClick={handleLogout}
              className={`flex items-center w-full px-6 py-3 text-gray-300 transition-all duration-200 hover:bg-red-700/70 hover:text-white group`}
            >
              <FaSignOutAlt className="mr-3 text-gray-500 group-hover:text-white transition-colors duration-200" />
              <span>Logout</span>
            </button>
          </li>
        </ul>
      </nav>
      
      {/* <div className="px-6 mt-auto pt-6 mb-4 absolute bottom-0 w-full">
        <div className="p-4 rounded-lg bg-gray-800/30 border border-gray-800/50">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-indigo-700 flex items-center justify-center text-xs">AD</div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-200">Admin User</p>
              <p className="text-xs text-gray-500">Online</p>
            </div>
          </div>
        </div>
      </div> */}
    </div>
  )
}

export default AdminSidebar 