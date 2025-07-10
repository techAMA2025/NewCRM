"use client";

import { useState, useEffect, useRef, ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import AdvocateSidebar from "@/components/navigation/AdvocateSidebar";
import { useBankDataSimple } from "@/components/BankDataProvider";
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
  type: "client" | "bank" | "manual"; // Added 'manual' for manually added recipients
  editing?: boolean; // Flag to track editing state
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

export default function EmailComposePage() {
  // States for form elements
  const [selectedDraft, setSelectedDraft] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [customSubject, setCustomSubject] = useState("");
  const [isCustomSubject, setIsCustomSubject] = useState(false);
  const [editingSubject, setEditingSubject] = useState(false);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [ccRecipients, setCcRecipients] = useState<Recipient[]>([]);
  const [tempClientId, setTempClientId] = useState("");
  const [selectedBank, setSelectedBank] = useState("");
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

  // Add dynamic bank loading
  const { bankData: banks, isLoading: isLoadingBanks } = useBankDataSimple();

  // Sample data (in a real app, these would come from an API)
  const draftTemplates = [
    {
      id: "vakalatnama",
      name: "Vakalatnama",
      content: `
Respected Arbitrator,

This is with reference to the arbitration meeting scheduled for.
 
We would like to inform you that AMA Legal Solutions is representing our client, [CLIENT_NAME], in this matter.

Please find the signed Vakalatnama attached for your records.

Regards,
AMA Legal Solutions`,
    },

    {
      id: "demand-notice",
      name: "Demand Notice Reply",
      content: `Please find attached the reply to the notice sent by you to my client, [CLIENT_NAME], at their registered email address [CLIENT_EMAIL]. Should the bank require any further information, documentation, or clarification, my client is fully prepared to provide all necessary details to facilitate the process. Kindly acknowledge receipt of this communication.`,
    },

    {
      id: "section-138",
      name: "Section 138 Reply",
      content: `Dear Sir/Madam,
Please find attached the detailed reply to the legal notice issued under Section 138 of the Negotiable Instruments Act, 1881, addressed to my client, [CLIENT_NAME], at their registered email address [CLIENT_EMAIL].
My client has duly noted the contents of the notice and, through this response, has addressed all allegations and factual clarifications. Should you or your client require any further information or supporting documents, we are open to providing the same to resolve the matter amicably.
Kindly acknowledge receipt of this communication.`,
    },

    {
      id: "section-25",
      name: "Section 25 PASA Act Reply",
      content: `Dear Sir/Madam,
Please find attached the reply to the legal notice issued under Section 25 of the Payment and Settlement Systems Act, 2007, addressed to my client, [CLIENT_NAME], at their registered email address [CLIENT_EMAIL]. My client has reviewed the contents of the notice and, through this response, has addressed the relevant factual and legal points raised therein. If the concerned authority or your office requires any further clarification, supporting documentation, or additional information, my client is fully prepared to provide the same to ensure a fair and transparent resolution. Kindly acknowledge receipt of this communication.`,
    },

    {
      id: "harassment-notice",
      name: "Extreme Harassment Notice",
      content: `Please find attached a legal notice addressed to you on behalf of my client, [CLIENT_NAME], regarding the continued and extreme harassment faced by them at your instance.
Despite multiple attempts to resolve the matter amicably, your conduct has persisted, causing severe mental, emotional, and reputational distress to my client. This notice is being served as a final opportunity to cease and desist from such unlawful behavior, failing which my client shall be constrained to initiate appropriate legal proceedings, both civil and criminal, at your risk, cost, and consequence.
You are hereby advised to treat this matter with the seriousness it warrants. An acknowledgment of this communication and your response to the attached notice is expected within the stipulated time.`,
    },

    {
      id: "excessive-call",
      name: "Excessive Call & Follow-up Complaint",
      content: `Dear [CLIENT_NAME],
Please find below the attached draft email template that you can fill and send to the concerned bank's customer care or grievance redressal officer regarding the unlawful and harassing recovery practices you've been subjected to. Kindly complete the missing details marked with XXXX and ensure that you attach any relevant screenshots or call recordings before sending it. Let us know once you've filled in the details or if you'd like us to review the draft before you send it to the bank.`,
    },

    {
      id: "breather-period",
      name: "Breather Period Request",
      content: `Dear [CLIENT_NAME],
Please find below a ready-to-use email draft for requesting a temporary breather period from EMI and minimum due payments from the bank. Kindly fill in your name and the specific month you're requesting the extension until, then forward it to the concerned bank's customer care or grievance team. Let us know once you've filled in the details or if you'd like us to review the draft before you send it to the bank.`,
    },

    {
      id: "unauthorized-payment",
      name: "Unauthorized Payment Report",
      content: `Dear [CLIENT_NAME],
Below is a draft email you can send to your bank's credit card department to report an unauthorized payment. Please ensure that you fill in the details marked with XXXX and ensure that you attach any relevant screenshots or call recordings before sending it and attach any relevant screenshots or evidence before sending it. Let us know once you've filled in the details or if you'd like us to review the draft before you send it to the bank.`,
    },

    {
      id: "settlement-request",
      name: "Bank Settlement Request",
      content: `Dear [CLIENT_NAME],
Below is a draft email you can send to your bank or financial institution to initiate a loan settlement discussion due to ongoing financial difficulties. Please ensure you fill in your name ([CLIENT_NAME]), registered email ([CLIENT_EMAIL]), and loan or credit card number before sending it to the concerned department. Let us know once you've filled in the details or if you'd like us to review the draft before you send it to the bank.`,
    },
  ];

  const subjectTemplates = [
    { id: "vakalatnama-subject", text: "Vakalatnama for Arbitration" },
    { id: "demand-notice-subject", text: "Reply to Legal Notice" },
    {
      id: "section-138-subject",
      text: "Reply to Legal Notice under Section 138 of the Negotiable Instruments Act",
    },
    {
      id: "section-25-subject",
      text: "Reply to Legal Notice under Section 25 of the Payment and Settlement Systems Act, 2007",
    },
    {
      id: "harassment-notice-subject",
      text: "Legal Notice for Extreme Harassment",
    },
    {
      id: "excessive-call-subject",
      text: "Complaint Regarding Harassment by Recovery Agents – Violation of RBI Guidelines",
    },
    {
      id: "breather-period-subject",
      text: "Request for Temporary Breather Period on EMI Payments Due to Financial Hardship",
    },
    {
      id: "unauthorized-payment-subject",
      text: "Unauthorized Payment on My Credit Card Account – Request for Immediate Investigation",
    },
    {
      id: "settlement-request-subject",
      text: "Request for Settlement of Outstanding Loan/Credit Card Dues",
    },
    { id: "subject1", text: "Follow-up: Our Meeting on [Date]" },
    { id: "subject2", text: "Update on Your Case [Case Number]" },
    { id: "subject3", text: "Important: Document Request" },
    { id: "subject4", text: "Consultation Appointment Confirmation" },
    { id: "subject5", text: "Settlement Offer: [Case Reference]" },
    { id: "subject6", text: "Legal Update: [Case Number]" },
    { id: "custom", text: "Custom Subject" },
  ];

  // Fetch clients from Firestore
  useEffect(() => {
    async function fetchClients() {
      // if (!auth.currentUser) {
      //   console.log("No authenticated user found");
      //   return;
      // }

      setLoadingClients(true);
      try {

        // Get advocate name from current user (assuming email format 'name@domain.com')
        const advocateEmail = auth.currentUser?.email;

        const clientsRef = collection(db, "clients");
        // Query all clients without filtering to ensure we have data
        const clientQuery = query(clientsRef);

        const snapshot = await getDocs(clientQuery);

        const clientsList: Client[] = [];

        snapshot.forEach((doc) => {
          const clientData = doc.data();
          // Ensure we have at least a name and email
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



  // Update email content when a draft is selected
  useEffect(() => {
    const draft = draftTemplates.find((d) => d.id === selectedDraft);
    if (draft) {
      // Get the selected client data
      const selectedClient = clients.find(c => c.id === tempClientId);
      
      // Replace template with client data if available
      let content = draft.content;
      if (selectedClient) {
        content = content
          .replace(/\[CLIENT_NAME\]/g, selectedClient.name || '[Client Name]')
          .replace(/\[CLIENT_EMAIL\]/g, selectedClient.email || '[Client Email]');
      }
      
      setEmailContent(content);

      // Automatically select corresponding subject when a draft is selected
      if (draft.id === "vakalatnama") {
        setSelectedSubject("vakalatnama-subject");
        setIsCustomSubject(false);
      } else if (draft.id === "demand-notice") {
        setSelectedSubject("demand-notice-subject");
        setIsCustomSubject(false);
      } else if (draft.id === "section-138") {
        setSelectedSubject("section-138-subject");
        setIsCustomSubject(false);
      } else if (draft.id === "section-25") {
        setSelectedSubject("section-25-subject");
        setIsCustomSubject(false);
      } else if (draft.id === "harassment-notice") {
        setSelectedSubject("harassment-notice-subject");
        setIsCustomSubject(false);
      } else if (draft.id === "excessive-call") {
        setSelectedSubject("excessive-call-subject");
        setIsCustomSubject(false);
      } else if (draft.id === "breather-period") {
        setSelectedSubject("breather-period-subject");
        setIsCustomSubject(false);
      } else if (draft.id === "unauthorized-payment") {
        setSelectedSubject("unauthorized-payment-subject");
        setIsCustomSubject(false);
      } else if (draft.id === "settlement-request") {
        setSelectedSubject("settlement-request-subject");
        setIsCustomSubject(false);
      }
    }
  }, [selectedDraft, tempClientId, clients]);

  // Handle draft selection
  const handleDraftChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedDraft(e.target.value);
  };

  // Handle subject selection
  const handleSubjectChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedSubject(value);

    // If "Custom Subject" is selected, enable custom subject input
    if (value === "custom") {
      setIsCustomSubject(true);
      setCustomSubject("");
    } else {
      setIsCustomSubject(false);
      // Set the customSubject to the selected template for editing purposes
      const template = subjectTemplates.find((s) => s.id === value);
      if (template) {
        setCustomSubject(template.text);
      }
    }
  };

  // Toggle subject editing mode
  const toggleSubjectEdit = () => {
    if (!editingSubject) {
      // When entering edit mode, initialize the custom subject field
      const subjectText =
        selectedSubject && !isCustomSubject
          ? subjectTemplates.find((s) => s.id === selectedSubject)?.text || ""
          : customSubject;

      setCustomSubject(subjectText);
    }

    setEditingSubject(!editingSubject);
    // When entering edit mode, set to custom subject mode
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

    if (selectedSubject) {
      return subjectTemplates.find((s) => s.id === selectedSubject)?.text || "";
    }

    return "";
  };

  // Handle client selection
  const handleClientChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setTempClientId(e.target.value);
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

    // Check if client already exists in recipients
    const alreadyAdded = recipients.some((r) => r.email === client.email);
    if (alreadyAdded) {
      toast.error("This client is already added as a recipient");
      return;
    }

    // Check if client has a valid email
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

    // Don't reset tempClientId to keep the dropdown selected for dynamic details
    // setTempClientId(""); // Reset selection
    toast.success(`${client.name} added as recipient`);
  };

  // Handle bank selection and add bank emails as recipients
  const handleBankChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const bankName = e.target.value;
    setSelectedBank(bankName);
  };

  // Add bank emails as recipients
  const handleAddBankRecipient = () => {
    if (!selectedBank || !banks[selectedBank]) {
      toast.error("Please select a bank");
      return;
    }

    const bankEmails = banks[selectedBank].email.split(", ");

    let newRecipients = [...recipients];
    let addedCount = 0;

    bankEmails.forEach((email) => {
      const emailTrimmed = email.trim();
      // Skip empty emails and check for duplicates
      if (emailTrimmed && !recipients.some((r) => r.email === emailTrimmed)) {
        newRecipients.push({
          id: `bank-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: `${selectedBank} (${emailTrimmed})`,
          email: emailTrimmed,
          type: "bank",
        });
        addedCount++;
      }
    });

    if (addedCount > 0) {
      setRecipients(newRecipients);
      toast.success(`Added ${addedCount} email(s) from ${selectedBank} as recipient`);
    } else {
      toast.error('No new email addresses to add');
    }
  };

  // Add bank emails as CC recipients
  const handleAddBankCcRecipient = () => {
    if (!selectedBank || !banks[selectedBank]) {
      toast.error("Please select a bank");
      return;
    }

    const bankEmails = banks[selectedBank].email.split(", ");

    let newCcRecipients = [...ccRecipients];
    let addedCount = 0;

    bankEmails.forEach((email) => {
      const emailTrimmed = email.trim();
      // Skip empty emails and check for duplicates in both recipients and CC recipients
      if (
        emailTrimmed && 
        !ccRecipients.some((r) => r.email === emailTrimmed) &&
        !recipients.some((r) => r.email === emailTrimmed)
      ) {
        newCcRecipients.push({
          id: `bank-cc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: `${selectedBank} (${emailTrimmed})`,
          email: emailTrimmed,
          type: "bank",
        });
        addedCount++;
      }
    });

    if (addedCount > 0) {
      setCcRecipients(newCcRecipients);
      toast.success(`Added ${addedCount} email(s) from ${selectedBank} as CC`);
    } else {
      toast.error('No new email addresses to add');
    }
  };

  // Function to add a manual recipient
  const handleAddManualRecipient = () => {
    // Validate email format
    if (!manualRecipientEmail || !/\S+@\S+\.\S+/.test(manualRecipientEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    // Check for duplicate
    if (recipients.some((r) => r.email === manualRecipientEmail)) {
      toast.error("This email is already added as a recipient");
      return;
    }

    // Add the manual recipient
    setRecipients([
      ...recipients,
      {
        id: `manual-${Date.now()}`,
        name: manualRecipientName || "Manual Recipient",
        email: manualRecipientEmail,
        type: "manual",
      },
    ]);

    // Reset fields
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

    // Validate email format
    if (!recipient.email || !/\S+@\S+\.\S+/.test(recipient.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    // Check for duplicates (excluding the current recipient)
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
    // Validate email format
    if (!manualCcRecipientEmail || !/\S+@\S+\.\S+/.test(manualCcRecipientEmail)) {
      toast.error("Please enter a valid CC email address");
      return;
    }

    // Check for duplicate
    if (ccRecipients.some((r) => r.email === manualCcRecipientEmail) || 
        recipients.some((r) => r.email === manualCcRecipientEmail)) {
      toast.error("This email is already added as a recipient");
      return;
    }

    // Add the manual CC recipient
    setCcRecipients([
      ...ccRecipients,
      {
        id: `manual-cc-${Date.now()}`,
        name: manualCcRecipientName || "CC Recipient",
        email: manualCcRecipientEmail,
        type: "manual",
      },
    ]);

    // Reset fields
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

    // Validate email format
    if (!recipient.email || !/\S+@\S+\.\S+/.test(recipient.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    // Check for duplicates (excluding the current recipient)
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

    // Check if any file is too large (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    const oversizedFiles = files.filter((file) => file.size > maxSize);

    if (oversizedFiles.length > 0) {
      const fileNames = oversizedFiles.map((f) => f.name).join(", ");
      toast.error(`File(s) too large: ${fileNames}. Maximum size is 10MB.`);
      return;
    }

    // Process valid files
    const newAttachments = files.map((file) => ({
      id: `attachment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      name: file.name,
      size: file.size,
      type: file.type,
    }));

    setAttachments([...attachments, ...newAttachments]);

    // Reset file input
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

    // Validate form
    if (recipients.length === 0) {
      toast.error("Please add at least one recipient");

      return;
    }

    // Validate subject - either selected or custom
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

    // Set loading state
    setLoading(true);

    try {
      // Convert file attachments to base64
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

      // Prepare email data for the cloud function
      const emailData = {
        subject: currentSubject,
        content: emailContent,
        recipients: recipients,
        ccRecipients: ccRecipients,
        attachments: processedAttachments,
        clientId: recipients.find((r) => r.type === "client")?.clientId, // Add client reference if exists
        bankId: selectedBank || undefined, // Add bank reference if selected
      };


      // Make sure user is authenticated
      if (!auth.currentUser) {
        toast.error("You must be logged in to send emails");
        setLoading(false);
        return;
      }

      // Call the sendEmail cloud function
      const sendEmailFn = httpsCallable(functions, "sendEmail");

      try {
        const result = await sendEmailFn(emailData);

        // Cast result to the expected return type
        const response = result.data as {
          success: boolean;
          messageId?: string;
          emailId?: string;
        };

        if (response.success) {
          toast.success("Email sent successfully!");

          // Reset form
          setRecipients([]);
          setCcRecipients([]);
          setSelectedDraft("");
          setSelectedSubject("");
          setCustomSubject("");
          setIsCustomSubject(false);
          setEmailContent("");
          setAttachments([]);
          setSelectedBank("");
          setTempClientId("");
        } else {
          console.error(
            "Cloud function reported failure without throwing error"
          );
          throw new Error(
            "Failed to send email: Cloud function returned success=false"
          );
        }
      } catch (error: any) {
        console.error("Firebase function error details:", error);

        // Check for different error types
        if (error.code === "functions/internal") {
          console.error("Internal server error detected in email function");
          toast.error(
            "The email service is currently experiencing technical difficulties. " +
              "Our team has been notified and is working to resolve this issue. " +
              "Please try again later or contact support."
          );

          // Log additional context for debugging
          console.error(
            "This could be due to invalid SMTP configuration, " +
              "missing Firebase config values, or other server-side issues."
          );
        } else if (
          error.message &&
          error.message.includes("Authentication Failed")
        ) {
          toast.error(
            "Email server authentication failed. Please contact your administrator."
          );
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
      toast.error(
        `Something went wrong while preparing your email. Please try again.`
      );
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
          // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
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

    // Check if client already exists in recipients or CC recipients
    const alreadyAddedAsRecipient = recipients.some((r) => r.email === client.email);
    const alreadyAddedAsCc = ccRecipients.some((r) => r.email === client.email);
    
    if (alreadyAddedAsRecipient || alreadyAddedAsCc) {
      toast.error("This client is already added as a recipient or CC");
      return;
    }

    // Check if client has a valid email
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

    // Don't reset tempClientId to keep the dropdown selected for dynamic details
    // setTempClientId(""); // Reset selection
    toast.success(`${client.name} added as CC recipient`);
  };

  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    // Access localStorage only on the client side
    const storedUserRole = localStorage.getItem('userRole');
    setUserRole(storedUserRole);
  }, []);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      {userRole === 'advocate' ? <AdvocateSidebar /> : <OverlordSidebar />}

      <div className="flex-1 p-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
            <FaEnvelope className="mr-3 text-purple-400" />
            Compose Email (From: legal@amalegalsolutions.com)
          </h1>
          <p className="text-gray-400 mb-8">
            Create and send professional emails to clients and banks
          </p>
          

          <form
            onSubmit={handleSubmit}
            className="bg-gray-800/50 rounded-xl p-6 backdrop-blur-sm border border-gray-700/50 shadow-xl"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Template Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email Template
                </label>
                <select
                  value={selectedDraft}
                  onChange={handleDraftChange}
                  className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Select a template</option>
                  {draftTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
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
                      className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      disabled={editingSubject}
                    >
                      <option value="">Select a subject</option>
                      {subjectTemplates.slice(0, -1).map((subject) => (
                        <option key={subject.id} value={subject.id}>
                          {subject.text}
                        </option>
                      ))}
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
                      className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                  <div className="mt-2 px-3 py-2 bg-indigo-900/30 border border-indigo-800/50 rounded-md">
                    <p className="text-sm text-white break-words">
                      {customSubject}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Recipients Section */}
            <div className="mb-6">
              <h2 className="text-lg font-medium text-white mb-3">
                To (Recipients)
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Bank Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Add Bank Recipients
                  </label>
                  <div className="flex flex-col gap-2">
                    <select
                      value={selectedBank}
                      onChange={handleBankChange}
                      className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      disabled={isLoadingBanks}
                    >
                      <option value="">
                        {isLoadingBanks ? "Loading banks..." : "Select a bank"}
                      </option>
                      {Object.keys(banks).map((bankName) => (
                        <option key={bankName} value={bankName}>
                          {bankName}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleAddBankRecipient}
                        className="flex-1 px-3 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-md transition-colors flex items-center justify-center"
                        disabled={!selectedBank || isLoadingBanks}
                      >
                        <FaPlus size={12} className="mr-1" />
                        Add as Recipient
                      </button>
                      <button
                        type="button"
                        onClick={handleAddBankCcRecipient}
                        className="flex-1 px-3 py-2 bg-amber-700 hover:bg-amber-600 text-white rounded-md transition-colors flex items-center justify-center"
                        disabled={!selectedBank || isLoadingBanks}
                      >
                        <FaPlus size={12} className="mr-1" />
                        Add as CC
                      </button>
                    </div>
                  </div>
                  {selectedBank && !isLoadingBanks && (
                    <p className="mt-1 text-xs text-gray-400">
                      All emails from {selectedBank} will be added
                    </p>
                  )}
                  {isLoadingBanks && (
                    <p className="mt-1 text-xs text-gray-400">
                      Loading bank list...
                    </p>
                  )}
                </div>

                {/* Client Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Add Client Recipient
                  </label>
                  <div className="flex flex-col gap-2">
                    <select
                      value={tempClientId}
                      onChange={handleClientChange}
                      className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      disabled={loadingClients}
                    >
                      <option value="">
                        {loadingClients
                          ? "Loading clients..."
                          : "Select a client"}
                      </option>
                      {clients.map((client) => (
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
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <input
                      type="email"
                      value={manualRecipientEmail}
                      onChange={(e) => setManualRecipientEmail(e.target.value)}
                      placeholder="Email address"
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={handleAddManualRecipient}
                      className="w-full px-3 py-2 bg-purple-700 hover:bg-purple-600 text-white rounded-md transition-colors flex items-center justify-center"
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
                            : recipient.type === "bank"
                            ? "bg-green-900/20 border-green-800/30"
                            : "bg-purple-900/20 border-purple-800/30"
                        } p-2 flex items-center justify-between`}
                      >
                        {recipient.editing ? (
                          // Edit mode
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
                          // View mode
                          <>
                            <div className="flex items-center">
                              {recipient.type === "client" ? (
                                <FaUser className="text-blue-400 mr-2" />
                              ) : recipient.type === "bank" ? (
                                <FaEnvelope className="text-green-400 mr-2" />
                              ) : (
                                <FaEnvelopeOpen className="text-purple-400 mr-2" />
                              )}
                              <div>
                                <p className="text-white text-sm font-medium">
                                  {recipient.name}
                                </p>
                                <p className="text-gray-400 text-xs">
                                  {recipient.email}
                                </p>
                              </div>
                            </div>
                            <div>
                              <button
                                type="button"
                                onClick={() =>
                                  toggleEditRecipient(recipient.id)
                                }
                                className="p-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors ml-1"
                                title="Edit"
                              >
                                <FaEdit size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleRemoveRecipient(recipient.id)
                                }
                                className="p-1.5 bg-red-900/70 hover:bg-red-700 text-white rounded-md transition-colors ml-1"
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

            {/* CC Recipients Section */}
            <div className="mb-6">
              <h2 className="text-lg font-medium text-white mb-3">
                CC (Carbon Copy)
              </h2>

              {/* Manual CC Recipient Addition */}
              <div className="bg-gray-700/40 rounded-md p-3 mb-4">
                <h3 className="text-sm font-medium text-gray-300 mb-2">
                  Add CC Recipient
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-1">
                    <input
                      type="text"
                      value={manualCcRecipientName}
                      onChange={(e) => setManualCcRecipientName(e.target.value)}
                      placeholder="Name (optional)"
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <input
                      type="email"
                      value={manualCcRecipientEmail}
                      onChange={(e) => setManualCcRecipientEmail(e.target.value)}
                      placeholder="CC Email address"
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={handleAddManualCcRecipient}
                      className="w-full px-3 py-2 bg-purple-700 hover:bg-purple-600 text-white rounded-md transition-colors flex items-center justify-center"
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
                        className={`rounded-md border bg-amber-900/20 border-amber-800/30 p-2 flex items-center justify-between`}
                      >
                        {recipient.editing ? (
                          // Edit mode for CC recipient
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
                          // View mode for CC recipient
                          <>
                            <div className="flex items-center">
                              <FaEnvelopeOpen className="text-amber-400 mr-2" />
                              <div>
                                <p className="text-white text-sm font-medium">
                                  {recipient.name} (CC)
                                </p>
                                <p className="text-gray-400 text-xs">
                                  {recipient.email}
                                </p>
                              </div>
                            </div>
                            <div>
                              <button
                                type="button"
                                onClick={() =>
                                  toggleEditCcRecipient(recipient.id)
                                }
                                className="p-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors ml-1"
                                title="Edit"
                              >
                                <FaEdit size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleRemoveCcRecipient(recipient.id)
                                }
                                className="p-1.5 bg-red-900/70 hover:bg-red-700 text-white rounded-md transition-colors ml-1"
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

            <div className="mb-6">
              <div className="grid grid-cols-1 gap-6">
                {/* Email Content */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email Content
                  </label>
                  <textarea
                    value={emailContent}
                    onChange={(e) => setEmailContent(e.target.value)}
                    rows={12}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
                    placeholder="Type your email content here..."
                  ></textarea>
                </div>

                {/* Attachments */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Attachments
                    </label>
                  </div>

                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors duration-200 flex items-center"
                    >
                      <FaPaperclip className="mr-2" />
                      Attach Files
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileAttachment}
                      multiple
                      className="hidden"
                    />
                  </div>
                  <span className="ml-3 text-gray-400 text-sm">
                    Max 10MB per file
                  </span>

                  {/* Display attached files */}
                  {attachments.length > 0 && (
                    <div className="bg-gray-700/50 rounded-md border border-gray-600 p-3 mt-2">
                      <h3 className="text-white text-sm font-medium mb-2">
                        {attachments.length} file(s) attached
                      </h3>
                      <ul className="space-y-2">
                        {attachments.map((attachment) => (
                          <li
                            key={attachment.id}
                            className="flex items-center justify-between bg-gray-800 rounded px-3 py-2"
                          >
                            <div className="flex items-center">
                              <FaFile className="text-purple-400 mr-2" />
                              <div>
                                <p className="text-white text-sm truncate max-w-xs">
                                  {attachment.name}
                                </p>
                                <p className="text-gray-400 text-xs">
                                  {formatFileSize(attachment.size)}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                handleRemoveAttachment(attachment.id)
                              }
                              className="text-gray-400 hover:text-red-400 transition-colors"
                              aria-label="Remove attachment"
                            >
                              <FaTimes />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8">
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-3 rounded-lg shadow-lg flex items-center justify-center text-lg font-medium transition-all duration-300 ${
                    loading
                      ? "bg-gray-700 text-gray-300 cursor-not-allowed"
                      : "bg-purple-600 hover:bg-purple-700 text-white"
                  }`}
                >
                  {loading ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Sending Email...
                    </>
                  ) : (
                    <>
                      <FaPaperPlane className="mr-2" /> Send Email
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
          <button
            type="button"
            className="w-full px-3 py-2 bg-purple-700 hover:bg-purple-600 text-white rounded-md transition-colors flex items-center justify-center mt-10"
          >
            <FaHistory size={14} className="mr-2" />
            <a
              href="/advocate/emailcompose/emailhistory"
              className="text-white"
            >
              Email History
            </a>
          </button>
          <div className="mt-8 p-4 rounded-lg bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border border-purple-800/30">
            <h3 className="text-sm font-medium text-indigo-300 mb-2">
              Email Composition Tips
            </h3>
            <ul className="text-gray-300 text-sm space-y-1 ml-5 list-disc">
              <li>Keep your message clear and concise</li>
              <li>Personalize your emails by using the client's name</li>
              <li>Include specific action items or next steps</li>
              <li>Proofread before sending</li>
              <li>Ensure all recipient emails are correct before sending</li>
              <li>Verify attachments are relevant and properly named</li>
            </ul>
          </div>
        </div>

        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: "#333",
              color: "#fff",
            },
            success: {
              duration: 3000,
              style: {
                background: "rgba(47, 133, 90, 0.9)",
              },
            },
            error: {
              duration: 3000,
              style: {
                background: "rgba(175, 45, 45, 0.9)",
              },
            },
          }}
        />
      </div>
    </div>
  );
}
