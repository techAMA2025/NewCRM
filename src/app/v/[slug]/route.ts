import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/firebase/firebase-admin';

export const dynamic = 'force-dynamic';

/**
 * Proxy Route for Confidential Legal Notices
 * URL: https://amalegalcrm.com/v/[slug]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!adminDb) {
      return new NextResponse('Server Error: Database not initialized', { status: 500 });
    }

    // 1. Look up the slug in the short_links collection
    const snapshot = await adminDb
      .collection('short_links')
      .where('slug', '==', slug)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return new NextResponse('Legal Notice Not Found or Link Expired', { status: 404 });
    }

    const linkData = snapshot.docs[0].data();
    const targetUrl = linkData.url;

    if (!targetUrl) {
      return new NextResponse('Invalid Link Data', { status: 404 });
    }

    // 2. Fetch the PDF from the internal Google/Firebase Storage link
    // We do this server-side so the client NEVER sees the targetUrl
    const response = await fetch(targetUrl);

    if (!response.ok) {
      console.error(`Failed to fetch PDF from storage: ${response.statusText}`);
      return new NextResponse('Error loading document', { status: 500 });
    }

    // 3. Stream the PDF back to the client
    const pdfBuffer = await response.arrayBuffer();

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="Legal_Notice.pdf"',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });

  } catch (error: any) {
    console.error('Proxy Route Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
