"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { FooterBar } from "@/components/FooterBar";
import { _manageSecurityCouncil } from "@/services/securityCouncil";
import { useParams, useRouter } from "next/navigation";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AutocompleteBhikkhu from "@/components/securityCouncil/AutocompleteBhikkhu";

type SecurityCouncilRecord = {
  sar_id?: number;
  temple_trn?: string | null;
  temple?: {
    vh_trn?: string | null;
    vh_vname?: string | null;
    vh_addrs?: string | null;
  } | null;
  temple_address?: string | null;
  mandala_name?: string | null;
  bank_name?: string | null;
  account_number?: string | null;
  president_name?: string | null;
  deputy_president_name?: string | null;
  vice_president_1_name?: string | null;
  vice_president_2_name?: string | null;
  general_secretary_name?: string | null;
  deputy_secretary_name?: string | null;
  treasurer_name?: string | null;
  committee_member_1?: string | null;
  committee_member_2?: string | null;
  committee_member_3?: string | null;
  committee_member_4?: string | null;
  committee_member_5?: string | null;
  committee_member_6?: string | null;
  committee_member_7?: string | null;
  committee_member_8?: string | null;
  chief_organizer_name?: string | null;
};

type ManageResponse = {
  status?: string;
  success?: boolean;
  message?: string;
  data?: SecurityCouncilRecord | SecurityCouncilRecord[];
  errors?: Array<{ field?: string | null; message?: string | null }>;
};

type FormState = {
  temple_trn: string;
  temple_address: string;
  mandala_name: string;
  bank_name: string;
  account_number: string;
  president_name: string;
  deputy_president_name: string;
  vice_president_1_name: string;
  vice_president_2_name: string;
  general_secretary_name: string;
  deputy_secretary_name: string;
  treasurer_name: string;
  committee_member_1: string;
  committee_member_2: string;
  committee_member_3: string;
  committee_member_4: string;
  committee_member_5: string;
  committee_member_6: string;
  committee_member_7: string;
  committee_member_8: string;
  chief_organizer_name: string;
};

const EMPTY_FORM: FormState = {
  temple_trn: "",
  temple_address: "",
  mandala_name: "",
  bank_name: "",
  account_number: "",
  president_name: "",
  deputy_president_name: "",
  vice_president_1_name: "",
  vice_president_2_name: "",
  general_secretary_name: "",
  deputy_secretary_name: "",
  treasurer_name: "",
  committee_member_1: "",
  committee_member_2: "",
  committee_member_3: "",
  committee_member_4: "",
  committee_member_5: "",
  committee_member_6: "",
  committee_member_7: "",
  committee_member_8: "",
  chief_organizer_name: "",
};

function parseApiError(err: any, fallback: string) {
  return err?.response?.data?.message || err?.message || fallback;
}

export default function UpdateSecurityCouncilPage() {
  const router = useRouter();
  const params = useParams();
  const sarId = useMemo(() => {
    const raw = params?.id;
    if (!raw) return null;
    const value = Array.isArray(raw) ? raw[0] : raw;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }, [params]);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM });
  const [templeName, setTempleName] = useState<string>("");
  const [templeInfoAddress, setTempleInfoAddress] = useState<string>("");
  const [templeDisplay, setTempleDisplay] = useState<string>("");

  const fetchRecord = useCallback(async () => {
    if (!sarId) return;
    setLoading(true);
    try {
      const response = await _manageSecurityCouncil({
        action: "READ_ONE",
        payload: { sar_id: sarId },
      });
      const payload = response?.data as ManageResponse | undefined;
      if (payload?.status && payload.status !== "success") {
        throw new Error(payload?.message || "Failed to load record.");
      }
      if (payload?.success === false) {
        throw new Error(payload?.message || "Failed to load record.");
      }

      const record = payload?.data as SecurityCouncilRecord | undefined;
      if (!record) {
        throw new Error("Record not found.");
      }

      setTempleName(record.temple?.vh_vname ?? "");
      setTempleInfoAddress(record.temple?.vh_addrs ?? "");
      const initialDisplay = record.temple?.vh_vname ?? record.temple_trn ?? "";
      setTempleDisplay(initialDisplay);
      setForm({
        temple_trn: record.temple_trn ?? "",
        temple_address: record.temple_address ?? "",
        mandala_name: record.mandala_name ?? "",
        bank_name: record.bank_name ?? "",
        account_number: record.account_number ?? "",
        president_name: record.president_name ?? "",
        deputy_president_name: record.deputy_president_name ?? "",
        vice_president_1_name: record.vice_president_1_name ?? "",
        vice_president_2_name: record.vice_president_2_name ?? "",
        general_secretary_name: record.general_secretary_name ?? "",
        deputy_secretary_name: record.deputy_secretary_name ?? "",
        treasurer_name: record.treasurer_name ?? "",
        committee_member_1: record.committee_member_1 ?? "",
        committee_member_2: record.committee_member_2 ?? "",
        committee_member_3: record.committee_member_3 ?? "",
        committee_member_4: record.committee_member_4 ?? "",
        committee_member_5: record.committee_member_5 ?? "",
        committee_member_6: record.committee_member_6 ?? "",
        committee_member_7: record.committee_member_7 ?? "",
        committee_member_8: record.committee_member_8 ?? "",
        chief_organizer_name: record.chief_organizer_name ?? "",
      });
    } catch (err: any) {
      toast.error(parseApiError(err, "Failed to load record."));
    } finally {
      setLoading(false);
    }
  }, [sarId]);

  useEffect(() => {
    fetchRecord();
  }, [fetchRecord]);

  const handleInputChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleUpdate = async () => {
    if (!sarId) return;
    setSaving(true);
    try {
      const response = await _manageSecurityCouncil({
        action: "UPDATE",
        payload: {
          sar_id: sarId,
          data: {
            ...form,
            temple_trn: form.temple_trn.trim(),
          },
        },
      });
      const payload = response?.data as ManageResponse | undefined;
      if (payload?.status && payload.status !== "success") {
        throw new Error(payload?.message || "Failed to update record.");
      }
      if (payload?.success === false) {
        throw new Error(payload?.message || "Failed to update record.");
      }

      toast.success(payload?.message || "Record updated successfully.");
    } catch (err: any) {
      toast.error(parseApiError(err, "Failed to update record."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-gray-50">
      <TopBar onMenuClick={() => setSidebarOpen((v) => !v)} />
      <Sidebar isOpen={sidebarOpen} />

      <div className={`transition-all duration-300 pt-16 ${sidebarOpen ? "ml-64" : "ml-0"}`}>
        <main className="p-6 pb-24">
          <section className="space-y-6 border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-gray-800">
                  Update Sasana Arakshaka Record
                </h1>
                <p className="text-sm text-gray-500">
                  ID: {sarId ?? "-"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.push("/sasanarakshaka")}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Back to List
              </button>
            </div>

            {loading ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-600">
                Loading record details...
              </div>
            ) : (
              <div className="space-y-6">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <p>
                    <span className="font-semibold">Temple Name:</span>{" "}
                    {templeName || "-"}
                  </p>
                  <p>
                    <span className="font-semibold">Temple Address:</span>{" "}
                    {templeInfoAddress || "-"}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="lg:col-span-2">
                    <AutocompleteBhikkhu
                      key={`${form.temple_trn}-${templeDisplay}`}
                      id="temple_trn_autocomplete"
                      label="Temple"
                      placeholder="Search temple..."
                      required
                      initialDisplay={templeDisplay}
                      onPick={(picked) => {
                        const regn = picked?.regn ?? "";
                        setForm((prev) => ({ ...prev, temple_trn: regn }));
                        setTempleDisplay(picked?.display ?? "");
                      }}
                      onInputChange={(value) => {
                        setTempleDisplay(value);
                        if (!value) {
                          setForm((prev) => ({ ...prev, temple_trn: "" }));
                        }
                      }}
                      showAddButton={false}
                    />
                  </div>
                  <FormInput
                    label="Temple Address"
                    value={form.temple_address}
                    onChange={(val) => handleInputChange("temple_address", val)}
                />
                <FormInput
                  label="Mandala Name"
                  value={form.mandala_name}
                  onChange={(val) => handleInputChange("mandala_name", val)}
                />
                <FormInput
                  label="Bank Name"
                  value={form.bank_name}
                  onChange={(val) => handleInputChange("bank_name", val)}
                />
                <FormInput
                  label="Account Number"
                  value={form.account_number}
                  onChange={(val) => handleInputChange("account_number", val)}
                />
                <FormInput
                  label="President Name"
                  value={form.president_name}
                  onChange={(val) => handleInputChange("president_name", val)}
                />
                <FormInput
                  label="Deputy President Name"
                  value={form.deputy_president_name}
                  onChange={(val) => handleInputChange("deputy_president_name", val)}
                />
                <FormInput
                  label="Vice President 1"
                  value={form.vice_president_1_name}
                  onChange={(val) => handleInputChange("vice_president_1_name", val)}
                />
                <FormInput
                  label="Vice President 2"
                  value={form.vice_president_2_name}
                  onChange={(val) => handleInputChange("vice_president_2_name", val)}
                />
                <FormInput
                  label="General Secretary"
                  value={form.general_secretary_name}
                  onChange={(val) => handleInputChange("general_secretary_name", val)}
                />
                <FormInput
                  label="Deputy Secretary"
                  value={form.deputy_secretary_name}
                  onChange={(val) => handleInputChange("deputy_secretary_name", val)}
                />
                <FormInput
                  label="Treasurer"
                  value={form.treasurer_name}
                  onChange={(val) => handleInputChange("treasurer_name", val)}
                />
                <FormInput
                  label="Committee Member 1"
                  value={form.committee_member_1}
                  onChange={(val) => handleInputChange("committee_member_1", val)}
                />
                <FormInput
                  label="Committee Member 2"
                  value={form.committee_member_2}
                  onChange={(val) => handleInputChange("committee_member_2", val)}
                />
                <FormInput
                  label="Committee Member 3"
                  value={form.committee_member_3}
                  onChange={(val) => handleInputChange("committee_member_3", val)}
                />
                <FormInput
                  label="Committee Member 4"
                  value={form.committee_member_4}
                  onChange={(val) => handleInputChange("committee_member_4", val)}
                />
                <FormInput
                  label="Committee Member 5"
                  value={form.committee_member_5}
                  onChange={(val) => handleInputChange("committee_member_5", val)}
                />
                <FormInput
                  label="Committee Member 6"
                  value={form.committee_member_6}
                  onChange={(val) => handleInputChange("committee_member_6", val)}
                />
                <FormInput
                  label="Committee Member 7"
                  value={form.committee_member_7}
                  onChange={(val) => handleInputChange("committee_member_7", val)}
                />
                <FormInput
                  label="Committee Member 8"
                  value={form.committee_member_8}
                  onChange={(val) => handleInputChange("committee_member_8", val)}
                />
                  <FormInput
                    label="Chief Organizer"
                    value={form.chief_organizer_name}
                    onChange={(val) => handleInputChange("chief_organizer_name", val)}
                  />
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleUpdate}
                disabled={saving || loading || !sarId}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? "Updating..." : "Update Record"}
              </button>
              <button
                type="button"
                onClick={() => fetchRecord()}
                disabled={loading}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Reload
              </button>
            </div>
          </section>
          <FooterBar />
        </main>
      </div>
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
}

type FormInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
};

function FormInput({ label, value, onChange, required, disabled }: FormInputProps) {
  return (
    <label className="flex flex-col gap-1 text-sm text-gray-600">
      <span>
        {label}
        {required ? " *" : ""}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
        disabled={disabled}
      />
    </label>
  );
}
