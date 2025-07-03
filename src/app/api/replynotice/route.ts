import { NextResponse } from 'next/server';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { storage } from '../../../firebase/firebase-admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      clientName,
      bankName,
      bankAddress,
      lawyerEmail,
      bankEmail,
      noticeDate,
      referenceNumber,
      clientMobile,
      accountType
    } = body;

    // Input validation
    if (!clientName || !bankName || !bankAddress || !lawyerEmail || !bankEmail || !noticeDate || !referenceNumber || !clientMobile || !accountType) {
      console.log("Missing form data:", { clientName, bankName, bankAddress, lawyerEmail, bankEmail, noticeDate, referenceNumber, clientMobile, accountType });
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
    }

    // Format emails: split by comma and join with newlines for template
    const formattedBankEmails = bankEmail.split(',').map((email: string) => email.trim()).join('\n');
    

    
    // Format the date if needed
    const formattedDate = formatDateIfNeeded(noticeDate);
    
    // Set up data for the template
    const templateData = {
      clientName,
      bankName,
      bankAddress,
      lawyerEmail,
      bankEmail: formattedBankEmails,
      noticeDate: formattedDate,
      referenceNumber,
      clientMobile,
      currentDate: getCurrentDate(), // Add today's date for the document
      accountType
    };

    // Use storage to fetch template
    const bucket = storage.bucket();
    const file = bucket.file('templates/reply_notice_template.docx');
    const [templateBuffer] = await file.download();
    
    // Process the template
    const zip = new PizZip(templateBuffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    doc.setData(templateData);
    doc.render();

    // Generate document buffer
    const buffer = doc.getZip().generate({ type: 'nodebuffer' });
    
    // Create response with appropriate headers for file download
    return new NextResponse(buffer, {
      headers: {
        'Content-Disposition': `attachment; filename="${clientName}_sec25reply_${bankName}.docx"`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      }
    });
  } catch (error: any) {
    console.error('Error generating reply notice document:', error);
    return NextResponse.json(
      { error: `An error occurred while generating the document: ${error.message}` },
      { status: 500 }
    );
  }
}

/**
 * Format a date string to DD/MM/YYYY format if it's not already in that format
 */
function formatDateIfNeeded(dateString: string): string {
  // If already in DD/MM/YYYY format, return as is
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateString)) {
    return dateString;
  }
  
  // Try to parse as a date
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

/**
 * Get current date in DD/MM/YYYY format
 */
function getCurrentDate(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  
  return `${day}/${month}/${year}`;
}
