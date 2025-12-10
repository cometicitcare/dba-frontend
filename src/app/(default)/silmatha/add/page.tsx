"use client";

import React, { Suspense, useMemo, useRef, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { _manageSilmatha } from "@/services/bhikku";
import { FooterBar } from "@/components/FooterBar";
import { TopBar } from "@/components/TopBar";
import { Sidebar } from "@/components/Sidebar";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Errors, FieldConfig, toYYYYMMDD, validateField } from "@/components/silmatha/helpers";
import DateField from "@/components/silmatha/DateField";
import LocationPicker, { LocationSelection } from "@/components/silmatha/LocationPicker";
import SilmathaAutocomplete from "@/components/silmatha/AutocompleteSilmatha";
import TempleAutocomplete from "@/components/silmatha/AutocompleteArama";
import BhikkhuStatusSelect from "@/components/silmatha/StatusSelect";
import { SilmathaForm, silmathaSteps, silmathaInitialValues } from "@/components/silmatha/steps";
import { getStoredUserData } from "@/utils/userData";
import { SILMATHA_MANAGEMENT_DEPARTMENT } from "@/utils/config";


const REVIEW_ENABLED = true;

const LOCATION_FIELDS: Array<keyof SilmathaForm> = [
  "sm_province",
  "sm_district",
  "sm_divisional_secretariat",
  "sm_gn_division",
];

export const dynamic = "force-dynamic";

function SilmathaAddPageInner() {
  const router = useRouter();
  const search = useSearchParams();
  const silmathaId = search.get("id") || undefined;
  const [currentStep, setCurrentStep] = useState(1);
  const [values, setValues] = useState<SilmathaForm>(() => ({ ...silmathaInitialValues }));
  const [errors, setErrors] = useState<Errors<SilmathaForm>>({});
  const [submitting, setSubmitting] = useState(false);
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [accessChecked, setAccessChecked] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [display, setDisplay] = useState<Partial<Record<keyof SilmathaForm, string>>>({});
  const fieldConfigMap = useMemo(() => {
    const map = new Map<keyof SilmathaForm, FieldConfig<SilmathaForm>>();
    silmathaSteps.forEach((step) => step.fields.forEach((field) => map.set(field.name, field)));
    return map;
  }, []);

  const effectiveSteps = useMemo(() => {
    if (!REVIEW_ENABLED) return silmathaSteps;
    return [...silmathaSteps, { id: silmathaSteps.length + 1, title: "Review & Confirm", fields: [] }];
  }, [REVIEW_ENABLED]);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const isReview = REVIEW_ENABLED && currentStep === effectiveSteps.length;
  const current = effectiveSteps[currentStep - 1];
  const stepTitle = current?.title ?? "";

  const fieldLabels = useMemo(() => {
    const map: Record<string, string> = {};
    silmathaSteps.forEach((step) => step.fields.forEach((field) => (map[String(field.name)] = field.label)));
    return map;
  }, []);

  const scrollTop = () => sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const handleInputChange = (name: keyof SilmathaForm, value: string) => {
    const nextVal = value;
    setValues((prev) => {
      const next = { ...prev, [name]: nextVal };
      const cfg = fieldConfigMap.get(name);
      if (cfg) {
        const msg = validateField(cfg, nextVal, next, today);
        setErrors((err) => ({ ...err, [name]: msg }));
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
          const raw = nextValues[cfg.name] ?? "";
          updated[cfg.name] = validateField(cfg, raw, nextValues, today);
        }
      });
      return updated;
    });
  };

  const validateStep = (stepIndex: number) => {
    const step = effectiveSteps[stepIndex - 1];
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

  const validateAll = () => {
    let firstInvalidStep: number | null = null;
    const aggregated: Errors<SilmathaForm> = {};
    for (const step of silmathaSteps) {
      let stepValid = true;
      for (const field of step.fields) {
        const raw = values[field.name] ?? "";
        const msg = validateField(field, raw, values, today);
        aggregated[field.name] = msg;
        if (msg) stepValid = false;
      }
      if (!stepValid && firstInvalidStep == null) firstInvalidStep = step.id;
    }
    setErrors(aggregated);
    return { ok: firstInvalidStep == null, firstInvalidStep };
  };

  const handleNext = () => {
    if (currentStep < effectiveSteps.length && validateStep(currentStep)) {
      setCurrentStep((step) => step + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) setCurrentStep((step) => step - 1);
  };

  const handleSubmit = async () => {
    const { ok, firstInvalidStep } = validateAll();
    if (!ok && firstInvalidStep) {
      setCurrentStep(firstInvalidStep);
      scrollTop();
      return;
    }

    try {
      setSubmitting(true);
      const apiPayload = {
        sil_reqstdate: toYYYYMMDD(values.sm_reqstdate),
        sil_form_id: values.sm_form_number,
        sil_gihiname: values.sm_gihiname,
        sil_dofb: toYYYYMMDD(values.sm_dofb),
        sil_fathrname: values.sm_fathername,
        sil_birthpls: values.sm_birthplace,
        sil_province: values.sm_province,
        sil_district: values.sm_district,
        sil_division: values.sm_divisional_secretariat,
        sil_gndiv: values.sm_gn_division,
        sil_korale: values.sm_korale,
        sil_pattu: values.sm_pattu,
        sil_vilage: values.sm_village,
        sil_aramadhipathi: values.sm_viharadhipathi,
        sil_mahananame: values.sm_robing_name,
        sil_mahanadate: toYYYYMMDD(values.sm_robing_date),
        sil_mahanaacharyacd: values.sm_robing_tutor,
        sil_robing_tutor_residence: values.sm_robing_tutor_residence,
        sil_mahanatemple: values.sm_robing_temple,
        sil_robing_after_residence_temple: values.sm_post_robing_temple,
        sil_declaration_date: toYYYYMMDD(values.sil_declaration_date),
        sil_remarks: values.sil_remarks,
        sil_currstat: values.sil_currstat,
        sil_cat: "CAT01",
        sil_student_signature: values.sil_student_signature === "true",
        sil_acharya_signature: values.sil_acharya_signature === "true",
        sil_aramadhipathi_signature: values.sil_aramadhipathi_signature === "true",
        sil_district_secretary_signature: values.sil_district_secretary_signature === "true",
      };
      await _manageSilmatha({
        action: silmathaId ? "UPDATE" : "CREATE",
        payload: { data: apiPayload },
      } as any);

      toast.success(silmathaId ? "Silmatha updated successfully." : "Silmatha registered successfully.", {
        autoClose: 1200,
        onClose: () => router.push("/silmatha"),
      });
      setTimeout(() => router.push("/silmatha"), 1400);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to submit. Please try again.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const stored = getStoredUserData();
    if (!stored || stored.department !== SILMATHA_MANAGEMENT_DEPARTMENT) {
      setAccessDenied(true);
      router.replace("/");
      return;
    }
    setAccessChecked(true);
  }, [router]);

  if (accessDenied) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm font-medium text-red-600">You do not have access to this section.</p>
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
                    <h1 className="text-2xl font-bold text-white mb-1">Silmatha Registration</h1>
                    <p className="text-slate-300 text-sm">Please complete the required information below.</p>
                  </div>
                </div>
              </div>

              <div className="px-4 md:px-10 py-6" ref={sectionRef}>
                <div className="flex items-center justify-between mb-6">
                  {effectiveSteps.map((step, idx) => (
                    <div key={step.id} className="flex items-center flex-1">
                      <div className="flex flex-col items-center flex-1">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                            currentStep > step.id
                              ? "bg-green-500 text-white"
                              : currentStep === step.id
                              ? "bg-slate-700 text-white ring-4 ring-slate-200"
                              : "bg-slate-200 text-slate-400"
                          }`}
                        >
                          {currentStep > step.id ? "✓" : step.id}
                        </div>
                        <span
                          className={`text-[11px] mt-2 font-medium text-center ${
                            currentStep >= step.id ? "text-slate-700" : "text-slate-400"
                          }`}
                        >
                          {step.title}
                        </span>
                      </div>
                      {idx < effectiveSteps.length - 1 && (
                        <div
                          className={`h-1 flex-1 mx-2 rounded transition-all duration-300 ${
                            currentStep > step.id ? "bg-green-500" : "bg-slate-200"
                          }`}
                        />
                      )}
                    </div>
                  ))}
                </div>

                <div className="min-h-[360px]">
                  <h2 className="text-xl font-bold text-slate-800 mb-5">{stepTitle}</h2>
                  {!isReview && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {(() => {
                        let signatureInserted = false;
                        const signatureFields: Array<keyof SilmathaForm> = [
                          "sil_student_signature",
                          "sil_acharya_signature",
                          "sil_aramadhipathi_signature",
                          "sil_district_secretary_signature",
                        ];
                        return current.fields.map((field) => {
                          if ((signatureFields as readonly string[]).includes(String(field.name))) {
                            if (signatureInserted) return null;
                            signatureInserted = true;
                            return (
                              <div key="signatures" className="space-y-3 border border-slate-200 rounded-lg p-4 bg-slate-50">
                                {signatureFields.map((name) => {
                                  const sigLabel = fieldConfigMap.get(name)?.label ?? name;
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
                                      {fieldError ? <p className="text-sm text-red-600">{fieldError}</p> : null}
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          }
                          const id = String(field.name);
                          const value = values[field.name] ?? "";
                          const error = errors[field.name];
                          const isBirthLocationStep = stepTitle === "Birth Location";
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
                                  value={values.sil_currstat}
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
                          if (LOCATION_FIELDS.includes(field.name)) {
                            if (field.name === "sm_province") {
                              const selection: LocationSelection = {
                                provinceCode: values.sm_province || undefined,
                                districtCode: values.sm_district || undefined,
                                divisionCode: values.sm_divisional_secretariat || undefined,
                                gnCode: values.sm_gn_division || undefined,
                              };
                              return (
                                <div key="sm_province" className={isBirthLocationStep ? "md:col-span-2" : ""}>
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
                                  />
                                  {error ? <p className="mt-1 text-sm text-red-600">{error}</p> : null}
                                </div>
                              );
                            }
                            return null;
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
                        });
                      })()}
                    </div>
                  )}

                  {isReview && (
                    <div className="space-y-6">
                      <p className="text-slate-600">
                        Review your inputs. Use{" "}
                        <span className="font-medium">Edit</span> to go back to a section.
                      </p>
                      {silmathaSteps.map((step) => (
                        <div key={step.id} className="border border-slate-200 rounded-xl p-4 md:p-5">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-semibold text-slate-800">{step.title}</h3>
                            <button
                              type="button"
                              onClick={() => setCurrentStep(step.id)}
                              className="px-3 py-1.5 text-sm bg-slate-200 rounded-lg hover:bg-slate-300"
                            >
                              Edit
                            </button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {step.fields.map((field) => {
                        const key = String(field.name);
                        if (LOCATION_FIELDS.includes(field.name)) {
                          if (field.name !== "sm_province") return null;
                          const locationParts = LOCATION_FIELDS.map((k) => values[k]).filter(Boolean);
                          const shownLocation = locationParts.join(" / ");
                          return (
                            <div key={key} className="bg-slate-50 rounded-lg p-3">
                              <div className="text-xs text-slate-500">{fieldLabels[key]}</div>
                              <div className="text-sm font-medium text-slate-800 break-words">
                                {shownLocation || <span className="text-slate-400">—</span>}
                              </div>
                            </div>
                          );
                        }
                        const raw = values[field.name] ?? "";
                        const disp = display[field.name];
                        const shown =
                          disp ??
                          (field.type === "date" ? toYYYYMMDD(raw) : raw);
                        return (
                          <div key={key} className="bg-slate-50 rounded-lg p-3">
                            <div className="text-xs text-slate-500">{fieldLabels[key]}</div>
                            <div className="text-sm font-medium text-slate-800 break-words">
                              {shown || <span className="text-slate-400">—</span>}
                            </div>
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
                    type="button"
                    onClick={handlePrevious}
                    disabled={currentStep === 1}
                    className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all ${
                      currentStep === 1 ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                    }`}
                  >
                    Previous
                  </button>

                  <div className="text-sm text-slate-600 font-medium text-center">
                    Step {currentStep} of {effectiveSteps.length}
                  </div>

                  {currentStep < effectiveSteps.length ? (
                    <button
                      type="button"
                      onClick={handleNext}
                      className="flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-700 text-white rounded-lg font-medium hover:bg-slate-800 transition-all"
                    >
                      Next
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="flex items-center justify-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-all disabled:opacity-70"
                    >
                      {submitting ? "Submitting..." : silmathaId ? "Update" : "Submit"}
                    </button>
                  )}
                </div>
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

export default function SilmathaAddPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-600">Loading...</div>}>
      <SilmathaAddPageInner />
    </Suspense>
  );
}
