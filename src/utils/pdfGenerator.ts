import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium-min';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import mammoth from 'mammoth';
import { storage } from '../firebase/firebase-admin';

/**
 * Generates a PDF from a Docx template stored in Firebase Storage.
 * 
 * Flow:
 * 1. Download .docx template from Firebase Storage
 * 2. Fill template with data using Docxtemplater
 * 3. Convert filled .docx to HTML using Mammoth
 * 4. Convert HTML to PDF using Puppeteer/Chromium
 * 
 * @param data The data to fill into the template
 * @param templateName The name of the template (e.g., 'demand-notice')
 * @returns Buffer containing the generated PDF
 */
export async function generatePDF(data: any, templateName: string): Promise<Buffer> {
    if (!storage) {
        throw new Error("Firebase Admin Storage not initialized");
    }

    try {
        const bucket = storage.bucket();

        // Define possible template paths
        const possiblePaths = [
            `templates/${templateName}_template.docx`,
            `templates/${templateName}.docx`,
            `templates/demand_notice_template.docx` // Fallback specifically for demand notice
        ];

        let templateBuffer: Buffer | null = null;
        let lastError: any = null;

        for (const path of possiblePaths) {
            try {
                const file = bucket.file(path);
                const [buffer] = await file.download();
                templateBuffer = buffer;
                console.log(`[pdfGenerator] Successfully loaded template from: ${path}`);
                break;
            } catch (err) {
                lastError = err;
                continue;
            }
        }

        if (!templateBuffer) {
            throw new Error(`Could not load template '${templateName}' from Firebase Storage. Last error: ${lastError?.message}`);
        }

        // 1. Generate filled DOCX
        const zip = new PizZip(templateBuffer);
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
        });

        doc.setData(data);
        doc.render();
        const docxBuffer = doc.getZip().generate({ type: 'nodebuffer' });

        // 2. Convert DOCX to HTML using mammoth
        // We use a custom style map to preserve some basic formatting if needed
        const { value: html } = await mammoth.convertToHtml({ buffer: docxBuffer });

        // 3. Convert HTML to PDF using puppeteer/chromium
        const browser = await puppeteer.launch({
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
                'https://github.com/SPARTICUZ/chromium/releases/download/v134.0.0/chromium-v134.0.0-pack.tar'
            ),
            headless: true,
        } as any);

        const page = await browser.newPage();
        
        // Add basic styles to make the PDF look professional
        const fullHtml = `
            <!DOCTYPE html>
            <html>
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body {
                            font-family: 'Helvetica', 'Arial', sans-serif;
                            line-height: 1.6;
                            color: #333;
                            padding: 40px;
                            max-width: 800px;
                            margin: 0 auto;
                        }
                        p { margin-bottom: 15px; }
                        h1, h2, h3 { color: #000; }
                        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        .header { text-align: center; margin-bottom: 30px; }
                        .footer { margin-top: 50px; font-size: 12px; text-align: center; color: #777; }
                    </style>
                </head>
                <body>
                    <div class="content">
                        ${html}
                    </div>
                </body>
            </html>
        `;

        await page.setContent(fullHtml, { waitUntil: 'domcontentloaded', timeout: 15000 });

        const pdf = await page.pdf({
            format: 'A4',
            margin: {
                top: '20mm',
                right: '20mm',
                bottom: '20mm',
                left: '20mm'
            },
            printBackground: true
        });

        await browser.close();

        return Buffer.from(pdf);
    } catch (error: any) {
        console.error('[pdfGenerator] Error:', error);
        throw new Error(`PDF Generation failed: ${error.message}`);
    }
}
