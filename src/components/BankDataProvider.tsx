"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { getBankData, refreshBankData, type BankData } from '../data/bankData';

interface BankDataContextType {
  bankData: Record<string, BankData>;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const BankDataContext = createContext<BankDataContextType | undefined>(undefined);

export function BankDataProvider({ children }: { children: React.ReactNode }) {
  const [bankData, setBankData] = useState<Record<string, BankData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBankData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getBankData();
      setBankData(data);
    } catch (err) {
      setError('Failed to load bank data');
      console.error('Error loading bank data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const refresh = async () => {
    try {
      setError(null);
      const data = await refreshBankData();
      setBankData(data);
    } catch (err) {
      setError('Failed to refresh bank data');
      console.error('Error refreshing bank data:', err);
    }
  };

  useEffect(() => {
    loadBankData();
  }, []);

  const value: BankDataContextType = {
    bankData,
    isLoading,
    error,
    refresh,
  };

  return <BankDataContext.Provider value={value}>{children}</BankDataContext.Provider>;
}

export function useBankData() {
  const context = useContext(BankDataContext);
  if (context === undefined) {
    throw new Error('useBankData must be used within a BankDataProvider');
  }
  return context;
}

// Hook for components that need bank data but don't want to use context
export function useBankDataSimple() {
  const [bankData, setBankData] = useState<Record<string, BankData>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getBankData();
        setBankData(data);
      } catch (error) {
        console.error('Error loading bank data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  return { bankData, isLoading };
} 