// Color utility functions for consistent styling

export const getStatusColor = (status: string) => {
  switch(status) {
    case 'Interested': return 'bg-green-900 text-green-100 border-green-700';
    case 'Not Interested': return 'bg-red-900 text-red-100 border-red-700';
    case 'Not Answering': return 'bg-orange-900 text-orange-100 border-orange-700';
    case 'Callback': return 'bg-yellow-900 text-yellow-100 border-yellow-700';
    case 'Converted': return 'bg-emerald-900 text-emerald-100 border-emerald-700';
    case 'Loan Required': return 'bg-purple-900 text-purple-100 border-purple-700';
    case 'Cibil Issue': return 'bg-rose-900 text-rose-100 border-rose-700';
    case 'Closed Lead': return 'bg-gray-500 text-white border-gray-700';
    case 'Select Status': 
    default: return 'bg-gray-700 text-gray-200 border-gray-600';
  }
}

export const getFinancialColor = (type: string) => {
  switch(type) {
    case 'pl': return 'text-yellow-400 font-medium';
    case 'cc': return 'text-blue-400 font-medium';
    case 'income': return 'text-green-400 font-medium';
    default: return 'text-gray-300';
  }
}

export const getSalespersonBadge = (name: string) => {
  if (!name) return { initials: 'UN', color: 'bg-gray-800 text-gray-400 border-gray-700' };
  
  const nameParts = name.split(' ');
  const initials = nameParts.length > 1 
    ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
    : `${nameParts[0][0]}${nameParts[0][1] || ''}`.toUpperCase();
  
  // Vibrant colors for salesperson badges
  const colors = [
    'bg-gradient-to-br from-pink-800 to-pink-900 text-pink-100 border-pink-700',
    'bg-gradient-to-br from-purple-800 to-purple-900 text-purple-100 border-purple-700',
    'bg-gradient-to-br from-indigo-800 to-indigo-900 text-indigo-100 border-indigo-700',
    'bg-gradient-to-br from-blue-800 to-blue-900 text-blue-100 border-blue-700',
    'bg-gradient-to-br from-cyan-800 to-cyan-900 text-cyan-100 border-cyan-700',
    'bg-gradient-to-br from-teal-800 to-teal-900 text-teal-100 border-teal-700',
    'bg-gradient-to-br from-green-800 to-green-900 text-green-100 border-green-700',
    'bg-gradient-to-br from-lime-800 to-lime-900 text-lime-100 border-lime-700',
    'bg-gradient-to-br from-yellow-800 to-yellow-900 text-yellow-100 border-yellow-700',
    'bg-gradient-to-br from-amber-800 to-amber-900 text-amber-100 border-amber-700',
    'bg-gradient-to-br from-orange-800 to-orange-900 text-orange-100 border-orange-700',
    'bg-gradient-to-br from-red-800 to-red-900 text-red-100 border-red-700',
  ];
  
  const colorIndex = name.charCodeAt(0) % colors.length;
  return { initials, color: colors[colorIndex] };
} 