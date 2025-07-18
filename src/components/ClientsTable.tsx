import { useState } from 'react'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Eye, Sun, Moon, Edit, Trash2, FileText } from 'lucide-react'
import { Client } from '@/app/clients/types'

// Helper function to format source display name and get color
const formatSourceName = (source: string): { name: string; color: string } => {
  if (!source) return { name: 'Manual Entry', color: 'text-gray-500' };
  const normalizedSource = source.replace(/\s*\d+\s*/g, '').trim().toLowerCase();
  switch (normalizedSource) {
    case 'credsettlee':
      return { name: 'Cred Settle', color: 'text-blue-500' };
    case 'ama':
      return { name: 'AMA', color: 'text-green-500' };
    case 'settleloans':
      return { name: 'Settle Loans', color: 'text-purple-500' };
    case 'billcut':
      return { name: 'Bill Cut', color: 'text-orange-500' };
    case 'manual':
      return { name: 'Manual Entry', color: 'text-gray-500' };
    default:
      return { name: source, color: 'text-gray-400' };
  }
};

interface ClientsTableProps {
  clients: Client[]
  onViewDetails: (client: Client) => void
  onEditClient: (client: Client) => void
  onDeleteClient: (client: Client) => void
  onAdvocateStatusChange: (clientId: string, newStatus: string) => void
  selectedClients: Set<string>
  onSelectAll: (checked: boolean) => void
  onSelectClient: (clientId: string, checked: boolean) => void
  theme?: 'light' | 'dark'
  onThemeChange?: (theme: 'light' | 'dark') => void
  openDocumentViewer: (documentUrl: string, documentName: string) => void
  onViewHistory: (clientId: string) => void
  remarks: { [key: string]: string }
  onRemarkChange: (clientId: string, value: string) => void
  onSaveRemark: (clientId: string) => void
  onAgreementToggle: (clientId: string, currentStatus: boolean) => void
  userRole?: string
}

export default function ClientsTable({
  clients,
  onViewDetails,
  onEditClient,
  onDeleteClient,
  onAdvocateStatusChange,
  selectedClients,
  onSelectAll,
  onSelectClient,
  theme = 'light',
  onThemeChange,
  openDocumentViewer,
  onViewHistory,
  remarks,
  onRemarkChange,
  onSaveRemark,
  onAgreementToggle,
  userRole
}: ClientsTableProps) {
  const isDark = theme === 'dark'

  const toggleTheme = () => {
    if (onThemeChange) {
      onThemeChange(isDark ? 'light' : 'dark')
    }
  }

  const formatStartDate = (dateString: string) => {

    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      
      return `${day}/${month}/${year}`;
    } catch (e) {
      return 'N/A';
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <div className={`text-[10px] ${isDark ? 'text-red-500' : 'text-red-500'}`}>
          {clients.length} clients
        </div>
        <Button
          onClick={toggleTheme}
          variant="outline"
          size="sm"
          className={`${
            isDark 
              ? 'border-gray-700 bg-gray-800 text-gray-200 hover:bg-gray-700' 
              : 'border-gray-300 bg-white text-gray-800 hover:bg-gray-50'
          } h-6 w-6 p-0`}
        >
          {isDark ? (
            <Sun className="h-3 w-3" />
          ) : (
            <Moon className="h-3 w-3" />
          )}
        </Button>
      </div>

      <div className={`rounded-md border overflow-hidden text-[10px] ${
        isDark 
          ? 'border-gray-700 bg-gray-900 text-gray-200' 
          : 'border-gray-300 bg-white text-gray-800'
      }`}>
        <Table>
          <TableHeader className={isDark ? 'bg-gray-800' : 'bg-gray-50'}>
            <TableRow className={isDark ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-300 hover:bg-gray-100'}>
              <TableHead className={`${isDark ? 'text-gray-400' : 'text-gray-600'} w-[24px] p-1`}>
                <input
                  type="checkbox"
                  className={`rounded ${
                    isDark 
                      ? 'border-gray-600 text-blue-400 focus:ring-blue-400 bg-gray-700' 
                      : 'border-gray-300 text-blue-500 focus:ring-blue-500 bg-white'
                  } h-2.5 w-2.5`}
                  checked={selectedClients.size === clients.length && clients.length > 0}
                  onChange={(e) => onSelectAll(e.target.checked)}
                  disabled={userRole === 'billcut'}
                />
              </TableHead>
              <TableHead className={`${isDark ? 'text-gray-400' : 'text-gray-600'} p-1`}>Start Date</TableHead>
              <TableHead className={`${isDark ? 'text-gray-400' : 'text-gray-600'} p-1`}>Name</TableHead>
              <TableHead className={`${isDark ? 'text-gray-400' : 'text-gray-600'} p-1`}>Phone</TableHead>
              <TableHead className={`${isDark ? 'text-gray-400' : 'text-gray-600'} p-1`}>City</TableHead>
              <TableHead className={`${isDark ? 'text-gray-400' : 'text-gray-600'} p-1`}>Advocate</TableHead>
              <TableHead className={`${isDark ? 'text-gray-400' : 'text-gray-600'} p-1`}>Status</TableHead>
              <TableHead className={`${isDark ? 'text-gray-400' : 'text-gray-600'} p-1`}>Agreement</TableHead>
              <TableHead className={`${isDark ? 'text-gray-400' : 'text-gray-600'} p-1`}>Remarks</TableHead>
              <TableHead className={`${isDark ? 'text-gray-400' : 'text-gray-600'} p-1`}>Sales By</TableHead>
              <TableHead className={`${isDark ? 'text-gray-400' : 'text-gray-600'} text-right p-1`}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map(client => (
              <TableRow 
                key={client.id} 
                className={isDark ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-300 hover:bg-gray-50'}
              >
                <TableCell className="p-1">
                  <input
                    type="checkbox"
                    className={`rounded ${
                      isDark 
                        ? 'border-gray-600 text-blue-400 focus:ring-blue-400 bg-gray-700' 
                        : 'border-gray-300 text-blue-500 focus:ring-blue-500 bg-white'
                    } h-2.5 w-2.5`}
                    checked={selectedClients.has(client.id)}
                    onChange={(e) => onSelectClient(client.id, e.target.checked)}
                    disabled={userRole === 'billcut'}
                  />
                </TableCell>
                <TableCell className="p-1 text-[10px]">{formatStartDate(client.startDate)}</TableCell>
                <TableCell className={`font-medium p-1 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                  <div className="flex flex-col">
                    <span className="font-medium text-[10px]">{client.name.toUpperCase()}</span>
                    <span className={`text-[8px] ${formatSourceName(client.source_database || '').color}`}>
                      {formatSourceName(client.source_database || '').name}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="p-1 text-[10px]">{client.phone}</TableCell>
                <TableCell className="p-1 text-[10px]">{client.city}</TableCell>
                <TableCell className="p-1">
                  <div className="flex flex-col">
                    <span className={`text-[10px] ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                      {client.alloc_adv || 'Unassigned'}
                    </span>
                    {client.alloc_adv_secondary && (
                      <span className={`text-[8px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Secondary: {client.alloc_adv_secondary}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="p-1">
                  <Select 
                    value={client.adv_status || 'Inactive'} 
                    onValueChange={(value) => onAdvocateStatusChange(client.id, value)}
                    disabled={userRole === 'billcut'}
                  >
                    <SelectTrigger className={`w-[75px] h-4 px-1 py-0 text-[8px] border ${
                      client.adv_status === 'Active' 
                        ? isDark
                          ? 'bg-green-900/50 text-green-400 border-green-700'
                          : 'bg-green-50 text-green-600 border-green-200'
                        : client.adv_status === 'Dropped'
                        ? isDark
                          ? 'bg-red-900/50 text-red-400 border-red-700'
                          : 'bg-red-50 text-red-600 border-red-200'
                        : client.adv_status === 'On Hold'
                        ? isDark
                          ? 'bg-purple-900/50 text-purple-400 border-purple-700'
                          : 'bg-purple-50 text-purple-600 border-purple-200'
                        : client.adv_status === 'Not Responding'
                        ? isDark
                          ? 'bg-yellow-900/50 text-yellow-400 border-yellow-700'
                          : 'bg-yellow-50 text-yellow-600 border-yellow-200'
                        : client.adv_status === 'Inactive'
                        ? isDark
                          ? 'bg-gray-900/50 text-gray-400 border-gray-700'
                          : 'bg-gray-50 text-gray-600 border-gray-200'
                        : isDark
                          ? 'bg-gray-900/50 text-gray-400 border-gray-700'
                          : 'bg-gray-50 text-gray-600 border-gray-200'
                    } ${userRole === 'billcut' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={isDark ? 'bg-gray-800 text-gray-200 border-gray-700' : 'bg-white text-gray-800 border-gray-300'}>
                      <SelectItem value="Active" className={isDark ? 'text-green-400' : 'text-green-600'}>Active</SelectItem>
                      <SelectItem value="Dropped" className={isDark ? 'text-red-400' : 'text-red-600'}>Dropped</SelectItem>
                      <SelectItem value="Not Responding" className={isDark ? 'text-yellow-400' : 'text-yellow-600'}>Not Responding</SelectItem>
                      <SelectItem value="On Hold" className={isDark ? 'text-purple-400' : 'text-purple-600'}>On Hold</SelectItem>
                      <SelectItem value="Inactive" className={isDark ? 'text-gray-400' : 'text-gray-600'}>Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="p-1">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id={`agreement-${client.id}`}
                      checked={Boolean(client.sentAgreement)}
                      onChange={() => onAgreementToggle(client.id, Boolean(client.sentAgreement))}
                      disabled={userRole === 'billcut'}
                      className={`rounded ${
                        isDark 
                          ? 'border-gray-600 text-blue-400 focus:ring-blue-400 bg-gray-700' 
                          : 'border-gray-300 text-blue-500 focus:ring-blue-500 bg-white'
                      } h-3 w-3 ${userRole === 'billcut' ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                    <label 
                      htmlFor={`agreement-${client.id}`} 
                      className={`ml-1 text-[8px] cursor-pointer ${
                        isDark ? 'text-gray-300' : 'text-gray-600'
                      } ${userRole === 'billcut' ? 'cursor-default' : ''}`}
                    >
                      Sent
                    </label>
                  </div>
                </TableCell>
                <TableCell className="p-1">
                  <div className="flex flex-col space-y-1.5">
                    <textarea
                      value={remarks[client.id] || ""}
                      onChange={(e) => onRemarkChange(client.id, e.target.value)}
                      placeholder="Enter remark..."
                      disabled={userRole === 'billcut'}
                      className={`w-full px-1.5 py-1 ${isDark ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-gray-100 border-gray-300 text-gray-800'} border rounded text-xs resize-none ${userRole === 'billcut' ? 'opacity-50 cursor-not-allowed' : ''}`}
                      rows={2}
                    />
                    {userRole !== 'billcut' && (
                      <div className="flex space-x-1.5">
                        <button
                          onClick={() => onSaveRemark(client.id)}
                          className={`px-2 py-0.5 text-xs rounded transition-colors duration-200 ${
                            isDark 
                              ? 'bg-green-700 hover:bg-green-600 text-white' 
                              : 'bg-green-600 hover:bg-green-500 text-white'
                          }`}
                        >
                          Save
                        </button>
                        <button
                          onClick={() => onViewHistory(client.id)}
                          className={`px-2 py-0.5 text-xs rounded transition-colors duration-200 ${
                            isDark 
                              ? 'bg-purple-700 hover:bg-purple-600 text-white' 
                              : 'bg-purple-600 hover:bg-purple-500 text-white'
                          }`}
                        >
                          History
                        </button>
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="p-1">
                  <span className={`text-[10px] ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {client.assignedTo || 'Unassigned'}
                  </span>
                </TableCell>
                <TableCell className="p-1">
                  <div className="flex items-center justify-end space-x-0.5">
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onViewDetails(client)}>
                      <Eye className="h-2.5 w-2.5" />
                    </Button>
                    {client.documentUrl && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 text-purple-500 hover:text-purple-600"
                        onClick={() => openDocumentViewer(client.documentUrl as string, client.documentName || 'Client Document')}
                      >
                        <FileText className="h-2.5 w-2.5" />
                      </Button>
                    )}
                    {userRole !== 'billcut' && (
                      <>
                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onEditClient(client)}>
                          <Edit className="h-2.5 w-2.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-5 w-5 text-red-500 hover:text-red-600" onClick={() => onDeleteClient(client)}>
                          <Trash2 className="h-2.5 w-2.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
} 