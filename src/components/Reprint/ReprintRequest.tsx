"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { _getReprintUrl, _searchId } from "@/services/rePrint";
import { baseURL } from "@/utils/config";
import { toast } from "react-toastify";

type Step = "select" | "verify" | "form";
type Mode = "list" | "create";

type RecordField = {
  titel: string;
  text: string;
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
};

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

export default function ReprintRequest() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("list");
  const [requests, setRequests] = useState<PrintRequest[]>([]);
  const [step, setStep] = useState<Step>("select");
  const [search, setSearch] = useState("");
  const [recordFields, setRecordFields] = useState<RecordField[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formValues, setFormValues] = useState({
    receiptNo: "",
    amount: "",
    remarks: "",
    requestReason: "",
  });

  const canSubmitForm =
    Boolean(formValues.receiptNo) &&
    Boolean(formValues.amount) &&
    Boolean(formValues.requestReason);
  const canTriggerSearch = search.trim().length > 0 && !searching;
  const [flowStatusInput, setFlowStatusInput] = useState("");
  const [requestTypeInput, setRequestTypeInput] = useState("");
  const [regnInput, setRegnInput] = useState("");
  const [filters, setFilters] = useState({ flowStatus: "", requestType: "", regn: "", searchKey: "" });
  const [searchKeyInput, setSearchKeyInput] = useState("");
  const [tableLoading, setTableLoading] = useState(true);
  const [tableError, setTableError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<PrintRequest | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const pdfIframeRef = React.useRef<HTMLIFrameElement | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectingRequestId, setRejectingRequestId] = useState<number | null>(null);
  const [rejectLoading, setRejectLoading] = useState(false);
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [markingPrinted, setMarkingPrinted] = useState(false);

  const resetFlow = () => {
    setStep("select");
    setRecordFields(null);
    setSearch("");
    setSearchError(null);
    setSubmitError(null);
    setSearching(false);
    setSubmitting(false);
    setFormValues({ receiptNo: "", amount: "", remarks: "", requestReason: "" });
  };

  const [currentPage, setCurrentPage] = useState(1);
  const limit = 5;
  const [totalRecords, setTotalRecords] = useState(0);
  const totalPages = Math.max(1, Math.ceil(totalRecords / limit));
  const startEntry = totalRecords === 0 ? 0 : (currentPage - 1) * limit + 1;
  const endEntry = Math.min(currentPage * limit, totalRecords);

  const goToPage = (page: number) => {
    const target = Math.min(Math.max(page, 1), totalPages);
    setCurrentPage(target);
  };

  const handleView = (item: PrintRequest) => {
    setSelectedRequest(item);
    fetchPdf(item.regn);
  };

  const openRejectDialog = (id: number | string) => {
    setRejectingRequestId(Number(id));
    setRejectReason("");
    setRejectError(null);
    setRejectDialogOpen(true);
  };

  const handleApproveRequest = async (id: number | string) => {
    setRejectError(null);
    try {
      const response = await _searchId<{ flow_status?: string }>({
        action: "APPROVE",
        request_id: id,
      });
      const payload = response?.data;
      const success = payload?.status === "success" && (payload?.data?.flow_status || payload?.success);
      if (!success) {
        const errors = payload?.errors ?? [];
        const message =
          errors.find((err: any) => err?.message)?.message ??
          payload?.message ??
          "Unable to approve the request.";
        throw new Error(message);
      }
      fetchRequests();
      toast.success(payload?.message ?? "Reprint request approved.");
    } catch (error: any) {
      const message =
        error?.response?.data?.errors?.[0]?.message ||
        error?.response?.data?.message ||
        error?.message ||
        "Unable to approve the request.";
      setRejectError(message);
      toast.error(message);
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
    if (!rejectReason.trim()) {
      setRejectError("Please provide a rejection reason.");
      return;
    }
    setRejectLoading(true);
    setRejectError(null);
    try {
      const response = await _searchId<{ flow_status?: string }>({
        action: "REJECT",
        request_id: rejectingRequestId,
        rejection_reason: rejectReason.trim(),
      });
      const payload = response?.data;
      const success = payload?.status === "success" && (payload?.data?.flow_status || payload?.success);
      if (!success) {
        const errors = payload?.errors ?? [];
        const message =
          errors.find((err: any) => err?.message)?.message ??
          payload?.message ??
          "Unable to reject the request.";
        throw new Error(message);
      }
      closeRejectDialog();
      fetchRequests();
      toast.success(payload?.message ?? "Reprint request rejected.");
    } catch (error: any) {
      const message =
        error?.response?.data?.errors?.[0]?.message ||
        error?.response?.data?.message ||
        error?.message ||
        "Unable to reject the request.";
      setRejectError(message);
      toast.error(message);
    } finally {
      setRejectLoading(false);
    }
  };

  const handleMarkPrinted = async () => {
    if (!selectedRequest) return;
    setMarkingPrinted(true);
    setRejectError(null);
    try {
      const response = await _searchId<{ flow_status?: string }>({
        action: "MARK_PRINTED",
        request_id: selectedRequest.id,
      });
      const payload = response?.data;
      const success = payload?.status === "success" && (payload?.data?.flow_status || payload?.success);
      if (!success) {
        const errors = payload?.errors ?? [];
        const message =
          errors.find((err: any) => err?.message)?.message ??
          payload?.message ??
          "Unable to mark the request as printed.";
        throw new Error(message);
      }
      toast.success(payload?.message ?? "Reprint request marked as completed.");
      fetchRequests();
      if (pdfBlobUrl) {
        const printWindow = window.open(pdfBlobUrl, "_blank");
        if (printWindow) {
          printWindow.onload = () => {
            printWindow.focus();
            printWindow.print();
            printWindow.close();
          };
        }
      }
    } catch (error: any) {
      const message =
        error?.response?.data?.errors?.[0]?.message ||
        error?.response?.data?.message ||
        error?.message ||
        "Unable to mark the request as printed.";
      setRejectError(message);
      toast.error(message);
    } finally {
      setMarkingPrinted(false);
    }
  };

  const getRecordFieldValue = (label: string) =>
    recordFields?.find((field) => field.titel === label)?.text;

  const allowedStatuses: RequestStatus[] = ["PENDING", "APPROVED", "COMPLETED", "CANCELLED", "REJECTED"];
  const parseFlowStatus = (value?: string): RequestStatus =>
    value && allowedStatuses.includes(value as RequestStatus) ? (value as RequestStatus) : "PENDING";

  const formatAmount = (value?: number | string) =>
    typeof value === "number" ? value.toFixed(2) : value ? value.toString() : "-";

  const formatDateTime = (value?: string) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleString();
  };

  const fetchRequests = useCallback(async () => {
    setTableLoading(true);
    setTableError(null);
    try {
      const response = await _searchId<Array<Record<string, unknown>>>({
        action: "READ_ALL",
        flow_status: filters.flowStatus || null,
        request_type: filters.requestType || null,
        regn: filters.regn || "",
        page: currentPage,
        limit,
        search_key: filters.searchKey || "",
      });
      const payload = response?.data;
      const data = payload?.data;
      if (payload?.status !== "success" || !Array.isArray(data)) {
        throw new Error(payload?.message || "Unable to load requests.");
      }
      const formatted = data.map((item: any) => ({
        id: item.id,
        regn: item.regn ?? item.bhikku_regn ?? item.bhikku_high_regn ?? "",
        requestType: item.request_type ?? "",
        formNo: item.form_no,
        requestReason: item.request_reason,
        amount: item.amount,
        remarks: item.remarks,
        flowStatus: parseFlowStatus(item.flow_status),
        requestedAt: item.requested_at ?? "",
        subject: {
          name: item.subject?.name,
          gihi_name: item.subject?.gihi_name,
          phone: item.subject?.phone,
        },
      }));
      setRequests(formatted);
      setTotalRecords(payload?.totalRecords ?? 0);
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || "Unable to load requests.";
      setRequests([]);
      setTableError(message);
      setTotalRecords(0);
    } finally {
      setTableLoading(false);
    }
  }, [
    filters.flowStatus,
    filters.requestType,
    filters.regn,
    filters.searchKey,
    currentPage,
    limit,
  ]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const applyFilters = () => {
    setFilters({
      flowStatus: flowStatusInput,
      requestType: requestTypeInput,
      regn: regnInput,
      searchKey: searchKeyInput,
    });
    setCurrentPage(1);
  };

  const fetchPdf = async (regn: string) => {
    setPdfLoading(true);
    setPdfError(null);
    setPdfUrl(null);
    try {
      const response = await _getReprintUrl<{ scanned_document_path?: string }>({ regn });
      const payload = response?.data;
      const data = payload?.data;
      if (payload?.status !== "success" || !data?.scanned_document_path) {
        throw new Error(payload?.message || "PDF not available.");
      }
      const absoluteUrl = `${baseURL ?? "https://api.dbagovlk.com"}${data.scanned_document_path}`;
      setPdfUrl(absoluteUrl);
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
      const blobResponse = await fetch(absoluteUrl, { credentials: "include" });
      const blob = await blobResponse.blob();
      setPdfBlobUrl(URL.createObjectURL(blob));
      console.log("PDF ready", absoluteUrl);
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || "Unable to load PDF.";
      setPdfError(message);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!search.trim()) {
      setSearchError("Please enter an ID number.");
      return;
    }
    setSearching(true);
    setSearchError(null);
    try {
      const response = await _searchId<RecordField[]>({
        action: "READ_ONE",
        request_id: search.trim(),
      });
      const payload = response?.data;
      const details = payload?.data;
      if (payload?.status !== "success" || !Array.isArray(details) || details.length === 0) {
        throw new Error(payload?.message || "Record not found.");
      }
      setRecordFields(details);
      setSubmitError(null);
      setStep("verify");
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Unable to load record details.";
      setSearchError(message);
      setRecordFields(null);
    } finally {
      setSearching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordFields) {
      setSubmitError("No record selected. Please look up an ID first.");
      return;
    }

    const amountValue = Number(formValues.amount);
    if (Number.isNaN(amountValue)) {
      setSubmitError("Amount must be a valid number.");
      return;
    }

    const regn = getRecordFieldValue("Registration Number")?.trim() || search.trim();
    if (!regn) {
      setSubmitError("Registration number is missing.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await _searchId<Record<string, unknown>>({
        action: "CREATE",
        create_payload: {
          regn,
          request_reason: formValues.requestReason,
          amount: amountValue,
          form_no: formValues.receiptNo,
          remarks: formValues.remarks,
        },
      });

      const payload = response?.data;
      const created = payload?.data;
      if (payload?.status !== "success" || !created) {
        throw new Error(payload?.message || "Unable to create request.");
      }

      resetFlow();
      setMode("list");
      setCurrentPage(1);
      await fetchRequests();
    } catch (error: any) {
      const message =
        error?.response?.data?.message || error?.message || "Unable to submit the request.";
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const isApprovedRequest = selectedRequest?.flowStatus === "APPROVED";
  const isFinalizedRequest =
    selectedRequest?.flowStatus === "APPROVED" ||
    selectedRequest?.flowStatus === "REJECTED" ||
    selectedRequest?.flowStatus === "COMPLETED";

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
          Print requests
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
            <Box mb={2} display="grid" gridTemplateColumns="repeat(auto-fit, minmax(220px, 1fr))" gap={2}>
            <FormControl size="small" fullWidth>
              <InputLabel>Flow Status</InputLabel>
              <Select value={flowStatusInput} onChange={(e) => setFlowStatusInput(e.target.value)} label="Flow Status">
                <MenuItem value="">All</MenuItem>
                {allowedStatuses.map((status) => (
                  <MenuItem value={status} key={status}>
                    {status}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>Request Type</InputLabel>
              <Select
                value={requestTypeInput}
                onChange={(e) => setRequestTypeInput(e.target.value)}
                label="Request Type"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="BHIKKU">BHIKKU</MenuItem>
                <MenuItem value="HIGH_BHIKKU">HIGH_BHIKKU</MenuItem>
              </Select>
            </FormControl>
            <TextField
              size="small"
              label="Regn"
              placeholder="Search by regn"
              value={regnInput}
              onChange={(e) => setRegnInput(e.target.value)}
              fullWidth
            />
            <TextField
              size="small"
              label="Search key"
              placeholder="Global search"
              value={searchKeyInput}
              onChange={(e) => setSearchKeyInput(e.target.value)}
              fullWidth
            />
            <Box display="flex" gap={1} alignItems="flex-end">
              <Button variant="contained" onClick={applyFilters}>
                Apply filters
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  setFlowStatusInput("");
                  setRequestTypeInput("");
                  setRegnInput("");
                  setSearchKeyInput("");
                  setFilters({ flowStatus: "", requestType: "", regn: "", searchKey: "" });
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
                    <TableCell>ID</TableCell>
                    <TableCell>Regn</TableCell>
                    <TableCell>Request Type</TableCell>
                    <TableCell>Form No</TableCell>
                    <TableCell>Request Reason</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell>Remarks</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Requested At</TableCell>
                    <TableCell>Subject</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {requests.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell sx={{ fontWeight: 700 }}>{item.id}</TableCell>
                      <TableCell>{item.regn}</TableCell>
                      <TableCell>{item.requestType}</TableCell>
                      <TableCell>{item.formNo || "-"}</TableCell>
                      <TableCell>
                        <Box display="flex" flexDirection="column" gap={0.5}>
                          
                          <Typography fontWeight={600} color="text.primary">
                            {item.requestReason || "-"}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Box display="flex" flexDirection="column" alignItems="flex-end" gap={0.5}>
                         
                          <Typography fontWeight={600} color="text.primary">
                            {formatAmount(item.amount)}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 150, wordBreak: "break-word" }}>{item.remarks || "-"}</TableCell>
                      <TableCell>
                        <StatusPill status={item.flowStatus} />
                      </TableCell>
                      <TableCell>{formatDateTime(item.requestedAt)}</TableCell>
                      <TableCell>
                        <SubjectInfoCard subject={item.subject} />
                      </TableCell>
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
                <Typography variant="body2" color="text.secondary" display="flex" alignItems="center" gap={1}>
                  Status: <StatusPill status={selectedRequest.flowStatus} />
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Remarks: {selectedRequest.remarks || "-"}
                </Typography>
                </Box>
              <Box display="flex" gap={1}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    setSelectedRequest(null);
                    setPdfUrl(null);
                    setPdfError(null);
                  }}
                  disabled={markingPrinted}
                >
                  Close viewer
                </Button>
                {isApprovedRequest && (
                  <Button
                    variant="contained"
                    size="small"
                    onClick={handleMarkPrinted}
                    disabled={markingPrinted || !selectedRequest}
                  >
                    {markingPrinted ? "Marking..." : "Print"}
                  </Button>
                )}
              </Box>
            </Box>
            {!isApprovedRequest && (
              <Box mt={2} display="flex" gap={1} flexWrap="wrap">
                <Button
                  variant="contained"
                  size="small"
                  color="success"
                  onClick={() => handleApproveRequest(selectedRequest.id)}
                  disabled={isFinalizedRequest}
                >
                  Approve request
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
              <Box mt={2} id="reprint-pdf-print-area">
            {pdfLoading ? (
              <Typography color="text.secondary">Loading PDF…</Typography>
            ) : pdfError ? (
              <Typography color="error">{pdfError}</Typography>
            ) : pdfUrl ? (
              <Typography color="text.primary">
                PDF is ready for print. Use the Print button to send only the scanned document to the printer.
              </Typography>
            ) : (
              <Typography color="text.secondary">Select a request to make its scanned document available.</Typography>
            )}
          </Box>
        </Paper>
      )}
        </div>
      )}

      {mode === "create" && step === "select" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        
          <div>
          <label style={{ display: "block", marginBottom: "8px", color: "#475569", fontWeight: 600 }}>
            Enter ID Number
          </label>
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSearchError(null);
            }}
              placeholder="ID Number"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "10px",
                border: "1px solid #e2e8f0",
                background: "#f8fafc",
              }}
            />
            {searchError && (
              <p style={{ marginTop: "8px", color: "#b91c1c", fontSize: "13px" }}>{searchError}</p>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              disabled={!canTriggerSearch}
              onClick={handleSearch}
              style={{
                padding: "10px 16px",
                borderRadius: "10px",
                border: "none",
                background: canTriggerSearch ? "#0ea5e9" : "#cbd5e1",
                color: "white",
                cursor: canTriggerSearch ? "pointer" : "not-allowed",
                fontWeight: 600,
              }}
            >
              {searching ? "Searching..." : "Next"}
            </button>
          </div>
        </div>
      )}

      {mode === "create" && step === "verify" && recordFields && (
        <RecordSummaryCard
          fields={recordFields}
          onEdit={() => {
            setRecordFields(null);
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
                Receipt No
              </label>
              <input
                value={formValues.receiptNo}
                onChange={(e) => setFormValues((v) => ({ ...v, receiptNo: e.target.value }))}
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
                Amount
              </label>
              <input
                type="number"
                value={formValues.amount}
                onChange={(e) => setFormValues((v) => ({ ...v, amount: e.target.value }))}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: "1px solid #e2e8f0",
                  background: "#f8fafc",
                }}
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", marginBottom: "8px", color: "#475569", fontWeight: 600 }}>
                Request Reason
              </label>
              <input
                value={formValues.requestReason}
                onChange={(e) => setFormValues((v) => ({ ...v, requestReason: e.target.value }))}
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

          <div>
            <label style={{ display: "block", marginBottom: "8px", color: "#475569", fontWeight: 600 }}>Remarks</label>
            <textarea
              value={formValues.remarks}
              onChange={(e) => setFormValues((v) => ({ ...v, remarks: e.target.value }))}
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
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #reprint-pdf-print-area,
          #reprint-pdf-print-area * {
            visibility: visible;
          }
          #reprint-pdf-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
