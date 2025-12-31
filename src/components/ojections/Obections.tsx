"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { toast } from "react-toastify";
import { ReprintResponse, _advanceSearch } from "@/services/rePrint";
import { _ManageObjections } from "@/services/objections";

type Step = "select" | "verify" | "form";
type Mode = "list" | "create";

type RecordField = {
  titel: string;
  text: string;
};

type AdvancedSearchRecord = {
  entity_type?: string;
  registration_number?: string;
  form_id?: string | null;
  ordained_name?: string;
  birth_name?: string;
  date_of_birth?: string;
  birth_place?: string;
  mobile?: string | null;
  email?: string | null;
  temple_name?: string;
  temple_address?: string;
  current_status?: string;
  workflow_status?: string;
  ordination_date?: string;
  request_date?: string;
};

type ObjectionRecord = {
  obj_id: number;
  obj_reason?: string | null;
  obj_requester_name?: string | null;
  obj_requester_contact?: string | null;
  obj_requester_id_num?: string | null;
  obj_status?: string | null;
  obj_submitted_at?: string | null;
  obj_created_at?: string | null;
  obj_cancellation_reason?: string | null;
  obj_rejection_reason?: string | null;
  ot_code?: string | null;
  form_id?: string | null;
  bh_regn?: string | null;
  dbh_regn?: string | null;
  sil_regn?: string | null;
  ar_trn?: string | null;
  vh_trn?: string | null;
  dv_trn?: string | null;
};

const ENTITY_TYPE_OPTIONS = [
  { label: "Bhikku", value: "bhikku" },
  { label: "Silmatha", value: "silmatha" },
  { label: "High Bhikku", value: "high_bhikku" },
  { label: "Direct High Bhikku", value: "direct_high_bhikku" },
  { label: "Vihara", value: "vihara" },
  { label: "Arama", value: "arama" },
  { label: "Devala", value: "devala" },
] as const;

const initialAdvancedSearchInputs = {
  registration_number: "",
  name: "",
  birth_date: "",
  entity_type: "",
};

const OBJECTION_TYPE_OPTIONS = [
  { label: "Residency Restriction", value: "RESIDENCY_RESTRICTION" },
  { label: "Reprint Restriction", value: "REPRINT_RESTRICTION" },
] as const;

const initialObjectionFormValues = {
  id: "",
  ot_code: "RESIDENCY_RESTRICTION",
  obj_reason: "",
  form_id: "",
  obj_requester_name: "",
  obj_requester_contact: "",
  obj_requester_id_num: "",
  obj_valid_from: "",
  obj_valid_until: "",
};

type RequestStatus = "PENDING" | "APPROVED" | "COMPLETED" | "CANCELLED" | "REJECTED";

type SubjectInfo = {
  name?: string;
  gihi_name?: string;
  phone?: string;
};

type PrintRequest = {
  id: string | number;
  regn: string;
  requestType: string;
  formNo?: string;
  requestReason?: string;
  amount?: number | string;
  remarks?: string;
  flowStatus: RequestStatus;
  requestedAt: string;
  subject?: SubjectInfo;
  raw?: ObjectionRecord;
};

const REQUEST_STATUS_VALUES: RequestStatus[] = ["PENDING", "APPROVED", "COMPLETED", "CANCELLED", "REJECTED"];

const normalizeRequestStatus = (value: string | null | undefined): RequestStatus => {
  if (!value) {
    return "PENDING";
  }
  const normalized = value.toUpperCase() as RequestStatus;
  return REQUEST_STATUS_VALUES.includes(normalized) ? normalized : "PENDING";
};

const getObjectionRegistrationNumber = (record: ObjectionRecord) => {
  const candidates = [
    record.dbh_regn,
    record.bh_regn,
    record.sil_regn,
    record.ar_trn,
    record.vh_trn,
    record.dv_trn,
  ];
  const found = candidates.find(Boolean);
  return found ?? `OBJ-${record.obj_id}`;
};

const mapObjectionRecordToPrintRequest = (record: ObjectionRecord): PrintRequest => ({
  id: record.obj_id,
  regn: getObjectionRegistrationNumber(record),
  requestType: record.ot_code ?? "OBJECTION",
  formNo: record.form_id ?? "-",
  requestReason: record.obj_reason ?? "-",
  amount: 0,
  remarks: record.obj_cancellation_reason ?? record.obj_rejection_reason ?? "-",
  flowStatus: normalizeRequestStatus(record.obj_status),
  requestedAt: record.obj_submitted_at ?? record.obj_created_at ?? new Date().toISOString(),
  subject: {
    name: record.obj_requester_name ?? "-",
    gihi_name: record.obj_requester_id_num ?? undefined,
    phone: record.obj_requester_contact ?? undefined,
  },
  raw: record,
});

type RecordSummaryCardProps = {
  fields: RecordField[];
  onEdit: () => void;
  onNext: () => void;
};

function RecordSummaryCard({ fields, onEdit, onNext }: RecordSummaryCardProps) {
  const getValue = (label: string) => fields.find((field) => field.titel === label)?.text ?? "-";

  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: "10px",
        padding: "16px",
        background: "#f8fafc",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
        <div>
          <div style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>{getValue("Name")}</div>
          <div style={{ color: "#475569", fontSize: "14px" }}>{getValue("Current Status")}</div>
        </div>
        <button
          onClick={onEdit}
          style={{
            padding: "6px 12px",
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            background: "white",
            color: "#0f172a",
            cursor: "pointer",
          }}
        >
          Change
        </button>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "12px",
        }}
      >
        {fields.map((field) => (
          <div
            key={field.titel}
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "12px",
              background: "white",
              minHeight: "68px",
            }}
          >
            <div style={{ color: "#475569", fontSize: "12px", fontWeight: 600 }}>{field.titel}</div>
            <div
              style={{
                color: "#0f172a",
                fontWeight: 600,
                marginTop: "6px",
                wordBreak: "break-word",
              }}
            >
              {field.text}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
        <button
          onClick={onNext}
          style={{
            padding: "10px 16px",
            borderRadius: "10px",
            border: "none",
            background: "#0ea5e9",
            color: "white",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Next
        </button>
      </div>
    </div>
  );
}

const formatFieldValue = (value?: string | null) => {
  if (!value) {
    return "-";
  }
  const trimmed = value.trim();
  return trimmed || "-";
};

const formatDateInputValue = (value?: string) => {
  if (!value) {
    return undefined;
  }
  return `${value}T00:00:00`;
};

const mapAdvancedRecordToFields = (record: AdvancedSearchRecord): RecordField[] => [
  { titel: "Registration Number", text: formatFieldValue(record.registration_number) },
  { titel: "Name", text: formatFieldValue(record.ordained_name) },
  { titel: "Birth Name", text: formatFieldValue(record.birth_name) },
  { titel: "Current Status", text: formatFieldValue(record.current_status) },
  { titel: "Workflow Status", text: formatFieldValue(record.workflow_status) },
  { titel: "Birth Date", text: formatFieldValue(record.date_of_birth) },
  { titel: "Birth Place", text: formatFieldValue(record.birth_place) },
  { titel: "Temple", text: formatFieldValue(record.temple_name) },
  { titel: "Temple Address", text: formatFieldValue(record.temple_address) },
  { titel: "Ordination Date", text: formatFieldValue(record.ordination_date) },
  { titel: "Request Date", text: formatFieldValue(record.request_date) },
  { titel: "Mobile", text: formatFieldValue(record.mobile) },
  { titel: "Email", text: formatFieldValue(record.email) },
];

function StatusPill({ status }: { status: RequestStatus }) {
  const styles: Record<RequestStatus, { color: string; bg: string }> = {
    PENDING: { color: "#b45309", bg: "rgba(251, 191, 36, 0.15)" },
    APPROVED: { color: "#047857", bg: "rgba(16, 185, 129, 0.18)" },
    COMPLETED: { color: "#312e81", bg: "rgba(129, 140, 248, 0.2)" },
    CANCELLED: { color: "#991b1b", bg: "rgba(248, 113, 113, 0.2)" },
    REJECTED: { color: "#991b1b", bg: "rgba(248, 113, 113, 0.2)" },
  };

  return (
    <span
      style={{
        display: "inline-block",
        padding: "6px 12px",
        borderRadius: "999px",
        fontWeight: 700,
        fontSize: "12px",
        color: styles[status].color,
        background: styles[status].bg,
      }}
    >
      {status}
    </span>
  );
}

function SubjectInfoCard({ subject }: { subject?: SubjectInfo }) {
  if (!subject) {
    return <span style={{ color: "#475569", fontSize: "12px" }}>No subject info</span>;
  }

  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: "10px",
        padding: "10px",
        background: "white",
        minHeight: "80px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: "4px",
        width: "160px",
        textAlign: "left",
      }}
    >
      {subject.name ? (
        <span style={{ fontWeight: 600, color: "#0f172a", fontSize: "14px" }}>{subject.name}</span>
      ) : null}
      {subject.gihi_name ? (
        <span style={{ fontSize: "12px", color: "#475569" }}>{subject.gihi_name}</span>
      ) : null}
      {subject.phone ? (
        <span style={{ fontSize: "12px", color: "#475569" }}>Phone: {subject.phone}</span>
      ) : null}
    </div>
  );
}

export default function Obections() {
  const [mode, setMode] = useState<Mode>("list");
  const [requests, setRequests] = useState<PrintRequest[]>([]);
  const [step, setStep] = useState<Step>("select");
  const [recordFields, setRecordFields] = useState<RecordField[] | null>(null);
  const [advSearchInputs, setAdvSearchInputs] = useState(initialAdvancedSearchInputs);
  const [advancedSearchResults, setAdvancedSearchResults] = useState<AdvancedSearchRecord[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<AdvancedSearchRecord | null>(null);
  const [advSearchLoading, setAdvSearchLoading] = useState(false);
  const [advSearchError, setAdvSearchError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [objectionFormValues, setObjectionFormValues] = useState(initialObjectionFormValues);
  const [tableLoading, setTableLoading] = useState(false);
  const [tableError, setTableError] = useState<string | null>(null);
  const canSubmitForm =
    Boolean(objectionFormValues.id.trim()) &&
    Boolean(objectionFormValues.ot_code) &&
    Boolean(objectionFormValues.obj_reason.trim());
  const hasAdvancedSearchInput =
    advSearchInputs.registration_number.trim().length > 0 ||
    advSearchInputs.name.trim().length > 0 ||
    advSearchInputs.birth_date.trim().length > 0 ||
    advSearchInputs.entity_type.trim().length > 0;
  const canTriggerAdvancedSearch = hasAdvancedSearchInput && !advSearchLoading;
  const [filters, setFilters] = useState({ searchKey: "" });
  const [searchKeyInput, setSearchKeyInput] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<PrintRequest | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectingRequestId, setRejectingRequestId] = useState<number | null>(null);
  const [rejectLoading, setRejectLoading] = useState(false);
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const [cancelingRequestId, setCancelingRequestId] = useState<number | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [approvingRequestId, setApprovingRequestId] = useState<number | null>(null);

  const resetFlow = () => {
    setStep("select");
    setRecordFields(null);
    setAdvSearchInputs(initialAdvancedSearchInputs);
    setAdvancedSearchResults([]);
    setSelectedCandidate(null);
    setAdvSearchError(null);
    setSubmitError(null);
    setAdvSearchLoading(false);
    setSubmitting(false);
    setObjectionFormValues(initialObjectionFormValues);
  };

  const [currentPage, setCurrentPage] = useState(1);
  const limit = 5;
  const [totalRecords, setTotalRecords] = useState(0);
  const handleView = (item: PrintRequest) => {
    setSelectedRequest(item);
    setRejectError(null);
  };

  const updateRequestStatus = (targetId: number | string, status: RequestStatus) => {
    const idKey = String(targetId);
    setRequests((prev) =>
      prev.map((req) => (String(req.id) === idKey ? { ...req, flowStatus: status } : req))
    );
    setSelectedRequest((prev) =>
      prev && String(prev.id) === idKey ? { ...prev, flowStatus: status } : prev
    );
  };

  const openRejectDialog = (id: number | string) => {
    setRejectingRequestId(Number(id));
    setRejectReason("");
    setRejectError(null);
    setRejectDialogOpen(true);
  };

  const handleApproveRequest = async (id: number | string) => {
    setRejectError(null);
    const normalizedId = Number(id);
    if (Number.isNaN(normalizedId) || normalizedId <= 0) {
      toast.error("Invalid objection ID.");
      return;
    }
    setApprovingRequestId(normalizedId);

    try {
      const response = await _ManageObjections({
        action: "APPROVE",
        payload: {
          obj_id: normalizedId,
        },
      });
      const payload = response?.data;
      if (payload?.status !== "success") {
        throw new Error(payload?.message || "Unable to approve the objection.");
      }
      updateRequestStatus(id, "APPROVED");
      toast.success(payload?.message ?? "Objection approved.");
    } catch (error: any) {
      const message =
        error?.response?.data?.message || error?.message || "Unable to approve the objection.";
      toast.error(message);
    } finally {
      setApprovingRequestId(null);
    }
  };

  const closeRejectDialog = () => {
    if (rejectLoading) return;
    setRejectDialogOpen(false);
    setRejectError(null);
    setRejectingRequestId(null);
  };

  const submitRejection = async () => {
    if (!rejectingRequestId) {
      setRejectError("Missing request ID.");
      return;
    }
    const trimmedReason = rejectReason.trim();
    if (!trimmedReason) {
      setRejectError("Please provide a rejection reason.");
      return;
    }
    const normalizedId = Number(rejectingRequestId);
    if (Number.isNaN(normalizedId) || normalizedId <= 0) {
      setRejectError("Invalid objection ID.");
      return;
    }
    setRejectLoading(true);
    setRejectError(null);
    try {
      const response = await _ManageObjections({
        action: "REJECT",
        payload: {
          obj_id: normalizedId,
          rejection_reason: trimmedReason,
        },
      });
      const payload = response?.data;
      if (payload?.status !== "success") {
        throw new Error(payload?.message || "Unable to reject the objection.");
      }
      updateRequestStatus(normalizedId, "REJECTED");
      toast.success(payload?.message ?? "Objection rejected.");
      setRejectLoading(false);
      closeRejectDialog();
      return;
    } catch (error: any) {
      const message =
        error?.response?.data?.message || error?.message || "Unable to reject the objection.";
      setRejectError(message);
      toast.error(message);
    } finally {
      setRejectLoading(false);
    }
  };

  const openCancelDialog = (id: number | string) => {
    setCancelingRequestId(Number(id));
    setCancellationReason("");
    setCancelError(null);
    setCancelDialogOpen(true);
  };

  const closeCancelDialog = () => {
    if (cancelLoading) return;
    setCancelDialogOpen(false);
    setCancelError(null);
    setCancelingRequestId(null);
  };

  const submitCancellation = async () => {
    if (!cancelingRequestId) {
      setCancelError("Missing request ID.");
      return;
    }
    const normalizedId = Number(cancelingRequestId);
    if (Number.isNaN(normalizedId) || normalizedId <= 0) {
      setCancelError("Invalid objection ID.");
      return;
    }
    const payloadBody: Record<string, string | number> = {
      obj_id: normalizedId,
    };
    if (cancellationReason.trim()) {
      payloadBody.cancellation_reason = cancellationReason.trim();
    }
    setCancelLoading(true);
    setCancelError(null);
    try {
      const response = await _ManageObjections({
        action: "CANCEL",
        payload: payloadBody,
      });
      const payload = response?.data;
      if (payload?.status !== "success") {
        throw new Error(payload?.message || "Unable to cancel the objection.");
      }
      updateRequestStatus(normalizedId, "CANCELLED");
      toast.success(payload?.message ?? "Objection cancelled.");
      closeCancelDialog();
    } catch (error: any) {
      const message =
        error?.response?.data?.message || error?.message || "Unable to cancel the objection.";
      setCancelError(message);
      toast.error(message);
    } finally {
      setCancelLoading(false);
    }
  };

  const getRecordFieldValue = (label: string) =>
    recordFields?.find((field) => field.titel === label)?.text;

  const allowedStatuses = REQUEST_STATUS_VALUES;
  const formatAmount = (value?: number | string) =>
    typeof value === "number" ? value.toFixed(2) : value ? value.toString() : "-";

  const formatDateTime = (value?: string) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    const pad = (num: number) => String(num).padStart(2, "0");
    const day = pad(date.getUTCDate());
    const month = pad(date.getUTCMonth() + 1);
    const year = date.getUTCFullYear();
    const hours = pad(date.getUTCHours());
    const minutes = pad(date.getUTCMinutes());
    const seconds = pad(date.getUTCSeconds());
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds} UTC`;
  };

  const formatDetailLabel = (key: string) =>
    key
      .replace(/_/g, " ")
      .replace(/(^\w|\s\w)/g, (char) => char.toUpperCase())
      .trim();

  const formatDetailValue = (value: any) => {
    if (value === null || value === undefined) {
      return "-";
    }
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) {
        return "-";
      }
      const dateMatch = trimmed.match(/^\d{4}-\d{2}-\d{2}T.*Z$/);
      if (dateMatch) {
        return formatDateTime(trimmed);
      }
      return trimmed;
    }
    if (typeof value === "number" || typeof value === "boolean") {
      return value.toString();
    }
    return JSON.stringify(value);
  };

  const getRequestDetails = (request?: PrintRequest | null) => {
    if (!request?.raw) {
      return [];
    }
    return Object.entries(request.raw)
      .filter(([, value]) => !(value === null || value === undefined || (typeof value === "string" && value.trim() === "")))
      .map(([key, value]) => ({
        label: formatDetailLabel(key),
        value: formatDetailValue(value),
      }));
  };

  const applyFilters = () => {
    setFilters({
      searchKey: searchKeyInput,
    });
    setCurrentPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(Math.max(totalRecords, 0) / limit));
  const startEntry = totalRecords === 0 ? 0 : (currentPage - 1) * limit + 1;
  const endEntry = Math.min(currentPage * limit, totalRecords);

  const goToPage = (page: number) => {
    const target = Math.min(Math.max(page, 1), totalPages);
    setCurrentPage(target);
  };

  const fetchRequests = useCallback(async () => {
    setTableLoading(true);
    setTableError(null);
    setSelectedRequest(null);
    try {
      const response = await _ManageObjections({
        action: "READ_ALL",
        payload: {
          search: filters.searchKey?.trim() ?? "",
          page: currentPage,
          limit,
        },
      });
      const payload = response?.data;
      if (payload?.status !== "success") {
        throw new Error(payload?.message || "Unable to load objections.");
      }
      const records = Array.isArray(payload?.data) ? payload.data : [];
      setRequests(records.map(mapObjectionRecordToPrintRequest));
      setTotalRecords(payload?.totalRecords ?? records.length);
    } catch (error: any) {
      const message =
        error?.response?.data?.message || error?.message || "Unable to load objections.";
      setTableError(message);
      setRequests([]);
      setTotalRecords(0);
    } finally {
      setTableLoading(false);
    }
  }, [filters.searchKey, currentPage, limit]);

  useEffect(() => {
    void fetchRequests();
  }, [fetchRequests]);

  const handleAdvancedSearch = async () => {
    if (!hasAdvancedSearchInput) {
      setAdvSearchError("Please fill at least one search field.");
      return;
    }
    setAdvSearchLoading(true);
    setRecordFields(null);
    setSelectedCandidate(null);
    setObjectionFormValues((prev) => ({ ...prev, id: "" }));
    setAdvSearchError(null);
    setAdvancedSearchResults([]);
    try {
      const payloadBody: Record<string, string | number> = {
        skip: 0,
        limit: 200,
      };
      if (advSearchInputs.registration_number.trim()) {
        payloadBody.registration_number = advSearchInputs.registration_number.trim();
      }
      if (advSearchInputs.name.trim()) {
        payloadBody.name = advSearchInputs.name.trim();
      }
      if (advSearchInputs.birth_date) {
        payloadBody.birth_date = advSearchInputs.birth_date;
      }
      if (advSearchInputs.entity_type) {
        payloadBody.entity_type = advSearchInputs.entity_type;
      }
      const response = await _advanceSearch(payloadBody);
      const payload = response?.data as ReprintResponse<AdvancedSearchRecord[]>;
      const results = Array.isArray(payload?.data) ? payload.data : [];
      if (payload?.status !== "success" || results.length === 0) {
        throw new Error(payload?.message || "No matching records were found.");
      }
      setAdvancedSearchResults(results);
      setAdvSearchError(null);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Unable to search for records.";
      setAdvSearchError(message);
      setAdvancedSearchResults([]);
    } finally {
      setAdvSearchLoading(false);
    }
  };

  const handleSelectCandidate = (candidate: AdvancedSearchRecord) => {
    setSelectedCandidate(candidate);
    setRecordFields(mapAdvancedRecordToFields(candidate));
    setObjectionFormValues((prev) => ({
      ...prev,
      id: candidate.registration_number ?? prev.id,
    }));
    setStep("verify");
    setAdvSearchError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordFields) {
      setSubmitError("No record selected. Please look up an ID first.");
      return;
    }

    const idValue =
      objectionFormValues.id.trim() ||
      selectedCandidate?.registration_number?.trim() ||
      getRecordFieldValue("Registration Number")?.trim();
    if (!idValue) {
      setSubmitError("Registration number is missing.");
      return;
    }

    if (!objectionFormValues.obj_reason.trim()) {
      setSubmitError("Objection reason is required.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const payloadData: Record<string, string> = {
        id: idValue,
        ot_code: objectionFormValues.ot_code,
        obj_reason: objectionFormValues.obj_reason.trim(),
      };
      if (objectionFormValues.form_id.trim()) {
        payloadData.form_id = objectionFormValues.form_id.trim();
      }
      if (objectionFormValues.obj_requester_name.trim()) {
        payloadData.obj_requester_name = objectionFormValues.obj_requester_name.trim();
      }
      if (objectionFormValues.obj_requester_contact.trim()) {
        payloadData.obj_requester_contact = objectionFormValues.obj_requester_contact.trim();
      }
      if (objectionFormValues.obj_requester_id_num.trim()) {
        payloadData.obj_requester_id_num = objectionFormValues.obj_requester_id_num.trim();
      }
      const validFrom = formatDateInputValue(objectionFormValues.obj_valid_from);
      if (validFrom) {
        payloadData.obj_valid_from = validFrom;
      }
      const validUntil = formatDateInputValue(objectionFormValues.obj_valid_until);
      if (validUntil) {
        payloadData.obj_valid_until = validUntil;
      }

      const response = await _ManageObjections({
        action: "CREATE",
        payload: {
          data: payloadData,
        },
      });
      const payload = response?.data;
      if (payload?.status !== "success") {
        throw new Error(payload?.message || "Unable to submit the objection.");
      }

      toast.success(payload?.message ?? "Objection request submitted.");
      resetFlow();
      setMode("list");
      setCurrentPage(1);
      await fetchRequests();
    } catch (error: any) {
      const message =
        error?.response?.data?.message || error?.message || "Unable to submit the request.";
      setSubmitError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const isApprovedRequest = selectedRequest?.flowStatus === "APPROVED";
  const isApprovingSelectedRequest =
    selectedRequest != null &&
    approvingRequestId !== null &&
    String(selectedRequest.id) === String(approvingRequestId);
  const isFinalizedRequest =
    selectedRequest?.flowStatus === "APPROVED" ||
    selectedRequest?.flowStatus === "REJECTED" ||
    selectedRequest?.flowStatus === "COMPLETED" ||
    selectedRequest?.flowStatus === "CANCELLED";
  const isCancelingSelectedRequest =
    selectedRequest != null &&
    cancelingRequestId !== null &&
    String(selectedRequest.id) === String(cancelingRequestId);
  const requestDetails = getRequestDetails(selectedRequest);

  return (
    <div
      style={{
        background: "white",
        borderRadius: "12px",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.05)",
        padding: "24px",
        marginBottom: "24px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
          paddingBottom: "16px",
          borderBottom: "2px solid #f1f5f9",
        }}
      >
        <h1
          style={{
            fontSize: "24px",
            fontWeight: 700,
            color: "#1e293b",
          }}
        >
          Objection requests
        </h1>
        {mode === "list" ? (
          <button
            onClick={() => {
              setMode("create");
              resetFlow();
            }}
            style={{
              padding: "10px 16px",
              borderRadius: "10px",
              border: "none",
              background: "#0ea5e9",
              color: "white",
              cursor: "pointer",
              fontWeight: 700,
              boxShadow: "0 4px 6px rgba(14, 165, 233, 0.3)",
            }}
          >
            Create request
          </button>
        ) : (
          <button
            onClick={() => {
              resetFlow();
              setMode("list");
            }}
            style={{
              padding: "10px 16px",
              borderRadius: "10px",
              border: "1px solid #e2e8f0",
              background: "white",
              color: "#0f172a",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Back to list
          </button>
        )}
      </div>

      {mode === "list" && (
        <div>
          <div style={{ display: selectedRequest ? "none" : undefined }}>
            <Box mb={2} display="flex" flexDirection="column" gap={2}>
              <TextField
                size="small"
                label="Global search"
                placeholder="Global search"
                value={searchKeyInput}
                onChange={(e) => setSearchKeyInput(e.target.value)}
                fullWidth
              />
              <Box display="flex" gap={1} justifyContent="flex-end">
                <Button variant="contained" onClick={applyFilters}>
                  Apply filters
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setSearchKeyInput("");
                    setFilters({ searchKey: "" });
                    setCurrentPage(1);
                  }}
                >
                  Reset
                </Button>
              </Box>
            </Box>

          <TableContainer component={Paper} sx={{ overflowX: "auto" }}>
            {tableLoading ? (
              <Box py={5} textAlign="center" color="#475569">
                Loading requests…
              </Box>
            ) : tableError ? (
              <Box py={5} textAlign="center" color="#b91c1c">
                {tableError}
              </Box>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Regn</TableCell>
                    <TableCell>Request Type</TableCell>
                    <TableCell>Request Reason</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Requested At</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {requests.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.regn}</TableCell>
                      <TableCell>{item.requestType}</TableCell>
                      <TableCell>
                        <Box display="flex" flexDirection="column" gap={0.5}>
                          
                          <Typography fontWeight={600} color="text.primary">
                            {item.requestReason || "-"}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <StatusPill status={item.flowStatus} />
                      </TableCell>
                      <TableCell>{formatDateTime(item.requestedAt)}</TableCell>
                      <TableCell>
                        <Box display="flex" gap={1}>
                          <Button variant="contained" size="small" onClick={() => handleView(item)}>
                            View
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                  {requests.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={11} align="center" sx={{ py: 6, color: "#475569" }}>
                        No records found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </TableContainer>

          <Box
            mt={1.5}
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            fontSize="14px"
            color="#475569"
          >
            <div>
              Showing {startEntry} to {endEntry} of {totalRecords} entries
            </div>
            <Box display="flex" gap={1} alignItems="center">
              <Button variant="outlined" size="small" onClick={() => goToPage(1)} disabled={currentPage === 1 || tableLoading}>
                {"<<"}
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1 || tableLoading}
              >
                {"<"}
              </Button>
              <Typography fontWeight={600}>
                Page {currentPage} of {totalPages}
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages || tableLoading}
              >
                {">"}
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => goToPage(totalPages)}
                disabled={currentPage === totalPages || tableLoading}
              >
                {">>"}
              </Button>
            </Box>
          </Box>
          </div>

          {selectedRequest && (
            <Paper elevation={1} sx={{ mt: 2, p: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={2} flexWrap="wrap">
                <Box>
                  <Typography variant="h6">Request details</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Regn: {selectedRequest.regn}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Request type: {selectedRequest.requestType}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Reason: {selectedRequest.requestReason || "-"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Amount: {formatAmount(selectedRequest.amount)}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    display="flex"
                    alignItems="center"
                    gap={1}
                  >
                    Status: <StatusPill status={selectedRequest.flowStatus} />
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Remarks: {selectedRequest.remarks || "-"}
                  </Typography>
                </Box>
                <Box display="flex" gap={1}>
                  <Button variant="outlined" size="small" onClick={() => setSelectedRequest(null)}>
                    Close viewer
                  </Button>
                  {isApprovedRequest && (
                    <Button
                      variant="contained"
                      size="small"
                      color="warning"
                      onClick={() => openCancelDialog(selectedRequest.id)}
                      disabled={cancelLoading || isCancelingSelectedRequest}
                    >
                      {isCancelingSelectedRequest ? "Cancelling..." : "Cancel request"}
                    </Button>
                  )}
                </Box>
              </Box>
              {requestDetails.length > 0 && (
                <Box
                  mt={2}
                  display="grid"
                  gridTemplateColumns="repeat(auto-fit, minmax(200px, 1fr))"
                  gap={1}
                >
                  {requestDetails.map((detail) => (
                    <div
                      key={detail.label}
                      style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        padding: "10px",
                        background: "white",
                        minHeight: "60px",
                      }}
                    >
                      <div style={{ fontSize: "12px", color: "#475569", fontWeight: 600 }}>
                        {detail.label}
                      </div>
                      <div
                        style={{
                          marginTop: "6px",
                          fontWeight: 600,
                          color: "#0f172a",
                          wordBreak: "break-word",
                          fontSize: "14px",
                        }}
                      >
                        {detail.value}
                      </div>
                    </div>
                  ))}
                </Box>
              )}
              {!isApprovedRequest && (
                <Box mt={2} display="flex" gap={1} flexWrap="wrap">
                  <Button
                    variant="contained"
                    size="small"
                    color="success"
                    onClick={() => handleApproveRequest(selectedRequest.id)}
                    disabled={isFinalizedRequest || isApprovingSelectedRequest}
                  >
                    {isApprovingSelectedRequest ? "Approving..." : "Approve request"}
                  </Button>
                  <Button
                    variant="contained"
                    size="small"
                    color="error"
                    onClick={() => openRejectDialog(selectedRequest.id)}
                    disabled={isFinalizedRequest}
                  >
                    Reject request
                  </Button>
                </Box>
              )}
            </Paper>
          )}
        </div>
      )}

      {mode === "create" && step === "select" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "16px",
            }}
          >
            <div>
              <label style={{ display: "block", marginBottom: "8px", color: "#475569", fontWeight: 600 }}>
                Registration Number
              </label>
              <input
                value={advSearchInputs.registration_number}
                onChange={(e) =>
                  setAdvSearchInputs((prev) => ({ ...prev, registration_number: e.target.value }))
                }
                placeholder="Registration number"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: "1px solid #e2e8f0",
                  background: "#f8fafc",
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "8px", color: "#475569", fontWeight: 600 }}>
                Name
              </label>
              <input
                value={advSearchInputs.name}
                onChange={(e) => setAdvSearchInputs((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Name"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: "1px solid #e2e8f0",
                  background: "#f8fafc",
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "8px", color: "#475569", fontWeight: 600 }}>
                Birth Date
              </label>
              <input
                type="date"
                value={advSearchInputs.birth_date}
                onChange={(e) => setAdvSearchInputs((prev) => ({ ...prev, birth_date: e.target.value }))}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: "1px solid #e2e8f0",
                  background: "#f8fafc",
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "8px", color: "#475569", fontWeight: 600 }}>
                Record type
              </label>
              <select
                value={advSearchInputs.entity_type}
                onChange={(e) => setAdvSearchInputs((prev) => ({ ...prev, entity_type: e.target.value }))}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: "1px solid #e2e8f0",
                  background: "#f8fafc",
                }}
              >
                <option value="">All</option>
                {ENTITY_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {advSearchError && (
            <p style={{ margin: 0, color: "#b91c1c", fontSize: "13px" }}>{advSearchError}</p>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              disabled={!canTriggerAdvancedSearch}
              onClick={handleAdvancedSearch}
              style={{
                padding: "10px 16px",
                borderRadius: "10px",
                border: "none",
                background: canTriggerAdvancedSearch ? "#0ea5e9" : "#cbd5e1",
                color: "white",
                cursor: canTriggerAdvancedSearch ? "pointer" : "not-allowed",
                fontWeight: 600,
              }}
            >
              {advSearchLoading ? "Searching..." : "Search"}
            </button>
          </div>
          {advancedSearchResults.length > 0 && (
            <div
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                padding: "16px",
                background: "#f8fafc",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <div style={{ fontWeight: 600, color: "#0f172a" }}>
                Search results ({advancedSearchResults.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {advancedSearchResults.map((record, index) => (
                  <div
                    key={`${record.registration_number ?? index}-${index}`}
                    style={{
                      border: "1px solid #cbd5e1",
                      borderRadius: "10px",
                      padding: "12px",
                      background: "white",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "12px",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ minWidth: "200px" }}>
                      <div style={{ fontWeight: 600, color: "#0f172a" }}>
                        {record.ordained_name || record.birth_name || "Unknown"}
                      </div>
                      <div style={{ color: "#475569", fontSize: "12px" }}>
                        {record.registration_number ?? "-"} | {record.current_status ?? "-"}
                      </div>
                      <div style={{ color: "#475569", fontSize: "12px" }}>
                        {record.temple_name ?? "-"}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <button
                        onClick={() => handleSelectCandidate(record)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "8px",
                          border: "none",
                          background: "#0ea5e9",
                          color: "white",
                          cursor: "pointer",
                          fontWeight: 600,
                        }}
                      >
                        Select
                      </button>
                      <div style={{ fontSize: "12px", color: "#475569" }}>
                        Workflow: {record.workflow_status ?? "-"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {mode === "create" && step === "verify" && recordFields && (
        <RecordSummaryCard
          fields={recordFields}
          onEdit={() => {
            setRecordFields(null);
            setSelectedCandidate(null);
            setAdvancedSearchResults([]);
            setAdvSearchError(null);
            setStep("select");
          }}
          onNext={() => setStep("form")}
        />
      )}

      {mode === "create" && step === "form" && (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "8px", color: "#475569", fontWeight: 600 }}>
                ID Number
              </label>
              <input
                value={objectionFormValues.id}
                onChange={(e) =>
                  setObjectionFormValues((prev) => ({ ...prev, id: e.target.value }))
                }
                placeholder="Registration number"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: "1px solid #e2e8f0",
                  background: "#f8fafc",
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "8px", color: "#475569", fontWeight: 600 }}>
                Objection type
              </label>
              <select
                value={objectionFormValues.ot_code}
                onChange={(e) =>
                  setObjectionFormValues((prev) => ({ ...prev, ot_code: e.target.value }))
                }
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: "1px solid #e2e8f0",
                  background: "#f8fafc",
                }}
              >
                {OBJECTION_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "8px", color: "#475569", fontWeight: 600 }}>
              Objection reason
            </label>
            <textarea
              value={objectionFormValues.obj_reason}
              onChange={(e) =>
                setObjectionFormValues((prev) => ({ ...prev, obj_reason: e.target.value }))
              }
              rows={3}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "10px",
                border: "1px solid #e2e8f0",
                background: "#f8fafc",
              }}
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "8px", color: "#475569", fontWeight: 600 }}>
                Related form ID (optional)
              </label>
              <input
                value={objectionFormValues.form_id}
                onChange={(e) =>
                  setObjectionFormValues((prev) => ({ ...prev, form_id: e.target.value }))
                }
                placeholder="FORM-2025-001"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: "1px solid #e2e8f0",
                  background: "#f8fafc",
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "8px", color: "#475569", fontWeight: 600 }}>
                Requester name (optional)
              </label>
              <input
                value={objectionFormValues.obj_requester_name}
                onChange={(e) =>
                  setObjectionFormValues((prev) => ({ ...prev, obj_requester_name: e.target.value }))
                }
                placeholder="Temple Admin"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: "1px solid #e2e8f0",
                  background: "#f8fafc",
                }}
              />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "8px", color: "#475569", fontWeight: 600 }}>
                Requester contact (optional)
              </label>
              <input
                value={objectionFormValues.obj_requester_contact}
                onChange={(e) =>
                  setObjectionFormValues((prev) => ({
                    ...prev,
                    obj_requester_contact: e.target.value,
                  }))
                }
                placeholder="0771234567"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: "1px solid #e2e8f0",
                  background: "#f8fafc",
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "8px", color: "#475569", fontWeight: 600 }}>
                Requester ID number (optional)
              </label>
              <input
                value={objectionFormValues.obj_requester_id_num}
                onChange={(e) =>
                  setObjectionFormValues((prev) => ({
                    ...prev,
                    obj_requester_id_num: e.target.value,
                  }))
                }
                placeholder="NIC/Passport"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: "1px solid #e2e8f0",
                  background: "#f8fafc",
                }}
              />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "8px", color: "#475569", fontWeight: 600 }}>
                Valid from (optional)
              </label>
              <input
                type="date"
                value={objectionFormValues.obj_valid_from}
                onChange={(e) =>
                  setObjectionFormValues((prev) => ({ ...prev, obj_valid_from: e.target.value }))
                }
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: "1px solid #e2e8f0",
                  background: "#f8fafc",
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "8px", color: "#475569", fontWeight: 600 }}>
                Valid until (optional)
              </label>
              <input
                type="date"
                value={objectionFormValues.obj_valid_until}
                onChange={(e) =>
                  setObjectionFormValues((prev) => ({ ...prev, obj_valid_until: e.target.value }))
                }
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: "1px solid #e2e8f0",
                  background: "#f8fafc",
                }}
              />
            </div>
          </div>
          {submitError && (
            <p style={{ margin: 0, color: "#b91c1c", fontSize: "13px" }}>{submitError}</p>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
            <button
              type="button"
              onClick={() => {
                resetFlow();
                setMode("list");
              }}
              style={{
                padding: "10px 16px",
                borderRadius: "10px",
                border: "1px solid #e2e8f0",
                background: "white",
                color: "#0f172a",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmitForm || submitting}
              style={{
                padding: "10px 16px",
                borderRadius: "10px",
                border: "none",
                background: canSubmitForm ? "#0ea5e9" : "#cbd5e1",
                color: "white",
                cursor: !canSubmitForm || submitting ? "not-allowed" : "pointer",
                fontWeight: 600,
              }}
            >
              {submitting ? "Submitting..." : "Submit"}
            </button>
          </div>
        </form>
      )}

      <Dialog open={rejectDialogOpen} onClose={closeRejectDialog} fullWidth maxWidth="sm">
        <DialogTitle>Reject reprint request</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Provide a reason for rejecting this reprint so the requester knows why it was declined.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Rejection reason"
            type="text"
            fullWidth
            multiline
            minRows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            disabled={rejectLoading}
          />
          {rejectError && (
            <Typography color="error" variant="body2" sx={{ mt: 1 }}>
              {rejectError}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeRejectDialog} disabled={rejectLoading}>
            Cancel
          </Button>
          <Button variant="contained" color="error" onClick={submitRejection} disabled={rejectLoading}>
            {rejectLoading ? "Rejecting…" : "Reject request"}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={cancelDialogOpen} onClose={closeCancelDialog} fullWidth maxWidth="sm">
        <DialogTitle>Cancel objection</DialogTitle>
        <DialogContent>
          <DialogContentText>Optionally explain why the approved objection is being cancelled.</DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Cancellation reason"
            type="text"
            fullWidth
            multiline
            minRows={3}
            value={cancellationReason}
            onChange={(e) => setCancellationReason(e.target.value)}
            disabled={cancelLoading}
          />
          {cancelError && (
            <Typography color="error" variant="body2" sx={{ mt: 1 }}>
              {cancelError}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeCancelDialog} disabled={cancelLoading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={submitCancellation}
            disabled={cancelLoading}
          >
            {cancelLoading ? "Cancelling…" : "Cancel objection"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
