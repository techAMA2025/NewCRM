# AMA Leads Page - Context & Rules Documentation

## 📊 Database Structure

### Main Collection: `ama_leads`
**Location:** `asia-south2`

#### Lead Document Structure:
```typescript
interface AmaLead {
  // Contact Information
  name: string;                    // "Ranjith Kumar S"
  email: string;                   // "rockyranjith1988@gmail.com" 
  mobile: number;                  // 9715807414
  address: string;                 // "" (can be empty)
  
  // Lead Details
  query: string;                   // "Pls call to my alternate mobile number 8122047414."
  source: string;                  // "AMA", "CREDSETTLE", etc.
  status: string;                  // "Callback", "Interested", "Not Interested", etc.
  
  // Assignment
  assigned_to: string;             // "–" (unassigned) or salesperson name
  
  // Financial Information
  debt_range: number;              // 0 (debt amount)
  income: number;                  // 0 (monthly income)
  
  // Timestamps (all in epoch milliseconds)
  date: number;                    // 1755159374102 (lead creation date)
  synced_date: number;             // 1755159360651 (sync timestamp)
  lastModified: Timestamp;         // Firebase timestamp
}
```

### Subcollection: `callback_info`
**Path:** `ama_leads/{leadId}/callback_info`

```typescript
interface CallbackInfo {
  id: string;                      // "attempt_1", "attempt_2", etc.
  scheduled_dt: Timestamp;         // August 15, 2025 at 3:00:00 PM UTC+5:30
  scheduled_by: string;            // "Bhavya Jain"
  created_at: Timestamp;           // August 14, 2025 at 3:53:56 PM UTC+5:30
}
```

### Subcollection: `history`
**Path:** `ama_leads/{leadId}/history`

```typescript
interface HistoryEntry {
  // Assignment Changes
  assignmentChange?: boolean;      // true
  assignedById?: string;           // "Bhavya Jain"
  previousAssignee?: string;       // "Ashish Sales"
  newAssignee?: string;           // "Unassigned"
  
  // Editor Information
  editor: {
    id: string;                    // "tmLDA2VGPYb2vz3zOHjFnDLXch93"
  };
  
  // Notes/Content
  content?: string;                // Sales notes content
  createdBy?: string;              // User who created the entry
  createdById?: string;            // User ID
  
  // Timestamps
  timestamp: Timestamp;            // August 13, 2025 at 12:07:47 PM UTC+5:30
  createdAt?: Timestamp;           // Alternative timestamp field
  displayDate?: string;            // Human-readable date string
}
```

## 🔍 AmaLeadsFilters Component Context

### Component Purpose
**File:** `crm/src/app/ama_leads/components/AmaLeadsFilters.tsx`

AmaLeadsFilters is a comprehensive filtering and search component that provides:
- Real-time database search across multiple fields
- Advanced filtering options with multiple criteria
- Custom date range selection with timezone handling
- Debounced search to optimize performance
- Visual feedback and result counters

### Props Interface
```typescript
interface LeadsFiltersProps {
  // Search functionality
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSearchResults?: (results: any[]) => void;
  isSearching?: boolean;
  setIsSearching?: (searching: boolean) => void;
  onSearchCleared?: () => void;
  
  // Filter states
  sourceFilter: string;
  setSourceFilter: (source: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  salesPersonFilter: string;
  setSalesPersonFilter: (salesperson: string) => void;
  convertedFilter: boolean | null;
  setConvertedFilter: (converted: boolean | null) => void;
  
  // Date range filters
  fromDate: string;                // YYYY-MM-DD format
  setFromDate: (date: string) => void;
  toDate: string;                  // YYYY-MM-DD format
  setToDate: (date: string) => void;
  
  // Data and metadata
  statusOptions: string[];         // Available status options
  teamMembers: any[];             // All team members
  filteredLeads: any[];           // Currently filtered leads
  leads: any[];                   // All loaded leads
  totalLeadsCount: number;        // Total count from database
  allLeadsCount?: number;         // All leads count for display
  filteredLeadsCount?: number;    // Filtered leads count
  userRole: string;               // Current user role
}
```

### Database Search Implementation

#### Search Strategy
The component implements a **multi-field, multi-strategy search approach**:

1. **Exact Match Search** (Highest Priority)
2. **Prefix Match Search** (Medium Priority)  
3. **Partial Match Search** (Lower Priority)
4. **Fallback Comprehensive Search** (Lowest Priority)

#### Search Fields & Patterns
```typescript
// Primary Search Fields
const searchFields = {
  name: {
    strategy: 'case_insensitive_prefix_and_partial',
    firestore_field: 'name',
    normalization: 'toLowerCase()',
    firestore_queries: [
      'where("name", ">=", searchTermLower)',
      'where("name", "<=", searchTermLower + "\\uf8ff")'
    ]
  },
  
  email: {
    strategy: 'case_insensitive_prefix_and_partial', 
    firestore_field: 'email',
    normalization: 'toLowerCase()',
    trigger_condition: 'searchTerm.includes("@") || searchTerm.length > 3'
  },
  
  mobile: {
    strategy: 'exact_and_partial_numeric',
    firestore_field: 'mobile',
    normalization: 'normalizePhoneNumber()',
    data_type: 'number (in database), string (in display)',
    patterns: [
      'parseInt(normalizedPhone)', // Exact number match
      'String(data.mobile).includes(normalizedPhone)' // Partial match
    ]
  }
};
```

#### Phone Number Normalization
```typescript
const normalizePhoneNumber = (phone: string | number): string => {
  return String(phone).replace(/[\s\-$$$$+]/g, "");
};

// Search patterns supported:
// Input: "+91 97158 07414" → Normalized: "919715807414"
// Input: "9715807414"      → Normalized: "9715807414" 
// Input: "97158"           → Partial match: true
```

#### Search Performance Optimization
```typescript
// Debounced search with 500ms delay
const debouncedSearch = useMemo(
  () => debounce((value: string) => {
    if (value.trim()) {
      performDatabaseSearch(value);
    } else {
      // Clear search state
      setSearchQuery(value);
      onSearchResults?.([]);
      setSearchResultsCount(0);
    }
  }, 500),
  [performDatabaseSearch, setSearchQuery, onSearchResults]
);

// Search result limits
const LIMITS = {
  exact_match: 50,        // Per field exact matches
  prefix_match: 50,       // Per field prefix matches  
  fallback_scan: 1500,    // Comprehensive fallback scan
  final_results: 100      // Maximum results returned
};
```

#### Search Result Transformation
```typescript
// Database → Frontend field mapping
const transformSearchResult = (dbData: any): ProcessedLead => ({
  id: dbData.id,
  name: dbData.name || "",
  email: dbData.email || "",
  phone: String(dbData.mobile || ""),           // Number → String conversion
  address: dbData.address || "",
  city: dbData.city || "",
  status: dbData.status || "No Status",
  source: dbData.source || "",
  source_database: dbData.source || "",         // Map source → source_database
  assignedTo: dbData.assigned_to || "",         // Map assigned_to → assignedTo
  assignedToId: dbData.assignedToId || "",
  salesNotes: dbData.salesNotes || dbData.lastNote || "",
  lastNote: dbData.lastNote || "",
  query: dbData.query || "",
  language_barrier: dbData.language_barrier,
  convertedAt: dbData.convertedAt,
  convertedToClient: dbData.convertedToClient,
  lastModified: dbData.lastModified,
  
  // Date field mapping (CRITICAL for timezone handling)
  synced_at: dbData.date ? new Date(dbData.date) : 
            (dbData.synced_date ? new Date(dbData.synced_date) : undefined),
  date: dbData.date || dbData.synced_date || Date.now(),
  
  // Financial data mapping
  debt_Range: dbData.debt_range || dbData.debt_Range,
  debt_range: dbData.debt_range,
  debtRange: dbData.debt_range,
  income: dbData.income,
});
```

### Filter System

#### Source Filter Options
```typescript
const sourceOptions = [
  { value: 'all', label: 'All Sources' },
  { value: 'ama', label: 'AMA' },
  { value: 'credsettlee', label: 'CredSettle' },
  { value: 'settleloans', label: 'SettleLoans' }
];
```

#### Status Filter Logic
```typescript
// Special handling for "No Status" filter
if (statusFilter === 'No Status') {
  // Matches multiple "empty" representations
  const emptyStatuses = ["", "-", "–", "No Status"];
  result = result.filter(lead => 
    !lead.status || 
    emptyStatuses.includes(lead.status) ||
    (typeof lead.status === 'string' && lead.status.trim() === '')
  );
}
```

#### Salesperson Filter with "My Leads" Toggle
```typescript
// My Leads Toggle Implementation
const handleMyLeadsToggle = () => {
  const currentUserName = localStorage.getItem('userName');
  if (currentUserName) {
    if (salesPersonFilter === currentUserName) {
      setSalesPersonFilter('all');      // Turn off
    } else {
      setSalesPersonFilter(currentUserName); // Turn on
    }
  }
};

// Visual Toggle States
const toggleClasses = {
  active: 'bg-[#D2A02A]',           // AMA gold when active
  inactive: 'bg-[#5A4C33]',         // AMA brown when inactive
  slider_active: 'translate-x-6',   // Slider position when on
  slider_inactive: 'translate-x-1'  // Slider position when off
};
```

### Custom Date Input Integration

#### CustomDateInput Component Usage
```typescript
// Implementation in AmaLeadsFilters
<CustomDateInput
  value={fromDate}                    // YYYY-MM-DD string
  onChange={(date) => setFromDate(date)}
  max={toDate || today}              // Constraint: cannot exceed toDate
  placeholder="From Date"
  label="From Date" 
  className="w-full"
/>

<CustomDateInput
  value={toDate}
  onChange={(date) => setToDate(date)}
  min={fromDate}                     // Constraint: cannot be before fromDate
  max={today}                        // Constraint: cannot be future date
  placeholder="To Date"
  label="To Date"
  className="w-full"
/>
```

#### Date Input Constraints & Validation
```typescript
// Automatic constraint logic
const dateConstraints = {
  fromDate: {
    min: undefined,                  // No minimum date
    max: toDate || today,           // Cannot exceed toDate or today
  },
  toDate: {
    min: fromDate,                  // Cannot be before fromDate  
    max: today,                     // Cannot be future date
  }
};

// Date format validation
const isValidDateFormat = (dateString: string): boolean => {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  return regex.test(dateString) && !isNaN(Date.parse(dateString));
};
```

### Filter State Management

#### Active Filters Detection
```typescript
const hasActiveFilters = useMemo(() => {
  return (
    searchQuery ||                   // Search is active
    sourceFilter !== "all" ||        // Source filter applied
    statusFilter !== "all" ||        // Status filter applied  
    salesPersonFilter !== "all" ||   // Salesperson filter applied
    convertedFilter !== null ||      // Conversion filter applied
    fromDate ||                      // Date range start set
    toDate                          // Date range end set
  );
}, [searchQuery, sourceFilter, statusFilter, salesPersonFilter, convertedFilter, fromDate, toDate]);
```

#### Clear Filter Functions
```typescript
// Clear individual filter types
const clearSearch = () => {
  setSearchInput("");
  setSearchQuery("");
  onSearchResults?.([]);
  setSearchResultsCount(0);
  debouncedSearch.cancel();
  onSearchCleared?.();              // Triggers pagination reset in parent
};

const clearDateFilters = () => {
  setFromDate('');
  setToDate('');
};

// Clear all filters at once
const clearAllFilters = () => {
  clearSearch();
  setSourceFilter("all");
  setStatusFilter("all");
  setSalesPersonFilter("all");
  setConvertedFilter(null);
  setFromDate("");
  setToDate("");
};
```

### UI/UX Features

#### Loading States & Visual Feedback
```typescript
// Search loading indicator
{isSearching ? (
  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#D2A02A]"></div>
) : (
  <SearchIcon />
)}

// Search results summary
{searchQuery && (
  <span className="text-sm text-[#5A4C33]/70">
    {isSearching ? (
      <span className="flex items-center">
        <LoadingSpinner className="mr-2" />
        Searching database...
      </span>
    ) : (
      <>
        Found <span className="text-[#D2A02A] font-medium">{searchResultsCount}</span> 
        results for "{searchQuery}"
        {searchResultsCount > 0 && (
          <span className="text-[#D2A02A] ml-2">✓ Database search complete</span>
        )}
      </>
    )}
  </span>
)}
```

#### Results Counter Logic
```typescript
// Dynamic results counter based on context
const getDisplayCount = (): number => {
  if (searchQuery) {
    return searchResultsCount;              // Show search results count
  } else if (hasActiveFilters) {
    return filteredLeadsCount;              // Show filtered results count
  } else {
    return allLeadsCount || totalLeadsCount; // Show total available count
  }
};

// Results counter display
<span className="text-[#D2A02A] font-medium">{getDisplayCount()}</span> leads
{searchQuery && <span className="text-[#D2A02A] ml-1">(from database search)</span>}
```

### Integration with Parent Component

#### Search Result Handling
```typescript
// In AmaLeadsPage (parent):
const handleSearchResults = (results: any[]) => {
  setSearchResults(results);          // Store search results
};

const handleSearchCleared = () => {
  if (leads.length > 50) {
    console.log("🔄 Search cleared, resetting to first 50 leads");
    setLeads(leads.slice(0, 50));     // Reset to first page
    setLastDoc(null);                 // Reset pagination cursor
    setHasMoreLeads(true);           // Reset pagination state
  }
};

// Filter application logic
const leadsToFilter = searchQuery ? searchResults : leads;
const filteredLeads = applyFiltersToLeads(leadsToFilter);
```

#### Communication Flow
```
User Input → AmaLeadsFilters → Parent State → Data Processing

1. User types in search box
   ↓
2. AmaLeadsFilters.handleSearchInputChange()
   ↓  
3. debouncedSearch() → performDatabaseSearch()
   ↓
4. onSearchResults(transformedResults)
   ↓
5. Parent.handleSearchResults() → setSearchResults()
   ↓
6. Parent.useEffect() → applyFiltersToLeads(searchResults)
   ↓
7. UI updates with filtered results
```

### Error Handling & Edge Cases

#### Search Error Recovery
```typescript
try {
  // Perform database search operations
  const results = await performDatabaseSearch(searchTerm);
  onSearchResults?.(results);
} catch (error) {
  console.error("❌ Search error:", error);
  onSearchResults?.([]);              // Clear results on error
  setSearchResultsCount(0);
  toast.error("Search failed. Please try again.");
} finally {
  setIsSearching(false);              // Always clear loading state
}
```

#### Common Edge Cases Handled
```typescript
const edgeCases = {
  emptySearchTerm: {
    condition: '!searchTerm.trim()',
    action: 'Return empty results immediately'
  },
  
  phoneNumberVariations: {
    inputs: ['+91 97158 07414', '919715807414', '9715807414', '97158'],
    normalization: 'Remove spaces, dashes, plus signs',
    matching: 'Both exact and partial matching'
  },
  
  caseInsensitiveNames: {
    storage: 'Mixed case in database',
    search: 'Converted to lowercase for matching',
    display: 'Original case preserved'
  },
  
  missingFields: {
    handling: 'Default to empty string, graceful degradation',
    validation: 'Check field existence before accessing'
  },
  
  databaseConnectionIssues: {
    timeout: 'Firestore query timeout handling',
    offline: 'Graceful failure with user notification',
    recovery: 'Retry mechanism for transient failures'
  }
};
```

## 🎨 Visual Design System

### Color Palette (AMA Theme)
```css
Primary Gold: #D2A02A
Primary Brown: #5A4C33
Background: #F8F5EC
White: #ffffff
Text Light: #5A4C33/70
Border: #5A4C33/20
```

### Component Naming Convention
- **Page:** `AmaLeadsPage`
- **Components:** `Ama[ComponentName]` (e.g., `AmaLeadsTable`, `AmaLeadRow`)
- **Modals:** `Ama[Purpose]Modal` (e.g., `AmaStatusChangeConfirmationModal`)
- **Cells:** `Ama[Field]Cell` (e.g., `AmaStatusCell`, `AmaSalespersonCell`)

## 📋 Tabs System

### All Leads Tab
- Shows all leads regardless of status
- Default sorting: by date (newest first)
- All filters available

### Callback Tab
- **Filter:** Only shows leads with `status === "Callback"`
- **Visual Priority System:**
  - 🔴 **Red Strip:** Today's callbacks (`bg-red-600`)
  - 🟡 **Yellow Strip:** Tomorrow's callbacks (`bg-yellow-500`)
  - 🟢 **Green Strip:** Future callbacks (`bg-green-600`)
  - ⚫ **Gray Strip:** Past/missing callbacks (`bg-gray-600`)
- **Sorting:** Priority-based (today → tomorrow → future)
- **Auto-reset:** Clears search and status filters when switching to callback tab

## 🔐 Permission System

### Role-Based Access Control
```typescript
interface UserRoles {
  admin: "Full access to all features";
  overlord: "Full access to all features";
  sales: "Limited to assigned leads or unassigned leads";
  salesperson: "Limited to assigned leads or unassigned leads";
}
```

### Lead Edit Permissions
```typescript
const canUserEditLead = (lead: any) => {
  const currentUserRole = localStorage.getItem('userRole');
  const currentUserName = localStorage.getItem('userName');
  
  // Admin and overlord can do anything
  if (currentUserRole === 'admin' || currentUserRole === 'overlord') {
    return true;
  }
  
  // Check if lead is assigned
  const isLeadAssigned = lead.assignedTo && 
                        lead.assignedTo !== '' && 
                        lead.assignedTo !== '-' && 
                        lead.assignedTo !== '–' &&
                        lead.assignedTo.trim() !== '';
  
  // If lead is unassigned, no one can edit it (except admin/overlord)
  if (!isLeadAssigned) {
    return false;
  }
  
  // If lead is assigned, only the assigned person can edit it
  if (currentUserRole === 'sales' || currentUserRole === 'salesperson') {
    return lead.assignedTo === currentUserName;
  }
  
  return false;
};
```

## 📧 Email Integration

### Status Change Email Trigger
```typescript
// Triggers email for these status changes:
const emailStatusTriggers = ["Interested", "Not Answering"];

// Cloud Function: sendStatusChangeMessage
const emailData = {
  leadName: lead.name || 'Dear Sir/Ma\'am',
  leadEmail: lead.email,
  leadId: leadId,
  newStatus: newStatus
};
```

## 📱 WhatsApp Integration

### Cloud Function: `sendWhatsappMessage`
```typescript
const whatsappData = {
  phoneNumber: formattedPhone,        // 91XXXXXXXXXX format
  templateName: templateName,         // WATI template name
  leadId: lead.id,
  userId: localStorage.getItem('userName'),
  userName: localStorage.getItem('userName'),
  customParams: [
    { name: "name", value: lead.name || "Customer" },
    { name: "Channel", value: "AMA Legal Solutions" },
    { name: "agent_name", value: userName },
    { name: "customer_mobile", value: formattedPhone }
  ],
  channelNumber: "919289622596",
  broadcastName: `${templateName}_${Date.now()}`
};
```

## 🔍 Search Functionality

### Database Search Fields
```typescript
const searchFields = [
  'name',           // Case-insensitive with prefix matching
  'email',          // Exact match
  'mobile',         // Normalized phone number matching
  'search_terms'    // Tokenized search array
];

// Field Mapping for Search Results
const fieldMapping = {
  'source_database': 'source',
  'phone': 'mobile',
  'synced_at': 'synced_date' || 'date'
};
```

### Phone Number Normalization
```typescript
const normalizePhoneNumber = (phone: string): string => {
  return phone.replace(/[\s\-$$$$\+]/g, "");
};

// Search patterns:
// - +91XXXXXXXXXX
// - 91XXXXXXXXXX  
// - XXXXXXXXXX (adds 91 prefix)
```

## 📊 Data Filtering & Sorting

### Client-Side Filters
```typescript
interface FilterOptions {
  searchQuery: string;              // Database search
  sourceFilter: 'all' | string;    // Source database filter
  statusFilter: 'all' | string;    // Status filter
  salesPersonFilter: 'all' | string; // Assigned salesperson
  convertedFilter: boolean | null;  // Conversion status
  fromDate: string;                 // Date range start (YYYY-MM-DD)
  toDate: string;                   // Date range end (YYYY-MM-DD)
}
```

### Date Handling (Timezone Critical)
```typescript
// ⚠️ IMPORTANT: Always use local timezone for date creation
const fromDateStart = new Date(fromDate + 'T00:00:00'); // Local timezone
const toDateEnd = new Date(toDate + 'T23:59:59.999');   // Local timezone

// ❌ NEVER use: new Date(dateString) - defaults to UTC
// ✅ ALWAYS use: new Date(dateString + 'T00:00:00') - local timezone
```

## 🔄 State Management

### Lead Data Structure in Frontend
```typescript
interface ProcessedLead {
  id: string;
  name: string;
  email: string;
  phone: string;                    // Always string (converted from mobile)
  address: string;
  city: string;
  status: string;
  source: string;
  source_database: string;
  assignedTo: string;
  assignedToId?: string;
  salesNotes: string;
  lastNote: string;
  query: string;
  language_barrier?: any;
  convertedAt?: any;
  lastModified: Date;
  synced_at: Date;                  // Mapped from date field
  date: number;                     // Original epoch timestamp
  callbackInfo?: CallbackInfo;      // Fetched separately for callback leads
}
```

## 📋 Column Visibility System

### Default Column Configuration
```typescript
const defaultColumnVisibility = {
  checkbox: true,
  date: true,
  name: true,
  location: true,
  source: true,
  debt: true,
  status: true,
  assignedTo: true,
  callback: true,        // Only visible on callback tab
  customerQuery: true,   // Shows query OR callback info based on tab
  salesNotes: true,
};
```

## 🔧 Modal System

### Status Change Confirmation Modal
- **Triggers:** "Interested", "Not Answering", "Converted"
- **Email Integration:** Sends email after successful status update
- **Database Updates:** Updates lead status + timestamp fields

### Callback Scheduling Modal
- **Path:** `ama_leads/{leadId}/callback_info`
- **Auto-refresh:** Updates lead.callbackInfo after scheduling
- **Priority Calculation:** Updates visual indicators

### Language Barrier Modal
- **Purpose:** Record preferred language for communication
- **Storage:** `lead.language_barrier` field

## 📱 Component Communication

### Parent → Child Props Flow
```
AmaLeadsPage 
  ├── AmaLeadsTabs (activeTab, counts)
  ├── AmaLeadsFilters (search, filters)
  ├── AmaLeadsTable (leads, activeTab)
  │   └── AmaLeadRow (lead, activeTab, callbacks)
  │       ├── AmaStatusCell (status management)
  │       └── AmaSalespersonCell (assignment)
  └── Modals (confirmation, callback, etc.)
```

### Critical Props to Pass Down
- `activeTab`: Determines visual behavior and filtering
- `callbackInfo`: Required for priority visual indicators
- `userRole`: Controls permissions and UI elements
- `crmDb`: Database reference for operations

## ⚠️ Critical Rules & Constraints

### 1. Date Handling
```typescript
// ✅ CORRECT: Local timezone
const date = new Date(dateString + 'T00:00:00');

// ❌ WRONG: UTC interpretation
const date = new Date(dateString);
```

### 2. Phone Number Formatting
```typescript
// Storage: Always as number in database
mobile: 9715807414

// Display: Always as string in frontend
phone: "9715807414"

// WhatsApp: Always prefixed with 91
whatsappPhone: "919715807414"
```

### 3. Permission Checks
```typescript
// ✅ ALWAYS check permissions before:
// - Editing lead data
// - Bulk operations
// - Status changes
// - Assignment changes

if (!canUserEditLead(lead)) {
  toast.error('Permission denied');
  return;
}
```

### 4. Callback Visual Indicators
```typescript
// ✅ ONLY apply on callback tab
if (activeTab === "callback" && lead.callbackInfo?.scheduled_dt) {
  const colors = getCallbackDateColor(new Date(lead.callbackInfo.scheduled_dt));
  // Apply visual indicators
}
```

### 5. Search Result Mapping
```typescript
// ✅ ALWAYS map database fields correctly
const mappedLead = {
  source_database: data.source,
  phone: String(data.mobile),
  synced_at: data.date ? new Date(data.date) : new Date(data.synced_date),
  date: data.date || data.synced_date || Date.now(),
};
```

## 🚀 Performance Considerations

### 1. Pagination
- **Page Size:** 50 leads per page
- **Infinite Scroll:** Automatic loading on scroll
- **Search Limit:** 1500 results maximum

### 2. Callback Info Fetching
- **Conditional:** Only fetch for leads with `status === "Callback"`
- **Parallel:** Use Promise.all for batch fetching
- **Caching:** Store in lead object after fetching

### 3. Debouncing
- **Search Input:** 500ms debounce
- **Filter Changes:** 300ms debounce

## 🧪 Testing Guidelines

### Essential Test Cases
1. **Tab Switching:** Verify callback visual indicators appear/disappear
2. **Permission Checks:** Test with different user roles
3. **Date Filtering:** Test timezone handling (critical)
4. **Search Functionality:** Test all search patterns
5. **Callback Priority:** Test color coding for different dates
6. **Modal Flows:** Test all modal interactions
7. **Bulk Operations:** Test permission validation

### Common Edge Cases
- Empty callback info
- Missing phone numbers for WhatsApp
- Unassigned leads
- Timezone edge cases (midnight boundaries)
- Large result sets (1000+ leads)

## 📄 File Structure

```
ama_leads/
├── page.tsx                     # Main page component
├── types.ts                     # TypeScript interfaces
├── AMA_LEADS_CONTEXT.md        # This documentation file
└── components/
    ├── AmaLeadsHeader.tsx       # Page header
    ├── AmaLeadsTabs.tsx         # Tab navigation
    ├── AmaLeadsFilters.tsx      # Search & filters
    ├── AmaLeadsTable.tsx        # Table container
    ├── AmaLeadRow.tsx           # Individual lead row
    ├── AmaStatusCell.tsx        # Status management
    ├── AmaSalespersonCell.tsx   # Assignment management
    ├── CustomDateInput.tsx      # Date picker component
    └── modals/
        ├── AmaHistoryModal.tsx
        ├── AmaStatusChangeConfirmationModal.tsx
        ├── AmaCallbackSchedulingModal.tsx
        ├── AmaLanguageBarrierModal.tsx
        └── AmaBulkWhatsAppModal.tsx
```

---
**Last Updated:** [Current Date]  
**Version:** 1.0  
**Maintainer:** Development Team 