import { NextResponse } from 'next/server';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { storage } from '../../../firebase/firebase-admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name1,
      bankAddress,
      bankEmail,
      accountType,
      number,
      reason,
      email,
      selectedBank,
    } = body;

    // Input validation
    if (!name1 || !bankAddress || !bankEmail || !accountType || !number || !reason || !email) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
    }

    // For emails: split by comma and join with newlines
    const formattedBankEmails = bankEmail.split(',').map((email: string) => email.trim()).join('\n');
    
    // For addresses: Do NOT split addresses - preserve them as is
    // Just trim extra whitespace
    const formattedBankAddresses = bankAddress.trim();
    
    // Get today's date formatted
    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    // Set up data for the template
    const requestData = {
      name1,
      bankAddress: formattedBankAddresses,
      bankEmail: formattedBankEmails,
      accountType,
      number,
      reason,
      email,
      selectedBank,
      date: formattedDate
    };

    // Use storage directly
    const bucket = storage.bucket();
    const file = bucket.file('templates/request_letter_template.docx');
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
        'Content-Disposition': `attachment; filename="${name1}_request_letter.docx"`,
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