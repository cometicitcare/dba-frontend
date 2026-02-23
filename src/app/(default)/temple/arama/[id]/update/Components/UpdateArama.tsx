"use client";

import React, { useMemo, useRef, useState, useCallback, Suspense, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { _manageArama, _markPrintedArama, _uploadScannedDocument } from "@/services/arama";
import { FooterBar } from "@/components/FooterBar";
import { TopBar } from "@/components/TopBar";
import { Sidebar } from "@/components/Sidebar";
import QRCode from "react-qr-code";
import "@react-pdf-viewer/core/lib/styles/index.css";
import { Worker, Viewer } from "@react-pdf-viewer/core";

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
import SilmathaAutocomplete from "@/components/silmatha/AutocompleteSilmatha";
import selectionsData from "@/utils/selectionsData.json";

import { Tabs } from "@/components/ui/Tabs";

// Toasts
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField,  Button as MuiButton } from "@mui/material";

const CERTIFICATE_URL_BASE = "https://hrms.dbagovlk.com/arama/certificate";
const SAMPLE_CERT_URL = `${CERTIFICATE_URL_BASE}/sample`;
const API_BASE_URL = "https://api.dbagovlk.com";

type CertificateMeta = {
  number: string;
  url: string;
};

export const dynamic = "force-dynamic";

function UpdateAramaPageInner({ isAdmin }: { isAdmin: boolean }) {
  const router = useRouter();
  const params = useParams();
  const aramaId = params?.id as string | undefined;

  const baseSteps = useMemo(() => aramaSteps(), []);
  const steps = useMemo(() => {
    const certTab: StepConfig<AramaForm> = {
      id: baseSteps.length + 1,
      title: "Certificates",
      fields: [],
    };
    const scannedTab: StepConfig<AramaForm> = {
      id: baseSteps.length + 2,
      title: "Upload Scanned Files",
      fields: [],
    };
    return [...baseSteps, certTab, scannedTab];
  }, [baseSteps]);
  const [activeTab, setActiveTab] = useState<number>(1);
  const [values, setValues] = useState<Partial<AramaForm>>({
    ...aramaInitialValues,
  });
  const [errors, setErrors] = useState<Errors<AramaForm>>({});
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
  const [scanPreviewUrl, setScanPreviewUrl] = useState<string | null>(null);
  const [existingScanUrl, setExistingScanUrl] = useState<string | null>(null);
  const [uploadingScan, setUploadingScan] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [printingMarking, setPrintingMarking] = useState(false);
  const [workflowStatus, setWorkflowStatus] = useState<string>("");
  const [printingActive, setPrintingActive] = useState(false);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const current = steps[activeTab - 1];
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

  const certificateNumberLabel = certificateMeta.number || "Pending assignment";
  const certificateUrlLabel = certificateMeta.url || "Not assigned yet";
  const certificateQrValue = certificateMeta.url || SAMPLE_CERT_URL;
  const locationNames = useMemo(() => {
    const provinces = Array.isArray((selectionsData as any)?.provinces) ? ((selectionsData as any).provinces as any[]) : [];
    let districtName = "";
    let divisionName = "";
    let gnName = "";

    if (values.district) {
      for (const province of provinces) {
        for (const district of province.districts || []) {
          if (district.dd_dcode === values.district) {
            districtName = district.dd_dname || "";
            if (values.divisional_secretariat) {
              for (const division of district.divisional_secretariats || []) {
                if (division.dv_dvcode === values.divisional_secretariat) {
                  divisionName = division.dv_dvname || "";
                  if (values.grama_niladhari_division) {
                    for (const gn of division.gn_divisions || []) {
                      const code = gn.gn_gnc || gn.gn_code;
                      if (code === values.grama_niladhari_division) {
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
        if (districtName) break;
      }
    }

    return { districtName, divisionName, gnName };
  }, [values.district, values.divisional_secretariat, values.grama_niladhari_division]);
  const certificateStyles = `
    .aramaya-certificate {
      position: relative;
      width: 8.5in;
      height: 14in;
      max-width: calc(100% - 30px);
      background: #fff;
      box-shadow: 0 6px 20px rgba(0,0,0,0.12);
      overflow: hidden;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      font-family: "Times New Roman", "Georgia", serif;
      color: #000;
    }
    .aramaya-content {
      position: absolute;
      left: 10%;
      right: 10%;
      top: 20%;
      bottom: 20%;
      display: flex;
      flex-direction: column;
      gap: 0.55rem;
      pointer-events: none;
      box-sizing: border-box;
    }
    .aramaya-row {
      display: grid;
      grid-template-columns: 30px 34% 1fr;
      align-items: start;
      column-gap: 10px;
      row-gap: 6px;
      width: 100%;
      box-sizing: border-box;
      line-height: 1.35;
    }
    .aramaya-label {
      font-size: 13px;
      color: #000;
    }
    .aramaya-value {
      font-size: 15px;
      color: #000;
      font-weight: 600;
      word-break: break-word;
    }
    .aramaya-multi {
      display: grid;
      grid-template-columns: 18px 1fr;
      gap: 6px;
      align-items: center;
    }
    .aramaya-sublist {
      display: grid;
      gap: 6px;
      padding-top: 2px;
    }
    .aramaya-footer {
      position: absolute;
      left: 10%;
      right: 10%;
      bottom: 6%;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .aramaya-disclaimer {
      font-size: 11px;
      line-height: 1.5;
      text-align: justify;
    }
    .aramaya-signature {
      font-size: 12px;
      line-height: 1.6;
    }
    .aramaya-qr {
      position: absolute;
      right: 15%;
      bottom: 3%;
      width: 80px;
    }
    .aramaya-qr .caption {
      margin-top: 4px;
      font-size: 10px;
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
      .aramaya-certificate[data-printing="true"],
      .aramaya-certificate[data-printing="true"] * {
        visibility: visible;
      }
      .aramaya-certificate[data-printing="true"] {
        position: absolute;
        left: 0;
        top: 0;
        right: 0;
        margin: 0 auto;
        box-shadow: none !important;
      }
    }
  `;

  const handleConfirmPrintCertificate = async () => {
    try {
      setPrintingMarking(true);
      const res = await _markPrintedArama(Number(aramaId));
      const payload = (res as any)?.data ?? res;
      const success = (payload as any)?.success ?? true;
      if (!success) {
        const { messages, fallback } = collectApprovalErrors(payload);
        toast.error(messages.join("\n") || fallback);
        return;
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
      setShowUploadModal(true);
      handlePrintCertificate();
      setPrintingMarking(false);
    }
  };

  const handlePrintCertificate = () => {
    setPrintingActive(true);
    const cleanup = () => {
      setPrintingActive(false);
      setShowUploadModal(true);
      window.onafterprint = null;
    };
    window.onafterprint = cleanup;
    // Defer print so data-printing attr is applied
    setTimeout(() => {
      window.print();
      // Fallback cleanup in case onafterprint doesn't fire
      setTimeout(cleanup, 300);
    }, 50);
  };

  const valueOrCode = (field: any, codeKeys: string[]) => {
    if (!field) return "";
    if (typeof field === "string" || typeof field === "number") return String(field);
    for (const key of codeKeys) {
      const value = field?.[key];
      if (value != null) return String(value);
    }
    return "";
  };

  const valueOrName = (field: any, nameKeys: string[], codeKeys: string[] = []) => {
    if (!field) return "";
    if (typeof field === "string" || typeof field === "number") return String(field);
    for (const key of nameKeys) {
      const value = field?.[key];
      if (value != null) return String(value);
    }
    for (const key of codeKeys) {
      const value = field?.[key];
      if (value != null) return String(value);
    }
    return "";
  };

  // Helper function to map API fields to form fields
  const mapApiToFormFields = (apiData: any): Partial<AramaForm> => {
    // Map arama_lands array fields - handle both camelCase and snake_case from API
    const mappedLand = (apiData.arama_lands || []).map((land: any) => ({
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

    // Map resident_silmathas array fields - handle API structure (name, national_id, etc.) to form structure
    const mappedSilmathas = (apiData.resident_silmathas || []).map((silmatha: any, index: number) => ({
      id: String(silmatha.id || index + 1),
      serialNumber: silmatha.serialNumber ?? index + 1,
      silmathaName: silmatha.name ?? silmatha.silmathaName ?? "",
      registrationNumber: silmatha.national_id ?? silmatha.registrationNumber ?? "",
      occupationEducation: silmatha.position 
        ? `${silmatha.position}${silmatha.notes ? `, ${silmatha.notes}` : ""}`
        : silmatha.occupationEducation ?? "",
    }));

    return {
      // Step 1: Basic Information
      arama_name: apiData.ar_vname ?? "",
      arama_address: apiData.ar_addrs ?? "",
      telephone_number: apiData.ar_mobile ?? "",
      whatsapp_number: apiData.ar_whtapp ?? "",
      email_address: apiData.ar_email ?? "",
      
      // Step 2: Location Details
      province: valueOrCode(apiData.ar_province, ["cp_code", "code"]),
      district: valueOrCode(apiData.ar_district, ["dd_dcode", "code"]),
      divisional_secretariat: valueOrCode(apiData.ar_divisional_secretariat, ["dv_dvcode", "dd_dcode", "code"]),
      provincial_sasanaarakshaka_council: apiData.ar_pradeshya_sabha ?? "",
      grama_niladhari_division: valueOrCode(apiData.ar_gndiv, ["gn_gnc", "gn_code", "code"]),
      
      // Step 3: Administrative Details
      chief_nun_name: apiData.ar_viharadhipathi_name ?? "",
      chief_nun_registration_number: apiData.ar_viharadhipathi_regn ?? apiData.ar_ownercd?.sil_regn ?? "",
      established_period: apiData.ar_period_established ?? "",
      
      // Step 4: Land & Facilities
      land_size: "", // Not in API response
      land_ownership: "", // Not in API response
      legal_ownership_proof: "", // Not in API response
      existing_buildings_facilities: apiData.ar_buildings_description ?? "",
      donor_families_count: apiData.ar_dayaka_families_count ?? "",
      committees: apiData.ar_kulangana_committee ?? "",
      
      // Step 5: Land Information
      arama_owned_land: JSON.stringify(mappedLand),
      land_info_certified: apiData.ar_land_info_certified ?? false,
      
      // Step 6: Resident Sil Mathā
      resident_silmathas: JSON.stringify(mappedSilmathas),
      resident_silmathas_certified: apiData.ar_resident_silmathas_certified ?? false,
      
      // Step 7: Inspection Report
      inspection_report: apiData.ar_inspection_report ?? "",
      inspection_code: apiData.ar_inspection_code ?? "",
      
      // Step 8: Ownership
      ownership_district: valueOrName(apiData.ar_district, ["dd_dname", "name"], ["dd_dcode", "code"]),
      ownership_divisional_secretariat: valueOrName(
        apiData.ar_divisional_secretariat,
        ["dv_dvname", "dd_dname", "name"],
        ["dv_dvcode", "dd_dcode", "code"]
      ),
      ownership_grama_niladhari_division: valueOrName(
        apiData.ar_grama_niladhari_division_ownership,
        ["gn_gnname", "name"],
        ["gn_gnc", "gn_code", "code"]
      ),
      ownership_arama_name: apiData.ar_vname ?? "",
      pooja_deed_obtained: apiData.ar_sanghika_donation_deed ?? false,
      government_pooja_deed_obtained: apiData.ar_government_donation_deed ?? false,
      government_pooja_deed_in_progress: apiData.ar_government_donation_deed_in_progress ?? false,
      institution_name: "", // Not in API response
      institution_consent_obtained: apiData.ar_authority_consent_attached ?? false,
      recommend_new_center: apiData.ar_recommend_new_center ?? false,
      recommend_registered_arama: apiData.ar_recommend_registered_temple ?? false,
      
      // Step 9: Annex II
      annex2_chief_nun_registered: apiData.ar_annex2_chief_incumbent_letter ?? false,
      annex2_land_ownership_docs: apiData.ar_annex2_land_ownership_docs ?? false,
      annex2_institution_consent: false, // Not in API response
      annex2_district_association_recommendation: apiData.ar_annex2_coordinator_recommendation ?? false,
      annex2_divisional_secretary_recommendation: apiData.ar_annex2_divisional_secretary_recommendation ?? false,
      annex2_recommend_district: valueOrName(apiData.ar_district, ["dd_dname", "name"], ["dd_dcode", "code"]),
      annex2_recommend_divisional_secretariat: valueOrName(
        apiData.ar_divisional_secretariat,
        ["dv_dvname", "dd_dname", "name"],
        ["dv_dvcode", "dd_dcode", "code"]
      ),
      annex2_recommend_grama_niladhari_division: valueOrName(
        apiData.ar_gndiv,
        ["gn_gnname", "name"],
        ["gn_gnc", "gn_code", "code"]
      ),
      annex2_recommend_arama_name: apiData.ar_vname ?? "",
      
      // Step 10: Secretary Approval
      secretary_approve_construction: apiData.ar_annex2_approval_construction ?? false,
      secretary_not_approve_construction: false, // Not in API response
      secretary_refer_registration: false, // Not in API response
      secretary_refer_resubmission: apiData.ar_annex2_referral_resubmission ?? false,
      secretary_resubmission_notes: "", // Not in API response
    };
  };

  // Load data for update
  useEffect(() => {
    if (!aramaId) {
      setLoading(false);
      return;
    }

    const loadAramaData = async () => {
      try {
        setLoading(true);
        // Use READ_ONE API to fetch arama data
        const response = await _manageArama({
          action: "READ_ONE",
          payload: {
            // Try ar_id first (if it's a number), otherwise use as ar_trn
            ...(isNaN(Number(aramaId)) ? { ar_trn: aramaId } : { ar_id: Number(aramaId) }),
          },
        });

        const apiData = (response.data as any)?.data || response.data;
        console.log("Loading arama data from API:", apiData);
        
        // Map API fields to form fields
        const formData = mapApiToFormFields(apiData);
        const filledValues = {
          ...aramaInitialValues,
          ...formData,
        };
        setValues(filledValues);
        console.log("Form values auto-filled:", filledValues);

        setWorkflowStatus(apiData?.ar_workflow_status ?? apiData?.workflow_status ?? "");

        // Set certificate metadata
        const certificateNumber = String(apiData?.ar_trn ?? apiData?.ar_id ?? "");
        const certificateUrl = certificateNumber
          ? `${CERTIFICATE_URL_BASE}/${encodeURIComponent(certificateNumber)}`
          : "";
        setCertificateMeta({ number: certificateNumber, url: certificateUrl });

        const rawScanPath =
          apiData?.ar_scanned_document_path ||
          apiData?.ar_scanned_document ||
          apiData?.scanned_document_path ||
          apiData?.scanned_document;
        const resolvedScan = resolveScanUrl(rawScanPath);
        if (resolvedScan) setExistingScanUrl(resolvedScan);
      } catch (error) {
        console.error("Error loading arama data:", error);
        toast.error("Failed to load arama data");
      } finally {
        setLoading(false);
      }
    };

    loadAramaData();
  }, [aramaId]);

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

  const handleInputChange = (name: keyof AramaForm, value: string | boolean) => {
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

  const handleSetMany = (patch: Partial<AramaForm>) => {
    setValues((prev) => {
      const next: Partial<AramaForm> = { ...prev, ...patch };
      const nextErrors: Errors<AramaForm> = { ...errors };
      Object.keys(patch).forEach((k) => {
        const cfg = fieldByName.get(k);
        if (cfg) {
          const raw = String((next as any)[k] ?? "");
          nextErrors[cfg.name as keyof AramaForm] = validateField(cfg, raw, next, today);
        }
      });
      setErrors(nextErrors);
      return next;
    });
  };

  const validateTab = (tabIndex: number): boolean => {
    const step = steps[tabIndex - 1];
    if (!step) return true;
    const nextErrors: Errors<AramaForm> = { ...errors };
    let valid = true;
    for (const f of step.fields) {
      if (f.name === "arama_owned_land" || f.name === "resident_silmathas") continue;
      const raw = values[f.name];
      const stringValue = typeof raw === "boolean" ? String(raw) : (raw as string | undefined);
      const msg = validateField(f, stringValue, values, today);
      nextErrors[f.name] = msg;
      if (msg) valid = false;
    }
    if (tabIndex === 2) {
      if (!values.province) {
        nextErrors.province = "Required";
        valid = false;
      } else {
        nextErrors.province = undefined;
      }
      // Clear optional location field errors
      nextErrors.district = undefined;
      nextErrors.divisional_secretariat = undefined;
      nextErrors.grama_niladhari_division = undefined;
    }
    setErrors(nextErrors);
    if (!valid) scrollTop();
    return valid;
  };

  // Helper function to map form fields to API field names
  const mapFormToApiFields = (formData: Partial<AramaForm>, parsedAramaOwnedLand: any[]) => {
    // Map arama_lands array fields - use camelCase as per API
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

    // Map resident_silmathas - convert form structure to API structure
    const parsedResidentSilmathas = formData.resident_silmathas 
      ? (typeof formData.resident_silmathas === 'string' ? JSON.parse(formData.resident_silmathas) : formData.resident_silmathas)
      : [];
    
    const mappedSilmathas = parsedResidentSilmathas.map((silmatha: any) => ({
      name: silmatha.silmathaName ?? silmatha.name ?? "",
      national_id: silmatha.registrationNumber ?? silmatha.national_id ?? "",
      date_of_birth: "", // Not in form
      ordination_date: "", // Not in form
      position: silmatha.occupationEducation?.split(',')[0] ?? "",
      is_head_nun: silmatha.serialNumber === 1,
      notes: silmatha.occupationEducation?.split(',').slice(1).join(', ').trim() ?? "",
    }));

    const ownerCode = "SL2025001";
    const donorCount = formData.donor_families_count ? parseInt(formData.donor_families_count, 10) : 0;
    const donorCountNum = isNaN(donorCount) ? 0 : donorCount;

    let bgndate: string | null = null;
    if (formData.established_period) {
      const periodStr = toYYYYMMDD(formData.established_period);
      if (periodStr) {
        bgndate = periodStr;
      }
    }

    const payload: any = {
      ar_typ: "ARAMA",
      ar_ownercd: ownerCode,
      ar_parshawa: "PR005",
      ar_mobile: formData.telephone_number ?? "",
      ar_whtapp: formData.whatsapp_number ?? "",
      ar_email: formData.email_address ?? "",
      ar_vname: formData.arama_name ?? "",
      ar_addrs: formData.arama_address ?? "",
      ar_province: formData.province ?? "",
      ar_district: formData.district ?? "",
      ar_divisional_secretariat: formData.divisional_secretariat ?? "",
      ar_pradeshya_sabha: formData.provincial_sasanaarakshaka_council ?? "",
      ar_gndiv: formData.grama_niladhari_division ?? "",
      ar_nikaya: "",
      ar_viharadhipathi_name: formData.chief_nun_name ?? "",
      ar_period_established: formData.established_period ? toYYYYMMDD(formData.established_period) : "",
      ar_buildings_description: formData.existing_buildings_facilities ?? "",
      ar_dayaka_families_count: formData.donor_families_count ?? "",
      ar_fmlycnt: donorCountNum,
      ar_kulangana_committee: formData.committees ?? "",
      ar_dayaka_sabha: "",
      ar_temple_working_committee: "",
      ar_other_associations: "",
      temple_owned_land: mappedLand,
      ar_land_info_certified: formData.land_info_certified ?? false,
      resident_silmathas: mappedSilmathas,
      ar_resident_silmathas_certified: formData.resident_silmathas_certified ?? false,
      ar_inspection_report: formData.inspection_report ?? "",
      ar_inspection_code: formData.inspection_code ?? "",
      ar_grama_niladhari_division_ownership: formData.ownership_grama_niladhari_division ?? "",
      ar_sanghika_donation_deed: formData.pooja_deed_obtained ?? false,
      ar_government_donation_deed: formData.government_pooja_deed_obtained ?? false,
      ar_government_donation_deed_in_progress: formData.government_pooja_deed_in_progress ?? false,
      ar_authority_consent_attached: formData.institution_consent_obtained ?? false,
      ar_recommend_new_center: formData.recommend_new_center ?? false,
      ar_recommend_registered_temple: formData.recommend_registered_arama ?? false,
      ar_annex2_recommend_construction: false,
      ar_annex2_land_ownership_docs: formData.annex2_land_ownership_docs ?? false,
      ar_annex2_chief_incumbent_letter: formData.annex2_chief_nun_registered ?? false,
      ar_annex2_coordinator_recommendation: formData.annex2_district_association_recommendation ?? false,
      ar_annex2_divisional_secretary_recommendation: formData.annex2_divisional_secretary_recommendation ?? false,
      ar_annex2_approval_construction: formData.secretary_approve_construction ?? false,
      ar_annex2_referral_resubmission: formData.secretary_refer_resubmission ?? false,
    };

    if (bgndate) {
      payload.ar_bgndate = bgndate;
    }

    return payload;
  };

  const buildPartialPayloadForTab = (tabIndex: number): Partial<any> => {
    const s = steps[tabIndex - 1];
    if (!s) return {};

    let parsedLand: any[] = [];
    try {
      parsedLand = values.arama_owned_land
        ? (typeof values.arama_owned_land === "string" ? JSON.parse(values.arama_owned_land) : values.arama_owned_land)
        : [];
    } catch (e) {
      console.error("Error parsing arama_owned_land:", e);
    }

    const fullPayload = mapFormToApiFields(values, parsedLand);
    const fieldsByTab: Record<number, string[]> = {
      1: ["ar_typ", "ar_ownercd", "ar_parshawa", "ar_mobile", "ar_whtapp", "ar_email", "ar_vname", "ar_addrs"],
      2: ["ar_typ", "ar_ownercd", "ar_parshawa", "ar_province", "ar_district", "ar_divisional_secretariat", "ar_pradeshya_sabha", "ar_gndiv"],
      3: ["ar_typ", "ar_ownercd", "ar_parshawa", "ar_nikaya", "ar_viharadhipathi_name", "ar_period_established", "ar_bgndate"],
      4: ["ar_typ", "ar_ownercd", "ar_parshawa", "ar_buildings_description", "ar_dayaka_families_count", "ar_fmlycnt", "ar_kulangana_committee", "ar_dayaka_sabha", "ar_temple_working_committee", "ar_other_associations"],
      5: ["ar_typ", "ar_ownercd", "ar_parshawa", "temple_owned_land", "ar_land_info_certified"],
      6: ["ar_typ", "ar_ownercd", "ar_parshawa", "resident_silmathas", "ar_resident_silmathas_certified"],
      7: ["ar_typ", "ar_ownercd", "ar_parshawa", "ar_inspection_report", "ar_inspection_code"],
      8: ["ar_typ", "ar_ownercd", "ar_parshawa", "ar_grama_niladhari_division_ownership", "ar_sanghika_donation_deed", "ar_government_donation_deed", "ar_government_donation_deed_in_progress", "ar_authority_consent_attached", "ar_recommend_new_center", "ar_recommend_registered_temple"],
      9: ["ar_typ", "ar_ownercd", "ar_parshawa", "ar_annex2_recommend_construction", "ar_annex2_land_ownership_docs", "ar_annex2_chief_incumbent_letter", "ar_annex2_coordinator_recommendation", "ar_annex2_divisional_secretary_recommendation"],
      10: ["ar_typ", "ar_ownercd", "ar_parshawa", "ar_annex2_approval_construction", "ar_annex2_referral_resubmission"],
    };

    const keys = fieldsByTab[tabIndex] ?? [];
    const payload: any = {};
    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(fullPayload, key) && fullPayload[key] !== undefined) {
        payload[key] = fullPayload[key];
      }
    }

    return payload;
  };

  const handleSave = async () => {
    if (!validateTab(activeTab)) {
      toast.error("Please fix validation errors before saving");
      return;
    }

    try {
      setSaving(true);
      const partialPayload = buildPartialPayloadForTab(activeTab);
      const updatePayload = {
        ar_id: Number(aramaId),
        data: partialPayload,
      };

      console.log(`Saving tab ${activeTab} data:`, updatePayload);
      await _manageArama({ action: "UPDATE", payload: updatePayload } as any);
      toast.success("Changes saved successfully");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to save changes";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleUploadScannedDocument = async () => {
    if (!scannedFile || !aramaId) {
      toast.error("Please select a file to upload");
      return;
    }

    try {
      setUploadingScan(true);
      const res = await _uploadScannedDocument(Number(aramaId), scannedFile);
      toast.success("Scanned document uploaded successfully");
      const pathFromResponse =
        (res as any)?.data?.ar_scanned_document_path ||
        (res as any)?.ar_scanned_document_path ||
        (res as any)?.data?.scanned_document_path ||
        (res as any)?.scanned_document_path;
      const resolved = resolveScanUrl(pathFromResponse);
      if (resolved) {
        setExistingScanUrl(resolved);
      } else if (scanPreviewUrl) {
        setExistingScanUrl(scanPreviewUrl);
      }
      setShowUploadModal(false);
      setScannedFile(null);
      if (scanPreviewUrl && resolved) {
        URL.revokeObjectURL(scanPreviewUrl);
        setScanPreviewUrl(null);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to upload document";
      toast.error(msg);
    } finally {
      setUploadingScan(false);
    }
  };

  const handleScanFileChange = (file: File | null) => {
    if (!file) {
      setScannedFile(null);
      if (scanPreviewUrl) {
        URL.revokeObjectURL(scanPreviewUrl);
        setScanPreviewUrl(null);
      }
      return;
    }
    const validTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
    if (!validTypes.includes(file.type)) {
      toast.error("Invalid file type. Please upload PDF, JPEG, or PNG files.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size exceeds 5MB limit.");
      return;
    }
    setScannedFile(file);
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setScanPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
    } else {
      if (scanPreviewUrl) {
        URL.revokeObjectURL(scanPreviewUrl);
        setScanPreviewUrl(null);
      }
    }
  };

  const renderExistingScan = () => {
    if (!existingScanUrl) return null;
    const lower = existingScanUrl.toLowerCase();
    const isImage =
      lower.endsWith(".png") ||
      lower.endsWith(".jpg") ||
      lower.endsWith(".jpeg") ||
      lower.endsWith(".gif") ||
      lower.endsWith(".webp");
    const isPdf = lower.includes(".pdf");
    const fileName = existingScanUrl.split("/").pop() || "scanned-document";

    return (
      <div className="rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-slate-900">Current scanned document</p>
            <a
              href={existingScanUrl}
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
            <img src={existingScanUrl} alt="Scanned certificate" className="w-full max-h-96 object-contain" />
          </div>
        ) : isPdf ? (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            <div className="aspect-[8.5/11] w-full">
              <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
                <Viewer fileUrl={existingScanUrl} withCredentials={false} />
              </Worker>
            </div>
          </div>
        ) : null}
      </div>
    );
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

  const aramaCertificateData = useMemo(() => {
    const today = new Date();
    const signatureDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
      today.getDate()
    ).padStart(2, "0")}`;
    const residentNames = residentSilmathaRows.map((r) => r.silmathaName || r.registrationNumber || "").filter(Boolean);
    const padResidents = (index: number) => residentNames[index] || "";
    return {
      registration_number: certificateNumberLabel,
      aramaya_name: values.arama_name || "",
      aramaya_address: values.arama_address || "",
      district: locationNames.districtName || values.district || "",
      divisional_secretariat: locationNames.divisionName || values.divisional_secretariat || "",
      regional_committee: values.provincial_sasanaarakshaka_council || "",
      establishment_period: values.established_period || "",
      aramadipati_name: values.chief_nun_name || "",
      resident_nun_a: padResidents(0),
      resident_nun_aa: padResidents(1),
      resident_nun_ae: padResidents(2),
      resident_nun_aae: padResidents(3),
      resident_nun_i: padResidents(4),
      resident_nun_ii: padResidents(5),
      resident_nun_u: padResidents(6),
      resident_nun_uu: padResidents(7),
      land_ownership: values.land_ownership || values.ownership_arama_name || "",
      signature_date: signatureDate,
    };
  }, [
    certificateNumberLabel,
    locationNames.districtName,
    locationNames.divisionName,
    residentSilmathaRows,
    values.arama_address,
    values.arama_name,
    values.chief_nun_name,
    values.district,
    values.divisional_secretariat,
    values.established_period,
    values.land_ownership,
    values.ownership_arama_name,
    values.provincial_sasanaarakshaka_council,
  ]);

  const handleLandInfoChange = (rows: LandInfoRow[]) => {
    handleInputChange("arama_owned_land", JSON.stringify(rows));
  };

  const handleResidentSilmathaChange = (rows: ResidentSilmathaRow[]) => {
    handleInputChange("resident_silmathas", JSON.stringify(rows));
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-slate-600">Loading arama data...</div>
      </div>
    );
  }

  const handleOpenApproveDialog = () => setApproveDialogOpen(true);

  const handleCloseApproveDialog = () => {
    if (approving) return;
    setApproveDialogOpen(false);
  };
  const handleOpenPrintDialog = () => setPrintDialogOpen(true);

  const handleClosePrintDialog = () => {
    if (printingMarking) return;
    setPrintDialogOpen(false);
    setPrintingActive(false);
  };

  const handleOpenRejectDialog = () => {
    setRejectionReason("");
    setRejectDialogOpen(true);
  };
  const handleCloseRejectDialog = () => {
    if (rejecting) return;
    setRejectDialogOpen(false);
  };

  const handleApprove = async () => {
    if (
      !window.confirm(
        "Approve this registration? This action may be irreversible."
      )
    )
      return;
    try {
      setApproving(true);
      await _manageArama({
        action: "APPROVE",
        payload: { ar_id: aramaId },
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

   const handleReject= async () => {
      try {
        setRejecting(true);
        const reason = rejectionReason.trim();
        if (!reason) {
          toast.error("Please enter a rejection reason.");
          setRejecting(false);
          return;
        }
        setRejectDialogOpen(false);
        const res = await _manageArama({
          action: "REJECT",
          payload: { ar_id: aramaId, rejection_reason: reason },
        } as any);
        const payload = (res as any)?.data ?? res;
        const success = (payload as any)?.success ?? true;
        if (!success) {
          const { messages, fallback } = collectApprovalErrors(payload);
          toast.error(messages.join("\n") || fallback);
          return;
        }
        toast.success("Rejected successfully.", { autoClose: 1200 });
        setRejectionReason("");
      } catch (e: unknown) {
      const data = (e as any)?.response?.data ?? (e as any)?.data;
      const { messages, fallback } = collectApprovalErrors(data);
      const errMsg =
        messages.join("\n") ||
        fallback ||
        (e instanceof Error
          ? e.message
          : "Failed to reject. Please try again.");
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
                    <p className="text-slate-300 text-sm">Editing: {aramaId}</p>
                  </div>
                  {
                    isAdmin && workflowStatus !== "COMPLETED" && (
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
                    )
                  }
                </div>
              </div>

              <div className="px-4 md:px-10 py-6" ref={sectionRef}>
                <Tabs
                  tabs={steps.map((s) => ({ id: String(s.id), label: s.title }))}
                  value={String(activeTab)}
                  onChange={(id) => {
                    setActiveTab(Number(id));
                    scrollTop();
                  }}
                  contentClassName="pt-6"
                />

                {/* Form sections */}
                <div className="min-h-[360px] mt-6">
                  <h2 className="text-xl font-bold text-slate-800 mb-5">{stepTitle}</h2>

                  {/* Certificates Tab */}
                  {isCertificatesTab && (
                    <div className="space-y-8">
                      <style>{certificateStyles}</style>
                      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white/80 p-6 shadow">
                        <div className="flex flex-col gap-2 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="text-xs uppercase tracking-[0.5em] text-slate-400">Certificate number</p>
                            <p className="text-2xl font-semibold text-slate-900">{certificateNumberLabel}</p>
                            <p className="break-all text-slate-500">{certificateUrlLabel}</p>
                          </div>
                          <button
                            onClick={handleOpenPrintDialog}
                            disabled={printingMarking}
                            className="inline-flex items-center justify-center rounded-full bg-slate-800 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-400 disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {printingMarking ? "Please wait..." : "Print QR on Certificate"}
                          </button>
                        </div>
                        <p className="text-xs text-slate-500">
                          Insert the pre-printed legal-size certificate into the printer. Only the QR code positioned at the
                          bottom-right corner of the sheet will be printed.
                        </p>
                      </div>

                      <div className="flex justify-center">
                        <section
                          id="certificate-print-area"
                          data-printing={printingActive ? "true" : undefined}
                          ref={certificatePaperRef}
                          className="aramaya-certificate"
                        >
                          <div className="aramaya-content">
                            <div className="aramaya-row">
                              <div className="aramaya-label font-semibold"></div>
                              <div className="aramaya-label">Registration Number :</div>
                              <div className="aramaya-value">{aramaCertificateData.registration_number}</div>
                            </div>
                            <div className="aramaya-row">
                              <div className="aramaya-label font-semibold">01.</div>
                              <div className="aramaya-label">Name of Silmatha Aramaya</div>
                              <div className="aramaya-value">{aramaCertificateData.aramaya_name}</div>
                            </div>
                            <div className="aramaya-row">
                              <div className="aramaya-label font-semibold">02.</div>
                              <div className="aramaya-label">Address of the Aramaya</div>
                              <div className="aramaya-value">{aramaCertificateData.aramaya_address}</div>
                            </div>
                            <div className="aramaya-row">
                              <div className="aramaya-label font-semibold">03.</div>
                              <div className="aramaya-label">District</div>
                              <div className="aramaya-value">{aramaCertificateData.district}</div>
                            </div>
                            <div className="aramaya-row">
                              <div className="aramaya-label font-semibold">04.</div>
                              <div className="aramaya-label">Divisional Secretariat</div>
                              <div className="aramaya-value">{aramaCertificateData.divisional_secretariat}</div>
                            </div>
                            <div className="aramaya-row">
                              <div className="aramaya-label font-semibold">05.</div>
                              <div className="aramaya-label">Regional Sasana Protection Committee</div>
                              <div className="aramaya-value">{aramaCertificateData.regional_committee}</div>
                            </div>
                            <div className="aramaya-row">
                              <div className="aramaya-label font-semibold">06.</div>
                              <div className="aramaya-label">Period when Aramaya was established</div>
                              <div className="aramaya-value">{aramaCertificateData.establishment_period}</div>
                            </div>
                            <div className="aramaya-row">
                              <div className="aramaya-label font-semibold">07.</div>
                              <div className="aramaya-label">
                                Name of Aramadipati (Chief Nun) at the time of registration
                              </div>
                              <div className="aramaya-value">{aramaCertificateData.aramadipati_name}</div>
                            </div>
                            <div className="aramaya-row">
                              <div className="aramaya-label font-semibold">08.</div>
                              <div className="aramaya-label">
                                Number and names of other resident nuns at the time of registration
                              </div>
                              <div className="aramaya-sublist">
                                {[["a", "resident_nun_a"], ["b", "resident_nun_aa"], ["c", "resident_nun_ae"], ["d", "resident_nun_aae"], ["e", "resident_nun_i"], ["f", "resident_nun_ii"], ["g", "resident_nun_u"], ["h", "resident_nun_uu"]].map(
                                  ([code, key]) => (
                                    <div className="aramaya-multi" key={key}>
                                      <span className="aramaya-label">{code}.</span>
                                      <span className="aramaya-value">
                                        {(aramaCertificateData as any)[key] || ""}
                                      </span>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                            <div className="aramaya-row">
                              <div className="aramaya-label font-semibold">10.</div>
                              <div className="aramaya-label">Ownership of the land where Aramaya is situated</div>
                              <div className="aramaya-value">{aramaCertificateData.land_ownership}</div>
                            </div>
                          </div>

                          <div className="aramaya-footer">
                            <div className="aramaya-disclaimer">
                              I hereby certify that the above-mentioned Silmatha Aramaya has been registered in the Department of
                              Buddhist Affairs as recommended and submitted by the District Silmatha Association and Regional Sasana
                              Protection Committee.
                            </div>
                            <div className="aramaya-signature">
                              {aramaCertificateData.signature_date}
                              <br />
                              At No. 135, Sri Anagarika Dharmapala Mawatha,
                              <br />
                              Colombo 07
                            </div>
                          </div>

                          <div className="aramaya-qr">
                            <div className="rounded-md border border-slate-200 bg-white p-0 inline-block">
                              <QRCode value={certificateQrValue} size={80} />
                            </div>
                          </div>
                        </section>
                      </div>
                    </div>
                  )}

                  {/* Upload Scanned Files Tab */}
                  {isScannedFilesTab && (
                    <div className="space-y-6">
                      <div className="bg-slate-50 p-6 rounded-lg">
                        <h3 className="text-lg font-semibold text-slate-800 mb-4">Upload Scanned Document</h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                              Select PDF/JPEG/PNG File
                            </label>
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) => handleScanFileChange(e.target.files?.[0] || null)}
                              className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                            />
                          </div>
                          {renderExistingScan()}
                          {scannedFile ? (
                            <div className="text-sm text-slate-600">
                              Selected: {scannedFile.name}
                            </div>
                          ) : (
                            <div className="text-sm text-slate-500">No file selected</div>
                          )}
                          {scanPreviewUrl ? (
                            <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                              <img src={scanPreviewUrl} alt="Selected scan preview" className="w-full max-h-96 object-contain" />
                            </div>
                          ) : null}
                          <button
                            onClick={handleUploadScannedDocument}
                            disabled={!scannedFile || uploadingScan}
                            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {uploadingScan ? "Uploading..." : "Upload Document"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Regular form tabs - render same as AddArama */}
                  {!isCertificatesTab && !isScannedFilesTab && (
                    <div className={`grid grid-cols-1 md:grid-cols-2 gap-5`}>
                      {/* Step 5: Land Information Table */}
                      {activeTab === 5 && (
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
                      {activeTab === 6 && (
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
                      {activeTab === 2 && (
                        <div className="md:col-span-2">
                          <LocationPicker
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
                              Provincial Sasanaarakshaka balamandalaya
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

                      {/* Other form fields - similar to AddArama */}
                      {activeTab !== 2 && activeTab !== 5 && activeTab !== 6 && current.fields.map((f) => {
                        const id = String(f.name);
                        const rawVal = (values[f.name] as unknown as string) ?? "";
                        const val = f.type === "date" ? toYYYYMMDD(rawVal) : rawVal;
                        const err = errors[f.name];

                        if (id === "arama_owned_land" || id === "resident_silmathas") return null;

                        if (id === "chief_nun_name") {
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

                        // Checkbox fields
                        if (id.includes("pooja_") || id.includes("institution_") || id.includes("recommend_") || id.includes("annex2_") || id.includes("secretary_")) {
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

                        // Regular inputs
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
                </div>

                <div className="flex flex-col md:flex-row gap-4 md:gap-0 md:justify-between md:items-center mt-8 pt-6 border-t border-slate-200">
                  <button
                    onClick={() => router.push("/temple/arama")}
                    className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all bg-slate-200 text-slate-700 hover:bg-slate-300"
                  >
                    Back to List
                  </button>

                  <div className="text-sm text-slate-600 font-medium text-center">Tab {activeTab} of {steps.length}</div>

                  {!isCertificatesTab && !isScannedFilesTab && (
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center justify-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-all disabled:opacity-70"
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
        <FooterBar />
      </div>

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

export default function UpdateArama({isAdmin}: {isAdmin: boolean}) {
  return (
    <Suspense fallback={<div className="p-8 text-slate-600">Loading…</div>}>
      <UpdateAramaPageInner isAdmin={isAdmin} />
    </Suspense>
  );
}
