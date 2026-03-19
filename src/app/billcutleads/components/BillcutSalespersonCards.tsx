"use client"

import { useState, useEffect, useCallback } from "react"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "@/firebase/firebase"

interface SalespersonCount {
  id: string
  name: string
  overallCount: number
  thisMonthCount: number
}

interface BillcutSalespersonCardsProps {
  onSalespersonClick?: (salespersonName: string) => void
  activeSalesperson?: string
}

export default function BillcutSalespersonCards({ onSalespersonClick, activeSalesperson }: BillcutSalespersonCardsProps) {
  const [counts, setCounts] = useState<SalespersonCount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u))
    return () => unsub()
  }, [])

  const fetchCounts = useCallback(async () => {
    if (!user) return
    setIsLoading(true)
    try {
      const token = await user.getIdToken()
      const res = await fetch("/api/leads/billcut-salesperson-counts", {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      setCounts(await res.json())
    } catch {
      console.error("Failed to load billcut salesperson counts")
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => { fetchCounts() }, [fetchCounts])

  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-1 mb-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="min-w-[160px] h-[90px] rounded-lg bg-white/5 animate-pulse flex-shrink-0" />
        ))}
      </div>
    )
  }

  if (counts.length === 0) return null

  return (
    <div className="flex gap-3 overflow-x-auto pb-1 mb-4">
      {counts.map((sp) => {
        const isActive = activeSalesperson === sp.name
        return (
          <div
            key={sp.id}
            onClick={() => onSalespersonClick?.(sp.name)}
            className={`min-w-[160px] rounded-lg border px-4 py-3 flex-shrink-0 transition-colors
              ${isActive ? "bg-blue-500/20 border-blue-400" : "bg-white/5 border-white/10 hover:border-white/25"}
              ${onSalespersonClick ? "cursor-pointer" : ""}`}
          >
            <p className={`text-sm font-semibold truncate mb-2 ${isActive ? "text-blue-300" : "text-white/90"}`}>
              {sp.name}
            </p>
            <div className="flex justify-between gap-4">
              <div>
                <p className="text-[11px] text-white/40">Month</p>
                <p className={`text-lg font-bold leading-tight ${isActive ? "text-blue-300" : "text-white"}`}>
                  {sp.thisMonthCount}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-white/40">Overall</p>
                <p className={`text-lg font-bold leading-tight ${isActive ? "text-blue-300" : "text-white"}`}>
                  {sp.overallCount}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
