import { getAllBanks } from '../lib/bankService';

export interface BankData {
  address: string;
  email: string;
}

// Main bankData variable that will be used throughout the application
export let bankData: Record<string, BankData> = {};

// Dynamic bank data management
let cachedBankData: Record<string, BankData> | null = null;
let isLoading = false;
let lastFetchTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

// Initialize bank data on module load
let initializationPromise: Promise<Record<string, BankData>> | null = null;

const initializeBankData = async (): Promise<Record<string, BankData>> => {
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    try {
      console.log('Loading banks from Firebase...');
      const firebaseData = await getAllBanks();
      
      console.log(`Successfully loaded ${Object.keys(firebaseData).length} banks from Firebase`);
      cachedBankData = firebaseData;
      lastFetchTime = Date.now();
      // Update the main bankData variable
      Object.assign(bankData, firebaseData);
      return firebaseData;
    } catch (error) {
      console.error('Failed to load banks from Firebase:', error);
      throw error;
    }
  })();

  return initializationPromise;
};

// Get bank data with automatic initialization and caching
export const getBankData = async (): Promise<Record<string, BankData>> => {
  // Check if we have valid cached data
  const now = Date.now();
  if (cachedBankData && (now - lastFetchTime) < CACHE_DURATION) {
    return cachedBankData;
  }

  // If already loading, wait for the current load
  if (isLoading) {
    return cachedBankData || {};
  }

  try {
    isLoading = true;
    console.log('Refreshing bank data from Firebase...');
    
    const firebaseData = await getAllBanks();
    
    console.log(`Successfully refreshed ${Object.keys(firebaseData).length} banks from Firebase`);
    cachedBankData = firebaseData;
    lastFetchTime = now;
    // Update the main bankData variable
    Object.assign(bankData, firebaseData);
    return firebaseData;
  } catch (error) {
    console.error('Error refreshing bank data from Firebase:', error);
    // Return cached data if available, otherwise empty object
    return cachedBankData || {};
  } finally {
    isLoading = false;
  }
};

// Force refresh cache from Firebase
export const refreshBankData = async (): Promise<Record<string, BankData>> => {
  console.log('Force refreshing bank data...');
  cachedBankData = null;
  lastFetchTime = 0;
  initializationPromise = null;
  const newData = await getBankData();
  // Update the main bankData variable
  Object.assign(bankData, newData);
  return newData;
};

// Get bank data synchronously (returns cached data or empty object immediately)
export const getBankDataSync = (): Record<string, BankData> => {
  if (cachedBankData) {
    return cachedBankData;
  }
  
  // If no cached data, start loading in background and return current bankData
  if (!isLoading) {
    getBankData().catch(console.error);
  }
  
  return bankData;
};

// Check if bank data is loaded from Firebase
export const isBankDataFromFirebase = (): boolean => {
  return cachedBankData !== null;
};

// Get cache status
export const getBankDataCacheStatus = () => {
  return {
    isCached: cachedBankData !== null,
    isFromFirebase: isBankDataFromFirebase(),
    lastFetchTime: lastFetchTime,
    cacheAge: lastFetchTime ? Date.now() - lastFetchTime : 0,
    isLoading: isLoading
  };
};

// Note: Bank data will be initialized when first requested after user authentication
// This ensures Firestore rules (which require auth) are satisfied 