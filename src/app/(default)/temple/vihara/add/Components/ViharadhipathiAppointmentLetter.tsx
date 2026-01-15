"use client";

import QRCode from "react-qr-code";

export type ViharadhipathiAppointmentLetterData = {
  reference_number?: string;
  letter_date?: string;
  appointed_monk_name?: string;
  appointed_monk_title?: string;
  viharasthana_full_name?: string;
  viharasthana_location?: string;
  viharasthana_area?: string;
  district?: string;
  divisional_secretariat?: string;
  grama_niladari?: string;
  mahanayaka_lt_no?: string;
  mahanayaka_lt_date?: string;
  secretary_name?: string;
  phone?: string;
  fax?: string;
  email?: string;
  remarks?: string;
  mahanayaka_name?: string;
  nikaya_full_name?: string;
  temple_name?: string;
  temple_location_1?: string;
  temple_location_2?: string;
  divisional_secretariat_office?: string;
};

const letterStyles = `
.letter-view {
  font-family: "Noto Sans Sinhala", "Noto Sans Tamil", Arial, sans-serif;
  line-height: 1.6;
}
.letter-controls {
  padding: 10px;
  background-color: #f0f0f0;
  border-bottom: 1px solid #ccc;
}
.letter-controls button {
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid #cbd5e1;
  background: #fff;
  font-size: 14px;
}
.letter-controls button:hover {
  background: #f8fafc;
}
.letter-view .print-area {
  padding: 20px;
  display: flex;
  justify-content: center;
}
.letter-view .two-column {
  display: flex;
  gap: 20px;
  justify-content: center;
  align-items: flex-start;
  width: 100%;
}
.letter-view .right-panel {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.letter-view .page {
  page-break-after: always;
  margin: 0 auto 20px;
  width: 8.27in;
  height: 11.69in;
  max-width: calc(100% - 30px);
  position: relative;
  background-color: white;
  box-sizing: border-box;
  padding: 0.75in 1in;
}
@media screen {
  .letter-view .page {
    box-shadow: 0 6px 20px rgba(0,0,0,0.12);
  }
}
.letter-view .letter-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 30px;
  font-size: 14px;
}
.letter-view .reference-number,
.letter-view .date {
  font-weight: 600;
}
.letter-view .recipient-address {
  margin-bottom: 30px;
  line-height: 1.8;
}
.letter-view .recipient-title {
  font-weight: 600;
  font-size: 15px;
}
.letter-view .salutation {
  margin-bottom: 20px;
  font-weight: 600;
}
.letter-view .subject {
  margin-bottom: 20px;
  font-weight: 600;
  text-decoration: underline;
}
.letter-view .letter-body {
  margin-bottom: 30px;
  text-align: justify;
  line-height: 1.8;
}
.letter-view .closing {
  margin-bottom: 40px;
}
.letter-view .signature-section {
  margin-bottom: 30px;
}
.letter-view .signature-name {
  font-weight: 600;
}
.letter-view .signature-title {
  font-weight: 500;
}
.letter-view .contact-info {
  font-size: 13px;
  line-height: 1.6;
}
.letter-view .copy-to {
  margin-top: 40px;
  font-size: 14px;
}
.letter-view .copy-to-header {
  font-weight: 600;
  margin-bottom: 10px;
}
.letter-view .copy-to-list {
  list-style-type: none;
  padding-left: 0;
  line-height: 1.8;
}
.letter-view .copy-to-list li {
  margin-bottom: 8px;
}
.letter-view .qr-container {
  position: absolute;
  right: 1in;
  bottom: 0.75in;
  width: 80px;
  height: 80px;
  text-align: center;
}
.letter-view .qr-container .caption {
  font-size: 9px;
  color: #000;
  margin-top: 4px;
  word-break: break-all;
}
.letter-view [data-field] {
  display: inline;
}
@media print {
  .letter-controls {
    display: none;
  }
  .letter-view .print-area {
    padding: 0;
  }
  .letter-view .page {
    page-break-after: always;
    margin: 0;
    width: 8.27in;
    height: 11.69in;
    max-width: 100%;
    box-shadow: none;
  }
}
`;

const valueOrBlank = (value?: string) => value ?? "";

export default function ViharadhipathiAppointmentLetter({
  data,
}: {
  data: ViharadhipathiAppointmentLetterData;
}) {
  const referenceNumber = valueOrBlank(data.reference_number) || "sample-ref";
  const qrUrl = `https://buddhistaffairs.gov.lk/letters/${encodeURIComponent(referenceNumber)}`;

  return (
    <div className="letter-view">
      <style>{letterStyles}</style>

      <div className="letter-controls">
        <button type="button" onClick={() => window.print()}>
          Print / Save as PDF
        </button>
      </div>

      <div className="print-area">
        <div className="two-column">
          <main className="right-panel">
            <section
              className="page"
              id="page-1"
              role="document"
              aria-label="Viharadhipathi Appointment Confirmation Letter"
            >
              <div className="letter-header">
                <div className="reference-number">
                  <span data-field="reference_number">
                    {valueOrBlank(data.reference_number)}
                  </span>
                </div>
                <div className="date">
                  දිනය:{" "}
                  <span data-field="letter_date">
                    {valueOrBlank(data.letter_date)}
                  </span>
                </div>
              </div>

              <div className="recipient-address">
                <div className="recipient-title">
                  විහාරාධිපති{" "}
                  <span data-field="appointed_monk_name">
                    {valueOrBlank(data.appointed_monk_name)}
                  </span>{" "}
                  ස්වාමීන් වහන්සේ,
                </div>
                <div>
                  <span data-field="viharasthana_full_name">
                    {valueOrBlank(data.viharasthana_full_name)}
                  </span>
                  ,
                </div>
                <div>
                  <span data-field="viharasthana_location">
                    {valueOrBlank(data.viharasthana_location)}
                  </span>
                  ,
                </div>
                <div>
                  <span data-field="district">{valueOrBlank(data.district)}</span>.
                </div>
              </div>

              <div className="salutation">ගෞරවනීය ස්වාමීන් වහන්සේ,</div>

              <div className="subject">
                විහාරාධිපති ධුරය පත් කීරීමෙ ලිපිය පිළිගත් බවට දැනුම්දීම.
              </div>

              <div className="letter-body">
                <span
                  data-field="district"
                  style={{ fontWeight: "bold", fontSize: "1.2em" }}
                >
                  {valueOrBlank(data.district)}
                </span>{" "}
                දිස්ත්‍රික්කයේ,{" "}
                <span
                  data-field="divisional_secretariat"
                  style={{ fontWeight: "bold", fontSize: "1.2em" }}
                >
                  {valueOrBlank(data.divisional_secretariat)}
                </span>{" "}
                ප්‍රාදේශීය ලේකම් කොට්ඨාසයේ,{" "}
                <span
                  data-field="grama_niladari"
                  style={{ fontWeight: "bold", fontSize: "1.2em" }}
                >
                  {valueOrBlank(data.grama_niladari)}
                </span>{" "}
                ග්‍රාම නිලධාරී වසමේ,{" "}
                <span
                  data-field="viharasthana_location"
                  style={{ fontWeight: "bold", fontSize: "1.2em" }}
                >
                  {valueOrBlank(data.viharasthana_location)}
                </span>
                ,{" "}
                <span
                  data-field="viharasthana_area"
                  style={{ fontWeight: "bold", fontSize: "1.2em" }}
                >
                  {valueOrBlank(data.viharasthana_area)}
                </span>{" "}
                <span
                  data-field="viharasthana_full_name"
                  style={{ fontWeight: "bold", fontSize: "1.2em" }}
                >
                  {valueOrBlank(data.viharasthana_full_name)}
                </span>{" "}
                විහාරස්ථනයේ විහාරාධිපති ධුරයට, අතිපුජ්‍ය මහ නායක හිමියන්
                විසින් යොමු කර ඇති, අංක{" "}
                <span
                  data-field="mahanayaka_lt_no"
                  style={{ fontWeight: "bold", fontSize: "1.2em" }}
                >
                  {valueOrBlank(data.mahanayaka_lt_no)}
                </span>
                ,{" "}
                <span
                  data-field="mahanayaka_lt_date"
                  style={{ fontWeight: "bold", fontSize: "1.2em" }}
                >
                  {valueOrBlank(data.mahanayaka_lt_date)}
                </span>{" "}
                දිනැති ලිපිය පිළිගෙන,{" "}
                <span
                  data-field="appointed_monk_title"
                  style={{ fontWeight: "bold", fontSize: "1.2em" }}
                >
                  {valueOrBlank(data.appointed_monk_title)}
                </span>{" "}
                <span
                  data-field="appointed_monk_name"
                  style={{ fontWeight: "bold", fontSize: "1.2em" }}
                >
                  {valueOrBlank(data.appointed_monk_name)}
                </span>{" "}
                ස්වාමීන් වහන්සේ පත් කල බව ගෞරව පූර්වකව දන්වා සිටිමි.
              </div>

              <div className="signature-section">
                මෙයට - සසුන් ලැදී,
                <br />
                <br />
                ................................. 
                <div className="signature-name">
                  <span
                    data-field="secretary_name"
                    style={{ fontWeight: "bold", fontSize: "1.2em" }}
                  >
                    {valueOrBlank(data.secretary_name)}
                  </span>
                </div>
                <div className="signature-title">
                  බෞද්ධ කටයුතු කොමසාරිස් ජනරාල්,
                </div>
                <div className="contact-info">
                  දුරකථනය <span data-field="phone">{valueOrBlank(data.phone)}</span>
                  <br />
                  ෆැක්ස් <span data-field="fax">{valueOrBlank(data.fax)}</span>
                  <br />
                  විද්‍යුත් තැපෑල{" "}
                  <span data-field="email">{valueOrBlank(data.email)}</span>
                </div>
              </div>

              <div className="signature-section">
                වීශේෂ කරුණු:{" "}
                <span
                  data-field="remarks"
                  style={{ fontWeight: "bold", fontSize: "1.2em" }}
                >
                  {valueOrBlank(data.remarks)}
                </span>
              </div>

              <div className="copy-to">
                <div className="copy-to-header">පිටපත් :</div>
                <ul className="copy-to-list">
                  <li>
                    1. අතිපූජ්‍ය{" "}
                    <span data-field="mahanayaka_name">
                      {valueOrBlank(data.mahanayaka_name)}
                    </span>{" "}
                    මහානායක ස්වාමීන් වහන්සේගේ - ගෞරවණීය දැන ගැනීම සඳහා
                    <br />
                    &nbsp;&nbsp;&nbsp;&nbsp;
                    <span data-field="nikaya_full_name">
                      {valueOrBlank(data.nikaya_full_name)}
                    </span>
                    ,
                    <br />
                    &nbsp;&nbsp;&nbsp;&nbsp;
                    <span data-field="temple_name">
                      {valueOrBlank(data.temple_name)}
                    </span>
                    ,
                    <br />
                    &nbsp;&nbsp;&nbsp;&nbsp;
                    <span data-field="temple_location_1">
                      {valueOrBlank(data.temple_location_1)}
                    </span>
                    ,
                    <br />
                    &nbsp;&nbsp;&nbsp;&nbsp;
                    <span data-field="temple_location_2">
                      {valueOrBlank(data.temple_location_2)}
                    </span>
                    ,
                    <br />
                  </li>
                  <li>
                    2. ප්‍රාදේශීය ලේකම්, - කාරුණීක දැන ගැනීමට සහ අවශ්‍ය කටයුතු සදහා
                    <br />
                    &nbsp;&nbsp;&nbsp;&nbsp;ලේකම් කාර්යාලය,{" "}
                    <span data-field="divisional_secretariat_office">
                      {valueOrBlank(data.divisional_secretariat_office)}
                    </span>
                  </li>
                </ul>
              </div>

              <div className="qr-container" id="qr-container">
                <a
                  href={qrUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Letter Verification URL"
                >
                  <QRCode value={qrUrl} size={80} className="h-20 w-20" />
                </a>
                <div className="caption">{qrUrl}</div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
