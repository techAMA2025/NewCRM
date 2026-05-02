import { NextRequest, NextResponse } from 'next/server'
import puppeteer from 'puppeteer-core'
import fs from 'fs'
import path from 'path'
import { fillMediationNoticeTemplate } from '@/utils/mediationNoticeTemplate'
import { verifyAuth } from '@/lib/auth'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

const POSSIBLE_CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
]

function findLocalChrome(): string | null {
  for (const p of POSSIBLE_CHROME_PATHS) {
    if (fs.existsSync(p)) return p
  }
  return null
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('en-GB')
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
      noticeDate,
    } = body

    if (!clientName || !clientPhone) {
      return NextResponse.json({ error: 'clientName and clientPhone are required.' }, { status: 400 })
    }

    let advocateLogoBase64 = ''
    try {
      const logoPath = path.join(process.cwd(), 'public/advocate-leash.png')
      if (fs.existsSync(logoPath)) {
        advocateLogoBase64 = fs.readFileSync(logoPath, 'base64')
      }
    } catch (e) {
      console.warn('Could not read advocate-leash.png:', e)
    }

    const html = fillMediationNoticeTemplate({
      clientName,
      clientPhone,
      clientAddress: clientAddress || 'Address on file',
      noticeDate: noticeDate ? formatDate(noticeDate) : formatDate(new Date().toISOString()),
      advocateLogoBase64,
    })

    const localChrome = findLocalChrome()
    let browser

    if (localChrome) {
      browser = await puppeteer.launch({
        executablePath: localChrome,
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
      })
    } else {
      const chromium = (await import('@sparticuz/chromium-min')).default
      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(
          'https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar'
        ),
        headless: chromium.headless,
      } as any)
    }

    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'domcontentloaded' })

    const pdf = await page.pdf({
      format: 'A4',
      margin: { top: '20mm', right: '18mm', bottom: '20mm', left: '22mm' },
      printBackground: true,
    })

    await browser.close()

    const safeClientName = clientName.replace(/[^a-z0-9]/gi, '_')

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Disposition': `attachment; filename="${safeClientName}_mediation_notice.pdf"`,
        'Content-Type': 'application/pdf',
      },
    })
  } catch (error: any) {
    console.error('[mediation-notice-pdf] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
