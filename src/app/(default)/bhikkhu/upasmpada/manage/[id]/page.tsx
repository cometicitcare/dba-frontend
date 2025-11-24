"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
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
  _approveHighBhikkhu,
  _rejectHighBhikkhu,
} from "@/services/bhikku";
import { Tabs } from "@/components/ui/Tabs";
import QRCode from "react-qr-code";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField as MuiTextField,
  Button as MuiButton,
} from "@mui/material";
import { Worker, Viewer } from "@react-pdf-viewer/core";
import "@react-pdf-viewer/core/lib/styles/index.css";

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
const API_BASE_URL = "https://api.dbagovlk.com";
const FALLBACK_PDF_URL =
  "https://api.dbagovlk.com/storage/bhikku_regist/2025/11/23/BH2025000051/scanned_document_20251123_191251_5aa366eb.pdf";

type PageProps = { params: { id: string } };

type NormalizedRecord = {
  recordId?: number;
  certificateRegn?: string;
  formPatch: Partial<UpasampadaForm>;
  scannedDocumentPath?: string;
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
  const certificateRegn = s(api?.bhr_regn ?? "");
  const scannedDocumentPath = s(api?.bhr_scanned_document_path ?? "");

  return { formPatch, recordId, certificateRegn, scannedDocumentPath };
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
  const [certificateRegn, setCertificateRegn] = useState<string>("");
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [printingMarking, setPrintingMarking] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [scannedFile, setScannedFile] = useState<File | null>(null);
  const [scanPreviewUrl, setScanPreviewUrl] = useState<string | null>(null);
  const [uploadingScan, setUploadingScan] = useState(false);
  const certificatePaperRef = useRef<HTMLDivElement | null>(null);
  const [scannedDocumentPath, setScannedDocumentPath] = useState<string>("");

  const resolveRecordId = () => recordId ?? (Number(editId) || null);

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
  const certificateNumber =
    certificateRegn ||
    (recordId != null ? String(recordId) : "") ||
    form.candidateRegNo ||
    editId;
  const certificateUrl = certificateNumber ? `${CERTIFICATE_URL_BASE}/${certificateNumber}` : "";
  const certificateNumberLabel = certificateNumber || "Pending assignment";
  const certificateUrlLabel = certificateUrl || "Not assigned yet";
  const certificateQrValue = certificateUrl || `${CERTIFICATE_URL_BASE}/sample`;
  const pdfUrl = useMemo(() => {
    const trimmed = scannedDocumentPath.trim();
    if (trimmed) {
      if (/^https?:\/\//i.test(trimmed)) return trimmed;
      const normalizedPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
      return `${API_BASE_URL}${normalizedPath}`;
    }
    return FALLBACK_PDF_URL;
  }, [scannedDocumentPath]);

  const collectApprovalErrors = (source: any) => {
    const container = source?.data ?? source;
    const rawErrors =
      container?.errors ??
      container?.[""] ??
      container?.data?.errors ??
      container?.data?.[""];
    const messages = Array.isArray(rawErrors)
      ? rawErrors
          .map((err) => {
            if (!err) return "";
            const msg = err.message ?? err.msg ?? "";
            const field = err.field ?? err.name ?? "";
            if (field && msg) return `${field}: ${msg}`;
            if (msg) return msg;
            return field ? `${field}: Validation failed.` : "";
          })
          .filter(Boolean)
      : [];
    const fallback =
      container?.message ??
      container?.data?.message ??
      "Failed to approve. Please try again.";
    return { messages, fallback };
  };

  const handleOpenApproveDialog = () => setApproveDialogOpen(true);
  const handleCloseApproveDialog = () => {
    if (approving) return;
    setApproveDialogOpen(false);
  };
  const handleOpenRejectDialog = () => {
    setRejectionReason("");
    setRejectDialogOpen(true);
  };
  const handleCloseRejectDialog = () => {
    if (rejecting) return;
    setRejectDialogOpen(false);
  };

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
        const {
          formPatch,
          recordId: fetchedId,
          certificateRegn: fetchedRegn,
          scannedDocumentPath: fetchedScannedPath,
        } = normalizeRecord(api);
        if (cancelled) return;
        setForm((prev) => ({ ...prev, ...formPatch }));
        setRecordId(fetchedId ?? null);
        setCertificateRegn(fetchedRegn ?? "");
        setScannedDocumentPath(fetchedScannedPath ?? "");
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

    const resolvedId = recordId ?? (Number(editId) || undefined);
    const resolvedRegn = certificateRegn || editId || "";

    const baseIdentifiers = {
      bhr_id: resolvedId,
      bhr_regn: resolvedRegn || undefined,
    };

    const payload = (() => {
      switch (activeFormStep.id) {
        case 1:
          return {
            ...baseIdentifiers,
            bhr_higher_ordination_place: form.higherOrdinationPlace,
            bhr_higher_ordination_date: toYYYYMMDD(form.higherOrdinationDate),
            bhr_karmacharya_name: form.karmacharyaName,
            bhr_upaddhyaya_name: form.upaddhyayaName,
            bhr_assumed_name: form.assumedName,
          };
        case 2:
          return {
            ...baseIdentifiers,
            bhr_residence_higher_ordination_trn: form.higherOrdinationResidenceTrn,
            bhr_residence_permanent_trn: form.permanentResidenceTrn,
            bhr_declaration_residence_address: form.declarationResidenceAddress,
            bhr_tutors_tutor_regn: form.tutorsTutorRegNo,
            bhr_presiding_bhikshu_regn: form.presidingBhikshuRegNo,
          };
        case 3:
        default:
          return {
            ...baseIdentifiers,
            bhr_currstat: form.currentStatus,
            bhr_declaration_date: toYYYYMMDD(form.declarationDate),
            bhr_remarks: form.remarks,
          };
      }
    })();

    try {
      await _manageHighBhikku({
        action: "UPDATE",
        payload: { data: payload },
      } as any);

      toast.success(`"${activeFormStep.title}" updated.`, {
        autoClose: 1200,
      });

      const nextStepId = activeFormStep.id + 1;
      if (FORM_STEPS.some((step) => step.id === nextStepId)) {
        setActiveTab(String(nextStepId));
      } else {
        setTimeout(() => router.push("/bhikkhu"), 1400);
      }
    } catch (error: any) {
      const message = error?.message ?? "Failed to update record.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async () => {
    const id = resolveRecordId();
    if (!id) {
      toast.error("Missing record id.");
      return;
    }
    try {
      setApproving(true);
      setApproveDialogOpen(false);
      const res = await _approveHighBhikkhu({
        action: "APPROVE",
        bhr_id: id,
      });
      const payload = (res as any)?.data ?? res;
      const success = (payload as any)?.success ?? true;
      if (!success) {
        const { messages, fallback } = collectApprovalErrors(payload);
        toast.error(messages.join("\n") || fallback);
        return;
      }
      toast.success("Approved successfully.", { autoClose: 1200 });
    } catch (e: unknown) {
      const data = (e as any)?.response?.data ?? (e as any)?.data;
      const { messages, fallback } = collectApprovalErrors(data);
      const errMsg =
        messages.join("\n") ||
        fallback ||
        (e instanceof Error ? e.message : "Failed to approve. Please try again.");
      toast.error(errMsg);
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    const id = resolveRecordId();
    if (!id) {
      toast.error("Missing record id.");
      return;
    }
    const reason = rejectionReason.trim();
    if (!reason) {
      toast.error("Please enter a rejection reason.");
      return;
    }
    try {
      setRejecting(true);
      setRejectDialogOpen(false);
      const res = await _rejectHighBhikkhu({
        action: "REJECT",
        bhr_id: id,
        rejection_reason: reason,
      });
      const payload = (res as any)?.data ?? res;
      const success = (payload as any)?.success ?? true;
      if (!success) {
        const { messages, fallback } = collectApprovalErrors(payload);
        toast.error(messages.join("\n") || fallback);
        return;
      }
      toast.success("Rejected successfully.", { autoClose: 1200 });
      setRejectionReason("");
    } catch (e: unknown) {
      const data = (e as any)?.response?.data ?? (e as any)?.data;
      const { messages, fallback } = collectApprovalErrors(data);
      const errMsg =
        messages.join("\n") ||
        fallback ||
        (e instanceof Error ? e.message : "Failed to reject. Please try again.");
      toast.error(errMsg);
    } finally {
      setRejecting(false);
    }
  };

  const handleOpenPrintDialog = async () => {
    const id = resolveRecordId();
    if (!id) {
      toast.error("Missing record id.");
      return;
    }
    try {
      setPrintingMarking(true);
      await _markPrintedHighBhikkhu({
        action: "MARK_PRINTED",
        bhr_id: id,
      });
      toast.success("Marked certificate as printed.", { autoClose: 1200 });
    } catch (error: any) {
      const message = error?.message ?? "Failed to mark as printed.";
      toast.error(message);
    } finally {
      setShowUploadModal(true);
      window.print();
      setPrintingMarking(false);
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
      toast.error("Missing registration number.");
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

  const handleCloseUploadModal = () => {
    if (uploadingScan) return;
    setShowUploadModal(false);
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
                  <div className="flex flex-col items-end gap-2 text-sm text-slate-200">
                    <div>
                      Record: <span className="font-semibold">{editId}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleOpenRejectDialog}
                        disabled={loading || submitting || rejecting}
                        className={`px-4 py-2 rounded-lg font-medium transition-all
                          ${
                            loading || submitting || rejecting
                              ? "bg-red-700/60 text-white cursor-not-allowed"
                              : "bg-red-600 text-white hover:bg-red-700"
                          }`}
                        aria-label="Reject registration"
                        title="Reject registration"
                      >
                        {rejecting ? "Rejecting..." : "Reject"}
                      </button>
                      <button
                        onClick={handleOpenApproveDialog}
                        disabled={loading || submitting || approving}
                        className={`px-4 py-2 rounded-lg font-medium transition-all
                          ${
                            loading || submitting || approving
                              ? "bg-green-700/60 text-white cursor-not-allowed"
                              : "bg-green-600 text-white hover:bg-green-700"
                          }`}
                        aria-label="Approve registration"
                        title="Approve registration"
                      >
                        {approving ? "Approving..." : "Approve"}
                      </button>
                    </div>
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
                          <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white/80 p-6 shadow">
                            <div className="flex flex-col gap-2 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
                              <div>
                                <p className="text-xs uppercase tracking-[0.5em] text-slate-400">
                                  Certificate number
                                </p>
                                <p className="text-2xl font-semibold text-slate-900">
                                  {certificateNumberLabel}
                                </p>
                                <p className="break-all text-slate-500">
                                  {certificateUrlLabel}
                                </p>
                              </div>
                              <button
                                onClick={handleOpenPrintDialog}
                                disabled={printingMarking || !certificateNumber}
                                className="inline-flex items-center justify-center rounded-full bg-slate-800 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-400 disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                {printingMarking ? "Please wait..." : "Print QR on Certificate"}
                              </button>
                            </div>
                            <p className="text-xs text-slate-500">
                              Insert the pre-printed legal-size certificate into the printer.
                              Only the QR code positioned at the bottom-right corner of the sheet will be printed.
                            </p>
                          </div>

                          <div className="flex justify-center">
                            <div
                              id="certificate-print-area"
                              ref={certificatePaperRef}
                              className="relative bg-white"
                              style={{ width: "8.5in", height: "14in" }}
                            >
                              <div className="absolute inset-0 pointer-events-none" />
                              <div className="absolute bottom-20 right-16">
                                <div className="rounded-lg border border-slate-200 bg-white p-2">
                                  <QRCode
                                    value={certificateQrValue}
                                    size={80}
                                    className="h-20 w-20"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          <style>{`
                            @media print {
                              @page {
                                margin: 0;
                              }
                              body {
                                margin: 0 !important;
                                padding: 0 !important;
                              }
                              body * {
                                visibility: hidden;
                                box-shadow: none !important;
                              }
                              #certificate-print-area,
                              #certificate-print-area * {
                                visibility: visible;
                              }
                              #certificate-print-area {
                                position: absolute;
                                left: 0;
                                top: 0;
                                right: 0;
                                margin: 0 auto;
                                box-shadow: none !important;
                              }
                            }
                          `}</style>
                        </div>
                      );
                    }

                    if (activeConfig?.type === "upload") {
                      return (
                        <div className="space-y-6">
                          <div>
                            <h2 className="text-xl font-bold text-slate-800">Reference PDF</h2>
                            <p className="text-sm text-slate-500 mt-1">
                              View the Buddhist Temporalities Consolidated 2024 document.
                            </p>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm space-y-4">
                            <div className="aspect-[8.5/11] w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                              <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
                                <Viewer fileUrl={pdfUrl} withCredentials={false} />
                              </Worker>
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
      {showUploadModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleCloseUploadModal}
          />
          <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Upload Scanned Certificate
                </p>
                <p className="text-xs text-slate-500">
                  Attach the scanned image/PDF after printing.
                </p>
              </div>
              <button
                aria-label="Close upload"
                onClick={handleCloseUploadModal}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
              >
                ×
              </button>
            </div>
            <div className="space-y-4 px-6 py-6">
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 p-6 text-center text-sm text-slate-500">
                <p>Drag & drop or click to select the scanned certificate file.</p>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="mt-4 block w-full text-sm text-slate-700"
                  onChange={handleScanFileChange}
                />
                {scannedFile ? (
                  <div className="mt-3 text-xs text-slate-600 space-y-1">
                    <p>Selected: {scannedFile.name}</p>
                    <p>
                      Size:{" "}
                      {scannedFile.size >= 1024 * 1024
                        ? `${(scannedFile.size / (1024 * 1024)).toFixed(1)} MB`
                        : `${(scannedFile.size / 1024).toFixed(1)} KB`}
                    </p>
                  </div>
                ) : null}
              </div>
              {scanPreviewUrl ? (
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <img
                    src={scanPreviewUrl}
                    alt="Selected scan preview"
                    className="w-full max-h-80 object-contain bg-slate-50"
                  />
                </div>
              ) : null}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  className="rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                  onClick={handleCloseUploadModal}
                  disabled={uploadingScan}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="rounded-full bg-slate-900 px-6 py-2 text-sm font-semibold text-white hover:bg-slate-950 disabled:cursor-not-allowed disabled:bg-slate-600"
                  onClick={handleUploadScan}
                  disabled={uploadingScan || !scannedFile}
                >
                  {uploadingScan ? "Uploading..." : "Upload Scan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      <Dialog
        open={approveDialogOpen}
        onClose={handleCloseApproveDialog}
        aria-labelledby="approve-dialog-title"
      >
        <DialogTitle id="approve-dialog-title">Approve registration?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Approving will finalize this record. This action may be irreversible.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <MuiButton onClick={handleCloseApproveDialog} disabled={approving}>
            Cancel
          </MuiButton>
          <MuiButton onClick={handleApprove} disabled={approving} color="primary" variant="contained">
            {approving ? "Approving..." : "Approve"}
          </MuiButton>
        </DialogActions>
      </Dialog>

      <Dialog
        open={rejectDialogOpen}
        onClose={handleCloseRejectDialog}
        aria-labelledby="reject-dialog-title"
      >
        <DialogTitle id="reject-dialog-title">Reject registration?</DialogTitle>
        <DialogContent>
          <DialogContentText>Rejecting will mark this registration as declined.</DialogContentText>
          <MuiTextField
            autoFocus
            margin="dense"
            id="rejection-reason"
            label="Rejection reason"
            type="text"
            fullWidth
            multiline
            minRows={2}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <MuiButton onClick={handleCloseRejectDialog} disabled={rejecting}>
            Cancel
          </MuiButton>
          <MuiButton onClick={handleReject} disabled={rejecting} color="error" variant="contained">
            {rejecting ? "Rejecting..." : "Reject"}
          </MuiButton>
        </DialogActions>
      </Dialog>

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
