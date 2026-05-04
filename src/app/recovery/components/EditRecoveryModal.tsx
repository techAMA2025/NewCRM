"use client"

import React, { useState, useEffect } from "react"
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

interface EditRecoveryModalProps {
  isOpen: boolean
  onClose: () => void
  record: any
  onUpdate: (id: string, field: string, value: any) => Promise<void>
  isDarkMode: boolean
}

export default function EditRecoveryModal({
  isOpen,
  onClose,
  record,
  onUpdate,
  isDarkMode,
}: EditRecoveryModalProps) {
  const [feeType, setFeeType] = useState("")
  const [amountPending, setAmountPending] = useState("")
  const [amountReceived, setAmountReceived] = useState("")
  const [status, setStatus] = useState("")
  const [clientAddress, setClientAddress] = useState("")
  const [startDate, setStartDate] = useState("")
  const [representativeName, setRepresentativeName] = useState("")
  const [policeStationName, setPoliceStationName] = useState("")
  const [policeStationAddress, setPoliceStationAddress] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (record) {
      setFeeType(record.feeType || "")
      setAmountPending(record.amountPending ? Number(record.amountPending).toLocaleString("en-IN") : "")
      setAmountReceived(record.amountReceived ? Number(record.amountReceived).toLocaleString("en-IN") : "")
      setStatus(record.status || "Not Paid")
      setClientAddress(record.clientAddress || "")
      setStartDate(record.startDate || "")
      setRepresentativeName(record.representativeName || "Shrey Arora")
      setPoliceStationName(record.policeStationName || "")
      setPoliceStationAddress(record.policeStationAddress || "Sector 57, Gurugram")
    }
  }, [record])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!record) return

    setSubmitting(true)
    try {
      const updates: Record<string, any> = {}
      
      const fields = [
        { key: 'feeType', val: feeType },
        { key: 'amountPending', val: amountPending.replace(/,/g, "") },
        { key: 'amountReceived', val: amountReceived.replace(/,/g, "") },
        { key: 'status', val: status },
        { key: 'clientAddress', val: clientAddress },
        { key: 'startDate', val: startDate },
        { key: 'representativeName', val: representativeName },
        { key: 'policeStationName', val: policeStationName },
        { key: 'policeStationAddress', val: policeStationAddress },
      ]

      fields.forEach(f => {
        if (record[f.key] !== f.val) {
          updates[f.key] = f.val
        }
      })

      if (Object.keys(updates).length > 0) {
        await onUpdate(record.id, "bulk", updates)
      }

      onClose()
    } catch (err) {
      console.error(err)
      alert("Error updating record")
    } finally {
      setSubmitting(false)
    }
  }

  const baseInputClass = `w-full rounded-md border text-sm  ${
    isDarkMode
      ? "bg-gray-800 border-gray-700 placeholder-gray-500"
      : "bg-white border-gray-300"
  }`

  if (!record) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={`sm:max-w-[600px] max-h-[90vh] overflow-y-auto  ${
          isDarkMode ? "bg-gray-900 border-gray-800" : "bg-white"
        }`}
      >
        <DialogHeader>
          <DialogTitle>Edit Recovery Record — {record.clientName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label className=" font-bold">Client Address (for notices)</Label>
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
              {submitting ? "Updating..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
