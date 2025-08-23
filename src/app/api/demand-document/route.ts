import { NextResponse } from 'next/server';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { storage } from '../../../firebase/firebase-admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name2,
      bankName,
      bankAddress,
      bankEmail,
      reference,
      email,
      date
    } = body;

    // Input validation
    if (!name2 || !bankName || !bankAddress || !bankEmail || !reference || !email || !date) {
      console.log("Missing form data:", { name2, bankName, bankAddress, bankEmail, reference, email, date });
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
    }

    // For emails: split by comma and join with newlines
    const formattedBankEmails = bankEmail.split(',').map((email: string) => email.trim()).join('\n');
    
    // For addresses: split by comma and join with newlines
    const formattedBankAddresses = bankAddress.split(',').map((address: string) => address.trim()).join('\n');
    
    // Format the date to dd/mm/yyyy
    const formattedDate = formatDateToDDMMYYYY(date);
    
    // Set up data for the template
    const requestData = {
      name2,
      bankName,
      bankAddress,
      bankEmail: formattedBankEmails,
      reference,
      email,
      date: formattedDate
    };

    // Use storage directly
    const bucket = storage.bucket();
    const file = bucket.file('templates/demand_notice_template.docx');
    const [templateBuffer] = await file.download();
    
    // Process the template
    const zip = new PizZip(templateBuffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    doc.setData(requestData);
    doc.render();

    // Generate document buffer
    const buffer = doc.getZip().generate({ type: 'nodebuffer' });
    
    // Create response with appropriate headers
    return new NextResponse(buffer, {
      headers: {
        'Content-Disposition': `attachment; filename="${name2}_demandNoticeReply.docx"`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      }
    });
  } catch (error: any) {
    console.error('Error generating document:', error);
    return NextResponse.json(
      { error: `An error occurred while generating the document: ${error.message}` },
      { status: 500 }
    );
  }
}

/**
 * Format a date string to DD/MM/YYYY format
 */
function formatDateToDDMMYYYY(dateString: string): string {
  const date = new Date(dateString);
  
  // Check if the date is valid
  if (isNaN(date.getTime())) {
    return dateString; // Return original string if invalid
  }
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
  const year = date.getFullYear();
  
  return `${day}/${month}/${year}`;
}
