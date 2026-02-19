"use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { FooterBar } from "@/components/FooterBar";
import { _manageSecurityCouncil } from "@/services/securityCouncil";
import { useRouter } from "next/navigation";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AutocompleteBhikkhu from "@/components/securityCouncil/AutocompleteBhikkhu";

type ManageResponse = {
  status?: string;
  success?: boolean;
  message?: string;
  data?: unknown;
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

export default function CreateSecurityCouncilPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM });
  const [templeDisplay, setTempleDisplay] = useState("");

  const handleInputChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreate = async () => {
    if (!form.temple_trn.trim()) {
      toast.error("Temple TRN is required.");
      return;
    }

    setSaving(true);
    try {
      const response = await _manageSecurityCouncil({
        action: "CREATE",
        payload: {
          data: {
            ...form,
            temple_trn: form.temple_trn.trim(),
          },
        },
      });
      const payload = response?.data as ManageResponse | undefined;
      if (payload?.status && payload.status !== "success") {
        throw new Error(payload?.message || "Failed to create record.");
      }
      if (payload?.success === false) {
        throw new Error(payload?.message || "Failed to create record.");
      }

      toast.success(payload?.message || "Record created successfully.");
      setForm({ ...EMPTY_FORM });
      setTempleDisplay("");
      router.push("/sasanarakshaka");
    } catch (err: any) {
      toast.error(parseApiError(err, "Failed to create record."));
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
                  Create Sasana Arakshaka Record
                </h1>
                <p className="text-sm text-gray-500">
                  Enter details to create a new record.
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

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="lg:col-span-2">
                <AutocompleteBhikkhu
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

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleCreate}
                disabled={saving}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Create Record"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setForm({ ...EMPTY_FORM });
                  setTempleDisplay("");
                }}
                disabled={saving}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Clear
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
