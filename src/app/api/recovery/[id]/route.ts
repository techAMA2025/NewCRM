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
    const { field, value, changedBy } = body

    if (!field || value === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing field or value' },
        { status: 400 }
      )
    }

    if (!adminDb) {
      return NextResponse.json({ success: false, error: 'adminDb not initialized' }, { status: 500 })
    }

    const docRef = adminDb.collection('recovery').doc(id)
    const docSnap = await docRef.get()

    if (!docSnap.exists) {
      return NextResponse.json({ success: false, error: 'Record not found' }, { status: 404 })
    }

    const currentData = docSnap.data() || {}
    const oldValue = currentData[field]

    // Prepare update payload
    const updatePayload: Record<string, any> = {
      [field]: value,
      lastModified: FieldValue.serverTimestamp(),
    }

    // Auto-calculate total as the BALANCE (Pending - Received)
    if (field === 'amountPending' || field === 'amountReceived') {
      const pending =
        field === 'amountPending'
          ? parseFloat(value) || 0
          : parseFloat(currentData.amountPending || '0') || 0
      const received =
        field === 'amountReceived'
          ? parseFloat(value) || 0
          : parseFloat(currentData.amountReceived || '0') || 0
      
      const balance = pending - received
      updatePayload.total = balance.toString()

      // Auto-status logic: 
      // 1. If balance is 0 or less, mark as Paid and Complete
      if (balance <= 0 && currentData.status !== 'Paid') {
        updatePayload.status = 'Paid'
        updatePayload.automationStatus = 'Completed'
        await docRef.collection('history').add({
          field: 'status',
          oldValue: currentData.status || 'Pending',
          newValue: 'Paid',
          changedBy: 'System (Auto-Balance)',
          timestamp: FieldValue.serverTimestamp(),
        })
      } 
      // 2. UNDO: If balance was 0 (Paid) but is now > 0, revert to 'Not Paid'
      else if (balance > 0 && currentData.status === 'Paid') {
        updatePayload.status = 'Not Paid'
        updatePayload.automationStatus = 'In Progress' // Allow automation to resume
        await docRef.collection('history').add({
          field: 'status',
          oldValue: 'Paid',
          newValue: 'Not Paid',
          changedBy: 'System (Undo-Balance)',
          timestamp: FieldValue.serverTimestamp(),
        })
      }
    }

    await docRef.update(updatePayload)

    // Log the change to history subcollection
    const historyPayload: Record<string, any> = {
      field,
      oldValue: oldValue ?? null,
      newValue: value,
      changedBy: changedBy || 'Unknown',
      timestamp: FieldValue.serverTimestamp(),
    }

    await docRef.collection('history').add(historyPayload)

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
