import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import { fillDemandNoticeTemplate } from '../../../utils/demandNoticePdfTemplate';
import fs from 'fs';
import PizZip from 'pizzip';
import { storage, db } from '../../../firebase/firebase-admin';
import admin from 'firebase-admin';
import { verifyAuth } from '@/lib/auth';

// Vercel serverless config — bulk PDF generation needs more time
export const maxDuration = 300; // 5 minutes (requires Vercel Pro plan)
export const dynamic = 'force-dynamic';

interface NoticeData {
    clientId?: string;
    name2: string;
    bankName: string;
    bankAddress: string;
    bankEmail: string;
    reference: string;
    referenceNumber?: string;
    email: string;
    lawyerEmail?: string;
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

export async function POST(request: NextRequest) {
    const auth = await verifyAuth(request);
    if (auth.error) return auth.error;

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
            console.log('[bulk-demand-pdf] Using @sparticuz/chromium-min (serverless)');
            // Fix for Vercel production: Switch to -min package
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
                headless: true, // v23+ supports true/false and 'shell'
            } as any);
        }

        // Create ZIP for all PDFs
        const bulkZip = new PizZip();
        let generatedCount = 0;
        let skippedCount = 0;

        // Separate valid and invalid notices
        const validNotices = notices.filter(notice => {
            const { name2, bankName, bankAddress, bankEmail, reference, email, date } = notice;
            if (!name2 || !bankName || !bankAddress || !bankEmail || !reference || !email || !date) {
                skippedCount++;
                return false;
            }
            return true;
        });

        // Process PDFs in parallel batches of 10
        const BATCH_SIZE = 10;
        for (let i = 0; i < validNotices.length; i += BATCH_SIZE) {
            const batch = validNotices.slice(i, i + BATCH_SIZE);

            // Parallel PDF creation for the batch
            const generationResults = await Promise.all(batch.map(async (notice) => {
                const { name2, bankAddress, bankEmail, reference, referenceNumber, email, date } = notice;

                const requestData = {
                    name2,
                    bankName: notice.bankName,
                    bankAddress: bankAddress.replace(/\.\s+(?=Mr\.|Ms\.|Mrs\.|Smt\.|Shri\b|The\b)/gi, '.\n').trim(),
                    bankEmail: bankEmail.split(',').map((e: string) => e.trim()).join('\n'),
                    reference,
                    referenceNumber: referenceNumber || '',
                    email,
                    date: formatDateToDDMMYYYY(date)
                };

                const fullHtml = fillDemandNoticeTemplate(requestData);

                let page = null;
                try {
                    page = await browser!.newPage();
                    await page.setContent(fullHtml, { waitUntil: 'domcontentloaded', timeout: 15000 });

                    const pdf = await page.pdf({
                        format: 'A4',
                        margin: { top: '10px', right: '0px', bottom: '10px', left: '0px' },
                        printBackground: true,
                    });

                    return { pdf, notice, success: true };
                } catch (err) {
                    console.error("Failed to generate PDF for:", name2, err);
                    return { pdf: null, notice, success: false };
                } finally {
                    if (page) await page.close();
                }
            }));

            // Parallel Firebase processing for the batch
            await Promise.all(generationResults.map(async (result) => {
                if (!result.success || !result.pdf) {
                    skippedCount++;
                    return;
                }

                const { pdf, notice } = result;
                const { clientId, name2, bankName, bankEmail, lawyerEmail, reference, referenceNumber, email } = notice;

                const safeName = name2.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                const safeBank = bankName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                const fileName = `${safeName}_${safeBank}_demandNotice.pdf`;

                bulkZip.file(fileName, pdf);
                generatedCount++;

                if (storage && db) {
                    try {
                        const safeClientId = clientId || 'unknown_client';
                        const timestamp = Date.now();
                        const storagePath = `demand_notices/${safeClientId}/${timestamp}_${fileName}`;

                        const bucket = storage.bucket();
                        const file = bucket.file(storagePath);
                        
                        // Run storage save and db add in parallel for this notice
                        await Promise.all([
                            file.save(pdf, { metadata: { contentType: 'application/pdf' } }),
                            db.collection('generated_outbox').add({
                                clientId: safeClientId,
                                clientName: name2,
                                clientEmail: email,
                                bankName: bankName,
                                bankEmail: bankEmail,
                                lawyerEmail: lawyerEmail || '',
                                reference: reference,
                                referenceNumber: referenceNumber || '',
                                storagePath: storagePath,
                                fileName: fileName,
                                status: 'pending_dispatch',
                                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                                generatedAt: new Date().toISOString()
                            })
                        ]);
                    } catch (e) {
                        console.error("Failed to upload/save metadata for", name2, e);
                    }
                }
            }));

            console.log(`[bulk-demand-pdf] Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(validNotices.length / BATCH_SIZE)} done`);
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
