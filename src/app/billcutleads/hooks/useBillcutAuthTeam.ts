import { useState, useEffect } from "react"
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth"
import { auth } from "@/firebase/firebase"
import { authFetch } from "@/lib/authFetch"
import { toast } from "react-toastify"
import { User } from "../types"

export const useBillcutAuthTeam = () => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null)
  const [userRole, setUserRole] = useState("")
  const [teamMembers, setTeamMembers] = useState<User[]>([])
  const [salesTeamMembers, setSalesTeamMembers] = useState<User[]>([])

  // Authentication effect
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user)
        const localStorageRole = localStorage.getItem("userRole")
        if (localStorageRole) {
          setUserRole(localStorageRole)
        }
      } else {
        setCurrentUser(null)
        setUserRole("")
      }
    })

    return () => unsubscribe()
  }, [])

  // Fetch team members
  useEffect(() => {
    const fetchTeamMembers = async () => {
      try {
        const response = await authFetch("/api/users/list?roles=sales,admin,overlord")
        const usersData = await response.json()

        setTeamMembers(usersData)

        const salesPersonnel = usersData.filter((user: User) => user.role === "sales")
        setSalesTeamMembers(salesPersonnel)
      } catch (error) {
        console.error("Error fetching team members: ", error)
        toast.error("Failed to load team members")
      }
    }

    fetchTeamMembers()
  }, [])

  return {
    currentUser,
    userRole,
    teamMembers,
    salesTeamMembers
  }
}
