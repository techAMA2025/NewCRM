import {
  headerLogoBase64,
  roundLogoBase64,
  signatureBase64,
  enrollmentBase64,
} from './demandNoticeImages';

interface DemandNoticeData {
  name2: string;
  bankName: string;
  bankAddress: string;
  bankEmail: string;
  reference: string;
  referenceNumber?: string;
  email: string;
  date: string;
}

/**
 * Generates the complete HTML for a Demand Notice PDF.
 * Uses a table-based layout so the header repeats on every printed page.
 * Carefully replicates the Word template design pixel-by-pixel.
 */
export function fillDemandNoticeTemplate(data: DemandNoticeData): string {
  // Format bank address lines
  const bankAddressLines = data.bankAddress
    .split('\n')
    .map((line: string) => line.trim())
    .filter((line: string) => line.length > 0)
    .map((line: string) => `<div>${line}</div>`)
    .join('');

  // Format bank emails
  const bankEmailLines = data.bankEmail
    .split(/[,\n]/)
    .map((e: string) => e.trim())
    .filter((e: string) => e.length > 0)
    .map((e: string) => `<div>${e}</div>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Demand Notice - ${data.name2}</title>
  <style>
    @import url('https://fonts.cdnfonts.com/css/bookman-old-style');

    @page {
      size: A4;
      margin: 12mm 15mm 18mm 15mm;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Bookman Old Style', 'URW Bookman L', 'Bookman', 'Georgia', 'Times New Roman', serif;
      font-size: 11.5pt;
      line-height: 1.5;
      color: #000;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* === TABLE-BASED LAYOUT FOR REPEATING HEADER/FOOTER === */
    /* The <thead> repeats on every printed page automatically */
    table.page-layout {
      width: 100%;
      border-collapse: collapse;
    }

    table.page-layout thead td,
    table.page-layout tfoot td,
    table.page-layout tbody td {
      padding: 0;
      border: none;
    }

    /* === HEADER === */
    .header-wrapper {
      padding-bottom: 8px;
    }

    .header-inner {
      text-align: center;
      border-bottom: 1.5px solid #333;
      padding-bottom: 6px;
    }

    .header-logo-img {
      width: 300px;
      height: auto;
      display: block;
      margin: 0 auto 8px auto;
    }

    .header-address {
      font-size: 9.5pt;
      color: #333;
      text-align: center;
      margin-bottom: 2px;
      font-family: 'Bookman Old Style', 'URW Bookman L', 'Georgia', serif;
    }

    .header-advocates-table {
      width: 100%;
      border: none;
      border-collapse: collapse;
      margin-top: 2px;
    }

    .header-advocates-table td {
      border: none;
      padding: 0 15px;
      vertical-align: top;
    }

    .advocate-left {
      text-align: left;
      width: 50%;
    }

    .advocate-right {
      text-align: right;
      width: 50%;
    }

    .advocate-name {
      font-weight: bold;
      font-size: 9.5pt;
      color: #000;
      font-family: 'Bookman Old Style', 'URW Bookman L', 'Georgia', serif;
    }

    .advocate-email {
      font-size: 9pt;
      color: #1a0dab;
      text-decoration: underline;
      font-family: 'Bookman Old Style', 'URW Bookman L', 'Georgia', serif;
    }

    /* === FOOTER === */
    .footer-wrapper {
      padding-top: 10px;
    }

    .footer-inner {
      border-top: 2px solid #000;
      padding-top: 6px;
    }

    .footer-table {
      width: 100%;
      border-collapse: collapse;
      border: none;
    }

    .footer-table td {
      border: none;
      padding: 0;
      vertical-align: middle;
    }

    .footer-cities {
      font-size: 7.5pt;
      font-weight: bold;
      color: #000;
      letter-spacing: 0.3px;
      text-align: center;
      font-family: 'Bookman Old Style', 'URW Bookman L', 'Georgia', serif;
    }

    .footer-stamp-img {
      width: 40px;
      height: 40px;
      opacity: 0.8;
      display: block;
      margin-left: auto;
    }

    /* === CONTENT AREA === */
    .content-area {
      padding: 8px 5px 0 5px;
    }

    /* Title section */
    .title-block {
      text-align: center;
      margin-bottom: 18px;
      position: relative;
    }

    .title-block h1 {
      font-size: 13.5pt;
      font-weight: bold;
      text-decoration: underline;
      text-transform: uppercase;
      margin-bottom: 5px;
      letter-spacing: 0.5px;
      font-family: 'Bookman Old Style', 'URW Bookman L', 'Georgia', serif;
    }

    .title-block .sub-title {
      font-size: 10.5pt;
      font-weight: bold;
      text-transform: uppercase;
      margin-bottom: 3px;
      letter-spacing: 0.3px;
      font-family: 'Bookman Old Style', 'URW Bookman L', 'Georgia', serif;
    }

    .title-stamp-img {
      position: absolute;
      top: -5px;
      right: 0;
      width: 50px;
      height: 50px;
      opacity: 0.8;
    }

    /* TO block */
    .to-block {
      margin-top: 22px;
      margin-bottom: 10px;
    }

    .to-block .to-label {
      font-weight: bold;
      font-size: 11.5pt;
      margin-bottom: 15px;
    }

    .to-block .bank-name-val {
      font-weight: bold;
      font-size: 11.5pt;
    }

    .to-block .bank-address-val {
      font-weight: bold;
      font-size: 11.5pt;
    }

    .copy-to-block {
      margin-top: 14px;
    }

    .copy-to-block .copy-label {
      font-weight: bold;
      font-size: 11.5pt;
      text-decoration: underline;
      margin-bottom: 10px;
    }

    .copy-to-block .bank-email-val {
      font-weight: bold;
      font-size: 11.5pt;
    }

    /* Reference */
    .ref-line {
      margin-top: 18px;
      margin-bottom: 8px;
      font-size: 11.5pt;
    }

    /* Salutation */
    .salutation-line {
      margin-bottom: 10px;
      font-size: 11.5pt;
    }

    /* Body text */
    p.body-paragraph {
      text-align: justify;
      font-size: 11.5pt;
      line-height: 1.55;
      margin-bottom: 10px;
      font-family: 'Bookman Old Style', 'URW Bookman L', 'Georgia', serif;
    }

    .bld {
      font-weight: bold;
    }

    /* Numbered list */
    ol.num-list {
      margin-left: 25px;
      margin-bottom: 10px;
      padding-left: 10px;
    }

    ol.num-list > li {
      text-align: justify;
      font-size: 11.5pt;
      line-height: 1.55;
      margin-bottom: 6px;
      padding-left: 4px;
      font-family: 'Bookman Old Style', 'URW Bookman L', 'Georgia', serif;
    }

    /* Letter list */
    ol.alpha-list {
      list-style-type: lower-alpha;
      margin-left: 25px;
      margin-bottom: 10px;
      padding-left: 10px;
    }

    ol.alpha-list > li {
      text-align: justify;
      font-size: 11.5pt;
      line-height: 1.55;
      margin-bottom: 6px;
      padding-left: 4px;
      font-family: 'Bookman Old Style', 'URW Bookman L', 'Georgia', serif;
    }

    /* Signature block */
    .sign-block {
      margin-top: 22px;
    }

    .sign-block .on-behalf-text {
      font-size: 11.5pt;
      margin-bottom: 12px;
    }

    .sign-img {
      width: 110px;
      height: auto;
      display: inline-block;
      vertical-align: middle;
      margin-right: 15px;
    }

    .enroll-img {
      width: 150px;
      height: auto;
      display: inline-block;
      vertical-align: middle;
    }

    .signature-row {
      margin-bottom: 12px;
    }

    .sign-details {
      font-size: 11.5pt;
      line-height: 1.5;
    }

    .sign-details div {
      font-weight: bold;
    }
  </style>
</head>
<body>

  <table class="page-layout">
    <!-- REPEATING HEADER (thead repeats on every printed page) -->
    <thead>
      <tr>
        <td>
          <div class="header-wrapper">
            <div class="header-inner">
              <img src="${headerLogoBase64}" class="header-logo-img" alt="AMA Legal Solutions" />
              <div class="header-address">2493AP, Ground floor, Sector 57, Gurugram-122003 (Haryana)</div>
              <table class="header-advocates-table">
                <tr>
                  <td class="advocate-left">
                    <div class="advocate-name">Advocate Anuj Anand Malik</div>
                    <div class="advocate-email">Adv.anuj@amalegalsolutions.com</div>
                  </td>
                  <td class="advocate-right">
                    <div class="advocate-name">Advocate Shrey Arora</div>
                    <div class="advocate-email">Adv.arora@amalegalsolutions.com</div>
                  </td>
                </tr>
              </table>
            </div>
          </div>
        </td>
      </tr>
    </thead>

    <!-- REPEATING FOOTER (tfoot repeats on every printed page) -->
    <tfoot>
      <tr>
        <td>
          <div class="footer-wrapper">
            <div class="footer-inner">
              <table class="footer-table">
                <tr>
                  <td style="width: 40px;"></td>
                  <td>
                    <span class="footer-cities">DELHI - MUMBAI - BENGALURU - KOLKATA - CHENNAI - PUNE - HYDERABAD</span>
                  </td>
                  <td style="width: 40px;">
                    <img src="${roundLogoBase64}" class="footer-stamp-img" alt="Stamp" />
                  </td>
                </tr>
              </table>
            </div>
          </div>
        </td>
      </tr>
    </tfoot>

    <!-- MAIN CONTENT -->
    <tbody>
      <tr>
        <td>
          <div class="content-area">

            <!-- ===== TITLE SECTION ===== -->
            <div class="title-block">
              <h1>Legal Notice</h1>
              <div class="sub-title">Through Speed Post/WhatsApp/E-Mail</div>
              <div class="sub-title">Without Prejudice</div>
              <img src="${roundLogoBase64}" class="title-stamp-img" alt="Stamp" />
            </div>

            <!-- ===== TO SECTION ===== -->
            <div class="to-block">
              <div class="to-label">TO,</div>
              <br/>
              <div class="bank-name-val">${data.bankName}</div>
              <div class="bank-address-val">${bankAddressLines}</div>

              <div class="copy-to-block">
                <div class="copy-label">Copy To:-</div>
                <br/>
                <div class="bank-email-val">${bankEmailLines}</div>
              </div>
            </div>

            <!-- ===== REFERENCE ===== -->
            ${data.referenceNumber ? `<div class="ref-line">Ref: <span class="bld">${data.referenceNumber}</span></div>` : ''}
            <div class="ref-line">${data.referenceNumber ? 'Account No:' : 'Ref:'} <span class="bld">${data.reference}</span></div>

            <!-- ===== SALUTATION ===== -->
            <div class="salutation-line">Dear Sir/Madam,</div>

            <!-- ===== BODY ===== -->
            <p class="body-paragraph">
              That My client <span class="bld">${data.name2}</span> received a Notice from your client
              <span class="bld">${data.bankName}</span>, stating that they have defaulted the payment willfully
              and deliberately for credit taken But I want to inform you that it is
              far from the truth, as they had already informed you several times
              in the previous emails as well as through telephonic conversations
              with recovery agents of your bank that, they are facing major
              financial difficulties due to loss of job and finances and
              expenditure being more than the income, and the additional
              medical expenses due to medical condition in the family,
              Furthermore, I want to draw your attention to the matter of fact
              that my client <span class="bld">${data.name2}</span> is not a willful defaulter but a person who
              is facing financial difficulties and not in a position to pay. That is
              why they have asked for assistance from us to settle the debt
              account, as my client wants to pay the debt and for that, our firm
              has already initiated the program. Thus, I am requesting you to
              consider the following points before you decide anything:
            </p>

            <ol class="num-list">
              <li>That my client <span class="bld">${data.name2}</span> is facing financial difficulties because
                of the poor financial condition and that the expenditure is
                more than the income.</li>
              <li>That my client is trying to accumulate the funds, if possible,
                to settle the debt accounts with your institution.</li>
              <li>My client has already informed your institution that they
                want to settle the debt amount with your Institution.</li>
              <li>I Request your institution to get approval for an offer for
                settlement. At the same time, they are trying to accumulate
                more funds.</li>
            </ol>

            <p class="body-paragraph">
              For any communications, <span class="bld">${data.name2}</span> can be reached on the
              registered email ID. ${data.email} can also be reached on the registered
              mobile number through SMS or voicemail. Alternatively, they can
              also be contacted through the authorized legal representative at
              <span class="bld">legal@amalegalsolutions.com.</span>
            </p>

            <p class="body-paragraph">
              Hence, as soon as my client receives either a settlement letter from
              your bank, and if it&rsquo;s within the financial capabilities to pay and
              clear the accounts with you, my client will make the deposit and
              clear the debt liabilities with your bank.
            </p>

            <p class="body-paragraph">
              Thus, please try to understand my client&rsquo;s situation and co-operate.
            </p>

            <p class="body-paragraph">
              In view of the above, I call upon your Client to:
            </p>

            <ol class="alpha-list">
              <li>To withdraw the Legal Notice</li>
              <li>To provide the contact details of the concerned bank officials
                who are currently handling the matter and can assist in
                facilitating the settlement process, as the agent referenced in
                the notice is no longer assigned to this case.</li>
              <li>To withdraw the illegal notice which is without the lawyer&rsquo;s enrollment number.</li>
            </ol>

            <p class="body-paragraph">
              A copy of this Reply has been preserved in my office for record
              and future course of action. Please preserve a copy of this
              notice as it may be asked to produce before the appropriate
              court of law as and when required.
            </p>

            <!-- ===== SIGNATURE BLOCK ===== -->
            <div class="sign-block">
              <div class="on-behalf-text">For and on behalf of <span class="bld">${data.name2}</span>.</div>

              <div class="signature-row">
                <img src="${signatureBase64}" class="sign-img" alt="Signature" />
                <img src="${enrollmentBase64}" class="enroll-img" alt="Enrollment" />
              </div>

              <div class="sign-details">
                <div>Date: ${data.date}</div>
                <div>Advocate Anuj Anand Malik,</div>
                <div>D/2651/2019</div>
              </div>
            </div>

          </div>
        </td>
      </tr>
    </tbody>
  </table>

</body>
</html>`;
}
