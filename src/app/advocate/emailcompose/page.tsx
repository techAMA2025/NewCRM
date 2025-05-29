"use client";

import { useState, useEffect, useRef, ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import AdvocateSidebar from "@/components/navigation/AdvocateSidebar";
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

  // Sample data (in a real app, these would come from an API)
  const draftTemplates = [
    {
      id: "vakalatnama",
      name: "Vakalatnama",
      content: `

Respected Arbitrator,

This is with reference to the arbitration meeting scheduled for.
 
We would like to inform you that AMA Legal Solutions is representing our client, Mr./Ms. XXXX, in this matter.

Please find the signed Vakalatnama attached for your records.

Regards,
AMA Legal Solutions`,
    },

    {
      id: "demand-notice",
      name: "Demand Notice Reply",
      content: `Please find attached the reply to the notice sent by you to my client, [Client Name], at his registered email address. Should the bank require any further information, documentation, or clarification, my client is fully prepared to provide all necessary details to facilitate the process. Kindly acknowledge receipt of this communication.`,
    },

    {
      id: "section-138",
      name: "Section 138 Reply",
      content: `Dear Sir/Madam,
Please find attached the detailed reply to the legal notice issued under Section 138 of the Negotiable Instruments Act, 1881, addressed to my client, [Client Name], at their registered email address.
My client has duly noted the contents of the notice and, through this response, has addressed all allegations and factual clarifications. Should you or your client require any further information or supporting documents, we are open to providing the same to resolve the matter amicably.
Kindly acknowledge receipt of this communication.`,
    },

    {
      id: "section-25",
      name: "Section 25 PASA Act Reply",
      content: `Dear Sir/Madam,
Please find attached the reply to the legal notice issued under Section 25 of the Payment and Settlement Systems Act, 2007, addressed to my client, [Client Name], at their registered email address. My client has reviewed the contents of the notice and, through this response, has addressed the relevant factual and legal points raised therein. If the concerned authority or your office requires any further clarification, supporting documentation, or additional information, my client is fully prepared to provide the same to ensure a fair and transparent resolution. Kindly acknowledge receipt of this communication.`,
    },

    {
      id: "harassment-notice",
      name: "Extreme Harassment Notice",
      content: `Please find attached a legal notice addressed to you on behalf of my client, [Client Name], regarding the continued and extreme harassment faced by them at your instance.
Despite multiple attempts to resolve the matter amicably, your conduct has persisted, causing severe mental, emotional, and reputational distress to my client. This notice is being served as a final opportunity to cease and desist from such unlawful behavior, failing which my client shall be constrained to initiate appropriate legal proceedings, both civil and criminal, at your risk, cost, and consequence.
You are hereby advised to treat this matter with the seriousness it warrants. An acknowledgment of this communication and your response to the attached notice is expected within the stipulated time.`,
    },

    {
      id: "excessive-call",
      name: "Excessive Call & Follow-up Complaint",
      content: `Dear [Client's Name],
Please find below the attached draft email template that you can fill and send to the concerned bank's customer care or grievance redressal officer regarding the unlawful and harassing recovery practices you've been subjected to. Kindly complete the missing details marked with XXXX and ensure that you attach any relevant screenshots or call recordings before sending it. Let us know once you've filled in the details or if you'd like us to review the draft before you send it to the bank.`,
    },

    {
      id: "breather-period",
      name: "Breather Period Request",
      content: `Dear [Client's Name],
Please find below a ready-to-use email draft for requesting a temporary breather period from EMI and minimum due payments from the bank. Kindly fill in your name and the specific month you're requesting the extension until, then forward it to the concerned bank's customer care or grievance team. Let us know once you've filled in the details or if you'd like us to review the draft before you send it to the bank.`,
    },

    {
      id: "unauthorized-payment",
      name: "Unauthorized Payment Report",
      content: `Dear [Client's Name],
Below is a draft email you can send to your bank's credit card department to report an unauthorized payment. Please ensure that you fill in the details marked with XXXX and ensure that you attach any relevant screenshots or call recordings before sending it and attach any relevant screenshots or evidence before sending it. Let us know once you've filled in the details or if you'd like us to review the draft before you send it to the bank.`,
    },

    {
      id: "settlement-request",
      name: "Bank Settlement Request",
      content: `Dear [Client's Name],
Below is a draft email you can send to your bank or financial institution to initiate a loan settlement discussion due to ongoing financial difficulties. Please ensure you fill in your name, registered email, and loan or credit card number before sending it to the concerned department. Let us know once you've filled in the details or if you'd like us to review the draft before you send it to the bank.`,
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
        console.log("Fetching clients from Firestore...");

        // Get advocate name from current user (assuming email format 'name@domain.com')
        const advocateEmail = auth.currentUser?.email;
        console.log("Current user email:", advocateEmail);

        const clientsRef = collection(db, "clients");
        // Query all clients without filtering to ensure we have data
        const clientQuery = query(clientsRef);

        console.log("Executing Firestore query...");
        const snapshot = await getDocs(clientQuery);
        console.log(`Found ${snapshot.size} clients in Firestore`);

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

        console.log(
          `Processed ${clientsList.length} valid clients with name and email`
        );
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

  // Sample bank data (similar to what's in requestletter.tsx)
  const banks = {
    "Axis Bank": {
      address:
        "Mr. Sandeep Dam, Nodal officer Axis Bank Ltd, Axis House, Tower 3, 4th Floor, Sector128, Noida, UP- 201304. Landline No: 0120-6210005. Mr. Caesar Pinto, Nodal Officer, Axis Bank LTD. NPC1, 5th Floor \"Gigaplex\", Plot No .I.T 5, MIDC Airoli Knowledge Park, Airoli, Navi Mumbai – 400708. Mrs. Neeta Bhatt Principal Nodal Officer, Axis Bank LTD. 4th Floor, Axis House, Wadia International Center, P.B. Marg, Worli, Mumbai – 400 025. Axis Bank Limited, 'Axis House', C-2, Wadia International Centre, Pandurang Budhkar Marg, Worli, Mumbai - 400 025. Axis Bank Limited, 'Trishul', 3rd Floor, Opp. Samartheshwar Temple, Near Law Garden, Ellisbridge, Ahmedabad - 380 006",
      email:
        "Circlenodalofficer.delhi1@axisbank.com, nodal.officer@axisbank.com, pno@axisbank.com",
    },
    "Ashv Finance Limited": {
      address:
        "Ashv Finance Limited,12B 3rd Floor, Techniplex II, Off Veer Savarkar, Goregaon West, Mumbai, Maharashtra-400062. Grievance Redressal Officer, Ms. Monika Thadeshwar, 12B 3rd Floor, Techniplex II, Off Veer Savarkar, Goregaon West, Mumbai, Maharashtra-400062.",
      email:
        "monika.thadeshwar@ashvfinance.com, info@ashvfinance.com, customersupport@ashvfinance.com",
    },
    Niro: {
      address:
        "Corporate Office: No 313/1 Workden, Ground floor, 7th Cross Patel, Rama Reddy Road, Domlur Layout, Bangalore 560071. Registered Office: 17/1 Bharat Apartments, 44/1, Fair field Layout, Race course road, Bengaluru, Karnataka – 560 001",
      email: "support@niro.money, grievance@niro.money, info@niro.money",
    },
    "Aditya Birla Fin": {
      address:
        "Ms Rachana Padval, Aditya Birla Finance Limited,10th Floor, R-Tech Park, Nirlon Complex, Goregaon, Mumbai – 400063. Principal Nodal Officer Ms Smita Nadkarni, Aditya Birla Finance Limited,10th Floor, R-Tech Park, Nirlon Complex, Goregaon, Mumbai – 400063. Aditya Birla Finance Limited (A subsidiary of Aditya Birla Capital Ltd.) One World Center, Tower 1-C, 18th Floor, 841, Jupiter Mill Compound, Senapati Bapat Marg, Elphinstone Road, Mumbai 400 013. Mr Abhinav Chaudhry. Aditya Birla Housing Finance - Customer Service Cell, R Tech Park, 10th Floor, Niroln Complex, Off Western Express Highway Goregaon East, Mumbai - 400063. Aditya Birla Finance Limited (A subsidiary of Aditya Birla Capital Ltd.) Indian Rayon Compound, Veraval, Gujarat -362 266.",
      email:
        "abfl.nodalofficerwest@adityabirlacapital.com, grievance.finance@adityabirlacapital.com, care.finance@adityabirlacapital.com, abhinav.c@adityabirlacapital.com, care.digitalfinance@adityabirlacapital.com, preethi.nair@adityabirlacapital.com",
    },
    Amex: {
      address:
        "Manager - Executive Correspondence Unit, American Express Banking Corp. Cyber City, Tower C, DLF Building No.8 Sector 25, DLF City Ph II, Gurgaon – 122002. Ms. Priyameet Kaur, Head of Customer Service American Express Banking Corp. Cyber City, Tower C, DLF Building No.8, Sector 25, DLF City Ph II, Gurgaon – 122002 (Haryana). Mr. Ashish Pandey, Nodal Officer, American Express Banking Corp. Cyber City, Tower C, DLF Building No.8, Sector 25, DLF City Ph II, Gurgaon – 122002 (Haryana).",
      email:
        "Manager-Customerservicesindia@aexp.com, Head-Customerservicesindia@aexp.com, AEBCNodalOfficer@aexp.com, Indiacollectionteam@aexp.com",
    },
    "Au Small Fin Bank Ltd": {
      address:
        "Rasmiranjan Sarangi, AU SMALL FINANCE BANK LIMITED Corporate House, G Block, 2nd Floor, Kanakia Zillion, Junction of LBS & CST Marg, BKC Annex, Kurla (West), Mumbai, PIN – 400070. Mr. Deepak Babber (Principal Nodal Officer) AU SMALL FINANCE BANK LIMITED Bank House, 6th Floor, Mile 0, Ajmer Road, Jaipur, Rajasthan, PIN – 302001.",
      email: "pno@aubank.in, rno.mumbai@aubank.in",
    },
    "Bajaj Fin": {
      address:
        "Mr. Rinku Anand – Principal Nodal Officer Bajaj Finance Ltd, 12th Floor, Aggarwal Metro Heights, Plot - E5, Netaji Subhash Place, Pitampura, New Delhi 110 034 Tel. No. 011-43127827. To Bajaj Finserv, 4th Floor, Corporate Office, off Pune-Ahmednagar Road, Viman Nagar, Pune-411014, Maharashtra, India",
      email:
        "ospno@bajajfinserv.in, collection.support@bajajfinserv.in, cdlegal@bajajfinserv.in, grievanceredressalteam@bajajfinserv.in, wecare@bajajfinserv.in, customerexperiencehead@bajajfinserv.in, investors@bajajfinserv.in",
    },
    "Bank of Baroda": {
      address:
        "Y V S Koteswara Rao Assistant General Manager Bank of Baroda, Regional Office, #10-1-44/10 & 11, Peejay Plaza, 3rd Floor, VIP Road, Opp. Hotel Tycoon, Visakhapatnam – 530003, Andhra Pradesh. Mr. Pankaj Mittal, General Manager (Operations & Services) Bank of Baroda, Head Office, Baroda Bhavan, R C Dutt Road, Alkapuri, BARODA - 390007, (Gujarat) India. Mr. Parshva Shah, 301 Orchid, Campa Cola Compund, B G Kher marg, Worli Naka Mumbai- 400018.",
      email:
        "rm.vis@bankofbaroda.com, cs.ho@bankofbaroda.com, LEGAL.HEADOFFICE@bankofbaroda.com, Advparshvashah.bfsl@gmail.com",
    },
    Cashe: {
      address: "CASHe, (Bhanix Finance)",
      email:
        "Collections.legal@cashe.co.in, Recovery@cashe.co.in, Pavan.mehta@cashe.co.in, support@cashe.co.in",
    },
    Cholamandalam: {
      address:
        "Mr. Krishnakumar K. P, Principal Nodal Officer, Cholamandalam Investment & Finance Company Limited (CIFCL), Chola Crest, C54-55 & Super B-4, Thiru-Vi-Ka Industrial Estate, Guindy, Chennai - 600032.",
      email:
        "principalnodalofficer@chola.murugappa.com, customercare@chola.murugappa.com",
    },
    CitiBank: {
      address:
        "Principal Nodal Officer, Hema L. Venkatesh, Citibank N.A. ., Mail Room, ACROPOLIS, 9th Floor, New Door No.148 (Old No.68), Dr. Radhakrishnan Salai, Mylapore, Chennai – 600 004",
      email:
        "regionalnodalofficer.south@citi.com, nrinfo@citi.com, nagaparameswary.g@citi.com, principal.nodal.officer@citi.com",
    },
    "Clix Capital": {
      address:
        "M/s Clix Capital Services Pvt. Ltd, 4th Floor, Kailash Building, Kasturba Gandhi Marg, Connaught Place, New Delhi- 110001",
      email:
        "hello@clix.capital, head.services@clix.capital, nodalofficer@clix.capital, rno.south@clix.capital, rno.north@clix.capital",
    },
    Cred: {
      address: "Grievance Redressal Officer, Mr. Atul Patro",
      email:
        "grievanceofficer@cred.club, support@cred.club, feedback@cred.club",
    },
    Creditt: {
      address:
        "Credify Technologies Pvt Ltd, 205, 2nd Floor, Embassy Centre, Nariman Point, Mumbai, Mumbai City MH 400021 IN",
      email: "customer.support@creditt.in, grievance@creditt.in",
    },
    DBS: {
      address:
        "Kapil Mathur, Vice President DBS Bank India Limited DLF Capital Point, Baba Khadak Singh Marg, Connaught Place, New Delhi 110001",
      email:
        "paymentrecall@dbs.com, customercareindia@dbs.com, dbsnodalofficer@dbs.com",
    },
    Fibe: {
      address:
        "EarlySalary Office no. 404, The Chambers, (Samrat Chowk), Clover Park, Near Ganpati Chowk, Viman Nagar, Pune, Maharashtra 411014",
      email: "care@fibe.com, grievance@fibe.in",
    },
    Finable: {
      address:
        "Finnable, Grievance Redressal Officer, Miss: Suman Kumari, IndiQube Lakeside, 4th Floor Municipal No. 80/2 Wing A, Bellaandur Village, Varthur Hobli, Bengaluru, KA 560103 IN",
      email:
        "gro@finnable.com, makeiteasy@finnable.com, customercare@finnable.com",
    },
    "Fullerton (SMFG)": {
      address:
        "Mr. Ritesh Saxena, Grievance Redressal Officer, B wing, 6th Floor, Supreme Business Park, Hiranandani, Powai, Mumbai – 400072",
      email:
        "namaste@smfgindia.com, GRO@smfgindia.com, PNO@smfgindia.com, CCRC@smfgindia.com",
    },
    HDB: {
      address:
        "Mr. Harish Kumar K, HDB Financial Services Limited, New No: 128/4F Old No: Door No: 53 A, 4th Floor Greams Road, M. N. Office Complex, Chennai - 600006",
      email: "gro@hdbfs.com, customer.support@hdbfs.com",
    },
    HDFC: {
      address:
        "Samir Tiwari, Nodal officer, HDFC Bank House, Vatika Atrium, A - Block, Golf Course Road, Sector 53, Gurgaon – 122002",
      email:
        "support@hdfcbank.com, customerservices.cards@hdfcbank.com, loansupport@hdfcbank.com",
    },
    "Hero Fincorp": {
      address:
        "Hero Fincorp, Grievance Redressal Cell, Hero FinCorp Ltd., A-44, Mohan Co-Operative Industrial Estate, Mathura Road, New Delhi – 110044",
      email: "Corporate.care@HeroFinCorp.com, nodal.officer@herofincorp.com",
    },
    "Home credit": {
      address:
        "Mr. Vishal Sharma, Grievance Redressal Officer, Customer Care Department, Home Credit India Finance Private Limited, DLF Infinity Towers, Tower C, 3rd Floor, DLF Cyber City Phase II, Gurgaon-122002, India",
      email: "grievanceofficer@homecredit.co.in, care@homecredit.co.in",
    },
    HSBC: {
      address:
        "Mr. Koustubh Vaishampayan, The Hongkong and Shanghai Banking Corporation Limited 6-3-1107 & 1108, Raj Bhavan Road, Somajiguda, Hyderabad – 500082",
      email: "complaints.india@hsbc.co.in, pnohsbcbank@hsbc.co.in",
    },
    ICICI: {
      address:
        "The Principal Nodal Officer ICICI Bank Ltd Bandra Kurla Complex Mumbai 400051 Telephone No.: 022-40088027 or 022-66968027",
      email:
        "Customer.care@icicibank.com, headdematservices@icicibank.com, headservicequality@icicibank.com",
    },
    IDFC: {
      address:
        "Nitin Dange, RNO IDFC FIRST Bank Ltd, 3rd Floor Building no 2 Raheja Mindspace, Jui Nagar MIDC Industrial Estate Shiravane Nerul, Navi Mumbai, Maharashtra 400706",
      email:
        "RNO.Mumbai@idfcfirstbank.com, Creditcard@idfcfirstbank.com, pno@idfcfirstbank.com",
    },
    IIFL: {
      address:
        "IIFL Finance Limited, IIFL House, Sun Infotech Park, Road No. 16V, Plot No. B-23, Thane Industrial Area, Wagle Estate, Thane – 400064",
      email: "nodalofficer@iifl.com, pno@iifl.com, legal.section@iifl.com",
    },
    "Indus Ind": {
      address:
        "Mr. Pratap Pillai Head - Cards Services 701/801 Solitaire Corporate Park 167, Guru Hargovindji Marg, Andheri-Ghatkopar Link Road, Chakala Andheri (East), Mumbai - 400 093",
      email:
        "head.cardservices@indusind.com, customercare@indusind.com, nodal.officer@indusind.com",
    },
    "Jupiter money": {
      address:
        "Mr Vivek Agarwal : Grievance Officer of the Company (Amica Financial Technologies Private Limited), Jupiter Money Changers Private Limited registered address is 39/4518, IInd Floor Haltrust Building, Karimpatta Cross Road, Pallimuk Kochi Ernakulam KL 682016 IN",
      email:
        "alert@jupiter.money, grievance@jupiter.money, info@mmtcpamp.com, privacy@jupiter.money, nodalofficer@jupiter.money",
    },
    "Kisetsu saison Finance": {
      address:
        "Kisetsu Saison Finance (India) Private Limited registered address is 496/4, 2nd Floor, 10th Cross Sadashivanagar BANGALORE Bangalore-560080 Karnataka",
      email:
        "grievance@creditsaison-in.com, preethi.nair@creditsaison-in.com, kosuke.mori@creditsaison-ap.com, support@creditsaison-in.com",
    },
    "Kotak Bank": {
      address:
        "Nodal Officer, Mr. A. Sen Address: Kotak Infiniti, 4th Floor, Zone 4 Bulding No.21, Infinity Park, Off Western express Highway, General AK Vaidya Marg, Malad (E), Mumbai – 400097",
      email:
        "consumerassets.legal@kotak.com, care@kotak.com, grievanceofficer@kotak.com, seniorgrievanceofficer@kotak.com, chiefgrievanceofficer@kotak.com",
    },
    KreditBee: {
      address:
        "KreditBee, 16/3, Adarsh Yelavarthy Centre, opp to Frank Anthony School, Cambridge Layout, Jogupalya Bangalore Karnataka 560008",
      email:
        "grievance@kreditbee.in, help@kreditbee.in, reachus@kbnbfc.in, grievance@kreditbee.in, media@kreditbee.in",
    },
    "Faircent Technologies India Pvt Ltd": {
      address:
        "Faircent Technologies India Pvt Ltd. Ms. Nidhi Tripathi, Grievance Officer Faircent",
      email: "grievance@faircent.com, support@faircent.com",
    },
    Mobikwik: {
      address:
        "One MobiKwik Systems Limited, Unit 102, Block B, Pegasus One, Golf Course Road, DLF Phase 5, Sector 53, Gurugram, Haryana 122003",
      email:
        "grievance@mobikwik.com, support@Mobikwik.com, partners@mobikwik.com, nodal@mobikwik.com",
    },
    Prefer: {
      address:
        "Prefr, Grievance Redressal Officer, Moksh Jain, Carnival House, Near Dindoshi Fire Station, Off. General A.K. Vaidya Marg, Malad (East), Mumbai, Maharashtra, 400097",
      email: "Nodal.officer@prefr.com, wecare@prefr.com",
    },
    PayU: {
      address:
        "Grievance Redressal Officer–PayU Akash Wagh PayU Finance India Private Limited, Empresa Building, Office No. 102, First Floor, Second Road, Khar West, Mumbai – 400052",
      email:
        "wecare@lazypay.in, grievanceredressalofficer@lazypay.in, carehead@lazypay.in, Ridhi.mehta@payufin.com",
    },
    "Lending Plate": {
      address:
        "Lending Plate, Chawla House 3rd Floor, 19 Nehru Place, New Delhi-110019",
      email: "care@lendingplate.com, legal@lendingplate.com",
    },
    "Lenditt (Chimnay Finlease Ltd)": {
      address:
        "CHINMAY FINLEASE LTD, MAHESH BHUVAN AZAD CHOWK AT & PO BHABHAR DIST BANASKANTHA GJ 385320",
      email: "support@lenditt.com, info@lenditt.com, satvinder@lenditt.com",
    },
    LoanTap: {
      address:
        "LoanTap Financial Technologies Private Limited, Corporate Office Address 306, Sangeeta Ramchand (Kartik) CHSL, 5 Kartik Complex, Opp Laxmi Ind Estate Andheri (W) Mumbai, Mumbai City MH 400053 IN",
      email:
        "finance@loantap.in, cs.loantapcredit@help.loantap.in, cs.iloan@help.loantap.in, cs.fintech@loantap.in",
    },
    MoneyTap: {
      address:
        "NODAL GRIEVANCE REDRESSAL OFFICER, ANJALI PAWAR, G 405, 4TH FLOOR- GAMMA BLOCK, SIGMA SOFT TECH PARK VARTHUR, KODI WHITEFIELD POST, BANGALORE-560066",
      email: "hello@moneytap.com",
    },
    "DMI Finance Pvt Ltd": {
      address:
        "M/s DMI Finance Pvt Ltd, 9-10, 3rd Floor, Express Building, Bhadurshah Zafar Marg, New Delhi – 110002",
      email: "support@mvloans.in",
    },
    Navi: {
      address:
        "Sikha Gupta, Customer Support Manager Navi Finserv, Koramangala, 3rd Block Bangalore, Karnataka 560034",
      email: "Grievance@navi.com, help@navi.com, Nodaloffice@navi.com",
    },
    Paysense: {
      address:
        "Paysense Jaivilla Dev Shakti, 49 Tilak Road, Navyug Colony, Santacruz West, Mumbai, 400054 Maharashtra, India",
      email: "grievance@paysense.in, support@gopaysense.com",
    },
    Paytm: {
      address:
        "Mr. Aditya Ranade, Grievance Redressal Officer-PAYTM (One97 Communication Ltd.), Skymark One, Shop No.1, Ground Floor, Tower-D, Plot No. H-10B, Sector 98, Noida, UP-201301",
      email: "grievance-redressal_lending@paytm.com",
    },
    "Poonawala Fin": {
      address:
        "Poonawala Finance, S. No. 83 Ground Floor, AP81, Mundhwa PUNE 411036, Maharashtra",
        email:
        "rati.mundra@poonawallafincorp.com, pno@poonawallafincorp.com, customercare@poonawallafincorp.com",
    },
    Prefr: {
      address:
        "Prefr, Grievance Redressal Officer, Moksh Jain, Carnival House, Near Dindoshi Fire Station, Off. General A.K. Vaidya Marg, Malad (East), Mumbai, Maharashtra, 400097",
      email: "Nodal.officer@prefr.com, wecare@prefr.com",
    },
    "RBL Bank": {
      address:
        "Manager - Credit Cards Service, RBL Bank Limited Cards Operating Centre - COC, JMD Megapolis, Unit No 306-311 - 3rd Floor, Sohna Road, Sector 48, Gurgaon, Haryana 122018",
      email:
        "principalnodalofficercards@rblbank.com, cardservices@rblbank.com, supercardservice@rblbank.com, headcardservice@rblbank.com, customercare@rblbank.com",
    },
    Moneyview: {
      address:
        "M/s Whizdm Innovations Pvt Ltd (Money View), 3rd Floor, Survey No. 17, 1A, Outer Ring Rd, Kadubeesanahalli, Bellandur, Bengaluru, Karnataka 560087",
      email:
        "payments@moneyview.in, loans@moneyview.in, grievance@moneyview.in",
    },
    "Standard Chartered Bank": {
      address:
        "Standard Chartered Bank, Customer Care Unit, 19 Rajaji Salai, Chennai 600 001",
      email:
        "customer.care@sc.com, Priority.Banking@sc.com, Head.Service@sc.com, Nodal.Officer@sc.com, Principal.NodalOfficer@sc.com, Straight2Bank.In@sc.com",
    },
    Onecard: {
      address: "Onecard, A-13 Varsha Park Baner Gaon Pune - 411045",
      email:
        "help@getonecard.app, grievances@fplabs.tech, LEGAL.HEADOFFICE@bankofbaroda.com",
    },
    "Early Salary": {
      address:
        "EarlySalary Office no. 404, The Chambers, (Samrat Chowk), Clover Park, Near Ganpati Chowk, Viman Nagar, Pune, Maharashtra 411014",
      email: "care@fibe.com, grievance@fibe.in",
    },
    "L&T": {
      address:
        'Mr. Vinod Varadan Grievance Redressal Officer L&T Finance Ltd, 7th Floor, "Brindavan Building", Plot No 177, C.S.T Road, Kalina, Santacruz (East), Mumbai-400098',
      email: "customercare@ltfs.com, gro@ltfs.com, pno@ltfs.com",
    },
    Cashmypayment: {
      address:
        "520, SOMDATT CHAMBER-II 9 BHIKAJI CAMA PLACE NEW DELHI South Delhi DL 110066 IN",
      email: "info@cashmypayment.com, grievance@cashmypayment.com",
    },
    DayTodayloan: {
      address:
        "B-57, Basement, New Krishna Park, Vikaspuri, New Delhi, Delhi 110018",
      email: "info@daytoday.com, grievance@daytodayloan.com",
    },
    Easyfincare: {
      address:
        "3 Kehar Singh Estate, 3rd Floor, Lane No - 2, Westend Marg, Saidulajab, New Delhi – 110030",
      email:
        "info@easyfincare.com, grievance@easyfincare.com, disbursal@easyfincare.com",
    },
    "Everyday loan india": {
      address: "B-51, 3rd Floor, New Krishana Park Vikaspuri, Delhi-18",
      email: "info@everydayloanindia.com, grievance@gssasl.com",
    },
    "Rupee 112": {
      address:
        "TASLEEM SAIFI, 498, Third Floor, Udyog Vihar Phase 3, Gurugram, Haryana 122016",
      email: "care@rupee112.com, info@rupee112.com",
    },
    "Loan in need": {
      address:
        "Office No - 202, PLOT 9, Veer Savarkar Block, Guru Nanak Nagar, Shakarpur, Delhi, 110092",
      email: "info@loaninneed.in, grievance@loaninneed.in, admin@loaninneed.in",
    },
    Xpressloan: {
      address:
        "Third Floor, WA-118, Plot No-2, Mother Dairy Road, Shakarpur, East Delhi Delhi, 110092",
      email: "info@xpressloan.in, grievance@xpressloan.in",
    },
    LendingClub: {
      address:
        "Mr. Pratik Kharel Address: Unit No. 5, Mezzanine Floor, DLH Park, SV Rd., Goregaon West, Mumbai – 400 062",
      email: "cs@lendenclub.com, grievance@lendenclub.com",
    },
    "Nira Finance": {
      address:
        "GRIEVANCE OFFICER GOUTHAM R, No. 2024, 2nd Floor, UrbanVault, 16th Main Road, HAL 2nd Stage, Indiranagar, Bengaluru - 560008",
      email:
        "goutham.r@nirafinance.com, support@nirafinance.com, supportsafety@nirafinance.com",
    },
    "Payme India": {
      address:
        "Mr. Gajendra Pratap Singh, Grievance Redressal Officer (Payme India)",
      email:
        "grievance@paymeindia.in, gajendra.pratap@paymeindia.in, care@pmifs.com",
    },
    "Rupee redee": {
      address:
        "Mr. Ram Prasad Aryal Address: Fincfriends Private Limited, 7th Floor, Vatika Triangle, Mehrauli-Gurgaon Road, Block B, Sushant Lok Phase I, Gurugram, Haryana – 122002",
      email: "GRO@rupeeredee.com, GRO@fincfriends.in, info@fincfriends.in",
    },
    "Shriram Finance": {
      address:
        "Mr. Sanjiv Gyani, Grievance Redressal Officer, Shriram Housing Finance Limited, Level 3, Wockhardt Towers, East Wing, Bandra Kurla Complex, Mumbai 400051 Ph : 022 – 4241 0400, GRO Address: Uma Maheswari VR, Grievance Redressal Officer, Shriram Finance Limited, 12 Ramasamy Street, T Nagar, Chennai 600 017",
      email: "customersupport@shriramfinance.in, grievance@shriramfinance.in",
    },
    Stashfin: {
      address:
        "Mr. Sanjeev Walia, Grievance Redressal Officer, CRC-2, 1st Floor, Khasra No. 337, Mehrauli-Gurgaon Rd, Sultanpur, New Delhi, Delhi 110030",
      email:
        "grievance.officer@stashfin.com, cofficer@akaracap.com, Legal.backend@stashfin.com",
    },
    "Vivi Fin": {
      address:
        "Vivifi India Finance Pvt. Ltd., Unit-A, 9th Floor, MJR Magnifique, Survey Nos. 75 and 76, Khajaguda X Roads, Raidurgam, Hyderabad, Telangana, 500008",
      email: "support@vivifin.com, prakash.rajan@vivifin.co",
    },
    SBI: {
      address:
        "SBI Cards & Payments Services Ltd., DLF Infinity Towers, Tower C, 12th floor, Block 2, Building 3, DLF Cyber City, Gurgaon 122002",
      email:
        "customercare@sbicard.com, customercare@sbi.co.in, nodalofficer@sbicard.com, PrincipalNodalOfficer@sbicard.com, customerservicehead@sbicard.com",
    },
    Slice: {
      address:
        "Slice Vikram Krishnan, Grievance Redressal Officer 747, Pooja Building, 4th Block, 80 Ft. Road, Koramangala, Bangalore - 560034",
      email:
        "customergrievance@sliceit.com, help@sliceit.com, legal@sliceit.com",
    },
    SmartCoin: {
      address:
        "SmartCoin Financials Pvt Ltd. Indiqube Gama, No.293/154/172, 1st Floor, Outer Ring Road, Kadubeesanahalli, Bengaluru, Karnataka- 560103",
      email: "grievance@smartcoin.co.in",
    },
    "Tata Capital": {
      address:
        "Mr. Rajesh Kumar, Principal Nodal Officer Address: Tata Capital Financial Services Limited, Lodha I-Think Techno Campus Building, Building A, 4th Floor, Off Pokhran Road No 2, Thane (West) 400 607",
      email:
        "customercare@tatacapital.com, contactcommercialfinance@tatacapital.com, contactus@tatacapital.com, vaman.n@tatacapital.com, rajesh13.Kumar@tatacapital.com",
    },
    "True Balance": {
      address:
        "True Balance, Grievance Redressal Officer- Mr. Nikhil Niranjan Address: 5th Floor, Huda City Centre Metro Staon, Gurugram, Haryana -122001",
      email: "grievance@truecredits.in, info@truecredits.in, cs@truecredits.in",
    },
    "Yes Bank": {
      address:
        "Mr. Taroon Shahani YES Bank Ltd YES Bank House, Off Western Express Highway, Santacruz East, Mumbai 400055",
      email:
        "principal.nodalofficer@yesbank.in, yestouch@yesbank.in, head.grievanceredressal@yesbank.in",
    },
    "Zest Money": {
      address:
        "ZestMoney (Camden Town Technologies Pvt Ltd), Groung & Third Floor, Indiqube Celestia, Site No. 19 & 20, Koramangala 1A Block, Koramangala, Bengaluru, Karnataka – 560034",
      email:
        "cxoforyou@zestmoney.in, help@zestmoney.in, bhavya@zestmoney.in, Complaints@zestmoney.in",
    },
    Zype: {
      address:
        "Zype, Grievance Redressal Officer, Mr. Swapnil Kinalekar, 2nd Floor, Dyna Buisness Park, Street No. 1, MIDC Andheri (East), Mumbai-400093",
      email: "support@getzype.com, recovery@getzype.com",
    },
    "Federal Bank": {
      address:
        "Ms. Shalini Warrier, Executive Director and Principal Nodal Officer  CEO's Secretariat, The Federal Bank Ltd. Federal Towers, Aluva, Kerala. FPL Technologies Pvt. Ltd., Disha Bldg., Survey No 127, Mahavir Park, Opposite Sarjaa, Aundh, Pune 411007",
      email:
        "creditcards@federalbank.co, contact@federalbank.co.in, support@federalbank.co.in",
    },

    "Northern Arc Bank": {
      address:
        "IndiQube Golf View Homes, 6th Floor, Tower B, 3rd Cross Road, S R Layout, Murgesh Pallya, Bengaluru – 560017 Mr. Madhan Mohan K, IndiQube Golf View Homes, 6th Floor, Tower B, 3rd Cross Road, S R Layout, Murgesh Pallya, Bengaluru-560017",
      email:
        "customersupport@northernarc.com, gro@northernarc.com, nodal.officer@northernarc.com",
    },
  };

  // Update email content when a draft is selected
  useEffect(() => {
    const draft = draftTemplates.find((d) => d.id === selectedDraft);
    if (draft) {
      setEmailContent(draft.content);

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
  }, [selectedDraft]);

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

    setTempClientId(""); // Reset selection
    toast.success(`${client.name} added as recipient`);
  };

  // Handle bank selection and add bank emails as recipients
  const handleBankChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const bankName = e.target.value;
    setSelectedBank(bankName);
  };

  // Add bank emails as recipients
  const handleAddBankRecipient = () => {
    if (!selectedBank || !banks[selectedBank as keyof typeof banks]) {
      toast.error("Please select a bank");
      return;
    }

    const bankEmails =
      banks[selectedBank as keyof typeof banks].email.split(", ");

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
    if (!selectedBank || !banks[selectedBank as keyof typeof banks]) {
      toast.error("Please select a bank");
      return;
    }

    const bankEmails =
      banks[selectedBank as keyof typeof banks].email.split(", ");

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
    console.log("Starting email submission process...");

    // Validate form
    if (recipients.length === 0) {
      toast.error("Please add at least one recipient");
      console.log("Validation failed: No recipients");
      return;
    }

    // Validate subject - either selected or custom
    const currentSubject = isCustomSubject
      ? customSubject
      : getCurrentSubjectText();
    if (!currentSubject.trim()) {
      toast.error("Please enter a subject");
      console.log("Validation failed: No subject");
      return;
    }

    if (!emailContent.trim()) {
      toast.error("Please enter email content");
      console.log("Validation failed: No email content");
      return;
    }

    // Set loading state
    setLoading(true);

    try {
      console.log("Converting file attachments to base64...");
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
      console.log(
        `Processed ${processedAttachments.length} attachments successfully`
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

      console.log("Email data prepared:", {
        subject: currentSubject,
        recipientCount: recipients.length,
        ccRecipientCount: ccRecipients.length,
        recipientTypes: recipients.map((r) => r.type),
        attachmentCount: processedAttachments.length,
        contentLength: emailContent.length,
        clientId: recipients.find((r) => r.type === "client")?.clientId,
        bankId: selectedBank || undefined,
      });

      // Make sure user is authenticated
      if (!auth.currentUser) {
        toast.error("You must be logged in to send emails");
        console.log("Authentication error: User not logged in");
        setLoading(false);
        return;
      }

      console.log("User authenticated, preparing to call cloud function...");
      // Call the sendEmail cloud function
      const sendEmailFn = httpsCallable(functions, "sendEmail");
      console.log("Calling sendEmail cloud function...");

      try {
        const result = await sendEmailFn(emailData);
        console.log("Cloud function response received:", result);

        // Cast result to the expected return type
        const response = result.data as {
          success: boolean;
          messageId?: string;
          emailId?: string;
        };

        if (response.success) {
          console.log(
            "Email sent successfully with messageId:",
            response.messageId
          );
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
      console.log("Email submission process completed");
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

    setTempClientId(""); // Reset selection
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
                    >
                      <option value="">Select a bank</option>
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
                        disabled={!selectedBank}
                      >
                        <FaPlus size={12} className="mr-1" />
                        Add as Recipient
                      </button>
                      <button
                        type="button"
                        onClick={handleAddBankCcRecipient}
                        className="flex-1 px-3 py-2 bg-amber-700 hover:bg-amber-600 text-white rounded-md transition-colors flex items-center justify-center"
                        disabled={!selectedBank}
                      >
                        <FaPlus size={12} className="mr-1" />
                        Add as CC
                      </button>
                    </div>
                  </div>
                  {selectedBank && (
                    <p className="mt-1 text-xs text-gray-400">
                      All emails from {selectedBank} will be added
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
