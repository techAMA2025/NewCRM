import React from 'react';
import BillcutHistoryModal from './BillcutHistoryModal';
import BillcutLanguageBarrierModal from './BillcutLanguageBarrierModal';
import BillcutConversionConfirmationModal from './BillcutConversionConfirmationModal';
import BulkWhatsAppModal from './BulkWhatsAppModal';
import BulkAssignmentModal from './BulkAssignmentModal';
import { Lead, User } from '../types';

type BillcutModalsContainerProps = {
  // History Modal
  showHistoryModal: boolean;
  setShowHistoryModal: (show: boolean) => void;
  selectedHistoryLeadId: string | null;
  leads: Lead[];
  searchResults: Lead[];
  
  // Language Barrier Modal
  showLanguageBarrierModal: boolean;
  languageBarrierLeadId: string;
  languageBarrierLeadName: string;
  editingLanguageBarrierInfo: string;
  onLanguageBarrierClose: () => void;
  onLanguageBarrierConfirm: (language: string) => Promise<void>;
  
  // Conversion Modal
  showConversionModal: boolean;
  conversionLeadName: string;
  isConvertingLead: boolean;
  onConversionClose: () => void;
  onConversionConfirm: () => Promise<void>;
  
  // Bulk WhatsApp Modal
  showBulkWhatsAppModal: boolean;
  setShowBulkWhatsAppModal: (show: boolean) => void;
  selectedLeads: string[];
  onSendBulkWhatsApp: (templateName: string, leadIds: string[], leadData?: any[]) => Promise<void>;
  
  // Bulk Assignment Modal
  showBulkAssignment: boolean;
  userRole: string;
  teamMembers: User[];
  bulkAssignTarget: string;
  setBulkAssignTarget: (value: string) => void;
  onBulkAssignExecute: () => void;
  onBulkAssignCancel: () => void;
};

const BillcutModalsContainer = ({
  showHistoryModal,
  setShowHistoryModal,
  selectedHistoryLeadId,
  leads,
  searchResults,
  
  showLanguageBarrierModal,
  languageBarrierLeadId,
  languageBarrierLeadName,
  editingLanguageBarrierInfo,
  onLanguageBarrierClose,
  onLanguageBarrierConfirm,
  
  showConversionModal,
  conversionLeadName,
  isConvertingLead,
  onConversionClose,
  onConversionConfirm,
  
  showBulkWhatsAppModal,
  setShowBulkWhatsAppModal,
  selectedLeads,
  onSendBulkWhatsApp,
  
  showBulkAssignment,
  userRole,
  teamMembers,
  bulkAssignTarget,
  setBulkAssignTarget,
  onBulkAssignExecute,
  onBulkAssignCancel
}: BillcutModalsContainerProps) => {
  const currentLead = leads.find(l => l.id === selectedHistoryLeadId) || searchResults.find(l => l.id === selectedHistoryLeadId);

  return (
    <>
      <BillcutHistoryModal
        showHistoryModal={showHistoryModal}
        setShowHistoryModal={setShowHistoryModal}
        leadId={selectedHistoryLeadId}
        leadName={currentLead?.name}
      />

      <BillcutLanguageBarrierModal
        isOpen={showLanguageBarrierModal}
        onClose={onLanguageBarrierClose}
        onConfirm={onLanguageBarrierConfirm}
        leadId={languageBarrierLeadId}
        leadName={languageBarrierLeadName}
        existingLanguage={editingLanguageBarrierInfo}
      />

      <BillcutConversionConfirmationModal
        isOpen={showConversionModal}
        onClose={onConversionClose}
        onConfirm={onConversionConfirm}
        leadName={conversionLeadName}
        isLoading={isConvertingLead}
      />

      <BulkWhatsAppModal
        isOpen={showBulkWhatsAppModal}
        onClose={() => setShowBulkWhatsAppModal(false)}
        selectedLeads={leads.filter(lead => selectedLeads.includes(lead.id))}
        onSendBulkWhatsApp={onSendBulkWhatsApp}
      />

      {showBulkAssignment && (
        <BulkAssignmentModal
          userRole={userRole}
          selectedLeads={selectedLeads}
          leads={leads}
          teamMembers={teamMembers}
          bulkAssignTarget={bulkAssignTarget}
          setBulkAssignTarget={setBulkAssignTarget}
          onAssign={onBulkAssignExecute}
          onCancel={onBulkAssignCancel}
        />
      )}
    </>
  );
};

export default BillcutModalsContainer;
