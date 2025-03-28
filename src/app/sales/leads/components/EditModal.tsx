import { getStatusColor, getFinancialColor } from './utils/colorUtils';

type EditModalProps = {
  editingLead: any;
  setEditingLead: (lead: any) => void;
  updateLead: (id: string, data: any) => Promise<boolean>;
  teamMembers: any[];
  statusOptions: string[];
};

const EditModal = ({ 
  editingLead, 
  setEditingLead, 
  updateLead, 
  teamMembers, 
  statusOptions 
}: EditModalProps) => {
  if (!editingLead) return null;
  
  return (
    <div className="fixed inset-0 z-10 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="edit-lead-title">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        
        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full sm:p-6">
          <div className="absolute top-0 right-0 pt-4 pr-4">
            <button
              type="button"
              onClick={() => setEditingLead(null)}
              className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Close modal"
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <h3 className="text-xl font-medium text-gray-900 mb-6 flex items-center" id="edit-lead-title">
            <span className={`inline-flex items-center justify-center h-8 w-8 rounded-full mr-3 ${getStatusColor(editingLead.status || 'Select Status')}`}>
              {(editingLead.status || 'Select Status').charAt(0)}
            </span>
            Edit Lead: {editingLead.name}
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
            <div>
              <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700">Name</label>
              <input
                id="edit-name"
                type="text"
                value={editingLead.name}
                onChange={(e) => setEditingLead({...editingLead, name: e.target.value})}
                className="mt-1 focus:ring-blue-600 focus:border-blue-600 block w-full shadow-sm sm:text-sm md:text-base border-gray-300 rounded-md"
              />
            </div>
            
            <div>
              <label htmlFor="edit-email" className="block text-sm font-medium text-gray-700">Email</label>
              <input
                id="edit-email"
                type="email"
                value={editingLead.email}
                onChange={(e) => setEditingLead({...editingLead, email: e.target.value})}
                className="mt-1 focus:ring-blue-600 focus:border-blue-600 block w-full shadow-sm sm:text-sm md:text-base border-gray-300 rounded-md"
              />
            </div>
            
            <div>
              <label htmlFor="edit-phone" className="block text-sm font-medium text-gray-700">Phone</label>
              <input
                id="edit-phone"
                type="text"
                value={editingLead.phone}
                onChange={(e) => setEditingLead({...editingLead, phone: e.target.value})}
                className="mt-1 focus:ring-blue-600 focus:border-blue-600 block w-full shadow-sm sm:text-sm md:text-base border-gray-300 rounded-md"
              />
            </div>
            
            <div>
              <label htmlFor="edit-status" className="block text-sm font-medium text-gray-700">Status</label>
              <select
                id="edit-status"
                value={editingLead.status || 'Select Status'}
                onChange={(e) => setEditingLead({...editingLead, status: e.target.value})}
                className={`mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-600 focus:border-blue-600 sm:text-sm md:text-base ${getStatusColor(editingLead.status || 'Select Status')}`}
              >
                {statusOptions.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="edit-assigned" className="block text-sm font-medium text-gray-700">Assign To</label>
              <div className="mt-1 relative">
                <select
                  id="edit-assigned"
                  value={editingLead.assignedTo}
                  onChange={(e) => setEditingLead({...editingLead, assignedTo: e.target.value})}
                  className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-600 focus:border-blue-600 sm:text-sm md:text-base"
                >
                  <option value="">Unassigned</option>
                  {teamMembers.map(member => (
                    <option key={member.id} value={member.name}>{member.name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Financial Details</label>
              <div className="mt-2 grid grid-cols-3 gap-4">
                <div className="bg-white p-3 rounded-lg border border-gray-200">
                  <label className="block text-sm font-medium text-gray-500">Personal Loan</label>
                  <div className={`mt-1 text-base ${getFinancialColor('pl')}`}>
                    {editingLead.personalLoanDues || editingLead['Total personal loan amount'] || 'N/A'}
                  </div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-200">
                  <label className="block text-sm font-medium text-gray-500">Credit Card</label>
                  <div className={`mt-1 text-base ${getFinancialColor('cc')}`}>
                    {editingLead.creditCardDues || editingLead['Total credit card dues'] || 'N/A'}
                  </div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-200">
                  <label className="block text-sm font-medium text-gray-500">Monthly Income</label>
                  <div className={`mt-1 text-base ${getFinancialColor('income')}`}>
                    {typeof editingLead.monthlyIncome === 'number' ? 
                      `₹${editingLead.monthlyIncome.toLocaleString('en-IN')}` : 
                      editingLead.monthlyIncome || editingLead['Monthly income'] || 'N/A'}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Original Customer Query</label>
              <div className="mt-2 bg-gray-50 border border-gray-200 rounded-md p-4 text-base text-gray-700 max-h-32 overflow-y-auto">
                {editingLead.remarks || editingLead.message || editingLead.queries || editingLead.Queries || 'No customer query'}
              </div>
            </div>
            
            <div className="sm:col-span-2">
              <label htmlFor="edit-sales-notes" className="block text-sm font-medium text-gray-700">Sales Notes</label>
              <textarea
                id="edit-sales-notes"
                value={editingLead.salesNotes || ''}
                onChange={(e) => setEditingLead({...editingLead, salesNotes: e.target.value})}
                rows={4}
                className="mt-1 focus:ring-blue-600 focus:border-blue-600 block w-full shadow-sm sm:text-sm md:text-base border-gray-300 rounded-md"
                placeholder="Enter your notes about this lead..."
              ></textarea>
            </div>
          </div>
          
          <div className="mt-8 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-4">
            <button
              type="button"
              onClick={() => setEditingLead(null)}
              className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-3 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm md:text-base transition-colors duration-150"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => updateLead(editingLead.id, {
                name: editingLead.name,
                email: editingLead.email,
                phone: editingLead.phone,
                status: editingLead.status,
                assignedTo: editingLead.assignedTo,
                salesNotes: editingLead.salesNotes
              })}
              className="mt-3 sm:mt-0 w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-3 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm md:text-base transition-colors duration-150"
            >
              Save All Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditModal; 