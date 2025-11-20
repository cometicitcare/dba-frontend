"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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

const REQUESTS: PrintRequest[] = [
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
    receiptNo: "RC-002",
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

type PageProps = { params: { id: string } };

export default function PrintPreviewPage({ params }: PageProps) {
  const router = useRouter();
  const request = useMemo(
    () => REQUESTS.find((r) => r.id === decodeURIComponent(params.id)),
    [params.id]
  );

  const [status, setStatus] = useState<RequestStatus>(request?.status ?? "PENDING");
  const [remark, setRemark] = useState<string>(request?.remarks ?? "");
  const [showReject, setShowReject] = useState(false);
  const [rejectInput, setRejectInput] = useState("");

  if (!request) {
    return (
      <div className="p-6">
        <button
          onClick={() => router.back()}
          className="mb-4 rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          Back
        </button>
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-slate-700">
          Record not found.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Print Request</h1>
            <p className="text-slate-500">ID: {request.id}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setStatus("APPROVED")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${status === "APPROVED" ? "bg-emerald-500" : "bg-emerald-600 hover:bg-emerald-700"}`}
            >
              Approve
            </button>
            <button
              onClick={() => {
                setRejectInput("");
                setShowReject(true);
              }}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
            >
              Reject
            </button>
            <button
              onClick={() => router.back()}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Back
            </button>
            {status === "APPROVED" ? (
              <button
                onClick={() => window.print()}
                className="rounded-lg border border-sky-500 px-4 py-2 text-sm font-semibold text-sky-600 hover:bg-sky-50"
              >
                Print
              </button>
            ) : null}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Certificate number</p>
              <p className="text-xl font-semibold text-slate-900">{request.id}</p>
              <div className="mt-2 flex items-center gap-2">
                <StatusPill status={status} />
                {remark ? <span className="text-sm text-slate-500">Remark: {remark}</span> : null}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2">
          <InfoRow label="Vihara Name" value={request.viharaName} />
          <InfoRow label="District" value={request.district} />
          <InfoRow label="Chief Incumbent" value={request.chiefIncumbent} />
          <InfoRow label="Submission Date" value={request.submissionDate} />
          <InfoRow label="Receipt No" value={request.receiptNo ?? "—"} />
          <InfoRow label="Amount" value={request.amount ?? "—"} />
          <div className="md:col-span-2">
            <InfoRow label="Remarks" value={remark || "—"} />
          </div>
        </div>

        <div className="flex justify-center overflow-auto rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div
            id="certificate-print-area"
            className="relative bg-white"
            style={{ width: "8.5in", height: "14in" }}
          >
            <img
              src="/certificate-placeholder.png"
              alt="Certificate"
              className="h-full w-full object-contain"
            />
          </div>
        </div>
      </div>

      {showReject ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowReject(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900">Reject request</h3>
            <p className="mt-1 text-sm text-slate-600">Add a remark before rejecting.</p>
            <textarea
              className="mt-3 w-full rounded-lg border border-slate-200 p-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-200"
              rows={3}
              value={rejectInput}
              onChange={(e) => setRejectInput(e.target.value)}
              placeholder="Enter rejection remark"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowReject(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!rejectInput.trim()) return;
                  setStatus("CANCELLED");
                  setRemark(rejectInput.trim());
                  setShowReject(false);
                }}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                disabled={!rejectInput.trim()}
              >
                Confirm reject
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <style>{`
        @media print {
          @page { margin: 0; }
          body { margin: 0 !important; padding: 0 !important; }
          body * { visibility: hidden; box-shadow: none !important; }
          #certificate-print-area, #certificate-print-area * { visibility: visible; }
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

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <span className="text-sm text-slate-800">{value}</span>
    </div>
  );
}
