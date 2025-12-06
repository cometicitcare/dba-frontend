"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { FooterBar } from "@/components/FooterBar";
import { BhikkhuAutocomplete, BhikkhuStatusSelect, DateField, TempleAutocomplete, toYYYYMMDD } from "@/components/Bhikku/Add";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { _manageHighBhikku } from "@/services/bhikku";
import { getStoredUserData, UserData } from "@/utils/userData";

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

export default function AddUpasampadaPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState<UpasampadaForm>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const BHIKKU_MANAGEMENT_DEPARTMENT = 'Bhikku Management';
  const ADMIN_ROLE_LEVEL = 'ADMIN';
  const [accessChecked, setAccessChecked] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const totalSteps = FORM_STEPS.length;
  const currentStepConfig = FORM_STEPS[currentStep - 1];
  const stepRequirements = REQUIRED_BY_STEP[currentStep] ?? [];
  const stepIsValid = useMemo(() => {
    return stepRequirements.every((field) => {
      const value = form[field];
      return typeof value === "string" ? value.trim().length > 0 : Boolean(value);
    });
  }, [form, stepRequirements]);
  const isLastStep = currentStep === totalSteps;

  const updateField = (field: keyof UpasampadaForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const goNext = () => setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
  const goBack = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isLastStep || !stepIsValid || submitting) return;
    setSubmitting(true);

    const today = toYYYYMMDD(new Date().toISOString());

    const requestBody = {
      action: "CREATE",
      payload: {
        data: {
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
        },
      },
    };

    try {
      await _manageHighBhikku(requestBody as any);

      toast.success("Upasampada record saved.", {
        autoClose: 1200,
        onClose: () => router.push("/bhikkhu"),
      });
      setTimeout(() => router.push("/bhikkhu"), 1400);
    } catch (error: any) {
      const message = error?.message ?? "Failed to save record.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
  const stored = getStoredUserData();
  if (!stored || stored.department !== BHIKKU_MANAGEMENT_DEPARTMENT) {
    setAccessDenied(true);
    router.replace('/');
    return;
  }

  setUserData(stored);
  setAccessChecked(true);
  }, [router]);

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

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <BhikkhuAutocomplete
                id="bhikkhu-search"
                label="Search Bhikkhu"
                initialDisplay={form.candidateDisplay}
                onPick={({ regn, display }) =>
                  setForm((prev) => ({
                    ...prev,
                    candidateRegNo: regn ?? "",
                    candidateDisplay: display,
                  }))
                }
                required
              />
              {form.candidateRegNo ? (
                <p className="mt-2 text-sm text-slate-500">Linked Bhikkhu: {form.candidateDisplay}</p>
              ) : null}
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
            <TextField
              id="samanera-serial"
              label="Serial Number in Samanera Register, if any"
              value={form.samaneraSerial}
              onChange={(v) => updateField("samaneraSerial", v)}
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
                    <h1 className="text-2xl font-bold text-white mb-1">Upasampada Registration</h1>
                    <p className="text-slate-300 text-sm">Provide the higher-ordination details for the selected Bhikkhu.</p>
                  </div>
                </div>
              </div>

              <div className="px-4 md:px-10 py-6">
                <div className="flex items-center justify-between mb-6">
                  {FORM_STEPS.map((step, idx) => {
                    const stepNumber = idx + 1;
                    return (
                      <div key={step.id} className="flex items-center flex-1">
                        <div className="flex flex-col items-center flex-1">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                              currentStep > stepNumber
                                ? "bg-green-500 text-white"
                                : currentStep === stepNumber
                                  ? "bg-slate-700 text-white ring-4 ring-slate-200"
                                  : "bg-slate-200 text-slate-400"
                            }`}
                          >
                            {currentStep > stepNumber ? "✓" : stepNumber}
                          </div>
                          <span
                            className={`text-[11px] mt-2 font-medium text-center ${
                              currentStep >= stepNumber ? "text-slate-700" : "text-slate-400"
                            }`}
                          >
                            {step.title}
                          </span>
                        </div>
                        {idx < totalSteps - 1 && (
                          <div
                            className={`h-1 flex-1 mx-2 rounded transition-all duration-300 ${
                              currentStep > stepNumber ? "bg-green-500" : "bg-slate-200"
                            }`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                <form className="space-y-8" onSubmit={handleSubmit}>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">{currentStepConfig.title}</h2>
                    <p className="text-sm text-slate-500 mt-1">{currentStepConfig.description}</p>
                  </div>

                  <div className="min-h-[360px]">{renderStep()}</div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={goBack}
                      disabled={currentStep === 1}
                      className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all ${
                        currentStep === 1 ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                      }`}
                    >
                      Back
                    </button>
                    <div className="flex items-center gap-3">
                      {currentStep < totalSteps && (
                        <button
                          type="button"
                          onClick={goNext}
                          disabled={!stepIsValid}
                          className="flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-700 text-white rounded-lg font-medium hover:bg-slate-800 transition-all disabled:opacity-60"
                        >
                          Continue
                        </button>
                      )}
                      {isLastStep && (
                        <button
                          type="submit"
                          disabled={!stepIsValid || submitting}
                          className="flex items-center justify-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-all disabled:opacity-60"
                        >
                          {submitting ? "Saving…" : "Submit record"}
                        </button>
                      )}
                    </div>
                  </div>
                </form>
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
