"use client";

import React, { useMemo, useRef, useState, useCallback, Suspense, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  _manageVihara,
  _markPrintedVihara,
  _uploadStageDocument,
  _approveStage,
  _rejectStage,
} from "@/services/vihara";
import { FooterBar } from "@/components/FooterBar";
import { TopBar } from "@/components/TopBar";
import { Sidebar } from "@/components/Sidebar";
import selectionsData from "@/utils/selectionsData.json";
import QRCode from "react-qr-code";

import {
  DateField,
  LocationPicker,
  BhikkhuAutocomplete,
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
import { ADMIN_ROLE_LEVEL, DIVITIONAL_SEC_MANAGEMENT_DEPARTMENT } from "@/utils/config";
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField, Button as MuiButton } from "@mui/material";

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
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";
const CERTIFICATE_TYPES = [
  { id: "registration", title: "Certificate of registration of the vihara" },
  { id: "acceptance", title: "Acceptance of chief incumbent of vihara" },
] as const;
type CertificateTypeId = (typeof CERTIFICATE_TYPES)[number]["id"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

type CertificateMeta = {
  number: string;
  url: string;
};

export const dynamic = "force-dynamic";

function UpdateViharaPageInner({ role, department }: { role: string | undefined; department?: string }) {
  const router = useRouter();
  const params = useParams();
  const viharaId = params?.id as string | undefined;
  const isDivisionalSec = department === DIVITIONAL_SEC_MANAGEMENT_DEPARTMENT;
  const canModerate = role === ADMIN_ROLE_LEVEL && !isDivisionalSec;

  const baseSteps = useMemo(() => viharaSteps(), []);
  const sharedTabs = useMemo(() => {
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
    return { certTab, scannedTab };
  }, [baseSteps]);

  const majorStepGroups = useMemo(
    () => [
      {
        id: 1,
        tabs: [...baseSteps.filter((s) => s.id <= 4), sharedTabs.certTab, sharedTabs.scannedTab],
      },
      {
        id: 2,
        tabs: [...baseSteps.filter((s) => s.id > 4), sharedTabs.certTab, sharedTabs.scannedTab],
      },
    ],
    [baseSteps, sharedTabs]
  );

  const visibleMajorStepGroups = useMemo(
    () => (isDivisionalSec ? majorStepGroups.filter((g) => g.id === 2) : majorStepGroups),
    [isDivisionalSec, majorStepGroups]
  );

  const [activeMajorStep, setActiveMajorStep] = useState<number>(() => visibleMajorStepGroups[0]?.id ?? 1);
  const [activeTabId, setActiveTabId] = useState<number>(() => visibleMajorStepGroups[0]?.tabs[0]?.id ?? 1);

  const steps = useMemo(() => {
    const group = visibleMajorStepGroups.find((g) => g.id === activeMajorStep) ?? visibleMajorStepGroups[0];
    return group ? group.tabs : [];
  }, [activeMajorStep, visibleMajorStepGroups]);

  useEffect(() => {
    if (!visibleMajorStepGroups.length) return;
    if (!visibleMajorStepGroups.some((g) => g.id === activeMajorStep)) {
      const firstGroupId = visibleMajorStepGroups[0]?.id;
      const firstTabId = visibleMajorStepGroups[0]?.tabs[0]?.id;
      if (firstGroupId) setActiveMajorStep(firstGroupId);
      if (firstTabId) setActiveTabId(firstTabId);
    }
  }, [activeMajorStep, visibleMajorStepGroups]);

  useEffect(() => {
    const fallbackId = steps[0]?.id;
    if (!fallbackId) return;
    if (!steps.some((s) => s.id === activeTabId)) {
      setActiveTabId(fallbackId);
    }
  }, [steps, activeTabId]);
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
  const [existingScanUrlStageOne, setExistingScanUrlStageOne] = useState<string | null>(null);
  const [existingScanUrlStageTwo, setExistingScanUrlStageTwo] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [scannedFile, setScannedFile] = useState<File | null>(null);
  const [scanPreviewUrl, setScanPreviewUrl] = useState<string | null>(null);
  const [uploadingScan, setUploadingScan] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [printingMarking, setPrintingMarking] = useState(false);
  const [workflowStatus, setWorkflowStatus] = useState<string>("");
  const [activePrintAreaId, setActivePrintAreaId] = useState<CertificateTypeId | null>(null);
  
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const current = steps.find((s) => s.id === activeTabId) ?? steps[0];
  const stepTitle = current?.title ?? "";
  const isCertificatesTab = stepTitle === "Certificates";
  const isScannedFilesTab = stepTitle === "Upload Scanned Files";
  const resolveScanUrl = (path?: string | null) => {
    if (!path) return null;
    const trimmed = String(path).trim();
    if (!trimmed) return null;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    const normalizedPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    return `${API_BASE_URL}${normalizedPath}`;
  };

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
      viharadhipathi_regn: apiData.vh_viharadhipathi_regn ?? "",
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

        setWorkflowStatus(apiData?.vh_workflow_status ?? apiData?.workflow_status ?? "");

        // Set certificate metadata
        const certificateNumber = String(apiData?.vh_trn ?? apiData?.vh_id ?? "");
        const certificateUrl = certificateNumber
          ? `${CERTIFICATE_URL_BASE}/${encodeURIComponent(certificateNumber)}`
          : "";
        setCertificateMeta({ number: certificateNumber, url: certificateUrl });

        // Stage-specific scanned docs (if provided). Default: show final-stage doc only in stage 2 section.
        const stageOneRaw =
          apiData?.vh_stage1_scanned_document_path ||
          apiData?.vh_stage_one_scanned_document_path ||
          apiData?.stage1_scanned_document_path;
        const stageTwoRaw =
          apiData?.vh_stage2_scanned_document_path ||
          apiData?.vh_stage_two_scanned_document_path ||
          apiData?.stage2_scanned_document_path ||
          apiData?.vh_scanned_document_path ||
          apiData?.vh_scanned_document ||
          apiData?.scanned_document_path ||
          apiData?.scanned_document;
        const resolvedStageOne = resolveScanUrl(stageOneRaw);
        const resolvedStageTwo = resolveScanUrl(stageTwoRaw);
        if (resolvedStageOne) setExistingScanUrlStageOne(resolvedStageOne);
        if (resolvedStageTwo) setExistingScanUrlStageTwo(resolvedStageTwo);
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
    baseSteps.forEach((s) => s.fields.forEach((f) => (map[String(f.name)] = f.label)));
    return map;
  }, [baseSteps]);

  const fieldByName: Map<string, any> = useMemo(() => {
    const m = new Map<string, any>();
    baseSteps.forEach((s) => s.fields.forEach((f) => m.set(String(f.name), f)));
    return m;
  }, [baseSteps]);

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

  const validateTab = (tabId: number): boolean => {
    const step = steps.find((s) => s.id === tabId);
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
    if (step.id === 2) {
      if (!values.province) {
        nextErrors.province = "Required";
        valid = false;
      }
    }
    setErrors(nextErrors);
    if (!valid) scrollTop();
    return valid;
  };

  const buildPartialPayloadForTab = (tabId: number): Partial<any> => {
    const s = steps.find((step) => step.id === tabId);
    if (!s) return {};
    
    const payload: any = {};
    
    // Handle special cases for table fields
    if (tabId === 6) { // Land Information tab
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
    
    if (tabId === 7) { // Resident Bhikkhus tab
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
        viharadhipathi_regn: "vh_viharadhipathi_regn",
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
    if (!validateTab(activeTabId)) return;
    try {
      setSaving(true);
      const partial = buildPartialPayloadForTab(activeTabId);
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
      vh_viharadhipathi_regn: formData.viharadhipathi_regn,
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

  const gridCols = current?.id === 5 ? "md:grid-cols-3" : "md:grid-cols-2";
  const certificateTypes = useMemo(
    () => (activeMajorStep === 1 ? CERTIFICATE_TYPES.filter((c) => c.id === "acceptance") : CERTIFICATE_TYPES.filter((c) => c.id === "registration")),
    [activeMajorStep]
  );
  const defaultCertificateId = certificateTypes[0]?.id ?? CERTIFICATE_TYPES[0].id;
  const certificateNumberLabel = certificateMeta.number || "Pending assignment";
  const certificateUrlLabel = certificateMeta.url || "Not assigned yet";
  const certificateQrValue = certificateMeta.url || SAMPLE_CERT_URL;
  const hasCertificateUrl = Boolean(certificateMeta.url);
  const ensureActivePrintTarget = (): CertificateTypeId => activePrintAreaId || defaultCertificateId;
  useEffect(() => {
    if (activePrintAreaId && !certificateTypes.some((c) => c.id === activePrintAreaId)) {
      setActivePrintAreaId(null);
    }
  }, [activePrintAreaId, certificateTypes]);
  const certificateTemplateStyles = `
    .certificate-page {
      position: relative;
      width: 8.5in;
      height: 14in;
      background: #fff;
      box-shadow: 0 6px 20px rgba(0,0,0,0.12);
      margin: 0 auto;
      overflow: hidden;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .certificate-content {
      position: absolute;
      left: 10%;
      right: 10%;
      top: 18%;
      bottom: 18%;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      pointer-events: none;
      box-sizing: border-box;
    }
    .certificate-row {
      display: grid;
      grid-template-columns: 10% 32% 1fr;
      align-items: center;
      column-gap: 10px;
      row-gap: 4px;
      width: 100%;
      box-sizing: border-box;
    }
    .certificate-label {
      font-size: 14px;
      color: #000;
    }
    .certificate-value {
      font-size: 17px;
      color: #000;
      font-weight: 600;
      word-break: break-word;
    }
    .certificate-footer {
      position: absolute;
      left: 10%;
      right: 10%;
      bottom: 6%;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .certificate-date-row {
      font-size: 12px;
      line-height: 1.6;
    }
    .certificate-disclaimer {
      font-size: 11px;
      line-height: 1.5;
      text-align: justify;
    }
    .certificate-qr {
      position: absolute;
      right: 12%;
      bottom: 3%;
      width: 80px;
      height: 80px;
    }
    .certificate-qr .caption {
      margin-top: 4px;
      font-size: 10px;
      color: #000;
      text-align: center;
      word-break: break-all;
    }
    .letter-page {
      width: 8.27in;
      height: 11.69in;
      padding: 0.75in 1in;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .letter-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      font-size: 14px;
    }
    .letter-recipient {
      line-height: 1.6;
      font-size: 14px;
    }
    .letter-recipient .recipient-title {
      font-weight: 600;
      margin-bottom: 6px;
    }
    .letter-body {
      font-size: 14px;
      line-height: 1.7;
      text-align: justify;
      margin-top: 8px;
      margin-bottom: 12px;
    }
    .letter-section {
      font-size: 14px;
      line-height: 1.6;
    }
    .letter-copyto {
      font-size: 14px;
      line-height: 1.6;
    }
    .letter-qr {
      position: absolute;
      right: 1in;
      bottom: 0.75in;
      width: 80px;
    }
    .letter-qr .caption {
      font-size: 10px;
      margin-top: 4px;
      text-align: center;
      word-break: break-all;
    }
    @media print {
      body {
        margin: 0 !important;
        padding: 0 !important;
      }
      body * {
        visibility: hidden;
        box-shadow: none !important;
      }
      .certificate-page[data-printing="true"],
      .certificate-page[data-printing="true"] * {
        visibility: visible;
      }
      .certificate-page[data-printing="true"] {
        position: absolute;
        left: 0;
        top: 0;
        right: 0;
        margin: 0 auto;
        box-shadow: none !important;
      }
    }
    .simple-certificate {
      display: flex;
      align-items: center;
      justify-content: center;
    }
  `;

  const certificateData = useMemo(() => {
    const now = new Date();
    const gYear = now.getFullYear();
    const gMonthIndex = now.getMonth();
    const gDay = String(now.getDate()).padStart(2, "0");
    const monthName = MONTH_NAMES[gMonthIndex] ?? "";
    const buddhistYear = gYear + 543;

    return {
      registration_number: certificateNumberLabel,
      viharasthana_name: values.temple_name ?? "",
      viharasthana_address: values.temple_address ?? "",
      regional_committee_divisional_secretariat: values.divisional_secretariat ?? values.pradeshya_sabha ?? "",
      nikaya: display.nikaya || values.nikaya || "",
      parshwaya: display.parshawaya || values.parshawaya || "",
      establishment_period: values.period_established ? toYYYYMMDD(values.period_established) : "",
      viharadhipathi_name: values.viharadhipathi_name ?? "",
      buddha_year: String(buddhistYear),
      buddha_month: monthName,
      buddha_day: gDay,
      gregorian_year: String(gYear),
      gregorian_month: monthName,
      gregorian_day: gDay,
    };
  }, [certificateNumberLabel, display.nikaya, display.parshawaya, values.divisional_secretariat, values.parshawaya, values.period_established, values.pradeshya_sabha, values.temple_address, values.temple_name, values.viharadhipathi_name, values.nikaya]);

  const acceptanceData = useMemo(() => {
    const now = new Date();
    const gYear = now.getFullYear();
    const gMonthIndex = now.getMonth();
    const gDay = String(now.getDate()).padStart(2, "0");
    const gMonth = String(gMonthIndex + 1).padStart(2, "0");
    const letterDate = `${gYear}.${gMonth}.${gDay}`;

    const addressParts = (values.temple_address || "").split(",");

    return {
      reference_number: certificateNumberLabel,
      letter_date: letterDate,
      mahanayaka_name: values.viharadhipathi_name || "",
      nikaya_full_name: display.nikaya || values.nikaya || "",
      temple_name: values.temple_name || "",
      temple_location_1: addressParts[0]?.trim() || "",
      temple_location_2: addressParts.slice(1).join(", ").trim(),
      district: values.district || "",
      divisional_secretariat: values.divisional_secretariat || "",
      viharasthana_location: values.grama_niladhari_division || "",
      viharasthana_area: values.pradeshya_sabha || "",
      viharasthana_full_name: values.temple_name || "",
      appointed_monk_title: "Chief Incumbent",
      appointed_monk_name: values.viharadhipathi_name || "",
      appointment_letter_date: letterDate,
      secretary_name: "",
      phone: "",
      fax: "",
      email: "",
      divisional_secretariat_office: values.divisional_secretariat || "",
    };
  }, [certificateNumberLabel, display.nikaya, values.district, values.divisional_secretariat, values.grama_niladhari_division, values.nikaya, values.pradeshya_sabha, values.temple_address, values.temple_name, values.viharadhipathi_name]);

  const handlePrintCertificate = () => {
    const targetId = ensureActivePrintTarget();
    setActivePrintAreaId(targetId);
    window.print();
    setShowUploadModal(true);
    setTimeout(() => setActivePrintAreaId(null), 0);
  };

  const handleConfirmPrintCertificate = async () => {
    if (!activePrintAreaId) {
      setActivePrintAreaId(defaultCertificateId);
    }
    try {
      setPrintingMarking(true);
      if (activeMajorStep === 1) {
        const res = await _manageVihara({
          action: "MARK_S1_PRINTED",
          payload: { vh_id: Number(viharaId) },
        } as any);
        const payload = (res as any)?.data ?? res;
        const success = (payload as any)?.success ?? true;
        if (!success) {
          const { messages, fallback } = collectApprovalErrors(payload);
          toast.error(messages.join("\n") || fallback);
          return;
        }
      } else {
        const res = await _manageVihara({
          action: "MARK_S2_PRINTED",
          payload: { vh_id: Number(viharaId) },
        } as any);
        const payload = (res as any)?.data ?? res;
        const success = (payload as any)?.success ?? true;
        if (!success) {
          const { messages, fallback } = collectApprovalErrors(payload);
          toast.error(messages.join("\n") || fallback);
          return;
        }
      }
    } catch (e: unknown) {
      const data = (e as any)?.response?.data ?? (e as any)?.data;
      const { messages, fallback } = collectApprovalErrors(data);
      const errMsg =
        messages.join("\n") ||
        fallback ||
        (e instanceof Error
          ? e.message
          : "Failed to mark as printed. Please try again.");
      toast.error(errMsg);
    } finally {
      setPrintDialogOpen(false);
      handlePrintCertificate();
      setPrintingMarking(false);
    }
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
      if (file.type?.startsWith("image/")) {
        const url = URL.createObjectURL(file);
        setScanPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      } else {
        if (scanPreviewUrl) {
          URL.revokeObjectURL(scanPreviewUrl);
        }
        setScanPreviewUrl(null);
      }
    } else {
      setScannedFile(null);
      if (scanPreviewUrl) URL.revokeObjectURL(scanPreviewUrl);
      setScanPreviewUrl(null);
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
      const stage = activeMajorStep === 1 ? 1 : 2;
      const response = await _uploadStageDocument(vhId, scannedFile, stage);
      
      toast.success(response?.message || "Scanned document uploaded successfully.");
      const pathFromResponse =
        (response as any)?.data?.vh_stage1_scanned_document_path ||
        (response as any)?.data?.vh_stage2_scanned_document_path ||
        (response as any)?.data?.vh_scanned_document_path ||
        (response as any)?.vh_stage1_scanned_document_path ||
        (response as any)?.vh_stage2_scanned_document_path ||
        (response as any)?.vh_scanned_document_path ||
        (response as any)?.data?.scanned_document_path ||
        (response as any)?.scanned_document_path;
      const resolved = resolveScanUrl(pathFromResponse);
      const targetSetter = activeMajorStep === 1 ? setExistingScanUrlStageOne : setExistingScanUrlStageTwo;
      if (resolved) {
        targetSetter(resolved);
      } else if (scanPreviewUrl) {
        targetSetter(scanPreviewUrl);
      }
      setShowUploadModal(false);
      setScannedFile(null);
      if (scanPreviewUrl && resolved) {
        URL.revokeObjectURL(scanPreviewUrl);
        setScanPreviewUrl(null);
      }
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
    if (scanPreviewUrl) {
      URL.revokeObjectURL(scanPreviewUrl);
      setScanPreviewUrl(null);
    }
  };

  const renderExistingScan = (url: string | null) => {
    if (!url) return null;
    const lower = url.toLowerCase();
    const isImage =
      lower.endsWith(".png") ||
      lower.endsWith(".jpg") ||
      lower.endsWith(".jpeg") ||
      lower.endsWith(".gif") ||
      lower.endsWith(".webp");
    const isPdf = lower.includes(".pdf");
    const fileName = url.split("/").pop() || "scanned-document";

    return (
      <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-slate-900">Current scanned document</p>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-slate-600 underline break-all"
            >
              {fileName}
            </a>
          </div>
          <div className="text-xs rounded-full bg-green-100 px-3 py-1 text-green-700 self-start sm:self-auto">
            Latest upload
          </div>
        </div>
        {isImage ? (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            <img
              src={url}
              alt="Scanned certificate"
              className="w-full max-h-96 object-contain"
            />
          </div>
        ) : isPdf ? (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
            <p>PDF file: <a href={url} target="_blank" rel="noreferrer" className="underline">{fileName}</a></p>
          </div>
        ) : null}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-slate-600">Loading vihara data...</div>
      </div>
    );
  }

  const handleOpenApproveDialog = () => {
    if (!canModerate) return;
    setApproveDialogOpen(true);
  };
  const handleCloseApproveDialog = () => {
    if (approving) return;
    setApproveDialogOpen(false);
  };
  const handleOpenPrintDialog = (targetId: CertificateTypeId) => {
    setActivePrintAreaId(targetId);
    setPrintDialogOpen(true);
  };
  const handleClosePrintDialog = () => {
    if (printingMarking) return;
    setPrintDialogOpen(false);
    setActivePrintAreaId(null);
  };

  const handleOpenRejectDialog = () => {
    if (!canModerate) return;
    setRejectionReason("");
    setRejectDialogOpen(true);
  };
  const handleCloseRejectDialog = () => {
    if (rejecting) return;
    setRejectDialogOpen(false);
  };

  const handleApprove = async () => {
    if (!canModerate) return;
    if (
      !window.confirm(
        activeMajorStep === 1
          ? "Approve Stage 1? This action may be irreversible."
          : "Approve Stage 2? This action may be irreversible."
      )
    )
      return;
    try {
      setApproving(true);
      if (!viharaId) throw new Error("Missing vihara id");
      const stage = activeMajorStep === 1 ? 1 : 2;
      await _approveStage(Number(viharaId), stage);
      toast.success(stage === 1 ? "Stage 1 approved." : "Stage 2 approved.", { autoClose: 1200 });
    } catch (e: unknown) {
      const msg = extractApiMessage(e, "Failed to approve. Please try again.");
      toast.error(msg);
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!canModerate) return;
    try {
      setRejecting(true);
      const reason = rejectionReason.trim();
      if (!reason) {
        toast.error("Please enter a rejection reason.");
        setRejecting(false);
        return;
      }
      setRejectDialogOpen(false);
      if (!viharaId) throw new Error("Missing vihara id");
      const stage = activeMajorStep === 1 ? 1 : 2;
      await _rejectStage(Number(viharaId), stage, reason);
      toast.success(stage === 1 ? "Stage 1 rejected." : "Stage 2 rejected.", { autoClose: 1200 });
      setRejectionReason("");
    } catch (e: unknown) {
      const errMsg = extractApiMessage(e, "Failed to reject. Please try again.");
      toast.error(errMsg);
    } finally {
      setRejecting(false);
    }
  };

  const collectApprovalErrors = (source: any) => {
    const container = source?.data ?? source;
    const rawErrors =
      container?.errors ??
      container?.[""] ??
      container?.data?.errors ??
      container?.data?.[""];
    const messages = Array.isArray(rawErrors)
      ? rawErrors
          .map((err) => {
            if (!err) return "";
            const msg = err.message ?? err.msg ?? "";
            const field = err.field ?? err.name ?? "";
            if (field && msg) return `${field}: ${msg}`;
            if (msg) return msg;
            return field ? `${field}: Validation failed.` : "";
          })
          .filter(Boolean)
      : [];
    const fallback =
      container?.message ??
      container?.data?.message ??
      "Failed to approve. Please try again.";
    return { messages, fallback };
  };

  const extractApiMessage = (err: any, fallback: string) => {
    const data = err?.response?.data ?? err?.data ?? err;
    const msg = data?.message || data?.error || data?.msg;
    if (msg) return msg;
    const { messages, fallback: fb } = collectApprovalErrors(data);
    return messages.join("\n") || fb || (err instanceof Error ? err.message : fallback);
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
                  {canModerate && workflowStatus !== "COMPLETED" && (
                  
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
                    <button
                      onClick={handleOpenRejectDialog}
                      disabled={loading || saving || rejecting}
                      className={`px-4 py-2 rounded-lg font-medium transition-all
                        ${
                          loading || saving || rejecting
                            ? "bg-red-700/60 text-white cursor-not-allowed"
                            : "bg-red-600 text-white hover:bg-red-700"
                        }`}
                      aria-label="Reject registration"
                      title="Reject registration"
                    >
                      {rejecting ? "Rejecting…" : "Reject"}
                    </button>
                  </div>
                  )}
                </div>
              </div>

              <div className="px-4 md:px-10 py-6" ref={sectionRef}>
                {visibleMajorStepGroups.length > 1 && (
                  <div className="flex flex-wrap gap-3 mb-4">
                    {visibleMajorStepGroups.map((group, idx) => {
                      const isActive = group.id === activeMajorStep;
                      const firstTabId = group.tabs[0]?.id;
                      return (
                        <button
                          key={group.id}
                          onClick={() => {
                            setActiveMajorStep(group.id);
                            if (firstTabId) {
                              setActiveTabId(firstTabId);
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
                <Tabs
                  tabs={steps.map((s) => ({
                    id: String(s.id),
                    label: s.title,
                  }))}
                  value={String(activeTabId)}
                  onChange={(id) => {
                    setActiveTabId(Number(id));
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
                            <div className="space-y-8">
                              <style>{certificateTemplateStyles}</style>
                              {certificateTypes.map((cert) => {
                                const printAreaId = `certificate-print-area-${cert.id}`;
                                const isActivePrint = activePrintAreaId === cert.id;
                                const isRegistration = cert.id === "registration";
                                const certificateRows = [
                                  { num: "", label: "Registration Number :", field: "registration_number" },
                                  { num: "01.", label: "Name of Viharasthana", field: "viharasthana_name" },
                                  { num: "02.", label: "Address of Viharasthana", field: "viharasthana_address" },
                                  { num: "03.", label: "Regional Sasana Protection Committee / Divisional Secretariat", field: "regional_committee_divisional_secretariat" },
                                  { num: "04-1.", label: "Nikaya to which Viharasthana belongs", field: "nikaya" },
                                  { num: "04-2.", label: "Parshwaya (Chapter)", field: "parshwaya" },
                                  { num: "05.", label: "Period when Viharasthana was established", field: "establishment_period" },
                                  { num: "06.", label: "Viharadhipathi (Chief Monk) at the time of registration", field: "viharadhipathi_name" },
                                ] as const;
                                return (
                                  <div key={cert.id} className="space-y-4">
                                    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white/80 p-6 shadow">
                                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                        <div>
                                          <p className="text-sm font-semibold text-slate-900">{cert.title}</p>
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
                                          onClick={() => handleOpenPrintDialog(cert.id)}
                                          disabled={printingMarking}
                                          className="inline-flex items-center justify-center rounded-full bg-slate-800 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-400 disabled:opacity-60 disabled:cursor-not-allowed"
                                        >
                                          {printingMarking ? "Please wait..." : "Print QR on Certificate"}
                                        </button>
                                      </div>
                                      <p className="text-xs text-slate-500">
                                        Insert the pre-printed legal-size certificate into the printer.
                                        Only the QR code positioned at the bottom-right corner of the sheet will be printed.
                                      </p>
                                    </div>

                                    {isRegistration ? (
                                      <div className="flex justify-center">
                                        <section
                                          id={printAreaId}
                                          data-printing={isActivePrint ? "true" : undefined}
                                          ref={certificatePaperRef}
                                          className="certificate-page"
                                        >
                                          <div className="certificate-content">
                                            {certificateRows.map((row) => (
                                              <div className="certificate-row" key={row.field}>
                                                <div className="certificate-label font-semibold">{row.num}</div>
                                                <div className="certificate-label">{row.label}</div>
                                                <div className="certificate-value">
                                                  {(certificateData as any)[row.field] || ""}
                                                </div>
                                              </div>
                                            ))}
                                          </div>

                                          <div className="certificate-footer">
                                            <div className="certificate-disclaimer">
                                              I hereby certify that the above-mentioned Viharasthana has been registered as a Buddhist Temple in the Department of Buddhist Affairs.
                                            </div>
                                            <div className="certificate-date-row">
                                              Sri Buddha Year: {certificateData.buddha_year}, {certificateData.buddha_month} Month, {certificateData.buddha_day} Day, i.e., Gregorian Year {certificateData.gregorian_year}, {certificateData.gregorian_month} Month, {certificateData.gregorian_day} Day,<br />
                                              At the Department of Buddhist Affairs, No. 135, Sri Anagarika Dharmapala Mawatha.
                                            </div>
                                          </div>

                                          <div className="certificate-qr">
                                            <div className="rounded-lg border border-slate-200 bg-white p-2">
                                              <QRCode value={certificateQrValue} size={80} className="h-20 w-20" />
                                            </div>
                                            <div className="caption">{certificateUrlLabel}</div>
                                          </div>
                                        </section>
                                      </div>
                                    ) : (
                                      <div className="flex justify-center">
                                        <section
                                          id={printAreaId}
                                          data-printing={isActivePrint ? "true" : undefined}
                                          className="certificate-page letter-page relative"
                                        >
                                          <div className="letter-header">
                                            <div className="font-semibold">
                                              {acceptanceData.reference_number}
                                            </div>
                                            <div className="font-semibold">
                                              Date: {acceptanceData.letter_date}
                                            </div>
                                          </div>

                                          <div className="letter-recipient">
                                            <div className="recipient-title">
                                              To, Most Venerable {acceptanceData.mahanayaka_name || "—"}
                                            </div>
                                            <div>{acceptanceData.nikaya_full_name || "—"}</div>
                                            <div>{acceptanceData.temple_name || "—"}</div>
                                            <div>{acceptanceData.temple_location_1 || ""}</div>
                                            <div>{acceptanceData.temple_location_2 || ""}</div>
                                          </div>

                                          <div className="letter-section font-semibold">
                                            Subject: Appointment of Chief Incumbent
                                          </div>

                                          <div className="letter-body">
                                            This is to confirm the appointment of <strong>{acceptanceData.appointed_monk_title} {acceptanceData.appointed_monk_name || "—"}</strong> for {acceptanceData.viharasthana_full_name || "the vihara"} located at {acceptanceData.viharasthana_location || "—"}, {acceptanceData.viharasthana_area || acceptanceData.district || ""}. The appointment letter dated {acceptanceData.appointment_letter_date} is hereby acknowledged.
                                          </div>

                                          <div className="letter-section">
                                            Divisional Secretariat: {acceptanceData.divisional_secretariat || "—"}
                                            <br />
                                            District: {acceptanceData.district || "—"}
                                          </div>

                                          <div className="letter-section">
                                            Thank you.
                                            <br />
                                            — Department of Buddhist Affairs
                                          </div>

                                          <div className="letter-copyto">
                                            <div className="font-semibold mb-2">Copy to:</div>
                                            <div>1. {acceptanceData.appointed_monk_title} {acceptanceData.appointed_monk_name || "—"}, {acceptanceData.viharasthana_full_name || ""}, {acceptanceData.viharasthana_location || ""}</div>
                                            <div>2. Divisional Secretariat Office, {acceptanceData.divisional_secretariat_office || acceptanceData.divisional_secretariat || "—"}</div>
                                          </div>

                                          <div className="letter-qr">
                                            <div className="rounded-lg border border-slate-200 bg-white p-2">
                                              <QRCode value={certificateQrValue} size={80} className="h-20 w-20" />
                                            </div>
                                            <div className="caption">{certificateUrlLabel}</div>
                                          </div>
                                        </section>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}

                            </div>
                          ) : isScannedFilesTab ? (
                            <div className="space-y-6">
                              <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow">
                                <h3 className="text-lg font-semibold text-slate-800 mb-4">
                                  Upload Scanned Document
                                </h3>
                                {renderExistingScan(activeMajorStep === 1 ? existingScanUrlStageOne : existingScanUrlStageTwo)}
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
                                  ) : scanPreviewUrl ? (
                                    <p className="mt-4 text-sm text-slate-600">Preview ready</p>
                                  ) : (
                                    <p className="mt-4 text-sm text-slate-500">
                                      No file selected
                                    </p>
                                  )}
                                  {scanPreviewUrl ? (
                                    <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                                      <img src={scanPreviewUrl} alt="Selected scan preview" className="w-full max-h-96 object-contain" />
                                    </div>
                                  ) : null}
                                </div>
                                <div className="flex justify-end gap-3 mt-6">
                                  <button
                                    type="button"
                                    className="rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                                    onClick={() => {
                                      setScannedFile(null);
                                      if (scanPreviewUrl) {
                                        URL.revokeObjectURL(scanPreviewUrl);
                                        setScanPreviewUrl(null);
                                      }
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
                            {current?.id === 6 && (
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

                            {current?.id === 7 && (
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
                            {current?.id === 10 && (
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

                            {current?.id !== 6 && current?.id !== 7 && current?.id !== 10 && current?.fields.map((f) => {
                              const id = String(f.name);
                              const val = (values[f.name] as unknown as string) ?? "";
                              const err = errors[f.name];

                              // Skip table fields in regular rendering
                              if (id === "temple_owned_land" || id === "resident_bhikkhus") return null;

                              // Step B: Administrative Divisions - use LocationPicker
                              if (current?.id === 2 && id === "district") {
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
                                const spanClass = current?.id === 5 
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
                                <div key={id} className={current?.id === 5 && id === "dayaka_families_count" ? "md:col-span-3" : ""}>
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
                            {current?.id === 9 && (
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

            <Dialog
              open={approveDialogOpen}
              onClose={handleCloseApproveDialog}
              aria-labelledby="approve-dialog-title"
            >
              <DialogTitle id="approve-dialog-title">
                Approve registration?
              </DialogTitle>
              <DialogContent>
                <DialogContentText>
                  Approving will finalize this record. This action may be irreversible.
                </DialogContentText>
              </DialogContent>
              <DialogActions>
                <MuiButton onClick={handleCloseApproveDialog} disabled={approving}>
                  Cancel
                </MuiButton>
                <MuiButton
                  onClick={handleApprove}
                  disabled={approving}
                  color="primary"
                  variant="contained"
                >
                  {approving ? "Approving..." : "Approve"}
                </MuiButton>
              </DialogActions>
            </Dialog>

            <Dialog
              open={printDialogOpen}
              onClose={handleClosePrintDialog}
              aria-labelledby="print-dialog-title"
            >
              <DialogTitle id="print-dialog-title">Print QR on Certificate?</DialogTitle>
              <DialogContent>
                <DialogContentText>
                  This will mark the certificate as printed and open the print dialog for the QR. Continue?
                </DialogContentText>
              </DialogContent>
              <DialogActions>
                <MuiButton onClick={handleClosePrintDialog} disabled={printingMarking}>
                  Cancel
                </MuiButton>
                <MuiButton
                  onClick={handleConfirmPrintCertificate}
                  disabled={printingMarking}
                  variant="contained"
                >
                  {printingMarking ? "Marking..." : "Confirm & Print"}
                </MuiButton>
              </DialogActions>
            </Dialog>

                  <Dialog
                    open={rejectDialogOpen}
                    onClose={handleCloseRejectDialog}
                    aria-labelledby="reject-dialog-title"
                  >
                    <DialogTitle id="reject-dialog-title">Reject registration?</DialogTitle>
                    <DialogContent>
                      <DialogContentText>
                        Rejecting will mark this registration as declined.
                      </DialogContentText>
                      <TextField
                        autoFocus
                        margin="dense"
                        id="rejection-reason"
                        label="Rejection reason"
                        type="text"
                        fullWidth
                        multiline
                        minRows={2}
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                      />
                    </DialogContent>
                    <DialogActions>
                      <MuiButton onClick={handleCloseRejectDialog} disabled={rejecting}>
                        Cancel
                      </MuiButton>
                      <MuiButton
                        onClick={handleReject}
                        disabled={rejecting}
                        color="error"
                        variant="contained"
                      >
                        {rejecting ? "Rejecting..." : "Reject"}
                      </MuiButton>
                    </DialogActions>
                  </Dialog>

      <ToastContainer position="top-right" newestOnTop closeOnClick pauseOnHover />
    </div>
  );
}

export default function UpdateVihara({ role, department }: { role: string | undefined; department?: string }) {
  return (
    <Suspense fallback={<div className="p-8 text-slate-600">Loading…</div>}>
      <UpdateViharaPageInner role={role} department={department} />
    </Suspense>
  );
}
