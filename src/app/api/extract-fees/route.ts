import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';
import { verifyAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (auth.error) return auth.error;

  try {
    const { documentUrl, accountNumber, bankName, expectedLoanAmount } = await request.json();

    if (!documentUrl || !accountNumber) {
      return NextResponse.json({ error: 'documentUrl and accountNumber are required' }, { status: 400 });
    }

    console.log(`Starting smarter fee extraction for account: ${accountNumber} (Expected Loan: ${expectedLoanAmount}) from ${documentUrl}`);

    // ... (fetching and parsing remains same) ...
    const response = await fetch(documentUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch document: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { value: html } = await mammoth.convertToHtml({ buffer });

    const annexureHeading = /ANNEXURE\s*[-–]?\s*A/i;
    const annexureIndex = html.search(annexureHeading);

    if (annexureIndex === -1) {
      return NextResponse.json({ error: 'Annexure-A section not found in document' }, { status: 404 });
    }

    const postAnnexureContent = html.substring(annexureIndex);
    const tableMatch = postAnnexureContent.match(/<table[^>]*>([\s\S]*?)<\/table>/i);
    if (!tableMatch) {
      return NextResponse.json({ error: 'Annexure-A table not found' }, { status: 404 });
    }

    const tableContent = tableMatch[1];
    const rows = tableContent.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
    
    let feesColumnIndex = -1;
    let loanColumnIndex = -1;

    // Identify column indices
    const headerRow = rows[0];
    if (headerRow) {
      const headerCells = headerRow.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || [];
      for (let i = 0; i < headerCells.length; i++) {
        const text = headerCells[i].replace(/<[^>]*>/g, '').trim().toLowerCase();
        if (text.includes('fee') && feesColumnIndex === -1) feesColumnIndex = i;
        if ((text.includes('loan') || text.includes('principle') || text.includes('principal') || text.includes('amount')) && 
            !text.includes('fee') && loanColumnIndex === -1) {
          loanColumnIndex = i;
        }
      }
    }

    if (rows[1]) {
        const firstDataCells = rows[1].match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || [];
        if (feesColumnIndex === -1) feesColumnIndex = firstDataCells.length - 1;
        if (loanColumnIndex === -1 && firstDataCells.length > 2) loanColumnIndex = 2;
    }

    // Matcher logic with scoring
    const cleanAccount = accountNumber.replace(/\s/g, '').toLowerCase();
    const cleanBank = bankName ? bankName.toLowerCase().trim() : "";
    const cleanExpectedLoan = expectedLoanAmount ? String(expectedLoanAmount).replace(/,/g, '').split('.')[0] : null;

    let bestMatch = { fee: null as string | null, loan: null as string | null, score: 0 };

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const cells = row.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || [];
      const rowText = row.replace(/<[^>]*>/g, '').toLowerCase();
      const cleanRowText = rowText.replace(/\s/g, '');

      let currentScore = 0;

      // Match Account Number (Highest Weight)
      if (cleanRowText.includes(cleanAccount)) {
        currentScore += 100;
      }

      // Match Bank Name
      if (cleanBank && rowText.includes(cleanBank)) {
        currentScore += 40;
      }

      // Extract Loan for this row to compare
      let rowLoan = null;
      if (loanColumnIndex !== -1 && cells[loanColumnIndex]) {
        const rawLoan = cells[loanColumnIndex].replace(/<[^>]*>/g, '').trim();
        const loanMatch = rawLoan.match(/[\d,]+(\.\d+)?/);
        if (loanMatch) {
          rowLoan = loanMatch[0].replace(/,/g, '');
          // Match Loan Amount (Weighted higher than bank name alone)
          if (cleanExpectedLoan && rowLoan.includes(cleanExpectedLoan)) {
            currentScore += 60;
          }
        }
      }

      if (currentScore > bestMatch.score) {
        // Extract Fee for this potential best match
        let rowFee = null;
        if (feesColumnIndex !== -1 && cells[feesColumnIndex]) {
          const rawFee = cells[feesColumnIndex].replace(/<[^>]*>/g, '').trim();
          const feeMatch = rawFee.match(/[\d,]+(\.\d+)?/);
          if (feeMatch) {
            rowFee = feeMatch[0].replace(/,/g, '');
          }
        }
        
        bestMatch = { fee: rowFee, loan: rowLoan, score: currentScore };
        
        // If we have a very strong match (Account or Bank+Loan), we can stop early
        if (currentScore >= 100) break; 
      }
    }

    if (bestMatch.score > 0 && (bestMatch.fee || bestMatch.loan)) {
      return NextResponse.json({ 
        success: true, 
        fee: bestMatch.fee,
        loanAmount: bestMatch.loan,
        method: 'Smarter Annexure-A detection',
        score: bestMatch.score
      });
    }

    return NextResponse.json({ error: 'Could not find data for this account in Annexure-A' }, { status: 404 });

  } catch (error: any) {
    console.error('Error in fee extraction API:', error);
    return NextResponse.json({ error: 'Internal server error during extraction', details: error.message }, { status: 500 });
  }
}
