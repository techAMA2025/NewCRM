"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase/firebase";

interface Bank {
  id: string;
  bankName: string;
  accountNumber: string;
  loanType: string;
  loanAmount: string;
}

interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  alloc_adv: string;
  status: string;
  personalLoanDues: string;
  creditCardDues: string;
  banks: Bank[];
  isPrimary: boolean;
  isSecondary: boolean;
  // Additional fields omitted for brevity
}

interface RequestLetterFormProps {
  client: Client;
  onClose: () => void;
}

// Client interface from Firestore
interface FirestoreClient {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  alloc_adv: string;
  status: string;
  personalLoanDues: string;
  creditCardDues: string;
  banks: Bank[];
  monthlyIncome?: string;
  monthlyFees?: string;
  occupation?: string;
  startDate?: string;
  tenure?: string;
  remarks?: string;
  salesNotes?: string;
  queries?: string;
  alloc_adv_at?: any;
  convertedAt?: any;
  adv_status?: string;
  panNumber?: string;
  aadharNumber?: string;
  dob?: string;
  documentUrl?: string;
  documentName?: string;
  documentUploadedAt?: any;
}

export default function RequestLetterForm({
  client,
  onClose,
}: RequestLetterFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clients, setClients] = useState<FirestoreClient[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [formData, setFormData] = useState({
    name1: client.name || "",
    bankAddress: "",
    bankEmail: "",
    accountType: "Loan Account", // Default value
    number:
      client.banks && client.banks.length > 0
        ? client.banks[0].accountNumber || ""
        : "",
    reason: "Job Loss", // Default value
    email: client.email || "",
    selectedBank: "", // New field for bank selection
  });

  // Fetch clients when component mounts
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const clientsCollection = collection(db, "clients");
        const clientSnapshot = await getDocs(clientsCollection);
        const clientsList: FirestoreClient[] = [];

        clientSnapshot.forEach((doc) => {
          const data = doc.data() as Omit<FirestoreClient, "id">;
          clientsList.push({ id: doc.id, ...data });
        });

        setClients(clientsList);
      } catch (error) {
        console.error("Error fetching clients:", error);
        toast.error("Failed to load clients");
      }
    };

    fetchClients();
  }, []);

  // Complete bank data for dropdown and auto-filling
  const bankData = {
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
      email: "care@fibe.com, grievance@fibe.in, care@fibe.in",
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

  const handleClientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const clientId = e.target.value;
    setSelectedClientId(clientId);

    if (!clientId) return;

    const selectedClient = clients.find((c) => c.id === clientId);

    if (selectedClient) {
      // Update form with selected client's data
      setFormData((prevFormData) => ({
        ...prevFormData,
        name1: selectedClient.name || "",
        email: selectedClient.email || "",
        number:
          selectedClient.banks && selectedClient.banks.length > 0
            ? selectedClient.banks[0].accountNumber || ""
            : "",
      }));
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;

    // If bank selection changes, update bank address and email fields
    if (name === "selectedBank" && value) {
      const selectedBankData = bankData[value as keyof typeof bankData];
      if (selectedBankData) {
        setFormData({
          ...formData,
          selectedBank: value,
          bankAddress: selectedBankData.address,
          bankEmail: selectedBankData.email,
        });
      } else {
        setFormData({
          ...formData,
          selectedBank: value,
        });
      }
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Format the data for API submission
      const response = await fetch("/api/generate-letter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      // Check if the response indicates an error
      if (!response.ok) {
        // Only try to parse JSON for error responses
        const contentType = response.headers.get("content-type");

        if (contentType && contentType.includes("application/json")) {
          const errorText = await response.text(); // Get raw text first

          try {
            const errorData = JSON.parse(errorText);
            throw new Error(errorData.error || "Failed to generate document");
          } catch (parseError) {
            throw new Error(
              `Failed to generate document: Unable to parse error response`
            );
          }
        } else {
          // If it's not JSON, just use the status text
          throw new Error(
            `Failed to generate document: ${response.statusText}`
          );
        }
      }

      // Get the document as a blob
      const blob = await response.blob();

      // Create a download link and trigger download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${formData.name1}_request_letter.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Document successfully generated and downloaded.");
      onClose();
    } catch (error) {
      console.error("Error generating document:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to generate document. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Client Selector Dropdown - spans full width */}
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-400 mb-1">
            Select Client
          </label>
          <select
            value={selectedClientId}
            onChange={handleClientChange}
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm"
          >
            <option value="">Select a client...</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name} - {client.phone}
              </option>
            ))}
          </select>
        </div>

        {/* Name field - should be editable */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">
            Client Name
          </label>
          <input
            type="text"
            name="name1"
            value={formData.name1}
            onChange={handleChange}
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm"
            required
          />
        </div>

        {/* Email - make editable */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">
            Client Email
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm"
            required
          />
          {selectedClientId && (
            <p className="text-xs text-gray-500 mt-0.5">
              Auto-filled from client data (editable)
            </p>
          )}
        </div>

        {/* Bank Selection Dropdown - spans full width */}
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-400 mb-1">
            Select Bank
          </label>
          <select
            name="selectedBank"
            value={formData.selectedBank}
            onChange={handleChange}
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm"
          >
            <option value="">Select a bank...</option>
            {Object.keys(bankData).map((bank) => (
              <option key={bank} value={bank}>
                {bank}
              </option>
            ))}
          </select>
        </div>

        {/* Bank Address - spans full width */}
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-400 mb-1">
            Bank Address
          </label>
          <textarea
            name="bankAddress"
            value={formData.bankAddress}
            onChange={handleChange}
            required
            rows={3}
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm"
            placeholder="Enter bank address"
          />
        </div>

        {/* Bank Email - spans full width */}
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-400 mb-1">
            Bank Email
          </label>
          <textarea
            name="bankEmail"
            value={formData.bankEmail}
            onChange={handleChange}
            required
            rows={2}
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm"
            placeholder="Enter bank email (use commas to separate multiple emails)"
          />
          {formData.selectedBank && (
            <p className="text-xs text-gray-500 mt-0.5">
              You can edit these email addresses if needed
            </p>
          )}
        </div>

        {/* Account Type (dropdown) */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">
            Account Type
          </label>
          <select
            name="accountType"
            value={formData.accountType}
            onChange={handleChange}
            required
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm"
          >
            <option value="Loan Account">Loan Account</option>
            <option value="Credit Card Number">Credit Card Number</option>
          </select>
        </div>

        {/* Reason (dropdown) */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">
            Reason
          </label>
          <select
            name="reason"
            value={formData.reason}
            onChange={handleChange}
            required
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm"
          >
            <option value="Job Loss">Job Loss</option>
            <option value="Business Loss">Business Loss</option>
            <option value="Financial Loss">Financial Loss</option>
          </select>
        </div>

        {/* Account/Card Number */}
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-400 mb-1">
            Account/Card Number
          </label>
          <input
            type="text"
            name="number"
            value={formData.number}
            onChange={handleChange}
            required
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent text-sm"
            placeholder="Enter account or card number"
          />
          {selectedClientId && (
            <p className="text-xs text-gray-500 mt-0.5">
              Auto-filled from client data (editable)
            </p>
          )}
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
          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-md transition-colors duration-200 flex items-center text-sm"
        >
          {isSubmitting ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
              Generating...
            </>
          ) : (
            <>Generate Request Letter</>
          )}
        </button>
      </div>
    </form>
  );
}
