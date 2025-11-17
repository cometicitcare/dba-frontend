// src/app/(default)/bhikkhu/manage/[id]/page.tsx
"use client";

import React, { useMemo, useRef, useState, useEffect, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import { _manageBhikku } from "@/services/bhikku";
import { FooterBar } from "@/components/FooterBar";
import { TopBar } from "@/components/TopBar";
import { Sidebar } from "@/components/Sidebar";
import selectionsData from "@/utils/selectionsData.json";

import {
  DateField,
  LocationPicker,
  BhikkhuAutocomplete,
  TempleAutocomplete,
  TempleAutocompleteAddress,
  BhikkhuCategorySelect,
  BhikkhuStatusSelect,
  bhikkhuSteps,
  bhikkhuInitialValues,
  toYYYYMMDD,
  validateField,
  Errors,
} from "@/components/Bhikku/Add";

import type { BhikkhuForm, FieldConfig, StepConfig } from "@/components/Bhikku/Add";

import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// ---------------- Certificates Preview (HTML → React) ----------------
type CertificateData = {
  certificate_no?: string;
  place_birth?: string;
  lay_name_in_full?: string;
  fathers_name?: string;
  date_of_robing?: string;
  samanera_name_page1?: string;
  robing_tutor?: string;
  robing_took_place?: string;
  temple_of_residence_after_robing?: string;
  name_of_viharadipati_of_temple_of_residence?: string;
  residence_at_time_of_declaration?: string;
  nikaya_name?: string;
  nikaya_nayaka_address?: string;
  declaration_date?: string;
  remarks?: string;
};

// Public image paths (served from /public)
const CERT_IMG = {
  blank1: "/bhikku/certificates-images/budhist-certificate---blank-1.png",
  blank2: "/bhikku/certificates-images/budhist-certificate---blank-2.png",
  dasasil1: "/bhikku/certificates-images/budhist-certificate---dasasil-meniyo-1.png",
  dasasil2: "/bhikku/certificates-images/budhist-certificate---dasasil-meniyo-2.png",
  samanera2: "/bhikku/certificates-images/budhist-certificate--samanera--blank-2.png",
} as const;

function CertificatePreview({
  data,
  page1Bg = CERT_IMG.blank1,
  page2Bg = CERT_IMG.samanera2,
}: {
  data: CertificateData;
  page1Bg?: string;
  page2Bg?: string;
}) {
  // Why: QR must point to HRMS with br_regn
  const certUrl = useMemo(() => {
    const regn = data?.certificate_no || "sample";
    return `https://hrms.dbagovlk.com/bhikkhu/certificate/${encodeURIComponent(regn)}`;
  }, [data?.certificate_no]);

  const qrSrc = useMemo(() => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=75x75&data=${encodeURIComponent(certUrl)}`;
  }, [certUrl]);

  const handlePrint = () => window.print();

  return (
    <div className="cert-root">
      <div className="controls">
        <button type="button" onClick={handlePrint}>Print / Save as PDF</button>
      </div>

      <div className="print-area" id="cert-print-area">
        <div className="two-column">
          <main className="right-panel">
            {/* Page 1 */}
            <section
              className="page page-1"
              style={{ backgroundImage: `url("${page1Bg}")` }}
              role="document"
              aria-label="Certificate page 1"
            >
              <div className="content">
                <div className="row">
                  <div className="num-col">01.</div>
                  <div className="label">
                    <span className="sinhala">සහතික අංකය</span>
                    <span className="tamil">சான்றிதழ் எண்</span>
                    <span className="eng">Certificate Number</span>
                  </div>
                  <div className="value"><span>{data?.certificate_no || ""}</span></div>
                </div>

                <div className="row">
                  <div className="num-col">02.</div>
                  <div className="label">
                    <span className="sinhala">උපන් ස්ථානය : දිසාව, පළාත, කෝරළේ, පත්තුව හෝ වෙනත් කොට්ඨාශය සහ ගම</span>
                    <span className="tamil">பிறப்பிடம் : மாவட்டம், மாநிலம், கோரளே, பட்டு அல்லது பிற பிரிவு மற்றும் கிராமம்</span>
                    <span className="eng">Place of Birth: Province, District, Korale, Pattu or other Division and Village</span>
                  </div>
                  <div className="value"><span>{data?.place_birth || ""}</span></div>
                </div>

                <div className="row">
                  <div className="num-col">03.</div>
                  <div className="label">
                    <span className="sinhala">සම්පූර්ණ ගිහි නම</span>
                    <span className="tamil">முழு வீட்டு பெயர்</span>
                    <span className="eng">Lay Name in full</span>
                  </div>
                  <div className="value"><span>{data?.lay_name_in_full || ""}</span></div>
                </div>

                <div className="row">
                  <div className="num-col">04.</div>
                  <div className="label">
                    <span className="sinhala">පියාගේ සම්පුර්ණ නම</span>
                    <span className="tamil">தந்தையின் முழு பெயர்</span>
                    <span className="eng">Name of Father in full</span>
                  </div>
                  <div className="value"><span>{data?.fathers_name || ""}</span></div>
                </div>

                <div className="row">
                  <div className="num-col">05.</div>
                  <div className="label">
                    <span className="sinhala">මහණ කළ දිනය</span>
                    <span className="tamil">கொடுக்கப்பட்ட தேதி</span>
                    <span className="eng">Date of Robing</span>
                  </div>
                  <div className="value"><span>{data?.date_of_robing || ""}</span></div>
                </div>

                <div className="row">
                  <div className="num-col">06.</div>
                  <div className="label">
                    <span className="sinhala">මහණ කිරීමේදී ගත් නම</span>
                    <span className="tamil">சாமணேர பெயர்</span>
                    <span className="eng">Samanera Name / Name assumed at Robing</span>
                  </div>
                  <div className="value"><span>{data?.samanera_name_page1 || ""}</span></div>
                </div>

                <div className="row">
                  <div className="num-col">07.</div>
                  <div className="label">
                    <span className="sinhala">මහණකළ ආචාර්‍ය්‍ය භික්ෂුවගේ නම හෝ භික්ෂූන්ගේ නම් සහ වාසස්ථාන</span>
                    <span className="tamil">பிக்ஷுக் குரு 或 பிக்ஷுக் குருமார்களின் பெயர் மற்றும் குடியிருப்பு</span>
                    <span className="eng">Name of Robing Tutor or Names of Robing Tutors and Residence</span>
                  </div>
                  <div className="value"><span>{data?.robing_tutor || ""}</span></div>
                </div>

                <div className="row">
                  <div className="num-col">08.</div>
                  <div className="label">
                    <span className="sinhala">මහණකළ විහාරයේ නම</span>
                    <span className="tamil">உடையணிந்த கோயிலின் பெயர்</span>
                    <span className="eng">Temple where Robing took place</span>
                  </div>
                  <div className="value"><span>{data?.robing_took_place || ""}</span></div>
                </div>

                <div className="row">
                  <div className="num-col">09.</div>
                  <div className="label">
                    <span className="sinhala">මහණ වූ පසු වාසය කරන විහාරය</span>
                    <span className="tamil">சன்னியாசத்தின் பின் வசிக்கும் கோயில்</span>
                    <span className="eng">Temple of Residence after Robing</span>
                  </div>
                  <div className="value"><span>{data?.temple_of_residence_after_robing || ""}</span></div>
                </div>

                <div className="row">
                  <div className="num-col">10.</div>
                  <div className="label">
                    <span className="sinhala">වාසය කරන විහාරයේ විහාරාධිපති ස්වාමීන්ගේ නම</span>
                    <span className="tamil">உயர் ஆணைய நாள்</span>
                    <span className="eng">Name of Viharadipati of Temple of Residence</span>
                  </div>
                  <div className="value"><span>{data?.name_of_viharadipati_of_temple_of_residence || ""}</span></div>
                </div>
              </div>
            </section>

            {/* Page 2 */}
            <section
              className="page page-2"
              style={{ backgroundImage: `url("${page2Bg}")` }}
              role="document"
              aria-label="Certificate page 2"
            >
              <div className="content">
                <div className="row">
                  <div className="num-col">11.</div>
                  <div className="label">
                    <span className="sinhala">මේ ප්‍රකාශ පත්‍රය ලියන කාලයේ වාසස්ථානය සහ තැපෑලෙන් ලියුම් ලැඛෙන පිළිවෙල</span>
                    <span className="tamil">தெரிவிப்பு எழுதும் நேரத்தில் குடியிருப்பு மற்றும் முழு அஞ்சல் முகவரி</span>
                    <span className="eng">Residence at time of declaration, and full Postal Address</span>
                  </div>
                  <div className="value"><span>{data?.residence_at_time_of_declaration || ""}</span></div>
                </div>

                <div className="row">
                  <div className="num-col">12.</div>
                  <div className="label">
                    <span className="sinhala">නිකාය හා පාර්ශවයේ නම</span>
                    <span className="tamil">நிகாயா பெயர்</span>
                    <span className="eng">Name of Nikaya</span>
                  </div>
                  <div className="value"><span>{data?.nikaya_name || ""}</span></div>
                </div>

                <div className="row">
                  <div className="num-col">13.</div>
                  <div className="label">
                    <span className="sinhala">නිකායේ මහානායක හෝ නායක තෙරුන්නාන්සේගේ නම සහ තැපෑලෙන් ලියුම් ලැඛෙන පිළිවෙල</span>
                    <span className="tamil">நிகாயா மஹா நாயக தேரர் அல்லது நாயக தேரரின் பெயர் மற்றும் முழு அஞ்சல் முகவரி</span>
                    <span className="eng">Name of Maha Nayaka Thera or Nayaka Thera of the Nikaya and his full Postal Address</span>
                  </div>
                  <div className="value"><span>{data?.nikaya_nayaka_address || ""}</span></div>
                </div>

                <div className="row">
                  <div className="num-col">14.</div>
                  <div className="label">
                    <span className="sinhala">මේ ප්‍රකාශය කරන දින</span>
                    <span className="tamil">தெரிவிப்பு செய்யப்பட்ட நாள்</span>
                    <span className="eng">Date of making the declaration</span>
                  </div>
                  <div className="value"><span>{data?.declaration_date || ""}</span></div>
                </div>

                <div className="row">
                  <div className="num-col">15.</div>
                  <div className="label">
                    <span className="sinhala">වෙනත් කිවයුතු කරුණු</span>
                    <span className="tamil">கூறப்பட வேண்டிய பிற விஷயங்கள்</span>
                    <span className="eng">Remarks</span>
                  </div>
                  <div className="value"><span>{data?.remarks || ""}</span></div>
                </div>
              </div>

              {/* QR */}
              <div className="qr-container" id="qr-container">
                <a id="certLink" href={certUrl} target="_blank" rel="noreferrer" aria-label="Certificate URL">
                  <img id="qrCode" src={qrSrc} alt="QR code" />
                </a>
                <div className="caption" id="qrLabel" aria-hidden="true">
                  {certUrl}
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>

      <style>{`
        .cert-root .controls { padding:10px; background:#f0f0f0; border-bottom:1px solid #ccc; }
        .cert-root .print-area { padding:20px; display:flex; justify-content:center; }
        .cert-root .two-column { display:flex; gap:20px; justify-content:center; align-items:flex-start; width:100%; }
        .cert-root .right-panel { flex:0 0 auto; display:flex; flex-direction:column; align-items:center; }

        .cert-root .page { page-break-after: always; margin:0 auto 20px; width:8.5in; height:14in; max-width:calc(100% - 30px);
          position:relative; background-repeat:no-repeat; background-position:center top; background-size:contain;
          -webkit-print-color-adjust:exact; print-color-adjust:exact; box-sizing:border-box; overflow:visible;
        }
        @media screen { .cert-root .page { box-shadow:0 6px 20px rgba(0,0,0,0.12); background-size:100% 100%; } }

        .cert-root .page .content { position:absolute; left:10%; right:10%; top:0; bottom:0; display:flex; flex-direction:column;
          box-sizing:border-box; align-items:flex-start; pointer-events:none; padding:0.5rem 0; gap:0.25rem; }
        .cert-root .page.page-1 .content { top:20%; bottom:20%; gap:20px; }
        .cert-root .page.page-2 .content { top:5%; bottom:30%; gap:25px; }

        .cert-root .page.page-2 .qr-container { position:absolute; right:20%; bottom:5%; width:75px; height:75px; box-sizing:border-box;
          z-index:10; text-align:center; pointer-events:auto; }
        .cert-root .page.page-2 .qr-container img { width:100%; height:100%; display:block; }
        .cert-root .page.page-2 .qr-container .caption { position:absolute; top:100%; left:50%; transform:translateX(-50%);
          font-size:10px; color:#000; white-space:nowrap; margin-top:4px; }

        .cert-root .page .row { display:grid; grid-template-columns:6% 34% 1fr; align-items:center; column-gap:8px; row-gap:4px; margin:4px 0; width:100%; box-sizing:border-box; }
        .cert-root .page .row .num-col { font-size:11px; font-weight:700; color:#000; text-align:right; padding-right:2px; }
        .cert-root .page .label { font-size:14px; color:#000; }
        .cert-root .page .value { font-size:17px; color:#000; font-weight:500; }
        .cert-root .row .value span { display:block; }
        .cert-root .page .label, .cert-root .page .value { word-wrap:break-word; overflow-wrap:anywhere; }

        .cert-root .label .sinhala{ display:block; font-size:14px; font-weight:600; line-height:1.2; }
        .cert-root .label .tamil{ display:block; font-size:13px; font-weight:500; line-height:1.2; color:#333; margin-top:2px; }
        .cert-root .label .eng{ display:block; font-size:12px; color:#222; opacity:0.90; line-height:1.2; }

        @media print {
          body * { visibility: hidden !important; }
          #cert-print-area, #cert-print-area * { visibility: visible !important; }
          #cert-print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 0 !important; }
          .cert-root .controls { display: none !important; }
          .cert-root .page { page-break-after: always; margin: 0 !important; background-color: white; width: 8.5in; max-width: 100%; box-shadow: none; }
        }
      `}</style>
    </div>
  );
}

// ---------------- Page code ----------------

type NikayaAPIItem = {
  nikaya: { code: string; name: string };
  main_bhikku: {
    regn: string; gihiname: string; mahananame: string; current_status: string;
    parshawaya: string; livtemple: string; mahanatemple: string; address: string;
  } | null;
  parshawayas: Array<{ code: string; name: string; remarks?: string; start_date?: string; nayaka_regn?: string; nayaka?: any }>;
};

const STATIC_NIKAYA_DATA: NikayaAPIItem[] = Array.isArray((selectionsData as any)?.nikayas)
  ? ((selectionsData as any).nikayas as NikayaAPIItem[])
  : [];

const NOVICE_CATEGORY_CODE = "CAT03";
export const dynamic = "force-dynamic";

type PageProps = { params: { id: string } };

type CertificateItem = {
  id: string;
  type: string;
  language: string;
  issued_at: string;
  file_url?: string;
};

// Raw API → CertificateData per your map
function mapApiToCertificateData(api: any): CertificateData {
  const s = (v: unknown) => (v == null ? "" : String(v));
  return {
    certificate_no: s(api?.br_regn),
    place_birth: s(api?.br_birthpls),
    lay_name_in_full: s(api?.br_gihiname),
    fathers_name: s(api?.br_fathrname),
    date_of_robing: toYYYYMMDD(s(api?.br_mahanadate)),
    samanera_name_page1: s(api?.br_mahananame),
    robing_tutor: s(api?.br_mahananame), // as requested
    robing_took_place: s(api?.br_mahanatemple?.vh_vname ?? api?.br_robing_tutor_residence?.vh_vname),
    temple_of_residence_after_robing: s(api?.br_robing_after_residence_temple?.vh_vname),
    name_of_viharadipati_of_temple_of_residence: s(api?.br_mahanayaka_name),
    residence_at_time_of_declaration: s(api?.br_residence_at_declaration),
    nikaya_name: s(api?.br_nikaya?.name),
    nikaya_nayaka_address: "",
    declaration_date: toYYYYMMDD(s(api?.br_declaration_date)),
    remarks: "",
  };
}

// Existing helper (kept) - from form/display → certificate (optional use)
function mapBhikkhuToCertificateData(
  values: Partial<BhikkhuForm>,
  display: Record<string, string | undefined>
): CertificateData {
  const placeBirthParts = [
    values.br_birthpls,
    values.br_province,
    values.br_district,
    values.br_korale,
    values.br_pattu,
    values.br_division,
    values.br_vilage,
  ].filter(Boolean);

  const nikayaNayaka = [display.br_mahanayaka_name, display.br_mahanayaka_address].filter(Boolean).join(", ");
  const robingTutor = [display.br_mahanaacharyacd, display.br_robing_tutor_residence].filter(Boolean).join(" | ");

  return {
    certificate_no: String((values as any).certificate_no || ""),
    place_birth: placeBirthParts.join(", "),
    lay_name_in_full: values.br_gihiname || "",
    fathers_name: values.br_fathrname || "",
    date_of_robing: toYYYYMMDD(values.br_mahanadate || ""),
    samanera_name_page1: values.br_mahananame || "",
    robing_tutor: robingTutor,
    robing_took_place: display.br_mahanatemple || "",
    temple_of_residence_after_robing: display.br_robing_after_residence_temple || "",
    name_of_viharadipati_of_temple_of_residence: display.br_viharadhipathi || "",
    residence_at_time_of_declaration: display.br_residence_at_declaration || "",
    nikaya_name: display.br_nikaya || "",
    nikaya_nayaka_address: nikayaNayaka,
    declaration_date: toYYYYMMDD(values.br_declaration_date || ""),
    remarks: values.br_remarks || "",
  };
}

function ManageBhikkhuInner({ params }: PageProps) {
  const editId = params.id;
  const router = useRouter();

  const baseSteps = useMemo(() => bhikkhuSteps(), []);
  const certTab: StepConfig<BhikkhuForm> = useMemo(
    () => ({ id: baseSteps.length + 1, title: "Certificates", fields: [] }),
    [baseSteps.length]
  );
  const steps = useMemo(() => [...baseSteps, certTab], [baseSteps, certTab]);

  const [activeTab, setActiveTab] = useState<number>(1);
  const [values, setValues] = useState<Partial<BhikkhuForm>>({
    ...bhikkhuInitialValues,
    br_cat: NOVICE_CATEGORY_CODE,
  });
  const [errors, setErrors] = useState<Errors<BhikkhuForm>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const current = steps[activeTab - 1];
  const stepTitle = current?.title ?? "";

  const fieldLabels: Record<string, string> = useMemo(() => {
    const map: Record<string, string> = {};
    baseSteps.forEach((s) => s.fields.forEach((f) => (map[String(f.name)] = f.label)));
    return map;
  }, [baseSteps]);

  const fieldByName: Map<string, FieldConfig<BhikkhuForm>> = useMemo(() => {
    const m = new Map<string, FieldConfig<BhikkhuForm>>();
    baseSteps.forEach((s) => s.fields.forEach((f) => m.set(String(f.name), f)));
    return m;
  }, [baseSteps]);

  const scrollTop = () => sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const handleInputChange = (name: keyof BhikkhuForm, value: string) => {
    setValues((prev) => {
      const next = { ...prev, [name]: value };
      const cfg = fieldByName.get(String(name));
      if (cfg) {
        const msg = validateField(cfg, value, next, today);
        setErrors((e) => ({ ...e, [name]: msg }));
      }
      return next;
    });
  };

  const handleSetMany = (patch: Partial<BhikkhuForm>) => {
    setValues((prev) => {
      const next: Partial<BhikkhuForm> = { ...prev, ...patch };
      const nextErrors: Errors<BhikkhuForm> = { ...errors };
      Object.keys(patch).forEach((k) => {
        const cfg = fieldByName.get(k);
        if (cfg) {
          const raw = String((next as any)[k] ?? "");
          nextErrors[cfg.name as keyof BhikkhuForm] = validateField(cfg, raw, next, today);
        }
      });
      setErrors(nextErrors);
      return next;
    });
  };

  const validateTab = (tabIndex: number): boolean => {
    const step = steps[tabIndex - 1];
    if (!step) return true;
    if (step.title === "Certificates") return true;
    const nextErrors: Errors<BhikkhuForm> = { ...errors };
    let valid = true;
    for (const f of step.fields) {
      const raw = values[f.name] as unknown as string | undefined;
      const msg = validateField(f, raw, values, today);
      nextErrors[f.name] = msg;
      if (msg) valid = false;
    }
    setErrors(nextErrors);
    if (!valid) scrollTop();
    return valid;
  };

  const buildPartialPayloadForTab = (tabIndex: number): Partial<BhikkhuForm> => {
    const s = steps[tabIndex - 1];
    const payload: Partial<BhikkhuForm> = {};
    s.fields.forEach((f) => {
      const v = values[f.name] as unknown as string | undefined;
      if (v == null) return;
      (payload as any)[f.name] = f.type === "date" ? toYYYYMMDD(v) : v;
    });
    ["br_reqstdate", "br_dofb", "br_mahanadate", "br_declaration_date"].forEach((k) => {
      if ((payload as any)[k] != null) (payload as any)[k] = toYYYYMMDD((payload as any)[k]);
    });
    return payload;
  };

  const handleSaveTab = async () => {
    if (!validateTab(activeTab)) return;
    if (current.title === "Certificates") return;
    try {
      setSaving(true);
      const partial = buildPartialPayloadForTab(activeTab);
      await _manageBhikku({ action: "UPDATE", payload: { br_regn: editId, data: partial } } as any);
      toast.success(`Saved "${stepTitle}"`, { autoClose: 1200 });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to save. Please try again.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!window.confirm("Approve this registration? This action may be irreversible.")) return;
    try {
      setApproving(true);
      await _manageBhikku({ action: "APPROVE", payload: { br_regn: editId } } as any);
      toast.success("Approved successfully.", { autoClose: 1200 });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to approve. Please try again.";
      toast.error(msg);
    } finally {
      setApproving(false);
    }
  };

  const [display, setDisplay] = useState<{
    br_viharadhipathi?: string;
    br_mahanayaka_name?: string;
    br_mahanayaka_address?: string;
    br_mahanaacharyacd?: string;
    br_mahanatemple?: string;
    br_robing_after_residence_temple?: string;
    br_robing_tutor_residence?: string;
    br_residence_at_declaration?: string;
    br_cat?: string;
    br_currstat?: string;
    br_nikaya?: string;
    br_parshawaya?: string;
  }>({});

  const [certsLoading, setCertsLoading] = useState(false);
  const [certs, setCerts] = useState<CertificateItem[]>([]);
  const [certType, setCertType] = useState("ORDINATION");
  const [certLang, setCertLang] = useState("EN");
  const [certDate, setCertDate] = useState<string>(today);
  const [generating, setGenerating] = useState(false);

  const nikayaData = STATIC_NIKAYA_DATA;
  const findNikayaByCode = useCallback(
    (code?: string | null) => nikayaData.find((n) => n.nikaya.code === (code ?? "")),
    [nikayaData]
  );
  const parshawaOptions = useCallback(
    (nikayaCode?: string | null) => findNikayaByCode(nikayaCode)?.parshawayas ?? [],
    [findNikayaByCode]
  );

  const onPickNikaya = (code: string) => {
    const item = findNikayaByCode(code);
    handleInputChange("br_nikaya", code);
    setDisplay((d) => ({ ...d, br_nikaya: item ? `${item.nikaya.name} — ${item.nikaya.code}` : code }));

    const autoName = item?.main_bhikku?.mahananame ?? "";
    const autoAddr = item?.main_bhikku?.address ?? "";
    const autoParshaFromMain = item?.main_bhikku?.parshawaya ?? "";

    handleSetMany({
      br_mahanayaka_name: autoName,
      br_mahanayaka_address: autoAddr,
      br_parshawaya: parshawaOptions(code).some((p) => p.code === autoParshaFromMain) ? autoParshaFromMain : "",
    });

    if (autoParshaFromMain) {
      const p = parshawaOptions(code).find((x) => x.code === autoParshaFromMain);
      setDisplay((d) => ({ ...d, br_parshawaya: p ? `${p.name} — ${p.code}` : "" }));
    } else {
      setDisplay((d) => ({ ...d, br_parshawaya: "" }));
    }
  };

  const onPickParshawa = (code: string) => {
    handleInputChange("br_parshawaya", code);
    const nikaya = findNikayaByCode(values.br_nikaya);
    const p = nikaya?.parshawayas.find((x) => x.code === code);
    setDisplay((d) => ({ ...d, br_parshawaya: p ? `${p.name} - ${p.code}` : code }));
  };

  // Normalize API -> form/display (existing)
  const normalizeApi = useCallback((api: any) => {
    const s = (v: unknown) => (v == null ? "" : String(v));

    const br_currstat_code = s(api?.br_currstat?.st_statcd);
    const br_currstat_disp = br_currstat_code ? `${s(api?.br_currstat?.st_descr)} - ${br_currstat_code}` : "";

    const br_cat_code = s(api?.br_cat?.cc_code || api?.br_cat);
    const br_cat_disp = br_cat_code ? `${s(api?.br_cat?.cc_catogry || "")} - ${br_cat_code}` : "";

    const nik_code = s(api?.br_nikaya?.code || api?.br_nikaya);
    const nik_disp = api?.br_nikaya?.name ? `${s(api?.br_nikaya?.name)} — ${nik_code}` : nik_code;

    const parsha_code = s(api?.br_parshawaya?.code || api?.br_parshawaya);
    const parsha_disp = api?.br_parshawaya?.name ? `${s(api?.br_parshawaya?.name)} — ${parsha_code}` : parsha_code;

    const liv_trn = s(api?.br_livtemple?.vh_trn || api?.br_livtemple);
    const liv_disp = api?.br_livtemple?.vh_vname ? `${s(api?.br_livtemple?.vh_vname)} — ${liv_trn}` : liv_trn;

    const maha_trn = s(api?.br_mahanatemple?.vh_trn || api?.br_mahanatemple);
    const maha_disp = api?.br_mahanatemple?.vh_vname ? `${s(api?.br_mahanatemple?.vh_vname)} — ${maha_trn}` : maha_trn;

    const rob_after_trn = s(api?.br_robing_after_residence_temple?.vh_trn || api?.br_robing_after_residence_temple);
    const rob_after_disp = api?.br_robing_after_residence_temple?.vh_vname
      ? `${s(api?.br_robing_after_residence_temple?.vh_vname)} — ${rob_after_trn}`
      : rob_after_trn;

    const tutor_regn = s(api?.br_mahanaacharyacd?.br_regn || api?.br_mahanaacharyacd);
    const tutor_disp = api?.br_mahanaacharyacd?.br_mahananame
      ? `${s(api?.br_mahanaacharyacd?.br_mahananame)} — ${tutor_regn}`
      : tutor_regn;

    const gn_code = s(api?.br_gndiv?.gn_gnc || api?.br_gndiv?.gn_code || api?.br_gndiv);

    const formPatch: Partial<BhikkhuForm> = {
      br_cat: (br_cat_code as any) || NOVICE_CATEGORY_CODE,
      br_reqstdate: toYYYYMMDD(s(api?.br_reqstdate)),
      br_dofb: toYYYYMMDD(s(api?.br_dofb)),
      br_gihiname: s(api?.br_gihiname),
      br_fathrname: s(api?.br_fathrname),
      br_email: s(api?.br_email),
      br_mobile: s(api?.br_mobile),
      br_fathrsaddrs: s(api?.br_fathrsaddrs),
      br_fathrsmobile: s(api?.br_fathrsmobile),

      br_birthpls: s(api?.br_birthpls),
      br_province: s(api?.br_province),
      br_district: s(api?.br_district),
      br_korale: s(api?.br_korale),
      br_pattu: s(api?.br_pattu),
      br_division: s(api?.br_division),
      br_vilage: s(api?.br_vilage),
      br_gndiv: gn_code,

      br_viharadhipathi: s(api?.br_viharadhipathi),
      br_nikaya: nik_code,
      br_parshawaya: parsha_code,
      br_mahanayaka_name: s(api?.br_mahanayaka_name || ""),
      br_mahanayaka_address: s(api?.br_mahanayaka_address || ""),

      br_currstat: br_currstat_code,
      br_residence_at_declaration: s(api?.br_residence_at_declaration || ""),
      br_declaration_date: toYYYYMMDD(s(api?.br_declaration_date)),
      br_remarks: s(api?.br_remarks),

      br_mahanadate: toYYYYMMDD(s(api?.br_mahanadate)),
      br_mahananame: s(api?.br_mahananame),
      br_mahanaacharyacd: tutor_regn,
      br_robing_tutor_residence: s(api?.br_robing_tutor_residence),

      br_mahanatemple: maha_trn,
      br_robing_after_residence_temple: rob_after_trn,
    };

    const displayPatch = {
      br_currstat: br_currstat_disp,
      br_cat: br_cat_disp,
      br_nikaya: nik_disp,
      br_parshawaya: parsha_disp,
      br_mahanatemple: maha_disp,
      br_robing_after_residence_temple: rob_after_disp,
      br_robing_tutor_residence: liv_disp,
      br_mahanaacharyacd: tutor_disp,
      br_residence_at_declaration: s(api?.br_residence_at_declaration || ""),
      br_mahanayaka_name: s(api?.br_mahanayaka_name || ""),
      br_mahanayaka_address: s(api?.br_mahanayaka_address || ""),
      br_viharadhipathi: s(api?.br_viharadhipathi) ? `${s(api?.br_viharadhipathi)} — ${s(api?.br_viharadhipathi)}` : "",
    };

    return { formPatch, displayPatch };
  }, []);

  // Certificate preview data
  const [certPreviewData, setCertPreviewData] = useState<CertificateData>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await _manageBhikku({ action: "READ_ONE", payload: { br_regn: editId } } as any);
        const api = (res as any)?.data?.data ?? {};
        const { formPatch, displayPatch } = normalizeApi(api);
        if (cancelled) return;

        // fill form/display (existing behavior)
        handleSetMany(formPatch);
        setDisplay((d) => ({ ...d, ...displayPatch }));

        // fill certificate from raw API (per your mapping)
        setCertPreviewData(mapApiToCertificateData(api));

        // optional: fix parshawa label
        if (formPatch.br_nikaya && formPatch.br_parshawaya) {
          const p = parshawaOptions(formPatch.br_nikaya).find((x) => x.code === formPatch.br_parshawaya);
          if (p) setDisplay((dd) => ({ ...dd, br_parshawaya: `${p.name} — ${p.code}` }));
        }
      } catch (e: any) {
        toast.error(e?.message || "Failed to load record.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [editId, normalizeApi, parshawaOptions]);

  const isCertificatesTab = stepTitle === "Certificates";
  useEffect(() => {
    let cancelled = false;
    const fetchCerts = async () => {
      if (!isCertificatesTab) return;
      try {
        setCertsLoading(true);
        const res = await _manageBhikku({ action: "CERTIFICATES_LIST", payload: { br_regn: editId } } as any);
        if (cancelled) return;
        const items: CertificateItem[] = (res as any)?.data?.data ?? [];
        setCerts(items);
      } catch (e: any) {
        toast.error(e?.message || "Failed to load certificates.");
      } finally {
        if (!cancelled) setCertsLoading(false);
      }
    };
    fetchCerts();
    return () => { cancelled = true; };
  }, [isCertificatesTab, editId]);

  const handleGenerateCert = async () => {
    try {
      setGenerating(true);
      await _manageBhikku({
        action: "CERTIFICATES_GENERATE",
        payload: { br_regn: editId, type: certType, language: certLang, issued_at: toYYYYMMDD(certDate) },
      } as any);
      toast.success("Certificate generated.");
      const list = await _manageBhikku({ action: "CERTIFICATES_LIST", payload: { br_regn: editId } } as any);
      setCerts((list as any)?.data?.data ?? []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to generate certificate.");
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadCert = async (cert: CertificateItem) => {
    try {
      if (cert.file_url) {
        window.open(cert.file_url, "_blank");
        return;
      }
      const res = await _manageBhikku({
        action: "CERTIFICATES_DOWNLOAD",
        payload: { br_regn: editId, certificate_id: cert.id },
      } as any);
      const url: string | undefined = (res as any)?.data?.url;
      if (url) window.open(url, "_blank");
      else toast.error("No file URL returned.");
    } catch (e: any) {
      toast.error(e?.message || "Failed to download certificate.");
    }
  };

  const gridCols = stepTitle === "Birth Location" ? "md:grid-cols-3" : "md:grid-cols-2";

  // (Optional helpers preserved)
  const loadPreviewFromForm = () => setCertPreviewData(mapBhikkhuToCertificateData(values, display as any));
  const loadPreviewSample = () =>
    setCertPreviewData({
      certificate_no: "CERT-0001",
      place_birth: "Kandy, Central Province, Udunuwara, Harispattuwa, Example Village",
      lay_name_in_full: "John Alexander Smith",
      fathers_name: "Joseph Smith",
      date_of_robing: "2020-05-15",
      samanera_name_page1: "Venerable Sumanarathana",
      robing_tutor: "Venerable Sobhitha Thera, Res: Siri Saman Thilaka Viharaya",
      robing_took_place: "Mahavihara Temple",
      temple_of_residence_after_robing: "Siri Saman Thilaka Viharaya",
      name_of_viharadipati_of_temple_of_residence: "Venerable Piyadassi Maha Thera",
      residence_at_time_of_declaration: "Siri Saman Thilaka Viharaya, 123 Temple Rd, Kandy, Sri Lanka",
      nikaya_name: "Siyam Nikaya",
      nikaya_nayaka_address: "Maha Nayaka Example, Full Postal Address",
      declaration_date: "2024-06-01",
      remarks: "No additional remarks.",
    });

  return (
    <div className="w-full min-h-screen bg-gray-50">
      <TopBar onMenuClick={() => setSidebarOpen((v) => !v)} />
      <Sidebar isOpen={sidebarOpen} />
      <div className={`transition-all duration-300 pt-16 ${sidebarOpen ? "ml-64" : "ml-0"}`}>
        <main className="p-2 mb-20">
          <div className="w-full">
            <div className="bg-white shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-6 md:px-10 py-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-white mb-1">Update Registration</h1>
                    <p className="text-slate-300 text-sm">Editing: {editId}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleApprove}
                      disabled={loading || saving || approving}
                      className={`px-4 py-2 rounded-lg font-medium transition-all
                        ${loading || saving || approving ? "bg-green-700/60 text-white cursor-not-allowed" : "bg-green-600 text-white hover:bg-green-700"}`}
                      aria-label="Approve registration"
                      title="Approve registration"
                    >
                      {approving ? "Approving…" : "Approve"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="px-4 md:px-10 py-6" ref={sectionRef}>
                {/* Tabs Header */}
                <div className="w-full overflow-x-auto no-scrollbar">
                  <div className="flex gap-2 md:gap-3 border-b border-slate-200 pb-2">
                    {steps.map((s) => {
                      const isActive = activeTab === s.id;
                      return (
                        <button
                          key={s.id}
                          onClick={() => { setActiveTab(s.id); scrollTop(); }}
                          className={`whitespace-nowrap px-3.5 py-2 rounded-lg text-sm font-medium transition-all
                            ${isActive ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
                          aria-current={isActive ? "page" : undefined}
                        >
                          {s.title}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {loading ? (
                  <div className="p-6 text-slate-600">Loading record…</div>
                ) : (
                  <div className="min-h-[360px]">
                    <h2 className="text-xl font-bold text-slate-800 mb-5">{stepTitle}</h2>

                    {isCertificatesTab ? (
                      <div className="space-y-6">
                        <CertificatePreview data={certPreviewData} />
                        {/* Optional debug controls:
                        <div className="flex gap-2">
                          <button className="px-3 py-1 bg-slate-100 rounded" onClick={loadPreviewFromForm}>Reload from Form</button>
                          <button className="px-3 py-1 bg-slate-100 rounded" onClick={loadPreviewSample}>Load Sample</button>
                        </div> */}
                      </div>
                    ) : (
                      <>
                        <div className={`grid grid-cols-1 ${gridCols} gap-5`}>
                          {current.fields.map((f) => {
                            const id = String(f.name);
                            const val = (values[f.name] as unknown as string) ?? "";
                            const err = errors[f.name];

                            if (id === "br_province") {
                              const selection = {
                                provinceCode: (values.br_province as string) || undefined,
                                districtCode: (values.br_district as string) || undefined,
                                divisionCode: (values.br_division as string) || undefined,
                                gnCode: (values.br_gndiv as string) || undefined,
                              };
                              return (
                                <div key={id} className={stepTitle === "Birth Location" ? "md:col-span-3" : "md:col-span-2"}>
                                  <LocationPicker
                                    value={selection}
                                    onChange={(sel) => {
                                      handleSetMany({
                                        br_province: sel.provinceCode ?? "",
                                        br_district: sel.districtCode ?? "",
                                        br_division: sel.divisionCode ?? "",
                                        br_gndiv: sel.gnCode ?? "",
                                      });
                                    }}
                                    required
                                  />
                                  {err ? <p className="mt-1 text-sm text-red-600">{err}</p> : null}
                                </div>
                              );
                            }

                            if (id === "br_birthpls") {
                              return (
                                <div key={id} className={stepTitle === "Birth Location" ? "md:col-span-3" : ""}>
                                  <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-2">{f.label}</label>
                                  <input
                                    id={id}
                                    type="text"
                                    value={val}
                                    onChange={(e) => handleInputChange(f.name, e.target.value)}
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                                  />
                                  {err ? <p className="mt-1 text-sm text-red-600">{err}</p> : null}
                                </div>
                              );
                            }

                            if (id === "br_viharadhipathi") {
                              return (
                                <div key={id}>
                                  <BhikkhuAutocomplete
                                    id={id}
                                    label={f.label}
                                    required={!!f.rules?.required}
                                    placeholder="Search and pick — saves REGN"
                                    storeRegn
                                    initialDisplay={display.br_viharadhipathi ?? ""}
                                    onPick={({ regn, display: disp }) => {
                                      handleInputChange("br_viharadhipathi", regn ?? "");
                                      setDisplay((d) => ({ ...d, br_viharadhipathi: disp }));
                                    }}
                                  />
                                  {err ? <p className="mt-1 text-sm text-red-600">{err}</p> : null}
                                </div>
                              );
                            }

                            if (id === "br_nikaya") {
                              return (
                                <div key={id}>
                                  <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-2">{f.label}</label>
                                  <select
                                    id={id}
                                    value={values.br_nikaya ?? ""}
                                    onChange={(e) => onPickNikaya(e.target.value)}
                                    required={!!f.rules?.required}
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                                  >
                                    <option value="">Select Nikaya</option>
                                    {STATIC_NIKAYA_DATA.map((n) => (
                                      <option key={n.nikaya.code} value={n.nikaya.code}>
                                        {n.nikaya.name} — {n.nikaya.code}
                                      </option>
                                    ))}
                                  </select>
                                  {err ? <p className="mt-1 text-sm text-red-600">{err}</p> : null}
                                </div>
                              );
                            }

                            if (id === "br_parshawaya") {
                              const options = parshawaOptions(values.br_nikaya);
                              return (
                                <div key={id}>
                                  <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-2">{f.label}</label>
                                  <select
                                    id={id}
                                    value={values.br_parshawaya ?? ""}
                                    onChange={(e) => onPickParshawa(e.target.value)}
                                    required={!!f.rules?.required}
                                    disabled={!values.br_nikaya || options.length === 0}
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all disabled:bg-slate-100"
                                  >
                                    <option value="">{values.br_nikaya ? "Select Chapter" : "Select Nikaya first"}</option>
                                    {options.map((p) => (
                                      <option key={p.code} value={p.code}>
                                        {p.name} — {p.code}
                                      </option>
                                    ))}
                                  </select>
                                  {err ? <p className="mt-1 text-sm text-red-600">{err}</p> : null}
                                </div>
                              );
                            }

                            if (id === "br_mahanayaka_name") {
                              return (
                                <div key={id} className="grid grid-cols-1">
                                  <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-2">{f.label}</label>
                                  <input
                                    id={id}
                                    type="text"
                                    value={val}
                                    onChange={(e) => handleInputChange(f.name, e.target.value)}
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                                    placeholder="Auto-filled from Nikaya, editable…"
                                  />
                                  {err ? <p className="mt-1 text-sm text-red-600">{err}</p> : null}
                                </div>
                              );
                            }

                            if (id === "br_mahanaacharyacd") {
                              return (
                                <div key={id}>
                                  <BhikkhuAutocomplete
                                    id={id}
                                    label={f.label}
                                    required={!!f.rules?.required}
                                    placeholder="Search and pick — saves REGN"
                                    storeRegn
                                    initialDisplay={display.br_mahanaacharyacd ?? ""}
                                    onPick={({ regn, display: disp }) => {
                                      handleInputChange("br_mahanaacharyacd", regn ?? "");
                                      setDisplay((d) => ({ ...d, br_mahanaacharyacd: disp }));
                                    }}
                                  />
                                  {err ? <p className="mt-1 text-sm text-red-600">{err}</p> : null}
                                </div>
                              );
                            }

                            if (id === "br_robing_tutor_residence") {
                              return (
                                <div key={id}>
                                  <TempleAutocomplete
                                    id={id}
                                    label={f.label}
                                    required={!!f.rules?.required}
                                    placeholder="Search temple — saves TRN"
                                    storeTrn
                                    initialDisplay={display.br_robing_tutor_residence ?? ""}
                                    onPick={({ trn, display: disp }) => {
                                      handleInputChange("br_robing_tutor_residence", trn ?? "");
                                      setDisplay((d) => ({ ...d, br_robing_tutor_residence: disp }));
                                    }}
                                  />
                                  {err ? <p className="mt-1 text-sm text-red-600">{err}</p> : null}
                                </div>
                              );
                            }

                            if (id === "br_mahanatemple") {
                              return (
                                <div key={id}>
                                  <TempleAutocomplete
                                    id={id}
                                    label={f.label}
                                    required={!!f.rules?.required}
                                    placeholder="Search temple — saves TRN"
                                    storeTrn
                                    initialDisplay={display.br_mahanatemple ?? ""}
                                    onPick={({ trn, display: disp }) => {
                                      handleInputChange("br_mahanatemple", trn ?? "");
                                      setDisplay((d) => ({ ...d, br_mahanatemple: disp }));
                                    }}
                                  />
                                  {err ? <p className="mt-1 text-sm text-red-600">{err}</p> : null}
                                </div>
                              );
                            }

                            if (id === "br_robing_after_residence_temple") {
                              return (
                                <div key={id}>
                                  <TempleAutocomplete
                                    id={id}
                                    label={f.label}
                                    required={!!f.rules?.required}
                                    placeholder="Search temple — saves TRN"
                                    storeTrn
                                    initialDisplay={display.br_robing_after_residence_temple ?? ""}
                                    onPick={({ trn, display: disp }) => {
                                      handleInputChange("br_robing_after_residence_temple", trn ?? "");
                                      setDisplay((d) => ({ ...d, br_robing_after_residence_temple: disp }));
                                    }}
                                  />
                                  {err ? <p className="mt-1 text-sm text-red-600">{err}</p> : null}
                                </div>
                              );
                            }

                            if (id === "br_cat") {
                              return (
                                <div key={id}>
                                  <BhikkhuCategorySelect
                                    id={id}
                                    label={f.label}
                                    required={!!f.rules?.required}
                                    value={values.br_cat ?? NOVICE_CATEGORY_CODE}
                                    disabled
                                  />
                                  {err ? <p className="mt-1 text-sm text-red-600">{err}</p> : null}
                                </div>
                              );
                            }

                            if (id === "br_currstat") {
                              return (
                                <div key={id}>
                                  <BhikkhuStatusSelect
                                    id={id}
                                    label={f.label}
                                    required={!!f.rules?.required}
                                    initialCode={values.br_currstat ?? ""}
                                    onPick={({ code, display: disp }) => {
                                      handleInputChange("br_currstat", code);
                                      setDisplay((d) => ({ ...d, br_currstat: disp }));
                                    }}
                                  />
                                  {err ? <p className="mt-1 text-sm text-red-600">{err}</p> : null}
                                </div>
                              );
                            }

                            if (id === "br_residence_at_declaration") {
                              return (
                                <div key={id}>
                                  <TempleAutocompleteAddress
                                    id={id}
                                    label={f.label}
                                    required={!!f.rules?.required}
                                    placeholder="Type any address or pick a temple address…"
                                    initialDisplay={display.br_residence_at_declaration ?? values.br_residence_at_declaration ?? ""}
                                    onPick={({ address, display: disp }) => {
                                      handleInputChange("br_residence_at_declaration", address ?? "");
                                      setDisplay((d) => ({ ...d, br_residence_at_declaration: disp }));
                                    }}
                                  />
                                  {err ? <p className="mt-1 text-sm text-red-600">{err}</p> : null}
                                </div>
                              );
                            }

                            if (f.type === "textarea") {
                              const idStr = String(f.name);
                              const span2 = idStr === "br_mahanayaka_address" || idStr === "br_remarks";
                              const spanClass = idStr === "br_remarks" ? (gridCols.includes("md:grid-cols-3") ? "md:col-span-3" : "md:col-span-2") : "";
                              return (
                                <div key={idStr} className={span2 ? spanClass : ""}>
                                  <label htmlFor={idStr} className="block text-sm font-medium text-slate-700 mb-2">{f.label}</label>
                                  <textarea
                                    id={idStr}
                                    value={val}
                                    rows={f.rows ?? 4}
                                    onChange={(e) => handleInputChange(f.name, e.target.value)}
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all resize-none"
                                    placeholder={f.placeholder ?? (idStr === "br_mahanayaka_address" ? "Auto-filled from Nikaya, editable…" : undefined)}
                                  />
                                  {err ? <p className="mt-1 text-sm text-red-600">{err}</p> : null}
                                </div>
                              );
                            }

                            if (f.type === "date") {
                              return (
                                <DateField
                                  key={id}
                                  id={id}
                                  label={f.label}
                                  value={val}
                                  required={!!f.rules?.required}
                                  placeholder="YYYY-MM-DD"
                                  error={err}
                                  onChange={(v) => handleInputChange(f.name, v)}
                                />
                              );
                            }

                            if (id === "br_district" || id === "br_division" || id === "br_gndiv") return null;

                            return (
                              <div key={id} className="grid grid-cols-1">
                                <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-2">{f.label}</label>
                                <input
                                  id={id}
                                  type={f.type}
                                  value={val}
                                  onChange={(e) => handleInputChange(f.name, e.target.value)}
                                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                                  placeholder={f.placeholder}
                                />
                                {err ? <p className="mt-1 text-sm text-red-600">{err}</p> : null}
                              </div>
                            );
                          })}
                        </div>

                        <div className="flex justify-end mt-8 pt-6 border-t border-slate-200">
                          <button
                            onClick={handleSaveTab}
                            disabled={saving || loading || approving}
                            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-700 text-white rounded-lg font-medium hover:bg-slate-800 transition-all disabled:opacity-70"
                          >
                            {saving ? "Saving…" : "Save this section"}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
        <FooterBar />
      </div>

      <ToastContainer position="top-right" newestOnTop closeOnClick pauseOnHover />
    </div>
  );
}

export default function ManageBhikkhuPage(props: PageProps) {
  return (
    <Suspense fallback={<div className="p-8 text-slate-600">Loading…</div>}>
      <ManageBhikkhuInner {...props} />
    </Suspense>
  );
}
