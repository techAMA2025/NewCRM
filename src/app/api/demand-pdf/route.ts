import { NextResponse } from 'next/server';
import { generatePDF } from '@/utils/pdfGenerator';

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
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
    }

    // Prepare data for the template
    const requestData = {
      name2,
      bankName,
      bankAddress: bankAddress.split(',').map((a: string) => a.trim()).join('\n'),
      bankEmail: bankEmail.split(',').map((e: string) => e.trim()).join(', '),
      reference,
      email,
      date: formatDateToDDMMYYYY(date)
    };

    // Generate PDF
    const pdfBuffer = await generatePDF(requestData, 'demand-notice');

    // Create response with appropriate headers
    return new NextResponse(pdfBuffer as any, {
      headers: {
        'Content-Disposition': `attachment; filename="${name2}_demand_notice.pdf"`,
        'Content-Type': 'application/pdf'
      }
    });
  } catch (error: any) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: `An error occurred while generating the PDF: ${error.message}` },
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
