"use client";

import React, { useMemo, useRef, useState, useCallback, Suspense, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { _manageArama, _uploadScannedDocument } from "@/services/arama";
import { FooterBar } from "@/components/FooterBar";
import { TopBar } from "@/components/TopBar";
import { Sidebar } from "@/components/Sidebar";
import QRCode from "react-qr-code";

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

import { Tabs } from "@/components/ui/Tabs";

// Toasts
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const CERTIFICATE_URL_BASE = "https://hrms.dbagovlk.com/arama/certificate";
const SAMPLE_CERT_URL = `${CERTIFICATE_URL_BASE}/sample`;

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
  const [uploadingScan, setUploadingScan] = useState(false);
  const [approving, setApproving] = useState(false);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const current = steps[activeTab - 1];
  const stepTitle = current?.title ?? "";
  const isCertificatesTab = stepTitle === "Certificates";
  const isScannedFilesTab = stepTitle === "Upload Scanned Files";

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
      province: apiData.ar_province ?? "",
      district: apiData.ar_district ?? "",
      divisional_secretariat: apiData.ar_divisional_secretariat ?? "",
      provincial_sasanaarakshaka_council: apiData.ar_pradeshya_sabha ?? "",
      grama_niladhari_division: apiData.ar_gndiv ?? "",
      
      // Step 3: Administrative Details
      chief_nun_name: apiData.ar_viharadhipathi_name ?? "",
      chief_nun_registration_number: "", // Not in API response
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
      ownership_district: apiData.ar_district ?? "",
      ownership_divisional_secretariat: apiData.ar_divisional_secretariat ?? "",
      ownership_grama_niladhari_division: apiData.ar_grama_niladhari_division_ownership ?? "",
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
      annex2_recommend_district: apiData.ar_district ?? "",
      annex2_recommend_divisional_secretariat: apiData.ar_divisional_secretariat ?? "",
      annex2_recommend_grama_niladhari_division: apiData.ar_gndiv ?? "",
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

        // Set certificate metadata
        const certificateNumber = String(apiData?.ar_trn ?? apiData?.ar_id ?? "");
        const certificateUrl = certificateNumber
          ? `${CERTIFICATE_URL_BASE}/${encodeURIComponent(certificateNumber)}`
          : "";
        setCertificateMeta({ number: certificateNumber, url: certificateUrl });
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
    if (tabIndex === 2 && !values.province) {
      nextErrors.province = "Required";
      valid = false;
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
      ar_mobile: formData.telephone_number ?? "",
      ar_whtapp: formData.whatsapp_number ?? "",
      ar_email: formData.email_address ?? "",
      ar_parshawa: "PR005", // Constant as per user request
      ar_vname: formData.arama_name ?? "",
      ar_addrs: formData.arama_address ?? "",
      ar_province: formData.province ?? "",
      ar_district: formData.district ?? "",
      ar_divisional_secretariat: formData.divisional_secretariat ?? "",
      ar_pradeshya_sabha: formData.provincial_sasanaarakshaka_council ?? "",
      ar_gndiv: formData.grama_niladhari_division ?? "",
      ar_viharadhipathi_name: formData.chief_nun_name ?? "",
      ar_period_established: formData.established_period ? toYYYYMMDD(formData.established_period) : "",
      ar_buildings_description: formData.existing_buildings_facilities ?? "",
      ar_dayaka_families_count: formData.donor_families_count ?? "",
      ar_fmlycnt: donorCountNum,
      ar_kulangana_committee: formData.committees ?? "",
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
      ar_annex2_land_ownership_docs: formData.annex2_land_ownership_docs ?? false,
      ar_annex2_chief_incumbent_letter: formData.annex2_chief_nun_registered ?? false,
      ar_annex2_coordinator_recommendation: formData.annex2_district_association_recommendation ?? false,
      ar_annex2_divisional_secretary_recommendation: formData.annex2_divisional_secretary_recommendation ?? false,
    };

    if (bgndate) {
      payload.ar_bgndate = bgndate;
    }

    return payload;
  };

  const buildPartialPayloadForTab = (tabIndex: number): Partial<any> => {
    const s = steps[tabIndex - 1];
    if (!s) return {};
    
    const payload: any = {
      ar_parshawa: "PR005", // Constant as per user request
    };
    
    if (tabIndex === 5) {
      try {
        const parsedLand = values.arama_owned_land 
          ? (typeof values.arama_owned_land === 'string' ? JSON.parse(values.arama_owned_land) : values.arama_owned_land)
          : [];
        const mappedLand = parsedLand.map((land: any) => ({
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
        payload.temple_owned_land = mappedLand;
        payload.ar_land_info_certified = values.land_info_certified ?? false;
      } catch (e) {
        console.error("Error parsing arama_owned_land:", e);
      }
      return payload;
    }

    if (tabIndex === 6) {
      try {
        const parsedSilmathas = values.resident_silmathas 
          ? (typeof values.resident_silmathas === 'string' ? JSON.parse(values.resident_silmathas) : values.resident_silmathas)
          : [];
        const mappedSilmathas = parsedSilmathas.map((silmatha: any) => ({
          name: silmatha.silmathaName ?? silmatha.name ?? "",
          national_id: silmatha.registrationNumber ?? silmatha.national_id ?? "",
          date_of_birth: silmatha.date_of_birth ?? "",
          ordination_date: silmatha.ordination_date ?? "",
          position: silmatha.occupationEducation?.split(',')[0]?.trim() ?? "",
          is_head_nun: silmatha.serialNumber === 1,
          notes: silmatha.occupationEducation?.split(',').slice(1).join(', ').trim() ?? "",
        }));
        payload.resident_silmathas = mappedSilmathas;
        payload.ar_resident_silmathas_certified = values.resident_silmathas_certified ?? false;
      } catch (e) {
        console.error("Error parsing resident_silmathas:", e);
      }
      return payload;
    }

    for (const f of s.fields) {
      if (f.name === "arama_owned_land" || f.name === "resident_silmathas") continue;
      const v = values[f.name];
      if (v == null) continue;
      
      // Map form field names to API field names
      const fieldMap: Record<string, string> = {
        arama_name: "ar_vname",
        arama_address: "ar_addrs",
        telephone_number: "ar_mobile",
        whatsapp_number: "ar_whtapp",
        email_address: "ar_email",
        province: "ar_province",
        district: "ar_district",
        divisional_secretariat: "ar_divisional_secretariat",
        provincial_sasanaarakshaka_council: "ar_pradeshya_sabha",
        grama_niladhari_division: "ar_gndiv",
        chief_nun_name: "ar_viharadhipathi_name",
        established_period: "ar_period_established",
        existing_buildings_facilities: "ar_buildings_description",
        donor_families_count: "ar_dayaka_families_count",
        committees: "ar_kulangana_committee",
        inspection_report: "ar_inspection_report",
        inspection_code: "ar_inspection_code",
        ownership_grama_niladhari_division: "ar_grama_niladhari_division_ownership",
        pooja_deed_obtained: "ar_sanghika_donation_deed",
        government_pooja_deed_obtained: "ar_government_donation_deed",
        government_pooja_deed_in_progress: "ar_government_donation_deed_in_progress",
        institution_consent_obtained: "ar_authority_consent_attached",
        recommend_new_center: "ar_recommend_new_center",
        recommend_registered_arama: "ar_recommend_registered_temple",
        annex2_land_ownership_docs: "ar_annex2_land_ownership_docs",
        annex2_chief_nun_registered: "ar_annex2_chief_incumbent_letter",
        annex2_district_association_recommendation: "ar_annex2_coordinator_recommendation",
        annex2_divisional_secretary_recommendation: "ar_annex2_divisional_secretary_recommendation",
      };

      const apiFieldName = fieldMap[String(f.name)] || String(f.name);
      
      if (f.name === "established_period" && typeof v === "string") {
        payload[apiFieldName] = toYYYYMMDD(v) || v;
      } else if (f.name === "donor_families_count" && typeof v === "string") {
        const count = parseInt(v, 10);
        payload[apiFieldName] = v;
        payload.ar_fmlycnt = isNaN(count) ? 0 : count;
      } else {
        payload[apiFieldName] = v;
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
      await _uploadScannedDocument(Number(aramaId), scannedFile);
      toast.success("Scanned document uploaded successfully");
      setShowUploadModal(false);
      setScannedFile(null);
      // Reload data to get updated workflow status
      window.location.reload();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to upload document";
      toast.error(msg);
    } finally {
      setUploadingScan(false);
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

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-slate-600">Loading arama data...</div>
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
                    isAdmin && (
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
                    <div className="space-y-6">
                      <div className="bg-slate-50 p-6 rounded-lg">
                        <h3 className="text-lg font-semibold text-slate-800 mb-4">Arama Certificate</h3>
                        {certificateMeta.number ? (
                          <div className="space-y-4">
                            <div>
                              <p className="text-sm text-slate-600 mb-2">Certificate Number: <strong>{certificateMeta.number}</strong></p>
                              <a
                                href={certificateMeta.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                              >
                                View Certificate
                              </a>
                            </div>
                            <div className="border-t pt-4">
                              <p className="text-sm text-slate-600 mb-4">QR Code:</p>
                              <div className="bg-white p-4 inline-block rounded-lg">
                                <QRCode value={certificateMeta.url} size={200} />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="text-slate-600">Certificate will be available after the arama is registered.</p>
                        )}
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
                              Select PDF File
                            </label>
                            <input
                              type="file"
                              accept=".pdf"
                              onChange={(e) => setScannedFile(e.target.files?.[0] || null)}
                              className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                            />
                          </div>
                          {scannedFile && (
                            <div className="text-sm text-slate-600">
                              Selected: {scannedFile.name}
                            </div>
                          )}
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

                      {/* Other form fields - similar to AddArama */}
                      {activeTab !== 2 && activeTab !== 5 && activeTab !== 6 && current.fields.map((f) => {
                        const id = String(f.name);
                        const rawVal = (values[f.name] as unknown as string) ?? "";
                        const val = f.type === "date" ? toYYYYMMDD(rawVal) : rawVal;
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
