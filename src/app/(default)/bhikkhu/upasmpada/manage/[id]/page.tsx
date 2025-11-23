"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { FooterBar } from "@/components/FooterBar";
import {
  BhikkhuAutocomplete,
  BhikkhuStatusSelect,
  DateField,
  TempleAutocomplete,
  toYYYYMMDD,
} from "@/components/Bhikku/Add";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  _manageHighBhikku,
  _markPrintedHighBhikkhu,
  _uploadScannedHighDocument,
} from "@/services/bhikku";
import { Tabs } from "@/components/ui/Tabs";

type UpasampadaForm = {
  candidateRegNo: string;
  candidateDisplay: string;
  currentStatus: string;
  higherOrdinationPlace: string;
  higherOrdinationDate: string;
  karmacharyaName: string;
  upaddhyayaName: string;
  assumedName: string;
  higherOrdinationResidenceTrn: string;
  higherOrdinationResidenceDisplay: string;
  permanentResidenceTrn: string;
  permanentResidenceDisplay: string;
  declarationResidenceAddress: string;
  tutorsTutorRegNo: string;
  tutorsTutorDisplay: string;
  presidingBhikshuRegNo: string;
  presidingBhikshuDisplay: string;
  samaneraSerial: string;
  declarationDate: string;
  remarks: string;
};

const INITIAL_FORM: UpasampadaForm = {
  candidateRegNo: "",
  candidateDisplay: "",
  currentStatus: "",
  higherOrdinationPlace: "",
  higherOrdinationDate: "",
  karmacharyaName: "",
  upaddhyayaName: "",
  assumedName: "",
  higherOrdinationResidenceTrn: "",
  higherOrdinationResidenceDisplay: "",
  permanentResidenceTrn: "",
  permanentResidenceDisplay: "",
  declarationResidenceAddress: "",
  tutorsTutorRegNo: "",
  tutorsTutorDisplay: "",
  presidingBhikshuRegNo: "",
  presidingBhikshuDisplay: "",
  samaneraSerial: "",
  declarationDate: "",
  remarks: "",
};

const FORM_STEPS = [
  {
    id: 1,
    title: "Candidate & Ceremony",
    description: "Link an existing Bhikkhu and capture the key details of the higher ordination.",
  },
  {
    id: 2,
    title: "Residences & Clergy",
    description: "Capture residences plus the tutors who performed/presented the ceremony.",
  },
  {
    id: 3,
    title: "Declaration",
    description: "Record registers, declaration date, and any remarks.",
  },
];

const REQUIRED_BY_STEP: Record<number, Array<keyof UpasampadaForm>> = {
  1: ["candidateRegNo", "higherOrdinationPlace", "higherOrdinationDate", "karmacharyaName", "upaddhyayaName", "assumedName"],
  2: ["higherOrdinationResidenceTrn", "permanentResidenceTrn", "declarationResidenceAddress", "tutorsTutorRegNo", "presidingBhikshuRegNo"],
  3: ["currentStatus", "declarationDate"],
};

const UPASAMPADA_CATEGORY_CODE = "CAT02";
const CERTIFICATE_URL_BASE = "https://hrms.dbagovlk.com/bhikkhu/certificate";

type PageProps = { params: { id: string } };

type NormalizedRecord = {
  recordId?: number;
  formPatch: Partial<UpasampadaForm>;
};

const normalizeRecord = (api: any): NormalizedRecord => {
  const s = (v: unknown) => (v == null ? "" : String(v));

  const templeTrn = (val: any) => s(val?.vh_trn ?? val);
  const templeDisplay = (val: any) => {
    const trn = templeTrn(val);
    const name = s(val?.vh_vname ?? val?.name ?? "");
    if (name && trn) return `${name} - ${trn}`;
    return name || trn;
  };

  const bhikkhuRegn = (val: any) => s(val?.br_regn ?? val?.regn ?? val);
  const bhikkhuDisplay = (val: any) => {
    const regn = bhikkhuRegn(val);
    const name = s(val?.br_mahananame ?? val?.br_gihiname ?? val?.name ?? "");
    if (name && regn) return `${name} - ${regn}`;
    return name || regn;
  };

  const formPatch: Partial<UpasampadaForm> = {
    candidateRegNo: s(api?.bhr_candidate_regn?.br_regn ?? api?.bhr_candidate_regn ?? api?.bhr_candidate?.br_regn),
    candidateDisplay: bhikkhuDisplay(api?.bhr_candidate ?? api?.bhr_candidate_regn),
    currentStatus: s(api?.bhr_currstat?.st_statcd ?? api?.bhr_currstat),
    higherOrdinationPlace: s(api?.bhr_higher_ordination_place),
    higherOrdinationDate: toYYYYMMDD(s(api?.bhr_higher_ordination_date)),
    karmacharyaName: s(api?.bhr_karmacharya_name),
    upaddhyayaName: s(api?.bhr_upaddhyaya_name),
    assumedName: s(api?.bhr_assumed_name),
    higherOrdinationResidenceTrn: templeTrn(api?.bhr_residence_higher_ordination_trn),
    higherOrdinationResidenceDisplay: templeDisplay(api?.bhr_residence_higher_ordination_trn),
    permanentResidenceTrn: templeTrn(api?.bhr_residence_permanent_trn),
    permanentResidenceDisplay: templeDisplay(api?.bhr_residence_permanent_trn),
    declarationResidenceAddress: s(api?.bhr_declaration_residence_address ?? api?.bhr_residence_at_declaration),
    tutorsTutorRegNo: bhikkhuRegn(api?.bhr_tutors_tutor_regn),
    tutorsTutorDisplay: bhikkhuDisplay(api?.bhr_tutors_tutor_regn),
    presidingBhikshuRegNo: bhikkhuRegn(api?.bhr_presiding_bhikshu_regn),
    presidingBhikshuDisplay: bhikkhuDisplay(api?.bhr_presiding_bhikshu_regn),
    samaneraSerial: s(api?.bhr_samanera_serial_no),
    declarationDate: toYYYYMMDD(s(api?.bhr_declaration_date)),
    remarks: s(api?.bhr_remarks),
  };

  const recordId = Number(api?.bhr_id ?? api?.id ?? api?.bhr_regn ?? api?.regn) || undefined;

  return { formPatch, recordId };
};

export default function ManageUpasampadaPage({ params }: PageProps) {
  const editId = params.id;
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<string>(String(FORM_STEPS[0].id));
  const [form, setForm] = useState<UpasampadaForm>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [recordId, setRecordId] = useState<number | null>(null);
  const [markingPrinted, setMarkingPrinted] = useState(false);
  const [scannedFile, setScannedFile] = useState<File | null>(null);
  const [scanPreviewUrl, setScanPreviewUrl] = useState<string | null>(null);
  const [uploadingScan, setUploadingScan] = useState(false);

  const tabs = useMemo(
    () => [
      ...FORM_STEPS.map((step) => ({ id: String(step.id), label: step.title, type: "form" as const, step })),
      { id: "certificates", label: "Certificates", type: "cert" as const },
      { id: "upload-scans", label: "Upload Scanned Files", type: "upload" as const },
    ],
    []
  );
  const activeFormStep = useMemo(
    () => FORM_STEPS.find((s) => String(s.id) === activeTab),
    [activeTab]
  );
  const stepRequirements = activeFormStep ? REQUIRED_BY_STEP[activeFormStep.id] ?? [] : [];
  const stepIsValid = useMemo(() => {
    if (!activeFormStep) return true;
    if (loading) return false;
    return stepRequirements.every((field) => {
      const value = form[field];
      return typeof value === "string" ? value.trim().length > 0 : Boolean(value);
    });
  }, [form, stepRequirements, loading, activeFormStep]);
  const certificateNumber = form.candidateRegNo || editId;
  const certificateUrl = certificateNumber ? `${CERTIFICATE_URL_BASE}/${certificateNumber}` : "";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await _manageHighBhikku({
          action: "READ_ONE",
          payload: { bhr_regn: editId, bhr_id: Number(editId) || undefined },
        } as any);
        const api = (res as any)?.data?.data ?? (res as any)?.data ?? res;
        const { formPatch, recordId: fetchedId } = normalizeRecord(api);
        if (cancelled) return;
        setForm((prev) => ({ ...prev, ...formPatch }));
        setRecordId(fetchedId ?? null);
      } catch (error: any) {
        if (cancelled) return;
        const message = error?.message ?? "Failed to load record.";
        toast.error(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editId]);

  const updateField = (field: keyof UpasampadaForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleUpdateTab = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!stepIsValid || submitting || !activeFormStep) return;
    setSubmitting(true);

    const today = toYYYYMMDD(new Date().toISOString());

    const payload = {
      bhr_id: recordId ?? (Number(editId) || undefined),
      bhr_reqstdate: today,
      bhr_currstat: form.currentStatus,
      bhr_parshawaya: "",
      bhr_livtemple: form.permanentResidenceTrn || form.higherOrdinationResidenceTrn || "",
      bhr_candidate_regn: form.candidateRegNo,
      bhr_cc_code: UPASAMPADA_CATEGORY_CODE,
      bhr_samanera_serial_no: form.samaneraSerial,
      bhr_higher_ordination_place: form.higherOrdinationPlace,
      bhr_higher_ordination_date: toYYYYMMDD(form.higherOrdinationDate),
      bhr_karmacharya_name: form.karmacharyaName,
      bhr_upaddhyaya_name: form.upaddhyayaName,
      bhr_assumed_name: form.assumedName,
      bhr_residence_higher_ordination_trn: form.higherOrdinationResidenceTrn,
      bhr_residence_permanent_trn: form.permanentResidenceTrn,
      bhr_declaration_residence_address: form.declarationResidenceAddress,
      bhr_tutors_tutor_regn: form.tutorsTutorRegNo,
      bhr_presiding_bhikshu_regn: form.presidingBhikshuRegNo,
      bhr_declaration_date: toYYYYMMDD(form.declarationDate),
      bhr_remarks: form.remarks,
    };

    try {
      await _manageHighBhikku({
        action: "UPDATE",
        payload: { data: payload },
      } as any);

      toast.success(`"${activeFormStep.title}" updated.`, {
        autoClose: 1200,
        onClose: () => router.push("/bhikkhu"),
      });
      setTimeout(() => router.push("/bhikkhu"), 1400);
    } catch (error: any) {
      const message = error?.message ?? "Failed to update record.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkPrinted = async () => {
    const regn = certificateNumber;
    if (!regn) {
      toast.error("Missing Bhikkhu registration number.");
      return;
    }
    try {
      setMarkingPrinted(true);
      await _markPrintedHighBhikkhu(regn);
      toast.success("Marked certificate as printed.", { autoClose: 1200 });
    } catch (error: any) {
      const message = error?.message ?? "Failed to mark as printed.";
      toast.error(message);
    } finally {
      setMarkingPrinted(false);
    }
  };

  const handleScanFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setScannedFile(file);
    if (scanPreviewUrl) URL.revokeObjectURL(scanPreviewUrl);
    if (file && file.type.startsWith("image/")) {
      setScanPreviewUrl(URL.createObjectURL(file));
    } else {
      setScanPreviewUrl(null);
    }
  };

  const handleUploadScan = async () => {
    const regn = certificateNumber;
    if (!regn) {
      toast.error("Missing Bhikkhu registration number.");
      return;
    }
    if (!scannedFile) {
      toast.error("Please choose a file to upload.");
      return;
    }
    try {
      setUploadingScan(true);
      await _uploadScannedHighDocument(regn, scannedFile);
      toast.success("Scanned file uploaded.", { autoClose: 1200 });
      setScannedFile(null);
      if (scanPreviewUrl) URL.revokeObjectURL(scanPreviewUrl);
      setScanPreviewUrl(null);
    } catch (error: any) {
      const message = error?.message ?? "Failed to upload file.";
      toast.error(message);
    } finally {
      setUploadingScan(false);
    }
  };

  useEffect(() => {
    return () => {
      if (scanPreviewUrl) URL.revokeObjectURL(scanPreviewUrl);
    };
  }, [scanPreviewUrl]);

  const renderStep = (stepNumber: number) => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-40 text-slate-500">
          Loading record...
        </div>
      );
    }

    switch (stepNumber) {
      case 1:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label htmlFor="linked-bhikkhu" className="block text-sm font-medium text-slate-700 mb-2">
                Linked Bhikkhu
              </label>
              <input
                id="linked-bhikkhu"
                type="text"
                value={form.candidateDisplay || form.candidateRegNo || ""}
                readOnly
                aria-readonly="true"
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-slate-100 text-slate-700"
              />
              <p className="mt-2 text-sm text-slate-500">
                Linked Bhikkhu cannot be changed in edit mode.
              </p>
            </div>
            <TextField
              id="place-higher-ordination"
              label="Place of Higher Ordination"
              value={form.higherOrdinationPlace}
              onChange={(v) => updateField("higherOrdinationPlace", v)}
              required
            />
            <DateField
              id="date-higher-ordination"
              label="Date of Higher Ordination"
              value={form.higherOrdinationDate}
              onChange={(v) => updateField("higherOrdinationDate", v)}
              required
            />
            <TextField
              id="karmacharya-name"
              label="Name of Karmacharya"
              value={form.karmacharyaName}
              onChange={(v) => updateField("karmacharyaName", v)}
              required
            />
            <TextField
              id="upaddhyaya-name"
              label="Name of Upaddhyaya at Higher Ordination"
              value={form.upaddhyayaName}
              onChange={(v) => updateField("upaddhyayaName", v)}
              required
            />
            <TextField
              id="assumed-name"
              label="Name assumed at Higher Ordination"
              value={form.assumedName}
              onChange={(v) => updateField("assumedName", v)}
              required
            />
          </div>
        );
      case 2:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <TempleAutocomplete
                id="residence-ho"
                label="Residence at time of Higher Ordination"
                initialDisplay={form.higherOrdinationResidenceDisplay}
                onPick={({ trn, display }) =>
                  setForm((prev) => ({
                    ...prev,
                    higherOrdinationResidenceTrn: trn ?? "",
                    higherOrdinationResidenceDisplay: display,
                  }))
                }
                required
              />
            </div>
            <div>
              <TempleAutocomplete
                id="residence-permanent"
                label="Permanent Residence"
                initialDisplay={form.permanentResidenceDisplay}
                onPick={({ trn, display }) =>
                  setForm((prev) => ({
                    ...prev,
                    permanentResidenceTrn: trn ?? "",
                    permanentResidenceDisplay: display,
                  }))
                }
                required
              />
            </div>
            <TextField
              id="declaration-residence"
              label="Residence at time of declaration, and full Postal Address"
              value={form.declarationResidenceAddress}
              onChange={(v) => updateField("declarationResidenceAddress", v)}
              required
              rows={4}
            />
            <div>
              <BhikkhuAutocomplete
                id="tutors-tutor"
                label="Name of Tutor of Tudors presenting for Higher Ordination"
                initialDisplay={form.tutorsTutorDisplay}
                onPick={({ regn, display }) =>
                  setForm((prev) => ({
                    ...prev,
                    tutorsTutorRegNo: regn ?? "",
                    tutorsTutorDisplay: display,
                  }))
                }
                required
              />
            </div>
            <div>
              <BhikkhuAutocomplete
                id="presiding-bhikshu"
                label="Name of Bhikshu presiding at Higher Ordination"
                initialDisplay={form.presidingBhikshuDisplay}
                onPick={({ regn, display }) =>
                  setForm((prev) => ({
                    ...prev,
                    presidingBhikshuRegNo: regn ?? "",
                    presidingBhikshuDisplay: display,
                  }))
                }
                required
              />
            </div>
          </div>
        );
      case 3:
      default:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <BhikkhuStatusSelect
              id="current-status"
              label="Current Status"
              value={form.currentStatus}
              required
              onPick={({ code }) => updateField("currentStatus", code)}
            />
            <div className="grid grid-cols-1">
              <label htmlFor="samanera-serial" className="block text-sm font-medium text-slate-700 mb-2">
                Serial Number in Samanera Register, if any
              </label>
              <input
                id="samanera-serial"
                type="text"
                value={form.samaneraSerial}
                readOnly
                aria-readonly="true"
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm bg-slate-100 text-slate-700"
              />
              <p className="mt-2 text-sm text-slate-500">This serial number is fixed and cannot be edited.</p>
            </div>
            <DateField
              id="declaration-date"
              label="Date of making the declaration"
              value={form.declarationDate}
              onChange={(v) => updateField("declarationDate", v)}
              required
            />
            <TextField
              id="remarks"
              label="Remarks"
              value={form.remarks}
              onChange={(v) => updateField("remarks", v)}
              rows={4}
            />
          </div>
        );
    }
  };

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
                    <h1 className="text-2xl font-bold text-white mb-1">Update Upasampada</h1>
                    <p className="text-slate-300 text-sm">
                      Edit the higher-ordination details for this Bhikkhu.
                    </p>
                  </div>
                  <div className="text-sm text-slate-200">
                    Record: <span className="font-semibold">{editId}</span>
                  </div>
                </div>
              </div>

              <div className="px-4 md:px-10 py-6">
                <Tabs
                  tabs={tabs}
                  value={activeTab}
                  onChange={(id) => setActiveTab(id)}
                  contentClassName="pt-6"
                  renderContent={(activeId) => {
                    const activeConfig = tabs.find((t) => t.id === activeId);
                    if (activeConfig?.type === "form") {
                      const stepNumber = activeConfig.step?.id ?? 1;
                      const step = activeConfig.step ?? FORM_STEPS[0];
                      return (
                        <form className="space-y-8" onSubmit={handleUpdateTab}>
                          <div>
                            <h2 className="text-xl font-bold text-slate-800">{step.title}</h2>
                            <p className="text-sm text-slate-500 mt-1">{step.description}</p>
                          </div>

                          <div className="min-h-[360px]">{renderStep(stepNumber)}</div>

                          <div className="flex justify-end pt-4 border-t border-slate-100">
                            <button
                              type="submit"
                              disabled={!stepIsValid || submitting}
                              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-all disabled:opacity-60"
                            >
                              {submitting ? "Saving..." : `Update ${step.title}`}
                            </button>
                          </div>
                        </form>
                      );
                    }

                    if (activeConfig?.type === "cert") {
                      return (
                        <div className="space-y-6">
                          <div>
                            <h2 className="text-xl font-bold text-slate-800">Certificates</h2>
                            <p className="text-sm text-slate-500 mt-1">
                              View or mark the certificate for this Bhikkhu.
                            </p>
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-3">
                            <p className="text-sm text-slate-600">
                              Certificate URL:{" "}
                              {certificateUrl ? (
                                <a href={certificateUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                                  {certificateUrl}
                                </a>
                              ) : (
                                <span className="text-slate-400">Unavailable (missing registration number)</span>
                              )}
                            </p>
                            <div className="flex flex-wrap gap-3">
                              <button
                                type="button"
                                onClick={() => certificateUrl && window.open(certificateUrl, "_blank")}
                                disabled={!certificateUrl}
                                className="px-5 py-2.5 rounded-lg bg-slate-700 text-white text-sm font-semibold disabled:opacity-50"
                              >
                                Open certificate
                              </button>
                              <button
                                type="button"
                                onClick={handleMarkPrinted}
                                disabled={markingPrinted || !certificateNumber}
                                className="px-5 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50"
                              >
                                {markingPrinted ? "Marking..." : "Mark as printed"}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    if (activeConfig?.type === "upload") {
                      return (
                        <div className="space-y-6">
                          <div>
                            <h2 className="text-xl font-bold text-slate-800">Upload Scanned Files</h2>
                            <p className="text-sm text-slate-500 mt-1">
                              Attach scanned certificates or related documents.
                            </p>
                          </div>
                          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 space-y-4">
                            <input type="file" accept="image/*,.pdf" onChange={handleScanFileChange} />
                            {scannedFile ? (
                              <p className="text-sm text-slate-600">
                                Selected: {scannedFile.name} ({Math.round(scannedFile.size / 1024)} KB)
                              </p>
                            ) : (
                              <p className="text-sm text-slate-500">Choose a file to upload.</p>
                            )}
                            {scanPreviewUrl ? (
                              <div className="overflow-hidden rounded border border-slate-200 bg-white">
                                <img src={scanPreviewUrl} alt="Preview" className="max-h-64 w-full object-contain" />
                              </div>
                            ) : null}
                            <div className="flex gap-3">
                              <button
                                type="button"
                                onClick={handleUploadScan}
                                disabled={uploadingScan || !scannedFile}
                                className="px-5 py-2.5 rounded-lg bg-slate-700 text-white text-sm font-semibold disabled:opacity-50"
                              >
                                {uploadingScan ? "Uploading..." : "Upload file"}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setScannedFile(null);
                                  if (scanPreviewUrl) URL.revokeObjectURL(scanPreviewUrl);
                                  setScanPreviewUrl(null);
                                }}
                                disabled={uploadingScan || !scannedFile}
                                className="px-5 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-sm font-semibold disabled:opacity-50"
                              >
                                Clear
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return null;
                  }}
                />
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

type TextFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  rows?: number;
};

function TextField({ id, label, value, onChange, placeholder, required, rows }: TextFieldProps) {
  return (
    <div className="grid grid-cols-1">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-2">
        {label}
      </label>
      {rows && rows > 1 ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          required={required}
          placeholder={placeholder}
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all resize-y"
        />
      ) : (
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          placeholder={placeholder}
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
        />
      )}
    </div>
  );
}
