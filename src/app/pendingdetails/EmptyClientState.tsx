import React from 'react'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'

const EmptyClientState = () => {
  const { userRole, user } = useAuth()
  const router = useRouter()
  
  // Extract username from email if available
  const username = user?.email ? 
    user.email.split('@')[0].replace(/\./g, ' ').replace(/\b\w/g, char => char.toUpperCase()) : 
    'your account'

  return (
    <div className="p-8 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-800 mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-300 mb-2">No qualified leads found</h3>
      <p className="text-gray-500 max-w-md mx-auto mb-4">
        You don't have any qualified leads assigned to you yet. Leads will appear here once they've been assigned to "{username}".
      </p>
      {userRole === 'admin' && (
        <button 
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          onClick={() => router.push('/crm/leads')}
        >
          View All Leads
        </button>
      )}
    </div>
  )
}

export default EmptyClientState