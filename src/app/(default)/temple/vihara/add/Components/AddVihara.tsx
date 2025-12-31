"use client";

import React, { useMemo, useRef, useState, useCallback, Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { _manageVihara } from "@/services/vihara";
import { FooterBar } from "@/components/FooterBar";
import { TopBar } from "@/components/TopBar";
import { Sidebar } from "@/components/Sidebar";
import selectionsData from "@/utils/selectionsData.json";
import { DIVITIONAL_SEC_MANAGEMENT_DEPARTMENT } from "@/utils/config";

import {
  DateField,
  LocationPicker,
  BhikkhuAutocomplete,
  TempleAutocomplete,
  TempleAutocompleteAddress,
  viharaSteps,
  viharaInitialValues,
  toYYYYMMDD,
  validateField,
  Errors,
  LandInfoTable,
  ResidentBhikkhuTable,
  ImportantNotes,
  type ViharaForm,
  type StepConfig,
  type LandInfoRow,
  type ResidentBhikkhuRow,
} from "./";

// Toasts
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

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

export const dynamic = "force-dynamic";

function AddViharaPageInner({ department }: { department?: string }) {
  const router = useRouter();
  const search = useSearchParams();
  const viharaId = search.get("id") || undefined;
  const stageQuery = search.get("stage") || undefined;
  const isDivisionalSec = department === DIVITIONAL_SEC_MANAGEMENT_DEPARTMENT;
  const parseId = useCallback((v?: string | null) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }, []);
  const [createdViharaId, setCreatedViharaId] = useState<number | null>(() => parseId(viharaId));

  const steps = useMemo(() => viharaSteps(), []);
  const reviewEnabled = true;
  const effectiveSteps: Array<StepConfig<ViharaForm>> = useMemo(() => {
    if (!reviewEnabled) return steps;
    return [...steps, { id: steps.length + 1, title: "Review & Confirm", fields: [] }];
  }, [steps, reviewEnabled]);

  const majorStepGroups = useMemo(
    () => [
      { id: 1, steps: effectiveSteps.filter((s) => s.id <= 4) },
      { id: 2, steps: effectiveSteps.filter((s) => s.id > 4) },
    ],
    [effectiveSteps]
  );
  const visibleMajorStepGroups = useMemo(() => {
    // Explicit stage=2 request: only show Stage 2 flow
    if (stageQuery === "2") return majorStepGroups.filter((g) => g.id === 2);
    const hasId = Boolean(viharaId);
    if (!hasId) return majorStepGroups.filter((g) => g.id === 1); // fresh create: Stage 1
    if (isDivisionalSec) return majorStepGroups.filter((g) => g.id === 2);
    return majorStepGroups; // default: both flows
  }, [isDivisionalSec, majorStepGroups, stageQuery, viharaId]);

  const firstGroupFirstStepIndex = useMemo(() => {
    const firstStepId = visibleMajorStepGroups[0]?.steps[0]?.id;
    if (!firstStepId) return 1;
    const idx = effectiveSteps.findIndex((s) => s.id === firstStepId);
    return idx >= 0 ? idx + 1 : 1;
  }, [effectiveSteps, visibleMajorStepGroups]);

  const initialMajorStep = useMemo(() => {
    if (stageQuery === "2" && visibleMajorStepGroups.some((g) => g.id === 2)) return 2;
    return visibleMajorStepGroups[0]?.id ?? 1;
  }, [stageQuery, visibleMajorStepGroups]);

  const initialCurrentStep = useMemo(() => {
    const targetGroup = visibleMajorStepGroups.find((g) => g.id === initialMajorStep);
    const firstStepId = targetGroup?.steps[0]?.id;
    if (!firstStepId) return firstGroupFirstStepIndex;
    const idx = effectiveSteps.findIndex((s) => s.id === firstStepId);
    return idx >= 0 ? idx + 1 : firstGroupFirstStepIndex;
  }, [effectiveSteps, firstGroupFirstStepIndex, initialMajorStep, visibleMajorStepGroups]);

  const [activeMajorStep, setActiveMajorStep] = useState<number>(initialMajorStep);
  const [currentStep, setCurrentStep] = useState<number>(initialCurrentStep);
  const [values, setValues] = useState<Partial<ViharaForm>>({
    ...viharaInitialValues,
  });
  const [errors, setErrors] = useState<Errors<ViharaForm>>({});
  const [submitting, setSubmitting] = useState(false);
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const isReview = reviewEnabled && currentStep === effectiveSteps.length;
  const current = effectiveSteps[currentStep - 1];
  const stepTitle = current?.title ?? "";
  const flowOneLastStepIndex = useMemo(() => {
    const groupOne = majorStepGroups.find((g) => g.id === 1);
    const lastStepId = groupOne?.steps[groupOne.steps.length - 1]?.id;
    if (!lastStepId) return null;
    const idx = effectiveSteps.findIndex((s) => s.id === lastStepId);
    return idx >= 0 ? idx + 1 : null;
  }, [effectiveSteps, majorStepGroups]);
  const isFlowOneExitStep = activeMajorStep === 1 && flowOneLastStepIndex !== null && currentStep === flowOneLastStepIndex;
  const visibleSteps = useMemo(() => {
    const group = visibleMajorStepGroups.find((g) => g.id === activeMajorStep);
    return group?.steps.length ? group.steps : effectiveSteps;
  }, [activeMajorStep, effectiveSteps, visibleMajorStepGroups]);
  const currentStepDisplay = useMemo(() => {
    const currentId = effectiveSteps[currentStep - 1]?.id;
    const idx = visibleSteps.findIndex((s) => s.id === currentId);
    return idx >= 0 ? idx + 1 : currentStep;
  }, [currentStep, effectiveSteps, visibleSteps]);

  const reviewSteps = useMemo(() => {
    const group = visibleMajorStepGroups.find((g) => g.id === activeMajorStep) ?? visibleMajorStepGroups[0];
    return group?.steps?.length ? group.steps : steps;
  }, [activeMajorStep, steps, visibleMajorStepGroups]);

  const getFirstStepIndexForGroup = useCallback(
    (groupId: number) => {
      const group = visibleMajorStepGroups.find((g) => g.id === groupId);
      const firstStepId = group?.steps[0]?.id;
      if (!firstStepId) return null;
      const idx = effectiveSteps.findIndex((s) => s.id === firstStepId);
      return idx >= 0 ? idx + 1 : null;
    },
    [effectiveSteps, visibleMajorStepGroups]
  );

  useEffect(() => {
    const stepCfg = effectiveSteps[currentStep - 1];
    if (!stepCfg) return;
    const owningGroup = visibleMajorStepGroups.find((g) => g.steps.some((s) => s.id === stepCfg.id));
    if (owningGroup && owningGroup.id !== activeMajorStep) {
      setActiveMajorStep(owningGroup.id);
    }
  }, [activeMajorStep, currentStep, effectiveSteps, visibleMajorStepGroups]);

  useEffect(() => {
    const stepCfg = effectiveSteps[currentStep - 1];
    const activeGroup = visibleMajorStepGroups.find((g) => g.id === activeMajorStep);
    const stepInGroup = stepCfg && activeGroup?.steps.some((s) => s.id === stepCfg.id);
    if (!stepInGroup) {
      const fallbackIdx = getFirstStepIndexForGroup(activeMajorStep);
      if (fallbackIdx) setCurrentStep(fallbackIdx);
    }
  }, [activeMajorStep, currentStep, effectiveSteps, getFirstStepIndexForGroup, visibleMajorStepGroups]);

  useEffect(() => {
    if (!visibleMajorStepGroups.length) return;
    const hasActiveGroup = visibleMajorStepGroups.some((g) => g.id === activeMajorStep);
    const firstGroup = visibleMajorStepGroups[0];
    const firstIdx = getFirstStepIndexForGroup(firstGroup.id) ?? 1;

    if (!hasActiveGroup) {
      setActiveMajorStep(firstGroup.id);
      setCurrentStep(firstIdx);
      return;
    }

    const stepCfg = effectiveSteps[currentStep - 1];
    const stepVisible = stepCfg && visibleMajorStepGroups.some((g) => g.steps.some((s) => s.id === stepCfg.id));
    if (!stepVisible) {
      setCurrentStep(firstIdx);
    }
  }, [activeMajorStep, currentStep, effectiveSteps, getFirstStepIndexForGroup, visibleMajorStepGroups]);

  const fieldLabels: Record<string, string> = useMemo(() => {
    const map: Record<string, string> = {};
    steps.forEach((s) => s.fields.forEach((f) => (map[String(f.name)] = f.label)));
    return map;
  }, [steps]);

  const scrollTop = () => sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const handleInputChange = (name: keyof ViharaForm, value: string | boolean) => {
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

  const handleSetMany = (patch: Partial<ViharaForm>) => {
    setValues((prev) => {
      const next: Partial<ViharaForm> = { ...prev, ...patch };
      const cfgMap = new Map<string, any>();
      steps.forEach((s) => s.fields.forEach((f) => cfgMap.set(String(f.name), f)));
      const nextErrors: Errors<ViharaForm> = { ...errors };
      Object.keys(patch).forEach((k) => {
        const cfg = cfgMap.get(k);
        if (cfg) {
          const raw = String((next as any)[k] ?? "");
          nextErrors[cfg.name as keyof ViharaForm] = validateField(cfg, raw, next, today);
        }
      });
      setErrors(nextErrors);
      return next;
    });
  };

  const validateStep = (stepIndex: number): boolean => {
    const step = effectiveSteps[stepIndex - 1];
    if (!step) return true;
    const nextErrors: Errors<ViharaForm> = { ...errors };
    let valid = true;
    for (const f of step.fields) {
      if (f.name === "temple_owned_land" || f.name === "resident_bhikkhus") continue; // Skip table fields
      const raw = values[f.name];
      // Handle boolean values for checkboxes
      const stringValue = typeof raw === "boolean" ? String(raw) : (raw as string | undefined);
      const msg = validateField(f, stringValue, values, today);
      nextErrors[f.name] = msg;
      if (msg) valid = false;
    }
    if (stepIndex === 2) {
      if (!values.province) {
        nextErrors.province = "Required";
        valid = false;
      } else {
        nextErrors.province = "";
      }
    }
    setErrors(nextErrors);
    if (!valid) scrollTop();
    return valid;
  };

  const validateAll = (): { ok: boolean; firstInvalidStep: number | null } => {
    const visibleStepIds = new Set(visibleMajorStepGroups.flatMap((g) => g.steps.map((s) => s.id)));
    let firstInvalidStep: number | null = null;
    const aggregated: Errors<ViharaForm> = {};
    for (const step of steps) {
      if (stageQuery === "2" && !visibleStepIds.has(step.id)) continue;
      let stepValid = true;
      for (const f of step.fields) {
        if (f.name === "temple_owned_land" || f.name === "resident_bhikkhus") continue; // Skip table fields
        const raw = values[f.name];
        // Handle boolean values for checkboxes
        const stringValue = typeof raw === "boolean" ? String(raw) : (raw as string | undefined);
        const msg = validateField(f, stringValue, values, today);
        aggregated[f.name] = msg;
        if (msg) stepValid = false;
      }
      if (step.id === 2) {
        if (!values.province) {
          aggregated.province = "Required";
          stepValid = false;
        } else {
          aggregated.province = "";
        }
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
  const extractViharaId = (res: any): number | null => {
    const data = res?.data ?? res;
    const candidates = [
      data?.vh_id,
      data?.id,
      data?.data?.vh_id,
      data?.data?.id,
      data?.payload?.vh_id,
    ];
    for (const c of candidates) {
      const n = Number(c);
      if (Number.isFinite(n) && n > 0) return n;
    }
    return null;
  };

  const handleSaveFlowOne = async () => {
    if (!validateStep(currentStep)) return;

    try {
      setSubmitting(true);
      const stageOnePayload = mapFormToStageOneFields(values);
      const response = await _manageVihara({
        action: "SAVE_STAGE_ONE",
        payload: { data: stageOnePayload },
      } as any);

      const newId = extractViharaId(response);
      if (newId) {
        setCreatedViharaId(newId);
        router.replace(`/temple/vihara/add?id=${encodeURIComponent(String(newId))}`);
      }

      // Move the user directly to Stage 2 if they have access to both stages
      if (!isDivisionalSec) {
        const stageTwoStart = getFirstStepIndexForGroup(2) ?? (flowOneLastStepIndex ? flowOneLastStepIndex + 1 : null);
        if (stageTwoStart) {
          setActiveMajorStep(2);
          setCurrentStep(stageTwoStart);
          scrollTop();
        }
      }

      toast.success("Stage 1 data saved. Continue with Stage 2.", {
        autoClose: 1200,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to save Stage 1. Please try again.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };
  const handlePrevious = () => {
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  };

  // Helper function to map form fields to API field names
  // Backend expects snake_case field names with vh_ prefix for main fields
  // Array fields use camelCase (serialNumber, bhikkhuName, etc.)
  const mapFormToApiFields = (formData: Partial<ViharaForm>, parsedResidentBhikkhus: any[], parsedTempleOwnedLand: any[]) => {
    const periodRaw = formData.period_established ?? "";
    const normalizedPeriodDate = toYYYYMMDD(periodRaw);

    // Map temple_owned_land array fields - use camelCase as per API
    const mappedLand = parsedTempleOwnedLand.map((land: any) => ({
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

    // Map resident_bhikkhus array fields - use camelCase as per API
    const mappedBhikkhus = parsedResidentBhikkhus.map((bhikkhu: any) => ({
      serialNumber: bhikkhu.serialNumber ?? bhikkhu.serial_number ?? 0,
      bhikkhuName: bhikkhu.bhikkhuName ?? bhikkhu.bhikkhu_name ?? "",
      registrationNumber: bhikkhu.registrationNumber ?? bhikkhu.registration_number ?? "",
      occupationEducation: bhikkhu.occupationEducation ?? bhikkhu.occupation_education ?? "",
    }));

    // Owner code is a constant
    const ownerCode = "BH2025000001";

    // Parse dayaka_families_count to number for vh_fmlycnt
    const dayakaCount = formData.dayaka_families_count ? parseInt(formData.dayaka_families_count, 10) : 0;
    const dayakaCountNum = isNaN(dayakaCount) ? 0 : dayakaCount;

    // Parse period_established (now a date field) to date format for vh_bgndate (YYYY-MM-DD)
    // Since it's a date field, it should already be in YYYY-MM-DD format
    let bgndate: string | null = null;
    if (normalizedPeriodDate) {
      bgndate = normalizedPeriodDate;
    }

    // Return payload with backend field names (snake_case with vh_ prefix)
    const payload: any = {
      // Step A: Basic Information
      vh_mobile: formData.telephone_number ?? "",
      vh_whtapp: formData.whatsapp_number ?? "",
      vh_email: formData.email_address ?? "",
      vh_typ: "VIHARA",
      vh_gndiv: formData.grama_niladhari_division ?? "",
      vh_ownercd: ownerCode,
      vh_parshawa: formData.parshawaya ?? "",
      vh_vname: formData.temple_name ?? "",
      vh_addrs: formData.temple_address ?? "",
      
      // Step B: Administrative Divisions
      vh_province: formData.province ?? "",
      vh_district: formData.district ?? "",
      vh_divisional_secretariat: formData.divisional_secretariat ?? "",
      vh_pradeshya_sabha: formData.pradeshya_sabha ?? "",
      
      // Step C: Religious Affiliation
      vh_nikaya: formData.nikaya ?? "",
      
      // Step D: Leadership
      vh_viharadhipathi_name: formData.viharadhipathi_name ?? "",
      vh_viharadhipathi_regn: formData.viharadhipathi_regn ?? "",
      vh_period_established: periodRaw,
      
      // Step E: Assets & Activities
      vh_buildings_description: formData.buildings_description ?? "",
      vh_dayaka_families_count: formData.dayaka_families_count ?? "",
      vh_fmlycnt: dayakaCountNum,
      vh_kulangana_committee: formData.kulangana_committee ?? "",
      vh_dayaka_sabha: formData.dayaka_sabha ?? "",
      vh_temple_working_committee: formData.temple_working_committee ?? "",
      vh_other_associations: formData.other_associations ?? "",
      
      // Step F: Land Information
      temple_owned_land: mappedLand,
      vh_land_info_certified: formData.land_info_certified ?? false,
      
      // Step G: Resident Bhikkhus
      resident_bhikkhus: mappedBhikkhus,
      vh_resident_bhikkhus_certified: formData.resident_bhikkhus_certified ?? false,
      
      // Step H: Inspection
      vh_inspection_report: formData.inspection_report ?? "",
      vh_inspection_code: formData.inspection_code ?? "",
      
      // Step I: Ownership
      vh_grama_niladhari_division_ownership: formData.grama_niladhari_division_ownership ?? "",
      vh_sanghika_donation_deed: formData.sanghika_donation_deed ?? false,
      vh_government_donation_deed: formData.government_donation_deed ?? false,
      vh_government_donation_deed_in_progress: formData.government_donation_deed_in_progress ?? false,
      vh_authority_consent_attached: formData.authority_consent_attached ?? false,
      vh_recommend_new_center: formData.recommend_new_center ?? false,
      vh_recommend_registered_temple: formData.recommend_registered_temple ?? false,
      
      // Step J: Annex II
      vh_annex2_recommend_construction: formData.annex2_recommend_construction ?? false,
      vh_annex2_land_ownership_docs: formData.annex2_land_ownership_docs ?? false,
      vh_annex2_chief_incumbent_letter: formData.annex2_chief_incumbent_letter ?? false,
      vh_annex2_coordinator_recommendation: formData.annex2_coordinator_recommendation ?? false,
      vh_annex2_divisional_secretary_recommendation: formData.annex2_divisional_secretary_recommendation ?? false,
      vh_annex2_approval_construction: formData.annex2_approval_construction ?? false,
      vh_annex2_referral_resubmission: formData.annex2_referral_resubmission ?? false,
    };

    // Only include vh_bgndate if we have a valid date value
    if (bgndate) {
      payload.vh_bgndate = bgndate;
    }

    return payload;
  };

  const mapFormToStageOneFields = (formData: Partial<ViharaForm>) => {
    const establishmentDate = toYYYYMMDD(formData.period_established);
    const ownerCode = formData.viharadhipathi_regn || "BH2025000001";

    return {
      vh_vname: formData.temple_name ?? "",
      vh_addrs: formData.temple_address ?? "",
      vh_mobile: formData.telephone_number ?? "",
      vh_whtapp: formData.whatsapp_number ?? "",
      vh_email: formData.email_address ?? "",
      vh_province: formData.province ?? "",
      vh_district: formData.district ?? "",
      vh_divisional_secretariat: formData.divisional_secretariat ?? "",
      vh_gndiv: formData.grama_niladhari_division ?? "",
      vh_nikaya: formData.nikaya ?? "",
      vh_parshawa: formData.parshawaya ?? "",
      vh_typ: "VIHARA",
      vh_ownercd: ownerCode,
      vh_viharadhipathi_name: formData.viharadhipathi_name ?? "",
      vh_viharadhipathi_regn: formData.viharadhipathi_regn ?? "",
      vh_period_established: formData.period_established ?? "",
      ...(establishmentDate ? { vh_bgndate: establishmentDate } : {}),
    };
  };

  const handleSubmit = async () => {
    console.log("Submitting Vihara form", {
      stageQuery,
      viharaId,
      createdViharaId,
      currentStep,
      activeMajorStep,
    });
    const { ok, firstInvalidStep } = validateAll();
    if (!ok && firstInvalidStep) {
      setCurrentStep(firstInvalidStep);
      scrollTop();
      return;
    }

    try {
      setSubmitting(true);
      // Parse JSON strings back to objects/arrays for resident_bhikkhus and temple_owned_land
      let parsedResidentBhikkhus: any[] = [];
      let parsedTempleOwnedLand: any[] = [];
      
      try {
        parsedResidentBhikkhus = values.resident_bhikkhus 
          ? (typeof values.resident_bhikkhus === 'string' ? JSON.parse(values.resident_bhikkhus) : values.resident_bhikkhus)
          : [];
      } catch (e) {
        console.error("Error parsing resident_bhikkhus:", e);
        parsedResidentBhikkhus = [];
      }
      
      try {
        parsedTempleOwnedLand = values.temple_owned_land 
          ? (typeof values.temple_owned_land === 'string' ? JSON.parse(values.temple_owned_land) : values.temple_owned_land)
          : [];
      } catch (e) {
        console.error("Error parsing temple_owned_land:", e);
        parsedTempleOwnedLand = [];
      }
      
      const apiPayload = mapFormToApiFields(values, parsedResidentBhikkhus, parsedTempleOwnedLand);
      console.log("Vihara Form Payload:", apiPayload);
      const effectiveVhId = createdViharaId ?? parseId(viharaId);
      const hasVhId = typeof effectiveVhId === "number" && !Number.isNaN(effectiveVhId);

      // Force stage-2 save when requested via query
      if (stageQuery === "2" && !hasVhId) {
        toast.error("Vihara ID missing for Stage 2. Please start from Stage 1.");
        return;
      }

      const action = stageQuery === "2" ? "SAVE_STAGE_TWO" : "CREATE";

      const payload =
        action === "SAVE_STAGE_TWO"
          ? { vh_id: effectiveVhId, data: apiPayload }
          : { data: apiPayload };

      await _manageVihara({ action, payload } as any);

      const successMsg = action === "SAVE_STAGE_TWO"
        ? "Stage 2 data saved successfully."
        : "Vihara created successfully.";

      toast.success(successMsg, {
        autoClose: 1200,
        onClose: () => router.push("/temple/vihara"),
      });

      setTimeout(() => router.push("/temple/vihara"), 1400);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to submit. Please try again.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Display/labels for review
  const [display, setDisplay] = useState<{
    viharadhipathi_name?: string;
    nikaya?: string;
    parshawaya?: string;
  }>({});

  // Nikaya & Parshawa
  const nikayaData = STATIC_NIKAYA_DATA;
  const nikayaLoading = false;
  const nikayaError: string | null = null;

  const findNikayaByCode = useCallback((code?: string | null) => nikayaData.find((n) => n.nikaya.code === (code ?? "")), [nikayaData]);
  const parshawaOptions = useCallback((nikayaCode?: string | null) => findNikayaByCode(nikayaCode)?.parshawayas ?? [], [findNikayaByCode]);

  const onPickNikaya = (code: string) => {
    const item = findNikayaByCode(code);
    handleInputChange("nikaya", code);
    setDisplay((d) => ({ ...d, nikaya: item ? `${item.nikaya.name} — ${item.nikaya.code}` : code }));
  };

  const onPickParshawa = (code: string) => {
    handleInputChange("parshawaya", code);
    const nikaya = findNikayaByCode(values.nikaya);
    const p = nikaya?.parshawayas.find((x) => x.code === code);
    setDisplay((d) => ({ ...d, parshawaya: p ? `${p.name} - ${p.code}` : code }));
  };

  // Parse JSON arrays for tables
  const landInfoRows: LandInfoRow[] = useMemo(() => {
    try {
      const parsed = JSON.parse(values.temple_owned_land || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [values.temple_owned_land]);

  const residentBhikkhuRows: ResidentBhikkhuRow[] = useMemo(() => {
    try {
      const parsed = JSON.parse(values.resident_bhikkhus || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [values.resident_bhikkhus]);

  const handleLandInfoChange = (rows: LandInfoRow[]) => {
    handleInputChange("temple_owned_land", JSON.stringify(rows));
  };

  const handleResidentBhikkhuChange = (rows: ResidentBhikkhuRow[]) => {
    handleInputChange("resident_bhikkhus", JSON.stringify(rows));
  };

  // Helper function to look up GN name from code
  const lookupGnName = useCallback((gnCode: string | undefined): string => {
    if (!gnCode) return "";
    const provinces = Array.isArray((selectionsData as any)?.provinces) ? ((selectionsData as any).provinces as any[]) : [];
    for (const province of provinces) {
      for (const district of province.districts || []) {
        for (const division of district.divisional_secretariats || []) {
          for (const gn of division.gn_divisions || []) {
            const code = gn.gn_gnc || gn.gn_code;
            if (code === gnCode) {
              return gn.gn_gnname || "";
            }
          }
        }
      }
    }
    return "";
  }, []);

  // Auto-populate grama_niladhari_division_ownership from grama_niladhari_division when navigating to step 9
  useEffect(() => {
    if (currentStep === 9 && values.grama_niladhari_division) {
      const gnName = lookupGnName(values.grama_niladhari_division);
      // Always sync the ownership field with the selected GN division name when on step 9
      if (gnName && gnName !== values.grama_niladhari_division_ownership) {
        handleSetMany({ grama_niladhari_division_ownership: gnName });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, values.grama_niladhari_division, lookupGnName]);

  const gridCols = currentStep === 5 ? "md:grid-cols-3" : "md:grid-cols-2";

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
                    <h1 className="text-2xl font-bold text-white mb-1">Temple Registration Form</h1>
                    <p className="text-slate-300 text-sm">Please complete all required information</p>
                  </div>
                </div>
              </div>

              <div className="px-4 md:px-10 py-6" ref={sectionRef}>
                {visibleMajorStepGroups.length > 1 && (
                  <div className="flex flex-wrap gap-3 mb-4">
                    {visibleMajorStepGroups.map((group, idx) => {
                      const firstStepId = group.steps[0]?.id;
                      const targetIndex = firstStepId ? effectiveSteps.findIndex((s) => s.id === firstStepId) + 1 : null;
                      const isActive = group.id === activeMajorStep;
                      return (
                        <button
                          key={group.id}
                          onClick={() => {
                            setActiveMajorStep(group.id);
                            if (targetIndex) {
                              setCurrentStep(targetIndex);
                            }
                            scrollTop();
                          }}
                          className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                            isActive
                              ? "bg-slate-800 text-white border-slate-800 shadow-sm"
                              : "bg-white text-slate-700 border-slate-200 hover:border-slate-400"
                          }`}
                        >
                          Vihara flow {idx + 1}
                        </button>
                      );
                    })}
                  </div>
                )}
                {/* Stepper */}
                <div className="flex items-center justify-between mb-6 overflow-x-auto">
                  {visibleSteps.map((step, idx) => {
                    const stepIndex = effectiveSteps.findIndex((s) => s.id === step.id) + 1;
                    const isCompleted = currentStep > stepIndex;
                    const isCurrent = currentStep === stepIndex;
                    return (
                      <div key={step.id} className="flex items-center flex-1 min-w-[80px]">
                        <div className="flex flex-col items-center flex-1">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${isCompleted ? "bg-green-500 text-white" : isCurrent ? "bg-slate-700 text-white ring-4 ring-slate-200" : "bg-slate-200 text-slate-400"}`}>
                            {isCompleted ? "✓" : idx + 1}
                          </div>
                          <span className={`text-[10px] mt-2 font-medium text-center ${isCurrent || isCompleted ? "text-slate-700" : "text-slate-400"}`}>{step.title}</span>
                        </div>
                        {idx < visibleSteps.length - 1 && <div className={`h-1 flex-1 mx-2 rounded transition-all duration-300 ${isCompleted ? "bg-green-500" : "bg-slate-200"}`} />}
                      </div>
                    );
                  })}
                </div>

                {/* Form sections */}
                <div className="min-h-[360px]">
                  <h2 className="text-xl font-bold text-slate-800 mb-5">{stepTitle}</h2>

                  {!isReview && (
                    <div className={`grid grid-cols-1 ${gridCols} gap-5`}>
                      {currentStep === 6 && (
                        <div className="md:col-span-2">
                          <LandInfoTable value={landInfoRows} onChange={handleLandInfoChange} error={errors.temple_owned_land} />
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
                          <ImportantNotes className="mt-4">
                            <strong>Important Notes:</strong>
                            <br />
                            Documents confirming that the ownership of the land has been transferred to the temple (Sangha) must be submitted.
                            <br />
                            If it is a government-owned land, confirmation of transfer to the temple must be issued by the Divisional Secretary.
                          </ImportantNotes>
                        </div>
                      )}

                      {currentStep === 7 && (
                        <div className="md:col-span-2">
                          <ResidentBhikkhuTable value={residentBhikkhuRows} onChange={handleResidentBhikkhuChange} error={errors.resident_bhikkhus} />
                          <div className="mt-4">
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={values.resident_bhikkhus_certified || false}
                                onChange={(e) => handleInputChange("resident_bhikkhus_certified", e.target.checked)}
                                className="w-4 h-4"
                              />
                              <span className="text-sm font-medium text-slate-700">I certify that the above information is true and correct.</span>
                            </label>
                            {errors.resident_bhikkhus_certified && <p className="mt-1 text-sm text-red-600">{errors.resident_bhikkhus_certified}</p>}
                          </div>
                        </div>
                      )}

                      {/* Step J: Annex II - Special rendering with sub-headers */}
                      {currentStep === 10 && (
                        <div className="md:col-span-2 space-y-6">
                          {/* Permission for Construction and Maintenance of New Religious Centers */}
                          <div className="space-y-3">
                            <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-300 pb-2">
                              Permission for Construction and Maintenance of New Religious Centers
                            </h3>
                            {current.fields
                              .filter((f) => f.name === "annex2_recommend_construction")
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
                          </div>

                          {/* Criteria Considered for Registration of a Religious Institution */}
                          <div className="space-y-3">
                            <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-300 pb-2">
                              Criteria Considered for Registration of a Religious Institution
                            </h3>
                            {current.fields
                              .filter((f) => 
                                f.name === "annex2_land_ownership_docs" ||
                                f.name === "annex2_chief_incumbent_letter" ||
                                f.name === "annex2_coordinator_recommendation" ||
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
                          </div>

                          {/* Approval of Secretary, Ministry of Buddha Sasana */}
                          <div className="space-y-3">
                            <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-300 pb-2">
                              Approval of Secretary, Ministry of Buddha Sasana
                            </h3>
                            {current.fields
                              .filter((f) => 
                                f.name === "annex2_approval_construction" ||
                                f.name === "annex2_referral_resubmission"
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
                          </div>
                        </div>
                      )}

                      {currentStep !== 6 && currentStep !== 7 && currentStep !== 10 && current.fields.map((f) => {
                        const id = String(f.name);
                        const rawVal = (values[f.name] as unknown as string) ?? "";
                        const val = f.type === "date" ? toYYYYMMDD(rawVal) : rawVal;
                        const err = errors[f.name];

                        // Skip table fields in regular rendering
                        if (id === "temple_owned_land" || id === "resident_bhikkhus") return null;

                        // Step B: Administrative Divisions - use LocationPicker
                        if (currentStep === 2 && id === "district") {
                          const selection = {
                            provinceCode: (values.province as string) || undefined,
                            districtCode: (values.district as string) || undefined,
                            divisionCode: (values.divisional_secretariat as string) || undefined,
                            gnCode: (values.grama_niladhari_division as string) || undefined,
                          };
                          return (
                            <div key={id} className="md:col-span-2">
                              <LocationPicker
                                value={selection}
                                onChange={(sel, payload) => {
                                  // Get GN name from payload, or look it up if not available
                                  const gnName = payload.gn?.gn_gnname ?? (sel.gnCode ? lookupGnName(sel.gnCode) : "");
                                  const updates: Partial<ViharaForm> = {
                                    province: sel.provinceCode ?? "",
                                    district: sel.districtCode ?? "",
                                    divisional_secretariat: sel.divisionCode ?? "",
                                    grama_niladhari_division: sel.gnCode ?? "",
                                  };
                                  // Always update the ownership field when GN division is selected/changed
                                  if (sel.gnCode && gnName) {
                                    updates.grama_niladhari_division_ownership = gnName;
                                  } else if (!sel.gnCode) {
                                    // If GN is cleared, clear the ownership field too
                                    updates.grama_niladhari_division_ownership = "";
                                  }
                                  handleSetMany(updates);
                                }}
                                required={false}
                                requiredFields={{ province: true, district: false, division: false, gn: false }}
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
                            </div>
                          );
                        }

                        if (id === "divisional_secretariat" || id === "grama_niladhari_division") return null; // Handled by LocationPicker

                        // Pradeshya Sabha field
                        if (id === "pradeshya_sabha") {
                          return (
                            <div key={id}>
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

                        // Step C: Nikaya & Parshawa
                        if (id === "nikaya") {
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
                                  value={values.nikaya ?? ""}
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

                        if (id === "parshawaya") {
                          const options = parshawaOptions(values.nikaya);
                          return (
                            <div key={id}>
                              <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-2">{f.label}</label>
                              <select
                                id={id}
                                value={values.parshawaya ?? ""}
                                onChange={(e) => onPickParshawa(e.target.value)}
                                required={!!f.rules?.required}
                                disabled={!values.nikaya || options.length === 0}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all disabled:bg-slate-100"
                              >
                                <option value="">{values.nikaya ? "Select Parshawaya" : "Select Nikaya first"}</option>
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

                        // Step D: Viharadhipathi
                        if (id === "viharadhipathi_name") {
                          const displayValue =
                            values.viharadhipathi_name && values.viharadhipathi_regn
                              ? `${values.viharadhipathi_name} - ${values.viharadhipathi_regn}`
                              : (values.viharadhipathi_name as string) || "";
                          return (
                            <div key={id} className="md:col-span-2">
                              <BhikkhuAutocomplete
                                id={id}
                                label={f.label}
                                required={!!f.rules?.required}
                                initialDisplay={displayValue}
                                placeholder="Type a Bhikkhu name or registration number"
                                onPick={(picked) => {
                                  handleSetMany({
                                    viharadhipathi_name: picked.name ?? "",
                                    viharadhipathi_regn: picked.regn ?? "",
                                  });
                                }}
                              />
                              {err ? <p className="mt-1 text-sm text-red-600">{err}</p> : null}
                            </div>
                          );
                        }

                        // Checkbox fields (Step I)
                        if (id.includes("sanghika_donation_deed") || id.includes("government_donation_deed") || id.includes("authority_consent") || id.includes("recommend_")) {
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

                        // Step H: Inspection Code placeholder
                        if (id === "inspection_code") {
                          return (
                            <div key={id}>
                              <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-2">
                                This temple has been personally inspected by me. Accordingly, the following code has been issued:
                              </label>
                              <input
                                id={id}
                                type="text"
                                value={val}
                                onChange={(e) => handleInputChange(f.name, e.target.value)}
                                placeholder="Enter code"
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                              />
                              {err ? <p className="mt-1 text-sm text-red-600">{err}</p> : null}
                            </div>
                          );
                        }

                        // Step I: Grama Niladhari Division placeholder
                        if (id === "grama_niladhari_division_ownership") {
                          return (
                            <div key={id} className="md:col-span-2">
                              <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-2">
                                {f.label}
                              </label>
                              <input
                                id={id}
                                type="text"
                                value={val}
                                onChange={(e) => handleInputChange(f.name, e.target.value)}
                                placeholder="Enter division name"
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                              />
                              {err ? <p className="mt-1 text-sm text-red-600">{err}</p> : null}
                            </div>
                          );
                        }

                        // Textarea fields
                        if (f.type === "textarea") {
                          const idStr = String(f.name);
                          // For Step 5, make buildings_description span 3 columns, others span 1
                          const spanClass = currentStep === 5 
                            ? (idStr === "buildings_description" ? "md:col-span-3" : "")
                            : (idStr === "inspection_report" || idStr === "buildings_description" ? "md:col-span-2" : "");
                          return (
                            <div key={idStr} className={spanClass}>
                              <label htmlFor={idStr} className="block text-sm font-medium text-slate-700 mb-1.5">{f.label}</label>
                              <textarea
                                id={idStr}
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
                          <div key={id} className={currentStep === 5 && id === "dayaka_families_count" ? "md:col-span-3" : ""}>
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

                      {/* Step I: Important Notes */}
                      {currentStep === 9 && (
                        <div className="md:col-span-2">
                          <ImportantNotes>
                            <strong>Important:</strong>
                            <br />
                            Every section of this application form must be accurately completed.
                            <br />
                            If a letter confirming the appointment of the Chief Incumbent (Viharadhipathi) issued by the Most Venerable Mahanayaka Thero and addressed to the Commissioner General of Buddhist Affairs is submitted together with this application, the temple registration process can be completed more quickly.
                            <br />
                            If the temple has been constructed after 10 September 2008, Annex II must also be completed and submitted.
                          </ImportantNotes>
                        </div>
                      )}
                    </div>
                  )}

                  {isReview && (
                    <div className="space-y-6">
                      <p className="text-slate-600">Review your details below. Use <span className="font-medium">Edit</span> to jump to a section.</p>
                      {reviewSteps.map((s) => (
                        <div key={s.id} className="border border-slate-200 rounded-xl p-4 md:p-5">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-semibold text-slate-800">{s.title}</h3>
                            <button className="px-3 py-1.5 text-sm bg-slate-200 rounded-lg hover:bg-slate-300" onClick={() => setCurrentStep(s.id)}>Edit</button>
                          </div>
                          {s.id === 6 && (
                            <div className="mt-4">
                              <p className="text-sm font-medium text-slate-700 mb-2">Land Information:</p>
                              <p className="text-sm text-slate-600">{landInfoRows.length} land record(s) entered</p>
                            </div>
                          )}
                          {s.id === 7 && (
                            <div className="mt-4">
                              <p className="text-sm font-medium text-slate-700 mb-2">Resident Bhikkhus:</p>
                              <p className="text-sm text-slate-600">{residentBhikkhuRows.length} bhikkhu record(s) entered</p>
                            </div>
                          )}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {s.fields.map((f) => {
                              const key = String(f.name);
                              if (key === "temple_owned_land" || key === "resident_bhikkhus") return null;
                              const v0 = (values[f.name] as unknown as string | boolean) ?? "";
                              const v = typeof v0 === "boolean" ? (v0 ? "Yes" : "No") : String(v0);
                              const shown =
                                key === "nikaya" ? display.nikaya || v :
                                key === "parshawaya" ? display.parshawaya || v : v;
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

                  <div className="text-sm text-slate-600 font-medium text-center">Step {currentStepDisplay} of {visibleSteps.length}</div>

                  {currentStep < effectiveSteps.length ? (
                    isFlowOneExitStep ? (
                      <button
                        onClick={handleSaveFlowOne}
                        disabled={submitting}
                        className="flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-700 text-white rounded-lg font-medium hover:bg-slate-800 transition-all"
                      >
                        {submitting ? "Saving..." : "Save"}
                      </button>
                    ) : (
                      <button onClick={handleNext} className="flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-700 text-white rounded-lg font-medium hover:bg-slate-800 transition-all">
                        Next ›
                      </button>
                    )
                    ) : (
                      <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="flex items-center justify-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-all disabled:opacity-70"
                      >
                      {submitting ? "Saving..." : "Save"}
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

export default function AddVihara({ department }: { department?: string }) {
  return (
    <Suspense fallback={<div className="p-8 text-slate-600">Loading…</div>}>
      <AddViharaPageInner department={department} />
    </Suspense>
  );
}
