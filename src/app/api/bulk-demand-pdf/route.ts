import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import { fillDemandNoticeTemplate } from '../../../utils/demandNoticePdfTemplate';
import fs from 'fs';
import PizZip from 'pizzip';

interface NoticeData {
    name2: string;
    bankName: string;
    bankAddress: string;
    bankEmail: string;
    reference: string;
    email: string;
    date: string;
}

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

/**
 * Format a date string to DD/MM/YYYY format
 */
function formatDateToDDMMYYYY(dateString: string): string {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return dateString;
    }
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

export async function POST(request: Request) {
    let browser = null;
    try {
        const body = await request.json();
        const { notices } = body as { notices: NoticeData[] };

        if (!notices || !Array.isArray(notices) || notices.length === 0) {
            return NextResponse.json({ error: 'At least one notice is required.' }, { status: 400 });
        }

        // Launch Puppeteer once for all PDFs - try local Chrome first
        const localChrome = findLocalChrome();

        if (localChrome) {
            console.log('[bulk-demand-pdf] Using local Chrome:', localChrome);
            browser = await puppeteer.launch({
                executablePath: localChrome,
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
            });
        } else {
            console.log('[bulk-demand-pdf] Using @sparticuz/chromium (serverless)');
            const chromium = (await import('@sparticuz/chromium')).default;
            browser = await puppeteer.launch({
                args: chromium.args,
                defaultViewport: chromium.defaultViewport,
                executablePath: await chromium.executablePath(),
                headless: chromium.headless,
            });
        }

        // Create ZIP for all PDFs
        const bulkZip = new PizZip();
        let generatedCount = 0;
        let skippedCount = 0;

        for (const notice of notices) {
            const { name2, bankName, bankAddress, bankEmail, reference, email, date } = notice;

            // Skip invalid entries
            if (!name2 || !bankName || !bankAddress || !bankEmail || !reference || !email || !date) {
                skippedCount++;
                continue;
            }

            // Prepare data for the template (same logic as single demand-pdf route)
            const requestData = {
                name2,
                bankName,
                bankAddress: bankAddress.replace(/\.\s+(?=Mr\.|Ms\.|Mrs\.|Smt\.|Shri\b|The\b)/gi, '.\n').trim(),
                bankEmail: bankEmail.split(',').map((e: string) => e.trim()).join('\n'),
                reference,
                email,
                date: formatDateToDDMMYYYY(date)
            };

            // Generate filled HTML from template
            const fullHtml = fillDemandNoticeTemplate(requestData);

            // Create a new page for each PDF
            const page = await browser.newPage();
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

            await page.close();

            // Add to ZIP
            const safeName = name2.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const safeBank = bankName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const fileName = `${safeName}_${safeBank}_demandNotice.pdf`;

            bulkZip.file(fileName, pdf);
            generatedCount++;
        }

        await browser.close();
        browser = null;

        if (generatedCount === 0) {
            return NextResponse.json({ error: 'No valid notices could be generated. All entries were skipped.' }, { status: 400 });
        }

        // Generate final ZIP buffer
        const finalBuffer = bulkZip.generate({ type: 'nodebuffer' });

        console.log(`[bulk-demand-pdf] Generated ${generatedCount} PDFs, skipped ${skippedCount}`);

        return new NextResponse(new Uint8Array(finalBuffer), {
            headers: {
                'Content-Disposition': `attachment; filename="bulk_demand_notices_pdf.zip"`,
                'Content-Type': 'application/zip'
            }
        });
    } catch (error: any) {
        console.error('Error generating bulk PDFs:', error);
        return NextResponse.json(
            { error: `An error occurred while generating the PDFs: ${error.message}` },
            { status: 500 }
        );
    } finally {
        if (browser) {
            try { await browser.close(); } catch (_) { }
        }
    }
}
