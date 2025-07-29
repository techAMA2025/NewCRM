import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/firebase/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    // Get the path from the query parameter
    const searchParams = request.nextUrl.searchParams;
    const path = searchParams.get('path');
    
    if (!path) {
      console.error('No path parameter provided');
      return NextResponse.json({ error: 'Path parameter is required' }, { status: 400 });
    }
    
    const decodedPath = decodeURIComponent(path);
    console.log("Fetching document from path:", decodedPath);
    
    // Use Firebase Admin SDK to get the file
    const bucket = storage.bucket();
    const file = bucket.file(decodedPath);
    
    // Check if the file exists
    const [exists] = await file.exists();
    console.log(`File exists at path "${decodedPath}":`, exists);
    
    if (!exists) {
      console.error(`File not found at path: ${decodedPath}`);
      
      // Try to list files in the directory to help debug
      try {
        const directory = decodedPath.substring(0, decodedPath.lastIndexOf('/'));
        console.log(`Listing files in directory: ${directory}`);
        const [files] = await bucket.getFiles({ prefix: directory });
        console.log('Available files in directory:', files.map(f => f.name));
      } catch (listError) {
        console.error('Error listing directory:', listError);
      }
      
      return NextResponse.json({ 
        error: 'File not found',
        path: decodedPath,
        message: 'The requested file does not exist in Firebase Storage'
      }, { status: 404 });
    }
    
    // Get file metadata
    const [metadata] = await file.getMetadata();
    console.log('File metadata:', {
      name: metadata.name,
      size: metadata.size,
      contentType: metadata.contentType,
      timeCreated: metadata.timeCreated
    });
    
    // Get the file content
    console.log('Downloading file content...');
    const [fileContent] = await file.download();
    console.log(`Downloaded ${fileContent.length} bytes`);
    
    // Determine content type based on file extension and metadata
    let contentType = metadata.contentType || 'application/octet-stream';
    const fileName = decodedPath.split('/').pop() || 'document';
    
    // Override content type based on file extension if needed
    if (decodedPath.toLowerCase().endsWith('.docx')) {
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    } else if (decodedPath.toLowerCase().endsWith('.doc')) {
      contentType = 'application/msword';
    } else if (decodedPath.toLowerCase().endsWith('.pdf')) {
      contentType = 'application/pdf';
    } else if (decodedPath.toLowerCase().endsWith('.html')) {
      contentType = 'text/html';
    }
    
    console.log(`Serving file with content type: ${contentType}`);
    
    // Return the file content with appropriate headers for inline viewing
    return new NextResponse(fileContent, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${fileName}"`,
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN',
        'Content-Length': fileContent.length.toString()
      },
    });
  } catch (error) {
    console.error('Error proxying document:', error);
    
    // Provide more detailed error information
    let errorMessage = 'Failed to proxy document';
    let statusCode = 500;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Handle specific Firebase errors
      if (error.message.includes('permission')) {
        errorMessage = 'Permission denied accessing the file';
        statusCode = 403;
      } else if (error.message.includes('not found')) {
        errorMessage = 'File not found in storage';
        statusCode = 404;
      }
    }
    
    return NextResponse.json({ 
      error: errorMessage,
      details: error instanceof Error ? error.message : 'Unknown error',
      path: request.nextUrl.searchParams.get('path')
    }, { status: statusCode });
  }
} 