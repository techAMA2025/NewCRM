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
  address?: string
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
  
  // New Fields
  const [clientAddress, setClientAddress] = useState("")
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [representativeName, setRepresentativeName] = useState("Shrey Arora")
  const [policeStationName, setPoliceStationName] = useState("")
  const [policeStationAddress, setPoliceStationAddress] = useState("")
  
  const [submitting, setSubmitting] = useState(false)

  const handleClientChange = (val: string) => {
    setSelectedClientId(val)
    const client = clients.find(c => c.id === val)
    if (client) {
      setClientAddress(client.address || "")
    }
  }

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
        clientAddress,
        startDate,
        representativeName,
        policeStationName,
        policeStationAddress,
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
      setStatus("Not Paid")
      setClientAddress("")
      setStartDate(new Date().toISOString().split('T')[0])
      setRepresentativeName("Shrey Arora")
      setPoliceStationName("")
      setPoliceStationAddress("Sector 57, Gurugram")
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

  const baseInputClass = `w-full rounded-md border text-sm  ${
    isDarkMode
      ? "bg-gray-800 border-gray-700 placeholder-gray-500"
      : "bg-white border-gray-300"
  }`

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={`sm:max-w-[600px] max-h-[90vh] overflow-y-auto  ${
          isDarkMode ? "bg-gray-900 border-gray-800" : "bg-white"
        }`}
      >
        <DialogHeader>
          <DialogTitle>Add New Recovery Record</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label className="">Client</Label>
              <div className={isDarkMode ? "dark" : ""}>
                <SearchableDropdown
                  options={clientOptions}
                  value={selectedClientId}
                  onChange={handleClientChange}
                  placeholder="Search and select client..."
                />
              </div>
              {selectedClientId && (
                <div className={`text-xs p-2 rounded  ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  {(() => {
                    const c = clients.find((x) => x.id === selectedClientId)
                    return c ? (
                      <>
                        <p>Name: {c.name}</p>
                        <p>Email: {c.email || "N/A"}</p>
                        <p>Phone: {c.phone || "N/A"}</p>
                      </>
                    ) : null
                  })()}
                </div>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label className="">Client Address (for notices)</Label>
              <textarea
                value={clientAddress}
                onChange={(e) => setClientAddress(e.target.value)}
                className={`${baseInputClass} p-2 min-h-[60px]`}
                placeholder="Enter full address..."
              />
            </div>

            <div className="space-y-2">
              <Label className="">Engagement Date (Start Date)</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={baseInputClass}
              />
            </div>

            <div className="space-y-2">
              <Label className="">Fee Type</Label>
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


            <div className="space-y-2">
              <Label className="">Amount Claimed / Pending</Label>
              <Input
                type="text"
                value={amountPending}
                onChange={(e) => {
                  const raw = e.target.value.replace(/,/g, "").replace(/[^0-9.]/g, "")
                  if (!raw) { setAmountPending(""); return }
                  setAmountPending(Number(raw).toLocaleString("en-IN"))
                }}
                placeholder="0"
                className={baseInputClass}
              />
            </div>

            <div className="space-y-2">
              <Label className="">Amount Received (if any)</Label>
              <Input
                type="text"
                value={amountReceived}
                onChange={(e) => {
                  const raw = e.target.value.replace(/,/g, "").replace(/[^0-9.]/g, "")
                  if (!raw) { setAmountReceived(""); return }
                  setAmountReceived(Number(raw).toLocaleString("en-IN"))
                }}
                placeholder="0"
                className={baseInputClass}
              />
            </div>

            <div className="space-y-2">
              <Label className="">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className={baseInputClass}>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Not Paid">Not Paid</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="On hold">On hold</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2 border-t pt-4 mt-2">
              <h3 className="text-sm font-bold mb-3">Police Complaint Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className=" text-xs">Representative Name</Label>
                  <Input
                    value={representativeName}
                    onChange={(e) => setRepresentativeName(e.target.value)}
                    className={baseInputClass}
                  />
                </div>
                <div className="space-y-2">
                  <Label className=" text-xs">Police Station Name</Label>
                  <Input
                    value={policeStationName}
                    onChange={(e) => setPoliceStationName(e.target.value)}
                    className={baseInputClass}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className=" text-xs">Police Station Address</Label>
                  <Input
                    value={policeStationAddress}
                    onChange={(e) => setPoliceStationAddress(e.target.value)}
                    className={baseInputClass}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6">
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
