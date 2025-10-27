'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { auth, db } from '@/firebase/firebase'
import { onAuthStateChanged, signOut, User } from 'firebase/auth'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { useRouter, usePathname } from 'next/navigation'

// Define user context type
interface AuthContextType {
  user: User | null
  userRole: string | null
  userName: string | null
  loading: boolean
  logout: (reason?: string) => Promise<void>
}

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  userRole: null,
  userName: null,
  loading: true,
  logout: async () => {},
})

// Hook to use the auth context
export const useAuth = () => useContext(AuthContext)

// Provider component
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  // Session duration constants
  const SESSION_DURATION_NEW = 10 * 60 * 60 * 1000 // 10 hours for new users
  const SESSION_DURATION_EXISTING = 6 * 60 * 60 * 1000 // 6 hours for existing users

  // Check if session has expired
  const checkSessionExpiry = () => {
    const loginTimestamp = localStorage.getItem('loginTimestamp')
    if (!loginTimestamp) return

    const loginTime = parseInt(loginTimestamp)
    const currentTime = Date.now()
    const elapsed = currentTime - loginTime
    
    // Determine session duration based on whether user is existing or new
    const isExistingUser = localStorage.getItem('sessionDuration') === 'existing'
    const sessionDuration = isExistingUser ? SESSION_DURATION_EXISTING : SESSION_DURATION_NEW
    
    if (elapsed > sessionDuration) {
      logout('session-expired')
    }
  }

  // Handle logout
  const logout = async (reason?: string) => {
    try {
      await signOut(auth)
      localStorage.removeItem('userRole')
      localStorage.removeItem('userEmail')
      localStorage.removeItem('userName')
      localStorage.removeItem('loginTimestamp')
      localStorage.removeItem('sessionDuration')
      
      // Show session expiry message if auto-logged out
      if (reason === 'session-expired') {
        alert('Your session has expired. Please log in again.')
      }
      
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  // Effect for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser)

      if (currentUser) {
        // Handle existing users who don't have loginTimestamp
        const existingTimestamp = localStorage.getItem('loginTimestamp')
        if (!existingTimestamp) {
          // Existing user: give them a fresh 6-hour session
          localStorage.setItem('loginTimestamp', Date.now().toString())
          localStorage.setItem('sessionDuration', 'existing')
          console.log('Existing user detected - granted 6-hour session')
        }

        // Get role from localStorage for quick access
        const storedRole = localStorage.getItem('userRole')
        const storedName = localStorage.getItem('userName')
        
        if (storedRole) {
          setUserRole(storedRole)
          setUserName(storedName)
        } else {
          // If not in localStorage, fetch from Firestore
          try {
            const q = query(collection(db, 'users'), where('uid', '==', currentUser.uid))
            const querySnapshot = await getDocs(q)
            
            if (!querySnapshot.empty) {
              const userData = querySnapshot.docs[0].data()
              setUserRole(userData.role)
              setUserName(`${userData.firstName} ${userData.lastName}`)
              
              // Store for future use
              localStorage.setItem('userRole', userData.role)
              localStorage.setItem('userName', `${userData.firstName} ${userData.lastName}`)
            }
          } catch (err) {
            console.error('Error fetching user data:', err)
          }
        }
      } else {
        // No user is signed in
        setUserRole(null)
        setUserName(null)
        
        // Redirect to login if not already there
        if (pathname !== '/login') {
          router.push('/login')
        }
      }
      
      setLoading(false)
    })

    return () => unsubscribe()
  }, [router, pathname])

  // Set up session expiry check interval
  useEffect(() => {
    // Check immediately when component mounts
    checkSessionExpiry()
    
    // Set up interval to check every minute
    const intervalId = setInterval(checkSessionExpiry, 60000) // 60 seconds
    
    return () => clearInterval(intervalId)
  }, [])

  const value = {
    user,
    userRole,
    userName,
    loading,
    logout
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
} 