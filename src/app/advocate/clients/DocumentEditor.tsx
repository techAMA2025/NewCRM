"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import { ref, uploadString, getDownloadURL, getStorage, getBlob } from 'firebase/storage';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
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
      console.log("Extracting path from URL:", url);
      
      // Parse the URL
      const parsedUrl = new URL(url);
      
      // Check if it's a Firebase Storage URL
      if (!parsedUrl.hostname.includes('firebasestorage.googleapis.com')) {
        console.warn("Not a Firebase Storage URL");
        return null;
      }
      
      // Extract the path from the 'o' parameter in the URL
      const path = parsedUrl.pathname.split('/o/')[1];
      
      // Make sure to decode URI components (e.g., %2F to /)
      if (path) {
        const decodedPath = decodeURIComponent(path.split('?')[0]);
        console.log("Extracted path:", decodedPath);
        return decodedPath;
      }
      
      console.warn("Could not extract path from URL");
      return null;
    } catch (error) {
      console.error("Error parsing URL:", error);
      return null;
    }
  };

  useEffect(() => {
    async function validateClient() {
      try {
        console.log("Validating client ID:", clientId);
        if (!clientId) {
          throw new Error("Client ID is missing");
        }
        
        // Check if client exists
        const clientDoc = await getDoc(doc(db, "clients", clientId));
        if (!clientDoc.exists()) {
          throw new Error("Client document does not exist");
        }
        
        console.log("Client validation successful");
        return true;
      } catch (error) {
        console.error("Client validation failed:", error);
        toast.error("Client validation failed: " + (error as Error).message);
        return false;
      }
    }
    
    async function loadDocument() {
      try {
        setIsLoading(true);
        
        console.log("Document URL received:", documentUrl);
        console.log("Document name:", documentName);
        console.log("Document index:", documentIndex);
        console.log("Client ID:", clientId);
        
        // Validate client first
        const isValid = await validateClient();
        if (!isValid) {
          throw new Error("Invalid client data");
        }
        
        // Extract the storage path from the URL
        const storagePath = extractPathFromUrl(documentUrl);
        
        if (!storagePath) {
          throw new Error("Could not extract storage path from URL");
        }
        
        console.log("Extracted storage path:", storagePath);
        
        // Check if it's a DOCX or another format
        const isDocx = storagePath.toLowerCase().endsWith('.docx');
        const isPdf = storagePath.toLowerCase().endsWith('.pdf');
        
        if (isPdf) {
          setContent('<p>PDF documents cannot be edited directly in this editor. Please convert to DOCX first.</p>');
          setIsLoading(false);
          return;
        }
        
        // First check if an HTML version exists
        const htmlPath = isDocx ? storagePath.replace('.docx', '.html') : storagePath + '.html';
        console.log("Looking for HTML version at:", htmlPath);
        
        try {
          // Try to get the HTML version first through our proxy
          const htmlProxyUrl = `/api/document-proxy?path=${encodeURIComponent(htmlPath)}`;
          console.log("Fetching HTML via proxy:", htmlProxyUrl);
          
          const htmlResponse = await fetch(htmlProxyUrl);
          
          if (htmlResponse.ok) {
            // If HTML version exists, use it directly
            const htmlText = await htmlResponse.text();
            console.log("HTML version found and loaded, length:", htmlText.length);
            setContent(htmlText);
          } else {
            throw new Error("HTML version not found");
          }
        } catch (htmlError) {
          console.log("No HTML version found, will try to convert DOCX:", htmlError);
          
          if (!isDocx) {
            throw new Error(`Unsupported document format. Expected .docx but got ${storagePath.split('.').pop()}`);
          }
          
          // If we reach here, try getting the DOCX via our proxy and converting it
          try {
            const docxProxyUrl = `/api/document-proxy?path=${encodeURIComponent(storagePath)}`;
            console.log("Fetching DOCX via proxy:", docxProxyUrl);
            
            const docxResponse = await fetch(docxProxyUrl);
            
            if (!docxResponse.ok) {
              throw new Error(`Failed to fetch DOCX: ${docxResponse.statusText}`);
            }
            
            const blob = await docxResponse.blob();
            console.log("Document blob fetched, size:", blob.size);
            
            // Convert DOCX to HTML
            console.log("Converting DOCX to HTML...");
            const result = await mammoth.convertToHtml({ arrayBuffer: await blob.arrayBuffer() });
            console.log("Document converted to HTML, length:", result.value.length);
            setContent(result.value);
            
            // Save the HTML version for future use
            const storageRef = ref(storage, htmlPath);
            await uploadString(storageRef, result.value, 'raw', { contentType: 'text/html' });
            console.log("Saved HTML version for future use");
          } catch (docxError) {
            console.error("Failed to load or convert DOCX:", docxError);
            throw new Error("Could not load or convert the document: " + (docxError as Error).message);
          }
        }
      } catch (error) {
        console.error("Error loading document:", error);
        
        // Set fallback content if we can't load the document
        setContent('<p>Unable to load document content for editing. Error: ' + (error as Error).message + '</p>');
        toast.error("Failed to load document: " + (error as Error).message);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadDocument();
  }, [documentUrl, documentName, documentIndex, clientId]);

  const handleSave = async () => {
    if (!editorRef.current) {
      console.error("Editor reference is not available");
      toast.error("Editor not initialized properly");
      return;
    }
    
    try {
      setIsSaving(true);
      const htmlContent = editorRef.current.getContent();
      console.log("Saving HTML content, length:", htmlContent.length);
      
      // Extract the storage path for the original document
      const originalPath = extractPathFromUrl(documentUrl);
      
      if (!originalPath) {
        throw new Error("Could not extract storage path from URL");
      }
      
      // Create a new path for the HTML version
      const htmlPath = originalPath.endsWith('.docx') 
        ? originalPath.replace('.docx', '.html') 
        : originalPath + '.html';
      
      console.log("HTML storage path:", htmlPath);
      
      // Create a reference to the new path
      const storageRef = ref(storage, htmlPath);
      
      // Upload the HTML content
      console.log("Uploading HTML content to storage...");
      await uploadString(storageRef, htmlContent, 'raw', { contentType: 'text/html' });
      console.log("HTML content uploaded to storage");
      
      // Get the updated download URL
      const htmlUrl = await getDownloadURL(storageRef);
      console.log("HTML URL:", htmlUrl);
      
      // Update the document reference in Firestore
      console.log("Updating Firestore document...");
      console.log("Client ID:", clientId);
      console.log("Document index:", documentIndex);
      
      const clientRef = doc(db, "clients", clientId);
      
      // First get the current client data to ensure we're updating correctly
      const clientSnapshot = await getDoc(clientRef);
      if (!clientSnapshot.exists()) {
        throw new Error("Client document not found");
      }
      
      const clientData = clientSnapshot.data();
      console.log("Client data retrieved, has documents:", !!clientData.documents);
      
      // Check if the documents array exists
      if (!clientData.documents || !Array.isArray(clientData.documents)) {
        console.error("Client doesn't have a documents array or it's not valid");
        throw new Error("Client document structure is invalid");
      }
      
      // Check if the document index is valid
      if (documentIndex < 0 || documentIndex >= clientData.documents.length) {
        console.error("Invalid document index:", documentIndex, "Documents length:", clientData.documents.length);
        throw new Error("Invalid document index");
      }
      
      // Create the update object
      // Keep the original URL in the documents array but add an htmlUrl field
      const updateObj = {
        [`documents.${documentIndex}.htmlUrl`]: htmlUrl,
        [`documents.${documentIndex}.lastEdited`]: new Date().toISOString(),
        // Don't change the contentType to keep it consistent with the original document
        [`documents.${documentIndex}.hasEditedVersion`]: true
      };
      
      console.log("Update object:", updateObj);
      
      // Perform the update
      await updateDoc(clientRef, updateObj);
      
      console.log("Firestore document updated successfully");
      toast.success("Document saved successfully");
      onDocumentUpdated();
    } catch (error) {
      console.error("Error saving document:", error);
      toast.error("Failed to save document: " + (error as Error).message);
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
              apiKey="fzici277yjsb1ctjun3npypc2mxzop65g5qrfz89xkcvhxaq"
              onInit={(evt, editor) => {
                console.log("TinyMCE Editor initialized");
                editorRef.current = editor;
              }}
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