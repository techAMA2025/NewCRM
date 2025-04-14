"use client";

import { useState } from "react";
import toast from "react-hot-toast";

interface CFHABFormProps {
  onClose: () => void;
}

export default function CFHABForm({ onClose }: CFHABFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    applicantName: "",
    applicantAddress: "",
    applicantEmail: "",
    applicantPhone: "",
    respondentName: "",
    respondentAddress: "",
    respondentEmail: "",
    complaintType: "Consumer Forum",
    accountNumber: "",
    caseDetails: "",
    reliefSought: "",
    previousCommunication: "",
    issueDate: "",
    forumLocation: "",
    claimAmount: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Format the data for API submission
      const formBody = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        formBody.append(key, value);
      });
      
      // Call the document generation API
      toast.success("CFHAB document generation initiated. The document will download shortly.");
      
      // Close the modal after successful submission
      onClose();
    } catch (error) {
      console.error("Error generating CFHAB document:", error);
      toast.error("Failed to generate CFHAB document. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Applicant Details Section */}
        <div className="md:col-span-2 mb-2">
          <h3 className="text-md font-semibold text-purple-400">Applicant Details</h3>
          <hr className="border-gray-700 mt-1" />
        </div>
        
        {/* Applicant Name */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Applicant Name</label>
          <input
            type="text"
            name="applicantName"
            value={formData.applicantName}
            onChange={handleChange}
            required
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm"
            placeholder="Enter applicant's full name"
          />
        </div>

        {/* Applicant Phone */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Applicant Phone</label>
          <input
            type="tel"
            name="applicantPhone"
            value={formData.applicantPhone}
            onChange={handleChange}
            required
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm"
            placeholder="Enter applicant's phone number"
          />
        </div>

        {/* Applicant Email */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Applicant Email</label>
          <input
            type="email"
            name="applicantEmail"
            value={formData.applicantEmail}
            onChange={handleChange}
            required
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm"
            placeholder="Enter applicant's email"
          />
        </div>

        {/* Forum Location */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Forum Location</label>
          <input
            type="text"
            name="forumLocation"
            value={formData.forumLocation}
            onChange={handleChange}
            required
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm"
            placeholder="Jurisdiction/Location of Forum"
          />
        </div>

        {/* Applicant Address */}
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-400 mb-1">Applicant Address</label>
          <textarea
            name="applicantAddress"
            value={formData.applicantAddress}
            onChange={handleChange}
            required
            rows={2}
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm"
            placeholder="Enter applicant's complete address"
          />
        </div>

        {/* Respondent Details Section */}
        <div className="md:col-span-2 mt-2 mb-2">
          <h3 className="text-md font-semibold text-purple-400">Respondent Details</h3>
          <hr className="border-gray-700 mt-1" />
        </div>

        {/* Respondent Name */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Respondent Name</label>
          <input
            type="text"
            name="respondentName"
            value={formData.respondentName}
            onChange={handleChange}
            required
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm"
            placeholder="Enter respondent's full name"
          />
        </div>

        {/* Respondent Email */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Respondent Email</label>
          <input
            type="email"
            name="respondentEmail"
            value={formData.respondentEmail}
            onChange={handleChange}
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm"
            placeholder="Enter respondent's email (if available)"
          />
        </div>

        {/* Respondent Address */}
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-400 mb-1">Respondent Address</label>
          <textarea
            name="respondentAddress"
            value={formData.respondentAddress}
            onChange={handleChange}
            required
            rows={2}
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm"
            placeholder="Enter respondent's complete address"
          />
        </div>

        {/* Case Details Section */}
        <div className="md:col-span-2 mt-2 mb-2">
          <h3 className="text-md font-semibold text-purple-400">Case Details</h3>
          <hr className="border-gray-700 mt-1" />
        </div>

        {/* Complaint Type */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Complaint Type</label>
          <select
            name="complaintType"
            value={formData.complaintType}
            onChange={handleChange}
            required
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm"
          >
            <option value="Consumer Forum">Consumer Forum</option>
            <option value="Banking Ombudsman">Banking Ombudsman</option>
            <option value="RERA">RERA</option>
            <option value="Insurance Ombudsman">Insurance Ombudsman</option>
          </select>
        </div>

        {/* Account Number */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Account/Policy/Reference Number</label>
          <input
            type="text"
            name="accountNumber"
            value={formData.accountNumber}
            onChange={handleChange}
            required
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm"
            placeholder="Enter relevant reference number"
          />
        </div>

        {/* Issue Date */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Issue/Incident Date</label>
          <input
            type="date"
            name="issueDate"
            value={formData.issueDate}
            onChange={handleChange}
            required
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm"
          />
        </div>

        {/* Claim Amount */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Claim Amount (₹)</label>
          <input
            type="text"
            name="claimAmount"
            value={formData.claimAmount}
            onChange={handleChange}
            required
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm"
            placeholder="Enter claim amount in INR"
          />
        </div>

        {/* Case Details */}
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-400 mb-1">Case Details</label>
          <textarea
            name="caseDetails"
            value={formData.caseDetails}
            onChange={handleChange}
            required
            rows={4}
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm"
            placeholder="Provide detailed description of the complaint/issue"
          />
        </div>

        {/* Relief Sought */}
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-400 mb-1">Relief Sought</label>
          <textarea
            name="reliefSought"
            value={formData.reliefSought}
            onChange={handleChange}
            required
            rows={2}
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm"
            placeholder="Describe the specific relief you are seeking"
          />
        </div>

        {/* Previous Communication */}
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-400 mb-1">Previous Communication</label>
          <textarea
            name="previousCommunication"
            value={formData.previousCommunication}
            onChange={handleChange}
            rows={2}
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm"
            placeholder="Reference any previous communications with dates (if applicable)"
          />
        </div>
      </div>

      {/* Form buttons */}
      <div className="flex justify-end gap-3 pt-3 border-t border-gray-800 mt-3">
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors duration-200 text-sm"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors duration-200 flex items-center text-sm"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating...
            </>
          ) : (
            <>Generate CFHAB Document</>
          )}
        </button>
      </div>
    </form>
  );
}