import { NextRequest, NextResponse } from "next/server"
import { adminAuth } from "@/firebase/firebase-admin"
import * as nodemailer from "nodemailer"

export const dynamic = "force-dynamic"

/**
 * POST /api/escalations/send-email
 *
 * Sends an escalation-related email to a client via Zoho Mail.
 *
 * Body:
 *   clientName   string – Name of the client
 *   clientEmail  string – Email of the client
 *   subject      string – Email subject line
 *   htmlBody     string – Full HTML email body
 *   escalationId string – Firestore escalation doc ID (for logging)
 */
export async function POST(request: NextRequest) {
    if (!adminAuth) {
        return NextResponse.json({ error: "Firebase Admin not initialized" }, { status: 500 })
    }

    // --- Auth ---
    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
        await adminAuth.verifyIdToken(authHeader.split("Bearer ")[1])
    } catch {
        return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    try {
        const body = await request.json()
        const { clientName, clientEmail, subject, htmlBody, escalationId } = body as {
            clientName: string
            clientEmail: string
            subject: string
            htmlBody: string
            escalationId: string
        }

        if (!clientEmail || !subject || !htmlBody) {
            return NextResponse.json({ error: "Missing required fields (clientEmail, subject, htmlBody)" }, { status: 400 })
        }

        // --- Zoho SMTP Configuration for Escalations ---
        const ZOHO_EMAIL = "escalations@amalegalsolutions.com"
        const ZOHO_PASSWORD = process.env.ESCALATION_APP_PASSWORD

        if (!ZOHO_PASSWORD) {
            console.error("[ESCALATION_EMAIL] ESCALATION_APP_PASSWORD missing in environment")
            return NextResponse.json({
                success: false,
                message: "Escalation email credentials not configured",
            }, { status: 500 })
        }

        // Try multiple SMTP configurations for Zoho
        const smtpConfigs = [
            {
                host: "smtp.zoho.in",
                port: 465,
                secure: true,
                auth: { user: ZOHO_EMAIL, pass: ZOHO_PASSWORD }
            },
            {
                host: "smtp.zoho.com",
                port: 465,
                secure: true,
                auth: { user: ZOHO_EMAIL, pass: ZOHO_PASSWORD }
            },
            {
                host: "smtp.zoho.in",
                port: 587,
                secure: false,
                requireTLS: true,
                auth: { user: ZOHO_EMAIL, pass: ZOHO_PASSWORD }
            }
        ]

        let transporter = null
        let lastError = null

        for (const config of smtpConfigs) {
            try {
                console.log(`[ESCALATION_EMAIL] Attempting SMTP: ${config.host}:${config.port} (secure: ${config.secure})`)
                const t = nodemailer.createTransport(config)
                await t.verify()
                transporter = t
                console.log(`[ESCALATION_EMAIL] SMTP connection verified: ${config.host}`)
                break
            } catch (err) {
                lastError = err
                console.warn(`[ESCALATION_EMAIL] Config failed: ${config.host}:${config.port}`, err instanceof Error ? err.message : err)
            }
        }

        if (!transporter) {
            console.error("[ESCALATION_EMAIL] All SMTP configurations failed", lastError)
            return NextResponse.json({
                success: false,
                message: "Email service unavailable",
                detail: lastError instanceof Error ? lastError.message : "Unknown error"
            }, { status: 503 })
        }

        // --- Send Email ---
        const mailOptions = {
            from: `"AMA Legal Solutions - Escalations" <${ZOHO_EMAIL}>`,
            to: clientEmail,
            subject,
            html: htmlBody,
        }

        console.log(`[ESCALATION_EMAIL] Sending escalation email to ${clientEmail} (Escalation: ${escalationId}, Client: ${clientName})`)

        const info = await transporter.sendMail(mailOptions)

        console.log(`[ESCALATION_EMAIL] Email sent successfully. MessageId: ${info.messageId}`)

        return NextResponse.json({
            success: true,
            messageId: info.messageId,
        })
    } catch (error: any) {
        console.error("[ESCALATION_EMAIL] Error sending email:", error)
        return NextResponse.json(
            { error: "Failed to send email", detail: error.message },
            { status: 500 }
        )
    }
}
