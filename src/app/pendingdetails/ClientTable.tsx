import React from 'react'
import { FaEnvelope, FaPhone, FaMapMarkerAlt } from 'react-icons/fa'
import { Lead } from './types/lead'
import ClientTableRow from './ClientTableRow'
import EmptyClientState from './EmptyClientState'

interface ClientTableProps {
  leads: Lead[]
  clientRecordExists: {[key: string]: boolean}
  onViewLead: (lead: Lead) => void
  onEditLead: (lead: Lead) => void
}

const ClientTable = ({ leads, clientRecordExists, onViewLead, onEditLead }: ClientTableProps) => {
  if (leads.length === 0) {
    return <EmptyClientState />
  }

  return (
    <div className="mt-6 bg-gray-900 shadow-2xl rounded-xl overflow-hidden border border-gray-700">
      <div className="overflow-x-auto">
        <table className="min-w-[1400px] divide-y divide-gray-700" role="table" aria-label="Qualified leads table">
          <thead className="bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider w-[5%]" scope="col">
                <span className="text-blue-400">Status</span>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider w-[10%]" scope="col">
                <span className="text-blue-400">Date</span>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider w-[12%]" scope="col">
                <span className="text-blue-400">Contact Information</span>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider w-[5%]" scope="col">
                <span className="text-blue-400">Location</span>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider w-[6%]" scope="col">
                <span className="text-blue-400">Source</span>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider w-[12%]" scope="col">
                <span className="text-blue-400">Financial Details</span>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider w-[8%]" scope="col">
                <span className="text-blue-400">Action</span>
              </th>
            </tr>
          </thead>
          
          <tbody className="bg-gray-900 divide-y divide-gray-800">
            {leads.map(lead => (
              <ClientTableRow 
                key={lead.id}
                lead={lead}
                hasClientRecord={lead.id ? clientRecordExists[lead.id] : false}
                onView={() => onViewLead(lead)}
                onEdit={() => onEditLead(lead)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ClientTable