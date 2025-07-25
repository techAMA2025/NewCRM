import { getAllBanks } from '../lib/bankService';

export interface BankData {
  address: string;
  email: string;
}

// Static data as absolute fallback only
const staticBankData: Record<string, BankData> = {
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
    email: "care@fibe.in, grievance@fibe.in",
  },
  FlexSalary: {
    address:
      "Unit A, 9th Floor, MJR Magnifique, Survey No 75 & 76, Khajaguda X Roads, Raidurgam, Hyderabad, Telangana - 500008",
    email: "support@flexsalary.com, coo@vivifi.com",
  },
  Finable: {
    address:
      "Finnable, Grievance Redressal Officer, Miss: Suman Kumari, IndiQube Lakeside, 4th Floor Municipal No. 80/2 Wing A, Bellaandur Village, Varthur Hobli, Bengaluru, KA 560103 IN",
    email:
      "gro@finnable.com, makeiteasy@finnable.com, customercare@finnable.com",
  },
  "Fullerton": {
    address:
      "Mr. Ritesh Saxena, Grievance Redressal Officer, B wing, 6th Floor, Supreme Business Park, Hiranandani, Powai, Mumbai – 400072",
    email:
      "namaste@smfgindia.com, GRO@smfgindia.com, PNO@smfgindia.com, CCRC@smfgindia.com",
  },
  "SMFG": {
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
  "Chimnay Finlease Ltd (Lenditt)": {
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
    email: "care@fibe.in, grievance@fibe.in",
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
  Mintifi: {
    address:
      "Times Square Building, Andheri - Kurla Rd, Marol, Andheri East, Mumbai, Maharashtra 400059",
    email:
      "neelam.verma@mintifi.com, madhavi@mintifi.com, customercare@mintifi.com, gro@mintifi.com",
  },
  Tyger: {
    address:
      "Mr. Anurag Pandey, Adani Capital Pvt. Ltd., 1004/5, C-Wing, One BKC, C-66, G Block, Bandra Kurla Complex, Mumbai 400051. Mr. Viral Shah, Adani Capital Pvt. Ltd., 1004/5, C-Wing, One BKC, C-66, G Block, Bandra Kurla Complex, Mumbai-400051",
    email:
      "Viral.Shah@adani.com, escalations.acpl@adani.com, customercare.thfpl@tyger.in",
  },
  "Northern Arc Bank": {
    address:
      "IndiQube Golf View Homes, 6th Floor, Tower B, 3rd Cross Road, S R Layout, Murgesh Pallya, Bengaluru – 560017 Mr. Madhan Mohan K, IndiQube Golf View Homes, 6th Floor, Tower B, 3rd Cross Road, S R Layout, Murgesh Pallya, Bengaluru-560017",
    email:
      "customersupport@northernarc.com, gro@northernarc.com, nodal.officer@northernarc.com",
  },
  "SI Creva": {
    address:
      "10th Floor, Tower 4, Equinox Park, LBS Marg, Kurla West, Mumbai, Maharashtra 400070. Der Deutsche ParkZ, 2nd floor, Subhash Nagar Rd, Near Nahur West Railway Station, Nahur (West), Mumbai – 400078",
    email:
      "care@kissht.com, info@sicrevacapital.com, care@paywithring.com, escalation@paywithring.com",
  },
  "UGRO Capital": {
    address:
      "Mr. Satyabrata Mohapatra, U GRO Capital Limited, 4th Floor, Tower 3, Equinox Business Park, LBS Road, Kurla, Mumbai 400070",
    email:
      "info@ugrocapital.com, customercare@ugrocapital.com, Pnodalofficer@ugrocapital.com",
  },
  "MPOCKET": {
    address: "PS Srijan Corporate Park, Unit 1204, Sector V, Kolkata – 700091",
    email: "grievance@mpokket.com, nodal@mpokket.com, support@mpokket.com, supervisor@mpokket.com"
  },
  "KRAZYBEE": {
    address: "3rd Floor, No. 128/9, Maruthi Sapphire HAL Old Airport Road, Murugesh Palya, Bangalore - 560017",
    email: "reachus@kbnbfc.in, grievance@kbnbfc.in"
  },
  "Union Bank of India": {
    address: "Union Bank Bhavan, 239, Vidhan Bhavan Marg, Nariman Point, Mumbai – 400021, Maharashtra, India",
    email: "cgo@unionbankofindia.bank, dgro@unionbankofindia.bank"
  },
  "VIVRATI": {
    address: "Prestige Zackria Metropolitan, No.200/1-8, 2nd Floor, Block 1, Anna Salai, Chennai 600002",
    email: "grievanceredressal@vivriticapital.com, Ajitkumar.Menon@vivriticapital.com"
  },
  "TVS Credit": {
    address: "3rd Floor, Bristol Towers, Plot No. 10, South Phase, Thiru-Vi-Ka Industrial Estate, Adjacent to Maruti Service Masters, Guindy, Chennai – 600032",
    email: "gro@tvscredit.com"
  },
  "South Indian Bank": {
    address: "South Indian Bank Ltd., Head Office, T.B Road, Mission Quarters, Thrissur 680 001, Kerala, India",
    email: "pno@sib.co.in, nodalofficer@sib.co.in, customercare@sib.co.in"
  },
  "REFYNE": {
    address: "522, 24th Main Road, Parangi Palya, Sector 2, HSR Layout, Bangalore, Karnataka - 560102",
    email: "grievance@refynefinance.com, compliance@refynefinance.com"
  },
  "North East Small Finance": {
    address: "1st & 3rd Floor, Fortune Central, Basisthapur, Bye lane 3, Beltola, Guwahati, Assam 781028",
    email: "customergrievance@nesfb.com, customergrievance@sliceit.com, principal.nodalofficer@nesfb.com, nodalofficer@sliceit.com"
  },
  "Groww": {
    address: "Vaishnavi Tech Park, South Tower, 3rd floor, Sarjapur Main Road, Bellandur, Bengaluru – 560103, Karnataka",
    email: "headcustomerservice@groww.in, grievances@groww.in, escalation@groww.in, support@groww.in, creditsupport@groww.in"
  },
  "Aye Finance": {
    address: "Unit No. - 701-711, 7th Floor, Unitech Commercial Tower-2, Sector-45, Arya Samaj Road, Gurugram – 122003, Haryana, India",
    email: "corporate@ayefin.com, customer.care@ayefin.com, customer.complaint@ayefin.com, ombudsman@ayefin.com"
  },
  "CSB Bank": {
    address: "Smt. Sreelatha K, Principal Nodal Officer for Customer Grievances CSB Bank Limited, Head Office, CSB Bhavan, St Marys College Road Thrissur – 680020 Kerala",
    email: "pno@csb.co.in, cutomercare@csb.co.in, advparshvashah.fpl@gmail.com"
  },
  "UNIFINZ": {
    address: "Lending Plate, Chawla House 3rd Floor, 19 Nehru Place, New Delhi-110019",
    email: "care@lendingplate.com, legal@lendingplate.com"
  },
  "Uni Card": {
    address: "Danish Mirza, Indiqube Sigma No.3/B, Nexus Koramangala 3rd Block SBI Colony, Koramangala, Bengaluru, Karnataka 560034",
    email: "gro@uni.club, care@uni.club"
  },
  
  "LAZY PAY": {
    address: "PayU Finance India Private Limited, Empresa Building, Office No. 102, First Floor, Second Road, Khar West, Mumbai – 400052",
    email: "wecare@lazypay.in, grievanceredressalofficer@lazypay.in, carehead@lazypay.in, Ridhi.mehta@payufin.com"
  },
  "FREOPAY": {
    address: "Anjali Panwar, G-405, 4th Floor – Gamma Block, Sigma Soft Tech Park Varthur, Kodi Whitefield Post Bangalore – 560066",
    email: "hello@freo.money"
  },
  "EDGRO": {
    address: "The Customer Service Department, EGRO Finance Private Limited, 2nd Floor, No:1614/1615, Enzyme, 7th Cross, 19th Main Road, Sector 1, HSR Layout, Bengaluru, Karnataka, 5601012",
    email: "info@edgrofin.com"
  },
  "UPMOVE": {
    address: "Principal Nodal Officer Ms. Apeksha Gudhaka Indiqube Gamma, No.293/154/172, 3rd Floor, Outer Ring Road, Kadubeesanahalli. Bangalore KA 560103",
    email: "grievanceredressalofficer@upmove.in, principal.nodal.officer@upmove.in, contact@upmove.in"
  },
  "KISSHT": {
    address: "ZAFFAR KHAN, OnEMI Technology Solutions Private Limited, 10th Floor, Tower 4, Equinox Park, LBS Marg, Kurla West, Mumbai, Maharashtra 400070",
    email: "escalation@kissht.com"
  },
  "JUPITER MONEY": {
    address: "Mr Vivek Agarwal : Grievance Officer of the Company (Amica Financial Technologies Private Limited), Jupiter Money Changers Private Limited registered address is 39/4518, IInd Floor Haltrust Building, Karimpatta Cross Road, Pallimuk Kochi Ernakulam KL 682016 IN",
    email: "alert@jupiter.money, grievance@jupiter.money, info@mmtcpamp.com, privacy@jupiter.money, nodalofficer@jupiter.money"
  },
  "OXYZO": {
    address: "OXYZO Financial Services Limited, 1st Floor, Tower-A, Global Business Park, Mehrauli-Gurgaon Road, Sector 26, Gurugram, Haryana 122002",
    email: "getsupport@oxyzo.in, grievanceredressal@oxyzo.in, bhubnesh.jha@oxyzo.in"
  },
  "MAS Financial": {
    address: "Mr. Kamlesh Chimanlal Gandhi, Chairman & Managing Director, 6, Ground Floor, Narayan Chambers, B/H. Patang Hotel, Nehru Bridge Corner, Ashram Road, Ahmedabad-380009. Mr. Ankit Jain, Chief Financial Officer, 6, Ground Floor, Narayan Chambers, B/H. Patang Hotel, Nehru Bridge Corner, Ashram Road, Ahmedabad-380009. Ms. Riddhi Bhayani, Company Secretary and Compliance Officer, 6, Ground Floor, Narayan Chambers, B/H. Patang Hotel, Nehru Bridge Corner, Ashram Road, Ahmedabad-380009",
    email: "mfsl@mas.co.in, ankit_jain@mas.co.in, riddhi_bhayani@mas.co.in"
  },
  "Punjab National Bank": {
    address: "Principal Nodal Officer, Sh. Pulin Kumar Pattanaik, General Manager, Customer Care Centre Plot No. 5, Institutional Area, Sector-32, Gurugram (Haryana)- 122001 Tel.No: +91-124-4126244",
    email: "pno.pnb.co.in, care@pnb.co.in"
  },
  "Fincfriends": {
    address: "Mr. Ram Prasad Aryal Address: Fincfriends Private Limited, 7th Floor, Vatika Triangle, Mehrauli-Gurgaon Road, Block B, Sushant Lok Phase I, Gurugram, Haryana – 122002",
    email: "GRO@fincfriends.in, info@fincfriends.in"
  },
  "Other": {
    address: "Other",
    email: "Other"
  },
};

// Main bankData variable that will be used throughout the application
export let bankData: Record<string, BankData> = { ...staticBankData };

// Dynamic bank data management
let cachedBankData: Record<string, BankData> | null = null;
let isLoading = false;
let lastFetchTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

// Initialize bank data on module load
let initializationPromise: Promise<Record<string, BankData>> | null = null;

const initializeBankData = async (): Promise<Record<string, BankData>> => {
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    try {
      console.log('Loading banks from Firebase...');
      const firebaseData = await getAllBanks();
      
      if (Object.keys(firebaseData).length > 0) {
        console.log(`Successfully loaded ${Object.keys(firebaseData).length} banks from Firebase`);
        cachedBankData = firebaseData;
        lastFetchTime = Date.now();
        // Update the main bankData variable
        Object.assign(bankData, firebaseData);
        return firebaseData;
      } else {
        console.warn('No banks found in Firebase, using static data as fallback');
        cachedBankData = staticBankData;
        lastFetchTime = Date.now();
        // bankData is already initialized with static data
        return staticBankData;
      }
    } catch (error) {
      console.error('Failed to load banks from Firebase, using static data as fallback:', error);
      cachedBankData = staticBankData;
      lastFetchTime = Date.now();
      // bankData is already initialized with static data
      return staticBankData;
    }
  })();

  return initializationPromise;
};

// Get bank data with automatic initialization and caching
export const getBankData = async (): Promise<Record<string, BankData>> => {
  // Check if we have valid cached data
  const now = Date.now();
  if (cachedBankData && (now - lastFetchTime) < CACHE_DURATION) {
    return cachedBankData;
  }

  // If already loading, wait for the current load
  if (isLoading) {
    return cachedBankData || staticBankData;
  }

  try {
    isLoading = true;
    console.log('Refreshing bank data from Firebase...');
    
    const firebaseData = await getAllBanks();
    
    if (Object.keys(firebaseData).length > 0) {
      console.log(`Successfully refreshed ${Object.keys(firebaseData).length} banks from Firebase`);
      cachedBankData = firebaseData;
      lastFetchTime = now;
      // Update the main bankData variable
      Object.assign(bankData, firebaseData);
      return firebaseData;
    } else {
      console.warn('No banks found in Firebase during refresh, keeping existing cache or using static data');
      return cachedBankData || staticBankData;
    }
  } catch (error) {
    console.error('Error refreshing bank data from Firebase:', error);
    // Return cached data if available, otherwise static data
    return cachedBankData || staticBankData;
  } finally {
    isLoading = false;
  }
};

// Force refresh cache from Firebase
export const refreshBankData = async (): Promise<Record<string, BankData>> => {
  console.log('Force refreshing bank data...');
  cachedBankData = null;
  lastFetchTime = 0;
  initializationPromise = null;
  const newData = await getBankData();
  // Update the main bankData variable
  Object.assign(bankData, newData);
  return newData;
};

// Get bank data synchronously (returns cached data or static data immediately)
export const getBankDataSync = (): Record<string, BankData> => {
  if (cachedBankData) {
    return cachedBankData;
  }
  
  // If no cached data, start loading in background and return current bankData
  if (!isLoading) {
    getBankData().catch(console.error);
  }
  
  return bankData;
};

// Check if bank data is loaded from Firebase
export const isBankDataFromFirebase = (): boolean => {
  return cachedBankData !== null && cachedBankData !== staticBankData;
};

// Get cache status
export const getBankDataCacheStatus = () => {
  return {
    isCached: cachedBankData !== null,
    isFromFirebase: isBankDataFromFirebase(),
    lastFetchTime: lastFetchTime,
    cacheAge: lastFetchTime ? Date.now() - lastFetchTime : 0,
    isLoading: isLoading
  };
};

// Initialize on module load
initializeBankData().catch(console.error); 