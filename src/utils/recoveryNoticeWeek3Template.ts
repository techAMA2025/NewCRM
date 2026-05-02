export interface RecoveryNoticeWeek3Data {
  clientName: string
  clientPhone: string
  clientAddress: string
  clientEmail?: string
  startDate: string       // engagement date e.g. "01/01/2026"
  amountPending: string   // outstanding e.g. "30,000"
  noticeDate: string      // date of notice e.g. "30/04/2026"
  headerLogoBase64?: string
  stampLogoBase64?: string
  signatureBase64?: string
}

export function fillWeek3NoticeTemplate(data: RecoveryNoticeWeek3Data): string {
  const {
    clientName,
    clientPhone,
    clientAddress,
    startDate,
    amountPending,
    noticeDate,
    headerLogoBase64,
    stampLogoBase64,
    signatureBase64,
  } = data

  // Convert amount to words helper
  function amountToWords(amount: string): string {
    const num = parseFloat(amount.replace(/,/g, ''))
    if (isNaN(num)) return amount
    // Simple conversion for common values — expand as needed
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
      'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
    function convert(n: number): string {
      if (n < 20) return ones[n]
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '')
      if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convert(n % 100) : '')
      if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '')
      if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '')
      return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '')
    }
    return convert(Math.round(num))
  }

  const pendingWords = amountToWords(amountPending)

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Legal Notice – Week 3</title>
<style>
  @import url('https://fonts.cdnfonts.com/css/bookman-old-style');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'Bookman Old Style', 'URW Bookman L', 'Bookman', 'Georgia', 'Times New Roman', serif;
    font-size: 11.5pt;
    line-height: 1.6;
    color: #000;
    background: #fff;
    padding: 0;
  }

  .page {
    width: 100%;
    margin: 0 auto;
    background: #fff;
  }

  /* === TABLE-BASED LAYOUT FOR REPEATING HEADER/FOOTER === */
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

  /* Header Layout */
  .header-wrapper {
    padding-bottom: 8px;
  }
  .header-logo-img {
    width: 260px;
    height: auto;
    display: block;
    margin: 0 auto 8px auto;
  }
  .header-address {
    text-align: center;
    font-size: 11pt;
    margin-bottom: 6px;
    font-family: 'Bookman Old Style', 'URW Bookman L', 'Bookman', serif;
  }
  .advocates-row {
    display: flex;
    justify-content: space-between;
    font-size: 11pt;
    margin-bottom: 6px;
  }
  .advocate-col-left {
    text-align: left;
    margin-left: 10px;
  }
  .advocate-col-right {
    text-align: right;
    margin-right: 10px;
  }
  .advocate-name {
    font-weight: bold;
    font-size: 11pt;
    margin-bottom: 1px;
  }
  .advocate-email {
    color: #000;
  }
  .advocate-email.blue {
    color: #0066cc;
    text-decoration: underline;
  }
  .header-divider {
    border-bottom: 2px solid #000;
    margin-bottom: 15px;
  }

  /* Footer Layout */
  .footer-wrapper {
    padding-top: 10px;
  }
  .footer-inner {
    border-top: 2px solid #000;
    border-bottom: 2px solid #000;
    padding: 5px 0;
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
    font-size: 8.5pt;
    font-weight: bold;
    text-align: center;
    letter-spacing: 0.3px;
    white-space: nowrap;
  }
  .footer-stamp-img {
    width: 50px;
    height: 50px;
    opacity: 0.8;
    display: block;
    margin-left: auto;
    margin-right: 5px;
  }
  
  .content-area {
    padding: 0 5px;
  }

  /* Notice title */
  .notice-title {
    text-align: center;
    font-size: 12.5pt;
    font-weight: bold;
    text-transform: uppercase;
    margin: 14px 0 6px;
    letter-spacing: 0.5px;
  }
  .dispatch-mode {
    text-align: center;
    font-size: 10.5pt;
    font-weight: bold;
    text-transform: uppercase;
    margin-bottom: 20px;
  }
  .addressee {
    margin-bottom: 12px;
  }
  .addressee p {
    margin-bottom: 2px;
  }
  .addressee-label {
    font-weight: bold;
  }
  .subject-line {
    margin: 10px 0;
  }
  .subject-line strong {
  }
  .salutation {
    margin: 10px 0 8px;
  }
  .notice-body {
    text-align: justify;
  }
  .notice-body p {
    margin-bottom: 10px;
    text-indent: 0;
  }
  .para-label {
    font-weight: bold;
  }
  ul.bullet-list {
    margin-left: 20px;
    margin-bottom: 10px;
    list-style-type: disc;
  }
  ul.bullet-list li {
    margin-bottom: 6px;
    padding-left: 5px;
  }
  .signature-block {
    margin-top: 30px;
    text-align: left;
  }
  .signature-firm {
    font-weight: bold;
    font-size: 12pt;
  }
  .signature-sub {
    font-size: 11pt;
    margin-top: 4px;
  }
</style>
</head>
<body>

<div class="page">
  <table class="page-layout">
    <!-- REPEATING HEADER -->
    <thead>
      <tr>
        <td>
          <div class="header-wrapper">
            ${headerLogoBase64 ? `<img class="header-logo-img" src="data:image/png;base64,${headerLogoBase64}" alt="AMA Logo" />` : ''}
            <div class="header-address">
              2493AP, Ground floor, Sector 57, Gurugram-122003 (Haryana)
            </div>
            <div class="advocates-row">
              <div class="advocate-col-left">
                <div class="advocate-name">Advocate Anuj Anand Malik</div>
                <div class="advocate-email blue">Adv.anuj@amalegalsolutions.com</div>
              </div>
              <div class="advocate-col-right">
                <div class="advocate-name">Advocate Shrey Arora</div>
                <div class="advocate-email blue">Adv.arora@amalegalsolutions.com</div>
              </div>
            </div>
            <div class="date-line" style="margin-bottom: 5px;">Date: ${noticeDate}</div>
            <div class="header-divider"></div>
          </div>
        </td>
      </tr>
    </thead>

    <!-- REPEATING FOOTER -->
    <tfoot>
      <tr>
        <td>
          <div class="footer-wrapper">
            <div class="footer-inner">
              <table class="footer-table">
                <tr>
                  <td style="width: 50px;"></td>
                  <td style="text-align: center; white-space: nowrap;">
                    <span class="footer-cities">DELHI - MUMBAI - BENGALURU - KOLKATA - CHENNAI - PUNE - HYDERABAD</span>
                  </td>
                  <td style="width: 50px; text-align: right; vertical-align: middle;">
                    ${stampLogoBase64 ? `<img class="footer-stamp-img" src="data:image/png;base64,${stampLogoBase64}" alt="Stamp" />` : ''}
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

  <!-- Notice Title -->
  <div class="notice-title">LEGAL NOTICE</div>
  <div class="dispatch-mode">THROUGH REGISTERED A.D./SPEED POST/EMAIL/WHATSAPP</div>

  <!-- Addressee -->
  <div class="addressee">
    <p><span class="addressee-label">To,</span></p>
    <p>${clientName}</p>
    <p>${clientPhone}</p>
    <p>${clientAddress}</p>
  </div>

  <!-- Subject -->
  <div class="subject-line">
    <strong>Subject: FINAL 7-DAY ULTIMATUM – Immediate Payment of Outstanding Dues Failing Which Civil Suit, Criminal Complaint, Mediation/Conciliation and Arbitration Proceedings Shall Be Initiated.</strong>
  </div>

  <!-- Salutation -->
  <div class="salutation">Sir/Madam,</div>

  <!-- Body -->
  <div class="notice-body">

    <p><strong>That we, AMA Legal Solutions<sup>®</sup></strong>, a duly established legal consultancy firm, through our Authorized Representative, do hereby serve upon you this <strong>Final and Last Legal Notice</strong> as under:</p>

    <p><span class="para-label">1.</span>&nbsp;&nbsp;<strong>That</strong> you had engaged our firm for professional legal services pursuant to engagement dated <strong>${startDate}</strong>, which was duly accepted by you, either expressly and/or by conduct, including continuous availing of services without protest.</p>

    <p><span class="para-label">2.</span>&nbsp;&nbsp;<strong>That</strong> despite having fully availed the services rendered by our firm, you have deliberately, willfully, and intentionally defaulted in making payment of the agreed professional fees.</p>

    <p><span class="para-label">3.</span>&nbsp;&nbsp;<strong>That</strong> as per the agreed terms, a sum of <strong>INR ${amountPending}/- (Rupees ${pendingWords} Only)</strong> is legally due and payable by you, which you have wrongfully withheld.</p>

    <p><span class="para-label">4.</span>&nbsp;&nbsp;<strong>That</strong> repeated reminders, follow-ups, and opportunities were extended to you to regularize your account; however, you have chosen to ignore the same and have failed to discharge your lawful obligations.</p>

    <p><span class="para-label">5.</span>&nbsp;&nbsp;<strong>That</strong> your conduct clearly reflects malafide intent, deliberate avoidance, and wrongful retention of professional dues, thereby causing financial loss and hardship to our firm.</p>

    <p><span class="para-label">6.</span>&nbsp;&nbsp;<strong>That</strong> your actions amount to a clear breach of contract and render you liable under the provisions of the <strong>Indian Contract Act, 1872</strong>, including Sections 37, 73, and 74, making you liable to pay the outstanding amount along with interest @ 18% per annum and all incidental costs.</p>

    <p><span class="para-label">7.</span>&nbsp;&nbsp;<strong>That</strong> without prejudice to the aforesaid, your conduct further attracts serious penal consequences under the <strong>Bharatiya Nyaya Sanhita, 2023</strong>, including but not limited to provisions relating to cheating, criminal breach of trust, and dishonest misappropriation, subject to applicable facts and evidence.</p>

    <p><span class="para-label">8.</span>&nbsp;&nbsp;<strong>That</strong> it is evident that you have availed professional services with no intention of making payment, thereby exposing yourself to civil as well as criminal liability.</p>

    <p><span class="para-label">9.</span>&nbsp;&nbsp;<strong>That</strong> in view of your continued default, our firm has been left with no option but to initiate strict legal action against you.</p>

    <p><span class="para-label">10.</span>&nbsp;&nbsp;<strong>That</strong> you are hereby called upon to make <strong>immediate payment</strong> of the outstanding amount of <strong>INR ${amountPending}/- (Rupees ${pendingWords} Only)</strong> within <strong>7 (Seven) days</strong> from receipt of this notice, failing which we shall proceed without any further communication to:</p>
    <ul class="bullet-list">
      <li>Initiate civil recovery proceedings, including summary suit under Order XXXVII of the Code of Civil Procedure</li>
      <li>Claim interest, damages, and full litigation costs</li>
      <li>Initiate appropriate criminal proceedings/complaints before competent authorities</li>
      <li>Withdraw all professional services and representations with immediate effect</li>
    </ul>

    <p><span class="para-label">11.</span>&nbsp;&nbsp;<strong>That</strong> all costs, consequences, legal liabilities, and reputational implications arising therefrom shall be entirely at your sole risk, cost, and responsibility.</p>

    <p><span class="para-label">12.</span>&nbsp;&nbsp;<strong>That</strong> this is being treated as your <strong>final opportunity</strong>, and no further notice shall be issued.</p>

    <p><span class="para-label">13.</span>&nbsp;&nbsp;<strong>That</strong> this notice is issued without prejudice to all other rights and remedies available to us in law.</p>

    <p>You are hereby advised to act immediately and avoid further legal consequences.</p>

  </div>

  <!-- Signature -->
  <div class="signature-block">
    ${signatureBase64 ? `<img src="data:image/png;base64,${signatureBase64}" alt="Signature" style="height: 60px; width: auto; margin-bottom: 5px; display: block;" />` : ''}
    <p class="signature-firm">For AMA Legal Solutions<sup>®</sup></p>
    <p class="signature-sub">Through Authorized Signatory</p>
  </div>

          </div>
        </td>
      </tr>
    </tbody>
  </table>
</div>
</body>
</html>`
}
