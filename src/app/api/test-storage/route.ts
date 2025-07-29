import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/firebase/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    console.log('Testing Firebase Admin SDK storage access...');
    
    // Get the bucket
    const bucket = storage.bucket();
    console.log('Bucket name:', bucket.name);
    
    // Test listing files in the root directory
    const [files] = await bucket.getFiles({ maxResults: 10 });
    console.log(`Found ${files.length} files in bucket`);
    
    const fileList = files.map(file => ({
      name: file.name,
      size: file.metadata?.size || 'unknown',
      contentType: file.metadata?.contentType || 'unknown'
    }));
    
    // Test specific path if provided
    const testPath = request.nextUrl.searchParams.get('path');
    let pathTest = null;
    
    if (testPath) {
      const decodedPath = decodeURIComponent(testPath);
      console.log('Testing specific path:', decodedPath);
      
      const file = bucket.file(decodedPath);
      const [exists] = await file.exists();
      
      if (exists) {
        const [metadata] = await file.getMetadata();
        pathTest = {
          path: decodedPath,
          exists: true,
          metadata: {
            name: metadata.name,
            size: metadata.size,
            contentType: metadata.contentType,
            timeCreated: metadata.timeCreated
          }
        };
      } else {
        // Try to find similar files
        const directory = decodedPath.substring(0, decodedPath.lastIndexOf('/'));
        const [similarFiles] = await bucket.getFiles({ prefix: directory });
        
        pathTest = {
          path: decodedPath,
          exists: false,
          directory,
          similarFiles: similarFiles.slice(0, 5).map(f => f.name)
        };
      }
    }
    
    return NextResponse.json({
      success: true,
      bucket: bucket.name,
      filesInRoot: fileList,
      pathTest,
      message: 'Firebase Admin SDK storage access is working'
    });
    
  } catch (error) {
    console.error('Firebase storage test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
} 