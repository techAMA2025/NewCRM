import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';
import { verifyAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (auth.error) return auth.error;

  try {
    const { documentUrl, accountNumber, bankName } = await request.json();

    if (!documentUrl || !accountNumber) {
      return NextResponse.json({ error: 'documentUrl and accountNumber are required' }, { status: 400 });
    }

    console.log(`Starting fee extraction for account: ${accountNumber} from ${documentUrl}`);

    // 1. Fetch the document
    const response = await fetch(documentUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch document: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 2. Convert DOCX to HTML using mammoth
    const { value: html } = await mammoth.convertToHtml({ buffer });

    // 3. Extraction Logic
    // Look for ANNEXURE-A heading (more flexible)
    const annexureHeading = /ANNEXURE\s*[-–]?\s*A/i;
    const annexureIndex = html.search(annexureHeading);

    if (annexureIndex === -1) {
      console.warn("ANNEXURE-A heading not found in document. Content snippet:", html.substring(0, 500));
      return NextResponse.json({ error: 'Annexure-A section not found in document' }, { status: 404 });
    }

    // Extract content AFTER the heading
    const postAnnexureContent = html.substring(annexureIndex);
    
    // Find the first table in this section
    const tableMatch = postAnnexureContent.match(/<table[^>]*>([\s\S]*?)<\/table>/i);
    if (!tableMatch) {
      return NextResponse.json({ error: 'Annexure-A table not found' }, { status: 404 });
    }

    const tableContent = tableMatch[1];
    
    // Split table into rows
    const rows = tableContent.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
    
    let extractedFee: string | null = null;
    let feesColumnIndex = -1;

    // Identify "Fees" column index
    const headerRow = rows[0];
    if (headerRow) {
      const headerCells = headerRow.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || [];
      for (let i = 0; i < headerCells.length; i++) {
        const text = headerCells[i].replace(/<[^>]*>/g, '').trim().toLowerCase();
        if (text.includes('fee')) {
          feesColumnIndex = i;
          break;
        }
      }
    }

    // Default to last column if "Fees" not found by name
    if (feesColumnIndex === -1 && rows[1]) {
        const firstDataCells = rows[1].match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || [];
        feesColumnIndex = firstDataCells.length - 1;
    }

    // Matcher logic
    const cleanAccount = accountNumber.replace(/\s/g, '').toLowerCase();
    const cleanBank = bankName ? bankName.toLowerCase().trim() : "";

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const cells = row.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || [];
      const rowText = row.replace(/<[^>]*>/g, '').toLowerCase();
      const cleanRowText = rowText.replace(/\s/g, '');

      // Priority 1: Exact account number match in the row
      const hasAccount = cleanRowText.includes(cleanAccount);
      
      // Priority 2: Bank name match
      const hasBank = cleanBank && rowText.includes(cleanBank);

      if (hasAccount || hasBank) {
        if (cells[feesColumnIndex]) {
          const rawFee = cells[feesColumnIndex].replace(/<[^>]*>/g, '').trim();
          // Extract the decimal number (handling ₹ and commas)
          const feeMatch = rawFee.match(/[\d,]+(\.\d+)?/);
          if (feeMatch) {
            extractedFee = feeMatch[0].replace(/,/g, '');
            break;
          }
        }
      }
    }

    if (extractedFee) {
      return NextResponse.json({ 
        success: true, 
        fee: extractedFee,
        method: 'Annexure-A Table extraction'
      });
    }

    return NextResponse.json({ error: 'Could not find fee for this account in Annexure-A' }, { status: 404 });

  } catch (error: any) {
    console.error('Error in fee extraction API:', error);
    return NextResponse.json({ error: 'Internal server error during extraction', details: error.message }, { status: 500 });
  }
}
