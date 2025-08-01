"use client"

import { Suspense } from "react"
import { Spinner } from "@/components/ui/spinner"
import AdvocateSidebar from "@/components/navigation/AdvocateSidebar"
import ClientsList from "./components/ClientsList"
import { Toaster } from "react-hot-toast"

export default function AdvocateClientsPage() {
  return (
    <div className="flex bg-gray-900 min-h-screen overflow-hidden">
      <AdvocateSidebar />
      <div className="flex-1 overflow-hidden">
        <Suspense
          fallback={
            <div className="flex-1 flex justify-center items-center">
              <Spinner size="lg" />
            </div>
          }
        >
          <ClientsList />
        </Suspense>
      </div>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#333",
            color: "#fff",
          },
          success: {
            duration: 3000,
            style: {
              background: "rgba(47, 133, 90, 0.9)",
            },
          },
          error: {
            duration: 3000,
            style: {
              background: "rgba(175, 45, 45, 0.9)",
            },
          },
        }}
      />
    </div>
  )
}
