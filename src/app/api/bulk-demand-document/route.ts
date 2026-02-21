import { NextResponse } from 'next/server';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { storage } from '../../../firebase/firebase-admin';

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
    if (!storage) {
        return NextResponse.json({ error: "Firebase Admin Storage not initialized" }, { status: 500 });
    }

    try {
        const body = await request.json();
        const { notices } = body as { notices: NoticeData[] };

        if (!notices || !Array.isArray(notices) || notices.length === 0) {
            return NextResponse.json({ error: 'At least one notice is required.' }, { status: 400 });
        }

        // Use storage directly
        const bucket = storage.bucket();
        const file = bucket.file('templates/demand_notice_template.docx');
        const [templateBuffer] = await file.download();

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

            // Basic validation for each item
            if (!name2 || !bankName || !bankAddress || !bankEmail || !reference || !email || !date) {
                continue; // Skip invalid entries or we could throw an error
            }

            // For emails: split by comma and join with newlines
            const formattedBankEmails = bankEmail.split(',').map((e: string) => e.trim()).join('\n');

            // For addresses: split by comma and join with newlines
            const formattedBankAddresses = bankAddress.split(',').map((a: string) => a.trim()).join('\n');

            // Format the date to dd/mm/yyyy
            const formattedDate = formatDateToDDMMYYYY(date);

            // Set up data for the template
            const requestData = {
                name2,
                bankName,
                bankAddress: formattedBankAddresses,
                bankEmail: formattedBankEmails,
                reference,
                email,
                date: formattedDate
            };

            // Process the template
            const tempZip = new PizZip(templateBuffer);
            const doc = new Docxtemplater(tempZip, {
                paragraphLoop: true,
                linebreaks: true,
            });

            doc.setData(requestData);
            doc.render();

            // Generate document buffer
            const buffer = doc.getZip().generate({ type: 'nodebuffer' });

            // Add to bulk zip
            // We handle duplicate names by adding the reference (account number) to the filename
            const safeName = name2.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const safeBank = bankName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const fileName = `${safeName}_${safeBank}_demandNotice.docx`;

            bulkZip.file(fileName, buffer);
        }

        // Generate final zip buffer
        const finalBuffer = bulkZip.generate({ type: 'nodebuffer' });

        // Create response with appropriate headers
        return new NextResponse(new Uint8Array(finalBuffer), {
            headers: {
                'Content-Disposition': `attachment; filename="bulk_demand_notices.zip"`,
                'Content-Type': 'application/zip'
            }
        });
    } catch (error: any) {
        console.error('Error generating bulk documents:', error);
        return NextResponse.json(
            { error: `An error occurred while generating the documents: ${error.message}` },
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