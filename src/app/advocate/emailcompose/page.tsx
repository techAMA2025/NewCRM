"use client";

import { useState, useEffect, useRef, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import AdvocateSidebar from "@/components/navigation/AdvocateSidebar";
import { FaEnvelope, FaPaperPlane, FaFileAlt, FaUser, FaPaperclip, FaTimes, FaFile, FaPlus, FaUserPlus } from 'react-icons/fa';
import { Toaster, toast } from 'react-hot-toast';

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
  type: 'client' | 'bank'; // To distinguish between client and bank recipients
}

export default function EmailComposePage() {
  // States for form elements
  const [selectedDraft, setSelectedDraft] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [tempClientId, setTempClientId] = useState('');
  const [selectedBank, setSelectedBank] = useState('');
  const [emailContent, setEmailContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Sample data (in a real app, these would come from an API)
  const draftTemplates = [
    { id: 'draft1', name: 'Follow-up Meeting', content: 'Dear [Client],\n\nI hope this email finds you well. I wanted to follow up on our recent meeting...' },
    { id: 'draft2', name: 'Case Update', content: 'Dear [Client],\n\nI am writing to provide you with an update on your case...' },
    { id: 'draft3', name: 'Document Request', content: 'Dear [Client],\n\nIn order to proceed with your case, we require the following documents...' },
    { id: 'draft4', name: 'Settlement Offer', content: 'Dear [Client],\n\nWe have received a settlement offer from the bank regarding your case...' },
    { id: 'draft5', name: 'Legal Proceedings Update', content: 'Dear [Client],\n\nI am writing to update you on the legal proceedings related to your case...' },
  ];
  
  const subjectTemplates = [
    { id: 'subject1', text: 'Follow-up: Our Meeting on [Date]' },
    { id: 'subject2', text: 'Update on Your Case [Case Number]' },
    { id: 'subject3', text: 'Important: Document Request' },
    { id: 'subject4', text: 'Consultation Appointment Confirmation' },
    { id: 'subject5', text: 'Settlement Offer: [Case Reference]' },
    { id: 'subject6', text: 'Legal Update: [Case Number]' },
  ];
  
  // Sample client data - in a real app, fetch from API
  const clients = [
    { id: 'client1', name: 'John Doe', email: 'john.doe@example.com' },
    { id: 'client2', name: 'Jane Smith', email: 'jane.smith@example.com' },
    { id: 'client3', name: 'Robert Johnson', email: 'robert.j@example.com' },
    { id: 'client4', name: 'Sarah Williams', email: 'sarah.w@example.com' },
    { id: 'client5', name: 'Michael Brown', email: 'michael.b@example.com' },
    { id: 'client6', name: 'Lisa Davis', email: 'lisa.d@example.com' },
  ];

  const router = useRouter();
  
  // Sample bank data (similar to what's in requestletter.tsx)
  const banks = {
    "Axis Bank": {
      address: "Mr. Sandeep Dam, Nodal officer Axis Bank Ltd, Axis House, Tower 3, 4th Floor, Sector128, Noida, UP- 201304. Landline No: 0120-6210005. Mr. Caesar Pinto, Nodal Officer, Axis Bank LTD. NPC1, 5th Floor \"Gigaplex\", Plot No .I.T 5, MIDC Airoli Knowledge Park, Airoli, Navi Mumbai – 400708. Mrs. Neeta Bhatt Principal Nodal Officer, Axis Bank LTD. 4th Floor, Axis House, Wadia International Center, P.B. Marg, Worli, Mumbai – 400 025. Axis Bank Limited, 'Axis House', C-2, Wadia International Centre, Pandurang Budhkar Marg, Worli, Mumbai - 400 025. Axis Bank Limited, 'Trishul', 3rd Floor, Opp. Samartheshwar Temple, Near Law Garden, Ellisbridge, Ahmedabad - 380 006",
      email: "Circlenodalofficer.delhi1@axisbank.com, nodal.officer@axisbank.com, pno@axisbank.com"
    },
    "Ashv Finance Limited": {
      address: "Ashv Finance Limited,12B 3rd Floor, Techniplex II, Off Veer Savarkar, Goregaon West, Mumbai, Maharashtra-400062. Grievance Redressal Officer, Ms. Monika Thadeshwar, 12B 3rd Floor, Techniplex II, Off Veer Savarkar, Goregaon West, Mumbai, Maharashtra-400062.",
      email: "monika.thadeshwar@ashvfinance.com, info@ashvfinance.com, customersupport@ashvfinance.com"
    },
    "Niro": {
      address: "Corporate Office: No 313/1 Workden, Ground floor, 7th Cross Patel, Rama Reddy Road, Domlur Layout, Bangalore 560071. Registered Office: 17/1 Bharat Apartments, 44/1, Fair field Layout, Race course road, Bengaluru, Karnataka – 560 001",
      email: "support@niro.money, grievance@niro.money, info@niro.money"
    },
    "Aditya Birla Fin": {
      address: "Ms Rachana Padval, Aditya Birla Finance Limited,10th Floor, R-Tech Park, Nirlon Complex, Goregaon, Mumbai – 400063. Principal Nodal Officer Ms Smita Nadkarni, Aditya Birla Finance Limited,10th Floor, R-Tech Park, Nirlon Complex, Goregaon, Mumbai – 400063. Aditya Birla Finance Limited (A subsidiary of Aditya Birla Capital Ltd.) One World Center, Tower 1-C, 18th Floor, 841, Jupiter Mill Compound, Senapati Bapat Marg, Elphinstone Road, Mumbai 400 013. Mr Abhinav Chaudhry. Aditya Birla Housing Finance - Customer Service Cell, R Tech Park, 10th Floor, Niroln Complex, Off Western Express Highway Goregaon East, Mumbai - 400063. Aditya Birla Finance Limited (A subsidiary of Aditya Birla Capital Ltd.) Indian Rayon Compound, Veraval, Gujarat -362 266.",
      email: "abfl.nodalofficerwest@adityabirlacapital.com, grievance.finance@adityabirlacapital.com, care.finance@adityabirlacapital.com, abhinav.c@adityabirlacapital.com, care.digitalfinance@adityabirlacapital.com, preethi.nair@adityabirlacapital.com"
    },
    "Amex": {
      address: "Manager - Executive Correspondence Unit, American Express Banking Corp. Cyber City, Tower C, DLF Building No.8 Sector 25, DLF City Ph II, Gurgaon – 122002. Ms. Priyameet Kaur, Head of Customer Service American Express Banking Corp. Cyber City, Tower C, DLF Building No.8, Sector 25, DLF City Ph II, Gurgaon – 122002 (Haryana). Mr. Ashish Pandey, Nodal Officer, American Express Banking Corp. Cyber City, Tower C, DLF Building No.8, Sector 25, DLF City Ph II, Gurgaon – 122002 (Haryana).",
      email: "Manager-Customerservicesindia@aexp.com, Head-Customerservicesindia@aexp.com, AEBCNodalOfficer@aexp.com, Indiacollectionteam@aexp.com"
    },
    "Au Small Fin Bank Ltd": {
      address: "Rasmiranjan Sarangi, AU SMALL FINANCE BANK LIMITED Corporate House, G Block, 2nd Floor, Kanakia Zillion, Junction of LBS & CST Marg, BKC Annex, Kurla (West), Mumbai, PIN – 400070. Mr. Deepak Babber (Principal Nodal Officer) AU SMALL FINANCE BANK LIMITED Bank House, 6th Floor, Mile 0, Ajmer Road, Jaipur, Rajasthan, PIN – 302001.",
      email: "pno@aubank.in, rno.mumbai@aubank.in"
    },
    "Bajaj Fin": {
      address: "Mr. Rinku Anand – Principal Nodal Officer Bajaj Finance Ltd, 12th Floor, Aggarwal Metro Heights, Plot - E5, Netaji Subhash Place, Pitampura, New Delhi 110 034 Tel. No. 011-43127827. To Bajaj Finserv, 4th Floor, Corporate Office, off Pune-Ahmednagar Road, Viman Nagar, Pune-411014, Maharashtra, India",
      email: "ospno@bajajfinserv.in, collection.support@bajajfinserv.in, cdlegal@bajajfinserv.in, grievanceredressalteam@bajajfinserv.in, wecare@bajajfinserv.in, customerexperiencehead@bajajfinserv.in, investors@bajajfinserv.in"
    },
    "Bank of Baroda": {
      address: "Y V S Koteswara Rao Assistant General Manager Bank of Baroda, Regional Office, #10-1-44/10 & 11, Peejay Plaza, 3rd Floor, VIP Road, Opp. Hotel Tycoon, Visakhapatnam – 530003, Andhra Pradesh. Mr. Pankaj Mittal, General Manager (Operations & Services) Bank of Baroda, Head Office, Baroda Bhavan, R C Dutt Road, Alkapuri, BARODA - 390007, (Gujarat) India. Mr. Parshva Shah, 301 Orchid, Campa Cola Compund, B G Kher marg, Worli Naka Mumbai- 400018.",
      email: "rm.vis@bankofbaroda.com, cs.ho@bankofbaroda.com, LEGAL.HEADOFFICE@bankofbaroda.com, Advparshvashah.bfsl@gmail.com"
    },
    "Cashe": {
      address: "CASHe, (Bhanix Finance)",
      email: "Collections.legal@cashe.co.in, Recovery@cashe.co.in, Pavan.mehta@cashe.co.in, support@cashe.co.in"
    },
    "Cholamandalam": {
      address: "Mr. Krishnakumar K. P, Principal Nodal Officer, Cholamandalam Investment & Finance Company Limited (CIFCL), Chola Crest, C54-55 & Super B-4, Thiru-Vi-Ka Industrial Estate, Guindy, Chennai - 600032.",
      email: "principalnodalofficer@chola.murugappa.com, customercare@chola.murugappa.com"
    },
    "CitiBank": {
      address: "Principal Nodal Officer, Hema L. Venkatesh, Citibank N.A. ., Mail Room, ACROPOLIS, 9th Floor, New Door No.148 (Old No.68), Dr. Radhakrishnan Salai, Mylapore, Chennai – 600 004",
      email: "regionalnodalofficer.south@citi.com, nrinfo@citi.com, nagaparameswary.g@citi.com, principal.nodal.officer@citi.com"
    },
    "Clix Capital": {
      address: "M/s Clix Capital Services Pvt. Ltd, 4th Floor, Kailash Building, Kasturba Gandhi Marg, Connaught Place, New Delhi- 110001",
      email: "hello@clix.capital, head.services@clix.capital, nodalofficer@clix.capital, rno.south@clix.capital, rno.north@clix.capital"
    },
    "Cred": {
      address: "Grievance Redressal Officer, Mr. Atul Patro",
      email: "grievanceofficer@cred.club, support@cred.club, feedback@cred.club"
    },
    "Creditt": {
      address: "Credify Technologies Pvt Ltd, 205, 2nd Floor, Embassy Centre, Nariman Point, Mumbai, Mumbai City MH 400021 IN",
      email: "customer.support@creditt.in, grievance@creditt.in"
    },
    "DBS": {
      address: "Kapil Mathur, Vice President DBS Bank India Limited DLF Capital Point, Baba Khadak Singh Marg, Connaught Place, New Delhi 110001",
      email: "paymentrecall@dbs.com, customercareindia@dbs.com, dbsnodalofficer@dbs.com"
    },
    "Fibe": {
      address: "EarlySalary Office no. 404, The Chambers, (Samrat Chowk), Clover Park, Near Ganpati Chowk, Viman Nagar, Pune, Maharashtra 411014",
      email: "care@fibe.com, grievance@fibe.in"
    },
    "Finable": {
      address: "Finnable, Grievance Redressal Officer, Miss: Suman Kumari, IndiQube Lakeside, 4th Floor Municipal No. 80/2 Wing A, Bellaandur Village, Varthur Hobli, Bengaluru, KA 560103 IN",
      email: "gro@finnable.com, makeiteasy@finnable.com, customercare@finnable.com"
    },
    "Fullerton (SMFG)": {
      address: "Mr. Ritesh Saxena, Grievance Redressal Officer, B wing, 6th Floor, Supreme Business Park, Hiranandani, Powai, Mumbai – 400072",
      email: "namaste@smfgindia.com, GRO@smfgindia.com, PNO@smfgindia.com, CCRC@smfgindia.com"
    },
    "HDB": {
      address: "Mr. Harish Kumar K, HDB Financial Services Limited, New No: 128/4F Old No: Door No: 53 A, 4th Floor Greams Road, M. N. Office Complex, Chennai - 600006",
      email: "gro@hdbfs.com, customer.support@hdbfs.com"
    },
    "HDFC": {
      address: "Samir Tiwari, Nodal officer, HDFC Bank House, Vatika Atrium, A - Block, Golf Course Road, Sector 53, Gurgaon – 122002",
      email: "support@hdfcbank.com, customerservices.cards@hdfcbank.com, loansupport@hdfcbank.com"
    },
    "Hero Fincorp": {
      address: "Hero Fincorp, Grievance Redressal Cell, Hero FinCorp Ltd., A-44, Mohan Co-Operative Industrial Estate, Mathura Road, New Delhi – 110044",
      email: "Corporate.care@HeroFinCorp.com, nodal.officer@herofincorp.com"
    },
    "Home credit": {
      address: "Mr. Vishal Sharma, Grievance Redressal Officer, Customer Care Department, Home Credit India Finance Private Limited, DLF Infinity Towers, Tower C, 3rd Floor, DLF Cyber City Phase II, Gurgaon-122002, India",
      email: "grievanceofficer@homecredit.co.in, care@homecredit.co.in"
    },
    "HSBC": {
      address: "Mr. Koustubh Vaishampayan, The Hongkong and Shanghai Banking Corporation Limited 6-3-1107 & 1108, Raj Bhavan Road, Somajiguda, Hyderabad – 500082",
      email: "complaints.india@hsbc.co.in, pnohsbcbank@hsbc.co.in"
    },
    "ICICI": {
      address: "The Principal Nodal Officer ICICI Bank Ltd Bandra Kurla Complex Mumbai 400051 Telephone No.: 022-40088027 or 022-66968027",
      email: "Customer.care@icicibank.com, headdematservices@icicibank.com, headservicequality@icicibank.com"
    },
    "IDFC": {
      address: "Nitin Dange, RNO IDFC FIRST Bank Ltd, 3rd Floor Building no 2 Raheja Mindspace, Jui Nagar MIDC Industrial Estate Shiravane Nerul, Navi Mumbai, Maharashtra 400706",
      email: "RNO.Mumbai@idfcfirstbank.com, Creditcard@idfcfirstbank.com, pno@idfcfirstbank.com"
    },
    "IIFL": {
      address: "IIFL Finance Limited, IIFL House, Sun Infotech Park, Road No. 16V, Plot No. B-23, Thane Industrial Area, Wagle Estate, Thane – 400064",
      email: "nodalofficer@iifl.com, pno@iifl.com, legal.section@iifl.com"
    },
    "Indus Ind": {
      address: "Mr. Pratap Pillai Head - Cards Services 701/801 Solitaire Corporate Park 167, Guru Hargovindji Marg, Andheri-Ghatkopar Link Road, Chakala Andheri (East), Mumbai - 400 093",
      email: "head.cardservices@indusind.com, customercare@indusind.com, nodal.officer@indusind.com"
    },
    "Jupiter money": {
      address: "Mr Vivek Agarwal : Grievance Officer of the Company (Amica Financial Technologies Private Limited), Jupiter Money Changers Private Limited registered address is 39/4518, IInd Floor Haltrust Building, Karimpatta Cross Road, Pallimuk Kochi Ernakulam KL 682016 IN",
      email: "alert@jupiter.money, grievance@jupiter.money, info@mmtcpamp.com, privacy@jupiter.money, nodalofficer@jupiter.money"
    },
    "Kisetsu saison Finance": {
      address: "Kisetsu Saison Finance (India) Private Limited registered address is 496/4, 2nd Floor, 10th Cross Sadashivanagar BANGALORE Bangalore-560080 Karnataka",
      email: "grievance@creditsaison-in.com, preethi.nair@creditsaison-in.com, kosuke.mori@creditsaison-ap.com, support@creditsaison-in.com"
    },
    "Kotak Bank": {
      address: "Nodal Officer, Mr. A. Sen Address: Kotak Infiniti, 4th Floor, Zone 4 Bulding No.21, Infinity Park, Off Western express Highway, General AK Vaidya Marg, Malad (E), Mumbai – 400097",
      email: "consumerassets.legal@kotak.com, care@kotak.com, grievanceofficer@kotak.com, seniorgrievanceofficer@kotak.com, chiefgrievanceofficer@kotak.com"
    },
    "KreditBee": {
      address: "KreditBee, 16/3, Adarsh Yelavarthy Centre, opp to Frank Anthony School, Cambridge Layout, Jogupalya Bangalore Karnataka 560008",
      email: "grievance@kreditbee.in, help@kreditbee.in, reachus@kbnbfc.in, grievance@kreditbee.in, media@kreditbee.in"
    },
    "Faircent Technologies India Pvt Ltd": {
      address: "Faircent Technologies India Pvt Ltd. Ms. Nidhi Tripathi, Grievance Officer Faircent",
      email: "grievance@faircent.com, support@faircent.com"
    },
    "Mobikwik": {
      address: "One MobiKwik Systems Limited, Unit 102, Block B, Pegasus One, Golf Course Road, DLF Phase 5, Sector 53, Gurugram, Haryana 122003",
      email: "grievance@mobikwik.com, support@Mobikwik.com, partners@mobikwik.com, nodal@mobikwik.com"
    },
    "Prefer": {
      address: "Prefr, Grievance Redressal Officer, Moksh Jain, Carnival House, Near Dindoshi Fire Station, Off. General A.K. Vaidya Marg, Malad (East), Mumbai, Maharashtra, 400097",
      email: "Nodal.officer@prefr.com, wecare@prefr.com"
    },
    "PayU": {
      address: "Grievance Redressal Officer–PayU Akash Wagh PayU Finance India Private Limited, Empresa Building, Office No. 102, First Floor, Second Road, Khar West, Mumbai – 400052",
      email: "wecare@lazypay.in, grievanceredressalofficer@lazypay.in, carehead@lazypay.in, Ridhi.mehta@payufin.com"
    },
    "Lending Plate": {
      address: "Lending Plate, Chawla House 3rd Floor, 19 Nehru Place, New Delhi-110019",
      email: "care@lendingplate.com, legal@lendingplate.com"
    },
    "Lenditt (Chimnay Finlease Ltd)": {
      address: "CHINMAY FINLEASE LTD, MAHESH BHUVAN AZAD CHOWK AT & PO BHABHAR DIST BANASKANTHA GJ 385320",
      email: "support@lenditt.com, info@lenditt.com, satvinder@lenditt.com"
    },
    "LoanTap": {
      address: "LoanTap Financial Technologies Private Limited, Corporate Office Address 306, Sangeeta Ramchand (Kartik) CHSL, 5 Kartik Complex, Opp Laxmi Ind Estate Andheri (W) Mumbai, Mumbai City MH 400053 IN",
      email: "finance@loantap.in, cs.loantapcredit@help.loantap.in, cs.iloan@help.loantap.in, cs.fintech@loantap.in"
    },
    "MoneyTap": {
      address: "NODAL GRIEVANCE REDRESSAL OFFICER, ANJALI PAWAR, G 405, 4TH FLOOR- GAMMA BLOCK, SIGMA SOFT TECH PARK VARTHUR, KODI WHITEFIELD POST, BANGALORE-560066",
      email: "hello@moneytap.com"
    },
    "DMI Finance Pvt Ltd": {
      address: "M/s DMI Finance Pvt Ltd, 9-10, 3rd Floor, Express Building, Bhadurshah Zafar Marg, New Delhi – 110002",
      email: "support@mvloans.in"
    },
    "Navi": {
      address: "Sikha Gupta, Customer Support Manager Navi Finserv, Koramangala, 3rd Block Bangalore, Karnataka 560034",
      email: "Grievance@navi.com, help@navi.com, Nodaloffice@navi.com"
    },
    "Paysense": {
      address: "Paysense Jaivilla Dev Shakti, 49 Tilak Road, Navyug Colony, Santacruz West, Mumbai, 400054 Maharashtra, India",
      email: "grievance@paysense.in, support@gopaysense.com"
    },
    "Paytm": {
      address: "Mr. Aditya Ranade, Grievance Redressal Officer-PAYTM (One97 Communication Ltd.), Skymark One, Shop No.1, Ground Floor, Tower-D, Plot No. H-10B, Sector 98, Noida, UP-201301",
      email: "grievance-redressal_lending@paytm.com"
    },
    "Poonawala Fin": {
      address: "Poonawala Finance, S. No. 83 Ground Floor, AP81, Mundhwa PUNE 411036, Maharashtra",
      email: "head.customercare@poonawallahousing.com, customercare@poonawallahousing.com, nodalofficer@poonawallahousing.com, grievance_south@poonawallafincorp.com"
    },
    "Prefr": {
      address: "Prefr, Grievance Redressal Officer, Moksh Jain, Carnival House, Near Dindoshi Fire Station, Off. General A.K. Vaidya Marg, Malad (East), Mumbai, Maharashtra, 400097",
      email: "Nodal.officer@prefr.com, wecare@prefr.com"
    },
    "RBL Bank": {
      address: "Manager - Credit Cards Service, RBL Bank Limited Cards Operating Centre - COC, JMD Megapolis, Unit No 306-311 - 3rd Floor, Sohna Road, Sector 48, Gurgaon, Haryana 122018",
      email: "principalnodalofficercards@rblbank.com, cardservices@rblbank.com, supercardservice@rblbank.com, headcardservice@rblbank.com, customercare@rblbank.com"
    },
    "Moneyview": {
      address: "M/s Whizdm Innovations Pvt Ltd (Money View), 3rd Floor, Survey No. 17, 1A, Outer Ring Rd, Kadubeesanahalli, Bellandur, Bengaluru, Karnataka 560087",
      email: "payments@moneyview.in, loans@moneyview.in, grievance@moneyview.in"
    },
    "Standard Chartered Bank": {
      address: "Standard Chartered Bank, Customer Care Unit, 19 Rajaji Salai, Chennai 600 001",
      email: "customer.care@sc.com, Priority.Banking@sc.com, Head.Service@sc.com, Nodal.Officer@sc.com, Principal.NodalOfficer@sc.com, Straight2Bank.In@sc.com"
    },
    "Onecard": {
      address: "Onecard, A-13 Varsha Park Baner Gaon Pune - 411045",
      email: "help@getonecard.app, grievances@fplabs.tech, LEGAL.HEADOFFICE@bankofbaroda.com"
    },
    "Early Salary": {
      address: "EarlySalary Office no. 404, The Chambers, (Samrat Chowk), Clover Park, Near Ganpati Chowk, Viman Nagar, Pune, Maharashtra 411014",
      email: "care@fibe.com, grievance@fibe.in"
    },
    "L&T": {
      address: "Mr. Vinod Varadan Grievance Redressal Officer L&T Finance Ltd, 7th Floor, \"Brindavan Building\", Plot No 177, C.S.T Road, Kalina, Santacruz (East), Mumbai-400098",
      email: "customercare@ltfs.com, gro@ltfs.com, pno@ltfs.com"
    },
    "Cashmypayment": {
      address: "520, SOMDATT CHAMBER-II 9 BHIKAJI CAMA PLACE NEW DELHI South Delhi DL 110066 IN",
      email: "info@cashmypayment.com, grievance@cashmypayment.com"
    },
    "DayTodayloan": {
      address: "B-57, Basement, New Krishna Park, Vikaspuri, New Delhi, Delhi 110018",
      email: "info@daytoday.com, grievance@daytodayloan.com"
    },
    "Easyfincare": {
      address: "3 Kehar Singh Estate, 3rd Floor, Lane No - 2, Westend Marg, Saidulajab, New Delhi – 110030",
      email: "info@easyfincare.com, grievance@easyfincare.com, disbursal@easyfincare.com"
    },
    "Everyday loan india": {
      address: "B-51, 3rd Floor, New Krishana Park Vikaspuri, Delhi-18",
      email: "info@everydayloanindia.com, grievance@gssasl.com"
    },
    "Rupee 112": {
      address: "TASLEEM SAIFI, 498, Third Floor, Udyog Vihar Phase 3, Gurugram, Haryana 122016",
      email: "care@rupee112.com, info@rupee112.com"
    },
    "Loan in need": {
      address: "Office No - 202, PLOT 9, Veer Savarkar Block, Guru Nanak Nagar, Shakarpur, Delhi, 110092",
      email: "info@loaninneed.in, grievance@loaninneed.in, admin@loaninneed.in"
    },
    "Xpressloan": {
      address: "Third Floor, WA-118, Plot No-2, Mother Dairy Road, Shakarpur, East Delhi Delhi, 110092",
      email: "info@xpressloan.in, grievance@xpressloan.in"
    },
    "LendingClub": {
      address: "Mr. Pratik Kharel Address: Unit No. 5, Mezzanine Floor, DLH Park, SV Rd., Goregaon West, Mumbai – 400 062",
      email: "cs@lendenclub.com, grievance@lendenclub.com"
    },
    "Nira Finance": {
      address: "GRIEVANCE OFFICER GOUTHAM R, No. 2024, 2nd Floor, UrbanVault, 16th Main Road, HAL 2nd Stage, Indiranagar, Bengaluru - 560008",
      email: "goutham.r@nirafinance.com, support@nirafinance.com, supportsafety@nirafinance.com"
    },
    "Payme India": {
      address: "Mr. Gajendra Pratap Singh, Grievance Redressal Officer (Payme India)",
      email: "grievance@paymeindia.in, gajendra.pratap@paymeindia.in, care@pmifs.com"
    },
    "Rupee redee": {
      address: "Mr. Ram Prasad Aryal Address: Fincfriends Private Limited, 7th Floor, Vatika Triangle, Mehrauli-Gurgaon Road, Block B, Sushant Lok Phase I, Gurugram, Haryana – 122002",
      email: "GRO@rupeeredee.com, GRO@fincfriends.in, info@fincfriends.in"
    },
    "Shriram housing": {
      address: "Mr. Sanjiv Gyani, Grievance Redressal Officer, Shriram Housing Finance Limited, Level 3, Wockhardt Towers, East Wing, Bandra Kurla Complex, Mumbai 400051 Ph : 022 – 4241 0400",
      email: "gs.agarwal@shriramhousing.in, contact@shriramhousing.in"
    },
    "Stashfin": {
      address: "Mr. Sanjeev Walia, Grievance Redressal Officer, CRC-2, 1st Floor, Khasra No. 337, Mehrauli-Gurgaon Rd, Sultanpur, New Delhi, Delhi 110030",
      email: "grievance.officer@stashfin.com, cofficer@akaracap.com, Legal.backend@stashfin.com"
    },
    "Vivi Fin": {
      address: "Vivifi India Finance Pvt. Ltd., Unit-A, 9th Floor, MJR Magnifique, Survey Nos. 75 and 76, Khajaguda X Roads, Raidurgam, Hyderabad, Telangana, 500008",
      email: "support@vivifin.com, prakash.rajan@vivifin.co"
    },
    "SBI": {
      address: "SBI Cards & Payments Services Ltd., DLF Infinity Towers, Tower C, 12th floor, Block 2, Building 3, DLF Cyber City, Gurgaon 122002",
      email: "customercare@sbicard.com, customercare@sbi.co.in, nodalofficer@sbicard.com, PrincipalNodalOfficer@sbicard.com, customerservicehead@sbicard.com"
    },
    "Slice": {
      address: "Slice Vikram Krishnan, Grievance Redressal Officer 747, Pooja Building, 4th Block, 80 Ft. Road, Koramangala, Bangalore - 560034",
      email: "customergrievance@sliceit.com, help@sliceit.com, legal@sliceit.com"
    },
    "SmartCoin": {
      address: "SmartCoin Financials Pvt Ltd. Indiqube Gama, No.293/154/172, 1st Floor, Outer Ring Road, Kadubeesanahalli, Bengaluru, Karnataka- 560103",
      email: "grievance@smartcoin.co.in"
    },
    "Tata Capital": {
      address: "Mr. Rajesh Kumar, Principal Nodal Officer Address: Tata Capital Financial Services Limited, Lodha I-Think Techno Campus Building, Building A, 4th Floor, Off Pokhran Road No 2, Thane (West) 400 607",
      email: "customercare@tatacapital.com, contactcommercialfinance@tatacapital.com, contactus@tatacapital.com, vaman.n@tatacapital.com, rajesh13.Kumar@tatacapital.com"
    },
    "True Balance": {
      address: "True Balance, Grievance Redressal Officer- Mr. Nikhil Niranjan Address: 5th Floor, Huda City Centre Metro Staon, Gurugram, Haryana -122001",
      email: "grievance@truecredits.in, info@truecredits.in, cs@truecredits.in"
    },
    "Yes Bank": {
      address: "Mr. Taroon Shahani YES Bank Ltd YES Bank House, Off Western Express Highway, Santacruz East, Mumbai 400055",
      email: "principal.nodalofficer@yesbank.in, yestouch@yesbank.in, head.grievanceredressal@yesbank.in"
    },
    "Zest Money": {
      address: "ZestMoney (Camden Town Technologies Pvt Ltd), Groung & Third Floor, Indiqube Celestia, Site No. 19 & 20, Koramangala 1A Block, Koramangala, Bengaluru, Karnataka – 560034",
      email: "cxoforyou@zestmoney.in, help@zestmoney.in, bhavya@zestmoney.in, Complaints@zestmoney.in"
    },
    "Zype": {
      address: "Zype, Grievance Redressal Officer, Mr. Swapnil Kinalekar, 2nd Floor, Dyna Buisness Park, Street No. 1, MIDC Andheri (East), Mumbai-400093",
      email: "support@getzype.com, recovery@getzype.com"
    }
  };
  
  // Update email content when a draft is selected
  useEffect(() => {
    const draft = draftTemplates.find(d => d.id === selectedDraft);
    if (draft) {
      setEmailContent(draft.content);
    }
  }, [selectedDraft]);
  
  // Handle draft selection
  const handleDraftChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedDraft(e.target.value);
  };
  
  // Handle subject selection
  const handleSubjectChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedSubject(e.target.value);
  };
  
  // Function to add a client as recipient
  const handleAddClientRecipient = () => {
    if (!tempClientId) {
      toast.error('Please select a client');
      return;
    }
    
    const client = clients.find(c => c.id === tempClientId);
    if (!client) {
      toast.error('Invalid client selected');
      return;
    }
    
    // Check if client already exists in recipients
    const alreadyAdded = recipients.some(r => r.email === client.email);
    if (alreadyAdded) {
      toast.error('This client is already added as a recipient');
      return;
    }
    
    setRecipients([...recipients, {
      id: `client-${Date.now()}`,
      clientId: client.id,
      name: client.name,
      email: client.email,
      type: 'client'
    }]);
    
    setTempClientId(''); // Reset selection
    toast.success(`${client.name} added as recipient`);
  };
  
  // Handle bank selection and add bank emails as recipients
  const handleBankChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const bankName = e.target.value;
    setSelectedBank(bankName);
    
    if (bankName && banks[bankName as keyof typeof banks]) {
      const bankEmails = banks[bankName as keyof typeof banks].email.split(', ');
      
      let newRecipients = [...recipients];
      let addedCount = 0;
      
      bankEmails.forEach(email => {
        const emailTrimmed = email.trim();
        // Skip empty emails and check for duplicates
        if (emailTrimmed && !recipients.some(r => r.email === emailTrimmed)) {
          newRecipients.push({
            id: `bank-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: `${bankName} (${emailTrimmed})`,
            email: emailTrimmed,
            type: 'bank'
          });
          addedCount++;
        }
      });
      
      if (addedCount > 0) {
        setRecipients(newRecipients);
        toast.success(`Added ${addedCount} email(s) from ${bankName}`);
      } else {
        // toast.info('No new email addresses to add');
      }
    }
  };
  
  // Remove a recipient
  const handleRemoveRecipient = (id: string) => {
    setRecipients(recipients.filter(r => r.id !== id));
  };
  
  // Handle attachment selection
  const handleFileAttachment = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    
    // Check if any file is too large (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    const oversizedFiles = files.filter(file => file.size > maxSize);
    
    if (oversizedFiles.length > 0) {
      const fileNames = oversizedFiles.map(f => f.name).join(', ');
      toast.error(`File(s) too large: ${fileNames}. Maximum size is 10MB.`);
      return;
    }
    
    // Process valid files
    const newAttachments = files.map(file => ({
      id: `attachment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      name: file.name,
      size: file.size,
      type: file.type
    }));
    
    setAttachments([...attachments, ...newAttachments]);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Remove an attachment
  const handleRemoveAttachment = (id: string) => {
    setAttachments(attachments.filter(a => a.id !== id));
  };
  
  // Format file size for display
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };
  
  // Handle form submission
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Validate form
    if (recipients.length === 0) {
      toast.error('Please add at least one recipient');
      return;
    }
    
    if (!selectedSubject) {
      toast.error('Please select a subject');
      return;
    }
    
    if (!emailContent.trim()) {
      toast.error('Please enter email content');
      return;
    }
    
    // Set loading state
    setLoading(true);
    
    try {
      // In a real app, here you would send the email using an API
      // For demonstration, we'll just simulate a delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate success
      toast.success('Email sent successfully!');
      
      // Reset form
      setRecipients([]);
      setSelectedDraft('');
      setSelectedSubject('');
      setEmailContent('');
      setAttachments([]);
      setSelectedBank('');
      
    } catch (error) {
      toast.error('Failed to send email. Please try again.');
      console.error('Error sending email:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <AdvocateSidebar />
      
      <div className="flex-1 p-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
            <FaEnvelope className="mr-3 text-purple-400" />
            Compose Email
          </h1>
          <p className="text-gray-400 mb-8">Create and send professional emails to clients and banks</p>
          
          <form onSubmit={handleSubmit} className="bg-gray-800/50 rounded-lg border border-gray-700 p-6 shadow-lg">
            <div className="space-y-6">
              {/* Recipients Section */}
              <div className="bg-gray-800/70 p-4 rounded-lg border border-gray-700">
                <h2 className="text-lg font-medium text-white mb-4">Recipients</h2>
                
                {/* Bank selection dropdown */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-400 mb-1">Select Bank for Recipients</label>
                  <div className="flex gap-3">
                    <select
                      value={selectedBank}
                      onChange={handleBankChange}
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
                    >
                      <option value="">-- Select a Bank --</option>
                      {Object.keys(banks).map(bankName => (
                        <option key={bankName} value={bankName}>
                          {bankName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Selecting a bank will automatically add all its email addresses as recipients</p>
                </div>
                
                {/* Client selection dropdown */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-400 mb-1">Add Client Recipient</label>
                  <div className="flex gap-3">
                    <select
                      value={tempClientId}
                      onChange={(e) => setTempClientId(e.target.value)}
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
                    >
                      <option value="">-- Select a Client --</option>
                      {clients.map(client => (
                        <option key={client.id} value={client.id}>
                          {client.name} ({client.email})
                        </option>
                      ))}
                    </select>
                    
                    <button
                      type="button"
                      onClick={handleAddClientRecipient}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors duration-200 flex items-center"
                    >
                      <FaUserPlus className="mr-2" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>
                
                {/* Recipients list */}
                {recipients.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-gray-300 mb-2">Recipients List ({recipients.length})</h3>
                    <ul className="bg-gray-900 rounded-md border border-gray-700 divide-y divide-gray-700 max-h-48 overflow-y-auto">
                      {recipients.map((recipient) => (
                        <li key={recipient.id} className="flex items-center justify-between p-3">
                          <div className="flex items-center">
                            <div className={`mr-2 text-lg ${recipient.type === 'bank' ? 'text-green-400' : 'text-blue-400'}`}>
                              {recipient.type === 'bank' ? <FaEnvelope /> : <FaUser />}
                            </div>
                            <div>
                              <p className="text-white text-sm font-medium">{recipient.name}</p>
                              <p className="text-gray-400 text-xs">{recipient.email}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveRecipient(recipient.id)}
                            className="text-gray-500 hover:text-red-400 transition-colors"
                          >
                            <FaTimes />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              
              {/* Email Content Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Select template */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Email Template</label>
                  <select
                    value={selectedDraft}
                    onChange={handleDraftChange}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
                  >
                    <option value="">-- Select a template --</option>
                    {draftTemplates.map(draft => (
                      <option key={draft.id} value={draft.id}>
                        {draft.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Subject selection */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Email Subject</label>
                  <select
                    value={selectedSubject}
                    onChange={handleSubjectChange}
                    required
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
                  >
                    <option value="">-- Select a subject --</option>
                    {subjectTemplates.map(subject => (
                      <option key={subject.id} value={subject.text}>
                        {subject.text}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Email content */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Email Content</label>
                <textarea
                  value={emailContent}
                  onChange={(e) => setEmailContent(e.target.value)}
                  required
                  rows={12}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
                  placeholder="Enter your email content here..."
                ></textarea>
              </div>
              
              {/* Attachments */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-300">Attachments</label>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center text-xs px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                  >
                    <FaPaperclip className="mr-1.5" />
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
                <span className="ml-3 text-gray-400 text-sm">Max 10MB per file</span>
              
                {/* Display attached files */}
                {attachments.length > 0 && (
                  <div className="bg-gray-700/50 rounded-md border border-gray-600 p-3 mt-2">
                    <h3 className="text-white text-sm font-medium mb-2">
                      {attachments.length} file(s) attached
                    </h3>
                    <ul className="space-y-2">
                      {attachments.map(attachment => (
                        <li key={attachment.id} className="flex items-center justify-between bg-gray-800 rounded px-3 py-2">
                          <div className="flex items-center">
                            <FaFile className="text-purple-400 mr-2" />
                            <div>
                              <p className="text-white text-sm truncate max-w-xs">{attachment.name}</p>
                              <p className="text-gray-400 text-xs">{formatFileSize(attachment.size)}</p>
                            </div>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => handleRemoveAttachment(attachment.id)}
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
              
              <div className="flex justify-between items-center">
                <button
                  type="button"
                  className="px-5 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  onClick={() => setEmailContent('')}
                >
                  Clear
                </button>
                
                <button 
                  type="submit" 
                  className={`px-6 py-3 rounded-md text-white font-medium flex items-center ${
                    loading 
                      ? 'bg-gray-600 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg hover:shadow-purple-500/20'
                  } transition-all duration-200`}
                  disabled={loading}
                >
                  <FaPaperPlane className="mr-2" />
                  {loading ? 'Sending...' : 'Send Email'}
                </button>
              </div>
            </div>
          </form>
          
          <div className="mt-8 p-4 rounded-lg bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border border-purple-800/30">
            <h3 className="text-sm font-medium text-indigo-300 mb-2">Email Composition Tips</h3>
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
          position="top-right"
          toastOptions={{
            style: {
              background: '#333',
              color: '#fff',
            },
            success: {
              duration: 3000,
              style: {
                background: 'rgba(47, 133, 90, 0.9)',
              },
            },
            error: {
              duration: 3000,
              style: {
                background: 'rgba(175, 45, 45, 0.9)',
              },
            },
          }}
        />
      </div>
    </div>
  );
}
