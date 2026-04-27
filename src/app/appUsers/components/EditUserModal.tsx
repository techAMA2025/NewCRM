'use client';

import { useState } from 'react';
import { AppUser } from '../types';

interface EditUserModalProps {
  user: AppUser;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, data: Partial<AppUser>) => Promise<void>;
}

export default function EditUserModal({ user, isOpen, onClose, onSave }: EditUserModalProps) {
  const [formData, setFormData] = useState<Partial<AppUser>>({
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    start_date: user.start_date,
    service_type: user.service_type || '',
    // otp: user.otp, // Removed
    // topic: user.topic, // Removed
  });
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(user.id, formData);
      onClose();
    } catch (error) {
      console.error('Failed to save user:', error);
      // Error handling could be improved here (e.g. show toast)
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-[1px]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden border border-gray-200">
        <div className="bg-[#F8F5EC] px-6 py-4 border-b border-[#5A4C33]/10 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-[#5A4C33]">Edit User</h3>
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
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
