"use client";

import React, { useState } from 'react';
import { migrateBankDataToFirebase } from '../../../lib/migrateBankData';
import { getAllBanksWithIds } from '../../../lib/bankService';

export default function MigratePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);
  const [bankCount, setBankCount] = useState<number | null>(null);

  const checkCurrentBanks = async () => {
    try {
      const banks = await getAllBanksWithIds();
      setBankCount(banks.length);
      setMessage({ 
        type: 'info', 
        text: `Currently ${banks.length} banks found in Firebase` 
      });
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'Failed to check existing banks' 
      });
    }
  };

  const handleMigration = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      await migrateBankDataToFirebase();
      setMessage({ 
        type: 'success', 
        text: 'Migration completed successfully! Bank data has been added to Firebase.' 
      });
      // Refresh bank count
      await checkCurrentBanks();
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'Migration failed. Please check the console for details.' 
      });
      console.error('Migration error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Bank Data Migration
          </h1>

          <div className="mb-6">
            <p className="text-gray-600 mb-4">
              This page helps you migrate the existing static bank data to Firebase. 
              This should only be done once during the initial setup.
            </p>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    <strong>Warning:</strong> Running this migration multiple times may create duplicate entries. 
                    Check the current bank count first.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Status Message */}
          {message && (
            <div className={`mb-6 p-4 rounded-md ${
              message.type === 'success' 
                ? 'bg-green-50 border border-green-200 text-green-700'
                : message.type === 'error'
                ? 'bg-red-50 border border-red-200 text-red-700'
                : 'bg-blue-50 border border-blue-200 text-blue-700'
            }`}>
              {message.text}
            </div>
          )}

          {/* Current Status */}
          <div className="mb-6 p-4 bg-gray-50 rounded-md">
            <h3 className="text-lg font-semibold mb-2">Current Status</h3>
            {bankCount !== null && (
              <p className="text-gray-600">Banks in Firebase: {bankCount}</p>
            )}
            <button
              onClick={checkCurrentBanks}
              className="mt-2 px-4 py-2 text-sm bg-blue-100 text-blue-800 rounded hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Check Current Banks
            </button>
          </div>

          {/* Migration Actions */}
          <div className="space-y-4">
            <button
              onClick={handleMigration}
              disabled={isLoading}
              className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Migrating...' : 'Start Migration'}
            </button>

            <a
              href="/addBank"
              className="block w-full px-6 py-3 bg-gray-600 text-white font-medium rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 text-center"
            >
              Go to Add Bank Page
            </a>
          </div>

          {/* Instructions */}
          <div className="mt-8 p-4 bg-gray-50 rounded-md">
            <h3 className="text-lg font-semibold mb-2">Instructions</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
              <li>First, check the current number of banks in Firebase</li>
              <li>If this is the first time, run the migration to populate Firebase</li>
              <li>After migration, use the "Add Bank" page to manage banks</li>
              <li>The bank data will now be automatically synced across the application</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
} 