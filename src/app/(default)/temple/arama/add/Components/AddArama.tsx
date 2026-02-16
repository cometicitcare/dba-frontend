"use client";

import React, { useMemo, useRef, useState, Suspense, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { _manageArama } from "@/services/arama";
import SilmathaAutocomplete from "@/components/silmatha/AutocompleteSilmatha";
import { FooterBar } from "@/components/FooterBar";
import { TopBar } from "@/components/TopBar";
import { Sidebar } from "@/components/Sidebar";
import selectionsData from "@/utils/selectionsData.json";

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
} from "./";

// Toasts
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export const dynamic = "force-dynamic";

function AddAramaPageInner() {
  const router = useRouter();
  const search = useSearchParams();
  const aramaId = search.get("id") || undefined;

  const steps = useMemo(() => aramaSteps(), []);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [values, setValues] = useState<Partial<AramaForm>>({
    ...aramaInitialValues,
  });
  const [errors, setErrors] = useState<Errors<AramaForm>>({});
  const [submitting, setSubmitting] = useState(false);
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const reviewEnabled = true;
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const showDemoFill = process.env.NEXT_PUBLIC_SHOW_DEMO_FILL === "true";

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

  const randomDigits = (count: number) =>
    Array.from({ length: count }, () => Math.floor(Math.random() * 10)).join("");

  const randomPhone075 = () => `075${randomDigits(7)}`;

  const randomEmail = () => `user${randomDigits(4)}@example.com`;

  function pickRandom<T>(list: T[], fallback: T): T;
  function pickRandom<T>(list: T[], fallback?: T): T | undefined;
  function pickRandom<T>(list: T[], fallback?: T): T | undefined {
    return list.length ? list[Math.floor(Math.random() * list.length)] : fallback;
  }

  type GnDivision = {
    gn_gnc?: string;
    gn_code?: string;
    gn_gnname?: string;
  };

  type DivisionalSecretariat = {
    dv_dvcode?: string;
    dv_dvname?: string;
    gn_divisions?: GnDivision[];
  };

  type District = {
    dd_dcode?: string;
    dd_dname?: string;
    divisional_secretariats?: DivisionalSecretariat[];
  };

  type Province = {
    cp_code?: string;
    cp_name?: string;
    districts?: District[];
  };

  type SelectionsData = {
    provinces?: Province[];
  };

  const buildRandomFormData = (): Partial<AramaForm> => {
    const data = selectionsData as SelectionsData;
    const provinces = Array.isArray(data.provinces) ? data.provinces : [];
    const province = pickRandom(provinces);
    const districts = province?.districts ?? [];
    const district = pickRandom(districts);
    const divisions = district?.divisional_secretariats ?? [];
    const division = pickRandom(divisions);
    const gns = division?.gn_divisions ?? [];
    const gn = pickRandom(gns);

    const provinceCode = province?.cp_code ?? "";
    const districtCode = district?.dd_dcode ?? "";
    const divisionCode = division?.dv_dvcode ?? "";
    const gnCode = gn?.gn_gnc ?? gn?.gn_code ?? "";

    const landRow: LandInfoRow = {
      id: `land-${Date.now()}`,
      serialNumber: 1,
      landName: "Land " + randomDigits(2),
      village: "Village " + randomDigits(2),
      district: district?.dd_dname ?? "",
      extent: `${Math.floor(Math.random() * 5) + 1} acres`,
      cultivationDescription: "Temple buildings",
      ownershipNature: pickRandom(["Bandara", "Rajakariya", "Other"], "Other"),
      deedNumber: `DEED${randomDigits(4)}`,
      titleRegistrationNumber: `TITLE${randomDigits(4)}`,
      taxDetails: "Paid",
      landOccupants: "Temple",
    };

    const residentRow: ResidentSilmathaRow = {
      id: `silmatha-${Date.now()}`,
      serialNumber: 1,
      silmathaName: `Silmatha ${randomDigits(2)}`,
      registrationNumber: `REG${randomDigits(5)}`,
      occupationEducation: "Studying",
    };

    const establishedYear = String(2010 + Math.floor(Math.random() * 15));

    return {
      arama_name: `Sample Arama ${randomDigits(3)}`,
      arama_address: `${Math.floor(Math.random() * 200) + 1} Temple Road`,
      telephone_number: randomPhone075(),
      whatsapp_number: randomPhone075(),
      email_address: randomEmail(),
      province: provinceCode,
      district: districtCode,
      divisional_secretariat: divisionCode,
      provincial_sasanaarakshaka_council: province?.cp_name ?? "Province Council",
      grama_niladhari_division: gnCode,
      chief_nun_name: `Chief Nun ${randomDigits(2)}`,
      chief_nun_registration_number: `REG${randomDigits(6)}`,
      established_period: establishedYear,
      land_size: `${Math.floor(Math.random() * 5) + 1} acres`,
      land_ownership: "Private",
      legal_ownership_proof: "Grant Deed",
      existing_buildings_facilities: "Main hall, meditation room",
      donor_families_count: String(Math.floor(Math.random() * 80) + 10),
      committees: "Donor Society",
      arama_owned_land: JSON.stringify([landRow]),
      land_info_certified: true,
      resident_silmathas: JSON.stringify([residentRow]),
      resident_silmathas_certified: true,
      inspection_report: "Well maintained.",
      inspection_code: `INSP${randomDigits(4)}`,
      ownership_district: district?.dd_dname ?? "",
      ownership_divisional_secretariat: division?.dv_dvname ?? "",
      ownership_grama_niladhari_division: gn?.gn_gnname ?? "",
      ownership_arama_name: `Sample Arama ${randomDigits(3)}`,
      pooja_deed_obtained: true,
      government_pooja_deed_obtained: false,
      government_pooja_deed_in_progress: false,
      institution_name: "Buddhist Affairs Department",
      institution_consent_obtained: true,
      recommend_new_center: true,
      recommend_registered_arama: false,
      annex2_chief_nun_registered: true,
      annex2_land_ownership_docs: true,
      annex2_institution_consent: true,
      annex2_district_association_recommendation: true,
      annex2_divisional_secretary_recommendation: true,
      annex2_recommend_district: district?.dd_dname ?? "",
      annex2_recommend_divisional_secretariat: division?.dv_dvname ?? "",
      annex2_recommend_grama_niladhari_division: gn?.gn_gnname ?? "",
      annex2_recommend_arama_name: `Sample Arama ${randomDigits(3)}`,
      secretary_approve_construction: true,
      secretary_not_approve_construction: false,
      secretary_refer_registration: false,
      secretary_refer_resubmission: false,
      secretary_resubmission_notes: "",
    };
  };

  const handleFillDemo = () => {
    const randomData = buildRandomFormData();
    handleSetMany(randomData);
    toast.info("Random data filled.", { autoClose: 1200 });
  };

  const validateStep = (stepIndex: number): boolean => {
    const step = effectiveSteps[stepIndex - 1];
    if (!step) return true;
    const nextErrors: Errors<AramaForm> = { ...errors };
    let valid = true;
    for (const f of step.fields) {
      if (f.name === "arama_owned_land" || f.name === "resident_silmathas") continue; // Skip table fields
      const raw = values[f.name];
      // Handle boolean values for checkboxes
      const stringValue = typeof raw === "boolean" ? String(raw) : (raw as string | undefined);
      const msg = validateField(f, stringValue, values, today);
      nextErrors[f.name] = msg;
      if (msg) valid = false;
    }
    if (stepIndex === 2 && !values.province) {
      nextErrors.province = "Required";
      valid = false;
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
        if (f.name === "arama_owned_land" || f.name === "resident_silmathas") continue; // Skip table fields
        const raw = values[f.name];
        // Handle boolean values for checkboxes
        const stringValue = typeof raw === "boolean" ? String(raw) : (raw as string | undefined);
        const msg = validateField(f, stringValue, values, today);
        aggregated[f.name] = msg;
        if (msg) stepValid = false;
      }
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

  // Helper function to map form fields to API field names
  // Backend expects snake_case field names with ar_ prefix for main fields
  // Array fields use camelCase (serialNumber, landName, etc.)
  const mapFormToApiFields = (formData: Partial<AramaForm>, parsedAramaOwnedLand: any[], parsedResidentSilmathas: any[]) => {
    // Map temple_owned_land array fields - use camelCase as per API
    const mappedLand = parsedAramaOwnedLand.map((land: any) => ({
      serialNumber: land.serialNumber ?? land.serial_number ?? 0,
      landName: land.landName ?? land.land_name ?? "",
      village: land.village ?? "",
      district: land.district ?? "",
      extent: land.extent ?? "",
      cultivationDescription: land.cultivationDescription ?? land.cultivation_description ?? "",
      ownershipNature: land.ownershipNature ?? land.ownership_nature ?? "",
      deedNumber: land.deedNumber ?? land.deed_number ?? "",
      titleRegistrationNumber: land.titleRegistrationNumber ?? land.title_registration_number ?? "",
      taxDetails: land.taxDetails ?? land.tax_details ?? "",
      landOccupants: land.landOccupants ?? land.land_occupants ?? "",
    }));

    // Map resident_silmathas array fields - convert form structure to API structure
    const mappedSilmathas = parsedResidentSilmathas.map((silmatha: any) => ({
      name: silmatha.silmathaName ?? silmatha.name ?? "",
      national_id: silmatha.registrationNumber ?? silmatha.national_id ?? "",
      date_of_birth: "", // Not in form, set empty
      ordination_date: "", // Not in form, set empty
      position: silmatha.occupationEducation?.split(',')[0]?.trim() ?? "",
      is_head_nun: silmatha.serialNumber === 1,
      notes: silmatha.occupationEducation?.split(',').slice(1).join(', ').trim() ?? "",
    }));

    // Owner code is a constant
    const ownerCode = "SL2025001";

    // Parse donor_families_count to number for ar_fmlycnt
    const donorCount = formData.donor_families_count ? parseInt(formData.donor_families_count, 10) : 0;
    const donorCountNum = isNaN(donorCount) ? 0 : donorCount;

    // Parse established_period to date format for ar_bgndate (YYYY-MM-DD)
    let bgndate: string | null = null;
    if (formData.established_period) {
      const periodStr = toYYYYMMDD(formData.established_period);
      if (periodStr) {
        bgndate = periodStr;
      }
    }

    // Return payload with backend field names (snake_case with ar_ prefix)
    const payload: any = {
      // Step 1: Basic Information
      ar_mobile: formData.telephone_number ?? "",
      ar_whtapp: formData.whatsapp_number ?? "",
      ar_email: formData.email_address ?? "",
      ar_typ: "ARAMA",
      ar_gndiv: formData.grama_niladhari_division ?? "",
      ar_ownercd: ownerCode,
      ar_parshawa: "PR005", // Constant as per user request
      ar_vname: formData.arama_name ?? "",
      ar_addrs: formData.arama_address ?? "",
      
      // Step 2: Administrative Divisions
      ar_province: formData.province ?? "",
      ar_district: formData.district ?? "",
      ar_divisional_secretariat: formData.divisional_secretariat ?? "",
      ar_pradeshya_sabha: formData.provincial_sasanaarakshaka_council ?? "",
      
      // Step 3: Administrative Details
      ar_nikaya: "", // Not in form, set empty
      ar_viharadhipathi_name: formData.chief_nun_name ?? "",
      ar_period_established: formData.established_period ? toYYYYMMDD(formData.established_period) : "",
      
      // Step 4: Assets & Activities
      ar_buildings_description: formData.existing_buildings_facilities ?? "",
      ar_dayaka_families_count: formData.donor_families_count ?? "",
      ar_fmlycnt: donorCountNum,
      ar_bgndate: bgndate,
      ar_kulangana_committee: formData.committees ?? "",
      ar_dayaka_sabha: "", // Not in form
      ar_temple_working_committee: "", // Not in form
      ar_other_associations: "", // Not in form
      ar_landSize: formData.land_size ?? "",
      ar_landOwnerShipType: formData.land_ownership ?? "",
      
      // Step 5: Land Information
      temple_owned_land: mappedLand,
      ar_land_info_certified: formData.land_info_certified ?? false,
      
      // Step 6: Resident Silmathas
      resident_silmathas: mappedSilmathas,
      ar_resident_silmathas_certified: formData.resident_silmathas_certified ?? false,
      
      // Step 7: Inspection
      ar_inspection_report: formData.inspection_report ?? "",
      ar_inspection_code: formData.inspection_code ?? "",
      
      // Step 8: Ownership
      ar_grama_niladhari_division_ownership: formData.ownership_grama_niladhari_division ?? "",
      ar_sanghika_donation_deed: formData.pooja_deed_obtained ?? false,
      ar_government_donation_deed: formData.government_pooja_deed_obtained ?? false,
      ar_government_donation_deed_in_progress: formData.government_pooja_deed_in_progress ?? false,
      ar_authority_consent_attached: formData.institution_consent_obtained ?? false,
      ar_recommend_new_center: formData.recommend_new_center ?? false,
      ar_recommend_registered_temple: formData.recommend_registered_arama ?? false,
      
      // Step 9: Annex II
      ar_annex2_recommend_construction: false, // Not in form
      ar_annex2_land_ownership_docs: formData.annex2_land_ownership_docs ?? false,
      ar_annex2_chief_incumbent_letter: formData.annex2_chief_nun_registered ?? false,
      ar_annex2_coordinator_recommendation: formData.annex2_district_association_recommendation ?? false,
      ar_annex2_divisional_secretary_recommendation: formData.annex2_divisional_secretary_recommendation ?? false,
      ar_annex2_approval_construction: false, // Not in form
      ar_annex2_referral_resubmission: false, // Not in form
    };

    // Only include ar_bgndate if we have a valid date value
    if (bgndate) {
      payload.ar_bgndate = bgndate;
    }

    return payload;
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
      // Parse JSON strings back to objects/arrays
      let parsedAramaOwnedLand: any[] = [];
      let parsedResidentSilmathas: any[] = [];
      
      try {
        parsedAramaOwnedLand = values.arama_owned_land 
          ? (typeof values.arama_owned_land === 'string' ? JSON.parse(values.arama_owned_land) : values.arama_owned_land)
          : [];
      } catch (e) {
        console.error("Error parsing arama_owned_land:", e);
        parsedAramaOwnedLand = [];
      }
      
      try {
        parsedResidentSilmathas = values.resident_silmathas 
          ? (typeof values.resident_silmathas === 'string' ? JSON.parse(values.resident_silmathas) : values.resident_silmathas)
          : [];
      } catch (e) {
        console.error("Error parsing resident_silmathas:", e);
        parsedResidentSilmathas = [];
      }
      
      const apiPayload = mapFormToApiFields(values, parsedAramaOwnedLand, parsedResidentSilmathas);
      console.log("Arama Form Payload:", apiPayload);
      await _manageArama({ action: "CREATE", payload: { data: apiPayload } } as any);

      toast.success(aramaId ? "Arama updated successfully." : "Arama created successfully.", {
        autoClose: 1200,
        onClose: () => router.push("/temple/arama"),
      });

      setTimeout(() => router.push("/temple/arama"), 1400);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to submit. Please try again.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Parse JSON arrays for tables
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

  const handlePickSilmatha = (picked: { regn?: string; name?: string }) => {
    const newRow: ResidentSilmathaRow = {
      id: `silmatha-${Date.now()}`,
      serialNumber: residentSilmathaRows.length + 1,
      silmathaName: picked.name ?? picked.regn ?? "",
      registrationNumber: picked.regn ?? "",
      occupationEducation: "",
    };
    const merged = [...residentSilmathaRows, newRow].map((row, idx) => ({
      ...row,
      serialNumber: idx + 1,
    }));
    handleResidentSilmathaChange(merged);
  };

  // Helper function to look up location names from codes
  const lookupLocationNames = useCallback((provinceCode?: string, districtCode?: string, divisionCode?: string, gnCode?: string) => {
    const provinces = Array.isArray((selectionsData as any)?.provinces) ? ((selectionsData as any).provinces as any[]) : [];
    let districtName = "";
    let divisionName = "";
    let gnName = "";

    if (districtCode) {
      for (const province of provinces) {
        if (province.cp_code === provinceCode) {
          for (const district of province.districts || []) {
            if (district.dd_dcode === districtCode) {
              districtName = district.dd_dname || "";
              if (divisionCode) {
                for (const division of district.divisional_secretariats || []) {
                  if (division.dv_dvcode === divisionCode) {
                    divisionName = division.dv_dvname || "";
                    if (gnCode) {
                      for (const gn of division.gn_divisions || []) {
                        const code = gn.gn_gnc || gn.gn_code;
                        if (code === gnCode) {
                          gnName = gn.gn_gnname || "";
                          break;
                        }
                      }
                    }
                    break;
                  }
                }
              }
              break;
            }
          }
          break;
        }
      }
    }

    return { districtName, divisionName, gnName };
  }, []);

  // Auto-populate ownership fields from step 1 and step 2 when navigating to step 8
  useEffect(() => {
    if (currentStep === 8) {
      const updates: Partial<AramaForm> = {};
      
      // Populate arama name from step 1 - always sync
      if (values.arama_name && values.ownership_arama_name !== values.arama_name) {
        updates.ownership_arama_name = values.arama_name;
      }
      
      // Populate location fields from step 2 - always sync
      if (values.district || values.divisional_secretariat || values.grama_niladhari_division) {
        const { districtName, divisionName, gnName } = lookupLocationNames(
          values.province,
          values.district,
          values.divisional_secretariat,
          values.grama_niladhari_division
        );
        
        if (districtName && values.ownership_district !== districtName) {
          updates.ownership_district = districtName;
        }
        if (divisionName && values.ownership_divisional_secretariat !== divisionName) {
          updates.ownership_divisional_secretariat = divisionName;
        }
        if (gnName && values.ownership_grama_niladhari_division !== gnName) {
          updates.ownership_grama_niladhari_division = gnName;
        }
      }
      
      if (Object.keys(updates).length > 0) {
        handleSetMany(updates);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, values.arama_name, values.district, values.divisional_secretariat, values.grama_niladhari_division, lookupLocationNames]);

  // Auto-populate Annex II recommend fields from existing location/name data
  useEffect(() => {
    if (currentStep === 9) {
      const { districtName, divisionName, gnName } = lookupLocationNames(
        values.province,
        values.district,
        values.divisional_secretariat,
        values.grama_niladhari_division
      );
      const updates: Partial<AramaForm> = {};
      if (districtName && values.annex2_recommend_district !== districtName) {
        updates.annex2_recommend_district = districtName;
      }
      if (divisionName && values.annex2_recommend_divisional_secretariat !== divisionName) {
        updates.annex2_recommend_divisional_secretariat = divisionName;
      }
      if (gnName && values.annex2_recommend_grama_niladhari_division !== gnName) {
        updates.annex2_recommend_grama_niladhari_division = gnName;
      }
      if (values.arama_name && values.annex2_recommend_arama_name !== values.arama_name) {
        updates.annex2_recommend_arama_name = values.arama_name;
      }
      if (Object.keys(updates).length > 0) {
        handleSetMany(updates);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, values.province, values.district, values.divisional_secretariat, values.grama_niladhari_division, values.arama_name, lookupLocationNames]);

  // Auto-populate arama_name to ownership_arama_name when arama_name changes
  useEffect(() => {
    if (values.arama_name) {
      // Always sync ownership_arama_name with arama_name when it changes
      if (values.ownership_arama_name !== values.arama_name) {
        handleSetMany({ ownership_arama_name: values.arama_name });
      }
    } else if (!values.arama_name && values.ownership_arama_name) {
      // Clear ownership_arama_name if arama_name is cleared
      handleSetMany({ ownership_arama_name: "" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.arama_name]);

  const gridCols = "md:grid-cols-2";

  return (
    <div className="w-full min-h-screen bg-gray-50">
      <TopBar onMenuClick={() => setSidebarOpen((v) => !v)} />
      <Sidebar isOpen={sidebarOpen} />
      <div className={`transition-all duration-300 pt-20 ${sidebarOpen ? "ml-64" : "ml-0"}`}>
        <main className="p-2 mb-20">
          <div className="w-full">
            <div className="bg-white shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-6 md:px-10 py-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-white mb-1">Arama Registration Form</h1>
                    <p className="text-slate-300 text-sm">Please complete all required information</p>
                  </div>
                  {showDemoFill ? (
                    <button
                      type="button"
                      onClick={handleFillDemo}
                      className="px-4 py-2 text-sm font-medium bg-white text-slate-800 rounded-lg shadow hover:bg-slate-100 transition-all"
                    >
                      Fill Sample Data
                    </button>
                  ) : null}
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

                {/* Form sections */}
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
                        <div className="md:col-span-2 space-y-4">
                          <SilmathaAutocomplete
                            id="silmatha-search"
                            label="Search and add an existing Silmatha"
                            placeholder="Type a Silmatha name or registration number"
                            onPick={(picked) => handlePickSilmatha(picked)}
                          />
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

                      {/* Step 2: Location Details - use LocationPicker */}
                      {currentStep === 2 && (
                        <div className="md:col-span-2">
                          <LocationPicker
                            value={{
                              provinceCode: (values.province as string) || undefined,
                              districtCode: (values.district as string) || undefined,
                              divisionCode: (values.divisional_secretariat as string) || undefined,
                              gnCode: (values.grama_niladhari_division as string) || undefined,
                            }}
                            onChange={(sel, payload) => {
                              // Get location names from payload, or look them up if not available
                              let districtName = payload.district?.dd_dname ?? "";
                              let divisionName = payload.division?.dv_dvname ?? "";
                              let gnName = payload.gn?.gn_gnname ?? "";
                              
                              // Fallback to lookup if payload doesn't have names
                              if (!districtName || !divisionName || !gnName) {
                                const lookedUp = lookupLocationNames(
                                  sel.provinceCode,
                                  sel.districtCode,
                                  sel.divisionCode,
                                  sel.gnCode
                                );
                                if (!districtName && lookedUp.districtName) districtName = lookedUp.districtName;
                                if (!divisionName && lookedUp.divisionName) divisionName = lookedUp.divisionName;
                                if (!gnName && lookedUp.gnName) gnName = lookedUp.gnName;
                              }
                              
                              const updates: Partial<AramaForm> = {
                                province: sel.provinceCode ?? "",
                                district: sel.districtCode ?? "",
                                divisional_secretariat: sel.divisionCode ?? "",
                                grama_niladhari_division: sel.gnCode ?? "",
                              };
                              
                              // Always update the ownership fields when location is selected/changed
                              if (sel.districtCode && districtName) {
                                updates.ownership_district = districtName;
                              } else if (!sel.districtCode) {
                                updates.ownership_district = "";
                              }
                              
                              if (sel.divisionCode && divisionName) {
                                updates.ownership_divisional_secretariat = divisionName;
                              } else if (!sel.divisionCode) {
                                updates.ownership_divisional_secretariat = "";
                              }
                              
                              if (sel.gnCode && gnName) {
                                updates.ownership_grama_niladhari_division = gnName;
                              } else if (!sel.gnCode) {
                                updates.ownership_grama_niladhari_division = "";
                              }
                              
                              handleSetMany(updates);
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
                        const rawVal = (values[f.name] as unknown as string) ?? "";
                        const val = f.type === "date" ? toYYYYMMDD(rawVal) : rawVal;
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
                        
                        // Textarea fields
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
                        
                        // Regular text inputs
                        return (
                          <div key={id}>
                            <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1.5">{f.label}</label>
                            <input
                              id={id}
                              type={f.type}
                              value={val}
                              onChange={(e) => handleInputChange(f.name, e.target.value)}
                              max={f.type === "date" ? today : undefined}
                              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                              placeholder={f.placeholder}
                            />
                            {err ? <p className="mt-1 text-sm text-red-600">{err}</p> : null}
                          </div>
                        );
                      })}

                      {/* Step 8: Ownership Statement - Special handling */}
                      {currentStep === 8 && (
                        <div className="md:col-span-2 space-y-1">
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

                      {/* Step 9: Annex II - Special rendering */}
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

                      {/* Step 1: Basic Information - Compact layout */}
                      {currentStep === 1 && (
                        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                          {current.fields.map((f) => {
                            const id = String(f.name);
                            const rawVal = (values[f.name] as unknown as string) ?? "";
                            const val = f.type === "date" ? toYYYYMMDD(rawVal) : rawVal;
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

                            // Contact fields in a row
                            return (
                              <div key={id}>
                                <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-0.5">{f.label}</label>
                                <input
                                  id={id}
                                  type={f.type}
                                  value={val}
                                  onChange={(e) => handleInputChange(f.name, e.target.value)}
                                  max={f.type === "date" ? today : undefined}
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
                        const rawVal = (values[f.name] as unknown as string) ?? "";
                        const val = f.type === "date" ? toYYYYMMDD(rawVal) : rawVal;
                        const err = errors[f.name];

                        // Skip table fields in regular rendering
                        if (id === "arama_owned_land" || id === "resident_silmathas") return null;

                        if (currentStep === 3 && id === "chief_nun_name") {
                          return (
                            <div key={id} className="md:col-span-2 space-y-2">
                              <SilmathaAutocomplete
                                id="chief-nun-search"
                                label={f.label}
                                placeholder="Type a Silmatha name or registration number"
                                initialDisplay={(values.chief_nun_name as string) ?? ""}
                                onPick={(picked) => {
                                  const name = picked.name || picked.display || "";
                                  const regn = picked.regn || "";
                                  handleSetMany({
                                    chief_nun_name: name,
                                    chief_nun_registration_number:
                                      regn || (values.chief_nun_registration_number as string) || "",
                                  });
                                }}
                              />
                              {err ? <p className="mt-1 text-sm text-red-600">{err}</p> : null}
                              {values.chief_nun_registration_number ? (
                                <p className="text-xs text-slate-600">
                                  Selected Registration: {values.chief_nun_registration_number as string}
                                </p>
                              ) : null}
                            </div>
                          );
                        }

                        // Textarea fields
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

                        // Regular text/email/tel inputs
                        return (
                          <div key={id}>
                            <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1.5">{f.label}</label>
                            <input
                              id={id}
                              type={f.type}
                              value={val}
                              onChange={(e) => handleInputChange(f.name, e.target.value)}
                              max={f.type === "date" ? today : undefined}
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
                      {submitting ? "Submitting..." : aramaId ? "Update" : "Submit"}
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

export default function AddArama() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-600">Loading…</div>}>
      <AddAramaPageInner />
    </Suspense>
  );
}
