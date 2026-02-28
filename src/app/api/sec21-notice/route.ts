import { NextRequest, NextResponse } from 'next/server';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { storage } from '../../../firebase/firebase-admin';

import { verifyAuth } from '@/lib/auth';
export async function POST(request: NextRequest) {
    const auth = await verifyAuth(request);
    if (auth.error) return auth.error;

    if (!storage) {
        return NextResponse.json({ error: "Firebase Admin Storage not initialized" }, { status: 500 });
    }

    try {
        const body = await request.json();
        const {
            ClientName,
            bankName,
            bankAddress,
            bankEmail,
            customerId,
            today
        } = body;

        // Input validation
        if (!ClientName || !bankName || !bankAddress || !bankEmail || !customerId || !today) {
            console.log("Missing form data:", { ClientName, bankName, bankAddress, bankEmail, customerId, today });
            return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
        }

        // For emails: split by comma and join with newlines
        const formattedBankEmails = bankEmail.split(',').map((email: string) => email.trim()).join('\n');

        // For addresses: split by comma and join with newlines
        const formattedBankAddresses = bankAddress.split(',').map((address: string) => address.trim()).join('\n');

        // Format the date to dd/mm/yyyy
        const formattedDate = formatDateToDDMMYYYY(today);

        // Set up data for the template
        const requestData = {
            ClientName,
            bankName,
            bankAddress: formattedBankAddresses,
            bankEmail: formattedBankEmails,
            customerId,
            today: formattedDate
        };

        // Use storage directly
        const bucket = storage.bucket();
        const file = bucket.file('templates/sec21_notice_template.docx');

        // Check if file exists
        const [exists] = await file.exists();
        if (!exists) {
            return NextResponse.json(
                { error: 'Template file "templates/sec21_notice_template.docx" not found in storage.' },
                { status: 404 }
            );
        }

        const [templateBuffer] = await file.download();

        // Process the template
        const zip = new PizZip(templateBuffer);
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
        });

        doc.setData(requestData);
        doc.render();

        // Generate document buffer
        const buffer = doc.getZip().generate({ type: 'nodebuffer' }) as Buffer;

        // Create response with appropriate headers
        return new NextResponse(new Uint8Array(buffer), {
            headers: {
                'Content-Disposition': `attachment; filename="${ClientName}_sec21_notice.docx"`,
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            }
        });
    } catch (error: any) {
        console.error('Error generating document:', error);
        return NextResponse.json(
            { error: `An error occurred while generating the document: ${error.message}` },
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
