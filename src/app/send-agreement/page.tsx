"use client";

import { useState, useEffect, useRef, ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import AdvocateSidebar from "@/components/navigation/AdvocateSidebar";
import SalesSidebar from "@/components/navigation/SalesSidebar";
import {
  FaEnvelope,
  FaPaperPlane,
  FaFileAlt,
  FaUser,
  FaPaperclip,
  FaTimes,
  FaFile,
  FaPlus,
  FaUserPlus,
  FaEdit,
  FaCheck,
  FaEnvelopeOpen,
  FaPen,
  FaHistory,
  FaFileContract,
  FaHandshake,
} from "react-icons/fa";
import { Toaster, toast } from "react-hot-toast";
// Firebase imports
import { httpsCallable } from "firebase/functions";
import { functions, auth, db } from "@/firebase/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import OverlordSidebar from "@/components/navigation/OverlordSidebar";

// Define interfaces for types
interface Attachment {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
}

interface Recipient {
  id: string;
  clientId?: string;
  name: string;
  email: string;
  type: "client" | "manual";
  editing?: boolean;
}

// Client interface based on Firestore structure
interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  leadId?: string;
  aadharNumber?: string;
  adv_status?: string;
  alloc_adv?: string;
  alloc_adv_secondary?: string;
  assignedTo?: string;
  banks?: any[];
  city?: string;
  convertedAt?: any;
  convertedFromLead?: boolean;
  creditCardDues?: string;
  lastModified?: any;
  monthlyFees?: string;
  monthlyIncome?: string;
  occupation?: string;
  panNumber?: string;
  personalLoanDues?: string;
  remarks?: string;
  source_database?: string;
  status?: string;
  tenure?: string;
}

export default function SendAgreementPage() {
  // States for form elements
  const [selectedAgreement, setSelectedAgreement] = useState("agreement-draft");
  const [selectedSubject, setSelectedSubject] = useState("agreement-draft-subject");
  const [customSubject, setCustomSubject] = useState("");
  const [isCustomSubject, setIsCustomSubject] = useState(false);
  const [editingSubject, setEditingSubject] = useState(false);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [ccRecipients, setCcRecipients] = useState<Recipient[]>([]);
  const [tempClientId, setTempClientId] = useState("");
  const [emailContent, setEmailContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State for clients from Firestore
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);

  // States for manual recipient addition
  const [manualRecipientName, setManualRecipientName] = useState("");
  const [manualRecipientEmail, setManualRecipientEmail] = useState("");
  const [manualCcRecipientName, setManualCcRecipientName] = useState("");
  const [manualCcRecipientEmail, setManualCcRecipientEmail] = useState("");

  // State for client search
  const [clientSearchTerm, setClientSearchTerm] = useState("");

  // State for part-payment amounts
  const [amountReceived, setAmountReceived] = useState("");
  const [totalSignupAmount, setTotalSignupAmount] = useState("");

  // Multiple agreement templates
  const agreementTemplates = {
    "agreement-draft": {
      id: "agreement-draft",
      name: "Agreement Draft",
      content: "Dear [CLIENT_NAME],\n\nWe are pleased to attach the consultancy agreement. This agreement outlines the terms and conditions governing our consultancy services, and it is legally binding upon both parties.\n\nPlease be informed that, under this agreement, both parties are expected to adhere to the commitments specified therein. Any breach of the terms could lead to legal consequences as per applicable law, ensuring the protection and enforcement of both parties' rights and responsibilities.\n\nTo proceed, kindly review the agreement carefully and confirm your acknowledgment of its terms by replying to this email. Should you have any questions, please feel free to reach out for clarification.\n\nThank you for your attention to this matter.",
      subject: "Consultancy Agreement - AMA LEGAL SOLUTIONS"
    },
    "billcut-signup": {
      id: "billcut-signup",
      name: "BILLCUT Sign Up",
      content: `Dear Client,

Thank you for choosing our Loan Settlement Program! We are pleased to confirm the receipt of your sign-up fee Rs.XXXX and are excited to assist you in your journey toward financial freedom.

Our program includes the following key services designed to provide you with end-to-end support:

1. 🔒 Anti-Harassment Services:
   • We will file complaints to shield you from recovery agent harassment and unlawful practices.
   • We will provide call-forwarding services to protect your privacy and peace of mind.

2. ⚖️ Lawyer Support:
   • Our legal team will handle responses to all legal notices on your behalf.
   • We will also file necessary complaints.
   • We offer mediation and conciliation services for non-court cases.

3. 💼 Loan Settlement:
   • We will assist you in negotiating and settling your outstanding loans.
   • Our goal is to achieve a settlement at around 50% of your total dues.

To formalize our services, we will share with you an Agreement/Memorandum of Understanding (MOU) detailing all relevant terms and conditions.

Please note:
1. The sign-up fee is non-refundable, as it covers administrative, legal, and operational efforts required to initiate your case.
2. By proceeding, the client acknowledges and agrees to fulfill the complete sign-up amount as discussed during onboarding and consultation.
3. A success fee of 15% of your current outstanding amount will be applicable only upon successful settlement of each loan.

Our team is committed to delivering a smooth and stress-free experience. Should you need any clarification, feel free to connect with us.`,
      subject: "Sign-Up Confirmed - Welcome to Our Loan Settlement Program"
    },
    "ama-legal-signup": {
      id: "ama-legal-signup",
      name: "AMA Legal Solutions Sign Up",
      content: `Dear Client,

Thank you for choosing our Loan Settlement Program! We are pleased to confirm the receipt of your sign-up fee Rs.XXXX and are excited to assist you in your journey toward financial freedom.

Our program includes the following key services designed to provide you with end-to-end support:

1. 🔒 Anti-Harassment Services:
   • We will file complaints to shield you from recovery agent harassment and unlawful practices.
   • We will provide call-forwarding services to protect your privacy and peace of mind.

2. ⚖️ Lawyer Support:
   • Our legal team will handle responses to all legal notices on your behalf.
   • We will also file necessary complaints.
   • We offer mediation and conciliation services for non-court cases.

3. 💼 Loan Settlement:
   • We will assist you in negotiating and settling your outstanding loans.
   • Our goal is to achieve a settlement at around 50% of your total dues.

To formalize our services, we will share with you an Agreement/Memorandum of Understanding (MOU) detailing all relevant terms and conditions.

Please note:
1. The sign-up fee is non-refundable, as it covers administrative, legal, and operational efforts required to initiate your case.
2. By proceeding, the client acknowledges and agrees to fulfill the complete sign-up amount as discussed during onboarding and consultation.
3. A success fee of 15% of your current outstanding amount will be applicable only upon successful settlement of each loan.

Our team is committed to delivering a smooth and stress-free experience. Should you need any clarification, feel free to connect with us.`,
      subject: "Sign-Up Confirmed - Welcome to Our Loan Settlement Program"
    },
    "part-payment-billcut": {
      id: "part-payment-billcut",
      name: "Part-payment BILLCUT",
      content: `Dear Client,

Thank you for choosing our Loan Settlement Program! We are pleased to confirm the receipt of your sign-up fee of Rs. [AMOUNT_RECEIVED]. We are excited to assist you in your journey toward financial freedom.

Please note that your total sign-up amount is Rs. [TOTAL_SIGNUP_AMOUNT], out of which Rs. [AMOUNT_RECEIVED] has been received as of today.

Our program includes the following key services designed to provide you with end-to-end support:

1. 🔒 Anti-Harassment Services:
   • We will file complaints to shield you from recovery agent harassment and unlawful practices.
   • We will provide call-forwarding services to protect your privacy and peace of mind.

2. ⚖️ Lawyer Support:
   • Our legal team will handle responses to all legal notices on your behalf.
   • We will also file necessary complaints.
   • We offer mediation and conciliation services for non-court cases.

3. 💼 Loan Settlement:
   • We will assist you in negotiating and settling your outstanding loans.
   • Our goal is to achieve a settlement at around 50% of your total dues.

To formalize our services, we will soon share with you an Agreement/Memorandum of Understanding (MOU) outlining all relevant terms and conditions.

Please note:
1. The sign-up fee is non-refundable, as it covers administrative, legal, and operational efforts required to initiate your case.
2. By proceeding, the client acknowledges and agrees to fulfill the complete sign-up amount as discussed during onboarding and consultation.


Our team is committed to delivering a smooth and stress-free experience. Should you need any clarification, feel free to connect with us.`,
      subject: "Sign-Up Confirmed - Welcome to Our Loan Settlement Program"
    }
  };

  // Get current template
  const getCurrentTemplate = () => {
    return agreementTemplates[selectedAgreement as keyof typeof agreementTemplates] || agreementTemplates["agreement-draft"];
  };

  // Process email content to replace placeholders
  const processEmailContent = (content: string) => {
    let processedContent = content;
    
    // Replace client placeholders
    const clientRecipients = recipients.filter(r => r.type === "client");
    const clientCcRecipients = ccRecipients.filter(r => r.type === "client");
    const firstClientRecipient = clientRecipients[0] || clientCcRecipients[0];
    
    if (firstClientRecipient) {
      processedContent = processedContent
        .replace(/\[CLIENT_NAME\]/g, firstClientRecipient.name || '[Client Name]')
        .replace(/\[CLIENT_EMAIL\]/g, firstClientRecipient.email || '[Client Email]');
    }
    
    // Replace amount placeholders for part-payment template
    if (selectedAgreement === "part-payment-billcut") {
      processedContent = processedContent
        .replace(/\[AMOUNT_RECEIVED\]/g, amountReceived || '[Amount Received]')
        .replace(/\[TOTAL_SIGNUP_AMOUNT\]/g, totalSignupAmount || '[Total Signup Amount]');
    }
    
    return processedContent;
  };

  // Single agreement template (for backward compatibility)
  const agreementTemplate = getCurrentTemplate();

  const subjectTemplate = {
    id: `${selectedAgreement}-subject`,
    text: getCurrentTemplate().subject
  };

  // Filter clients based on search term
  const filteredClients = clients.filter(client => {
    if (!clientSearchTerm.trim()) return true;
    
    const searchLower = clientSearchTerm.toLowerCase();
    return (
      client.name?.toLowerCase().includes(searchLower) ||
      client.email?.toLowerCase().includes(searchLower)
    );
  });

  // Fetch clients from Firestore
  useEffect(() => {
    async function fetchClients() {
      setLoadingClients(true);
      try {
        const clientsRef = collection(db, "clients");
        const clientQuery = query(clientsRef);
        const snapshot = await getDocs(clientQuery);

        const clientsList: Client[] = [];

        snapshot.forEach((doc) => {
          const clientData = doc.data();
          if (clientData.name && clientData.email) {
            clientsList.push({
              id: doc.id,
              name: clientData.name || "",
              email: clientData.email || "",
              ...clientData,
            } as Client);
          }
        });

        setClients(clientsList);
      } catch (error) {
        console.error("Error fetching clients:", error);
        toast.error("Failed to load clients");
      } finally {
        setLoadingClients(false);
      }
    }

    fetchClients();
  }, []);

  const router = useRouter();

  // Update email content when a client is selected
  useEffect(() => {
    const selectedClient = clients.find(c => c.id === tempClientId);
    
    let content = getCurrentTemplate().content;
    if (selectedClient) {
      content = content
        .replace(/\[CLIENT_NAME\]/g, selectedClient.name || '[Client Name]')
        .replace(/\[CLIENT_EMAIL\]/g, selectedClient.email || '[Client Email]');
    }
    
    // Process content with all placeholders
    const processedContent = processEmailContent(content);
    setEmailContent(processedContent);

    // Set subject
    let subjectText = getCurrentTemplate().subject;
    if (selectedClient) {
      subjectText = subjectText.replace(/\[CLIENT_NAME\]/g, selectedClient.name || '[Client Name]');
    }
    setCustomSubject(subjectText);
  }, [tempClientId, clients, selectedAgreement, amountReceived, totalSignupAmount]);

  // Update email content and subject when client recipients change
  useEffect(() => {
    const clientRecipients = recipients.filter(r => r.type === "client");
    const clientCcRecipients = ccRecipients.filter(r => r.type === "client");
    
    // Use the first client recipient (either in To or CC)
    const firstClientRecipient = clientRecipients[0] || clientCcRecipients[0];
    
    if (firstClientRecipient) {
      // Update email content
      let content = getCurrentTemplate().content;
      content = content
        .replace(/\[CLIENT_NAME\]/g, firstClientRecipient.name || '[Client Name]')
        .replace(/\[CLIENT_EMAIL\]/g, firstClientRecipient.email || '[Client Email]');
      
      // Process content with all placeholders
      const processedContent = processEmailContent(content);
      setEmailContent(processedContent);

      // Update subject
      let subjectText = getCurrentTemplate().subject;
      subjectText = subjectText.replace(/\[CLIENT_NAME\]/g, firstClientRecipient.name || '[Client Name]');
      setCustomSubject(subjectText);
      setIsCustomSubject(true);
      setSelectedSubject("custom");
    } else {
      // No client recipients, reset to template
      const processedContent = processEmailContent(getCurrentTemplate().content);
      setEmailContent(processedContent);
      setCustomSubject(getCurrentTemplate().subject);
      setIsCustomSubject(false);
      setSelectedSubject(`${selectedAgreement}-subject`);
    }
  }, [recipients, ccRecipients, selectedAgreement, amountReceived, totalSignupAmount]);

  // Handle subject selection
  const handleSubjectChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedSubject(value);

    if (value === "custom") {
      setIsCustomSubject(true);
      setCustomSubject("");
    } else {
      setIsCustomSubject(false);
      setCustomSubject(getCurrentTemplate().subject);
    }
  };

  // Toggle subject editing mode
  const toggleSubjectEdit = () => {
    if (!editingSubject) {
      const subjectText = isCustomSubject ? customSubject : getCurrentTemplate().subject;
      setCustomSubject(subjectText);
    }

    setEditingSubject(!editingSubject);
    if (!editingSubject) {
      setIsCustomSubject(true);
      setSelectedSubject("custom");
    }
  };

  // Save edited subject
  const saveEditedSubject = () => {
    if (!customSubject.trim()) {
      toast.error("Subject cannot be empty");
      return;
    }

    setEditingSubject(false);
  };

  // Function to get current subject text for display
  const getCurrentSubjectText = () => {
    if (isCustomSubject) {
      return customSubject;
    }

    return getCurrentTemplate().subject;
  };

  // Handle client selection
  const handleClientChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setTempClientId(e.target.value);
  };

  // Handle template selection
  const handleTemplateChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const newTemplateId = e.target.value;
    setSelectedAgreement(newTemplateId);
    
    // Update email content with new template
    const newTemplate = agreementTemplates[newTemplateId as keyof typeof agreementTemplates];
    if (newTemplate) {
      setEmailContent(newTemplate.content);
      setCustomSubject(newTemplate.subject);
      setIsCustomSubject(false);
      setSelectedSubject(`${newTemplateId}-subject`);
      
      // Initialize amount fields for part-payment template
      if (newTemplateId === "part-payment-billcut") {
        setAmountReceived("");
        setTotalSignupAmount("");
      }
    }
  };

  // Function to add a client as recipient
  const handleAddClientRecipient = () => {
    if (!tempClientId) {
      toast.error("Please select a client");
      return;
    }

    const client = clients.find((c) => c.id === tempClientId);
    if (!client) {
      toast.error("Invalid client selected");
      return;
    }

    const alreadyAdded = recipients.some((r) => r.email === client.email);
    if (alreadyAdded) {
      toast.error("This client is already added as a recipient");
      return;
    }

    if (!client.email || !/\S+@\S+\.\S+/.test(client.email)) {
      toast.error(`${client.name} does not have a valid email address`);
      return;
    }

    setRecipients([
      ...recipients,
      {
        id: `client-${Date.now()}`,
        clientId: client.id,
        name: client.name,
        email: client.email,
        type: "client",
      },
    ]);

    // Update email content and subject with client name
    let content = getCurrentTemplate().content;
    content = content
      .replace(/\[CLIENT_NAME\]/g, client.name || '[Client Name]')
      .replace(/\[CLIENT_EMAIL\]/g, client.email || '[Client Email]');
    setEmailContent(content);

    // Update subject with client name
    let subjectText = getCurrentTemplate().subject;
    subjectText = subjectText.replace(/\[CLIENT_NAME\]/g, client.name || '[Client Name]');
    setCustomSubject(subjectText);
    setIsCustomSubject(true);
    setSelectedSubject("custom");

    setTempClientId("");
    toast.success(`${client.name} added as recipient`);
  };

  // Function to add a manual recipient
  const handleAddManualRecipient = () => {
    if (!manualRecipientEmail || !/\S+@\S+\.\S+/.test(manualRecipientEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (recipients.some((r) => r.email === manualRecipientEmail)) {
      toast.error("This email is already added as a recipient");
      return;
    }

    setRecipients([
      ...recipients,
      {
        id: `manual-${Date.now()}`,
        name: manualRecipientName || "Manual Recipient",
        email: manualRecipientEmail,
        type: "manual",
      },
    ]);

    setManualRecipientName("");
    setManualRecipientEmail("");
    toast.success("Recipient added successfully");
  };

  // Toggle edit mode for a recipient
  const toggleEditRecipient = (id: string) => {
    setRecipients(
      recipients.map((recipient) =>
        recipient.id === id
          ? { ...recipient, editing: !recipient.editing }
          : recipient
      )
    );
  };

  // Update a recipient while editing
  const updateRecipient = (
    id: string,
    field: keyof Recipient,
    value: string | boolean
  ) => {
    setRecipients(
      recipients.map((recipient) =>
        recipient.id === id ? { ...recipient, [field]: value } : recipient
      )
    );
  };

  // Save edited recipient
  const saveEditedRecipient = (id: string) => {
    const recipient = recipients.find((r) => r.id === id);

    if (!recipient) {
      toast.error("Recipient not found");
      return;
    }

    if (!recipient.email || !/\S+@\S+\.\S+/.test(recipient.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    const duplicateEmail = recipients.some(
      (r) => r.id !== id && r.email === recipient.email
    );
    if (duplicateEmail) {
      toast.error("This email is already used by another recipient");
      return;
    }

    setRecipients(
      recipients.map((r) => (r.id === id ? { ...r, editing: false } : r))
    );

    toast.success("Recipient updated successfully");
  };

  // Remove a recipient
  const handleRemoveRecipient = (id: string) => {
    setRecipients(recipients.filter((r) => r.id !== id));
  };

  // Function to add a manual CC recipient
  const handleAddManualCcRecipient = () => {
    if (!manualCcRecipientEmail || !/\S+@\S+\.\S+/.test(manualCcRecipientEmail)) {
      toast.error("Please enter a valid CC email address");
      return;
    }

    if (ccRecipients.some((r) => r.email === manualCcRecipientEmail) || 
        recipients.some((r) => r.email === manualCcRecipientEmail)) {
      toast.error("This email is already added as a recipient");
      return;
    }

    setCcRecipients([
      ...ccRecipients,
      {
        id: `manual-cc-${Date.now()}`,
        name: manualCcRecipientName || "CC Recipient",
        email: manualCcRecipientEmail,
        type: "manual",
      },
    ]);

    setManualCcRecipientName("");
    setManualCcRecipientEmail("");
    toast.success("CC Recipient added successfully");
  };

  // Toggle edit mode for a CC recipient
  const toggleEditCcRecipient = (id: string) => {
    setCcRecipients(
      ccRecipients.map((recipient) =>
        recipient.id === id
          ? { ...recipient, editing: !recipient.editing }
          : recipient
      )
    );
  };

  // Update a CC recipient while editing
  const updateCcRecipient = (
    id: string,
    field: keyof Recipient,
    value: string | boolean
  ) => {
    setCcRecipients(
      ccRecipients.map((recipient) =>
        recipient.id === id ? { ...recipient, [field]: value } : recipient
      )
    );
  };

  // Save edited CC recipient
  const saveEditedCcRecipient = (id: string) => {
    const recipient = ccRecipients.find((r) => r.id === id);

    if (!recipient) {
      toast.error("CC Recipient not found");
      return;
    }

    if (!recipient.email || !/\S+@\S+\.\S+/.test(recipient.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    const duplicateEmail = ccRecipients.some(
      (r) => r.id !== id && r.email === recipient.email
    ) || recipients.some((r) => r.email === recipient.email);
    
    if (duplicateEmail) {
      toast.error("This email is already used by another recipient");
      return;
    }

    setCcRecipients(
      ccRecipients.map((r) => (r.id === id ? { ...r, editing: false } : r))
    );

    toast.success("CC Recipient updated successfully");
  };

  // Remove a CC recipient
  const handleRemoveCcRecipient = (id: string) => {
    setCcRecipients(ccRecipients.filter((r) => r.id !== id));
  };

  // Handle attachment selection
  const handleFileAttachment = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);

    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    const oversizedFiles = files.filter((file) => file.size > maxSize);

    if (oversizedFiles.length > 0) {
      const fileNames = oversizedFiles.map((f) => f.name).join(", ");
      toast.error(`File(s) too large: ${fileNames}. Maximum size is 10MB.`);
      return;
    }

    const newAttachments = files.map((file) => ({
      id: `attachment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      name: file.name,
      size: file.size,
      type: file.type,
    }));

    setAttachments([...attachments, ...newAttachments]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Remove an attachment
  const handleRemoveAttachment = (id: string) => {
    setAttachments(attachments.filter((a) => a.id !== id));
  };

  // Format file size for display
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " bytes";
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    else return (bytes / 1048576).toFixed(1) + " MB";
  };

  // Handle form submission
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (recipients.length === 0) {
      toast.error("Please add at least one recipient");
      return;
    }

    const currentSubject = isCustomSubject
      ? customSubject
      : getCurrentSubjectText();
    if (!currentSubject.trim()) {
      toast.error("Please enter a subject");
      return;
    }

    if (!emailContent.trim()) {
      toast.error("Please enter email content");
      return;
    }

    // Validate amount fields for part-payment template
    if (selectedAgreement === "part-payment-billcut") {
      if (!amountReceived.trim()) {
        toast.error("Please enter the amount received");
        return;
      }
      if (!totalSignupAmount.trim()) {
        toast.error("Please enter the total signup amount");
        return;
      }
    }

    setLoading(true);

    try {
      const processedAttachments = await Promise.all(
        attachments.map(async (attachment) => {
          const base64 = await convertFileToBase64(attachment.file);
          return {
            name: attachment.name,
            type: attachment.type,
            size: attachment.size,
            data: base64,
          };
        })
      );

      const emailData = {
        subject: currentSubject,
        content: processEmailContent(emailContent),
        recipients: recipients,
        ccRecipients: ccRecipients,
        attachments: processedAttachments,
        clientId: recipients.find((r) => r.type === "client")?.clientId,
      };

      if (!auth.currentUser) {
        toast.error("You must be logged in to send emails");
        setLoading(false);
        return;
      }

      const sendAgreementEmailFn = httpsCallable(functions, "sendAgreementEmail");

      try {
        const result = await sendAgreementEmailFn(emailData);

        const response = result.data as {
          success: boolean;
          messageId?: string;
          emailId?: string;
        };

        if (response.success) {
          toast.success("Agreement email sent successfully!");

          // Reset form
          setRecipients([]);
          setCcRecipients([]);
          setSelectedAgreement("agreement-draft");
          setSelectedSubject("agreement-draft-subject");
          setCustomSubject("");
          setIsCustomSubject(false);
          setEmailContent("");
          setAttachments([]);
          setTempClientId("");
          setAmountReceived("");
          setTotalSignupAmount("");
        } else {
          console.error("Cloud function reported failure without throwing error");
          throw new Error("Failed to send email: Cloud function returned success=false");
        }
      } catch (error: any) {
        console.error("Firebase function error details:", error);

        if (error.code === "functions/internal") {
          console.error("Internal server error detected in email function");
          toast.error(
            "The email service is currently experiencing technical difficulties. " +
              "Our team has been notified and is working to resolve this issue. " +
              "Please try again later or contact support."
          );
        } else if (
          error.message &&
          error.message.includes("Authentication Failed")
        ) {
          toast.error("Email server authentication failed. Please contact your administrator.");
        } else {
          toast.error(
            `Failed to send email: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
        }
      }
    } catch (error) {
      console.error("Error in handleSubmit:", error);
      toast.error("Something went wrong while preparing your email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Helper function to convert File to base64
  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          const base64String = reader.result.split(",")[1];
          resolve(base64String);
        } else {
          reject(new Error("FileReader did not return a string"));
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  // Function to add a client as CC recipient
  const handleAddClientCcRecipient = () => {
    if (!tempClientId) {
      toast.error("Please select a client");
      return;
    }

    const client = clients.find((c) => c.id === tempClientId);
    if (!client) {
      toast.error("Invalid client selected");
      return;
    }

    const alreadyAddedAsRecipient = recipients.some((r) => r.email === client.email);
    const alreadyAddedAsCc = ccRecipients.some((r) => r.email === client.email);
    
    if (alreadyAddedAsRecipient || alreadyAddedAsCc) {
      toast.error("This client is already added as a recipient or CC");
      return;
    }

    if (!client.email || !/\S+@\S+\.\S+/.test(client.email)) {
      toast.error(`${client.name} does not have a valid email address`);
      return;
    }

    setCcRecipients([
      ...ccRecipients,
      {
        id: `client-cc-${Date.now()}`,
        clientId: client.id,
        name: client.name,
        email: client.email,
        type: "client",
      },
    ]);

    // Update email content and subject with client name (if no client recipients exist)
    const existingClientRecipients = recipients.filter(r => r.type === "client");
    if (existingClientRecipients.length === 0) {
      let content = getCurrentTemplate().content;
      content = content
        .replace(/\[CLIENT_NAME\]/g, client.name || '[Client Name]')
        .replace(/\[CLIENT_EMAIL\]/g, client.email || '[Client Email]');
      setEmailContent(content);

      // Update subject with client name
      let subjectText = getCurrentTemplate().subject;
      subjectText = subjectText.replace(/\[CLIENT_NAME\]/g, client.name || '[Client Name]');
      setCustomSubject(subjectText);
      setIsCustomSubject(true);
      setSelectedSubject("custom");
    }

    setTempClientId("");
    toast.success(`${client.name} added as CC recipient`);
  };

  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const storedUserRole = localStorage.getItem('userRole');
    setUserRole(storedUserRole);
  }, []);

  return (
    <>
      <div className="flex min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
        {userRole === 'advocate' ? <AdvocateSidebar /> : userRole === 'sales' ? <SalesSidebar /> : <OverlordSidebar />}

        <div className="flex-1 p-8">
          <div className="max-w-5xl mx-auto">
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
              <FaFileContract className="mr-3 text-green-400" />
              Send Email Templates (From: notify@amalegalsolutions.com)
            </h1>
            <p className="text-gray-400 mb-8">
              Send agreement drafts, sign-up confirmations, and other templates to clients
            </p>
            
            <form
              onSubmit={handleSubmit}
              className="bg-gray-800/50 rounded-xl p-6 backdrop-blur-sm border border-gray-700/50 shadow-xl"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Agreement Template Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email Template
                  </label>
                  <select
                    value={selectedAgreement}
                    onChange={handleTemplateChange}
                    className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    {Object.keys(agreementTemplates).map((templateId) => (
                      <option key={templateId} value={templateId}>
                        {agreementTemplates[templateId as keyof typeof agreementTemplates].name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Subject Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Subject
                  </label>

                  {!editingSubject ? (
                    <div className="flex items-center">
                      <select
                        value={selectedSubject}
                        onChange={handleSubjectChange}
                        className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        disabled={editingSubject}
                      >
                        <option value={`${selectedAgreement}-subject`}>
                          {getCurrentTemplate().subject}
                        </option>
                        <option value="custom">Custom Subject...</option>
                      </select>

                      {(selectedSubject || isCustomSubject) && (
                        <button
                          type="button"
                          onClick={toggleSubjectEdit}
                          className="ml-2 p-2 bg-indigo-700 hover:bg-indigo-600 text-white rounded-md transition-colors"
                          title="Edit subject"
                        >
                          <FaPen size={14} />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <input
                        type="text"
                        value={customSubject}
                        onChange={(e) => setCustomSubject(e.target.value)}
                        placeholder="Enter custom subject"
                        className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={saveEditedSubject}
                        className="ml-2 p-2 bg-green-700 hover:bg-green-600 text-white rounded-md transition-colors"
                        title="Save subject"
                      >
                        <FaCheck size={14} />
                      </button>
                    </div>
                  )}

                  {isCustomSubject && !editingSubject && customSubject && (
                    <div className="mt-2 px-3 py-2 bg-green-900/30 border border-green-800/50 rounded-md">
                      <p className="text-sm text-white break-words">
                        {customSubject}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Amount Fields for Part-Payment Template */}
              {selectedAgreement === "part-payment-billcut" && (
                <div className="mb-6">
                  <h2 className="text-lg font-medium text-white mb-3">
                    Payment Details
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Amount Received (Rs.)
                      </label>
                      <input
                        type="text"
                        value={amountReceived}
                        onChange={(e) => setAmountReceived(e.target.value)}
                        placeholder="Enter amount received"
                        className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Total Signup Amount (Rs.)
                      </label>
                      <input
                        type="text"
                        value={totalSignupAmount}
                        onChange={(e) => setTotalSignupAmount(e.target.value)}
                        placeholder="Enter total signup amount"
                        className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <p className="text-sm text-gray-400 mt-2">
                    These values will replace the placeholders [AMOUNT_RECEIVED] and [TOTAL_SIGNUP_AMOUNT] in the email content.
                  </p>
                </div>
              )}

              {/* Recipients Section */}
              <div className="mb-6">
                <h2 className="text-lg font-medium text-white mb-3">
                  To (Recipients)
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Client Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Add Client Recipient
                    </label>
                    <div className="flex flex-col gap-2">
                      {/* Client Search Bar */}
                      <div className="relative">
                        <input
                          type="text"
                          value={clientSearchTerm}
                          onChange={(e) => setClientSearchTerm(e.target.value)}
                          placeholder="Search clients by name or email..."
                          className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent pr-10"
                        />
                        {clientSearchTerm && (
                          <button
                            type="button"
                            onClick={() => setClientSearchTerm("")}
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-white"
                            title="Clear search"
                          >
                            <FaTimes size={12} />
                          </button>
                        )}
                      </div>
                      <select
                        value={tempClientId}
                        onChange={handleClientChange}
                        className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        disabled={loadingClients}
                      >
                        <option value="">
                          {loadingClients
                            ? "Loading clients..."
                            : filteredClients.length === 0
                            ? "No clients found"
                            : "Select a client"}
                        </option>
                        {filteredClients.map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.name} ({client.email})
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleAddClientRecipient}
                          className="flex-1 px-3 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-md transition-colors flex items-center justify-center"
                          disabled={!tempClientId || loadingClients}
                        >
                          <FaPlus size={12} className="mr-1" />
                          Add as Recipient
                        </button>
                        <button
                          type="button"
                          onClick={handleAddClientCcRecipient}
                          className="flex-1 px-3 py-2 bg-amber-700 hover:bg-amber-600 text-white rounded-md transition-colors flex items-center justify-center"
                          disabled={!tempClientId || loadingClients}
                        >
                          <FaPlus size={12} className="mr-1" />
                          Add as CC
                        </button>
                      </div>
                    </div>
                    {loadingClients && (
                      <p className="mt-1 text-xs text-gray-400">
                        Loading client list...
                      </p>
                    )}
                  </div>
                </div>

                {/* Manual Recipient Addition */}
                <div className="bg-gray-700/40 rounded-md p-3 mb-4">
                  <h3 className="text-sm font-medium text-gray-300 mb-2">
                    Add Manual Recipient
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-1">
                      <input
                        type="text"
                        value={manualRecipientName}
                        onChange={(e) => setManualRecipientName(e.target.value)}
                        placeholder="Name (optional)"
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <div className="md:col-span-1">
                      <input
                        type="email"
                        value={manualRecipientEmail}
                        onChange={(e) => setManualRecipientEmail(e.target.value)}
                        placeholder="Email address"
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={handleAddManualRecipient}
                        className="w-full px-3 py-2 bg-green-700 hover:bg-green-600 text-white rounded-md transition-colors flex items-center justify-center"
                      >
                        <FaEnvelopeOpen size={14} className="mr-2" />
                        Add Recipient
                      </button>
                    </div>
                  </div>
                </div>

                {/* Recipients List */}
                {recipients.length > 0 && (
                  <div className="bg-gray-700/30 rounded-md border border-gray-600/50 p-3 mb-2">
                    <h3 className="text-sm font-medium text-gray-300 mb-2">
                      {recipients.length} Recipient
                      {recipients.length !== 1 ? "s" : ""}
                    </h3>
                    <ul className="space-y-2 max-h-60 overflow-y-auto">
                      {recipients.map((recipient) => (
                        <li
                          key={recipient.id}
                          className={`rounded-md border ${
                            recipient.editing
                              ? "bg-gray-700 border-indigo-600"
                              : recipient.type === "client"
                              ? "bg-blue-900/20 border-blue-800/30"
                              : "bg-purple-900/20 border-purple-800/30"
                          } p-2 flex items-center justify-between`}
                        >
                          {recipient.editing ? (
                            <div className="flex-1 flex items-center">
                              <div className="flex-1 grid grid-cols-2 gap-2">
                                <input
                                  type="text"
                                  value={recipient.name}
                                  onChange={(e) =>
                                    updateRecipient(
                                      recipient.id,
                                      "name",
                                      e.target.value
                                    )
                                  }
                                  className="px-2 py-1 bg-gray-600 border border-gray-500 rounded-md text-white text-sm"
                                  placeholder="Name"
                                />
                                <input
                                  type="email"
                                  value={recipient.email}
                                  onChange={(e) =>
                                    updateRecipient(
                                      recipient.id,
                                      "email",
                                      e.target.value
                                    )
                                  }
                                  className="px-2 py-1 bg-gray-600 border border-gray-500 rounded-md text-white text-sm"
                                  placeholder="Email"
                                />
                              </div>
                              <div className="flex">
                                <button
                                  type="button"
                                  onClick={() =>
                                    saveEditedRecipient(recipient.id)
                                  }
                                  className="p-1.5 bg-green-700 hover:bg-green-600 text-white rounded-md transition-colors ml-2"
                                  title="Save"
                                >
                                  <FaCheck size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    toggleEditRecipient(recipient.id)
                                  }
                                  className="p-1.5 bg-gray-600 hover:bg-gray-500 text-white rounded-md transition-colors ml-1"
                                  title="Cancel"
                                >
                                  <FaTimes size={12} />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center">
                                {recipient.type === "client" ? (
                                  <FaUser className="text-blue-400 mr-2" />
                                ) : (
                                  <FaEnvelopeOpen className="text-purple-400 mr-2" />
                                )}
                                <div>
                                  <p className="text-white font-medium">
                                    {recipient.name}
                                  </p>
                                  <p className="text-gray-400 text-sm">
                                    {recipient.email}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center">
                                <button
                                  type="button"
                                  onClick={() => toggleEditRecipient(recipient.id)}
                                  className="p-1.5 bg-indigo-700 hover:bg-indigo-600 text-white rounded-md transition-colors mr-1"
                                  title="Edit"
                                >
                                  <FaEdit size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveRecipient(recipient.id)}
                                  className="p-1.5 bg-red-700 hover:bg-red-600 text-white rounded-md transition-colors"
                                  title="Remove"
                                >
                                  <FaTimes size={12} />
                                </button>
                              </div>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* CC Recipients Section */}
                <div className="mb-6">
                  <h2 className="text-lg font-medium text-white mb-3">
                    CC (Carbon Copy)
                  </h2>

                  {/* Manual CC Recipient Addition */}
                  <div className="bg-gray-700/40 rounded-md p-3 mb-4">
                    <h3 className="text-sm font-medium text-gray-300 mb-2">
                      Add Manual CC Recipient
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="md:col-span-1">
                        <input
                          type="text"
                          value={manualCcRecipientName}
                          onChange={(e) => setManualCcRecipientName(e.target.value)}
                          placeholder="Name (optional)"
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                        />
                      </div>
                      <div className="md:col-span-1">
                        <input
                          type="email"
                          value={manualCcRecipientEmail}
                          onChange={(e) => setManualCcRecipientEmail(e.target.value)}
                          placeholder="Email address"
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                        />
                      </div>
                      <div>
                        <button
                          type="button"
                          onClick={handleAddManualCcRecipient}
                          className="w-full px-3 py-2 bg-green-700 hover:bg-green-600 text-white rounded-md transition-colors flex items-center justify-center"
                        >
                          <FaEnvelopeOpen size={14} className="mr-2" />
                          Add CC
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* CC Recipients List */}
                  {ccRecipients.length > 0 && (
                    <div className="bg-gray-700/30 rounded-md border border-gray-600/50 p-3 mb-2">
                      <h3 className="text-sm font-medium text-gray-300 mb-2">
                        {ccRecipients.length} CC Recipient
                        {ccRecipients.length !== 1 ? "s" : ""}
                      </h3>
                      <ul className="space-y-2 max-h-60 overflow-y-auto">
                        {ccRecipients.map((recipient) => (
                          <li
                            key={recipient.id}
                            className={`rounded-md border ${
                              recipient.editing
                                ? "bg-gray-700 border-indigo-600"
                                : recipient.type === "client"
                                ? "bg-blue-900/20 border-blue-800/30"
                                : "bg-purple-900/20 border-purple-800/30"
                            } p-2 flex items-center justify-between`}
                          >
                            {recipient.editing ? (
                              <div className="flex-1 flex items-center">
                                <div className="flex-1 grid grid-cols-2 gap-2">
                                  <input
                                    type="text"
                                    value={recipient.name}
                                    onChange={(e) =>
                                      updateCcRecipient(
                                        recipient.id,
                                        "name",
                                        e.target.value
                                      )
                                    }
                                    className="px-2 py-1 bg-gray-600 border border-gray-500 rounded-md text-white text-sm"
                                    placeholder="Name"
                                  />
                                  <input
                                    type="email"
                                    value={recipient.email}
                                    onChange={(e) =>
                                      updateCcRecipient(
                                        recipient.id,
                                        "email",
                                        e.target.value
                                      )
                                    }
                                    className="px-2 py-1 bg-gray-600 border border-gray-500 rounded-md text-white text-sm"
                                    placeholder="Email"
                                  />
                                </div>
                                <div className="flex">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      saveEditedCcRecipient(recipient.id)
                                    }
                                    className="p-1.5 bg-green-700 hover:bg-green-600 text-white rounded-md transition-colors ml-2"
                                    title="Save"
                                  >
                                    <FaCheck size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      toggleEditCcRecipient(recipient.id)
                                    }
                                    className="p-1.5 bg-gray-600 hover:bg-gray-500 text-white rounded-md transition-colors ml-1"
                                    title="Cancel"
                                  >
                                    <FaTimes size={12} />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center">
                                  {recipient.type === "client" ? (
                                    <FaUser className="text-blue-400 mr-2" />
                                  ) : (
                                    <FaEnvelopeOpen className="text-purple-400 mr-2" />
                                  )}
                                  <div>
                                    <p className="text-white font-medium">
                                      {recipient.name}
                                    </p>
                                    <p className="text-gray-400 text-sm">
                                      {recipient.email}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center">
                                  <button
                                    type="button"
                                    onClick={() => toggleEditCcRecipient(recipient.id)}
                                    className="p-1.5 bg-indigo-700 hover:bg-indigo-600 text-white rounded-md transition-colors mr-1"
                                    title="Edit"
                                  >
                                    <FaEdit size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveCcRecipient(recipient.id)}
                                    className="p-1.5 bg-red-700 hover:bg-red-600 text-white rounded-md transition-colors"
                                    title="Remove"
                                  >
                                    <FaTimes size={12} />
                                  </button>
                                </div>
                              </>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Email Content */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email Content
                </label>
                <textarea
                  value={emailContent}
                  onChange={(e) => setEmailContent(e.target.value)}
                  rows={12}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-vertical"
                  placeholder="Enter your email content here..."
                />
              </div>

              {/* Attachments */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Attachments
                </label>
                <div className="bg-gray-700/40 rounded-md p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <FaPaperclip className="text-gray-400 mr-2" />
                      <span className="text-gray-300 text-sm">
                        {attachments.length} file(s) attached
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-md transition-colors flex items-center"
                    >
                      <FaPlus size={12} className="mr-1" />
                      Add Files
                    </button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileAttachment}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                  />
                  {attachments.length > 0 && (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {attachments.map((attachment) => (
                        <div
                          key={attachment.id}
                          className="flex items-center justify-between bg-gray-600/50 rounded-md p-2"
                        >
                          <div className="flex items-center">
                            <FaFile className="text-gray-400 mr-2" />
                            <div>
                              <p className="text-white text-sm font-medium">
                                {attachment.name}
                              </p>
                              <p className="text-gray-400 text-xs">
                                {formatFileSize(attachment.size)}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(attachment.id)}
                            className="p-1 bg-red-700 hover:bg-red-600 text-white rounded-md transition-colors"
                            title="Remove attachment"
                          >
                            <FaTimes size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 bg-green-700 hover:bg-green-600 disabled:bg-gray-600 text-white rounded-md transition-colors flex items-center"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <FaPaperPlane className="mr-2" />
                      Send Email
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <Toaster position="top-right" />
    </>
  );
}