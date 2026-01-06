// app/(whatever)/bhikkhu/add/page.tsx
"use client";

import React, { useMemo, useRef, useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { _manageBhikku } from "@/services/bhikku";
import { FooterBar } from "@/components/FooterBar";
import { TopBar } from "@/components/TopBar";
import { Sidebar } from "@/components/Sidebar";
import selectionsData from "@/utils/selectionsData.json";
import { BHIKKU_MANAGEMENT_DEPARTMENT } from "@/utils/config";
import {
  DateField,
  LocationPicker,
  BhikkhuAutocomplete,
  TempleAutocomplete,
  BhikkhuCategorySelect,
  BhikkhuStatusSelect,
  bhikkhuSteps,
  bhikkhuInitialValues,
  toYYYYMMDD,
  validateField,
  Errors,
} from "@/components/Bhikku/Add";
import AutocompleteTempleAddress from "@/components/Bhikku/Add/AutocompleteTempleAddress";

// Toasts
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css"; // If Next.js complains about global CSS, move this import to your root layout.

// Types local to page
type NikayaAPIItem = {
  nikaya: { code: string; name: string };
  main_bhikku: {
    regn: string; gihiname: string; mahananame: string; current_status: string;
    parshawaya: string; livtemple: string; mahanatemple: string; address: string;
  } | null;
  parshawayas: Array<{ code: string; name: string; remarks?: string; start_date?: string; nayaka_regn?: string; nayaka?: any }>;
};

const STATIC_NIKAYA_DATA: NikayaAPIItem[] = Array.isArray((selectionsData as any)?.nikayas)
  ? ((selectionsData as any).nikayas as NikayaAPIItem[])
  : [];

// Import after types to avoid cycle
import type { BhikkhuForm, StepConfig } from "@/components/Bhikku/Add";
import { getStoredUserData, UserData } from "@/utils/userData";

const NOVICE_CATEGORY_CODE = "CAT03";
const OMITTED_PERSONAL_FIELDS: Array<keyof BhikkhuForm> = ["br_email", "br_mobile", "br_fathrsaddrs", "br_fathrsmobile"];
const OPTIONAL_LOCATION_FIELDS: Array<keyof BhikkhuForm> = ["br_korale", "br_pattu", "br_division", "br_vilage", "br_gndiv"];

export const dynamic = "force-dynamic";

function AddBhikkhuPageInner() {
  const router = useRouter(); // redirect after toast
  const search = useSearchParams();
  const bhikkhuId = search.get("id") || undefined;

  const steps = useMemo(() => {
    return bhikkhuSteps().map((step) => {
      if (step.id === 1) {
        return {
          ...step,
          fields: step.fields.filter((field) => !OMITTED_PERSONAL_FIELDS.includes(field.name)),
        };
      }
      if (step.id === 2) {
        return {
          ...step,
          fields: step.fields.map((field) =>
            OPTIONAL_LOCATION_FIELDS.includes(field.name)
              ? { ...field, rules: field.rules ? { ...field.rules, required: false } : { required: false } }
              : field
          ),
        };
      }
      return step;
    });
  }, []);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [values, setValues] = useState<Partial<BhikkhuForm>>({
    ...bhikkhuInitialValues,
    br_cat: NOVICE_CATEGORY_CODE,
  });
  const [errors, setErrors] = useState<Errors<BhikkhuForm>>({});
  const [submitting, setSubmitting] = useState(false);
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [accessChecked, setAccessChecked] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);


  const reviewEnabled = true;
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const effectiveSteps: Array<StepConfig<BhikkhuForm>> = useMemo(() => {
    if (!reviewEnabled) return steps;
    return [...steps, { id: steps.length + 1, title: "Review & Confirm", fields: [] }];
  }, [steps, reviewEnabled]);

  const isReview = reviewEnabled && currentStep === effectiveSteps.length;
  const current = effectiveSteps[currentStep - 1];
  const stepTitle = current?.title ?? "";

  const fieldLabels: Record<string, string> = useMemo(() => {
    const map: Record<string, string> = {};
    steps.forEach((s) => s.fields.forEach((f) => (map[String(f.name)] = f.label)));
    return map;
  }, [steps]);

  const scrollTop = () => sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const handleInputChange = (name: keyof BhikkhuForm, value: string) => {
    const isDateField =
      name === "br_reqstdate" ||
      name === "br_dofb" ||
      name === "br_mahanadate" ||
      name === "br_declaration_date";
    const nextVal = isDateField ? value : value;

    setValues((prev) => {
      const next = { ...prev, [name]: nextVal };
      const cfg = steps.flatMap((s) => s.fields).find((f) => f.name === name);
      if (cfg) {
        const msg = validateField(cfg, nextVal, next, today);
        setErrors((e) => ({ ...e, [name]: msg }));
      }
      return next;
    });
  };

  const handleSetMany = (patch: Partial<BhikkhuForm>) => {
    setValues((prev) => {
      const next: Partial<BhikkhuForm> = { ...prev, ...patch };
      const cfgMap = new Map<string, any>();
      steps.forEach((s) => s.fields.forEach((f) => cfgMap.set(String(f.name), f)));
      const nextErrors: Errors<BhikkhuForm> = { ...errors };
      Object.keys(patch).forEach((k) => {
        const cfg = cfgMap.get(k);
        if (cfg) {
          const raw = String((next as any)[k] ?? "");
          nextErrors[cfg.name as keyof BhikkhuForm] = validateField(cfg, raw, next, today);
        }
      });
      setErrors(nextErrors);
      return next;
    });
  };

  const validateStep = (stepIndex: number): boolean => {
    const step = effectiveSteps[stepIndex - 1];
    if (!step) return true;
    const nextErrors: Errors<BhikkhuForm> = { ...errors };
    let valid = true;
    for (const f of step.fields) {
      const raw = values[f.name] as unknown as string | undefined;
      const msg = validateField(f, raw, values, today);
      nextErrors[f.name] = msg;
      if (msg) valid = false;
    }
    setErrors(nextErrors);
    if (!valid) scrollTop();
    return valid;
  };

  const validateAll = (): { ok: boolean; firstInvalidStep: number | null } => {
    let firstInvalidStep: number | null = null;
    const aggregated: Errors<BhikkhuForm> = {};
    for (const step of steps) {
      let stepValid = true;
      for (const f of step.fields) {
        const raw = values[f.name] as unknown as string | undefined;
        const msg = validateField(f, raw, values, today);
        aggregated[f.name] = msg;
        if (msg) stepValid = false;
      }
      if (!stepValid && firstInvalidStep == null) firstInvalidStep = step.id;
    }
    setErrors(aggregated);
    return { ok: firstInvalidStep == null, firstInvalidStep };
  };

  const handleNext = () => { if (currentStep < effectiveSteps.length && validateStep(currentStep)) setCurrentStep((s) => s + 1); };
  const handlePrevious = () => { if (currentStep > 1) setCurrentStep((s) => s - 1); };

  const handleSubmit = async () => {
    const { ok, firstInvalidStep } = validateAll();
    if (!ok && firstInvalidStep) { setCurrentStep(firstInvalidStep); scrollTop(); return; }

    try {
      setSubmitting(true);
      const payload: Partial<BhikkhuForm> = {
        ...values,
        br_reqstdate: toYYYYMMDD(values.br_reqstdate),
        br_dofb: toYYYYMMDD(values.br_dofb),
        br_mahanadate: toYYYYMMDD(values.br_mahanadate),
        br_declaration_date: toYYYYMMDD(values.br_declaration_date),
      };
      await _manageBhikku({ action: "CREATE", payload: { data: payload } } as any);

      // Success toast then redirect (delay allows user to see it; move ToastContainer to root for persistence across routes).
      toast.success(bhikkhuId ? "Bhikkhu updated successfully." : "Bhikkhu created successfully.", {
        autoClose: 1200,
        onClose: () => router.push("/bhikkhu"),
      });

      // Fallback redirect in case container unmounts before onClose fires.
      setTimeout(() => router.push("/bhikkhu"), 1400);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to submit. Please try again.";
      toast.error(msg); // Show error toast
    } finally {
      setSubmitting(false);
    }
  };

  // Display/labels for review
  const [display, setDisplay] = useState<{
    br_viharadhipathi?: string;
    br_mahanayaka_name?: string;
    br_mahanayaka_address?: string;
    br_mahanaacharyacd?: string;
    br_mahanatemple?: string;
    br_robing_after_residence_temple?: string;
    br_robing_tutor_residence?: string;
    br_residence_at_declaration?: string;
    br_cat?: string;
    br_currstat?: string;
    br_nikaya?: string;
    br_parshawaya?: string;
  }>({});

  // Nikaya & Parshawa
  const nikayaData = STATIC_NIKAYA_DATA;
  const nikayaLoading = false;
  const nikayaError: string | null = null;

  const findNikayaByCode = useCallback((code?: string | null) => nikayaData.find((n) => n.nikaya.code === (code ?? "")), [nikayaData]);
  const parshawaOptions = useCallback((nikayaCode?: string | null) => findNikayaByCode(nikayaCode)?.parshawayas ?? [], [findNikayaByCode]);

  const onPickNikaya = (code: string) => {
    const item = findNikayaByCode(code);
    handleInputChange("br_nikaya", code);
    setDisplay((d) => ({ ...d, br_nikaya: item ? `${item.nikaya.name} — ${item.nikaya.code}` : code }));

    const autoName = item?.main_bhikku?.mahananame ?? "";
    const autoAddr = item?.main_bhikku?.address ?? "";
    const autoParshaFromMain = item?.main_bhikku?.parshawaya ?? "";

    handleSetMany({
      br_mahanayaka_name: autoName,
      br_mahanayaka_address: autoAddr,
      br_parshawaya: parshawaOptions(code).some((p) => p.code === autoParshaFromMain) ? autoParshaFromMain : "",
    });

    if (autoParshaFromMain) {
      const p = parshawaOptions(code).find((x) => x.code === autoParshaFromMain);
      if (p) setDisplay((d) => ({ ...d, br_parshawaya: `${p.name} — ${p.code}` }));
      else setDisplay((d) => ({ ...d, br_parshawaya: "" }));
    } else {
      setDisplay((d) => ({ ...d, br_parshawaya: "" }));
    }
  };

  const onPickParshawa = (code: string) => {
    handleInputChange("br_parshawaya", code);
    const nikaya = findNikayaByCode(values.br_nikaya);
    const p = nikaya?.parshawayas.find((x) => x.code === code);
    const nayakaName = p?.nayaka?.mahananame ?? "";
    const nayakaAddress = p?.nayaka?.address ?? "";

    handleSetMany({
      br_mahanayaka_name: nayakaName,
      br_mahanayaka_address: nayakaAddress,
    });

    setDisplay((d) => ({
      ...d,
      br_parshawaya: p ? `${p.name} - ${p.code}` : code,
      br_mahanayaka_name: nayakaName,
      br_mahanayaka_address: nayakaAddress,
    }));
  };

  const gridCols = stepTitle === "Birth Location" ? "md:grid-cols-3" : "md:grid-cols-2";

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
                    <h1 className="text-2xl font-bold text-white mb-1">Registration Form</h1>
                    <p className="text-slate-300 text-sm">Please complete all required information</p>
                  </div>
                </div>
              </div>

              <div className="px-4 md:px-10 py-6" ref={sectionRef}>
                {/* Stepper */}
                <div className="flex items-center justify-between mb-6">
                  {effectiveSteps.map((step, idx) => (
                    <div key={step.id} className="flex items-center flex-1">
                      <div className="flex flex-col items-center flex-1">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${currentStep > step.id ? "bg-green-500 text-white" : currentStep === step.id ? "bg-slate-700 text-white ring-4 ring-slate-200" : "bg-slate-200 text-slate-400"}`}>
                          {currentStep > step.id ? "✓" : step.id}
                        </div>
                        <span className={`text-[11px] mt-2 font-medium text-center ${currentStep >= step.id ? "text-slate-700" : "text-slate-400"}`}>{step.title}</span>
                      </div>
                      {idx < effectiveSteps.length - 1 && <div className={`h-1 flex-1 mx-2 rounded transition-all duration-300 ${currentStep > step.id ? "bg-green-500" : "bg-slate-200"}`} />}
                    </div>
                  ))}
                </div>

                {/* Form sections */}
                <div className="min-h-[360px]">
                  <h2 className="text-xl font-bold text-slate-800 mb-5">{stepTitle}</h2>

                  {!isReview && (
                    <div className={`grid grid-cols-1 ${gridCols} gap-5`}>
                      {current.fields.map((f) => {
                        const id = String(f.name);
                        const val = (values[f.name] as unknown as string) ?? "";
                        const err = errors[f.name];
                        if (id === "br_province") {
                          const selection = {
                            provinceCode: (values.br_province as string) || undefined,
                            districtCode: (values.br_district as string) || undefined,
                            divisionCode: (values.br_division as string) || undefined,
                            gnCode: (values.br_gndiv as string) || undefined,
                          };
                          return (
                            <div key={id} className={stepTitle === "Birth Location" ? "md:col-span-3" : "md:col-span-2"}>
                              <LocationPicker
                                value={selection}
                                onChange={(sel) => {
                                  handleSetMany({
                                    br_province: sel.provinceCode ?? "",
                                    br_district: sel.districtCode ?? "",
                                    br_division: sel.divisionCode ?? "",
                                    br_gndiv: sel.gnCode ?? "",
                                  });
                                }}
                                required
                              />
                              {err ? <p className="mt-1 text-sm text-red-600">{err}</p> : null}
                            </div>
                          );
                        }

                        if (id === "br_birthpls") {
                          return (
                            <div key={id} className={stepTitle === "Birth Location" ? "md:col-span-3" : ""}>
                              <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-2">{f.label}</label>
                              <input
                                id={id}
                                type="text"
                                value={val}
                                onChange={(e) => handleInputChange(f.name, e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                              />
                              {err ? <p className="mt-1 text-sm text-red-600">{err}</p> : null}
                            </div>
                          );
                        }

                        if (id === "br_viharadhipathi") {
                          return (
                            <div key={id}>
                              <BhikkhuAutocomplete
                                id={id}
                                label={f.label}
                                required={!!f.rules?.required}
                                placeholder="Search and pick — saves REGN"
                                storeRegn
                                initialDisplay={display.br_viharadhipathi ?? ""}
                                onPick={({ regn, display: disp }) => {
                                  handleInputChange("br_viharadhipathi", regn ?? "");
                                  setDisplay((d) => ({ ...d, br_viharadhipathi: disp }));
                                }}
                              />
                              {err ? <p className="mt-1 text-sm text-red-600">{err}</p> : null}
                            </div>
                          );
                        }

                        if (id === "br_nikaya") {
                          return (
                            <div key={id}>
                              <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-2">{f.label}</label>
                              {nikayaLoading ? (
                                <div className="text-sm text-slate-600">Loading Nikaya…</div>
                              ) : nikayaError ? (
                                <div role="alert" className="text-sm text-red-600">Error: {nikayaError}</div>
                              ) : (
                                <select
                                  id={id}
                                  value={values.br_nikaya ?? ""}
                                  onChange={(e) => onPickNikaya(e.target.value)}
                                  required={!!f.rules?.required}
                                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                                >
                                  <option value="">Select Nikaya</option>
                                  {nikayaData.map((n) => (
                                    <option key={n.nikaya.code} value={n.nikaya.code}>
                                      {n.nikaya.name} — {n.nikaya.code}
                                    </option>
                                  ))}
                                </select>
                              )}
                              {err ? <p className="mt-1 text-sm text-red-600">{err}</p> : null}
                            </div>
                          );
                        }

                        if (id === "br_parshawaya") {
                          const options = parshawaOptions(values.br_nikaya);
                          return (
                            <div key={id}>
                              <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-2">{f.label}</label>
                              <select
                                id={id}
                                value={values.br_parshawaya ?? ""}
                                onChange={(e) => onPickParshawa(e.target.value)}
                                required={!!f.rules?.required}
                                disabled={!values.br_nikaya || options.length === 0}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all disabled:bg-slate-100"
                              >
                                <option value="">{values.br_nikaya ? "Select Chapter" : "Select Nikaya first"}</option>
                                {options.map((p) => (
                                  <option key={p.code} value={p.code}>
                                    {p.name} — {p.code}
                                  </option>
                                ))}
                              </select>
                              {err ? <p className="mt-1 text-sm text-red-600">{err}</p> : null}
                            </div>
                          );
                        }

                        if (id === "br_mahanayaka_name") {
                          return (
                            <div key={id} className="grid grid-cols-1">
                              <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-2">{f.label}</label>
                              <input
                                id={id}
                                type="text"
                                value={val}
                                onChange={(e) => handleInputChange(f.name, e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                                placeholder="Auto-filled from Nikaya, editable…"
                              />
                              {err ? <p className="mt-1 text-sm text-red-600">{err}</p> : null}
                            </div>
                          );
                        }

                        if (id === "br_mahanaacharyacd") {
                          return (
                            <div key={id}>
                              <BhikkhuAutocomplete
                                id={id}
                                label={f.label}
                                required={!!f.rules?.required}
                                placeholder="Search and pick — saves REGN"
                                storeRegn
                                initialDisplay={display.br_mahanaacharyacd ?? ""}
                                onPick={({ regn, display: disp }) => {
                                  handleInputChange("br_mahanaacharyacd", regn ?? "");
                                  setDisplay((d) => ({ ...d, br_mahanaacharyacd: disp }));
                                }}
                              />
                              {err ? <p className="mt-1 text-sm text-red-600">{err}</p> : null}
                            </div>
                          );
                        }

                        if (id === "br_robing_tutor_residence") {
                          return (
                            <div key={id}>
                              <TempleAutocomplete
                                id={id}
                                label={f.label}
                                required={!!f.rules?.required}
                                placeholder="Search temple — saves TRN"
                                storeTrn
                                initialDisplay={display.br_robing_tutor_residence ?? ""}
                                onPick={({ trn, display: disp }) => {
                                  handleInputChange("br_robing_tutor_residence", trn ?? "");
                                  setDisplay((d) => ({ ...d, br_robing_tutor_residence: disp }));
                                }}
                              />
                              {err ? <p className="mt-1 text-sm text-red-600">{err}</p> : null}
                            </div>
                          );
                        }

                        if (id === "br_mahanatemple") {
                          return (
                            <div key={id}>
                              <TempleAutocomplete
                                id={id}
                                label={f.label}
                                required={!!f.rules?.required}
                                placeholder="Search temple — saves TRN"
                                storeTrn
                                initialDisplay={display.br_mahanatemple ?? ""}
                                onPick={({ trn, display: disp }) => {
                                  handleInputChange("br_mahanatemple", trn ?? "");
                                  setDisplay((d) => ({ ...d, br_mahanatemple: disp }));
                                }}
                              />
                              {err ? <p className="mt-1 text-sm text-red-600">{err}</p> : null}
                            </div>
                          );
                        }

                        if (id === "br_robing_after_residence_temple") {
                          return (
                            <div key={id}>
                              <TempleAutocomplete
                                id={id}
                                label={f.label}
                                required={!!f.rules?.required}
                                placeholder="Search temple — saves TRN"
                                storeTrn
                                initialDisplay={display.br_robing_after_residence_temple ?? ""}
                                onPick={({ trn, display: disp }) => {
                                  handleInputChange("br_robing_after_residence_temple", trn ?? "");
                                  setDisplay((d) => ({ ...d, br_robing_after_residence_temple: disp }));
                                }}
                              />
                              {err ? <p className="mt-1 text-sm text-red-600">{err}</p> : null}
                            </div>
                          );
                        }

                        if (id === "br_cat") {
                          return (
                            <div key={id}>
                              <BhikkhuCategorySelect
                                id={id}
                                label={f.label}
                                required={!!f.rules?.required}
                                value={values.br_cat ?? NOVICE_CATEGORY_CODE}
                                disabled
                              />
                              {err ? <p className="mt-1 text-sm text-red-600">{err}</p> : null}
                            </div>
                          );
                        }

                        if (id === "br_currstat") {
                          return (
                            <div key={id}>
                              <BhikkhuStatusSelect
                                id={id}
                                label={f.label}
                                required={!!f.rules?.required}
                                initialCode={values.br_currstat ?? ""}
                                onPick={({ code, display: disp }) => {
                                  handleInputChange("br_currstat", code);
                                  setDisplay((d) => ({ ...d, br_currstat: disp }));
                                }}
                              />
                              {err ? <p className="mt-1 text-sm text-red-600">{err}</p> : null}
                            </div>
                          );
                        }

                        if (id === "br_residence_at_declaration") {
                          return (
                            <div key={id}>
                              <AutocompleteTempleAddress
                                id={id}
                                label={f.label}
                                required={!!f.rules?.required}
                                placeholder="Type any address or pick a temple address…"
                                initialDisplay={display.br_residence_at_declaration ?? values.br_residence_at_declaration ?? ""}
                                onPick={({ address, trn, display: disp }) => {
                                  handleInputChange("br_residence_at_declaration", disp ?? address ?? "");
                                  setDisplay((d) => ({ ...d, br_residence_at_declaration: disp }));
                                }}
                              />
                              {err ? <p className="mt-1 text-sm text-red-600">{err}</p> : null}
                            </div>
                          );
                        }

                        if (f.type === "textarea") {
                          const idStr = String(f.name);
                          const span2 = idStr === "br_mahanayaka_address" || idStr === "br_remarks";
                          const spanClass = idStr === "br_remarks" ? (gridCols.includes("md:grid-cols-3") ? "md:col-span-3" : "md:col-span-2") : "";
                          return (
                            <div key={idStr} className={span2 ? spanClass : ""}>
                              <label htmlFor={idStr} className="block text-sm font-medium text-slate-700 mb-2">{f.label}</label>
                              <textarea
                                id={idStr}
                                value={val}
                                rows={f.rows ?? 4}
                                onChange={(e) => handleInputChange(f.name, e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all resize-none"
                                placeholder={f.placeholder ?? (idStr === "br_mahanayaka_address" ? "Auto-filled from Nikaya, editable…" : undefined)}
                              />
                              {err ? <p className="mt-1 text-sm text-red-600">{err}</p> : null}
                            </div>
                          );
                        }

                        if (f.type === "date") {
                          return (
                            <DateField
                              key={id}
                              id={id}
                              label={f.label}
                              value={val}
                              required={!!f.rules?.required}
                              placeholder="YYYY-MM-DD"
                              error={err}
                              onChange={(v) => handleInputChange(f.name, v)}
                            />
                          );
                        }

                        if (id === "br_district" || id === "br_division" || id === "br_gndiv") return null;

                        return (
                          <div key={id} className="grid grid-cols-1">
                            <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-2">{f.label}</label>
                            <input
                              id={id}
                              type={f.type}
                              value={val}
                              onChange={(e) => handleInputChange(f.name, e.target.value)}
                              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                              placeholder={f.placeholder}
                            />
                            {err ? <p className="mt-1 text-sm text-red-600">{err}</p> : null}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {isReview && (
                    <div className="space-y-6">
                      <p className="text-slate-600">Review your details below. Use <span className="font-medium">Edit</span> to jump to a section.</p>
                      {steps.map((s) => (
                        <div key={s.id} className="border border-slate-200 rounded-xl p-4 md:p-5">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-semibold text-slate-800">{s.title}</h3>
                            <button className="px-3 py-1.5 text-sm bg-slate-200 rounded-lg hover:bg-slate-300" onClick={() => setCurrentStep(s.id)}>Edit</button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {s.fields.map((f) => {
                              const key = String(f.name);
                              const v0 = (values[f.name] as unknown as string) ?? "";
                              const v = f.type === "date" ? toYYYYMMDD(v0) : v0;
                              const shown =
                                key === "br_viharadhipathi" ? display.br_viharadhipathi || v :
                                key === "br_mahanayaka_name" ? display.br_mahanayaka_name || v :
                                key === "br_mahanaacharyacd" ? display.br_mahanaacharyacd || v :
                                key === "br_mahanatemple" ? display.br_mahanatemple || v :
                                key === "br_robing_after_residence_temple" ? display.br_robing_after_residence_temple || v :
                                key === "br_robing_tutor_residence" ? display.br_robing_tutor_residence || v :
                                key === "br_residence_at_declaration" ? display.br_residence_at_declaration || v :
                                key === "br_cat" ? display.br_cat || v :
                                key === "br_currstat" ? display.br_currstat || v :
                                key === "br_nikaya" ? display.br_nikaya || v :
                                key === "br_parshawaya" ? display.br_parshawaya || v : v;
                              return (
                                <div key={key} className="bg-slate-50 rounded-lg p-3">
                                  <div className="text-xs text-slate-500">{fieldLabels[key]}</div>
                                  <div className="text-sm font-medium text-slate-800 break-words">{shown || <span className="text-slate-400">—</span>}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col md:flex-row gap-4 md:gap-0 md:justify-between md:items-center mt-8 pt-6 border-t border-slate-200">
                  <button
                    onClick={handlePrevious}
                    disabled={currentStep === 1}
                    className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all ${currentStep === 1 ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-slate-200 text-slate-700 hover:bg-slate-300"}`}
                  >
                    ‹ Previous
                  </button>

                  <div className="text-sm text-slate-600 font-medium text-center">Step {currentStep} of {effectiveSteps.length}</div>

                  {currentStep < effectiveSteps.length ? (
                    <button onClick={handleNext} className="flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-700 text-white rounded-lg font-medium hover:bg-slate-800 transition-all">
                      Next ›
                    </button>
                  ) : (
                    <button
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="flex items-center justify-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-all disabled:opacity-70"
                    >
                      {submitting ? "Submitting..." : bhikkhuId ? "Update" : "Submit"}
                    </button>
                  )}
                </div>

              </div>
            </div>
          </div>
        </main>
        <FooterBar />
      </div>

      {/* Toast container must exist in the tree to render toasts */}
      <ToastContainer position="top-right" newestOnTop closeOnClick pauseOnHover />
    </div>
  );
}

export default function AddBhikkhuPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-600">Loading…</div>}>
      <AddBhikkhuPageInner />
    </Suspense>
  );
}
