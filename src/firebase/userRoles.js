// Store user roles in Firestore
export const ROLES = {
  ADMIN: 'admin',
  SALES_MANAGER: 'salesmanager',
  SALESPERSON: 'salesperson'
};

// Import Firebase dependencies
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase/config';

// Function to set user role during registration
export async function setUserRole(uid, role, name = '') {
  console.log('Setting user role:', uid, role, name);
  
  try {
    await setDoc(doc(db, "users", uid), {
      role: role,
      name: name,
      createdAt: serverTimestamp()
    }, { merge: true });
    console.log('User role set successfully');
    return true;
  } catch (error) {
    console.error('Error setting user role:', error);
    throw error;
  }
}

// Function to get current user's role
export async function getUserRole(uid) {
  console.log('Getting user role for:', uid);
  
  if (!uid) {
    console.error('getUserRole called with invalid uid');
    return null;
  }
  
  try {
    const userDoc = await getDoc(doc(db, "users", uid));
    
    if (userDoc.exists()) {
      const data = userDoc.data();
      const role = data.role;
      console.log('User role found:', role);
      return role;
    } else {
      console.log('No user document found, returning null');
      return null;
    }
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
}

// Helper function to check if a user has a specific role
export function hasRole(userRole, requiredRole) {
  if (!userRole) return false;
  return userRole === requiredRole;
}

// Helper function to check if a user has any of the given roles
export function hasAnyRole(userRole, roleList) {
  if (!userRole || !roleList || !roleList.length) return false;
  return roleList.includes(userRole);
} 