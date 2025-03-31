'use client'

import React, { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth, db } from '@/firebase/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { useRouter } from 'next/navigation'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Authenticate with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      // Get user data from Firestore to retrieve role
      const q = query(collection(db, 'users'), where('uid', '==', user.uid))
      const querySnapshot = await getDocs(q)
      
      if (querySnapshot.empty) {
        throw new Error('User profile not found')
      }
      
      // Get the user's role from their Firestore document
      const userData = querySnapshot.docs[0].data()
      const userRole = userData.role

      // Store user info in localStorage for persistence
      localStorage.setItem('userRole', userRole)
      localStorage.setItem('userEmail', user.email || '')
      localStorage.setItem('userName', `${userData.firstName} ${userData.lastName}`)
      
      // Redirect to dashboard
      router.push('/dashboard')
    } catch (err: any) {
      console.error('Login error:', err)
      setError(err.message || 'Failed to login. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background Video */}
      <video
        className="absolute w-full h-full object-cover z-0"
        autoPlay
        loop
        muted
        playsInline
      >
        <source src="/crmintro.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      
      {/* Overlay to darken the video slightly for better readability */}
      <div className="absolute inset-0 bg-black opacity-10 z-10"></div>
      
      <div className="-mt-30 bg-white backdrop-blur-sm p-8 rounded-lg shadow-lg w-full max-w-xl relative z-20 border border-white border-opacity-40">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">CRM Login</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="block text-gray-800 text-sm font-bold mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded shadow appearance-none text-black bg-white bg-opacity-70"
              required
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-800 text-sm font-bold mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded shadow appearance-none text-black bg-white bg-opacity-70"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Login 