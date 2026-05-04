import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/firebase/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

// GET /api/recovery - Fetch recovery records with pagination & filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filterStatus = searchParams.get('status') || 'All'
    const filterFeeType = searchParams.get('feeType') || 'All'
    const limitCount = parseInt(searchParams.get('limit') || '20')
    const lastDocId = searchParams.get('lastDocId') || null
    const searchTerm = searchParams.get('search') || ''

    if (!adminDb) {
      return NextResponse.json({ success: false, error: 'adminDb not initialized' }, { status: 500 })
    }

    let query: FirebaseFirestore.Query = adminDb
      .collection('recovery')
      .orderBy('createdAt', 'desc')

    if (filterStatus !== 'All') {
      query = query.where('status', '==', filterStatus)
    }

    if (filterFeeType !== 'All') {
      query = query.where('feeType', '==', filterFeeType)
    }

    // Pagination using cursor
    if (lastDocId) {
      const lastDoc = await adminDb.collection('recovery').doc(lastDocId).get()
      if (lastDoc.exists) {
        query = query.startAfter(lastDoc)
      }
    }

    query = query.limit(limitCount)

    const snapshot = await query.get()

    let records: any[] = []

    for (const doc of snapshot.docs) {
      const data = doc.data()

      // Fetch latest remark from history subcollection
      let latestRemark = null
      try {
        const historySnap = await adminDb
          .collection('recovery')
          .doc(doc.id)
          .collection('history')
          .orderBy('timestamp', 'desc')
          .limit(1)
          .get()

        if (!historySnap.empty) {
          const h = historySnap.docs[0].data()
          latestRemark = {
            remark: h.remark || '',
            changedBy: h.changedBy || '',
            timestamp: h.timestamp?.toDate?.() || null,
          }
        }
      } catch (_) {}

      const record = {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || null,
        latestRemark,
      }

      // Apply client-side search filter if needed (Firestore doesn't support full-text search)
      if (searchTerm) {
        const s = searchTerm.toLowerCase()
        const matches =
          data.clientName?.toLowerCase().includes(s) ||
          data.clientPhone?.toLowerCase().includes(s) ||
          data.status?.toLowerCase().includes(s) ||
          data.feeType?.toLowerCase().includes(s)

        if (!matches) continue
      }

      records.push(record)
    }

    const hasMore = snapshot.docs.length === limitCount
    const lastId = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1].id : null

    // Total count
    let totalRef: FirebaseFirestore.Query = adminDb.collection('recovery')
    if (filterStatus !== 'All') totalRef = totalRef.where('status', '==', filterStatus)
    if (filterFeeType !== 'All') totalRef = totalRef.where('feeType', '==', filterFeeType)
    const totalSnap = await totalRef.count().get()
    const totalCount = totalSnap.data().count

    return NextResponse.json({ success: true, records, hasMore, lastId, totalCount })
  } catch (error: any) {
    console.error('Recovery GET error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// POST /api/recovery - Create a new recovery record
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      clientId,
      clientName,
      clientPhone,
      clientAltPhone,
      feeType,
      amountPending,
      amountReceived,
      status,
      createdBy,
    } = body

    if (!clientName || !feeType || !status) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: clientName, feeType, status' },
        { status: 400 }
      )
    }

    const pendingNum = parseFloat(amountPending || '0') || 0
    const receivedNum = parseFloat(amountReceived || '0') || 0
    const total = pendingNum - receivedNum

    const newRecord = {
      clientId: clientId || '',
      clientName,
      clientEmail: body.clientEmail || '',
      clientPhone: clientPhone || '',
      clientAltPhone: clientAltPhone || '',
      clientAddress: body.clientAddress || '',
      startDate: body.startDate || '',
      totalFees: (body.totalFees || total.toString()).replace(/,/g, ""),
      representativeName: body.representativeName || 'Shrey Arora',
      policeStationName: body.policeStationName || '',
      policeStationAddress: body.policeStationAddress || 'Sector 57, Gurugram',
      feeType,
      amountPending: pendingNum.toString(),
      amountReceived: receivedNum.toString(),
      total: total.toString(),
      status,
      notice1Sent: false,
      notice2Sent: false,
      notice3Sent: false,
      automationEnabled: status !== 'Paid',
      automationStep: 0,
      lastSentAt: null,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: createdBy || 'Unknown',
      lastModified: FieldValue.serverTimestamp(),
    }

    if (!adminDb) {
      return NextResponse.json({ success: false, error: 'adminDb not initialized' }, { status: 500 })
    }

    const docRef = await adminDb.collection('recovery').add(newRecord)

    return NextResponse.json({ success: true, id: docRef.id })
  } catch (error: any) {
    console.error('Recovery POST error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
