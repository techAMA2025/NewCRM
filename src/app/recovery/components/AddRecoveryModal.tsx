"use client"

import React, { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import SearchableDropdown from "@/components/SearchableDropdown"

export interface ClientData {
  id: string
  name: string
  phone?: string
  altPhone?: string
  email?: string
}

interface AddRecoveryModalProps {
  isOpen: boolean
  onClose: () => void
  clients: ClientData[]
  onAdd: (data: any) => Promise<void>
  isDarkMode: boolean
}

export default function AddRecoveryModal({
  isOpen,
  onClose,
  clients,
  onAdd,
  isDarkMode,
}: AddRecoveryModalProps) {
  const [selectedClientId, setSelectedClientId] = useState("")
  const [feeType, setFeeType] = useState("")
  const [amountPending, setAmountPending] = useState("")
  const [amountReceived, setAmountReceived] = useState("")
  const [status, setStatus] = useState("Not Paid")
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClientId) {
      alert("Please select a client")
      return
    }
    if (!feeType) {
      alert("Please select a fee type")
      return
    }

    const client = clients.find((c) => c.id === selectedClientId)
    if (!client) return

    setSubmitting(true)
    try {
      await onAdd({
        clientId: client.id,
        clientName: client.name,
        clientPhone: client.phone || "",
        clientAltPhone: client.altPhone || "",
        clientEmail: client.email || "",
        feeType,
        amountPending: amountPending.replace(/,/g, ""),
        amountReceived: amountReceived.replace(/,/g, ""),
        status,
      })
      // Reset form
      setSelectedClientId("")
      setFeeType("")
      setAmountPending("")
      setAmountReceived("")
      setStatus("")
      onClose()
    } catch (err) {
      console.error(err)
      alert("Error adding record")
    } finally {
      setSubmitting(false)
    }
  }

  // Format clients for SearchableDropdown
  const clientOptions = clients.map((c) => ({
    value: c.id,
    label: `${c.name} ${c.phone ? `(${c.phone})` : ""}`,
  }))

  const baseInputClass = `w-full rounded-md border text-sm ${
    isDarkMode
      ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500"
      : "bg-white border-gray-300 text-gray-900"
  }`

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={`sm:max-w-[500px] ${
          isDarkMode ? "bg-gray-900 text-white border-gray-800" : "bg-white"
        }`}
      >
        <DialogHeader>
          <DialogTitle>Add New Recovery Record</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Client</Label>
            <div className={isDarkMode ? "dark" : ""}>
              <SearchableDropdown
                options={clientOptions}
                value={selectedClientId}
                onChange={(val) => setSelectedClientId(val)}
                placeholder="Search and select client..."
              />
            </div>
            {selectedClientId && (
              <div className={`text-xs p-2 rounded ${isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-50 text-gray-600'}`}>
                {(() => {
                  const c = clients.find((x) => x.id === selectedClientId)
                  return c ? (
                    <>
                      <p>Name: {c.name}</p>
                      <p>Email: {c.email || "N/A"}</p>
                      <p>Phone: {c.phone || "N/A"}</p>
                      <p>Alt Phone: {c.altPhone || "N/A"}</p>
                    </>
                  ) : null
                })()}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Fee Type</Label>
            <Select value={feeType} onValueChange={setFeeType}>
              <SelectTrigger className={baseInputClass}>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Retainer Fees">Retainer Fees</SelectItem>
                <SelectItem value="Success Fees">Success Fees</SelectItem>
                <SelectItem value="Signup Fees">Signup Fees</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Amount Pending</Label>
              <Input
                type="text"
                value={amountPending}
                onChange={(e) => {
                  const raw = e.target.value.replace(/,/g, "").replace(/[^0-9.]/g, "")
                  if (!raw) { setAmountPending(""); return }
                  if (e.target.value.endsWith(".")) { setAmountPending(Number(raw).toLocaleString("en-IN") + "."); return }
                  setAmountPending(Number(raw).toLocaleString("en-IN"))
                }}
                placeholder="0"
                className={baseInputClass}
              />
            </div>
            <div className="space-y-2">
              <Label>Amount Received</Label>
              <Input
                type="text"
                value={amountReceived}
                onChange={(e) => {
                  const raw = e.target.value.replace(/,/g, "").replace(/[^0-9.]/g, "")
                  if (!raw) { setAmountReceived(""); return }
                  if (e.target.value.endsWith(".")) { setAmountReceived(Number(raw).toLocaleString("en-IN") + "."); return }
                  setAmountReceived(Number(raw).toLocaleString("en-IN"))
                }}
                placeholder="0"
                className={baseInputClass}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
              className={isDarkMode ? "border-gray-700 hover:bg-gray-800 text-white" : ""}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {submitting ? "Adding..." : "Add Record"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
