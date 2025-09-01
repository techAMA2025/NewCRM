# Settlement Tracker

## Overview
The Settlement Tracker is a comprehensive tool for managing settlement negotiations with recovery agents. It allows administrators to track the progress of settlement talks for client bank accounts.

## Features

### 1. Settlement Records Table
- Displays all settlement records in a comprehensive table
- Shows client information, bank details, loan amounts, and current status
- Color-coded status indicators for easy visual identification
- Sortable and filterable data

### 2. Add New Settlement
- Modal popup form for adding new settlement records
- Client dropdown populated from the clients collection
- Bank account dropdown that dynamically updates based on selected client
- Settlement status selection with predefined options
- Remarks field for additional notes

### 3. Settlement Status Options
- **Initial Contact**: First contact with recovery agent
- **Negotiation Started**: Active negotiation in progress
- **Offer Made**: Settlement offer has been presented
- **Offer Accepted**: Client has accepted the settlement offer
- **Offer Rejected**: Settlement offer was rejected
- **Payment Pending**: Waiting for payment processing
- **Settled**: Settlement completed successfully
- **Failed**: Settlement negotiation failed
- **On Hold**: Settlement temporarily paused

## Data Structure

### Settlement Document (Firestore Collection: `settlements`)
```typescript
{
  id: string
  clientId: string
  clientName: string
  bankId: string
  bankName: string
  accountNumber: string
  loanAmount: string
  loanType: string
  status: string
  remarks: string
  createdAt: Timestamp
  createdBy: string
}
```

## Usage

1. **Access**: Navigate to `/settlement-tracker` from the admin dashboard
2. **View Records**: All existing settlement records are displayed in the table
3. **Add New**: Click "Add New Settlement" button to open the form
4. **Select Client**: Choose a client from the dropdown
5. **Select Bank**: Choose the specific bank account for settlement
6. **Set Status**: Select the current settlement status
7. **Add Remarks**: Include any additional notes or comments
8. **Save**: Submit the form to create a new settlement record

## Integration

The Settlement Tracker integrates with:
- **Clients Collection**: Fetches client data and bank information
- **Firestore**: Stores settlement records in the `settlements` collection
- **Admin Navigation**: Accessible from the admin sidebar menu

## Future Enhancements

Potential future features:
- Edit existing settlement records
- Settlement history tracking
- Automated status updates
- Email notifications for status changes
- Settlement analytics and reporting
- Bulk settlement operations
