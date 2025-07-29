import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const documentUrl = searchParams.get('url');
    const documentName = searchParams.get('name') || 'Document';
    
    if (!documentUrl) {
      return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
    }
    
    // Extract Firebase Storage path from URL for proxy usage
    function extractStoragePath(url: string): string | null {
      try {
        const urlObj = new URL(url);
        if (urlObj.hostname === 'firebasestorage.googleapis.com' && urlObj.pathname.includes('/o/')) {
          const pathMatch = urlObj.pathname.match(/\/o\/(.+)$/);
          if (pathMatch) {
            return decodeURIComponent(pathMatch[1]);
          }
        }
        return null;
      } catch (error) {
        console.error('Error extracting storage path:', error);
        return null;
      }
    }
    
    const storagePath = extractStoragePath(documentUrl);
    const proxyUrl = storagePath 
      ? `/api/document-proxy?path=${encodeURIComponent(storagePath)}`
      : documentUrl;
    
    // Determine file type for appropriate handling
    const fileName = documentName || documentUrl;
    const extension = fileName.toLowerCase().split('.').pop();
    const isDocx = extension === 'docx' || extension === 'doc';
    const isPdf = extension === 'pdf';
    
    // Generate HTML content for document viewing
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${documentName}</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f8fafc;
            height: 100vh;
            overflow: hidden;
        }
        .viewer-container {
            height: 100vh;
            display: flex;
            flex-direction: column;
            background: white;
        }
        .header {
            background: #1e293b;
            color: white;
            padding: 16px 24px;
            font-weight: 600;
            font-size: 16px;
            flex-shrink: 0;
            border-bottom: 1px solid #334155;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .viewer-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            position: relative;
        }
        .viewer-frame {
            width: 100%;
            height: 100%;
            border: none;
            flex: 1;
        }
        .loading {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: white;
            z-index: 10;
        }
        .loading-spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #e2e8f0;
            border-left: 4px solid #3b82f6;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 16px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .document-interface {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 40px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .file-icon {
            width: 80px;
            height: 80px;
            background: rgba(255,255,255,0.2);
            border-radius: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 40px;
            margin-bottom: 24px;
            backdrop-filter: blur(10px);
        }
        .download-btn {
            background: rgba(255,255,255,0.2);
            color: white;
            border: 2px solid rgba(255,255,255,0.3);
            padding: 16px 32px;
            border-radius: 12px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 600;
            transition: all 0.2s;
            backdrop-filter: blur(10px);
            margin: 8px;
            text-decoration: none;
            display: inline-block;
        }
        .download-btn:hover {
            background: rgba(255,255,255,0.3);
            border-color: rgba(255,255,255,0.5);
            transform: translateY(-2px);
        }
        .download-btn.secondary {
            background: transparent;
            border-color: rgba(255,255,255,0.2);
        }
        .file-info {
            background: rgba(255,255,255,0.1);
            padding: 16px;
            border-radius: 8px;
            margin: 20px 0;
            backdrop-filter: blur(10px);
            font-size: 14px;
        }
        .close-btn {
            background: rgba(255,255,255,0.1);
            border: none;
            color: white;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 18px;
            transition: background 0.2s;
        }
        .close-btn:hover {
            background: rgba(255,255,255,0.2);
        }
    </style>
</head>
<body>
    <div class="viewer-container">
        <div class="header">
            <div style="display: flex; align-items: center;">
                <span style="margin-right: 12px;">📄</span>
                <span>${documentName}</span>
            </div>
            <button class="close-btn" onclick="closeViewer()">×</button>
        </div>
        
        <div class="viewer-content">
            ${isPdf ? `
            <div id="loading" class="loading">
                <div class="loading-spinner"></div>
                <div style="color: #64748b; font-size: 14px;">Loading PDF...</div>
            </div>
            <iframe id="documentFrame" class="viewer-frame" style="display: none;"></iframe>
            ` : `
            <div class="document-interface">
                <div class="file-icon">
                    ${isDocx ? '📄' : '📁'}
                </div>
                
                <h2 style="margin: 0 0 16px 0; font-size: 28px;">
                    ${isDocx ? 'Microsoft Word Document' : 'Document Ready'}
                </h2>
                
                <p style="font-size: 18px; opacity: 0.9; margin-bottom: 24px; max-width: 500px; line-height: 1.5;">
                    ${isDocx ? 
                        'This Word document cannot be previewed in web browsers. Download it to view and edit in Microsoft Word, Google Docs, or your preferred application.' :
                        'This document is ready for download. Click below to save it to your device.'
                    }
                </p>
                
                <div class="file-info">
                    <strong>File:</strong> ${documentName}<br>
                    <strong>Type:</strong> ${extension?.toUpperCase()} Document
                </div>
                
                <div style="margin-top: 32px;">
                    <a href="${proxyUrl}" class="download-btn" onclick="trackDownload()">
                        📥 Download Document
                    </a>
                    <br>
                    <button class="download-btn secondary" onclick="closeViewer()">
                        ← Back to Client Details
                    </button>
                </div>
            </div>
            `}
        </div>
    </div>
    
    <script>
        const isPdf = ${isPdf};
        const proxyUrl = '${proxyUrl}';
        
        function closeViewer() {
            window.parent.postMessage({action: 'closeViewer'}, '*');
        }
        
        function trackDownload() {
            console.log('Document download initiated:', '${documentName}');
        }
        
        ${isPdf ? `
        // For PDFs, try to load directly
        setTimeout(() => {
            const frame = document.getElementById('documentFrame');
            const loading = document.getElementById('loading');
            
            frame.onload = () => {
                loading.style.display = 'none';
                frame.style.display = 'block';
            };
            
            frame.onerror = () => {
                loading.innerHTML = '<div style="color: #dc2626;">PDF could not be loaded. <a href="' + proxyUrl + '" style="color: #2563eb;">Download instead</a></div>';
            };
            
            frame.src = proxyUrl;
            
            // Fallback after 10 seconds
            setTimeout(() => {
                if (frame.style.display === 'none') {
                    loading.innerHTML = '<div style="color: #64748b;">PDF preview unavailable. <a href="' + proxyUrl + '" style="color: #2563eb;">Download PDF</a></div>';
                }
            }, 10000);
        }, 500);
        ` : ''}
        
        // Listen for messages from parent window
        window.addEventListener('message', (event) => {
            if (event.data.action === 'close') {
                closeViewer();
            }
        });
    </script>
</body>
</html>
    `;
    
    return new NextResponse(htmlContent, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache',
        'X-Frame-Options': 'ALLOWALL',
      },
    });
  } catch (error) {
    console.error('Error generating document viewer:', error);
    return NextResponse.json({ error: 'Failed to generate document viewer' }, { status: 500 });
  }
} 