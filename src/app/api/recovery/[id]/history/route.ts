import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/firebase/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

// GET /api/recovery/[id]/history - Get full change history for a recovery record
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const field = searchParams.get('field') || null

    if (!adminDb) {
      return NextResponse.json({ success: false, error: 'adminDb not initialized' }, { status: 500 })
    }

    const snapshot = await adminDb
      .collection('recovery')
      .doc(id)
      .collection('history')
      .get()

    let history = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        field: data.field,
        oldValue: data.oldValue,
        newValue: data.newValue,
        changedBy: data.changedBy,
        timestamp: data.timestamp?.toDate?.() || null,
      }
    })

    if (field) {
      history = history.filter((h) => h.field === field)
    }

    history.sort((a, b) => {
      const timeA = a.timestamp ? a.timestamp.getTime() : 0
      const timeB = b.timestamp ? b.timestamp.getTime() : 0
      return timeB - timeA
    })

    return NextResponse.json({ success: true, history })
  } catch (error: any) {
    console.error('Recovery history GET error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// POST /api/recovery/[id]/history - Add a remark to history
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { remark, changedBy } = body

    if (!remark?.trim()) {
      return NextResponse.json({ success: false, error: 'Remark is required' }, { status: 400 })
    }

    if (!adminDb) {
      return NextResponse.json({ success: false, error: 'adminDb not initialized' }, { status: 500 })
    }

    const docRef = adminDb.collection('recovery').doc(id)
    const docSnap = await docRef.get()

    if (!docSnap.exists) {
      return NextResponse.json({ success: false, error: 'Record not found' }, { status: 404 })
    }

    await docRef.collection('history').add({
      field: 'remark',
      oldValue: null,
      newValue: remark.trim(),
      changedBy: changedBy || 'Unknown',
      timestamp: FieldValue.serverTimestamp(),
    })

    // Also update the latestRemark on parent doc for quick display
    await docRef.update({
      latestRemark: {
        remark: remark.trim(),
        changedBy: changedBy || 'Unknown',
        timestamp: new Date().toISOString()
      },
      lastModified: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Recovery history POST error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
