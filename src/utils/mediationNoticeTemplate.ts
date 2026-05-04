export interface MediationNoticeData {
  clientName: string
  clientPhone: string
  clientAddress: string
  startDate: string
  amountPending: string   // outstanding e.g. "30,000"
  noticeDate: string      // e.g. "30/04/2026"
}

export function fillMediationNoticeTemplate(data: MediationNoticeData): string {
  const {
    clientName,
    clientPhone,
    clientAddress,
    startDate,
    amountPending,
    noticeDate,
  } = data

  // Convert amount to words helper
  function amountToWords(amount: string): string {
    const num = parseFloat(amount.replace(/,/g, ''))
    if (isNaN(num)) return amount
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
<title>Mediation / Conciliation Notice</title>
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
    display: flex;
    align-items: center;
    padding-bottom: 5px;
    margin-bottom: 5px;
  }
  .header-logo-img {
    width: 120px;
    height: auto;
    display: block;
    margin-right: 20px;
  }
  .header-text {
    flex: 1;
    text-align: left;
  }
  .header-name {
    font-size: 15pt;
    font-weight: bold;
    margin-bottom: 2px;
  }
  .header-date {
    font-size: 11pt;
    margin-bottom: 2px;
  }
  .header-address {
    font-size: 11pt;
    font-weight: bold;
    margin-bottom: 2px;
  }
  .header-divider {
    border-bottom: 2px solid #000;
    margin-bottom: 15px;
    width: 100%;
  }

  /* Footer Layout - Simple divider for mediation notice */
  .footer-wrapper {
    padding-top: 10px;
  }
  .footer-inner {
    border-top: 2px solid #000;
    margin-top: 10px;
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
          <div class="header-container">
            <div class="header-wrapper">
              <div class="header-text">
                <div class="header-name">Advocate Shrey Arora</div>
                <div class="header-date">Date: ${noticeDate}</div>
                <div class="header-address">
                  Block-G, Sector-57, Gurugram, Haryana India-122001
                </div>
              </div>
            </div>
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
            <div class="footer-inner"></div>
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
  <div class="notice-title">MEDIATION / CONCILIATION NOTICE</div>
  <div class="dispatch-mode" style="text-decoration: underline;">WITHOUT PREJUDICE</div>

  <!-- Addressee -->
  <div class="addressee">
    <p><span class="addressee-label">To,</span></p>
    <p>${clientName}</p>
    <p>${clientPhone}</p>
    <p>${clientAddress}</p>
  </div>

  <!-- Subject -->
  <div class="subject-line">
    <strong>Subject: Notice for Mediation/Conciliation under Section 62 of the Arbitration and Conciliation Act, 1996 for Breach of Contract, Wilful Default, and Non-Payment of Professional Fees</strong>
  </div>

  <!-- Salutation -->
  <div class="salutation">Dear Sir/Madam,</div>

  <!-- Body -->
  <div class="notice-body">

    <p>This notice is issued on behalf of <strong>Ama Legal Solutions</strong> ("Our Client"), in relation to the contractual obligations arising out of the service agreement executed between you and Our Client.</p>

    <p><strong>1. Breach of Contract</strong></p>
    <p>As per the terms of the Engagement dated <strong>${startDate}</strong>, you were obligated to pay the professional fees for the legal services rendered. However, despite repeated reminders and follow-ups, you have failed to clear the outstanding dues. As on date, a sum of <strong>INR ${amountPending}/- (Rupees ${pendingWords} Only)</strong> remains outstanding and overdue. Your actions constitute a clear breach of contractual obligations.</p>

    <p><strong>2. Wilful Default</strong></p>
    <p>Your continued failure to make payment is not attributable to any unforeseen circumstances but reflects a deliberate and wilful default. Multiple opportunities have been extended to you to regularise the payment; however, you have failed to comply with your obligations.</p>

    <p><strong>3. Malafide Intent</strong></p>
    <p>Your conduct indicates malafide intent to avail professional services without fulfilling the corresponding financial commitments, thereby causing wrongful loss to Our Client. This has also adversely impacted the professional trust between the parties.</p>

    <p><strong>4. Invocation of Mediation / Conciliation</strong></p>
    <p>Without prejudice to its rights and remedies available under law, Our Client is willing to resolve the matter amicably and hereby invites you to participate in mediation/conciliation proceedings in accordance with Section 62 of the Arbitration and Conciliation Act, 1996, similar to the process outlined in the conciliation notice format.</p>

    <p>You are hereby called upon to:</p>
    <ul class="bullet-list">
      <li>Confirm your willingness to participate in mediation within <strong>7 (seven) days</strong> from receipt of this Notice by replying to this communication.</li>
      <li>Upon receipt of your confirmation, a secure online meeting link shall be shared with you for attending the mediation session on a mutually convenient date and time.</li>
    </ul>

    <p><strong>5. Failure to Respond</strong></p>
    <p>In the event no response is received within the stipulated period, it shall be deemed that you have refused to participate in mediation, and the proceedings shall be treated as <strong>ex parte</strong>. In such circumstances, <strong>Ama Legal Solutions</strong> shall be at full liberty to initiate appropriate civil and criminal proceedings against you, under applicable laws including the <strong>Bharatiya Nyaya Sanhita, 2023</strong>, at your sole risk as to costs and consequences.</p>

    <p><strong>6. Reservation of Rights</strong></p>
    <p>Our Client expressly reserves all its rights to initiate legal proceedings for recovery of dues, damages, and any other reliefs available under law.</p>

    <p>We trust that you will treat this matter with seriousness and respond promptly to avoid further legal consequences.</p>

  </div>

  <!-- Signature -->
  <div class="signature-block">
    <p style="margin-bottom: 20px;">Yours faithfully,</p>
    <p class="signature-sub">Authorized Representative</p>
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
