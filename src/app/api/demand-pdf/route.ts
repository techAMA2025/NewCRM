import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import { fillDemandNoticeTemplate } from '../../../utils/demandNoticePdfTemplate';
import fs from 'fs';
import { verifyAuth } from '@/lib/auth';

// Vercel serverless config
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// Local Chrome paths to check (macOS, Linux, Windows)
const LOCAL_CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
];

function findLocalChrome(): string | null {
  for (const chromePath of LOCAL_CHROME_PATHS) {
    if (fs.existsSync(chromePath)) {
      return chromePath;
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const {
      name2,
      bankName,
      bankAddress,
      bankEmail,
      reference,
      referenceNumber,
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
      bankAddress: bankAddress.replace(/\.\s+(?=Mr\.|Ms\.|Mrs\.|Smt\.|Shri\b|The\b)/gi, '.\n').trim(),
      bankEmail: bankEmail.split(',').map((e: string) => e.trim()).join('\n'),
      reference,
      referenceNumber: referenceNumber || '',
      email,
      date: formatDateToDDMMYYYY(date)
    };

    // Generate filled HTML from template
    const fullHtml = fillDemandNoticeTemplate(requestData);

    // Launch Puppeteer - try local Chrome first, then fall back to @sparticuz/chromium
    let browser;
    const localChrome = findLocalChrome();

    if (localChrome) {
      console.log('[demand-pdf] Using local Chrome:', localChrome);
      browser = await puppeteer.launch({
        executablePath: localChrome,
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
      });
    } else {
      console.log('[demand-pdf] Using @sparticuz/chromium (serverless)');
      const chromium = (await import('@sparticuz/chromium')).default;
      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
      });
    }

    const page = await browser.newPage();

    // Set the HTML content
    await page.setContent(fullHtml, { waitUntil: 'networkidle0' });

    // Generate PDF
    const pdf = await page.pdf({
      format: 'A4',
      margin: {
        top: '10px',
        right: '0px',
        bottom: '10px',
        left: '0px'
      },
      printBackground: true,
    });

    await browser.close();

    // Create response with appropriate headers
    return new NextResponse(new Uint8Array(pdf), {
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
