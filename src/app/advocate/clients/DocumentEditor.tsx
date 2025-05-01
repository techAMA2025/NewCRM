"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import { ref, uploadString, getDownloadURL, getStorage, getBlob } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { db, storage } from '@/firebase/firebase';
import toast from 'react-hot-toast';
import mammoth from 'mammoth';

interface DocumentEditorProps {
  documentUrl: string;
  documentName: string;
  documentIndex: number;
  clientId: string;
  onClose: () => void;
  onDocumentUpdated: () => void;
}

const DocumentEditor: React.FC<DocumentEditorProps> = ({
  documentUrl,
  documentName,
  documentIndex,
  clientId,
  onClose,
  onDocumentUpdated
}) => {
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const editorRef = useRef<any>(null);

  // Function to extract the storage path from a Firebase Storage URL
  const extractPathFromUrl = (url: string): string | null => {
    try {
      // Parse the URL
      const parsedUrl = new URL(url);
      
      // Check if it's a Firebase Storage URL
      if (!parsedUrl.hostname.includes('firebasestorage.googleapis.com')) {
        return null;
      }
      
      // Extract the path from the 'o' parameter in the URL
      const path = parsedUrl.pathname.split('/o/')[1];
      
      // Make sure to decode URI components (e.g., %2F to /)
      if (path) {
        return decodeURIComponent(path.split('?')[0]);
      }
      
      return null;
    } catch (error) {
      console.error("Error parsing URL:", error);
      return null;
    }
  };

  useEffect(() => {
    async function loadDocument() {
      try {
        setIsLoading(true);
        
        console.log("Document URL received:", documentUrl);
        
        // Extract the storage path from the URL
        const storagePath = extractPathFromUrl(documentUrl);
        
        if (!storagePath) {
          throw new Error("Could not extract storage path from URL");
        }
        
        console.log("Extracted storage path:", storagePath);
        
        // Use the Firebase Storage SDK to get the blob with custom settings to avoid retry issues
        const storageRef = ref(storage, storagePath);
        
        console.log("Created storage reference:", storageRef.fullPath);
        
        // First check if an HTML version exists
        try {
          const htmlPath = storagePath.replace('.docx', '.html');
          const htmlRef = ref(storage, htmlPath);
          const htmlBlob = await getBlob(htmlRef);
          
          // If HTML version exists, use it directly
          const htmlText = await htmlBlob.text();
          setContent(htmlText);
          console.log("HTML version loaded directly");
          return;
        } catch (htmlError) {
          console.log("No HTML version found, will convert DOCX:", htmlError);
        }
        
        // If we reach here, try getting the DOCX and converting it
        let attempts = 0;
        const maxAttempts = 3;
        let lastError;
        
        while (attempts < maxAttempts) {
          try {
            const blob = await getBlob(storageRef);
            console.log("Document blob fetched, size:", blob.size);
            
            // Convert DOCX to HTML
            const result = await mammoth.convertToHtml({ arrayBuffer: await blob.arrayBuffer() });
            setContent(result.value);
            console.log("Document converted to HTML");
            return;
          } catch (error) {
            lastError = error;
            console.warn(`Attempt ${attempts + 1} failed:`, error);
            attempts++;
            
            // Short delay between retries
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
        // If we reached here, all attempts failed
        throw lastError || new Error("Failed to load document after multiple attempts");
      } catch (error) {
        console.error("Error loading document:", error);
        
        // Set fallback content if we can't load the document
        setContent('<p>Unable to load document content for editing. Please try again later.</p>');
        toast.error("Failed to load document for editing");
      } finally {
        setIsLoading(false);
      }
    }
    
    loadDocument();
  }, [documentUrl]);

  const handleSave = async () => {
    if (!editorRef.current) return;
    
    try {
      setIsSaving(true);
      const htmlContent = editorRef.current.getContent();
      
      // Extract the storage path for the original document
      const originalPath = extractPathFromUrl(documentUrl);
      
      if (!originalPath) {
        throw new Error("Could not extract storage path from URL");
      }
      
      // Create a new path for the HTML version
      const htmlPath = originalPath.replace('.docx', '.html');
      console.log("HTML storage path:", htmlPath);
      
      // Create a reference to the new path
      const storageRef = ref(storage, htmlPath);
      
      // Upload the HTML content
      await uploadString(storageRef, htmlContent, 'raw', { contentType: 'text/html' });
      console.log("HTML content uploaded to storage");
      
      // Get the updated download URL
      const htmlUrl = await getDownloadURL(storageRef);
      console.log("HTML URL:", htmlUrl);
      
      // Update the document reference in Firestore
      const clientRef = doc(db, "clients", clientId);
      await updateDoc(clientRef, {
        [`documents.${documentIndex}.htmlUrl`]: htmlUrl,
        [`documents.${documentIndex}.lastEdited`]: new Date().toISOString(),
        [`documents.${documentIndex}.contentType`]: 'text/html' // Note the content change
      });
      
      console.log("Firestore document updated");
      toast.success("Document saved successfully");
      onDocumentUpdated();
    } catch (error) {
      console.error("Error saving document:", error);
      toast.error("Failed to save document");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg w-full max-w-6xl h-[90vh] flex flex-col">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-white text-lg font-semibold">
            Editing: {documentName}
          </h2>
          <div className="flex space-x-2">
            <button
              onClick={handleSave}
              disabled={isSaving || isLoading}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-md transition-colors duration-200 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : "Save Document"}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors duration-200"
            >
              Close
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-hidden p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
          ) : (
            <Editor
              apiKey="your-actual-api-key"
              onInit={(evt, editor) => editorRef.current = editor}
              initialValue={content}
              disabled={false}
              init={{
                height: "100%",
                menubar: true,
                plugins: [
                  'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview', 'anchor',
                  'searchreplace', 'visualblocks', 'code', 'fullscreen',
                  'insertdatetime', 'media', 'table', 'help', 'wordcount'
                ],
                toolbar: 'undo redo | formatselect | ' +
                  'bold italic backcolor | alignleft aligncenter ' +
                  'alignright alignjustify | bullist numlist outdent indent | ' +
                  'removeformat | help',
                content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
                promotion: false,
                toolbar_mode: 'sliding',
                skin: 'oxide-dark',
                content_css: 'dark',
                browser_spellcheck: true,
                contextmenu: false
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentEditor; 