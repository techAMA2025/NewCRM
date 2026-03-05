"use client"

import { useState, useEffect, useRef } from "react"
import { Spinner } from "@/components/ui/spinner"

interface DocumentViewerProps {
  isOpen: boolean
  documentUrl: string
  documentName: string
  onClose: () => void
}

export default function DocumentViewer({ isOpen, documentUrl, documentName, onClose }: DocumentViewerProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Check if document is a .docx file
  const isDocx = (url: string, name: string) => {
    const lower = (url + name).toLowerCase()
    return lower.includes(".docx")
  }

  // Extract Firebase Storage path from full URL
  const getStoragePath = (url: string): string | null => {
    try {
      const match = url.match(/\/o\/([^?]+)/)
      if (match) return decodeURIComponent(match[1])
      return null
    } catch {
      return null
    }
  }

  useEffect(() => {
    if (!isOpen || !documentUrl) return

    setIsLoading(true)
    setHasError(false)

    if (isDocx(documentUrl, documentName)) {
      renderDocx(documentUrl)
    } else {
      // For non-docx, we rely on the iframe onLoad
      setIsLoading(true)
    }

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = ""
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, documentUrl])

  const renderDocx = async (url: string) => {
    try {
      const { renderAsync } = await import("docx-preview")
      const { authFetch } = await import("@/lib/authFetch")

      const storagePath = getStoragePath(url)
      let response: Response

      if (storagePath) {
        response = await authFetch(`/api/document-proxy?path=${encodeURIComponent(storagePath)}`)
      } else {
        response = await fetch(url)
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch document: ${response.status}`)
      }

      const arrayBuffer = await response.arrayBuffer()

      if (containerRef.current) {
        containerRef.current.innerHTML = ""

        await renderAsync(new Blob([arrayBuffer]), containerRef.current, undefined, {
          className: "docx",
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: true,
          ignoreLastRenderedPageBreak: false,
          experimental: true,
          trimXmlDeclaration: true,
          useBase64URL: true,
        })
      }

      setIsLoading(false)
    } catch (err: any) {
      console.error("Error rendering docx:", err)
      setIsLoading(false)
      setHasError(true)
    }
  }

  const handleRetry = () => {
    if (containerRef.current) containerRef.current.innerHTML = ""
    setIsLoading(true)
    setHasError(false)
    if (isDocx(documentUrl, documentName)) {
      renderDocx(documentUrl)
    }
  }

  const handleDownload = () => {
    const link = document.createElement("a")
    link.href = documentUrl
    link.download = documentName || "document"
    link.target = "_blank"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (!isOpen) return null

  const isDocxFile = isDocx(documentUrl, documentName)
  const iframeUrl = !isDocxFile
    ? `https://docs.google.com/viewer?url=${encodeURIComponent(documentUrl)}&embedded=true`
    : ""

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 w-[95vw] max-w-6xl h-[90vh] shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center mb-3 pb-3 border-b border-gray-800 shrink-0">
          <h3 className="text-xl font-semibold text-white flex items-center truncate mr-4">
            <svg className="w-5 h-5 mr-2 text-purple-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
            <span className="truncate">{documentName}</span>
          </h3>
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={handleRetry}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded transition-colors duration-200 flex items-center"
              title="Reload document"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Reload
            </button>
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded transition-colors duration-200 flex items-center"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Download
            </button>
            <button
              onClick={onClose}
              className="rounded-full h-8 w-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Document content area */}
        <div className="flex-1 rounded-lg relative min-h-0 overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10 rounded-lg">
              <div className="flex flex-col items-center">
                <Spinner size="lg" />
                <p className="mt-2 text-gray-600">Loading document...</p>
              </div>
            </div>
          )}

          {hasError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10 rounded-lg">
              <div className="text-center">
                <svg
                  className="w-16 h-16 text-gray-400 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <p className="text-gray-600 mb-4">Unable to display document</p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={handleRetry}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded transition-colors duration-200"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={handleDownload}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors duration-200"
                  >
                    Download Instead
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* DOCX rendered via docx-preview */}
          {isDocxFile && (
            <div
              ref={containerRef}
              className="docx-render-area absolute inset-0 overflow-y-auto"
            />
          )}

          {/* Non-DOCX via Google Docs iframe */}
          {!isDocxFile && iframeUrl && (
            <iframe
              key={iframeUrl}
              src={iframeUrl}
              className="absolute inset-0 w-full h-full border-0 rounded-lg"
              title="Document Viewer"
              onLoad={() => setIsLoading(false)}
              onError={() => { setIsLoading(false); setHasError(true) }}
              allowFullScreen
            />
          )}
        </div>
      </div>

      {/* 
        Minimal styles for docx-preview - preserves the document's own formatting.
        Only styles the wrapper background and page centering.
        All document content styles (fonts, colors, spacing, tables, etc.) 
        are preserved exactly as they are in the original .docx file.
      */}
      <style jsx global>{`
        .docx-render-area {
          background: #4a4a4a;
        }
        .docx-render-area .docx-wrapper {
          background: #4a4a4a !important;
          padding: 20px 0 !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
        }
        .docx-render-area .docx-wrapper > section.docx {
          box-shadow: 0 1px 10px rgba(0,0,0,0.4) !important;
          margin-bottom: 16px !important;
        }
      `}</style>
    </div>
  )
}
