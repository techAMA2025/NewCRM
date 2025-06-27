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
    // Get PAS template from Firebase Storage
    const templateRef = ref(storage, 'templates/billcut-pas-template.docx');
    let templateBuffer;
    
    try {
      templateBuffer = await getBytes(templateRef);
      console.log('Billcut PAS template fetched successfully from Firebase');
    } catch (error) {
      console.error('Error fetching billcut PAS template from Firebase:', error);
      return NextResponse.json(
        { error: 'Billcut PAS template file not found in Firebase Storage' },
        { status: 500 }
      );
    }
    
    const data = await request.json();
    console.log('Received data for billcut PAS agreement generation:', { 
      name: data.name, 
      email: data.email,
      banksCount: data.banks?.length || 0
    });
    
    const {
      name,
      email,
      panNumber,
      feePercentage,
      date,
      banks = []
    } = data;

    if (!name || !email || !panNumber || !feePercentage || !date || !banks || banks.length === 0) {
      return NextResponse.json(
        { error: 'Required fields are missing: name, email, panNumber, feePercentage, date, and banks array are required' },
        { status: 400 }
      );
    }

    // Format the input date
    const formattedDate = formatDate(new Date(date));
    const totalPercentage = parseFloat(feePercentage) + 2;
    
    // Calculate total loan amount
    const totalLoanAmount = banks.reduce((total: number, bank: any) => {
      return total + (parseFloat(bank.loanAmount) || 0);
    }, 0);
    
    // Calculate fees for each bank using the provided fee percentage
    const banksWithFees = banks.map((bank: any) => {
      const loanAmount = parseFloat(bank.loanAmount) || 0;
      const feeForThisLoan = parseFloat((loanAmount * (parseFloat(feePercentage) / 100)).toFixed(2)); // Use provided fee percentage with 2 decimal places
      
      return {
        bankName: bank.bankName,
        loanAmount: formatIndianNumber(loanAmount),
        loanType: bank.loanType,
        fees: formatIndianNumber(feeForThisLoan)
      };
    });
    
    // Calculate total fees
    const totalFees = banksWithFees.reduce((total: number, bank: any) => {
      return total + parseFloat(bank.fees.replace(/,/g, ''));
    }, 0);

    // Create document from template
    const zip = new PizZip(templateBuffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    // Prepare data for the template
    const templateData = {
      date: formattedDate,
      name,
      email,
      panNumber,
      feePercentage: `${feePercentage}%`,
      totalPercentage: `${totalPercentage}%`,
      totalLoanAmount: formatIndianNumber(totalLoanAmount),
      totalFees: formatIndianNumber(totalFees),
      banksWithFees,
      numberOfBanks: banks.length.toString()
    };

    // Using the modern approach instead of deprecated setData
    doc.render(templateData);

    // Generate document as buffer
    const buffer = doc.getZip().generate({ type: "nodebuffer" });
    console.log('Billcut PAS document generated successfully');
    
    // Save to temporary file (needed for verification)
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `${name}_billcut_pas_agreement_${Date.now()}.docx`);
    fs.writeFileSync(tempFilePath, buffer);
    console.log('Temporary file created at:', tempFilePath);
    
    // Upload to Firebase Storage
    const documentPath = `clients/billcut-pas/documents/${name}_billcut_pas_agreement.docx`;
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
      documentName: `${name}_billcut_pas_agreement.docx`,
      documentUploadedAt: new Date().toISOString(),
      calculatedData: {
        totalLoanAmount: formatIndianNumber(totalLoanAmount),
        totalFees: formatIndianNumber(totalFees),
        numberOfBanks: banks.length,
        banksWithFees
      }
    });
    
  } catch (error: any) {
    console.error('Error generating billcut PAS agreement:', error);
    return NextResponse.json(
      { error: 'Failed to generate billcut PAS agreement', details: error.message },
      { status: 500 }
    );
  }
}

// Helper function to format date as DD/MM/YYYY
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB');
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
