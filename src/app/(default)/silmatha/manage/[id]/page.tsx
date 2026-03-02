"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { FooterBar } from "@/components/FooterBar";
import { Tabs } from "@/components/ui/Tabs";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "@react-pdf-viewer/core/lib/styles/index.css";
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button as MuiButton, TextField as MuiTextField } from "@mui/material";
import {
  _manageSilmatha,
  _approveSilmatha,
  _rejectSilmatha,
  _markPrintedSilmatha,
  _uploadScannedDocument,
} from "@/services/silmatah";
import { Errors, FieldConfig, StepConfig, toISOFormat, toYYYYMMDD, validateField } from "@/components/silmatha/helpers";
import { SilmathaForm, silmathaInitialValues, silmathaSteps } from "@/components/silmatha/steps";
import DateField from "@/components/silmatha/DateField";
import LocationPicker, { LocationSelection } from "@/components/silmatha/LocationPicker";
import SilmathaAutocomplete from "@/components/silmatha/AutocompleteSilmatha";
import TempleAutocomplete from "@/components/silmatha/AutocompleteArama";
import BhikkhuStatusSelect from "@/components/silmatha/StatusSelect";
import { getStoredUserData } from "@/utils/userData";
import { SILMATHA_MANAGEMENT_DEPARTMENT, ADMIN_ROLE_LEVEL, DATAENTRY_ROLE_LEVEL } from "@/utils/config";
import QRCode from "react-qr-code";
import { Worker, Viewer } from "@react-pdf-viewer/core";

const LOCATION_FIELDS: Array<keyof SilmathaForm> = [
  "sm_province",
  "sm_district",
  "sm_divisional_secretariat",
  "sm_gn_division",
];

const SIGNATURE_FIELDS: Array<keyof SilmathaForm> = [
  "sil_student_signature",
  "sil_acharya_signature",
  "sil_aramadhipathi_signature",
  "sil_district_secretary_signature",
];

const SILMATHA_CERTIFICATE_URL_BASE = "https://hrms.dbagovlk.com/silmatha/certificate";
const API_BASE_URL = "https://api.dbagovlk.com";
const FALLBACK_PDF_URL =
  "https://api.dbagovlk.com/storage/bhikku_regist/2025/11/23/BH2025000051/scanned_document_20251123_191251_5aa366eb.pdf";

const FIELD_TO_API_MAP: Record<keyof SilmathaForm, string> = {
  sm_form_number: "sil_form_id",
  sm_reqstdate: "sil_reqstdate",
  sm_gihiname: "sil_gihiname",
  sm_dofb: "sil_dofb",
  sm_fathername: "sil_fathrname",
  sm_birthplace: "sil_birthpls",
  sm_province: "sil_province",
  sm_district: "sil_district",
  sm_divisional_secretariat: "sil_division",
  sm_gn_division: "sil_gndiv",
  sm_korale: "sil_korale",
  sm_pattu: "sil_pattu",
  sm_village: "sil_vilage",
  sm_viharadhipathi: "sil_aramadhipathi",
  sm_robing_date: "sil_mahanadate",
  sm_robing_name: "sil_mahananame",
  sm_robing_tutor: "sil_mahanaacharyacd",
  sm_robing_tutor_residence: "sil_robing_tutor_residence",
  sm_robing_temple: "sil_mahanatemple",
  sm_post_robing_temple: "sil_robing_after_residence_temple",
  sil_declaration_date: "sil_declaration_date",
  sil_remarks: "sil_remarks",
  sil_currstat: "sil_currstat",
  sil_student_signature: "sil_student_signature",
  sil_acharya_signature: "sil_acharya_signature",
  sil_aramadhipathi_signature: "sil_aramadhipathi_signature",
  sil_district_secretary_signature: "sil_district_secretary_signature",
};

type SilmathaTabItem =
  | { id: string; label: string; type: "form"; step: StepConfig<SilmathaForm> }
  | { id: string; label: string; type: "cert" }
  | { id: string; label: string; type: "upload" };

const TAB_ITEMS: SilmathaTabItem[] = [
  ...silmathaSteps.map((step) => ({
    id: String(step.id),
    label: step.title,
    type: "form" as const,
    step,
  })),
  { id: "certificates", label: "Certificates", type: "cert" as const },
  { id: "upload-scans", label: "Upload Scanned Files", type: "upload" as const },
];

type PageProps = { params: { id: string } };

const toSafeString = (value: unknown): string => {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const candidates = [
      obj.display,
      obj.label,
      obj.name,
      obj.sil_mahananame,
      obj.sil_gihiname,
      obj.sil_name,
      obj.trn,
      obj.regn,
      obj.code,
      obj.value,
      obj.pr_name,
      obj.pr_code,
      obj.ds_name,
      obj.ds_code,
      obj.dv_dvname,
      obj.dv_dvcode,
      obj.gn_gnname,
      obj.gn_code,
      obj.gn_gnc,
      obj.vh_vname,
      obj.vh_trn,
      obj.ar_vname,
      obj.ar_trn,
      obj.st_descr,
      obj.st_statcd,
    ];
    for (const candidate of candidates) {
      if (candidate != null) return toSafeString(candidate);
    }
  }
  return "";
};

const toIdentifierString = (value: unknown): string => {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const candidates = [
      obj.sil_regn,
      obj.ar_trn,
      obj.trn,
      obj.regn,
      obj.code,
      obj.value,
    ];
    for (const candidate of candidates) {
      const normalized = toIdentifierString(candidate);
      if (normalized) return normalized;
    }
  }
  return "";
};

const toCheckboxString = (value: unknown): "true" | "false" => {
  if (value === true || value === "true" || value === 1 || value === "1") return "true";
  return "false";
};

type NormalizeResult = {
  form: SilmathaForm;
  display: Partial<Record<keyof SilmathaForm, string>>;
  scannedDocumentPath?: string;
  regn?: string;
};

const normalizeSilmathaRecord = (api: any): NormalizeResult => {
  const convertDate = (value: unknown) => toISOFormat(toSafeString(value));
  const patch: SilmathaForm = {
    sm_form_number: toSafeString(api?.sil_form_id ?? api?.sm_form_number),
    sm_reqstdate: convertDate(api?.sil_reqstdate ?? api?.sm_reqstdate),
    sm_gihiname: toSafeString(api?.sil_gihiname ?? api?.sm_gihiname),
    sm_dofb: convertDate(api?.sil_dofb ?? api?.sm_dofb),
    sm_fathername: toSafeString(api?.sil_fathrname ?? api?.sm_fathername),
    sm_birthplace: toSafeString(api?.sil_birthpls ?? api?.sm_birthplace),
    sm_province: toSafeString(
      api?.sil_province?.pr_code ??
        api?.sil_province?.cp_code ??
        api?.sil_province ??
        api?.sm_province
    ),
    sm_district: toSafeString(
      api?.sil_district?.ds_code ??
        api?.sil_district?.dd_dcode ??
        api?.sil_district ??
        api?.sm_district
    ),
    sm_divisional_secretariat: toSafeString(
      api?.sil_division?.dv_code ??
        api?.sil_division?.dv_dvcode ??
        api?.sil_division ??
        api?.sm_divisional_secretariat
    ),
    sm_gn_division: toSafeString(
      api?.sil_gndiv?.gn_code ??
        api?.sil_gndiv?.gn_gnc ??
        api?.sil_gndiv ??
        api?.sm_gn_division
    ),
    sm_korale: toSafeString(api?.sil_korale ?? api?.sm_korale),
    sm_pattu: toSafeString(api?.sil_pattu ?? api?.sm_pattu),
    sm_village: toSafeString(api?.sil_vilage ?? api?.sm_village),
    sm_viharadhipathi: toIdentifierString(api?.sil_aramadhipathi ?? api?.sm_viharadhipathi),
    sm_robing_date: convertDate(api?.sil_mahanadate ?? api?.sm_robing_date),
    sm_robing_name: toSafeString(api?.sil_mahananame ?? api?.sm_robing_name),
    sm_robing_tutor: toIdentifierString(api?.sil_mahanaacharyacd ?? api?.sm_robing_tutor),
    sm_robing_tutor_residence: toIdentifierString(
      api?.sil_robing_tutor_residence ?? api?.sm_robing_tutor_residence
    ),
    sm_robing_temple: toIdentifierString(api?.sil_mahanatemple ?? api?.sm_robing_temple),
    sm_post_robing_temple: toIdentifierString(
      api?.sil_robing_after_residence_temple ?? api?.sm_post_robing_temple
    ),
    sil_declaration_date: convertDate(
      api?.sil_declaration_date ?? api?.sil_declarationdate ?? api?.sm_declaration_date
    ),
    sil_remarks: toSafeString(api?.sil_remarks ?? api?.sm_remarks),
    sil_currstat: toSafeString(
      api?.sil_currstat?.st_statcd ?? api?.sil_currstat?.st_code ?? api?.sil_currstat
    ),
    sil_student_signature: toCheckboxString(api?.sil_student_signature),
    sil_acharya_signature: toCheckboxString(api?.sil_acharya_signature),
    sil_aramadhipathi_signature: toCheckboxString(api?.sil_aramadhipathi_signature),
    sil_district_secretary_signature: toCheckboxString(
      api?.sil_district_secretary_signature
    ),
  };

  const display: Partial<Record<keyof SilmathaForm, string>> = {};
  const viharadhipathiDisplay = toSafeString(
    api?.sil_aramadhipathi_display ??
      api?.sil_aramadhipathi_name ??
      api?.sil_aramadhipathi
  );
  if (viharadhipathiDisplay) display.sm_viharadhipathi = viharadhipathiDisplay;

  const tutorDisplay = toSafeString(
    api?.sil_mahanaacharyacd_display ??
      api?.sm_robing_tutor_display ??
      api?.sil_mahanaacharyacd
  );
  if (tutorDisplay) display.sm_robing_tutor = tutorDisplay;

  const tutorResidenceDisplay = toSafeString(
    api?.sil_robing_tutor_residence_display ??
      api?.sm_robing_tutor_residence ??
      api?.sil_robing_tutor_residence
  );
  if (tutorResidenceDisplay)
    display.sm_robing_tutor_residence = tutorResidenceDisplay;

  const robingTempleDisplay = toSafeString(
    api?.sil_mahanatemple_display ?? api?.sm_robing_temple ?? api?.sil_mahanatemple
  );
  if (robingTempleDisplay) display.sm_robing_temple = robingTempleDisplay;

  const postTempleDisplay = toSafeString(
    api?.sil_robing_after_residence_temple_display ??
      api?.sm_post_robing_temple ??
      api?.sil_robing_after_residence_temple
  );
  if (postTempleDisplay) display.sm_post_robing_temple = postTempleDisplay;

  const statusDisplay = toSafeString(
    api?.sil_currstat?.st_descr ?? api?.sil_currstat
  );
  if (statusDisplay) display.sil_currstat = statusDisplay;

  const scannedDocumentPath = toSafeString(
    api?.sil_scanned_document_path ??
      api?.sil_document_path ??
      api?.sil_scanned_document ??
      api?.scanned_document_path
  );

  const regn = toSafeString(
    api?.sil_regn ??
      api?.sil_regn_number ??
      api?.sil_reg_no ??
      api?.sm_form_number ??
      ""
  );

  return { form: patch, display, scannedDocumentPath, regn };
};

export default function ManageSilmathaPage({ params }: PageProps) {
  const editId = params.id;
  const router = useRouter();
  const [values, setValues] = useState<SilmathaForm>({
    ...silmathaInitialValues,
  });
  const [errors, setErrors] = useState<Errors<SilmathaForm>>({});
  const [display, setDisplay] = useState<Partial<Record<keyof SilmathaForm, string>>>({});
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<string>(TAB_ITEMS[0]?.id ?? "1");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [canAdminActions, setCanAdminActions] = useState(false);
  const [accessChecked, setAccessChecked] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [printingMarking, setPrintingMarking] = useState(false);
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const certificatePaperRef = useRef<HTMLDivElement | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [scannedFile, setScannedFile] = useState<File | null>(null);
  const [scanPreviewUrl, setScanPreviewUrl] = useState<string | null>(null);
  const [uploadingScan, setUploadingScan] = useState(false);
  const [scannedDocumentPath, setScannedDocumentPath] = useState<string>("");
  const [recordRegn, setRecordRegn] = useState<string>("");
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const fieldConfigMap = useMemo(() => {
    const map = new Map<keyof SilmathaForm, FieldConfig<SilmathaForm>>();
    silmathaSteps.forEach((step) =>
      step.fields.forEach((field) => map.set(field.name, field))
    );
    return map;
  }, []);

  const recordIdentifier = recordRegn || editId;

  const pdfUrl = useMemo(() => {
    const trimmed = scannedDocumentPath.trim();
    if (trimmed) {
      if (/^https?:\/\//i.test(trimmed)) return trimmed;
      const normalizedPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
      return `${API_BASE_URL}${normalizedPath}`;
    }
    return FALLBACK_PDF_URL;
  }, [scannedDocumentPath]);

  const activeConfig = TAB_ITEMS.find((tab) => tab.id === activeTab);
  const activeStep =
    activeConfig?.type === "form" ? activeConfig.step : silmathaSteps[0];

  useEffect(() => {
    const stored = getStoredUserData();
    if (!stored || stored.department !== SILMATHA_MANAGEMENT_DEPARTMENT) {
      setAccessDenied(true);
      setAccessChecked(true);
      router.replace("/");
      return;
    }
    const isAdmin = stored.roleLevel === ADMIN_ROLE_LEVEL;
    const isDataEntry = stored.roleLevel === DATAENTRY_ROLE_LEVEL;
    setCanAdminActions(isAdmin && !isDataEntry);
    setAccessChecked(true);
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const response: any = await _manageSilmatha({
          action: "READ_ONE",
          payload: { sil_regn: editId },
        } as any);
        const payload = response?.data?.data ?? response?.data ?? response;
        const {
          form,
          display: displayPatch,
          scannedDocumentPath: fetchedScannedPath,
          regn: fetchedRegn,
        } = normalizeSilmathaRecord(payload);
        if (cancelled) return;
        setValues((prev) => ({ ...prev, ...form }));
        setDisplay((prev) => ({ ...prev, ...displayPatch }));
        setScannedDocumentPath(fetchedScannedPath ?? "");
        setRecordRegn(fetchedRegn ?? "");
      } catch (error: any) {
        if (cancelled) return;
        const message = error?.message ?? "Unable to load the record.";
        toast.error(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editId]);

  const scrollTop = () =>
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const handleInputChange = (name: keyof SilmathaForm, value: string) => {
    const nextVal = value;
    setValues((prev) => {
      const next = { ...prev, [name]: nextVal };
      const cfg = fieldConfigMap.get(name);
      if (cfg) {
        const msg = validateField(cfg, nextVal, next, today);
        setErrors((prevErr) => ({ ...prevErr, [name]: msg }));
      }
      return next;
    });
  };

  const handleSetMany = (patch: Partial<SilmathaForm>) => {
    const nextValues = { ...values, ...patch };
    setValues(nextValues);
    setErrors((prev) => {
      const updated = { ...prev };
      Object.keys(patch).forEach((rawKey) => {
        const key = rawKey as keyof SilmathaForm;
        const cfg = fieldConfigMap.get(key);
        if (cfg) {
          const rawValue = nextValues[cfg.name] ?? "";
          updated[cfg.name] = validateField(cfg, rawValue, nextValues, today);
        }
      });
      return updated;
    });
  };

  const validateStep = (stepId: number) => {
    const step = silmathaSteps.find((s) => s.id === stepId);
    if (!step) return true;
    const nextErrors: Errors<SilmathaForm> = { ...errors };
    let valid = true;
    for (const field of step.fields) {
      const raw = values[field.name] ?? "";
      const msg = validateField(field, raw, values, today);
      nextErrors[field.name] = msg;
      if (msg) valid = false;
    }
    setErrors(nextErrors);
    if (!valid) scrollTop();
    return valid;
  };

  const buildPayloadForStep = (step: typeof silmathaSteps[number]) => {
    const payload: Record<string, unknown> = {};
    step.fields.forEach((field) => {
      const apiKey = FIELD_TO_API_MAP[field.name];
      if (!apiKey) return;
      const raw = values[field.name] ?? "";
      if (field.type === "date") {
        payload[apiKey] = toISOFormat(raw);
      } else if (field.type === "checkbox") {
        payload[apiKey] = raw === "true";
      } else {
        payload[apiKey] = raw;
      }
    });
    return payload;
  };

  const handleSaveStep = async (step: typeof silmathaSteps[number]) => {
    if (!validateStep(step.id)) return;
    try {
      setSubmitting(true);
      await _manageSilmatha({
        action: "UPDATE",
        payload: { sil_regn: editId, data: buildPayloadForStep(step) },
      } as any);
      toast.success(`"${step.title}" updated.`, { autoClose: 1200 });
    } catch (error: any) {
      const message = error?.message ?? "Failed to save. Please try again.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenPrintDialog = async () => {
    if (!recordIdentifier) {
      toast.error("Missing record id.");
      return;
    }
    try {
      setPrintingMarking(true);
      await _markPrintedSilmatha(recordIdentifier);
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
    if (!recordIdentifier) {
      toast.error("Missing record id.");
      return;
    }
    if (!scannedFile) {
      toast.error("Please choose a file to upload.");
      return;
    }
    try {
      setUploadingScan(true);
      const response = await _uploadScannedDocument(recordIdentifier, scannedFile);
      toast.success("Scanned file uploaded.", { autoClose: 1200 });
      const updatedPath = toSafeString(
        (response as any)?.data?.scanned_document_path ??
          (response as any)?.data?.data?.sil_scanned_document_path ??
          (response as any)?.data?.data?.scanned_document_path ??
          (response as any)?.data?.sil_scanned_document_path ??
          ""
      );
      if (updatedPath) setScannedDocumentPath(updatedPath);
      setScannedFile(null);
      if (scanPreviewUrl) {
        URL.revokeObjectURL(scanPreviewUrl);
        setScanPreviewUrl(null);
      }
      setShowUploadModal(false);
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

  const handleApprove = async () => {
    if (!recordIdentifier) {
      toast.error("Missing record id.");
      return;
    }
    try {
      setApproving(true);
      setApproveDialogOpen(false);
      const response = await _approveSilmatha(recordIdentifier);
      const payload = (response as any)?.data ?? response;
      const success = (payload as any)?.success ?? true;
      if (!success) {
        const { messages, fallback } = collectApprovalErrors(payload);
        toast.error(messages.join("\n") || fallback);
        return;
      }
      toast.success("Approved successfully.", { autoClose: 1200 });
    } catch (error: unknown) {
      const data = (error as any)?.response?.data ?? (error as any)?.data;
      const { messages, fallback } = collectApprovalErrors(data);
      const errMsg =
        messages.join("\n") ||
        fallback ||
        (error instanceof Error ? error.message : "Failed to approve. Please try again.");
      toast.error(errMsg);
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!recordIdentifier) {
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
      const response = await _rejectSilmatha({
        action: "REJECT",
        sil_regn: recordIdentifier,
        rejection_reason: reason,
      });
      const payload = (response as any)?.data ?? response;
      const success = (payload as any)?.success ?? true;
      if (!success) {
        const { messages, fallback } = collectApprovalErrors(payload);
        toast.error(messages.join("\n") || fallback);
        return;
      }
      toast.success("Rejected successfully.", { autoClose: 1200 });
      setRejectionReason("");
    } catch (error: unknown) {
      const data = (error as any)?.response?.data ?? (error as any)?.data;
      const { messages, fallback } = collectApprovalErrors(data);
      const errMsg =
        messages.join("\n") ||
        fallback ||
        (error instanceof Error ? error.message : "Failed to reject. Please try again.");
      toast.error(errMsg);
    } finally {
      setRejecting(false);
    }
  };

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
      "Failed to complete the action. Please try again.";
    return { messages, fallback };
  };

  const renderStepFields = (step: typeof silmathaSteps[number]) => {
    const isBirthLocationStep = step.title === "Birth Location";
    const selection: LocationSelection = {
      provinceCode: values.sm_province || undefined,
      districtCode: values.sm_district || undefined,
      divisionCode: values.sm_divisional_secretariat || undefined,
      gnCode: values.sm_gn_division || undefined,
    };
    let signatureRendered = false;
    const anyLocationError = LOCATION_FIELDS.map((key) => errors[key]).find(Boolean);

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {step.fields.map((field) => {
          if (SIGNATURE_FIELDS.includes(field.name)) {
            if (signatureRendered) return null;
            signatureRendered = true;
            return (
              <div
                key="signatures"
                className="space-y-3 border border-slate-200 rounded-lg p-4 bg-slate-50"
              >
                {SIGNATURE_FIELDS.map((name) => {
                  const sigLabel = fieldConfigMap.get(name)?.label ?? String(name);
                  const fieldError = errors[name];
                  const checked = values[name] === "true";
                  return (
                    <div key={name} className="flex items-center gap-2">
                      <input
                        id={String(name)}
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => {
                          handleInputChange(name, event.target.checked ? "true" : "false");
                          setDisplay((prev) => ({
                            ...prev,
                            [name]: event.target.checked ? "Yes" : "No",
                          }));
                        }}
                        className="h-4 w-4 text-slate-700 border-slate-300 rounded focus:ring-2 focus:ring-slate-500"
                      />
                      <label htmlFor={String(name)} className="text-sm font-medium text-slate-700">
                        {sigLabel}
                      </label>
                      {fieldError ? (
                        <p className="text-sm text-red-600">{fieldError}</p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            );
          }

          if (LOCATION_FIELDS.includes(field.name)) {
            if (field.name === "sm_province") {
              return (
                <div key={field.name} className={isBirthLocationStep ? "md:col-span-2" : ""}>
                  <LocationPicker
                    value={selection}
                    onChange={(sel) => {
                      handleSetMany({
                        sm_province: sel.provinceCode ?? "",
                        sm_district: sel.districtCode ?? "",
                        sm_divisional_secretariat: sel.divisionCode ?? "",
                        sm_gn_division: sel.gnCode ?? "",
                      });
                    }}
                    required={!!field.rules?.required}
                    requiredFields={{ province: true, district: true, division: false, gn: false }}
                  />
                  {anyLocationError ? (
                    <p className="mt-1 text-sm text-red-600">{anyLocationError}</p>
                  ) : null}
                </div>
              );
            }
            return null;
          }

          const id = String(field.name);
          const value = values[field.name] ?? "";
          const error = errors[field.name];

          if (field.name === "sm_viharadhipathi") {
            return (
              <div key={id}>
                <SilmathaAutocomplete
                  id={id}
                  label={field.label}
                  required={!!field.rules?.required}
                  initialDisplay={display.sm_viharadhipathi ?? ""}
                  onPick={({ regn, display: disp }) => {
                    handleInputChange("sm_viharadhipathi", regn ?? "");
                    setDisplay((prev) => ({ ...prev, sm_viharadhipathi: disp }));
                  }}
                />
                {error ? <p className="mt-1 text-sm text-red-600">{error}</p> : null}
              </div>
            );
          }

          if (field.name === "sm_robing_tutor") {
            return (
              <div key={id}>
                <SilmathaAutocomplete
                  id={id}
                  label={field.label}
                  required={!!field.rules?.required}
                  initialDisplay={display.sm_robing_tutor ?? ""}
                  onPick={({ regn, display: disp }) => {
                    handleInputChange("sm_robing_tutor", regn ?? "");
                    setDisplay((prev) => ({ ...prev, sm_robing_tutor: disp }));
                  }}
                />
                {error ? <p className="mt-1 text-sm text-red-600">{error}</p> : null}
              </div>
            );
          }

          if (
            field.name === "sm_robing_tutor_residence" ||
            field.name === "sm_robing_temple" ||
            field.name === "sm_post_robing_temple"
          ) {
            return (
              <div key={id}>
                <TempleAutocomplete
                  id={id}
                  label={field.label}
                  required={!!field.rules?.required}
                  initialDisplay={display[field.name] ?? ""}
                  onPick={({ trn, display: disp }) => {
                    handleInputChange(field.name, trn ?? "");
                    setDisplay((prev) => ({ ...prev, [field.name]: disp }));
                  }}
                />
                {error ? <p className="mt-1 text-sm text-red-600">{error}</p> : null}
              </div>
            );
          }

          if (field.name === "sil_currstat") {
            return (
              <div key={id}>
                <BhikkhuStatusSelect
                  id={id}
                  label={field.label}
                  required={!!field.rules?.required}
                  value={values.sil_currstat ?? ""}
                  onPick={({ code, display: disp }) => {
                    handleInputChange("sil_currstat", code ?? "");
                    setDisplay((prev) => ({ ...prev, sil_currstat: disp }));
                  }}
                />
                {error ? <p className="mt-1 text-sm text-red-600">{error}</p> : null}
              </div>
            );
          }

          if (field.type === "checkbox") {
            const checked = values[field.name] === "true";
            return (
              <div key={id} className="flex flex-col">
                <div className="flex items-center gap-2">
                  <input
                    id={id}
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => {
                      handleInputChange(field.name, event.target.checked ? "true" : "false");
                      setDisplay((prev) => ({
                        ...prev,
                        [field.name]: event.target.checked ? "Yes" : "No",
                      }));
                    }}
                    className="h-4 w-4 text-slate-700 border-slate-300 rounded focus:ring-2 focus:ring-slate-500"
                  />
                  <label htmlFor={id} className="text-sm font-medium text-slate-700">
                    {field.label}
                  </label>
                </div>
                {error ? <p className="mt-1 text-sm text-red-600">{error}</p> : null}
              </div>
            );
          }

          if (field.type === "date") {
            return (
              <DateField
                key={id}
                id={id}
                label={field.label}
                value={value}
                required={!!field.rules?.required}
                placeholder="YYYY-MM-DD"
                error={error}
                onChange={(next) => handleInputChange(field.name, next)}
              />
            );
          }

          return (
            <div key={id} className="grid grid-cols-1">
              <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-2">
                {field.label}
              </label>
              <input
                id={id}
                type={field.type}
                value={value}
                onChange={(event) => handleInputChange(field.name, event.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                placeholder={field.placeholder}
              />
              {error ? <p className="mt-1 text-sm text-red-600">{error}</p> : null}
            </div>
          );
        })}
      </div>
    );
  };

  if (accessDenied) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm font-medium text-red-600">
          You do not have access to this section.
        </p>
      </div>
    );
  }

  if (!accessChecked) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">Checking access...</p>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gray-50">
      <TopBar onMenuClick={() => setSidebarOpen((prev) => !prev)} />
      <Sidebar isOpen={sidebarOpen} />
      <div className={`transition-all duration-300 pt-16 ${sidebarOpen ? "ml-64" : "ml-0"}`}>
        <main className="p-2 mb-20">
          <div className="w-full">
            <div className="bg-white shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-6 md:px-10 py-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-white mb-1">Update Silmatha Record</h1>
                    <p className="text-slate-300 text-sm">
                      Navigate the sections below to keep the information up to date.
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2 text-sm text-slate-200">
                    <div>
                      Record: <span className="font-semibold">{editId}</span>
                    </div>
                    {canAdminActions && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleOpenRejectDialog}
                          disabled={loading || submitting || rejecting}
                          className={`px-4 py-2 rounded-lg font-medium transition-all ${
                            loading || submitting || rejecting
                              ? "bg-red-700/60 text-white cursor-not-allowed"
                              : "bg-red-600 text-white hover:bg-red-700"
                          }`}
                        >
                          {rejecting ? "Rejecting..." : "Reject"}
                        </button>
                        <button
                          onClick={handleOpenApproveDialog}
                          disabled={loading || submitting || approving}
                          className={`px-4 py-2 rounded-lg font-medium transition-all ${
                            loading || submitting || approving
                              ? "bg-green-700/60 text-white cursor-not-allowed"
                              : "bg-green-600 text-white hover:bg-green-700"
                          }`}
                        >
                          {approving ? "Approving..." : "Approve"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-4 md:px-10 py-6" ref={sectionRef}>
                <Tabs
                  tabs={TAB_ITEMS}
                  value={activeTab}
                  onChange={(id) => setActiveTab(id)}
                  className="w-full"
                  contentClassName="pt-6"
                  renderContent={() => {
                    if (!activeConfig) return null;
                    if (activeConfig.type === "form") {
                      return (
                        <form
                          className="space-y-8"
                          onSubmit={(event) => {
                            event.preventDefault();
                            handleSaveStep(activeStep);
                          }}
                        >
                          <div>
                            <h2 className="text-xl font-bold text-slate-800">{activeStep.title}</h2>
                            <p className="text-sm text-slate-500 mt-1">
                              {activeStep.title} details can be reviewed and updated here.
                            </p>
                          </div>

                          <div className="min-h-[360px]">
                            {loading ? (
                              <div className="flex items-center justify-center h-40 text-slate-500">
                                Loading record...
                              </div>
                            ) : (
                              renderStepFields(activeStep)
                            )}
                          </div>

                          <div className="flex justify-end border-t border-slate-100 pt-4">
                            <button
                              type="submit"
                              disabled={loading || submitting}
                              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-all disabled:opacity-70"
                            >
                              {submitting ? "Saving..." : `Save ${activeStep.title}`}
                            </button>
                          </div>
                        </form>
                      );
                    }

                    if (activeConfig.type === "cert") {
                      const certificateIdentifier = recordRegn || values.sm_form_number || editId;
                      const certificateUrl = certificateIdentifier
                        ? `${SILMATHA_CERTIFICATE_URL_BASE}/${encodeURIComponent(certificateIdentifier)}`
                        : "";
                      const certificateLabel = certificateIdentifier || "Pending assignment";
                      const certificateUrlLabel = certificateUrl || "Not assigned yet";
                      const qrValue =
                        recordRegn
                          ? `${SILMATHA_CERTIFICATE_URL_BASE}/${encodeURIComponent(recordRegn)}`
                          : certificateUrl || `${SILMATHA_CERTIFICATE_URL_BASE}/sample`;
                      return (
                        <div className="space-y-6">
                          <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white/80 p-6 shadow">
                            <div className="flex flex-col gap-2 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
                              <div>
                                <p className="text-xs uppercase tracking-[0.5em] text-slate-400">
                                  Certificate number
                                </p>
                                <p className="text-2xl font-semibold text-slate-900">
                                  {certificateLabel}
                                </p>
                                <p className="break-all text-slate-500">
                                  {certificateUrlLabel}
                                </p>
                              </div>
                      <button
                        onClick={handleOpenPrintDialog}
                        disabled={printingMarking || !certificateIdentifier}
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
                                    value={qrValue}
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

                    if (activeConfig.type === "upload") {
                      return (
                        <div className="space-y-6">
                          <div>
                            <h2 className="text-xl font-bold text-slate-800">Reference PDF</h2>
                            <p className="text-sm text-slate-500 mt-1">
                              View the Buddhist Temporalities Consolidated 2024 document that accompanies Silmatha registrations.
                            </p>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
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
                  Attach the scanned image or PDF after printing the QR.
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
          <MuiButton
            onClick={handleApprove}
            disabled={approving}
            color="primary"
            variant="contained"
          >
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
          <MuiButton
            onClick={handleReject}
            disabled={rejecting}
            color="error"
            variant="contained"
          >
            {rejecting ? "Rejecting..." : "Reject"}
          </MuiButton>
        </DialogActions>
      </Dialog>
      <ToastContainer position="top-right" newestOnTop closeOnClick pauseOnHover />
    </div>
  );
}
