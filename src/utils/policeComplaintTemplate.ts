export interface PoliceComplaintData {
  clientName: string
  clientAddress: string
  noticeDate: string      // date of complaint e.g. "30/04/2026"
  representativeName: string
  policeStationName: string
  policeStationAddress: string
  headerLogoBase64?: string
  stampLogoBase64?: string
  signatureBase64?: string
}

export function fillPoliceComplaintTemplate(data: PoliceComplaintData): string {
  const {
    clientName,
    clientAddress,
    noticeDate,
    representativeName,
    policeStationName,
    policeStationAddress,
    headerLogoBase64,
    stampLogoBase64,
    signatureBase64,
  } = data

  // No amount conversion needed for this specific complaint text
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Police Complaint – Ama Legal Solutions</title>
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

  <!-- Complaint Title -->
  <div class="notice-title">POLICE COMPLAINT</div>

  <!-- Addressee -->
  <div class="addressee">
    <p><span class="addressee-label">To,</span></p>
    <p>${policeStationName || 'The Station House Officer (SHO)'}</p>
    <p>${policeStationAddress}</p>
  </div>

  <!-- Subject -->
  <div class="subject-line">
    <strong>Subject: Complaint on behalf of Ama Legal Solutions for Cheating, Criminal Breach of Trust, and Non-Payment of Contractual Dues</strong>
  </div>

  <!-- Salutation -->
  <div class="salutation">Respected Sir/Madam,</div>

  <!-- Body -->
  <div class="notice-body">

    <p>I, <strong>${representativeName}</strong>, duly authorized representative of <strong>Ama Legal Solutions</strong>, hereby lodge the present complaint against <strong>${clientName}</strong>, residing at <strong>${clientAddress}</strong>, within your jurisdiction, for acts constituting cheating, criminal breach of trust, and willful non-payment of lawful dues arising out of a binding service agreement.</p>

    <p>That the accused had approached <strong>Ama Legal Solutions</strong> for availing professional legal services and had executed a valid agreement agreeing to pay the prescribed professional fees, including the signup amount, within the agreed timeline. Acting upon the assurances and representations made by the accused, our firm initiated services in good faith.</p>

    <p>However, despite availing the services and repeated reminders and follow-ups, the accused has deliberately failed and neglected to make the agreed payment. The conduct of the accused reflects clear mala fide intention from the inception to obtain services without honoring the financial obligations, thereby causing wrongful loss to our firm and wrongful gain to himself/herself.</p>

    <p>The aforesaid acts of the accused amount to offences punishable under the relevant provisions of the <strong>Bharatiya Nyaya Sanhita, 2023</strong>, including provisions relating to cheating and criminal breach of trust.</p>

    <p>In view of the above, we request you to kindly:</p>
    <ul class="bullet-list">
      <li>Take cognizance of this complaint and register the same;</li>
      <li>Initiate strict legal action against the accused in accordance with law; and</li>
      <li>Assist in recovery of our legitimate dues.</li>
    </ul>

    <p>We are ready to furnish all necessary documents, including the executed agreement, communication records, and proof of default, in support of this complaint.</p>

    <p>This complaint is being filed to seek appropriate legal action and to prevent such fraudulent practices.</p>

    <p>Kindly treat this matter with urgency and take necessary action at the earliest.</p>

    <p>Yours sincerely,</p>

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
