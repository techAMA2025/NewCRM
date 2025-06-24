import { NextResponse } from 'next/server';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { storage } from '../../../firebase/firebase';
import { ref, uploadBytes, getDownloadURL, getBytes } from 'firebase/storage';
import fs from 'fs';
import path from 'path';
import os from 'os';

export async function POST(request: Request) {
  try {
    // Get template from Firebase Storage
    const templateRef = ref(storage, 'templates/ama_agreement.docx');
    let templateBuffer;
    
    try {
      templateBuffer = await getBytes(templateRef);
      console.log('Template fetched successfully from Firebase');
    } catch (error) {
      console.error('Error fetching template from Firebase:', error);
      return NextResponse.json(
        { error: 'Template file not found in Firebase Storage' },
        { status: 500 }
      );
    }
    
    const data = await request.json();
    console.log('Received data for agreement generation:', { id: data.id, name: data.name });
    
    const {
      id,
      name,
      email,
      phone,
      city,
      occupation,
      personalLoanDues,
      creditCardDues,
      monthlyIncome,
      tenure,
      monthlyFees,
      startDate,
      banks = [],
      dob,
      panNumber
    } = data;

    if (!name || !email || !startDate || !tenure || !monthlyFees) {
      return NextResponse.json(
        { error: 'Required fields are missing' },
        { status: 400 }
      );
    }

    // Format dates
    const agreementDate = new Date();
    const formattedDate = formatDate(agreementDate);
    const formattedStartDate = formatDate(new Date(startDate));
    const formattedDob = dob ? formatDate(new Date(dob)) : 'Not provided';
    
    // Calculate total debt
    const totalDebt = calculateTotalDebt(personalLoanDues, creditCardDues);
    const totalFees = parseFloat(monthlyFees) * parseInt(tenure);
    
    // Helper function to format numbers with Indian commas (1,00,000)
    function formatIndianNumber(num: number): string {
      if (!num) return "0";
      let numStr = num.toString();
      let afterPoint = "";
      
      if (numStr.includes(".")) {
        [numStr, afterPoint] = numStr.split(".");
        afterPoint = "." + afterPoint;
      }
      
      let lastThree = numStr.length > 3 ? numStr.substring(numStr.length - 3) : numStr;
      let otherNumbers = numStr.substring(0, numStr.length - 3);
      
      if (otherNumbers) {
        lastThree = "," + lastThree;
      }
      
      let formattedNumber = 
        otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + 
        lastThree + 
        afterPoint;
        
      return formattedNumber;
    }

    // Generate fees table
    const feesTable = generateFeesTable(
      startDate,
      parseInt(tenure),
      parseFloat(monthlyFees)
    );

    // Format bank records for template
    const bankRecords = banks.map((bank: any) => ({
      bank_name: bank.bankName,
      loan_type: bank.loanType,
      loan_amount: formatIndianNumber(parseFloat(bank.loanAmount))
    }));

    // Create document from template
    const zip = new PizZip(templateBuffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    // Prepare data for the template
    const templateData = {
      name,
      email,
      phone,
      date: formattedDate,
      formattedDate,
      city,
      profession: occupation || 'Not specified',
      startdate: formattedStartDate,
      startDateFormatted: formattedStartDate,
      tenure,
      monthlyFees: formatIndianNumber(parseFloat(monthlyFees)),
      totalfees: formatIndianNumber(totalFees),
      totaldebt: formatIndianNumber(totalDebt),
      bankRecords,
      feesTable,
      dob: formattedDob,
      pan: panNumber || 'Not provided',
    };

    // Using the modern approach instead of deprecated setData
    doc.render(templateData);

    // Generate document as buffer
    const buffer = doc.getZip().generate({ type: "nodebuffer" });
    console.log('Document generated successfully');
    
    // Save to temporary file (needed for verification)
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `${name}_ama_agreement_${Date.now()}.docx`);
    fs.writeFileSync(tempFilePath, buffer);
    console.log('Temporary file created at:', tempFilePath);
    
    // Upload to Firebase Storage
    const documentPath = `clients/${id}/documents/${name}_agreement.docx`;
    console.log('Uploading to Firebase path:', documentPath);
    
    const storageRef = ref(storage, documentPath);
    await uploadBytes(storageRef, buffer).then(snapshot => {
      console.log('Upload successful, metadata:', snapshot.metadata);
    }).catch(error => {
      console.error('Firebase upload error details:', error);
      throw error; // Rethrow to be caught by the outer try/catch
    });
    
    // Get download URL
    const downloadUrl = await getDownloadURL(storageRef);
    console.log('Download URL obtained:', downloadUrl);
    
    // Clean up temp file
    fs.unlinkSync(tempFilePath);
    
    return NextResponse.json({ 
      success: true, 
      documentUrl: downloadUrl,
      documentName: `${name}_agreement.docx`,
      documentUploadedAt: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('Error generating agreement:', error);
    return NextResponse.json(
      { error: 'Failed to generate agreement', details: error.message },
      { status: 500 }
    );
  }
}

// Helper function to format date as DD/MM/YYYY
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB');
}

// Helper function to calculate total debt
function calculateTotalDebt(personalLoanDues: string, creditCardDues: string): number {
  const personalLoan = parseFloat(personalLoanDues) || 0;
  const creditCard = parseFloat(creditCardDues) || 0;
  return personalLoan + creditCard;
}

// Helper function to generate fees table
function generateFeesTable(startDate: string, tenure: number, monthlyFee: number) {
  const startDateObj = new Date(startDate);
  const feesTable = [];

  for (let i = 1; i <= tenure; i++) {
    const debitDate = new Date(startDateObj);
    debitDate.setMonth(startDateObj.getMonth() + (i - 1));

    feesTable.push({
      month_number: i.toString(),
      fees: formatIndianNumber(monthlyFee),
      debit_date: formatDate(debitDate),
    });
  }

  return feesTable;
}

// Helper function for Indian number formatting
function formatIndianNumber(num: number): string {
  if (!num) return "0";
  let numStr = num.toString();
  let afterPoint = "";
  
  if (numStr.includes(".")) {
    [numStr, afterPoint] = numStr.split(".");
    afterPoint = "." + afterPoint;
  }
  
  let lastThree = numStr.length > 3 ? numStr.substring(numStr.length - 3) : numStr;
  let otherNumbers = numStr.substring(0, numStr.length - 3);
  
  if (otherNumbers) {
    lastThree = "," + lastThree;
  }
  
  return otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + lastThree + afterPoint;
}
