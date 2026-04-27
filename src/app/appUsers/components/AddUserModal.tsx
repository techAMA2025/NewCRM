'use client';

import { useState } from 'react';
import { AppUser } from '../types';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: Omit<AppUser, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
}

export default function AddUserModal({ isOpen, onClose, onAdd }: AddUserModalProps) {
  const [formData, setFormData] = useState<Partial<AppUser>>({
    name: '',
    email: '',
    phone: '',
    role: 'user',
    status: 'active',
    start_date: new Date().toISOString().split('T')[0], // Default to today
    otp: '',
    topic: 'all_users',
    service_type: ''
  });
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
        const newData = { ...prev, [name]: value };
        
        if (name === 'role') {
            if (value === 'user') newData.topic = 'all_users';
            else if (value === 'client') newData.topic = 'all_clients';
            else if (value === 'advocate') newData.topic = 'all_advocates';
        }
        
        return newData;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Filter out empty strings for optional fields so they are stored as undefined/null (or not stored)
      const dataToSend = { ...formData };

      // Ensure phone number starts with 91
      if (dataToSend.phone && !dataToSend.phone.startsWith('91')) {
        dataToSend.phone = `91${dataToSend.phone}`;
      }

      // We want otp to be stored as an empty string, so we don't delete it
      if (dataToSend.topic === '') delete dataToSend.topic;

      // Cast to the required type since we are sure these fields are populated or optional
      await onAdd(dataToSend as Omit<AppUser, 'id' | 'created_at' | 'updated_at'>);
      onClose();
      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        role: 'user',
        status: 'active',
        start_date: new Date().toISOString().split('T')[0],
        otp: '',
        topic: 'all_users',
        service_type: ''
      });
    } catch (error) {
      console.error('Failed to add user:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-[1px]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden border border-gray-200">
        <div className="bg-[#F8F5EC] px-6 py-4 border-b border-[#5A4C33]/10 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-[#5A4C33]">Add New User</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            &times;
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              name="name"
              required
              value={formData.name || ''}
              onChange={handleChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-[#D2A02A] focus:border-[#D2A02A] sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              name="email"
              required
              value={formData.email || ''}
              onChange={handleChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-[#D2A02A] focus:border-[#D2A02A] sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="text"
              name="phone"
              required
              value={formData.phone || ''}
              onChange={handleChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-[#D2A02A] focus:border-[#D2A02A] sm:text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                name="role"
                value={formData.role || ''}
                onChange={handleChange}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-[#D2A02A] focus:border-[#D2A02A] sm:text-sm"
              >
                <option value="admin">admin</option>
                <option value="advocate">advocate</option>
                <option value="client">client</option>
                <option value="user">user</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                name="status"
                value={formData.status || ''}
                onChange={handleChange}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-[#D2A02A] focus:border-[#D2A02A] sm:text-sm"
              >
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date (YYYY-MM-DD)</label>
            <input
              type="text"
              name="start_date"
              value={formData.start_date || ''}
              onChange={handleChange}
              placeholder="YYYY-MM-DD"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-[#D2A02A] focus:border-[#D2A02A] sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Topic (Optional)</label>
            <input
              type="text"
              name="topic"
              value={formData.topic || ''}
              onChange={handleChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-[#D2A02A] focus:border-[#D2A02A] sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Service type</label>
            <select
              name="service_type"
              value={formData.service_type || ''}
              onChange={handleChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-[#D2A02A] focus:border-[#D2A02A] sm:text-sm"
            >
              <option value="">Select Service Type</option>
              <option value="Banking and Finance">Banking and Finance</option>
              <option value="Loan Settlement">Loan Settlement</option>
              <option value="Intellectual Property Rights">Intellectual Property Rights</option>
              <option value="Entertainment Law">Entertainment Law</option>
              <option value="Real Estate">Real Estate</option>
              <option value="Criminal Law">Criminal Law</option>
              <option value="Corporate Law">Corporate Law</option>
              <option value="Arbitration Law">Arbitration Law</option>
              <option value="IT and Cyber Law">IT and Cyber Law</option>
              <option value="Civil Law">Civil Law</option>
              <option value="Drafting">Drafting</option>
              <option value="Litigation">Litigation</option>
            </select>
          </div>

          <div className="flex justify-end pt-4 space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D2A02A]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-[#D2A02A] border border-transparent rounded-md hover:bg-[#B8911E] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D2A02A] disabled:opacity-50"
            >
              {saving ? 'Adding...' : 'Add User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
