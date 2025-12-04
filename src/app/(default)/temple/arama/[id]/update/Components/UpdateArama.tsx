"use client";

import React, { useMemo, useRef, useState, Suspense, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { _manageArama } from "@/services/arama";
import { FooterBar } from "@/components/FooterBar";
import { TopBar } from "@/components/TopBar";
import { Sidebar } from "@/components/Sidebar";
import { updateData } from "../updateData";

import {
  DateField,
  LocationPicker,
  aramaSteps,
  aramaInitialValues,
  toYYYYMMDD,
  validateField,
  Errors,
  LandInfoTable,
  ResidentSilmathaTable,
  ImportantNotes,
  type AramaForm,
  type StepConfig,
  type LandInfoRow,
  type ResidentSilmathaRow,
} from "../../../add/Components";

// Toasts
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export const dynamic = "force-dynamic";

function UpdateAramaPageInner() {
  const router = useRouter();
  const params = useParams();
  const aramaId = params?.id as string | undefined;

  const steps = useMemo(() => aramaSteps(), []);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [values, setValues] = useState<Partial<AramaForm>>({
    ...aramaInitialValues,
  });
  const [errors, setErrors] = useState<Errors<AramaForm>>({});
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const reviewEnabled = true;
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Load data for update
  useEffect(() => {
    if (!aramaId) {
      setLoading(false);
      return;
    }

    const loadAramaData = async () => {
      try {
        setLoading(true);
        // TODO: Replace with actual API call to fetch arama data
        // const response = await fetch(`/api/arama/${aramaId}`);
        // const data = await response.json();
        
        // For now, use sample data from updateData.ts
        const sampleData = updateData.sampleAramaData;
        
        console.log("Loading arama data:", sampleData);
        
        // Auto-fill form with loaded data
        if (sampleData) {
          const filledValues = {
            ...aramaInitialValues,
            ...sampleData,
          };
          setValues(filledValues);
          console.log("Form values auto-filled:", filledValues);
          console.log("Location values:", {
            province: filledValues.province,
            district: filledValues.district,
            divisional_secretariat: filledValues.divisional_secretariat,
            grama_niladhari_division: filledValues.grama_niladhari_division,
          });
        }
      } catch (error) {
        console.error("Error loading arama data:", error);
        toast.error("Failed to load arama data");
      } finally {
        setLoading(false);
      }
    };

    loadAramaData();
  }, [aramaId]);

  const effectiveSteps: Array<StepConfig<AramaForm>> = useMemo(() => {
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

  const handleInputChange = (name: keyof AramaForm, value: string | boolean) => {
    setValues((prev) => {
      const next = { ...prev, [name]: value };
      const cfg = steps.flatMap((s) => s.fields).find((f) => f.name === name);
      if (cfg) {
        const msg = validateField(cfg, String(value), next, today);
        setErrors((e) => ({ ...e, [name]: msg }));
      }
      return next;
    });
  };

  const handleSetMany = (patch: Partial<AramaForm>) => {
    setValues((prev) => {
      const next: Partial<AramaForm> = { ...prev, ...patch };
      const cfgMap = new Map<string, any>();
      steps.forEach((s) => s.fields.forEach((f) => cfgMap.set(String(f.name), f)));
      const nextErrors: Errors<AramaForm> = { ...errors };
      Object.keys(patch).forEach((k) => {
        const cfg = cfgMap.get(k);
        if (cfg) {
          const raw = String((next as any)[k] ?? "");
          nextErrors[cfg.name as keyof AramaForm] = validateField(cfg, raw, next, today);
        }
      });
      setErrors(nextErrors);
      return next;
    });
  };

  const validateStep = (stepIndex: number): boolean => {
    const step = effectiveSteps[stepIndex - 1];
    if (!step) return true;
    const nextErrors: Errors<AramaForm> = { ...errors };
    let valid = true;
    for (const f of step.fields) {
      if (f.name === "arama_owned_land" || f.name === "resident_silmathas") continue;
      const raw = values[f.name];
      // Handle boolean values for checkboxes
      const stringValue = typeof raw === "boolean" ? String(raw) : (raw as string | undefined);
      const msg = validateField(f, stringValue, values, today);
      nextErrors[f.name] = msg;
      if (msg) valid = false;
    }
    // Special validation for step 2: also validate province
    if (stepIndex === 2) {
      if (!values.province) {
        nextErrors.province = "Required";
        valid = false;
      }
    }
    setErrors(nextErrors);
    if (!valid) scrollTop();
    return valid;
  };

  const validateAll = (): { ok: boolean; firstInvalidStep: number | null } => {
    let firstInvalidStep: number | null = null;
    const aggregated: Errors<AramaForm> = {};
    for (const step of steps) {
      let stepValid = true;
      for (const f of step.fields) {
        if (f.name === "arama_owned_land" || f.name === "resident_silmathas") continue;
        const raw = values[f.name];
        // Handle boolean values for checkboxes
        const stringValue = typeof raw === "boolean" ? String(raw) : (raw as string | undefined);
        const msg = validateField(f, stringValue, values, today);
        aggregated[f.name] = msg;
        if (msg) stepValid = false;
      }
      // Special validation for step 2: also validate province
      if (step.id === 2 && !values.province) {
        aggregated.province = "Required";
        stepValid = false;
      }
      if (!stepValid && firstInvalidStep == null) firstInvalidStep = step.id;
    }
    setErrors(aggregated);
    return { ok: firstInvalidStep == null, firstInvalidStep };
  };

  const handleNext = () => {
    if (currentStep < effectiveSteps.length && validateStep(currentStep)) {
      setCurrentStep((s) => s + 1);
    }
  };
  const handlePrevious = () => {
    if (currentStep > 1) setCurrentStep((s) => s - 1);
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
      let parsedResidentSilmathas: any[] = [];
      let parsedAramaOwnedLand: any[] = [];
      
      try {
        parsedResidentSilmathas = values.resident_silmathas 
          ? (typeof values.resident_silmathas === 'string' ? JSON.parse(values.resident_silmathas) : values.resident_silmathas)
          : [];
      } catch (e) {
        console.error("Error parsing resident_silmathas:", e);
        parsedResidentSilmathas = [];
      }
      
      try {
        parsedAramaOwnedLand = values.arama_owned_land 
          ? (typeof values.arama_owned_land === 'string' ? JSON.parse(values.arama_owned_land) : values.arama_owned_land)
          : [];
      } catch (e) {
        console.error("Error parsing arama_owned_land:", e);
        parsedAramaOwnedLand = [];
      }
      
      const payload: any = {
        ...values,
        id: aramaId,
        resident_silmathas: parsedResidentSilmathas,
        arama_owned_land: parsedAramaOwnedLand,
      };
      console.log("Arama Update Payload:", payload);
      await _manageArama({ action: "UPDATE", payload: { arama_id: aramaId, data: payload } } as any);

      toast.success("Arama updated successfully.", {
        autoClose: 1200,
        onClose: () => router.push("/temple/arama"),
      });

      setTimeout(() => router.push("/temple/arama"), 1400);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to update. Please try again.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const landInfoRows: LandInfoRow[] = useMemo(() => {
    try {
      const parsed = JSON.parse(values.arama_owned_land || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [values.arama_owned_land]);

  const residentSilmathaRows: ResidentSilmathaRow[] = useMemo(() => {
    try {
      const parsed = JSON.parse(values.resident_silmathas || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [values.resident_silmathas]);

  const handleLandInfoChange = (rows: LandInfoRow[]) => {
    handleInputChange("arama_owned_land", JSON.stringify(rows));
  };

  const handleResidentSilmathaChange = (rows: ResidentSilmathaRow[]) => {
    handleInputChange("resident_silmathas", JSON.stringify(rows));
  };

  const gridCols = "md:grid-cols-2";

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-slate-600">Loading arama data...</div>
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
                    <h1 className="text-2xl font-bold text-white mb-1">Update Arama Registration</h1>
                    <p className="text-slate-300 text-sm">Update the arama information</p>
                  </div>
                </div>
              </div>

              <div className="px-4 md:px-10 py-6" ref={sectionRef}>
                {/* Stepper */}
                <div className="flex items-center justify-between mb-6 overflow-x-auto">
                  {effectiveSteps.map((step, idx) => (
                    <div key={step.id} className="flex items-center flex-1 min-w-[80px]">
                      <div className="flex flex-col items-center flex-1">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${currentStep > step.id ? "bg-green-500 text-white" : currentStep === step.id ? "bg-slate-700 text-white ring-4 ring-slate-200" : "bg-slate-200 text-slate-400"}`}>
                          {currentStep > step.id ? "✓" : step.id}
                        </div>
                        <span className={`text-[10px] mt-2 font-medium text-center ${currentStep >= step.id ? "text-slate-700" : "text-slate-400"}`}>{step.title}</span>
                      </div>
                      {idx < effectiveSteps.length - 1 && <div className={`h-1 flex-1 mx-2 rounded transition-all duration-300 ${currentStep > step.id ? "bg-green-500" : "bg-slate-200"}`} />}
                    </div>
                  ))}
                </div>

                {/* Form sections - Same as AddArama but with pre-filled data */}
                <div className={currentStep === 1 ? "min-h-[350px]" : "min-h-[360px]"}>
                  <h2 className="text-xl font-bold text-slate-800 mb-2">{stepTitle}</h2>

                  {!isReview && (
                    <div className={`grid grid-cols-1 ${gridCols} ${currentStep === 1 ? "gap-2" : "gap-5"}`}>
                      {/* Step 5: Land Information Table */}
                      {currentStep === 5 && (
                        <div className="md:col-span-2">
                          <LandInfoTable value={landInfoRows} onChange={handleLandInfoChange} error={errors.arama_owned_land} />
                          <div className="mt-4">
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={values.land_info_certified || false}
                                onChange={(e) => handleInputChange("land_info_certified", e.target.checked)}
                                className="w-4 h-4"
                              />
                              <span className="text-sm font-medium text-slate-700">I certify that the above information is true and correct.</span>
                            </label>
                            {errors.land_info_certified && <p className="mt-1 text-sm text-red-600">{errors.land_info_certified}</p>}
                          </div>
                        </div>
                      )}

                      {/* Step 6: Resident Sil Mathā Table */}
                      {currentStep === 6 && (
                        <div className="md:col-span-2">
                          <ResidentSilmathaTable value={residentSilmathaRows} onChange={handleResidentSilmathaChange} error={errors.resident_silmathas} />
                          <div className="mt-4">
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={values.resident_silmathas_certified || false}
                                onChange={(e) => handleInputChange("resident_silmathas_certified", e.target.checked)}
                                className="w-4 h-4"
                              />
                              <span className="text-sm font-medium text-slate-700">I certify that the above information is true and correct.</span>
                            </label>
                            {errors.resident_silmathas_certified && <p className="mt-1 text-sm text-red-600">{errors.resident_silmathas_certified}</p>}
                          </div>
                        </div>
                      )}

                      {/* Step 2: Location Details */}
                      {currentStep === 2 && (
                        <div className="md:col-span-2">
                          <LocationPicker
                            key={`location-${values.province}-${values.district}-${values.divisional_secretariat}-${values.grama_niladhari_division}`}
                            value={{
                              provinceCode: (values.province as string) || undefined,
                              districtCode: (values.district as string) || undefined,
                              divisionCode: (values.divisional_secretariat as string) || undefined,
                              gnCode: (values.grama_niladhari_division as string) || undefined,
                            }}
                            onChange={(sel) => {
                              handleSetMany({
                                province: sel.provinceCode ?? "",
                                district: sel.districtCode ?? "",
                                divisional_secretariat: sel.divisionCode ?? "",
                                grama_niladhari_division: sel.gnCode ?? "",
                              });
                            }}
                            required
                            labels={{
                              province: "Province",
                              district: "District",
                              division: "Divisional Secretariat Division",
                              gn: "Grama Niladhari Division",
                            }}
                          />
                          {(errors.province || errors.district || errors.divisional_secretariat || errors.grama_niladhari_division) && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors.province || errors.district || errors.divisional_secretariat || errors.grama_niladhari_division}
                            </p>
                          )}
                          <div className="mt-4">
                            <label htmlFor="provincial_sasanaarakshaka_council" className="block text-sm font-medium text-slate-700 mb-2">
                              Provincial Sasanaarakshaka Council
                            </label>
                            <input
                              id="provincial_sasanaarakshaka_council"
                              type="text"
                              value={(values.provincial_sasanaarakshaka_council as string) ?? ""}
                              onChange={(e) => handleInputChange("provincial_sasanaarakshaka_council", e.target.value)}
                              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                            />
                            {errors.provincial_sasanaarakshaka_council && <p className="mt-1 text-sm text-red-600">{errors.provincial_sasanaarakshaka_council}</p>}
                          </div>
                        </div>
                      )}

                      {/* Step 4: Land & Facilities */}
                      {currentStep === 4 && current.fields.map((f) => {
                        const id = String(f.name);
                        const val = (values[f.name] as unknown as string) ?? "";
                        const err = errors[f.name];
                        
                        if (id === "land_ownership") {
                          return (
                            <div key={id}>
                              <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-2">{f.label}</label>
                              <select
                                id={id}
                                value={val}
                                onChange={(e) => handleInputChange(f.name, e.target.value)}
                                required={!!f.rules?.required}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                              >
                                <option value="">Select</option>
                                <option value="State">State</option>
                                <option value="Private">Private</option>
                              </select>
                              {err && <p className="mt-1 text-sm text-red-600">{err}</p>}
                            </div>
                          );
                        }
                        
                        if (f.type === "textarea") {
                          return (
                            <div key={id} className={id === "existing_buildings_facilities" || id === "committees" ? "md:col-span-2" : ""}>
                              <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1.5">{f.label}</label>
                              <textarea
                                id={id}
                                value={val}
                                rows={f.rows ?? 4}
                                onChange={(e) => handleInputChange(f.name, e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all resize-none"
                                placeholder={f.placeholder}
                              />
                              {err ? <p className="mt-1 text-sm text-red-600">{err}</p> : null}
                            </div>
                          );
                        }
                        
                        return (
                          <div key={id}>
                            <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1.5">{f.label}</label>
                            <input
                              id={id}
                              type={f.type}
                              value={val}
                              onChange={(e) => handleInputChange(f.name, e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                              placeholder={f.placeholder}
                            />
                            {err ? <p className="mt-1 text-sm text-red-600">{err}</p> : null}
                          </div>
                        );
                      })}

                      {/* Step 8: Ownership Statement */}
                      {currentStep === 8 && (
                        <div className="md:col-span-2 space-y-2">
                          <div className="text-sm text-slate-700 mb-4">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <span>In the</span>
                              <input
                                id="ownership_district"
                                type="text"
                                value={(values.ownership_district as string) ?? ""}
                                onChange={(e) => handleInputChange("ownership_district", e.target.value)}
                                className="w-32 px-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                                placeholder="District"
                              />
                              <span>District,</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <span>in the</span>
                              <input
                                id="ownership_divisional_secretariat"
                                type="text"
                                value={(values.ownership_divisional_secretariat as string) ?? ""}
                                onChange={(e) => handleInputChange("ownership_divisional_secretariat", e.target.value)}
                                className="w-40 px-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                                placeholder="Divisional Secretariat"
                              />
                              <span>Divisional Secretariat Division,</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <span>in the</span>
                              <input
                                id="ownership_grama_niladhari_division"
                                type="text"
                                value={(values.ownership_grama_niladhari_division as string) ?? ""}
                                onChange={(e) => handleInputChange("ownership_grama_niladhari_division", e.target.value)}
                                className="w-36 px-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                                placeholder="GN Division"
                              />
                              <span>Grama Niladhari Division,</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mb-4">
                              <span>the</span>
                              <input
                                id="ownership_arama_name"
                                type="text"
                                value={(values.ownership_arama_name as string) ?? ""}
                                onChange={(e) => handleInputChange("ownership_arama_name", e.target.value)}
                                className="w-48 px-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                                placeholder="Arama Name"
                              />
                              <span>Arama – the ownership of the land on which the Arama is situated</span>
                            </div>
                            {(errors.ownership_district || errors.ownership_divisional_secretariat || errors.ownership_grama_niladhari_division || errors.ownership_arama_name) && (
                              <p className="mt-1 text-sm text-red-600">
                                {errors.ownership_district || errors.ownership_divisional_secretariat || errors.ownership_grama_niladhari_division || errors.ownership_arama_name}
                              </p>
                            )}
                          </div>
                          {current.fields
                            .filter((f) => !f.name.includes("recommend_") && !f.name.includes("ownership_"))
                            .map((f) => {
                              const id = String(f.name);
                              const val = (values[f.name] as unknown as string) ?? "";
                              const err = errors[f.name];
                              
                              if (id.includes("pooja_") || id.includes("institution_") || id.includes("recommend_")) {
                                return (
                                  <div key={id} className="md:col-span-2">
                                    <label className="flex items-center gap-2">
                                      <input
                                        type="checkbox"
                                        checked={(values[f.name] as boolean) || false}
                                        onChange={(e) => handleInputChange(f.name, e.target.checked)}
                                        className="w-4 h-4"
                                      />
                                      <span className="text-sm font-medium text-slate-700">{f.label}</span>
                                    </label>
                                    {err ? <p className="mt-1 text-sm text-red-600">{err}</p> : null}
                                  </div>
                                );
                              }
                              
                              return null;
                            })}
                          <ImportantNotes className="mt-4">
                            <strong>Important:</strong>
                            <br />
                            To confirm the ownership of the land belonging to the Arama, a legally valid deed or permit must be available, and a copy of it must be submitted with this application. The land ownership should be in the name of the Sil Meniya (nun) of the Arama. If the ownership is under the name of a single Sil Meniya, the deed must be prepared in a way that grants ownership to her lineage of disciples or to the entire community of Sil Mathā in the future.
                            <br />
                            A recommendation letter addressed to the Commissioner General of Buddhist Affairs from the Secretary of the District Sil Mathā Association of the relevant district must also be submitted along with this application.
                          </ImportantNotes>
                        </div>
                      )}

                      {/* Step 9: Annex II */}
                      {currentStep === 9 && (
                        <div className="md:col-span-2 space-y-6">
                          <div className="space-y-3">
                            <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-300 pb-2">
                              Obtaining Permission for the Construction and Maintenance of New Religious Centers
                            </h3>
                            <p className="text-sm font-medium text-slate-700 mb-3">Recommendation of the Commissioner General of Buddhist Affairs:</p>
                            {current.fields
                              .filter((f) => 
                                f.name === "annex2_chief_nun_registered" ||
                                f.name === "annex2_land_ownership_docs" ||
                                f.name === "annex2_institution_consent" ||
                                f.name === "annex2_district_association_recommendation" ||
                                f.name === "annex2_divisional_secretary_recommendation"
                              )
                              .map((f) => {
                                const id = String(f.name);
                                const err = errors[f.name];
                                return (
                                  <div key={id}>
                                    <label className="flex items-center gap-2">
                                      <input
                                        type="checkbox"
                                        checked={(values[f.name] as boolean) || false}
                                        onChange={(e) => handleInputChange(f.name, e.target.checked)}
                                        className="w-4 h-4"
                                      />
                                      <span className="text-sm font-medium text-slate-700">{f.label}</span>
                                    </label>
                                    {err ? <p className="mt-1 text-sm text-red-600">{err}</p> : null}
                                  </div>
                                );
                              })}
                            <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                              <p className="text-sm font-medium text-slate-700 mb-3">After considering the above recommendations and documents:</p>
                              <div className="mb-3">
                                <label className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={true}
                                    disabled
                                    className="w-4 h-4"
                                  />
                                  <span className="text-sm font-medium text-slate-700">
                                    I recommend granting approval to construct and maintain the
                                  </span>
                                </label>
                              </div>
                              {current.fields
                                .filter((f) => 
                                  f.name === "annex2_recommend_district" ||
                                  f.name === "annex2_recommend_divisional_secretariat" ||
                                  f.name === "annex2_recommend_grama_niladhari_division" ||
                                  f.name === "annex2_recommend_arama_name"
                                )
                                .map((f) => {
                                  const id = String(f.name);
                                  const val = (values[f.name] as unknown as string) ?? "";
                                  const err = errors[f.name];
                                  return (
                                    <div key={id} className="ml-6 mb-2">
                                      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">{f.label}</label>
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
                                })}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Step 10: Secretary Approval */}
                      {currentStep === 10 && (
                        <div className="md:col-span-2 space-y-4">
                          {current.fields
                            .filter((f) => f.name !== "secretary_resubmission_notes")
                            .map((f) => {
                              const id = String(f.name);
                              const err = errors[f.name];
                              return (
                                <div key={id}>
                                  <label className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={(values[f.name] as boolean) || false}
                                      onChange={(e) => handleInputChange(f.name, e.target.checked)}
                                      className="w-4 h-4"
                                    />
                                    <span className="text-sm font-medium text-slate-700">{f.label}</span>
                                  </label>
                                  {err ? <p className="mt-1 text-sm text-red-600">{err}</p> : null}
                                </div>
                              );
                            })}
                          {current.fields
                            .filter((f) => f.name === "secretary_resubmission_notes")
                            .map((f) => {
                              const id = String(f.name);
                              const val = (values[f.name] as unknown as string) ?? "";
                              const err = errors[f.name];
                              return (
                                <div key={id}>
                                  <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-2">{f.label}</label>
                                  <textarea
                                    id={id}
                                    value={val}
                                    rows={f.rows ?? 3}
                                    onChange={(e) => handleInputChange(f.name, e.target.value)}
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all resize-none"
                                  />
                                  {err ? <p className="mt-1 text-sm text-red-600">{err}</p> : null}
                                </div>
                              );
                            })}
                        </div>
                      )}

                      {/* Step 1: Basic Information */}
                      {currentStep === 1 && (
                        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                          {current.fields.map((f) => {
                            const id = String(f.name);
                            const val = (values[f.name] as unknown as string) ?? "";
                            const err = errors[f.name];

                            if (f.type === "textarea") {
                              return (
                                <div key={id} className={id === "arama_address" ? "md:col-span-2" : "md:col-span-2"}>
                                  <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-0.5">{f.label}</label>
                                  <textarea
                                    id={id}
                                    value={val}
                                    rows={id === "arama_name" ? 2 : id === "arama_address" ? 2 : f.rows ?? 3}
                                    onChange={(e) => handleInputChange(f.name, e.target.value)}
                                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all resize-none"
                                    placeholder={f.placeholder}
                                  />
                                  {err ? <p className="mt-0.5 text-xs text-red-600">{err}</p> : null}
                                </div>
                              );
                            }

                            return (
                              <div key={id}>
                                <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-0.5">{f.label}</label>
                                <input
                                  id={id}
                                  type={f.type}
                                  value={val}
                                  onChange={(e) => handleInputChange(f.name, e.target.value)}
                                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                                  placeholder={f.placeholder}
                                />
                                {err ? <p className="mt-0.5 text-xs text-red-600">{err}</p> : null}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Regular fields for other steps */}
                      {currentStep !== 1 && currentStep !== 2 && currentStep !== 4 && currentStep !== 5 && currentStep !== 6 && currentStep !== 8 && currentStep !== 9 && currentStep !== 10 && current.fields.map((f) => {
                        const id = String(f.name);
                        const val = (values[f.name] as unknown as string) ?? "";
                        const err = errors[f.name];

                        if (id === "arama_owned_land" || id === "resident_silmathas") return null;

                        if (f.type === "textarea") {
                          return (
                            <div key={id} className={id === "arama_name" || id === "arama_address" || id === "existing_buildings_facilities" || id === "committees" || id === "inspection_report" ? "md:col-span-2" : ""}>
                              <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1.5">{f.label}</label>
                              <textarea
                                id={id}
                                value={val}
                                rows={f.rows ?? 4}
                                onChange={(e) => handleInputChange(f.name, e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all resize-none"
                                placeholder={f.placeholder}
                              />
                              {err ? <p className="mt-1 text-sm text-red-600">{err}</p> : null}
                            </div>
                          );
                        }

                        return (
                          <div key={id}>
                            <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1.5">{f.label}</label>
                            <input
                              id={id}
                              type={f.type}
                              value={val}
                              onChange={(e) => handleInputChange(f.name, e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
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
                          {s.id === 5 && (
                            <div className="mt-4">
                              <p className="text-sm font-medium text-slate-700 mb-2">Land Information:</p>
                              <p className="text-sm text-slate-600">{landInfoRows.length} land record(s) entered</p>
                            </div>
                          )}
                          {s.id === 6 && (
                            <div className="mt-4">
                              <p className="text-sm font-medium text-slate-700 mb-2">Resident Sil Mathā:</p>
                              <p className="text-sm text-slate-600">{residentSilmathaRows.length} sil mathā record(s) entered</p>
                            </div>
                          )}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {s.fields.map((f) => {
                              const key = String(f.name);
                              if (key === "arama_owned_land" || key === "resident_silmathas") return null;
                              const v0 = (values[f.name] as unknown as string | boolean) ?? "";
                              const v = typeof v0 === "boolean" ? (v0 ? "Yes" : "No") : String(v0);
                              return (
                                <div key={key} className="bg-slate-50 rounded-lg p-3">
                                  <div className="text-xs text-slate-500">{fieldLabels[key]}</div>
                                  <div className="text-sm font-medium text-slate-800 break-words">{v || <span className="text-slate-400">—</span>}</div>
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
                      {submitting ? "Updating..." : "Update"}
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

export default function UpdateArama() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-600">Loading…</div>}>
      <UpdateAramaPageInner />
    </Suspense>
  );
}

