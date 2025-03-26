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
  logout: () => Promise<void>
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

  // Handle logout
  const logout = async () => {
    try {
      await signOut(auth)
      localStorage.removeItem('userRole')
      localStorage.removeItem('userEmail')
      localStorage.removeItem('userName')
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

  const value = {
    user,
    userRole,
    userName,
    loading,
    logout
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
} 