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
          <div key={i} className="min-w-[160px] h-[90px] rounded-lg bg-[#5A4C33]/5 animate-pulse flex-shrink-0" />
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
            className={`min-w-[140px] rounded-lg border px-3 py-2 flex-shrink-0 transition-all duration-200 shadow-sm
              ${isActive ? "bg-[#D2A02A]/10 border-[#D2A02A]" : "bg-white/50 border-[#5A4C33]/10 hover:border-[#5A4C33]/30 backdrop-blur-sm"}
              ${onSalespersonClick ? "cursor-pointer" : ""}`}
          >
            <p className={`text-[12px] font-bold truncate mb-1.5 ${isActive ? "text-[#D2A02A]" : "text-[#5A4C33]"}`}>
              {sp.name}
            </p>
            <div className="flex justify-between gap-3">
              <div>
                <p className="text-[10px] text-[#5A4C33]/40 font-bold uppercase tracking-tighter">Month</p>
                <p className={`text-[16px] font-bold leading-tight ${isActive ? "text-[#D2A02A]" : "text-[#5A4C33]"}`}>
                  {sp.thisMonthCount}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-[#5A4C33]/40 font-bold uppercase tracking-tighter">Overall</p>
                <p className={`text-[16px] font-bold leading-tight ${isActive ? "text-[#D2A02A]" : "text-[#5A4C33]"}`}>
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
