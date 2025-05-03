import { NextResponse } from 'next/server';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { storage } from '../../../firebase/firebase-admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      bankName,
      agentName,
      agentNumber,
      harassmentLocation,
      whoWasHarassed,
      date,
      clientName,
      email,
      loanNumber
    } = body;

    // Input validation
    if (!bankName || !date || !clientName || !loanNumber || !harassmentLocation || !whoWasHarassed) {
      console.log("Missing form data:", { bankName, agentName, agentNumber, harassmentLocation, whoWasHarassed, date, clientName, email, loanNumber });
      return NextResponse.json({ error: 'Required fields are missing.' }, { status: 400 });
    }

    // Format the date to DD/MM/YYYY
    const formattedDate = new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    
    // Set up data for the template
    const requestData = {
      bankName,
      agentName: agentName || "Not provided",
      agentNumber: agentNumber || "Not provided",
      harassmentLocation,
      whoWasHarassed,
      date: formattedDate,
      clientName,
      email: email || "Not provided",
      loanNumber
    };

    // Use storage directly
    const bucket = storage.bucket();
    const file = bucket.file('templates/harassment_complaint_template.docx');
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
        'Content-Disposition': `attachment; filename="${clientName}_harassment_complaint.docx"`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      }
    });
  } catch (error: any) {
    console.error('Error generating harassment complaint document:', error);
    return NextResponse.json(
      { error: `An error occurred while generating the document: ${error.message}` },
      { status: 500 }
    );
  }
}
