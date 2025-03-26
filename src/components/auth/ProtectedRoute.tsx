'use client'

import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: string[]
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, userRole, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      // If not authenticated, redirect to login
      if (!user) {
        router.push('/login')
      } 
      // If roles are specified and user doesn't have the required role
      else if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
        router.push('/dashboard') // Redirect to dashboard which will show appropriate view
      }
    }
  }, [user, userRole, loading, router, allowedRoles])

  // Show loading state
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  // If user is authenticated and has correct role, show the protected content
  if (user && (!allowedRoles || (userRole && allowedRoles.includes(userRole)))) {
    return <>{children}</>
  }

  // Return null while redirecting
  return null
}

export default ProtectedRoute 