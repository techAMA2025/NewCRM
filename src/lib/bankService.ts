import { db } from '../firebase/firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';

export interface BankData {
  address: string;
  email: string;
}

export interface BankDocument extends BankData {
  id: string;
  name: string;
}

const COLLECTION_NAME = 'banks';

// Add a new bank to Firebase
export const addBank = async (name: string, data: BankData): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      name,
      address: data.address,
      email: data.email,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding bank:', error);
    throw error;
  }
};

// Get all banks from Firebase
export const getAllBanks = async (): Promise<Record<string, BankData>> => {
  try {
    const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
    const banks: Record<string, BankData> = {};
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      banks[data.name] = {
        address: data.address,
        email: data.email
      };
    });
    
    return banks;
  } catch (error) {
    console.error('Error getting banks:', error);
    throw error;
  }
};

// Update a bank in Firebase
export const updateBank = async (id: string, name: string, data: BankData): Promise<void> => {
  try {
    const bankRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(bankRef, {
      name,
      address: data.address,
      email: data.email,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('Error updating bank:', error);
    throw error;
  }
};

// Delete a bank from Firebase
export const deleteBank = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  } catch (error) {
    console.error('Error deleting bank:', error);
    throw error;
  }
};

// Get banks with their document IDs for admin operations
export const getAllBanksWithIds = async (): Promise<BankDocument[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
    const banks: BankDocument[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      banks.push({
        id: doc.id,
        name: data.name,
        address: data.address,
        email: data.email
      });
    });
    
    return banks;
  } catch (error) {
    console.error('Error getting banks with IDs:', error);
    throw error;
  }
}; 