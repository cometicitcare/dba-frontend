"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { FooterBar } from "@/components/FooterBar";
import {
  BhikkhuAutocomplete,
  BhikkhuStatusSelect,
  DateField,
  LocationPicker,
  LocationSelection,
  TempleAutocomplete,
  toYYYYMMDD,
} from "@/components/Bhikku/Add";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  _uploadDirectScannedHighDocument,
  _manageDirectHighBhikku,
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
import { getStoredUserData } from "@/utils/userData";
import selectionsData from "@/utils/selectionsData.json";

import { BHIKKU_MANAGEMENT_DEPARTMENT, ADMIN_ROLE_LEVEL } from "@/utils/config"

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

type DirectBhikkhuForm = {
  requestDate: string;
  dateOfBirth: string;
  fullName: string;
  formNumber: string;
  fatherName: string;
  birthPlace: string;
  province: string;
  district: string;
  divisionalSecretariat: string;
  gnDivision: string;
  korale: string;
  pattu: string;
  village: string;
  nikaya: string;
  parshawa: string;
  mahanayakaName: string;
  mahanayakaAddress: string;
  robingDate: string;
  samaneraName: string;
  robingTutorName: string;
  robingTutorResidence: string;
  robingTemple: string;
};

const STATIC_NIKAYA_DATA = Array.isArray((selectionsData as any)?.nikayas)
  ? ((selectionsData as any).nikayas as Array<{
      nikaya: { code: string; name: string };
      parshawayas: Array<{ code: string; name: string }>;
      main_bhikku: { mahananame?: string; address?: string } | null;
    }>)
  : [];

const INITIAL_DIRECT_BHIKKHU_FORM: DirectBhikkhuForm = {
  requestDate: "",
  dateOfBirth: "",
  fullName: "",
  formNumber: "",
  fatherName: "",
  birthPlace: "",
  province: "",
  district: "",
  divisionalSecretariat: "",
  gnDivision: "",
  korale: "",
  pattu: "",
  village: "",
  nikaya: "",
  parshawa: "",
  mahanayakaName: "",
  mahanayakaAddress: "",
  robingDate: "",
  samaneraName: "",
  robingTutorName: "",
  robingTutorResidence: "",
  robingTemple: "",
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

type StepFieldKey = keyof DirectBhikkhuForm | keyof UpasampadaForm;

const FORM_STEPS = [
  {
    id: 1,
    title: "Personal Information",
    description: "",
  },
  {
    id: 2,
    title: "Birth Location",
    description: "",
  },
  {
    id: 3,
    title: "Temple Information",
    description: "",
  },
  {
    id: 4,
    title: "Robing Informations",
    description: "",
  },
  {
    id: 5,
    title: "Higher Ordination",
    description: "",
  },
  {
    id: 6,
    title: "Declaration & Status",
    description: "",
  },

];

const DIRECT_REQUIRED_FIELDS: Record<number, Array<keyof DirectBhikkhuForm>> = {
  1: ["requestDate", "dateOfBirth", "fullName", "formNumber", "fatherName"],
  2: ["birthPlace", "province", "district", "divisionalSecretariat", "gnDivision"],
  3: ["nikaya", "parshawa", "mahanayakaName", "mahanayakaAddress"],
  4: ["robingDate", "robingTutorName", "robingTutorResidence", "robingTemple"],
};

const UPAS_REQUIRED_FIELDS: Record<number, Array<keyof UpasampadaForm>> = {
  5: [
    "assumedName",
    "higherOrdinationResidenceTrn",
    "permanentResidenceTrn",
    "declarationResidenceAddress",
    "presidingBhikshuRegNo",
    "higherOrdinationPlace",
    "higherOrdinationDate",
    "karmacharyaName",
    "upaddhyayaName",
  ],
  6: ["currentStatus", "declarationDate"],
};

const CERTIFICATE_URL_BASE = "https://hrms.dbagovlk.com/bhikkhu/certificate";
const API_BASE_URL = "https://api.dbagovlk.com";
const buildScannedDocumentUrl = (path?: string) => {
  if (!path) return "";
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalized}`;
};


type PageProps = { params: { id: string } };

export default function ManageUpasampadaPage({ params }: PageProps) {
  const editId = params.id;
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<string>(String(FORM_STEPS[0].id));
  const [form, setForm] = useState<UpasampadaForm>(INITIAL_FORM);
  const [bhikkhuDetails, setBhikkhuDetails] = useState<DirectBhikkhuForm>(INITIAL_DIRECT_BHIKKHU_FORM);
  const [display, setDisplay] = useState<{
    robingTutor?: string;
    robingTutorResidence?: string;
    robingTemple?: string;
  }>({});
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
  const [serverScannedDocumentPath, setServerScannedDocumentPath] =
    useState<string>("");
  const [accessChecked, setAccessChecked] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [canAdminActions, setCanAdminActions] = useState(false);

  const findNikayaByCode = useCallback(
    (code?: string | null) => STATIC_NIKAYA_DATA.find((n) => n.nikaya.code === (code ?? "")),
    []
  );
  const parshawaOptions = useMemo(
    () => findNikayaByCode(bhikkhuDetails.nikaya)?.parshawayas ?? [],
    [bhikkhuDetails.nikaya, findNikayaByCode]
  );

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
  const stepRequirements = useMemo<StepFieldKey[]>(() => {
    if (!activeFormStep) return [];
    if (activeFormStep.id <= 4) {
      return DIRECT_REQUIRED_FIELDS[activeFormStep.id] ?? [];
    }
    return UPAS_REQUIRED_FIELDS[activeFormStep.id] ?? [];
  }, [activeFormStep]);
  const stepIsValid = useMemo(() => {
    if (!activeFormStep) return true;
    if (loading) return false;
    return stepRequirements.every((field) => {
      if (activeFormStep.id <= 4) {
        const directField = field as keyof DirectBhikkhuForm;
        return ((bhikkhuDetails[directField] ?? "").trim().length > 0);
      }
      const upasField = field as keyof UpasampadaForm;
      const value = form[upasField];
      return typeof value === "string" ? value.trim().length > 0 : Boolean(value);
    });
  }, [form, stepRequirements, loading, activeFormStep, bhikkhuDetails]);
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
    const trimmed =
      scannedDocumentPath.trim() || serverScannedDocumentPath.trim();
    if (!trimmed) return "";
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return buildScannedDocumentUrl(trimmed);
  }, [scannedDocumentPath, serverScannedDocumentPath]);

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
    const stored = getStoredUserData();
    if (!stored || stored.department !== BHIKKU_MANAGEMENT_DEPARTMENT) {
      setAccessDenied(true);
      router.replace("/");
      setAccessChecked(true);
      return;
    }
    setCanAdminActions(stored.roleLevel === ADMIN_ROLE_LEVEL);
    setAccessChecked(true);
  }, [router]);

  const valueOrCode = (field: any, codeKey: string) => {
    if (!field) return "";
    if (typeof field === "string") return field;
    return field[codeKey] ?? "";
  };

  const formatTempleDisplay = (temple: any) => {
    if (!temple) return "";
    const trn = temple?.vh_trn ?? temple;
    const name = temple?.vh_vname ?? temple?.vh_vname;
    return trn ? (name ? `${name} - ${trn}` : trn) : name ?? "";
  };

  const formatBhikkhuDisplay = (bhikkhu: any) => {
    if (!bhikkhu) return "";
    const regn = bhikkhu?.br_regn ?? bhikkhu;
    const name = bhikkhu?.br_mahananame ?? bhikkhu?.br_gihiname ?? "";
    return regn ? (name ? `${name} - ${regn}` : regn) : name;
  };

  const mapDirectRecord = (data: any): Partial<DirectBhikkhuForm> => ({
    requestDate: data?.dbh_reqstdate ?? "",
    dateOfBirth: data?.dbh_dofb ?? "",
    fullName: data?.dbh_gihiname ?? "",
    formNumber: data?.dbh_form_id ?? "",
    fatherName: data?.dbh_fathrname ?? "",
    birthPlace: data?.dbh_birthpls ?? "",
    province: valueOrCode(data?.dbh_province, "cp_code"),
    district: valueOrCode(data?.dbh_district, "dd_dcode"),
    divisionalSecretariat: valueOrCode(data?.dbh_division, "dv_dvcode"),
    gnDivision: valueOrCode(data?.dbh_gndiv, "gn_gnc"),
    korale: data?.dbh_korale ?? "",
    pattu: data?.dbh_pattu ?? "",
    village: data?.dbh_vilage ?? "",
    nikaya: valueOrCode(data?.dbh_nikaya, "code"),
    parshawa: valueOrCode(data?.dbh_parshawaya, "code"),
    mahanayakaName: data?.dbh_mahanayaka_name ?? "",
    mahanayakaAddress: data?.dbh_mahanayaka_address ?? "",
    robingDate: data?.dbh_mahanadate ?? "",
    samaneraName: data?.dbh_mahananame ?? "",
    robingTutorName: valueOrCode(data?.dbh_mahanaacharyacd, "br_regn"),
    robingTutorResidence: valueOrCode(data?.dbh_robing_tutor_residence, "vh_trn"),
    robingTemple: valueOrCode(data?.dbh_mahanatemple, "vh_trn"),
  });

  const safeString = (value: unknown) => (value == null ? "" : String(value));
  const templeTrnValue = (value: any) => safeString(value?.vh_trn ?? value);
  const bhikkhuRegnValue = (value: any) => safeString(value?.br_regn ?? value?.regn ?? value);

  const mapUpasampadaRecord = (data: any): Partial<UpasampadaForm> => ({
    assumedName: safeString(data?.dbh_name_assumed_at_higher_ordination),
    higherOrdinationResidenceTrn: templeTrnValue(data?.dbh_residence_higher_ordination_trn),
    higherOrdinationResidenceDisplay: formatTempleDisplay(data?.dbh_residence_higher_ordination_trn),
    permanentResidenceTrn: templeTrnValue(data?.dbh_residence_permanent_trn),
    permanentResidenceDisplay: formatTempleDisplay(data?.dbh_residence_permanent_trn),
    declarationResidenceAddress: safeString(
      data?.dbh_residence_at_time_of_declaration_and_full_postal_address ?? data?.dbh_residence_at_declaration
    ),
    tutorsTutorRegNo: bhikkhuRegnValue(data?.dbh_tutors_tutor_regn),
    tutorsTutorDisplay: formatBhikkhuDisplay(data?.dbh_tutors_tutor_regn ?? data?.dbh_tutors_tutor),
    presidingBhikshuRegNo: bhikkhuRegnValue(
      data?.dbh_presiding_bhikshu_regn ?? data?.dbh_name_of_bhikshu_presiding_at_higher_ordination
    ),
    presidingBhikshuDisplay: formatBhikkhuDisplay(
      data?.dbh_presiding_bhikshu_regn ?? data?.dbh_name_of_bhikshu_presiding_at_higher_ordination
    ),
    samaneraSerial: safeString(data?.dbh_samanera_serial_no),
    higherOrdinationPlace: safeString(data?.dbh_higher_ordination_place),
    higherOrdinationDate: toYYYYMMDD(safeString(data?.dbh_higher_ordination_date)),
    karmacharyaName: safeString(data?.dbh_higher_ordination_karmaacharya),
    upaddhyayaName: safeString(data?.dbh_higher_ordination_upaadhyaaya),
    currentStatus:
      valueOrCode(data?.dbh_currstat, "st_statcd") || safeString(data?.dbh_currstat),
    declarationDate: toYYYYMMDD(
      safeString(data?.dbh_declaration_date ?? data?.dbh_u_date_declaration)
    ),
    remarks: safeString(data?.dbh_remarks_upasampada ?? data?.dbh_remarks),
  });
  useEffect(() => {
    if (!editId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await _manageDirectHighBhikku({
          action: "READ_ONE",
          payload: { dbh_id: editId },
        } as any);
        const payload = (res as any)?.data?.data ?? (res as any)?.data ?? res;
        if (cancelled) return;
        setBhikkhuDetails((prev) => ({ ...prev, ...mapDirectRecord(payload) }));
        setForm((prev) => ({ ...prev, ...mapUpasampadaRecord(payload) }));
        setDisplay((prev) => ({
          ...prev,
          robingTutor: formatBhikkhuDisplay(payload?.dbh_mahanaacharyacd) || prev.robingTutor,
          robingTutorResidence: formatTempleDisplay(payload?.dbh_robing_tutor_residence) || prev.robingTutorResidence,
          robingTemple: formatTempleDisplay(payload?.dbh_mahanatemple) || prev.robingTemple,
        }));
        const directId = payload?.dbh_id ? Number(payload.dbh_id) : null;
        setRecordId(directId);
        setCertificateRegn(payload?.dbh_regn ?? "");
        const docPath = payload?.dbh_scanned_document_path ?? "";
        setServerScannedDocumentPath(docPath);
        setScannedDocumentPath(docPath);
      } catch (error: any) {
        if (cancelled) return;
        const message = error?.message ?? "Failed to load direct Bhikkhu data.";
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

  const formatDateField = (value?: string) => toYYYYMMDD(value);

  const updateBhikkhuField = (field: keyof DirectBhikkhuForm, value: string) => {
    setBhikkhuDetails((prev) => ({ ...prev, [field]: value }));
  };

  const handleLocationChange = (selection: LocationSelection) => {
    updateBhikkhuField("province", selection.provinceCode ?? "");
    updateBhikkhuField("district", selection.districtCode ?? "");
    updateBhikkhuField("divisionalSecretariat", selection.divisionCode ?? "");
    updateBhikkhuField("gnDivision", selection.gnCode ?? "");
  };

  const clearTutorAndResidence = () => {
    updateBhikkhuField("robingTutorName", "");
    updateBhikkhuField("robingTutorResidence", "");
    setDisplay((prev) => ({
      ...prev,
      robingTutor: "",
      robingTutorResidence: "",
    }));
  };

  const handleNikayaChange = (code: string) => {
    setBhikkhuDetails((prev) => {
      const item = findNikayaByCode(code);
      return {
        ...prev,
        nikaya: code,
        parshawa: "",
        mahanayakaName: item?.main_bhikku?.mahananame ?? prev.mahanayakaName,
        mahanayakaAddress: item?.main_bhikku?.address ?? prev.mahanayakaAddress,
      };
    });
  };

  const handleParshawaChange = (code: string) => {
    setBhikkhuDetails((prev) => ({ ...prev, parshawa: code }));
  };

  const handleUpdateTab = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!stepIsValid || submitting || !activeFormStep) return;
    setSubmitting(true);

    const resolvedId = recordId ?? (Number(editId) || undefined);
    const resolvedRegn = certificateRegn || editId || "";

    const directPayload = {
      dbh_reqstdate: formatDateField(bhikkhuDetails.requestDate),
      dbh_dofb: formatDateField(bhikkhuDetails.dateOfBirth),
      dbh_gihiname: bhikkhuDetails.fullName,
      dbh_form_id: bhikkhuDetails.formNumber,
      dbh_fathrname: bhikkhuDetails.fatherName,
      dbh_birthpls: bhikkhuDetails.birthPlace,
      dbh_province: bhikkhuDetails.province,
      dbh_district: bhikkhuDetails.district,
      dbh_division: bhikkhuDetails.divisionalSecretariat,
      dbh_gndiv: bhikkhuDetails.gnDivision,
      dbh_korale: bhikkhuDetails.korale,
      dbh_pattu: bhikkhuDetails.pattu,
      dbh_vilage: bhikkhuDetails.village,
      dbh_nikaya: bhikkhuDetails.nikaya,
      dbh_parshawaya: bhikkhuDetails.parshawa,
      dbh_mahanayaka_name: bhikkhuDetails.mahanayakaName,
      dbh_mahanayaka_address: bhikkhuDetails.mahanayakaAddress,
      dbh_mahanadate: formatDateField(bhikkhuDetails.robingDate),
      dbh_mahananame: bhikkhuDetails.samaneraName,
      dbh_mahanaacharyacd: bhikkhuDetails.robingTutorName,
      dbh_robing_tutor_residence: bhikkhuDetails.robingTutorResidence,
      dbh_mahanatemple: bhikkhuDetails.robingTemple,
    };

    const buildHigherPayload = () => ({
      dbh_higher_ordination_place: form.higherOrdinationPlace,
      dbh_higher_ordination_date: toYYYYMMDD(form.higherOrdinationDate),
      dbh_higher_ordination_karmaacharya: form.karmacharyaName,
      dbh_higher_ordination_upaadhyaaya: form.upaddhyayaName,
      dbh_name_assumed_at_higher_ordination: form.assumedName,
      dbh_residence_at_time_of_higher_ordination: form.higherOrdinationResidenceTrn,
      dbh_permanent_residence: form.permanentResidenceTrn,
      dbh_residence_at_time_of_declaration_and_full_postal_address: form.declarationResidenceAddress,
      dbh_tutors_tutor_regn: form.tutorsTutorRegNo,
      dbh_name_of_bhikshu_presiding_at_higher_ordination: form.presidingBhikshuRegNo,
    });

    const buildDeclarationPayload = () => ({
      dbh_currstat: form.currentStatus,
      dbh_declaration_date: toYYYYMMDD(form.declarationDate),
      dbh_u_date_declaration: toYYYYMMDD(form.declarationDate),
      dbh_remarks_upasampada: form.remarks,
    });

    const updateDirectRecord = async (payload: Record<string, string>) =>
      _manageDirectHighBhikku({
        action: "UPDATE",
        payload: {
          dbh_id: resolvedId,
          dbh_regn: resolvedRegn || undefined,
          data: payload,
        },
      } as any);

    try {
      if (activeFormStep.id <= 4) {
        await updateDirectRecord(directPayload);
      } else if (activeFormStep.id === 5) {
        await updateDirectRecord({ ...directPayload, ...buildHigherPayload() });
      } else {
        await updateDirectRecord({
          ...directPayload,
          ...buildHigherPayload(),
          ...buildDeclarationPayload(),
        });
      }

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
      const res = await _manageDirectHighBhikku({
        action: "APPROVE",
        payload: { dbh_id: id },
      } as any);
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
      const res = await _manageDirectHighBhikku({
        action: "REJECT",
        payload: {
          dbh_id: id,
          rejection_reason: reason,
        },
      } as any);
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
      await _manageDirectHighBhikku({
        action: "MARK_PRINTED",
        payload: {
          dbh_id: id,
        },
      });
      toast.success("Marked certificate as printed.", { autoClose: 1200 });
      setShowUploadModal(true);
      window.print();
    } catch (error: any) {
      const message = error?.message ?? "Failed to mark as printed.";
      toast.error(message);
    } finally {
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
    const directId = resolveRecordId();
    if (directId == null) {
      toast.error("Missing Bhikkhu record ID.");
      return;
    }
    if (!scannedFile) {
      toast.error("Please choose a file to upload.");
      return;
    }
    try {
      setUploadingScan(true);
      await _uploadDirectScannedHighDocument(directId, scannedFile);
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

  const renderPersonalInformation = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <DateField
        id="request-date"
        label="Request Date"
        value={bhikkhuDetails.requestDate}
        onChange={(value) => updateBhikkhuField("requestDate", value)}
        required
      />
      <DateField
        id="dob"
        label="Date of Birth"
        value={bhikkhuDetails.dateOfBirth}
        onChange={(value) => updateBhikkhuField("dateOfBirth", value)}
        required
      />
      <TextField
        id="full-name"
        label="Full Name (Gihi Name)"
        value={bhikkhuDetails.fullName}
        onChange={(value) => updateBhikkhuField("fullName", value)}
        required
      />
      <TextField
        id="form-number"
        label="Form number"
        value={bhikkhuDetails.formNumber}
        onChange={(value) => updateBhikkhuField("formNumber", value)}
        required
      />
      <TextField
        id="father-name"
        label="Father's Name"
        value={bhikkhuDetails.fatherName}
        onChange={(value) => updateBhikkhuField("fatherName", value)}
        required
      />
    </div>
  );

  const renderBirthLocation = () => (
    <div className="space-y-6">
      <TextField
        id="birth-place"
        label="Birth Place"
        value={bhikkhuDetails.birthPlace}
        onChange={(value) => updateBhikkhuField("birthPlace", value)}
        required
      />
      <LocationPicker
        value={{
          provinceCode: bhikkhuDetails.province || undefined,
          districtCode: bhikkhuDetails.district || undefined,
          divisionCode: bhikkhuDetails.divisionalSecretariat || undefined,
          gnCode: bhikkhuDetails.gnDivision || undefined,
        }}
        onChange={handleLocationChange}
        required
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TextField
          id="korale"
          label="Korale"
          value={bhikkhuDetails.korale}
          onChange={(value) => updateBhikkhuField("korale", value)}
        />
        <TextField
          id="pattu"
          label="Pattu"
          value={bhikkhuDetails.pattu}
          onChange={(value) => updateBhikkhuField("pattu", value)}
        />
        <TextField
          id="village"
          label="Village"
          value={bhikkhuDetails.village}
          onChange={(value) => updateBhikkhuField("village", value)}
        />
      </div>
    </div>
  );

  const renderTempleInformation = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block mb-1 text-sm font-medium text-slate-700">
            Name of Nikaya
          </label>
          <select
            className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm"
            value={bhikkhuDetails.nikaya}
            onChange={(event) => handleNikayaChange(event.target.value)}
            required
          >
            <option value="">Select Nikaya</option>
            {STATIC_NIKAYA_DATA.map((item) => (
              <option key={item.nikaya.code} value={item.nikaya.code}>
                {item.nikaya.name} - {item.nikaya.code}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block mb-1 text-sm font-medium text-slate-700">
            Name of Chapter
          </label>
          <select
            className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm"
            value={bhikkhuDetails.parshawa}
            onChange={(event) => handleParshawaChange(event.target.value)}
            disabled={!bhikkhuDetails.nikaya}
            required
          >
            <option value="">
              {bhikkhuDetails.nikaya ? "Select Chapter" : "Select Nikaya first"}
            </option>
            {parshawaOptions.map((option) => (
              <option key={option.code} value={option.code}>
                {option.name} - {option.code}
              </option>
            ))}
          </select>
        </div>
      </div>
      <TextField
        id="mahanayaka-name"
        label="Name of Mahanayaka Thera or Nayaka Thero of the Nikaya"
        value={bhikkhuDetails.mahanayakaName}
        onChange={(value) => updateBhikkhuField("mahanayakaName", value)}
        required
      />
      <TextField
        id="mahanayaka-address"
        label="Full postal address of the Mahanayaka Thera or Nayaka Theri of the Nikaya"
        value={bhikkhuDetails.mahanayakaAddress}
        onChange={(value) => updateBhikkhuField("mahanayakaAddress", value)}
        required
        rows={4}
      />
    </div>
  );

  const renderRobingInformation = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DateField
          id="robing-date"
          label="Date of robing"
          value={bhikkhuDetails.robingDate}
          onChange={(value) => updateBhikkhuField("robingDate", value)}
          required
        />
        <TextField
          id="samanera-name"
          label="Samanera Name (optional)"
          value={bhikkhuDetails.samaneraName}
          onChange={(value) => updateBhikkhuField("samaneraName", value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <BhikkhuAutocomplete
            id="robing-tutor"
            label="Name of robing tutor"
            required
            storeRegn
            placeholder="Search and pick, auto-fill REGN"
            initialDisplay={display.robingTutor ?? ""}
            onInputChange={(value) => {
              if (!value.trim()) {
                clearTutorAndResidence();
              }
            }}
            onPick={({ regn, display: disp, data }) => {
              updateBhikkhuField("robingTutorName", regn ?? "");
              setDisplay((prev) => ({ ...prev, robingTutor: disp ?? "" }));
              const tutorResidence = data?.br_robing_tutor_residence;
              if (tutorResidence?.vh_trn) {
                const residencyName = tutorResidence?.vh_vname ?? "";
                const residenceDisplay = residencyName
                  ? `${residencyName} - ${tutorResidence.vh_trn}`
                  : tutorResidence.vh_trn;
                updateBhikkhuField("robingTutorResidence", tutorResidence.vh_trn ?? "");
                setDisplay((prev) => ({ ...prev, robingTutorResidence: residenceDisplay }));
              } else if (typeof tutorResidence === "string") {
                updateBhikkhuField("robingTutorResidence", tutorResidence);
                setDisplay((prev) => ({ ...prev, robingTutorResidence: tutorResidence }));
              } else {
                updateBhikkhuField("robingTutorResidence", "");
                setDisplay((prev) => ({ ...prev, robingTutorResidence: "" }));
              }
            }}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Name of robing tutor's residence
          </label>
          <input
            type="text"
            value={display.robingTutorResidence ?? bhikkhuDetails.robingTutorResidence ?? ""}
            readOnly
            className="w-full rounded-lg border border-slate-300 bg-slate-100 px-4 py-2 text-sm text-slate-700"
            placeholder="Auto-populated from tutor"
          />
        </div>
      </div>

      <TempleAutocomplete
        id="robing-temple"
        label="Temple where robing took place"
        required
        placeholder="Search temple, auto-fill TRN"
        storeTrn
        initialDisplay={display.robingTemple ?? ""}
        onPick={({ trn, display: disp }) => {
          updateBhikkhuField("robingTemple", trn ?? "");
          setDisplay((prev) => ({ ...prev, robingTemple: disp }));
        }}
      />
    </div>
  );

  const renderHigherOrdinationForm = () => (
    <div className="space-y-6">
      <TextField
        id="assumed-name"
        label="Name assumed at Higher Ordination"
        value={form.assumedName}
        onChange={(v) => updateField("assumedName", v)}
        required
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <BhikkhuAutocomplete
          id="karmacharya-name"
          label="Name of Karmacharya"
          initialDisplay={form.karmacharyaName}
          onPick={({ display }) => updateField("karmacharyaName", display ?? "")}
          required
        />
        <BhikkhuAutocomplete
          id="upaddhyaya-name"
          label="Name of Upaddhyaya at Higher Ordination"
          initialDisplay={form.upaddhyayaName}
          onPick={({ display }) => updateField("upaddhyayaName", display ?? "")}
          required
        />
      </div>
    </div>
  );

  const renderDeclarationForm = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <BhikkhuStatusSelect
        id="current-status"
        label="Current Status"
        value={form.currentStatus}
        required
        onPick={({ code }) => updateField("currentStatus", code)}
      />
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
        return renderPersonalInformation();
      case 2:
        return renderBirthLocation();
      case 3:
        return renderTempleInformation();
      case 4:
        return renderRobingInformation();
      case 5:
        return renderHigherOrdinationForm();
      case 6:
      default:
        return renderDeclarationForm();
    }
  };

  if (!accessChecked) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">Checking access...</p>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm font-medium text-red-600">
          You do not have access to this section.
        </p>
      </div>
    );
  }

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
                    {canAdminActions && (
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
                    )}
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
