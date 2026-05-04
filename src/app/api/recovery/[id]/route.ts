import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/firebase/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

// PATCH /api/recovery/[id] - Update a recovery record field with history logging
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { field, value, updates, changedBy } = body

    if (!adminDb) {
      return NextResponse.json({ success: false, error: 'adminDb not initialized' }, { status: 500 })
    }

    const docRef = adminDb.collection('recovery').doc(id)
    const docSnap = await docRef.get()

    if (!docSnap.exists) {
      return NextResponse.json({ success: false, error: 'Record not found' }, { status: 404 })
    }

    const currentData = docSnap.data() || {}
    const updatePayload: Record<string, any> = {
      lastModified: FieldValue.serverTimestamp(),
    }

    const historyLogs: any[] = []

    if (updates && typeof updates === 'object') {
      // Handle multiple fields
      Object.entries(updates).forEach(([f, v]) => {
        if (currentData[f] !== v) {
          updatePayload[f] = v
          historyLogs.push({
            field: f,
            oldValue: currentData[f] ?? null,
            newValue: v,
            changedBy: changedBy || 'Unknown',
            timestamp: FieldValue.serverTimestamp(),
          })
        }
      })
    } else if (field && value !== undefined) {
      // Handle single field
      updatePayload[field] = value
      historyLogs.push({
        field,
        oldValue: currentData[field] ?? null,
        newValue: value,
        changedBy: changedBy || 'Unknown',
        timestamp: FieldValue.serverTimestamp(),
      })
    } else {
      return NextResponse.json(
        { success: false, error: 'Missing field/value or updates object' },
        { status: 400 }
      )
    }

    // Auto-calculate total as the BALANCE (Pending - Received)
    // Check if any of amountPending or amountReceived is being updated
    const isAmountUpdate = updatePayload.amountPending !== undefined || updatePayload.amountReceived !== undefined || updates?.amountPending !== undefined || updates?.amountReceived !== undefined
    
    if (isAmountUpdate) {
      const getCleanVal = (val: any) => {
        if (!val) return '0'
        return val.toString().replace(/,/g, '')
      }
      const p = parseFloat(getCleanVal(updatePayload.amountPending ?? updates?.amountPending ?? currentData.amountPending)) || 0
      const r = parseFloat(getCleanVal(updatePayload.amountReceived ?? updates?.amountReceived ?? currentData.amountReceived)) || 0
      
      const balance = p - r
      updatePayload.total = balance.toString()

      // Auto-status logic: 
      // 1. If balance is 0 or less, mark as Paid and Complete
      if (balance <= 0 && currentData.status !== 'Paid' && updatePayload.status === undefined) {
        updatePayload.status = 'Paid'
        updatePayload.automationStatus = 'Completed'
        historyLogs.push({
          field: 'status',
          oldValue: currentData.status || 'Pending',
          newValue: 'Paid',
          changedBy: 'System (Auto-Balance)',
          timestamp: FieldValue.serverTimestamp(),
        })
      } 
      // 2. UNDO: If balance was 0 (Paid) but is now > 0, revert to 'Not Paid'
      else if (balance > 0 && currentData.status === 'Paid' && updatePayload.status === undefined) {
        updatePayload.status = 'Not Paid'
        updatePayload.automationStatus = 'In Progress' 
        historyLogs.push({
          field: 'status',
          oldValue: 'Paid',
          newValue: 'Not Paid',
          changedBy: 'System (Undo-Balance)',
          timestamp: FieldValue.serverTimestamp(),
        })
      }
    }

    await docRef.update(updatePayload)

    // Log the changes to history subcollection
    const historyPromises = historyLogs.map(log => docRef.collection('history').add(log))
    await Promise.all(historyPromises)

    return NextResponse.json({ 
      success: true, 
      updatedTotal: updatePayload.total,
      updatedStatus: updatePayload.status
    })
  } catch (error: any) {
    console.error('Recovery PATCH error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// DELETE /api/recovery/[id] - Delete a recovery record
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!adminDb) {
      return NextResponse.json({ success: false, error: 'adminDb not initialized' }, { status: 500 })
    }

    const docRef = adminDb.collection('recovery').doc(id)
    const docSnap = await docRef.get()

    if (!docSnap.exists) {
      return NextResponse.json({ success: false, error: 'Record not found' }, { status: 404 })
    }

    // Delete history subcollection entries first
    const historySnap = await docRef.collection('history').get()
    const deletePromises = historySnap.docs.map((d) => d.ref.delete())
    await Promise.all(deletePromises)

    // Delete main record
    await docRef.delete()

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Recovery DELETE error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
