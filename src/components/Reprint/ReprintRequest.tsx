"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Step = "select" | "verify" | "form";
type Role = "High Bhikku" | "Samanera";
type Mode = "list" | "create";

type Bhikku = {
  name: string;
  monastery?: string;
  province?: string;
  role: Role;
};

type RequestStatus = "PENDING" | "APPROVED" | "COMPLETED" | "CANCELLED";

type PrintRequest = {
  id: string;
  viharaName: string;
  district: string;
  chiefIncumbent: string;
  submissionDate: string;
  status: RequestStatus;
  receiptNo?: string;
  amount?: string;
  remarks?: string;
};

const BIKKHUS: Bhikku[] = [
  { name: "Bhikku Ananda", monastery: "Mihintale Vihara", province: "Anuradhapura", role: "High Bhikku" },
  { name: "Bhikku Rahula", monastery: "Kelaniya Raja Maha Vihara", province: "Western", role: "High Bhikku" },
  { name: "Bhikku Nanda", monastery: "Kataragama Viharaya", province: "Southern", role: "High Bhikku" },
  { name: "Samanera Pema", monastery: "Aluvihare Temple", province: "Central", role: "Samanera" },
  { name: "Samanera Sanga", monastery: "Ridi Viharaya", province: "North Western", role: "Samanera" },
  { name: "Samanera Aruna", monastery: "Nagadeepa Viharaya", province: "Northern", role: "Samanera" },
];

const INITIAL_REQUESTS: PrintRequest[] = [
  {
    id: "VR-2024-001",
    viharaName: "Sri Sudarshanaramaya",
    district: "Colombo",
    chiefIncumbent: "Ven. Galle Pannasara Thero",
    submissionDate: "2024-11-15",
    status: "PENDING",
  },
  {
    id: "VR-2024-002",
    viharaName: "Gangaramaya Temple",
    district: "Colombo",
    chiefIncumbent: "Ven. Kirinde Assaji Thero",
    submissionDate: "2024-11-14",
    status: "APPROVED",
  },
  {
    id: "VR-2024-003",
    viharaName: "Kelaniya Raja Maha Vihara",
    district: "Gampaha",
    chiefIncumbent: "Ven. Kollupitiye Mahinda Thero",
    submissionDate: "2024-11-13",
    status: "COMPLETED",
  },
];

type DetailCardProps = {
  bhikku: Bhikku;
  onEdit: () => void;
  onNext: () => void;
};

function SelectedBhikkuCard({ bhikku, onEdit, onNext }: DetailCardProps) {
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
          <div style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>{bhikku.name}</div>
          <div style={{ color: "#475569", fontSize: "14px" }}>{bhikku.role}</div>
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
      <div style={{ color: "#334155", fontSize: "14px" }}>
        <div>Monastery: {bhikku.monastery || "-"}</div>
        <div>Province: {bhikku.province || "-"}</div>
      </div>
      <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
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

export default function ReprintRequest() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("list");
  const [requests, setRequests] = useState<PrintRequest[]>(INITIAL_REQUESTS);
  const [step, setStep] = useState<Step>("select");
  const [role, setRole] = useState<Role>("High Bhikku");
  const [search, setSearch] = useState("");
  const [selectedBhikku, setSelectedBhikku] = useState<Bhikku | null>(null);
  const [formValues, setFormValues] = useState({
    receiptNo: "",
    amount: "",
    date: "",
    remarks: "",
  });

  const filteredOptions = useMemo(() => {
    return BIKKHUS.filter(
      (b) => b.role === role && (search.trim().length === 0 || b.name.toLowerCase().includes(search.trim().toLowerCase()))
    );
  }, [role, search]);

  const canProceedSelection = !!selectedBhikku;
  const canSubmitForm = formValues.receiptNo && formValues.amount && formValues.date;

  const resetFlow = () => {
    setStep("select");
    setSelectedBhikku(null);
    setSearch("");
    setFormValues({ receiptNo: "", amount: "", date: "", remarks: "" });
  };

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil(requests.length / pageSize));
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return requests.slice(start, start + pageSize);
  }, [requests, currentPage]);

  const goToPage = (page: number) => {
    const clamped = Math.min(Math.max(page, 1), totalPages);
    setCurrentPage(clamped);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextId = `VR-2024-${(requests.length + 1).toString().padStart(3, "0")}`;
    const newRequest: PrintRequest = {
      id: nextId,
      viharaName: selectedBhikku?.monastery || "Unknown Vihara",
      district: selectedBhikku?.province || "Unknown",
      chiefIncumbent: selectedBhikku ? `Ven. ${selectedBhikku.name} Thero` : "-",
      submissionDate: formValues.date,
      status: "PENDING",
      receiptNo: formValues.receiptNo,
      amount: formValues.amount,
      remarks: formValues.remarks,
    };
    setRequests((prev) => [newRequest, ...prev]);
    resetFlow();
    setMode("list");
    setCurrentPage(1);
  };

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
          <div
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "160px 1fr 150px 220px 160px 140px 200px",
                padding: "12px 16px",
                background: "#f8fafc",
                fontWeight: 700,
                color: "#1f2937",
                fontSize: "14px",
              }}
            >
              <div>ID</div>
              <div>Vihara Name</div>
              <div>District</div>
              <div>Chief Incumbent</div>
              <div>Submission Date</div>
              <div>Status</div>
              <div>Actions</div>
            </div>
            {paginated.map((item, index) => (
              <div
                key={item.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "160px 1fr 150px 220px 160px 140px 200px",
                  padding: "14px 16px",
                  background: index % 2 === 0 ? "white" : "#f9fbff",
                  alignItems: "center",
                  borderTop: "1px solid #f1f5f9",
                  color: "#1f2937",
                  fontSize: "14px",
                }}
              >
                <div style={{ fontWeight: 700 }}>{item.id}</div>
                <div>
                  <div style={{ fontWeight: 600 }}>{item.viharaName}</div>
                  <div style={{ color: "#475569", fontSize: "13px" }}>
                    {item.receiptNo ? "Receipt: " + item.receiptNo : "-"}
                  </div>
                </div>
                <div>{item.district}</div>
                <div style={{ color: "#334155" }}>{item.chiefIncumbent}</div>
                <div>{item.submissionDate}</div>
                <div>
                  <StatusPill status={item.status} />
                </div>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button
                    onClick={() => router.push(`/print-request/print-preview/${item.id}`)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "none",
                      background: "#0ea5e9",
                      color: "white",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    View
                  </button>
                </div>
              </div>
            ))}
            {paginated.length === 0 && (
              <div style={{ padding: "16px", textAlign: "center", color: "#475569" }}>No records found</div>
            )}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "12px",
              fontSize: "14px",
              color: "#475569",
            }}
          >
            <div>
              Showing {requests.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, requests.length)} of {requests.length} entries
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <button
                onClick={() => goToPage(1)}
                disabled={currentPage === 1}
                style={{
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  background: currentPage === 1 ? "#f8fafc" : "white",
                  color: currentPage === 1 ? "#cbd5e1" : "#0f172a",
                  cursor: currentPage === 1 ? "not-allowed" : "pointer",
                }}
              >
                {"<<"}
              </button>
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                style={{
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  background: currentPage === 1 ? "#f8fafc" : "white",
                  color: currentPage === 1 ? "#cbd5e1" : "#0f172a",
                  cursor: currentPage === 1 ? "not-allowed" : "pointer",
                }}
              >
                {"<"}
              </button>
              <div style={{ fontWeight: 600 }}>Page {currentPage} of {totalPages}</div>
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                style={{
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  background: currentPage === totalPages ? "#f8fafc" : "white",
                  color: currentPage === totalPages ? "#cbd5e1" : "#0f172a",
                  cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                }}
              >
                {">"}
              </button>
              <button
                onClick={() => goToPage(totalPages)}
                disabled={currentPage === totalPages}
                style={{
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  background: currentPage === totalPages ? "#f8fafc" : "white",
                  color: currentPage === totalPages ? "#cbd5e1" : "#0f172a",
                  cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                }}
              >
                {">>"}
              </button>
            </div>
          </div>
        </div>
      )}

      {mode === "create" && step === "select" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "8px", color: "#475569", fontWeight: 600 }}>
              Select type
            </label>
            <select
              value={role}
              onChange={(e) => {
                const nextRole = e.target.value as Role;
                setRole(nextRole);
                setSelectedBhikku(null);
                setSearch("");
              }}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "10px",
                border: "1px solid #e2e8f0",
                background: "#f8fafc",
                color: "#0f172a",
              }}
            >
              <option value="High Bhikku">High Bhikku</option>
              <option value="Samanera">Samanera</option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "8px", color: "#475569", fontWeight: 600 }}>
              Bhikku (autocomplete)
            </label>
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelectedBhikku(null);
              }}
              placeholder="Search and select bhikku"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "10px",
                border: "1px solid #e2e8f0",
                background: "#f8fafc",
              }}
            />
            {filteredOptions.length > 0 && (
              <div
                style={{
                  marginTop: "8px",
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  maxHeight: "180px",
                  overflowY: "auto",
                  background: "white",
                }}
              >
                {filteredOptions.map((bhikku) => (
                  <button
                    key={bhikku.name}
                    onClick={() => {
                      setSelectedBhikku(bhikku);
                      setSearch(bhikku.name);
                    }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "10px 12px",
                      border: "none",
                      borderBottom: "1px solid #f1f5f9",
                      background: "white",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontWeight: 600, color: "#0f172a" }}>{bhikku.name}</div>
                    <div style={{ color: "#475569", fontSize: "13px" }}>{bhikku.monastery || "No monastery"}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              disabled={!canProceedSelection}
              onClick={() => setStep("verify")}
              style={{
                padding: "10px 16px",
                borderRadius: "10px",
                border: "none",
                background: canProceedSelection ? "#0ea5e9" : "#cbd5e1",
                color: "white",
                cursor: canProceedSelection ? "pointer" : "not-allowed",
                fontWeight: 600,
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {mode === "create" && step === "verify" && selectedBhikku && (
        <SelectedBhikkuCard bhikku={selectedBhikku} onEdit={() => setStep("select")} onNext={() => setStep("form")} />
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
            <div>
              <label style={{ display: "block", marginBottom: "8px", color: "#475569", fontWeight: 600 }}>
                Date
              </label>
              <input
                type="date"
                value={formValues.date}
                onChange={(e) => setFormValues((v) => ({ ...v, date: e.target.value }))}
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
              disabled={!canSubmitForm}
              style={{
                padding: "10px 16px",
                borderRadius: "10px",
                border: "none",
                background: canSubmitForm ? "#0ea5e9" : "#cbd5e1",
                color: "white",
                cursor: canSubmitForm ? "pointer" : "not-allowed",
                fontWeight: 600,
              }}
            >
              Submit
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
