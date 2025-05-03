import { NextRequest, NextResponse } from 'next/server';
import { auth, storage } from '@/firebase/firebase-admin';
import { getDownloadURL, getStorage, ref } from 'firebase/storage';

export async function GET(request: NextRequest) {
  try {
    // Get the path from the query parameter
    const searchParams = request.nextUrl.searchParams;
    const path = searchParams.get('path');
    
    if (!path) {
      return NextResponse.json({ error: 'Path parameter is required' }, { status: 400 });
    }
    
    console.log("Fetching document from path:", path);
    
    // Use Firebase Admin SDK to get the file
    const bucket = storage.bucket();
    const file = bucket.file(decodeURIComponent(path));
    
    // Check if the file exists
    const [exists] = await file.exists();
    if (!exists) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    
    // Get the file content
    const [fileContent] = await file.download();
    
    // Determine content type based on file extension
    let contentType = 'application/octet-stream';
    if (path.toLowerCase().endsWith('.docx')) {
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    } else if (path.toLowerCase().endsWith('.pdf')) {
      contentType = 'application/pdf';
    } else if (path.toLowerCase().endsWith('.html')) {
      contentType = 'text/html';
    }
    
    // Return the file content with appropriate headers
    return new NextResponse(fileContent, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${path.split('/').pop()}"`,
      },
    });
  } catch (error) {
    console.error('Error proxying document:', error);
    return NextResponse.json({ error: 'Failed to proxy document' }, { status: 500 });
  }
} 