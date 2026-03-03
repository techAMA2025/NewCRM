import {
  headerLogoBase64,
  roundLogoBase64,
} from './demandNoticeImages';
import { shreySignatureBase64 } from './signatureImages';

interface VakalatnamaData {
  arbitrator: string;
  caseNo: string;
  bankName: string;
  clientName: string;
  date: string;
}

/**
 * Generates the complete HTML for a Vakalatnama PDF based on image reference.
 */
export function fillVakalatnamaTemplate(data: VakalatnamaData): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Vakalatnama - ${data.clientName}</title>
  <style>
    @page {
      size: A4;
      margin: 20mm 20mm 20mm 20mm;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 12pt;
      line-height: 1.5;
      color: #000;
      background: #fff;
    }

    .container {
      width: 100%;
      padding: 0 10px;
    }

    .underline { text-decoration: underline; }
    .bold { font-weight: bold; }
    .center { text-align: center; }
    .uppercase { text-transform: uppercase; }

    .title {
      font-size: 14pt;
      margin-bottom: 20px;
    }

    .header-section {
      margin-bottom: 30px;
    }

    .case-info {
      margin: 20px 0;
    }

    .versus-section {
      margin: 25px 0;
    }

    .advocates-block {
        display: flex;
        justify-content: space-around;
        margin: 30px 0;
        text-align: center;
    }

    .advocate-item {
        width: 45%;
    }

    .advocate-address {
        font-size: 10pt;
        margin-top: 5px;
    }

    .body-text {
      text-align: justify;
      margin-bottom: 20px;
    }

    ol {
      margin-left: 30px;
      margin-bottom: 20px;
    }

    li {
      margin-bottom: 10px;
      text-align: justify;
    }

    .witness-section {
        margin-top: 40px;
    }

    .signature-area {
        margin-top: 60px;
        display: flex;
        justify-content: space-between;
    }

    .signature-box {
        text-align: center;
        width: 150px;
    }

    .signature-font {
        font-family: 'Brush Script MT', cursive;
        font-size: 24pt;
        margin-bottom: -10px;
    }

  </style>
</head>
<body>
  <div class="container">
    <!-- TITLE -->
    <div class="center bold title underline uppercase">VAKALATNAMA</div>

    <!-- BEFORE ARBITRATOR -->
    <div class="header-section center bold uppercase">
      BEFORE THE HON'BLE SOLE ARBITRATOR, SH. ${data.arbitrator}, ADVOCATE<br/>
      (OFFICE OF SOLE ARBITRATOR),
    </div>

    <!-- CASE NO -->
    <div class="case-info bold">
      Case No. - ${data.caseNo}
    </div>

    <!-- RE PARTIES -->
    <div class="center">
      In re: <span class="bold">${data.bankName}</span>, Claimant
    </div>

    <div class="versus-section center bold">VERSUS</div>

    <div class="center">
      <span class="bold">${data.clientName}</span> Defendant
    </div>

    <!-- KNOW ALL -->
    <div class="body-text" style="margin-top: 30px;">
      KNOW ALL to whom these present shall come that I <span class="bold">${data.clientName}</span>, the Above named accused do hereby appoint:
    </div>

    <!-- FIRM NAME -->
    <div class="center bold uppercase">(AMA LEGAL SOLUTIONS)</div>

    <!-- ADVOCATES -->
    <div class="advocates-block">
        <div class="advocate-item">
            <div class="bold uppercase">ANUJ MALIK</div>
            <div>ADVOCATE</div>
            <div>D-2651/2019</div>
        </div>
        <div class="advocate-item">
            <div class="bold uppercase">SHREY ARORA</div>
            <div>ADVOCATE</div>
            <div>D-1351/2023</div>
        </div>
    </div>
    <div class="center advocate-address">
        2493AP SECTOR-57, GURUGRAM, HARYANA-122001
    </div>

    <div class="body-text" style="margin-top: 20px;">
      (Hereinafter called the advocate/s) to be my Advocate in the above noted case authorize him: -
    </div>

    <!-- POINTS -->
    <ol>
      <li>To act, appear and plead in the above-noted case in this Court or in any other Court in which the same may be tried or heard and also in the appellate Court including High Court subject to payment of fees separately for each Court by me.</li>
      <li>To sign, file, verify and present pleadings, appeals, cross-objections or petitions for executions review revision, withdrawal, compromise or other petitions or affidavits or other documents as may be deemed necessary or proper for the prosecution of the said case in all its stages subject to payment of fees for each stage.</li>
      <li>To file and take back documents, to admit and deny the documents of the opposite party.</li>
      <li>To withdraw or compromise the said case or submit to arbitration any differences or disputes that may arise touching or in any manner relating to the said case.</li>
      <li>To take execution proceedings.</li>
      <li>To deposit, draw and receive monthly cheques, cash and grant receipts thereof and to do all other acts and things which may be necessary to be done for the progress and in the course of the prosecution of the said case.</li>
      <li>To appoint and instruct any other Legal Practitioner authorizing him to exercise the power and authority hereby conferred upon the Advocate whenever he may think fit to do so and to sign the power of attorney on our behalf.</li>
      <li>And I the undersigned do hereby agree to rectify and confirm all acts done by the Advocate or his substitute in the matter as my own acts, as if done by me to all intents and purposes.</li>
      <li>And I undertake that I or my duly authorized agent would appear in Court on all hearings and will inform the Advocate for appearance when the case is called.</li>
      <li>And I the undersigned do hereby agree not to hold the advocate or his substitute responsible for the result of the said case.</li>
      <li>The adjournment costs whenever ordered by the Court shall be of the Advocate which he shall receive and retain for himself.</li>
      <li>And I the undersigned to hereby agree that in the event of the whole or part of the fee agreed by me to be paid to the advocate remaining unpaid he shall be entitled to withdraw from the prosecution of the said case until the same is paid up. The fee settled is only for the above case and above Court. I hereby agree that once fee is paid, I will not be entitled for the refund of the same in any case whatsoever and if the case prolongs for more than 3 years the original fee shall be paid again by me.</li>
    </ol>

    <div class="witness-section">
      IN WITNESS WHEREOF I do hereunto set my hand to these presents the contents of which have been understood by me on <span class="bold">${data.date}</span><br/>
      Accepted subject to the terms of the fees.
    </div>

    <!-- SIGNATURE AREA -->
    <div class="signature-area">
        <div class="signature-box">
             <div style="height: 40px; display: flex; align-items: flex-end; justify-content: center;">
                <img src="${shreySignatureBase64}" style="max-height: 100%; max-width: 100%; object-fit: contain;" />
             </div>
             <div style="border-top: 1px solid #000; margin-top: 5px; padding-top: 2px;">Advocate</div>
        </div>
        <div class="signature-box">
             <div style="height: 40px;"></div>
             <div style="border-top: 1px solid #000; margin-top: 5px; padding-top: 2px;">Client</div>
        </div>
    </div>

  </div>
</body>
</html>`;
}
