"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/context/AuthContext"

interface SalespersonCount {
  id: string
  name: string
  overallCount: number
  thisMonthCount: number
}

interface SalespersonCardsProps {
  onSalespersonClick?: (salespersonName: string) => void
  activeSalesperson?: string
}

export default function SalespersonCards({ onSalespersonClick, activeSalesperson }: SalespersonCardsProps) {
  const { user } = useAuth()
  const [counts, setCounts] = useState<SalespersonCount[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchCounts = useCallback(async () => {
    if (!user) return
    setIsLoading(true)
    try {
      const token = await user.getIdToken()
      const res = await fetch("/api/leads/salesperson-counts", {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      setCounts(await res.json())
    } catch {
      console.error("Failed to load salesperson counts")
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => { fetchCounts() }, [fetchCounts])

  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-1">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="min-w-[160px] h-[90px] rounded-lg bg-gray-200/60 animate-pulse flex-shrink-0" />
        ))}
      </div>
    )
  }

  if (counts.length === 0) return null

  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {counts.map((sp) => {
        const isActive = activeSalesperson === sp.name
        return (
          <div
            key={sp.id}
            onClick={() => onSalespersonClick?.(sp.name)}
            className={`min-w-[160px] rounded-lg border px-4 py-3 flex-shrink-0 transition-colors
              ${isActive ? "bg-[#5A4C33] text-white border-[#5A4C33]" : "bg-white border-[#5A4C33]/15 hover:border-[#5A4C33]/40"}
              ${onSalespersonClick ? "cursor-pointer" : ""}`}
          >
            <p className={`text-sm font-semibold truncate mb-2 ${isActive ? "text-white" : "text-[#5A4C33]"}`}>
              {sp.name}
            </p>
            <div className="flex justify-between gap-4">
              <div>
                <p className={`text-[11px] ${isActive ? "text-white/70" : "text-[#5A4C33]/50"}`}>Month</p>
                <p className={`text-lg font-bold leading-tight ${isActive ? "text-white" : "text-[#5A4C33]"}`}>
                  {sp.thisMonthCount}
                </p>
              </div>
              <div className="text-right">
                <p className={`text-[11px] ${isActive ? "text-white/70" : "text-[#5A4C33]/50"}`}>Overall</p>
                <p className={`text-lg font-bold leading-tight ${isActive ? "text-white" : "text-[#5A4C33]"}`}>
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
