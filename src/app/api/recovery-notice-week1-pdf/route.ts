import { NextRequest, NextResponse } from 'next/server'
import puppeteer from 'puppeteer-core'
import fs from 'fs'
import { fillWeek1NoticeTemplate } from '@/utils/recoveryNoticeWeek1Template'
import { verifyAuth } from '@/lib/auth'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

const LOCAL_CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
]

function findLocalChrome(): string | null {
  for (const p of LOCAL_CHROME_PATHS) {
    if (fs.existsSync(p)) return p
  }
  return null
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request)
  if (auth.error) return auth.error

  try {
    const body = await request.json()
    const {
      clientName,
      clientPhone,
      clientAddress,
      clientEmail,
      startDate,
      totalFees,
      amountPending,
      noticeDate,
    } = body

    if (!clientName || !clientPhone || !amountPending) {
      return NextResponse.json({ error: 'clientName, clientPhone, and amountPending are required.' }, { status: 400 })
    }

    let headerLogoBase64 = ''
    let stampLogoBase64 = ''
    let signatureBase64 = ''
    try {
      const headerPath = process.cwd() + '/public/demand/header logo AMA .png'
      if (fs.existsSync(headerPath)) {
        headerLogoBase64 = fs.readFileSync(headerPath, 'base64')
      }
      const stampPath = process.cwd() + '/public/demand/AMA stamp logo.png'
      if (fs.existsSync(stampPath)) {
        stampLogoBase64 = fs.readFileSync(stampPath, 'base64')
      }
      const sigPath = process.cwd() + '/public/demand/Signature.png'
      if (fs.existsSync(sigPath)) {
        signatureBase64 = fs.readFileSync(sigPath, 'base64')
      }
    } catch (e) {
      console.warn('Could not read logo PNGs:', e)
    }

    const html = fillWeek1NoticeTemplate({
      clientName,
      clientPhone,
      clientAddress: clientAddress || 'Address on file',
      clientEmail,
      startDate: startDate ? formatDate(startDate) : formatDate(new Date().toISOString()),
      totalFees: totalFees || amountPending,
      amountPending,
      noticeDate: noticeDate ? formatDate(noticeDate) : formatDate(new Date().toISOString()),
      headerLogoBase64,
      stampLogoBase64,
      signatureBase64,
    })

    // Launch Puppeteer
    let browser
    const localChrome = findLocalChrome()

    if (localChrome) {
      browser = await puppeteer.launch({
        executablePath: localChrome,
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
      })
    } else {
      const chromium = (await import('@sparticuz/chromium-min')).default as any
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
      } as any)
    }

    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 15000 })

    const pdf = await page.pdf({
      format: 'A4',
      margin: { top: '20mm', right: '18mm', bottom: '20mm', left: '22mm' },
      printBackground: true,
    })

    await browser.close()

    const safeClientName = clientName.replace(/[^a-z0-9]/gi, '_')

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Disposition': `attachment; filename="${safeClientName}_week1_recovery_notice.pdf"`,
        'Content-Type': 'application/pdf',
      },
    })
  } catch (error: any) {
    console.error('[recovery-notice-week1-pdf] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
