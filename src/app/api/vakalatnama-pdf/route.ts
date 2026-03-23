import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import { fillVakalatnamaTemplate } from '../../../utils/vakalatnamaPdfTemplate';
import fs from 'fs';
import { verifyAuth } from '@/lib/auth';

// Vercel serverless config
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// Local Chrome paths to check
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
            arbitrator,
            caseNo,
            bankName,
            clientName,
            date
        } = body;

        // Input validation
        if (!arbitrator || !caseNo || !bankName || !clientName || !date) {
            return NextResponse.json({ error: 'All fields are required (Arbitrator, Case No, Bank, Client, Date).' }, { status: 400 });
        }

        // Generate filled HTML from template
        const fullHtml = fillVakalatnamaTemplate({
            arbitrator,
            caseNo,
            bankName,
            clientName,
            date: formatDateToDDMMYYYY(date)
        });

        // Launch Puppeteer
        let browser;
        const localChrome = findLocalChrome();

        if (localChrome) {
            browser = await puppeteer.launch({
                executablePath: localChrome,
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
            });
        } else {
            console.log('[vakalatnama-pdf] Using @sparticuz/chromium-min (serverless)');
            const chromium = (await import('@sparticuz/chromium-min')).default;
            browser = await puppeteer.launch({
                args: [
                    ...chromium.args,
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--no-zygote',
                    '--single-process',
                ],
                defaultViewport: (chromium as any).defaultViewport || { width: 800, height: 600 },
                executablePath: await chromium.executablePath(
                    'https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar'
                ),
                headless: true,
            } as any);
        }

        const page = await browser.newPage();
        await page.setContent(fullHtml, { waitUntil: 'domcontentloaded', timeout: 15000 });

        // Generate PDF
        const pdf = await page.pdf({
            format: 'A4',
            margin: {
                top: '10mm',
                bottom: '10mm',
                left: '0px',
                right: '0px'
            },
            printBackground: true,
        });

        await browser.close();

        return new NextResponse(new Uint8Array(pdf), {
            headers: {
                'Content-Disposition': `attachment; filename="${clientName}_vakalatnama.pdf"`,
                'Content-Type': 'application/pdf'
            }
        });
    } catch (error: any) {
        console.error('Error generating Vakalatnama PDF:', error);
        return NextResponse.json(
            { error: `An error occurred while generating the PDF: ${error.message}` },
            { status: 500 }
        );
    }
}

function formatDateToDDMMYYYY(dateString: string): string {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}
