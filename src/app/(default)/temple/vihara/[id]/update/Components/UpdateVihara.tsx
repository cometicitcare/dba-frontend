"use client";

import React, { useMemo, useRef, useState, useCallback, Suspense, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { _manageVihara, _uploadScannedDocument } from "@/services/vihara";
import { FooterBar } from "@/components/FooterBar";
import { TopBar } from "@/components/TopBar";
import { Sidebar } from "@/components/Sidebar";
import selectionsData from "@/utils/selectionsData.json";
import QRCode from "react-qr-code";

import {
  DateField,
  LocationPicker,
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
} from "../../../add/Components";

import { Tabs } from "@/components/ui/Tabs";

// Toasts
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { ADMIN_ROLE_LEVEL } from "@/utils/config";

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

const CERTIFICATE_URL_BASE = "https://hrms.dbagovlk.com/vihara/certificate";
const SAMPLE_CERT_URL = `${CERTIFICATE_URL_BASE}/sample`;

type CertificateMeta = {
  number: string;
  url: string;
};

export const dynamic = "force-dynamic";

function UpdateViharaPageInner({ role }: { role: string | undefined }) {
  const router = useRouter();
  const params = useParams();
  const viharaId = params?.id as string | undefined;

  const baseSteps = useMemo(() => viharaSteps(), []);
  const steps = useMemo(() => {
    const certTab: StepConfig<ViharaForm> = {
      id: baseSteps.length + 1,
      title: "Certificates",
      fields: [],
    };
    const scannedTab: StepConfig<ViharaForm> = {
      id: baseSteps.length + 2,
      title: "Upload Scanned Files",
      fields: [],
    };
    return [...baseSteps, certTab, scannedTab];
  }, [baseSteps]);
  const [activeTab, setActiveTab] = useState<number>(1);
  const [values, setValues] = useState<Partial<ViharaForm>>({
    ...viharaInitialValues,
  });
  const [errors, setErrors] = useState<Errors<ViharaForm>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const certificatePaperRef = useRef<HTMLDivElement | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [certificateMeta, setCertificateMeta] = useState<CertificateMeta>({
    number: "",
    url: "",
  });
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [scannedFile, setScannedFile] = useState<File | null>(null);
  const [uploadingScan, setUploadingScan] = useState(false);
  const [approving, setApproving] = useState(false);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const current = steps[activeTab - 1];
  const stepTitle = current?.title ?? "";
  const isCertificatesTab = stepTitle === "Certificates";
  const isScannedFilesTab = stepTitle === "Upload Scanned Files";

  // Helper function to map API fields to form fields
  const mapApiToFormFields = (apiData: any): Partial<ViharaForm> => {
    // Map temple_owned_land array fields - handle both camelCase and snake_case from API
    const mappedLand = (apiData.temple_lands || []).map((land: any) => ({
      id: String(land.id || land.serial_number || land.serialNumber || Math.random()),
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

    // Map resident_bhikkhus array fields - handle both camelCase and snake_case from API
    const mappedBhikkhus = (apiData.resident_bhikkhus || []).map((bhikkhu: any) => ({
      id: String(bhikkhu.id || bhikkhu.serial_number || bhikkhu.serialNumber || Math.random()),
      serialNumber: bhikkhu.serialNumber ?? bhikkhu.serial_number ?? 0,
      bhikkhuName: bhikkhu.bhikkhuName ?? bhikkhu.bhikkhu_name ?? "",
      registrationNumber: bhikkhu.registrationNumber ?? bhikkhu.registration_number ?? "",
      occupationEducation: bhikkhu.occupationEducation ?? bhikkhu.occupation_education ?? "",
    }));

    return {
      // Step A: Basic Information
      temple_name: apiData.vh_vname ?? "",
      temple_address: apiData.vh_addrs ?? "",
      telephone_number: apiData.vh_mobile ?? "",
      whatsapp_number: apiData.vh_whtapp ?? "",
      email_address: apiData.vh_email ?? "",
      
      // Step B: Administrative Divisions
      province: apiData.vh_province ?? "",
      district: apiData.vh_district ?? "",
      divisional_secretariat: apiData.vh_divisional_secretariat ?? "",
      pradeshya_sabha: apiData.vh_pradeshya_sabha ?? "",
      grama_niladhari_division: apiData.vh_gndiv ?? "",
      
      // Step C: Religious Affiliation
      nikaya: apiData.vh_nikaya ?? "",
      parshawaya: apiData.vh_parshawa ?? "",
      
      // Step D: Leadership
      viharadhipathi_name: apiData.vh_viharadhipathi_name ?? "",
      period_established: apiData.vh_period_established ?? "",
      
      // Step E: Assets & Activities
      buildings_description: apiData.vh_buildings_description ?? "",
      dayaka_families_count: apiData.vh_dayaka_families_count ?? "",
      kulangana_committee: apiData.vh_kulangana_committee ?? "",
      dayaka_sabha: apiData.vh_dayaka_sabha ?? "",
      temple_working_committee: apiData.vh_temple_working_committee ?? "",
      other_associations: apiData.vh_other_associations ?? "",
      
      // Step F: Land Information
      temple_owned_land: JSON.stringify(mappedLand),
      land_info_certified: apiData.vh_land_info_certified ?? false,
      
      // Step G: Resident Bhikkhus
      resident_bhikkhus: JSON.stringify(mappedBhikkhus),
      resident_bhikkhus_certified: apiData.vh_resident_bhikkhus_certified ?? false,
      
      // Step H: Inspection
      inspection_report: apiData.vh_inspection_report ?? "",
      inspection_code: apiData.vh_inspection_code ?? "",
      
      // Step I: Ownership
      grama_niladhari_division_ownership: apiData.vh_grama_niladhari_division_ownership ?? "",
      sanghika_donation_deed: apiData.vh_sanghika_donation_deed ?? false,
      government_donation_deed: apiData.vh_government_donation_deed ?? false,
      government_donation_deed_in_progress: apiData.vh_government_donation_deed_in_progress ?? false,
      authority_consent_attached: apiData.vh_authority_consent_attached ?? false,
      recommend_new_center: apiData.vh_recommend_new_center ?? false,
      recommend_registered_temple: apiData.vh_recommend_registered_temple ?? false,
      
      // Step J: Annex II
      annex2_recommend_construction: apiData.vh_annex2_recommend_construction ?? false,
      annex2_land_ownership_docs: apiData.vh_annex2_land_ownership_docs ?? false,
      annex2_chief_incumbent_letter: apiData.vh_annex2_chief_incumbent_letter ?? false,
      annex2_coordinator_recommendation: apiData.vh_annex2_coordinator_recommendation ?? false,
      annex2_divisional_secretary_recommendation: apiData.vh_annex2_divisional_secretary_recommendation ?? false,
      annex2_approval_construction: apiData.vh_annex2_approval_construction ?? false,
      annex2_referral_resubmission: apiData.vh_annex2_referral_resubmission ?? false,
    };
  };

  // Load data for update
  useEffect(() => {
    if (!viharaId) {
      setLoading(false);
      return;
    }

    const loadViharaData = async () => {
      try {
        setLoading(true);
        // Use READ_ONE API to fetch vihara data
        const response = await _manageVihara({
          action: "READ_ONE",
          payload: {
            // Try vh_id first (if it's a number), otherwise use as vh_trn
            ...(isNaN(Number(viharaId)) ? { vh_trn: viharaId } : { vh_id: Number(viharaId) }),
          },
        });

        const apiData = (response.data as any)?.data || response.data;
        console.log("Loading vihara data from API:", apiData);
        
        // Map API fields to form fields
        const formData = mapApiToFormFields(apiData);
        const filledValues = {
          ...viharaInitialValues,
          ...formData,
        };
        setValues(filledValues);
        console.log("Form values auto-filled:", filledValues);
        
        // Update display state for nikaya and parshawaya
        if (filledValues.nikaya) {
          const nikayaItem = STATIC_NIKAYA_DATA.find((n) => n.nikaya.code === filledValues.nikaya);
          if (nikayaItem) {
            setDisplay((d) => ({ ...d, nikaya: `${nikayaItem.nikaya.name} — ${nikayaItem.nikaya.code}` }));
          }
        }
        if (filledValues.parshawaya && filledValues.nikaya) {
          const nikayaItem = STATIC_NIKAYA_DATA.find((n) => n.nikaya.code === filledValues.nikaya);
          const parshawaItem = nikayaItem?.parshawayas.find((p) => p.code === filledValues.parshawaya);
          if (parshawaItem) {
            setDisplay((d) => ({ ...d, parshawaya: `${parshawaItem.name} - ${parshawaItem.code}` }));
          }
        }

        // Set certificate metadata
        const certificateNumber = String(apiData?.vh_trn ?? apiData?.vh_id ?? "");
        const certificateUrl = certificateNumber
          ? `${CERTIFICATE_URL_BASE}/${encodeURIComponent(certificateNumber)}`
          : "";
        setCertificateMeta({ number: certificateNumber, url: certificateUrl });
      } catch (error) {
        console.error("Error loading vihara data:", error);
        toast.error("Failed to load vihara data");
      } finally {
        setLoading(false);
      }
    };

    loadViharaData();
  }, [viharaId]);

  const fieldLabels: Record<string, string> = useMemo(() => {
    const map: Record<string, string> = {};
    steps.forEach((s) => s.fields.forEach((f) => (map[String(f.name)] = f.label)));
    return map;
  }, [steps]);

  const fieldByName: Map<string, any> = useMemo(() => {
    const m = new Map<string, any>();
    steps.forEach((s) => s.fields.forEach((f) => m.set(String(f.name), f)));
    return m;
  }, [steps]);

  const scrollTop = () => sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const handleInputChange = (name: keyof ViharaForm, value: string | boolean) => {
    setValues((prev) => {
      const next = { ...prev, [name]: value };
      const cfg = fieldByName.get(String(name));
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
      const nextErrors: Errors<ViharaForm> = { ...errors };
      Object.keys(patch).forEach((k) => {
        const cfg = fieldByName.get(k);
        if (cfg) {
          const raw = String((next as any)[k] ?? "");
          nextErrors[cfg.name as keyof ViharaForm] = validateField(cfg, raw, next, today);
        }
      });
      setErrors(nextErrors);
      return next;
    });
  };

  const validateTab = (tabIndex: number): boolean => {
    const step = steps[tabIndex - 1];
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
    // Special validation for step 2: also validate province
    if (tabIndex === 2) {
      if (!values.province) {
        nextErrors.province = "Required";
        valid = false;
      }
    }
    setErrors(nextErrors);
    if (!valid) scrollTop();
    return valid;
  };

  const buildPartialPayloadForTab = (tabIndex: number): Partial<any> => {
    const s = steps[tabIndex - 1];
    if (!s) return {};
    
    const payload: any = {};
    
    // Handle special cases for table fields
    if (tabIndex === 6) { // Land Information tab
      try {
        const parsedLand = values.temple_owned_land 
          ? (typeof values.temple_owned_land === 'string' ? JSON.parse(values.temple_owned_land) : values.temple_owned_land)
          : [];
        const mappedLand = parsedLand.map((land: any) => ({
          serial_number: land.serialNumber ?? land.serial_number,
          land_name: land.landName ?? land.land_name,
          village: land.village,
          district: land.district,
          extent: land.extent,
          cultivation_description: land.cultivationDescription ?? land.cultivation_description,
          ownership_nature: land.ownershipNature ?? land.ownership_nature,
          deed_number: land.deedNumber ?? land.deed_number,
          title_registration_number: land.titleRegistrationNumber ?? land.title_registration_number,
          tax_details: land.taxDetails ?? land.tax_details,
          land_occupants: land.landOccupants ?? land.land_occupants,
        }));
        payload.temple_owned_land = mappedLand;
        payload.vh_land_info_certified = values.land_info_certified ?? false;
      } catch (e) {
        console.error("Error parsing temple_owned_land:", e);
      }
      return payload;
    }
    
    if (tabIndex === 7) { // Resident Bhikkhus tab
      try {
        const parsedBhikkhus = values.resident_bhikkhus 
          ? (typeof values.resident_bhikkhus === 'string' ? JSON.parse(values.resident_bhikkhus) : values.resident_bhikkhus)
          : [];
        const mappedBhikkhus = parsedBhikkhus.map((bhikkhu: any) => ({
          serial_number: bhikkhu.serialNumber ?? bhikkhu.serial_number,
          bhikkhu_name: bhikkhu.bhikkhuName ?? bhikkhu.bhikkhu_name,
          registration_number: bhikkhu.registrationNumber ?? bhikkhu.registration_number,
          occupation_education: bhikkhu.occupationEducation ?? bhikkhu.occupation_education,
        }));
        payload.resident_bhikkhus = mappedBhikkhus;
        payload.vh_resident_bhikkhus_certified = values.resident_bhikkhus_certified ?? false;
      } catch (e) {
        console.error("Error parsing resident_bhikkhus:", e);
      }
      return payload;
    }
    
    // Handle regular fields
    s.fields.forEach((f) => {
      if (f.name === "temple_owned_land" || f.name === "resident_bhikkhus") return;
      const v = values[f.name];
      if (v == null) return;
      
      // Map form field names to API field names
      const fieldMapping: Record<string, string> = {
        temple_name: "vh_vname",
        temple_address: "vh_addrs",
        telephone_number: "vh_mobile",
        whatsapp_number: "vh_whtapp",
        email_address: "vh_email",
        province: "vh_province",
        district: "vh_district",
        divisional_secretariat: "vh_divisional_secretariat",
        pradeshya_sabha: "vh_pradeshya_sabha",
        grama_niladhari_division: "vh_gndiv",
        nikaya: "vh_nikaya",
        parshawaya: "vh_parshawa",
        viharadhipathi_name: "vh_viharadhipathi_name",
        period_established: "vh_period_established",
        buildings_description: "vh_buildings_description",
        dayaka_families_count: "vh_dayaka_families_count",
        kulangana_committee: "vh_kulangana_committee",
        dayaka_sabha: "vh_dayaka_sabha",
        temple_working_committee: "vh_temple_working_committee",
        other_associations: "vh_other_associations",
        inspection_report: "vh_inspection_report",
        inspection_code: "vh_inspection_code",
        grama_niladhari_division_ownership: "vh_grama_niladhari_division_ownership",
        sanghika_donation_deed: "vh_sanghika_donation_deed",
        government_donation_deed: "vh_government_donation_deed",
        government_donation_deed_in_progress: "vh_government_donation_deed_in_progress",
        authority_consent_attached: "vh_authority_consent_attached",
        recommend_new_center: "vh_recommend_new_center",
        recommend_registered_temple: "vh_recommend_registered_temple",
        annex2_recommend_construction: "vh_annex2_recommend_construction",
        annex2_land_ownership_docs: "vh_annex2_land_ownership_docs",
        annex2_chief_incumbent_letter: "vh_annex2_chief_incumbent_letter",
        annex2_coordinator_recommendation: "vh_annex2_coordinator_recommendation",
        annex2_divisional_secretary_recommendation: "vh_annex2_divisional_secretary_recommendation",
        annex2_approval_construction: "vh_annex2_approval_construction",
        annex2_referral_resubmission: "vh_annex2_referral_resubmission",
      };
      
      const apiFieldName = fieldMapping[f.name] || f.name;
      payload[apiFieldName] = typeof v === "boolean" ? v : (f.type === "date" ? toYYYYMMDD(String(v)) : v);
    });
    
    return payload;
  };

  const handleSaveTab = async () => {
    if (!validateTab(activeTab)) return;
    try {
      setSaving(true);
      const partial = buildPartialPayloadForTab(activeTab);
      const vhId = viharaId && !isNaN(Number(viharaId)) ? Number(viharaId) : undefined;
      const vhTrn = viharaId && isNaN(Number(viharaId)) ? viharaId : undefined;

      console.log("Saving partial payload for tab:", partial);
      
      await _manageVihara({
        action: "UPDATE",
        payload: {
          ...(vhId ? { vh_id: vhId } : {}),
          ...(vhTrn ? { vh_trn: vhTrn } : {}),
          data: partial,
        },
      } as any);
      toast.success(`Saved "${stepTitle}"`, { autoClose: 1200 });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to save. Please try again.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // Helper function to map form fields to API field names (same as AddVihara)
  const mapFormToApiFields = (formData: Partial<ViharaForm>, parsedResidentBhikkhus: any[], parsedTempleOwnedLand: any[]) => {
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

    return {
      // Step A: Basic Information
      vh_vname: formData.temple_name,
      vh_addrs: formData.temple_address,
      vh_mobile: formData.telephone_number,
      vh_whtapp: formData.whatsapp_number,
      vh_email: formData.email_address,
      
      // Step B: Administrative Divisions
      vh_province: formData.province,
      vh_district: formData.district,
      vh_divisional_secretariat: formData.divisional_secretariat,
      vh_pradeshya_sabha: formData.pradeshya_sabha,
      vh_gndiv: formData.grama_niladhari_division,
      
      // Step C: Religious Affiliation
      vh_nikaya: formData.nikaya,
      vh_parshawa: formData.parshawaya,
      
      // Step D: Leadership
      vh_viharadhipathi_name: formData.viharadhipathi_name,
      vh_period_established: formData.period_established,
      
      // Step E: Assets & Activities
      vh_buildings_description: formData.buildings_description,
      vh_dayaka_families_count: formData.dayaka_families_count,
      vh_kulangana_committee: formData.kulangana_committee,
      vh_dayaka_sabha: formData.dayaka_sabha,
      vh_temple_working_committee: formData.temple_working_committee,
      vh_other_associations: formData.other_associations,
      
      // Step F: Land Information
      temple_owned_land: mappedLand,
      vh_land_info_certified: formData.land_info_certified,
      
      // Step G: Resident Bhikkhus
      resident_bhikkhus: mappedBhikkhus,
      vh_resident_bhikkhus_certified: formData.resident_bhikkhus_certified,
      
      // Step H: Inspection
      vh_inspection_report: formData.inspection_report,
      vh_inspection_code: formData.inspection_code,
      
      // Step I: Ownership
      vh_grama_niladhari_division_ownership: formData.grama_niladhari_division_ownership,
      vh_sanghika_donation_deed: formData.sanghika_donation_deed,
      vh_government_donation_deed: formData.government_donation_deed,
      vh_government_donation_deed_in_progress: formData.government_donation_deed_in_progress,
      vh_authority_consent_attached: formData.authority_consent_attached,
      vh_recommend_new_center: formData.recommend_new_center,
      vh_recommend_registered_temple: formData.recommend_registered_temple,
      
      // Step J: Annex II
      vh_annex2_recommend_construction: formData.annex2_recommend_construction,
      vh_annex2_land_ownership_docs: formData.annex2_land_ownership_docs,
      vh_annex2_chief_incumbent_letter: formData.annex2_chief_incumbent_letter,
      vh_annex2_coordinator_recommendation: formData.annex2_coordinator_recommendation,
      vh_annex2_divisional_secretary_recommendation: formData.annex2_divisional_secretary_recommendation,
      vh_annex2_approval_construction: formData.annex2_approval_construction,
      vh_annex2_referral_resubmission: formData.annex2_referral_resubmission,
    };
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

  // Update display state when values change (for auto-fill)
  useEffect(() => {
    if (values.nikaya) {
      const nikayaItem = findNikayaByCode(values.nikaya);
      if (nikayaItem) {
        setDisplay((d) => ({ ...d, nikaya: `${nikayaItem.nikaya.name} — ${nikayaItem.nikaya.code}` }));
      }
    }
    if (values.parshawaya && values.nikaya) {
      const nikayaItem = findNikayaByCode(values.nikaya);
      const parshawaItem = nikayaItem?.parshawayas.find((p) => p.code === values.parshawaya);
      if (parshawaItem) {
        setDisplay((d) => ({ ...d, parshawaya: `${parshawaItem.name} - ${parshawaItem.code}` }));
      }
    }
  }, [values.nikaya, values.parshawaya, findNikayaByCode]);

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

  const gridCols = activeTab === 5 ? "md:grid-cols-3" : "md:grid-cols-2";
  const certificateNumberLabel = certificateMeta.number || "Pending assignment";
  const certificateUrlLabel = certificateMeta.url || "Not assigned yet";
  const certificateQrValue = certificateMeta.url || SAMPLE_CERT_URL;
  const hasCertificateUrl = Boolean(certificateMeta.url);

  const handlePrintCertificate = () => {
    window.print();
    setShowUploadModal(true);
  };

  const handleScanFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!validTypes.includes(file.type)) {
        toast.error("Invalid file type. Please upload PDF, JPEG, or PNG files.");
        return;
      }
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size exceeds 5MB limit.");
        return;
      }
      setScannedFile(file);
    } else {
      setScannedFile(null);
    }
  };

  const handleUploadScannedDocument = async () => {
    if (!scannedFile) {
      toast.error("Please choose a file to upload.");
      return;
    }

    if (!viharaId || isNaN(Number(viharaId))) {
      toast.error("Invalid vihara ID.");
      return;
    }

    try {
      setUploadingScan(true);
      const vhId = Number(viharaId);
      const response = await _uploadScannedDocument(vhId, scannedFile);
      
      toast.success(response?.message || "Scanned document uploaded successfully.");
      setShowUploadModal(false);
      setScannedFile(null);
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || err?.message || "Failed to upload scanned document.";
      toast.error(errorMsg);
    } finally {
      setUploadingScan(false);
    }
  };

  const handleCloseUploadModal = () => {
    setShowUploadModal(false);
    setScannedFile(null);
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-slate-600">Loading vihara data...</div>
      </div>
    );
  }
  const handleApprove = async () => {
    if (
      !window.confirm(
        "Approve this registration? This action may be irreversible."
      )
    )
      return;
    try {
      setApproving(true);
      await _manageVihara({
        action: "APPROVE",
        payload: { vh_id: viharaId },
      } as any);
      toast.success("Approved successfully.", { autoClose: 1200 });
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message
          : "Failed to approve. Please try again.";
      toast.error(msg);
    } finally {
      setApproving(false);
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
                    <h1 className="text-2xl font-bold text-white mb-1">
                      Update Registration
                    </h1>
                    <p className="text-slate-300 text-sm">Editing: {viharaId}</p>
                  </div>
                  {
                    role === ADMIN_ROLE_LEVEL &&
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleApprove}
                      disabled={loading || saving || approving}
                      className={`px-4 py-2 rounded-lg font-medium transition-all
                        ${
                          loading || saving || approving
                            ? "bg-green-700/60 text-white cursor-not-allowed"
                            : "bg-green-600 text-white hover:bg-green-700"
                        }`}
                      aria-label="Approve registration"
                      title="Approve registration"
                    >
                      {approving ? "Approving…" : "Approve"}
                    </button>
                  </div>}
                </div>
              </div>

              <div className="px-4 md:px-10 py-6" ref={sectionRef}>
                <Tabs
                  tabs={steps.map((s) => ({
                    id: String(s.id),
                    label: s.title,
                  }))}
                  value={String(activeTab)}
                  onChange={(id) => {
                    setActiveTab(Number(id));
                    scrollTop();
                  }}
                  contentClassName="pt-6"
                  renderContent={() => (
                    <>
                      {loading ? (
                        <div className="p-6 text-slate-600">
                          Loading record…
                        </div>
                      ) : (
                        <div className="min-h-[360px]">
                          <h2 className="text-xl font-bold text-slate-800 mb-5">
                            {stepTitle}
                          </h2>

                          {isCertificatesTab ? (
                            <div className="space-y-6">
                              <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white/80 p-6 shadow">
                                <div className="flex flex-col gap-2 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
                                  <div>
                                    <p className="text-xs uppercase tracking-[0.5em] text-slate-400">
                                      Certificate number
                                    </p>
                                    <p className="text-2xl font-semibold text-slate-900">
                                      {certificateNumberLabel}
                                    </p>
                                    <p className="break-all text-slate-500">
                                      {certificateUrlLabel}
                                    </p>
                                  </div>
                                  <button
                                    onClick={handlePrintCertificate}
                                    className="inline-flex items-center justify-center rounded-full bg-slate-800 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-400"
                                  >
                                    Print QR on Certificate
                                  </button>
                                </div>
                                <p className="text-xs text-slate-500">
                                  Insert the pre-printed legal-size certificate into the printer.
                                  Only the QR code positioned at the bottom-right corner of the sheet will be printed.
                                </p>
                              </div>

                              <div className="flex justify-center">
                                <div
                                  id="certificate-print-area"
                                  ref={certificatePaperRef}
                                  className="relative bg-white"
                                  style={{ width: "8.5in", height: "14in" }}
                                >
                                  <div className="absolute inset-0 pointer-events-none" />
                                  <div className="absolute bottom-20 right-16">
                                    <div className="rounded-lg border border-slate-200 bg-white p-2">
                                      <QRCode
                                        value={certificateQrValue}
                                        size={80}
                                        className="h-20 w-20"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <style>{`
                                @media print {
                                  @page {
                                    margin: 0;
                                  }
                                  body {
                                    margin: 0 !important;
                                    padding: 0 !important;
                                  }
                                  body * {
                                    visibility: hidden;
                                    box-shadow: none !important;
                                  }
                                  #certificate-print-area,
                                  #certificate-print-area * {
                                    visibility: visible;
                                  }
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
                          ) : isScannedFilesTab ? (
                            <div className="space-y-6">
                              <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow">
                                <h3 className="text-lg font-semibold text-slate-800 mb-4">
                                  Upload Scanned Document
                                </h3>
                                <p className="text-sm text-slate-600 mb-6">
                                  Upload the scanned certificate or document after printing. Supported formats: PDF, JPEG, PNG (Max 5MB).
                                </p>
                                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 p-6 text-center">
                                  <input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    className="block w-full text-sm text-slate-700"
                                    onChange={handleScanFileChange}
                                  />
                                  {scannedFile ? (
                                    <p className="mt-4 text-sm text-slate-600">
                                      Selected: <span className="font-medium">{scannedFile.name}</span> ({(scannedFile.size / 1024 / 1024).toFixed(2)} MB)
                                    </p>
                                  ) : (
                                    <p className="mt-4 text-sm text-slate-500">
                                      No file selected
                                    </p>
                                  )}
                                </div>
                                <div className="flex justify-end gap-3 mt-6">
                                  <button
                                    type="button"
                                    className="rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                                    onClick={() => {
                                      setScannedFile(null);
                                      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
                                      if (input) input.value = '';
                                    }}
                                    disabled={uploadingScan || !scannedFile}
                                  >
                                    Clear
                                  </button>
                                  <button
                                    type="button"
                                    className="rounded-full bg-slate-900 px-6 py-2 text-sm font-semibold text-white hover:bg-slate-950 disabled:cursor-not-allowed disabled:bg-slate-600"
                                    onClick={handleUploadScannedDocument}
                                    disabled={uploadingScan || !scannedFile}
                                  >
                                    {uploadingScan ? "Uploading…" : "Upload Document"}
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className={`grid grid-cols-1 ${gridCols} gap-5`}>
                            {activeTab === 6 && (
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

                            {activeTab === 7 && (
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
                            {activeTab === 10 && (
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

                            {activeTab !== 6 && activeTab !== 7 && activeTab !== 10 && current.fields.map((f) => {
                              const id = String(f.name);
                              const val = (values[f.name] as unknown as string) ?? "";
                              const err = errors[f.name];

                              // Skip table fields in regular rendering
                              if (id === "temple_owned_land" || id === "resident_bhikkhus") return null;

                              // Step B: Administrative Divisions - use LocationPicker
                              if (activeTab === 2 && id === "district") {
                                return (
                                  <div key={id} className="md:col-span-2">
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
                                        key={`nikaya-select-${values.nikaya}`}
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
                                      key={`parshawaya-select-${values.nikaya}-${values.parshawaya}`}
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
                                return (
                                  <div key={id}>
                                    <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-2">{f.label}</label>
                                    <input
                                      id={id}
                                      type="text"
                                      value={val}
                                      onChange={(e) => handleInputChange(f.name, e.target.value)}
                                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                                      placeholder="Enter name"
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
                                      In the Grama Niladhari Division of .........................
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
                                const spanClass = activeTab === 5 
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
                                <div key={id} className={activeTab === 5 && id === "dayaka_families_count" ? "md:col-span-3" : ""}>
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

                            {/* Step I: Important Notes */}
                            {activeTab === 9 && (
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

                          {!isCertificatesTab && !isScannedFilesTab && (
                            <div className="flex justify-end mt-8 pt-6 border-t border-slate-200">
                              <button
                                onClick={handleSaveTab}
                                disabled={saving || loading}
                                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-700 text-white rounded-lg font-medium hover:bg-slate-800 transition-all disabled:opacity-70"
                              >
                                {saving ? "Saving…" : "Save this section"}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                />

              </div>
            </div>
          </div>
        </main>
        <FooterBar />
      </div>

      {showUploadModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleCloseUploadModal}
          />
          <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Upload Scanned Document
                </p>
                <p className="text-xs text-slate-500">
                  Attach the scanned image/PDF after printing.
                </p>
              </div>
              <button
                aria-label="Close upload"
                onClick={handleCloseUploadModal}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4 px-6 py-6">
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 p-6 text-center text-sm text-slate-500">
                <p>
                  Drag & drop or click to select the scanned document file.
                </p>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="mt-4 block w-full text-sm text-slate-700"
                  onChange={handleScanFileChange}
                />
                {scannedFile ? (
                  <p className="mt-2 text-xs text-slate-600">
                    Selected: {scannedFile.name} ({(scannedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                ) : null}
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  className="rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                  onClick={handleCloseUploadModal}
                  disabled={uploadingScan}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="rounded-full bg-slate-900 px-6 py-2 text-sm font-semibold text-white hover:bg-slate-950 disabled:cursor-not-allowed disabled:bg-slate-600"
                  onClick={handleUploadScannedDocument}
                  disabled={uploadingScan || !scannedFile}
                >
                  {uploadingScan ? "Uploading…" : "Upload Document"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <ToastContainer position="top-right" newestOnTop closeOnClick pauseOnHover />
    </div>
  );
}

export default function UpdateVihara({ role }: { role: string | undefined }) {
  return (
    <Suspense fallback={<div className="p-8 text-slate-600">Loading…</div>}>
      <UpdateViharaPageInner role={role} />
    </Suspense>
  );
}

