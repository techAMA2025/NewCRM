import { NextResponse } from 'next/server';
import PizZip from 'pizzip';
import { generatePDF } from '@/utils/pdfGenerator';

interface NoticeData {
    name2: string;
    bankName: string;
    bankAddress: string;
    bankEmail: string;
    reference: string;
    email: string;
    date: string;
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { notices } = body as { notices: NoticeData[] };

        if (!notices || !Array.isArray(notices) || notices.length === 0) {
            return NextResponse.json({ error: 'At least one notice is required.' }, { status: 400 });
        }

        // Create a new ZIP for all documents
        const bulkZip = new PizZip();

        for (const notice of notices) {
            const {
                name2,
                bankName,
                bankAddress,
                bankEmail,
                reference,
                email,
                date
            } = notice;

            if (!name2 || !bankName || !bankAddress || !bankEmail || !reference || !email || !date) {
                continue;
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

            // Add to bulk zip
            const safeName = name2.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const safeBank = bankName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const fileName = `${safeName}_${safeBank}_demandNotice.pdf`;

            bulkZip.file(fileName, pdfBuffer);
        }

        // Generate final zip buffer
        const finalBuffer = bulkZip.generate({ type: 'nodebuffer' });

        // Create response with appropriate headers
        return new NextResponse(finalBuffer as any, {
            headers: {
                'Content-Disposition': `attachment; filename="bulk_demand_notices.zip"`,
                'Content-Type': 'application/zip'
            }
        });
    } catch (error: any) {
        console.error('Error generating bulk PDFs:', error);
        return NextResponse.json(
            { error: `An error occurred while generating the PDFs: ${error.message}` },
            { status: 500 }
        );
    }
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
