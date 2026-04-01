import { NextRequest, NextResponse } from "next/server"
import { adminAuth } from "@/firebase/firebase-admin"
import * as nodemailer from "nodemailer"

export const dynamic = "force-dynamic"

/**
 * POST /api/iprkaro-leads/send-status-email
 *
 * Sends a professional email to an IPRKaro lead when their status is changed
 * to "Interested" or "Not Answering".
 *
 * Body:
 *   leadName       string  – Name of the lead
 *   leadEmail      string  – Email of the lead
 *   leadId         string  – Firestore document ID
 *   newStatus      string  – "Interested" or "Not Answering"
 *   trademarkName  string  – (optional) The trademark name the lead enquired about
 *   interest       string  – (optional) The service interest (trademark/patent/copyright)
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
        const { leadName, leadEmail, leadId, newStatus, trademarkName, interest } = body as {
            leadName: string
            leadEmail: string
            leadId: string
            newStatus: string
            trademarkName?: string
            interest?: string
        }

        if (!leadEmail || !leadId || !newStatus) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        // Only send for these two statuses
        if (newStatus !== "Interested" && newStatus !== "Not Answering") {
            return NextResponse.json({
                success: false,
                message: `Email not triggered for status: ${newStatus}`,
            })
        }

        // --- Zoho SMTP Configuration ---
        const smtpHost = process.env.IPRKARO_ZOHO_SMTP_HOST || "smtp.zoho.in"
        const smtpPort = parseInt(process.env.IPRKARO_ZOHO_SMTP_PORT || "465", 10)
        const senderEmail = process.env.IPRKARO_ZOHO_EMAIL
        const senderPassword = process.env.IPRKARO_ZOHO_APP_PASSWORD

        if (!senderEmail || !senderPassword) {
            console.warn("[IPRKARO_EMAIL] Zoho credentials not configured — skipping")
            return NextResponse.json({
                success: false,
                message: "Zoho email credentials not configured",
            })
        }

        const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: true, // SSL on port 465
            auth: {
                user: senderEmail,
                pass: senderPassword,
            },
        })

        const escapeHtml = (text: string) => {
            return text
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;")
        }

        const clientName = leadName ? escapeHtml(leadName) : "Dear Sir/Ma'am"
        const tmName = trademarkName ? `"${escapeHtml(trademarkName)}"` : "your brand"

        // Determine the service context from interest field
        let serviceContext = "intellectual property protection"
        if (interest) {
            const lower = interest.toLowerCase()
            if (lower.includes("trademark")) serviceContext = "trademark registration"
            else if (lower.includes("patent")) serviceContext = "patent filing"
            else if (lower.includes("copyright")) serviceContext = "copyright protection"
        }
        serviceContext = escapeHtml(serviceContext)

        // --- Email Templates ---
        let subject: string
        let htmlBody: string

        if (newStatus === "Interested") {
            subject = `Great speaking with you! — Next steps for ${tmName} 🛡️`

            htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f1eb;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <div style="max-width:620px;margin:30px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#0B0121 0%,#1a0a33 50%,#2d1554 100%);padding:40px 32px;text-align:center;">
      <h1 style="color:#ffffff;font-size:28px;margin:0 0 8px;font-weight:800;letter-spacing:-0.5px;">⚖️ IPRKaro</h1>
      <p style="color:#a78bfa;font-size:13px;margin:0;text-transform:uppercase;letter-spacing:3px;font-weight:600;">The Future of Brand Protection</p>
    </div>

    <!-- Body -->
    <div style="padding:36px 32px;">
      <h2 style="color:#0B0121;font-size:22px;margin:0 0 20px;font-weight:700;">Hello ${clientName},</h2>
      
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">
        It was a pleasure speaking with you earlier regarding protecting ${tmName} with <strong>IPRKaro</strong>. We're glad to see your interest in securing your brand.
      </p>

      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 20px;">
        As we discussed, IPRKaro specializes in making <strong>${serviceContext}</strong> simple, fast and affordable. Our team of experienced IP professionals is ready to guide you through every step of the process.
      </p>

      <!-- Services Box -->
      <div style="background:#f8f5ff;border:1px solid #e9defb;border-radius:12px;padding:24px;margin:0 0 24px;">
        <h3 style="color:#5b21b6;font-size:16px;margin:0 0 16px;font-weight:700;">🚀 Our Core Solutions:</h3>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0;vertical-align:top;width:28px;"><span style="font-size:18px;">™️</span></td>
            <td style="padding:8px 0;color:#374151;font-size:14px;line-height:1.5;"><strong>Trademark Registration</strong> — Protect your brand name, logo & tagline across all 45 classes</td>
          </tr>
          <tr>
            <td style="padding:8px 0;vertical-align:top;width:28px;"><span style="font-size:18px;">📋</span></td>
            <td style="padding:8px 0;color:#374151;font-size:14px;line-height:1.5;"><strong>Patent Filing</strong> — Secure exclusive rights to your inventions and innovations</td>
          </tr>
          <tr>
            <td style="padding:8px 0;vertical-align:top;width:28px;"><span style="font-size:18px;">©️</span></td>
            <td style="padding:8px 0;color:#374151;font-size:14px;line-height:1.5;"><strong>Copyright Protection</strong> — Safeguard your creative works, software & artistic content</td>
          </tr>
          <tr>
            <td style="padding:8px 0;vertical-align:top;width:28px;"><span style="font-size:18px;">🔍</span></td>
            <td style="padding:8px 0;color:#374151;font-size:14px;line-height:1.5;"><strong>Trademark Search & Analysis</strong> — AI-powered registrability reports before you file</td>
          </tr>
        </table>
      </div>

      <!-- What's Next -->
      <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;padding:24px;margin:0 0 24px;">
        <h3 style="color:#065f46;font-size:16px;margin:0 0 12px;font-weight:700;">📞 Next Steps:</h3>
        <p style="color:#374151;font-size:14px;line-height:1.7;margin:0;">
          Our IP specialist will share the necessary documents and more information via WhatsApp/Email shortly to finalize your requirements. If you have any questions in the meantime, please don't hesitate to reach out.
        </p>
      </div>

      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 8px;">
        Feel free to reach us at:
      </p>
      <p style="margin:0 0 24px;">
        <a href="mailto:info@iprkaro.com" style="color:#7c3aed;font-weight:600;text-decoration:none;">📧 info@iprkaro.com</a>
        <br/>
        <a href="https://iprkaro.com" style="color:#7c3aed;font-weight:600;text-decoration:none;">🌐 www.iprkaro.com</a>
      </p>

      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0;">
        Warm regards,<br/>
        <strong style="color:#0B0121;">Team IPRKaro</strong>
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#f9fafb;padding:20px 32px;border-top:1px solid #e5e7eb;text-align:center;">
      <p style="color:#9ca3af;font-size:11px;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">IPRKaro — A Product of AMA Legal Solutions</p>
      <p style="color:#9ca3af;font-size:11px;margin:0;">Trademark Registration • Patent Filing • Copyright Protection</p>
    </div>
  </div>
</body>
</html>`
        } else {
            // Not Answering
            subject = `Missed your call — Quick update regarding ${tmName} 📞`

            htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f1eb;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <div style="max-width:620px;margin:30px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#0B0121 0%,#1a0a33 50%,#2d1554 100%);padding:40px 32px;text-align:center;">
      <h1 style="color:#ffffff;font-size:28px;margin:0 0 8px;font-weight:800;letter-spacing:-0.5px;">⚖️ IPRKaro</h1>
      <p style="color:#a78bfa;font-size:13px;margin:0;text-transform:uppercase;letter-spacing:3px;font-weight:600;">The Future of Brand Protection</p>
    </div>

    <!-- Body -->
    <div style="padding:36px 32px;">
      <h2 style="color:#0B0121;font-size:22px;margin:0 0 20px;font-weight:700;">Hello ${clientName},</h2>
      
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">
        Our team tried reaching out to you a few moments ago to discuss your enquiry about <strong>${serviceContext}</strong> for ${tmName}, but unfortunately couldn't connect.
      </p>

      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 20px;">
        We understand you may be busy, so we wanted to drop a quick note to let you know that our team at <strong>IPRKaro</strong> is ready to assist you whenever it's convenient for you.
      </p>

      <!-- Why Act Now Box -->
      <div style="background:#fefce8;border:1px solid #fde68a;border-radius:12px;padding:24px;margin:0 0 24px;">
        <h3 style="color:#92400e;font-size:16px;margin:0 0 16px;font-weight:700;">⏳ Why You Shouldn't Delay IP Protection:</h3>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0;vertical-align:top;width:28px;"><span style="font-size:16px;">⚠️</span></td>
            <td style="padding:8px 0;color:#374151;font-size:14px;line-height:1.5;">India follows a <strong>"first-to-file"</strong> system — someone else could register your brand name before you do</td>
          </tr>
          <tr>
            <td style="padding:8px 0;vertical-align:top;width:28px;"><span style="font-size:16px;">🔒</span></td>
            <td style="padding:8px 0;color:#374151;font-size:14px;line-height:1.5;">Without trademark protection, you have <strong>no legal recourse</strong> if someone copies your brand</td>
          </tr>
          <tr>
            <td style="padding:8px 0;vertical-align:top;width:28px;"><span style="font-size:16px;">💡</span></td>
            <td style="padding:8px 0;color:#374151;font-size:14px;line-height:1.5;">Patents must be filed <strong>before public disclosure</strong> — delays can cost you your rights entirely</td>
          </tr>
          <tr>
            <td style="padding:8px 0;vertical-align:top;width:28px;"><span style="font-size:16px;">📈</span></td>
            <td style="padding:8px 0;color:#374151;font-size:14px;line-height:1.5;">A registered trademark <strong>increases your brand's valuation</strong> and attracts investors</td>
          </tr>
        </table>
      </div>

      <!-- Our Services -->
      <div style="background:#f8f5ff;border:1px solid #e9defb;border-radius:12px;padding:24px;margin:0 0 24px;">
        <h3 style="color:#5b21b6;font-size:16px;margin:0 0 12px;font-weight:700;">🛡️ Our Core Solutions:</h3>
        <ul style="color:#374151;font-size:14px;line-height:1.8;margin:0;padding-left:20px;">
          <li><strong>Trademark Registration</strong> — End-to-end filing in all 45 classes</li>
          <li><strong>Patent Filing</strong> — Provisional & complete specifications</li>
          <li><strong>Copyright Registration</strong> — Literary, artistic works & software</li>
          <li><strong>Free AI-Powered Trademark Search</strong> — Check registrability instantly</li>
        </ul>
      </div>

      <!-- CTA -->
      <div style="text-align:center;margin:0 0 24px;">
        <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">
          Simply reply to this email or reach out to us — we'll schedule a <strong>free consultation</strong> at your preferred time.
        </p>
        <a href="mailto:info@iprkaro.com?subject=Callback%20Request%20-%20IPRKaro" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#5b21b6);color:#ffffff;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:0.5px;">📧 Request a Callback</a>
      </div>

      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 8px;">
        You can also reach us at:
      </p>
      <p style="margin:0 0 24px;">
        <a href="mailto:info@iprkaro.com" style="color:#7c3aed;font-weight:600;text-decoration:none;">📧 info@iprkaro.com</a>
        <br/>
        <a href="https://iprkaro.com" style="color:#7c3aed;font-weight:600;text-decoration:none;">🌐 www.iprkaro.com</a>
      </p>

      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0;">
        Looking forward to hearing from you,<br/>
        <strong style="color:#0B0121;">Team IPRKaro</strong>
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#f9fafb;padding:20px 32px;border-top:1px solid #e5e7eb;text-align:center;">
      <p style="color:#9ca3af;font-size:11px;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">IPRKaro — A Product of AMA Legal Solutions</p>
      <p style="color:#9ca3af;font-size:11px;margin:0;">Trademark Registration • Patent Filing • Copyright Protection</p>
    </div>
  </div>
</body>
</html>`
        }

        // --- Send Email ---
        const mailOptions = {
            from: `"IPRKaro" <${senderEmail}>`,
            to: leadEmail,
            subject,
            html: htmlBody,
        }

        console.log(`[IPRKARO_EMAIL] Sending "${newStatus}" email to ${leadEmail} (Lead: ${leadId})`)

        const info = await transporter.sendMail(mailOptions)

        console.log(`[IPRKARO_EMAIL] Email sent successfully. MessageId: ${info.messageId}`)

        return NextResponse.json({
            success: true,
            messageId: info.messageId,
            status: newStatus,
        })
    } catch (error: any) {
        console.error("[IPRKARO_EMAIL] Error sending email:", error)
        return NextResponse.json(
            { error: "Failed to send email", detail: error.message },
            { status: 500 }
        )
    }
}
