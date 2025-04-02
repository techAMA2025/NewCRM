import React, { useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import EditClientDetailsModal from './EditClientDetailsModal';
import { Lead } from './types/lead';

interface EditClientDetailsButtonProps {
  lead: Lead;
  onClientUpdated?: () => void;
}

const EditClientDetailsButton = ({ lead, onClientUpdated }: EditClientDetailsButtonProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientData, setClientData] = useState<any | null>(null);

  const checkAndFetchClientData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // First try to find the client record using the lead ID
      const clientRef = doc(db, 'clients', lead.id);
      let clientDoc = await getDoc(clientRef);
      
      // If not found by ID, try to find by leadId field
      if (!clientDoc.exists()) {
        // This would require a query, but for simplicity in this example,
        // we'll use the leadId if available
        if (lead.source_database && lead.id) {
          const leadIdToCheck = `${lead.source_database}_${lead.id}`;
          const alternateClientRef = doc(db, 'clients', leadIdToCheck);
          clientDoc = await getDoc(alternateClientRef);
        }
      }
      
      if (clientDoc.exists()) {
        // Client exists, set the data
        setClientData({ id: clientDoc.id, ...clientDoc.data() });
        setIsModalOpen(true);
      } else {
        // No client record found
        setError('No client record found. Please convert this lead first.');
      }
    } catch (err) {
      console.error('Error fetching client data:', err);
      setError('Error fetching client details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClick = () => {
    checkAndFetchClientData();
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setClientData(null);
  };

  const handleClientUpdated = () => {
    setIsModalOpen(false);
    if (onClientUpdated) {
      onClientUpdated();
    }
  };

  return (
    <>
      <button
        onClick={handleEditClick}
        disabled={isLoading}
        className="inline-flex items-center px-3 py-1 border border-transparent rounded-md shadow-sm text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        {isLoading ? (
          <span className="flex items-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Loading...
          </span>
        ) : 'Edit Client Details'}
      </button>
      
      {error && (
        <div className="mt-2 text-sm text-red-500">{error}</div>
      )}
      
      {isModalOpen && clientData && (
        <EditClientDetailsModal
          clientData={clientData}
          onClose={handleCloseModal}
          onSave={handleClientUpdated}
        />
      )}
    </>
  );
};

export default EditClientDetailsButton; 