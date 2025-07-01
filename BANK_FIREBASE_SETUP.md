# Bank Data Firebase Integration

This document explains the Firebase integration for bank data management in the CRM application.

## Overview

The bank data system has been migrated from static data to Firebase Firestore, allowing for dynamic management of bank information while maintaining backward compatibility.

## Files Created/Modified

### 1. `src/lib/bankService.ts`
- Core service for Firebase operations (CRUD operations)
- Functions: `addBank`, `getAllBanks`, `updateBank`, `deleteBank`, `getAllBanksWithIds`

### 2. `src/app/addBank/page.tsx`
- Complete form interface for adding and managing banks
- Features: Add, Edit, Delete, and View all banks
- Real-time updates and error handling

### 3. `src/data/bankData.ts` (Modified)
- Enhanced to fetch data from Firebase with static fallback
- Functions: `getBankData()`, `refreshBankData()`
- Maintains backward compatibility with existing `bankData` export

### 4. `src/lib/migrateBankData.ts`
- Migration utility to populate Firebase with existing static data
- One-time setup function: `migrateBankDataToFirebase()`

### 5. `src/app/addBank/migrate/page.tsx`
- User interface for running the migration
- Accessible at `/addBank/migrate`

### 6. `src/components/BankDataProvider.tsx`
- React context provider for bank data
- Hooks: `useBankData()`, `useBankDataSimple()`

## Setup Instructions

### 1. Initial Migration
1. Navigate to `/addBank/migrate`
2. Check current bank count in Firebase
3. Run migration if Firebase is empty
4. Verify migration success

### 2. Using the System

#### For Adding/Editing Banks:
- Navigate to `/addBank`
- Use the form to add new banks
- Edit existing banks using the Edit button
- Delete banks using the Delete button

#### For Developers:
```typescript
// Option 1: Use existing static data (immediate access)
import { bankData } from '@/data/bankData';

// Option 2: Use dynamic Firebase data (async)
import { getBankData } from '@/data/bankData';
const banks = await getBankData();

// Option 3: Use React hooks (in components)
import { useBankDataSimple } from '@/components/BankDataProvider';
const { bankData, isLoading } = useBankDataSimple();

// Option 4: Use context provider (wrap your app)
import { BankDataProvider, useBankData } from '@/components/BankDataProvider';
```

## Database Structure

### Firestore Collection: `banks`
```javascript
{
  id: "auto-generated-id",
  name: "Bank Name",
  address: "Full address string",
  email: "comma,separated,emails",
  createdAt: timestamp,
  updatedAt: timestamp
}
```

## Features

### ✅ Implemented
- ✅ Firebase CRUD operations
- ✅ Form-based bank management
- ✅ Data migration utility
- ✅ Backward compatibility
- ✅ Error handling and loading states
- ✅ Real-time data updates
- ✅ Context provider for React apps

### 🔄 Data Flow
1. **Static Data**: Immediate access via `bankData` export
2. **Firebase Data**: Async access via `getBankData()`
3. **Merged Data**: Firebase data overrides static data
4. **Caching**: First Firebase call is cached for performance
5. **Refresh**: `refreshBankData()` clears cache and refetches

### 🛡️ Error Handling
- Firebase connection issues → Falls back to static data
- Network errors → Graceful degradation
- User errors → Form validation and error messages

## Usage Examples

### Adding a New Bank Programmatically
```typescript
import { addBank } from '@/lib/bankService';

const newBank = await addBank("New Bank Name", {
  address: "Bank address here",
  email: "email1@bank.com, email2@bank.com"
});
```

### Getting All Banks in a Component
```typescript
import { useBankDataSimple } from '@/components/BankDataProvider';

export function MyComponent() {
  const { bankData, isLoading } = useBankDataSimple();
  
  if (isLoading) return <div>Loading banks...</div>;
  
  return (
    <select>
      {Object.keys(bankData).map(bankName => (
        <option key={bankName} value={bankName}>
          {bankName}
        </option>
      ))}
    </select>
  );
}
```

### Refreshing Bank Data After Changes
```typescript
import { refreshBankData } from '@/data/bankData';

// After adding/editing banks elsewhere
const updatedBanks = await refreshBankData();
```

## Navigation URLs

- **Add/Manage Banks**: `/addBank`
- **Migration Tool**: `/addBank/migrate`

## Notes

- The system maintains full backward compatibility
- Static data is preserved as fallback
- Firebase data takes precedence when available
- Migration should only be run once during initial setup
- All bank operations are automatically synced across the application 