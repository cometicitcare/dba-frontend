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
import { _manageBhikku } from "@/services/bhikku";
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
  toISOFormat,
  toDisplayFormat,
  validateField,
  Errors,
  LandInfoTable,
  ResidentBhikkhuTable,
  ImportantNotes,
  type ViharadhipathiAppointmentLetterData,
  type ViharaForm,
  type StepConfig,
  type LandInfoRow,
  type ResidentBhikkhuRow,
} from "../../../add/Components";
import ViharaAngaMultipleSelector from "../../../Components/ViharaAngaMultipleSelector";
import SasanarakshakaAutocomplete from "@/components/sasanarakshaka/AutoComplete";

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

type GnDivision = {
  gn_gnc: string;
  gn_gnname: string;
};

type Division = {
  dv_dvcode: string;
  dv_dvname: string;
  gn_divisions?: GnDivision[];
};

type District = {
  dd_dcode: string;
  dd_dname: string;
  divisional_secretariats?: Division[];
};

type Province = {
  cp_code: string;
  cp_name: string;
  districts: District[];
};

const STATIC_PROVINCES: Province[] = Array.isArray((selectionsData as any)?.provinces)
  ? ((selectionsData as any).provinces as Province[])
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

  const baseSteps = useMemo(() => viharaSteps().filter((s) => s.id !== 6), []);
  const sharedTabs = useMemo(() => {
    const maxBaseStepId = baseSteps.reduce((max, step) => Math.max(max, step.id), 0);
    const certTab: StepConfig<ViharaForm> = {
      id: maxBaseStepId + 1,
      title: "Letter",
      fields: [],
    };
    const scannedTab: StepConfig<ViharaForm> = {
      id: maxBaseStepId + 2,
      title: "Upload Scanned Files",
      fields: [],
    };
    return { certTab, scannedTab };
  }, [baseSteps]);

  const majorStepGroups = useMemo(
    () => {
      const shared = isDivisionalSec ? [] : [sharedTabs.certTab, sharedTabs.scannedTab];
      return [
        {
          id: 1,
          tabs: [...baseSteps.filter((s) => s.id <= 5), ...shared],
        },
        {
          id: 2,
          tabs: [...baseSteps.filter((s) => s.id > 5), ...shared],
        },
      ];
    },
    [baseSteps, sharedTabs, isDivisionalSec]
  );

  const [workflowStatus, setWorkflowStatus] = useState<string>("");
  const visibleMajorStepGroups = useMemo(() => {
    // Divisional Secretary: only Stage 1, no certificates/upload tabs
    if (isDivisionalSec) {
      return majorStepGroups.filter((g) => g.id === 1);
    }
    const allowStageTwoStatuses = new Set([
      "S2_PENDING",
      "S2_PEND_APPROVAL",
      "COMPLETED",
      "REJECTED",
    ]);
    // Show Stage 2 only when status allows; otherwise Stage 1 only
    if (allowStageTwoStatuses.has(String(workflowStatus))) {
      return majorStepGroups;
    }
    return majorStepGroups.filter((g) => g.id === 1);
  }, [isDivisionalSec, majorStepGroups, workflowStatus]);

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
  const [bypassConfirm, setBypassConfirm] = useState<{
    field: keyof ViharaForm;
    label: string;
  } | null>(null);
  const [unlockConfirm, setUnlockConfirm] = useState(false);
  // Stage F bypass mutual exclusivity + tab locking
  const BYPASS_FIELDS_CONFIG = [
    { field: "vh_bypass_no_detail" as keyof ViharaForm, fromTabId: 3 },
    { field: "vh_bypass_no_chief" as keyof ViharaForm, fromTabId: 4 },
    { field: "vh_bypass_ltr_cert" as keyof ViharaForm, fromTabId: 5 },
  ];
  /** Maps bypass boolean field → dedicated CRUDAction that triggers status transition */
  const BYPASS_ACTION_MAP: Record<string, string> = {
    vh_bypass_no_detail: "BYPASS_NO_DETAIL",
    vh_bypass_no_chief:  "BYPASS_NO_CHIEF",
    vh_bypass_ltr_cert:  "BYPASS_LTR_CERT",
  };
  const BYPASS_STATUSES = new Set(["S1_NO_DETAIL_COMP", "S1_NO_CHIEF_COMP", "S1_LTR_CERT_DONE"]);
  const activeBypassEntry = BYPASS_FIELDS_CONFIG.find((b) => (values[b.field] as boolean) === true) ?? null;
  const lockedFromTabId: number | null = activeBypassEntry?.fromTabId ?? null;
  const isTabLocked = (tabId: number): boolean => {
    if (lockedFromTabId === null) return false;
    if (canModerate) return false; // admins can always navigate
    // Lock only SUBSEQUENT tabs — the tab that owns the active bypass toggle stays accessible
    return tabId > lockedFromTabId;
  };
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
  const [activePrintAreaId, setActivePrintAreaId] = useState<CertificateTypeId | null>(null);
  const [nikayaLetterInfo, setNikayaLetterInfo] = useState({
    br_mahananame: "",
    nk_nname: "",
    br_fathrsaddrs: "",
  });
  
  // Religious Affiliation state (Nikaya & Parshawa)
  const [nikayaData, setNikayaData] = useState<NikayaAPIItem[]>(STATIC_NIKAYA_DATA);
  const [nikayaLoading, setNikayaLoading] = useState(false);
  const [nikayaError, setNikayaError] = useState<string | null>(null);
  const [display, setDisplay] = useState<Record<string, string>>({
    nikaya: "",
    parshawaya: "",
  });
  
  const letterEditorRef = useRef<HTMLDivElement | null>(null);
  const [letterHtml, setLetterHtml] = useState<string>("");
  const [letterDirty, setLetterDirty] = useState(false);
  const letterEditorInitialized = useRef(false);
  const letterHtmlRef = useRef<string>("");
  const letterDirtyRef = useRef(false);
  
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const locationNames = useMemo(() => {
    const province = STATIC_PROVINCES.find((p) => p.cp_code === values.province);
    const district = province?.districts.find((d) => d.dd_dcode === values.district);
    const division = district?.divisional_secretariats?.find(
      (dv) => dv.dv_dvcode === values.divisional_secretariat
    );
    const gnDivision = division?.gn_divisions?.find(
      (gn) => gn.gn_gnc === values.grama_niladhari_division
    );

    return {
      province: province?.cp_name ?? values.province ?? "",
      district: district?.dd_dname ?? values.district ?? "",
      divisional_secretariat: division?.dv_dvname ?? values.divisional_secretariat ?? "",
      grama_niladhari_division: gnDivision?.gn_gnname ?? values.grama_niladhari_division ?? "",
    };
  }, [values.divisional_secretariat, values.district, values.grama_niladhari_division, values.province]);
  const letterData: ViharadhipathiAppointmentLetterData = useMemo(
    () => ({
      reference_number: values.mahanayake_letter_nu ?? "",
      letter_date: values.mahanayake_date ?? today,
      appointed_monk_name: values.viharadhipathi_name ?? "",
      appointed_monk_title: "",
      viharasthana_full_name: values.temple_name ?? "",
      viharasthana_location: values.temple_address ?? "",
      viharasthana_area: "",
      district: locationNames.district,
      divisional_secretariat: locationNames.divisional_secretariat,
      grama_niladari: locationNames.grama_niladhari_division,
      mahanayaka_lt_no: values.mahanayake_letter_nu ?? "",
      mahanayaka_lt_date: values.mahanayake_date ?? "",
      secretary_name: "",
      phone: "",
      fax: "",
      email: values.email_address ?? "",
      remarks: values.mahanayake_remarks ?? "",
      mahanayaka_name: "",
      nikaya_full_name: values.nikaya ?? "",
      temple_name: values.temple_name ?? "",
      temple_location_1: values.temple_address ?? "",
      temple_location_2: "",
      divisional_secretariat_office: locationNames.divisional_secretariat,
      br_mahananame: nikayaLetterInfo.br_mahananame,
      nk_nname: nikayaLetterInfo.nk_nname,
      br_fathrsaddrs: nikayaLetterInfo.br_fathrsaddrs,
    }),
    [
      locationNames.divisional_secretariat,
      locationNames.district,
      locationNames.grama_niladhari_division,
      nikayaLetterInfo,
      today,
      values,
    ]
  );

  const escapeHtml = useCallback((value?: string) => {
    const input = String(value ?? "");
    return input
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }, []);

  const buildLetterHtml = useCallback(
    (data: ViharadhipathiAppointmentLetterData) => {
      const v = (value?: string) => escapeHtml(value ?? "");
      return `
        <div class="letter-header">
          <div class="reference-number">
            <span data-field="reference_number">${v(data.reference_number)}</span>
          </div>
          <div class="date">
            දිනය: <span data-field="letter_date">${v(data.letter_date)}</span>
          </div>
        </div>

        <div class="letter-recipient">
          <div class="recipient-title">
            විහාරාධිපති <span data-field="appointed_monk_name">${v(data.appointed_monk_name)}</span> ස්වාමීන් වහන්සේ,
          </div>
          <div><span data-field="viharasthana_full_name">${v(data.viharasthana_full_name)}</span>,</div>
          <div><span data-field="viharasthana_location">${v(data.viharasthana_location)}</span>,</div>
          <div><span data-field="district">${v(data.district)}</span>.</div>
        </div>

        <div class="letter-section">
          ගරු වහන්සේ,
        </div>

        <div class="letter-section">
          <strong><u>විහාරාධිපති තනතුර පත් කිරීම පිළිබඳ දැනුම්දීම</u></strong>
        </div>

        <div class="letter-body">
          <strong>${v(data.district)}</strong> දිස්ත්‍රික්කයේ,
          <strong>${v(data.divisional_secretariat)}</strong> ප්‍රාදේශීය ලේකම් කොට්ඨාසයේ,
          <strong>${v(data.grama_niladari)}</strong> ග්‍රාම නිලධාරී වසමේ,
          <strong>${v(data.viharasthana_location)}</strong>, <strong>${v(data.viharasthana_area)}</strong>
          <strong>${v(data.viharasthana_full_name)}</strong> විහාරස්ථානයේ විහාරාධිපති තනතුරට,
          අතිපුජ්‍ය මහ නායක හිමියන් විසින් යොමු කර ඇති,
          අංක <strong>${v(data.mahanayaka_lt_no)}</strong>,
          <strong>${v(data.mahanayaka_lt_date)}</strong> දිනැති ලිපිය පිළිගැන,
          <strong>${v(data.appointed_monk_title)}</strong>
          <strong>${v(data.appointed_monk_name)}</strong> ස්වාමීන් වහන්සේ පත් කළ බව දැනුම් දෙමි.
        </div>

        <div class="letter-section">
          මෙයට - සසුනට වැඩී,
          <br /><br />
          ................................. 
          <div class="signature-title">ආර්.ඒම්.ජේ.සෙනෙවිරත්න</div>
          <div class="signature-title">බෞද්ධ කටයුතු කොමසාරිස් ජනරාල්,</div>
          <div class="letter-section">
            දුරකථනය : 0113159682<br />
            ෆැක්ස් : 0112337335<br />
            විද්‍යුත් තැපෑල : dbavihara@gmail.com
          </div>
        </div>

        <div class="letter-section">
          විශේෂ කරුණු: <strong>${v(data.remarks)}</strong>
        </div>

        <div class="letter-copyto">
          <div class="copy-to-header">පිටපත් :</div>
          <ul class="copy-to-list">
            <li>
              1. <span data-field="appointed_monk_title">${v(data.appointed_monk_title)}</span>
              <span data-field="br_mahananame">${v(data.br_mahananame)}</span> මහනායක ස්වාමීන් වහන්සේගේ - ගරු වරනීය දැන ගැනීම සඳහා
              <span data-field="nk_nname">${v(data.nk_nname)}</span>
              <br />
              &nbsp;&nbsp;&nbsp;&nbsp;<span data-field="br_fathrsaddrs">${v(data.br_fathrsaddrs)}</span>
            </li>
            <li>
              2. ප්‍රාදේශීය ලේකම්, - කාරුණික දැන ගැනීමට හා අවශ්‍ය කටයුතු සඳහා
              <br />
              &nbsp;&nbsp;&nbsp;&nbsp;ලේකම් කාර්යාලය, <span data-field="divisional_secretariat_office">${v(data.divisional_secretariat_office)}</span>
            </li>
          </ul>
        </div>
      `;
    },
    [escapeHtml]
  );

  const defaultLetterHtml = useMemo(() => buildLetterHtml(letterData), [buildLetterHtml, letterData]);

  useEffect(() => {
    if (!letterDirtyRef.current) {
      setLetterHtml(defaultLetterHtml);
      letterHtmlRef.current = defaultLetterHtml;
    }
  }, [defaultLetterHtml, letterDirty]);

  useEffect(() => {
    if (!letterEditorRef.current) return;
    const nextHtml = letterHtml || defaultLetterHtml;
    const isFocused = document.activeElement === letterEditorRef.current;
    if (!letterEditorInitialized.current) {
      letterEditorRef.current.innerHTML = nextHtml;
      letterHtmlRef.current = nextHtml;
      letterEditorInitialized.current = true;
      return;
    }
    if (isFocused) return;
    if (letterEditorRef.current.innerHTML !== nextHtml) {
      letterEditorRef.current.innerHTML = nextHtml;
    }
  }, [letterHtml, defaultLetterHtml]);
  const current = steps.find((s) => s.id === activeTabId) ?? steps[0];
  const stepTitle = current?.title ?? "";
  const isCertificatesTab = stepTitle === "Letter";
  const isScannedFilesTab = stepTitle === "Upload Scanned Files";

  const stageApproved =
    (activeMajorStep === 1 && workflowStatus === "S1_APPROVED") ||
    (activeMajorStep === 2 && workflowStatus === "S2_APPROVED");
  const stagePendingApproval =
    (activeMajorStep === 1 && workflowStatus === "S1_PEND_APPROVAL") ||
    (activeMajorStep === 2 && workflowStatus === "S2_PEND_APPROVAL");
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

    const formFields = {
      // Step A: Basic Information
      temple_name: apiData.vh_vname ?? "",
      temple_address: apiData.vh_addrs ?? "",
      telephone_number: apiData.vh_mobile ?? "",
      whatsapp_number: apiData.vh_whtapp ?? "",
      email_address: apiData.vh_email ?? "",
      vh_file_number: apiData.vh_file_number ?? "",
      vh_vihara_code: apiData.vh_vihara_code ?? "",
      
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
        viharadhipathi_date: toDisplayFormat(apiData.viharadhipathi_date) ?? "",
        period_established: toDisplayFormat(apiData.vh_period_established) ?? "",

        // Stage F: bypass flags
        vh_bypass_no_detail: apiData.vh_bypass_no_detail ?? false,
        vh_bypass_no_chief:  apiData.vh_bypass_no_chief  ?? false,
        vh_bypass_ltr_cert:  apiData.vh_bypass_ltr_cert  ?? false,

        // Stage F: establishment period
        vh_period_era:   apiData.vh_period_era   ?? "",
        vh_period_year:  apiData.vh_period_year  ?? "",
        vh_period_month: apiData.vh_period_month ?? "",
        vh_period_day:   apiData.vh_period_day   ?? "",
        vh_period_notes: apiData.vh_period_notes ?? "",

        // Step E: Mahanyake Information
        mahanayake_date: toDisplayFormat(apiData.vh_mahanayake_date) ?? "",
        mahanayake_letter_nu: apiData.vh_mahanayake_letter_nu ?? "",
        mahanayake_remarks: apiData.vh_mahanayake_remarks ?? "",
        
        // Step F: Assets & Activities
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
    
    // AUTO-DETECT PROVINCE FROM DISTRICT if province is missing
    // This fixes the issue where district is saved but province is not
    if ((!formFields.province || formFields.province === "") && formFields.district) {
      // Find which province this district belongs to
      const districtCode = formFields.district;
      const provinces = (selectionsData as any)?.provinces || [];
      if (Array.isArray(provinces)) {
        for (const province of provinces) {
          const districtMatch = province.districts?.find(
            (d: any) => d.code === districtCode || d.dd_dcode === districtCode
          );
          if (districtMatch) {
            formFields.province = province.cp_code || province.code;
            console.log(`🔍 DEBUG: Auto-detected province "${formFields.province}" from district code "${districtCode}"`);
            break;
          }
        }
      }
    }
    
    console.log("🔍 DEBUG: Mapped form fields for admin divisions:", {
      province: formFields.province,
      district: formFields.district,
      divisional_secretariat: formFields.divisional_secretariat,
      grama_niladhari_division: formFields.grama_niladhari_division,
    });
    
    return formFields;
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
        
        // Map API fields to form fields
        const formData = mapApiToFormFields(apiData);
        const filledValues = {
          ...viharaInitialValues,
          ...formData,
        };
        setValues(filledValues);

        const mainBhikkuInfo = apiData?.nikaya_info?.main_bhikku_info;
        setNikayaLetterInfo({
          br_mahananame: mainBhikkuInfo?.br_mahananame ?? "",
          nk_nname: apiData?.nikaya_info?.nk_nname ?? "",
          br_fathrsaddrs: mainBhikkuInfo?.br_fathrsaddrs ?? "",
        });
        
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
        const generalScanRaw =
          apiData?.vh_scanned_document_path ||
          apiData?.vh_scanned_document ||
          apiData?.scanned_document_path ||
          apiData?.scanned_document;
        const stageOneRaw =
          apiData?.vh_stage1_document_path ||
          apiData?.vh_stage1_document ||
          apiData?.vh_stage1_scanned_document_path ||
          apiData?.vh_stage_one_scanned_document_path ||
          apiData?.stage1_scanned_document_path ||
          apiData?.stage1_document_path ||
          apiData?.stage1_document ||
          apiData?.stage_one_document_path ||
          apiData?.stage_one_scanned_document_path ||
          generalScanRaw;
        const stageTwoRaw =
          apiData?.vh_stage2_document_path ||
          apiData?.vh_stage2_document ||
          apiData?.vh_stage2_scanned_document_path ||
          apiData?.vh_stage_two_scanned_document_path ||
          apiData?.stage2_scanned_document_path ||
          apiData?.stage2_document_path ||
          apiData?.stage2_document ||
          apiData?.stage_two_document_path ||
          apiData?.stage_two_scanned_document_path ||
          generalScanRaw;
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

  // Auto-lookup bhikkhu name from registration number if name is missing
  useEffect(() => {
    const lookupBhikkhuName = async () => {
      // If we have regn but no name, lookup the bhikkhu
      if (values.viharadhipathi_regn && !values.viharadhipathi_name) {
        try {
          const response = await _manageBhikku({
            action: "READ_ALL",
            payload: { skip: 0, limit: 1, search: values.viharadhipathi_regn },
          });
          const bhikkhus = (response as any)?.data?.data ?? [];
          if (bhikkhus.length > 0) {
            const bhikkhu = bhikkhus[0];
            const bhikkhuName = bhikkhu.br_mahananame || bhikkhu.br_gihiname || "";
            if (bhikkhuName) {
              handleSetMany({
                viharadhipathi_name: bhikkhuName,
              });
            }
          }
        } catch (e) {
          console.warn("Could not lookup bhikkhu name:", e);
        }
      }
    };

    lookupBhikkhuName();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.viharadhipathi_regn, values.viharadhipathi_name]);

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

  // Helper function to find nikaya by code
  const findNikayaByCode = useCallback((code?: string | null) => {
    if (!code) return undefined;
    return nikayaData.find((n) => n.nikaya.code === code);
  }, [nikayaData]);

  // Helper function to get parshawa options based on selected nikaya
  const parshawaOptions = useCallback((nikayaCode?: string) => {
    if (!nikayaCode) return [];
    const nikayaItem = findNikayaByCode(nikayaCode);
    return nikayaItem?.parshawayas || [];
  }, [findNikayaByCode]);

  // Handler for picking nikaya
  const onPickNikaya = useCallback((nikayaCode: string) => {
    handleInputChange("nikaya", nikayaCode);
    const item = findNikayaByCode(nikayaCode);
    setDisplay((d) => ({ ...d, nikaya: item ? `${item.nikaya.name} — ${item.nikaya.code}` : nikayaCode }));
  }, [findNikayaByCode]);

  // Handler for picking parshawaya
  const onPickParshawa = useCallback((parshawaCode: string) => {
    handleInputChange("parshawaya", parshawaCode);
    const nikaya = findNikayaByCode(values.nikaya);
    const p = nikaya?.parshawayas.find((x) => x.code === parshawaCode);
    setDisplay((d) => ({ ...d, parshawaya: p ? `${p.name} - ${p.code}` : parshawaCode }));
  }, [findNikayaByCode, values.nikaya]);

  // Update display text when form values change (e.g., on load)
  useEffect(() => {
    const nikayaItem = findNikayaByCode(values.nikaya);
    if (nikayaItem) {
      setDisplay((d) => ({
        ...d,
        nikaya: `${nikayaItem.nikaya.name} — ${nikayaItem.nikaya.code}`,
      }));
    }

    const nikaya = findNikayaByCode(values.nikaya);
    if (nikaya && values.parshawaya) {
      const p = nikaya.parshawayas.find((x) => x.code === values.parshawaya);
      if (p) {
        setDisplay((d) => ({
          ...d,
          parshawaya: `${p.name} - ${p.code}`,
        }));
      }
    }
  }, [values.nikaya, values.parshawaya, findNikayaByCode]);

  // Helper function to ensure viharadhipathi is added to resident bhikkhus before submission
  const ensureViharadhipathiInResidentBhikkhus = (bhikkhus: any[]): any[] => {
    if (!values.viharadhipathi_name || !values.viharadhipathi_regn) {
      return bhikkhus;
    }

    // Check if viharadhipathi already exists
    const existingIndex = bhikkhus.findIndex(
      (b: any) => (b.registrationNumber || b.registration_number) === values.viharadhipathi_regn
    );

    // If exists, remove it first
    if (existingIndex >= 0) {
      bhikkhus.splice(existingIndex, 1);
    }

    // Add viharadhipathi as first entry
    const viharadhipathiEntry = {
      id: `bhikkhu-viharadhipathi-${Date.now()}`,
      serialNumber: 1,
      bhikkhuName: values.viharadhipathi_name,
      registrationNumber: values.viharadhipathi_regn,
      occupationEducation: "Chief Incumbent (Viharadhipathi)",
    };

    // Insert at beginning and update serial numbers
    return [viharadhipathiEntry, ...bhikkhus].map((b, idx) => ({
      ...b,
      serialNumber: idx + 1,
    }));
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
        let parsedBhikkhus = values.resident_bhikkhus 
          ? (typeof values.resident_bhikkhus === 'string' ? JSON.parse(values.resident_bhikkhus) : values.resident_bhikkhus)
          : [];
        
        // Ensure viharadhipathi is in resident bhikkhus as first entry
        parsedBhikkhus = ensureViharadhipathiInResidentBhikkhus(parsedBhikkhus);
        
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
        vh_file_number: "vh_file_number",
        vh_vihara_code: "vh_vihara_code",
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
        mahanayake_date: "vh_mahanayake_date",
        mahanayake_letter_nu: "vh_mahanayake_letter_nu",
        mahanayake_remarks: "vh_mahanayake_remarks",
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
      // Convert dates to ISO format (YYYY-MM-DD) for API
      payload[apiFieldName] = typeof v === "boolean" ? v : (f.type === "date" ? toISOFormat(String(v)) : v);
    });
    
    // IMPORTANT: For Step 2 (Administrative Divisions), ensure province is included with district
    // If user provided district but forgot province, auto-detect it from district code
    if (tabId === 2 && (payload.vh_district || payload.vh_divisional_secretariat || payload.vh_gndiv)) {
      if (!payload.vh_province && payload.vh_district) {
        // Auto-detect province from district code
        const districtCode = payload.vh_district;
        const provinces = (selectionsData as any)?.provinces || [];
        if (Array.isArray(provinces)) {
          for (const province of provinces) {
            const districtMatch = province.districts?.find(
              (d: any) => d.code === districtCode || d.dd_dcode === districtCode
            );
            if (districtMatch) {
              payload.vh_province = province.cp_code || province.code;
              break;
            }
          }
        }
      }
    }
    
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
      
      const updateResponse = await _manageVihara({
        action: "UPDATE",
        payload: {
          ...(vhId ? { vh_id: vhId } : {}),
          ...(vhTrn ? { vh_trn: vhTrn } : {}),
          data: partial,
        },
      } as any);
      
      // After successful UPDATE, reload the vihara data to confirm the save
      // This ensures the form always displays what's actually in the database
      const updatedData = (updateResponse as any)?.data?.data || (updateResponse as any)?.data;
      if (updatedData) {
        const formData = mapApiToFormFields(updatedData);
        const filledValues = {
          ...viharaInitialValues,
          ...formData,
        };
        setValues(filledValues);
      }
      
      toast.success(`Saved "${stepTitle}"`, { autoClose: 1200 });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to save. Please try again.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleBypassSave = async () => {
    if (!bypassConfirm) return;
    const field = bypassConfirm.field as string;
    setBypassConfirm(null);
    try {
      setSaving(true);
      const vhId = viharaId && !isNaN(Number(viharaId)) ? Number(viharaId) : undefined;
      const bypassAction = BYPASS_ACTION_MAP[field];
      if (!bypassAction || !vhId) {
        toast.error("Cannot save bypass: missing record ID or unknown bypass type.");
        return;
      }
      await _manageVihara({
        action: bypassAction,
        payload: { vh_id: vhId },
      } as any);
      setValues((prev) => ({ ...prev, [field]: true }));
      toast.success("Saved.", { autoClose: 800 });
      setTimeout(() => router.push("/temple/vihara"), 950);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to save.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleUnlockBypass = async () => {
    setUnlockConfirm(false);
    try {
      setSaving(true);
      const vhId = viharaId && !isNaN(Number(viharaId)) ? Number(viharaId) : undefined;
      if (!vhId) { toast.error("Cannot unlock: missing record ID."); return; }
      await _manageVihara({
        action: "UNLOCK_BYPASS",
        payload: { vh_id: vhId },
      } as any);
      // Reset bypass flags locally and update status
      setValues((prev) => ({
        ...prev,
        vh_bypass_no_detail: false,
        vh_bypass_no_chief:  false,
        vh_bypass_ltr_cert:  false,
      }));
      setWorkflowStatus("S1_PENDING");
      toast.success("Record unlocked. Status reset to pending.", { autoClose: 1500 });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to unlock record.";
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
      vh_bypass_no_detail: formData.vh_bypass_no_detail,
      
      // Step D: Leadership - Convert dates to ISO format
      vh_viharadhipathi_name: formData.viharadhipathi_name,
      vh_viharadhipathi_regn: formData.viharadhipathi_regn,
      viharadhipathi_date: toISOFormat(formData.viharadhipathi_date) || null,
      vh_period_established: toISOFormat(formData.period_established) || null,
      vh_period_era: formData.vh_period_era,
      vh_period_year: formData.vh_period_year,
      vh_period_month: formData.vh_period_month,
      vh_period_day: formData.vh_period_day,
      vh_period_notes: formData.vh_period_notes,
      vh_bypass_no_chief: formData.vh_bypass_no_chief,
      vh_mahanayake_date: toISOFormat(formData.mahanayake_date) || null,
      vh_mahanayake_letter_nu: formData.mahanayake_letter_nu,
      vh_mahanayake_remarks: formData.mahanayake_remarks,
      vh_bypass_ltr_cert: formData.vh_bypass_ltr_cert,
      
      // Step F: Temple Assets & Activities
      vh_buildings_description: formData.buildings_description,
      vh_dayaka_families_count: formData.dayaka_families_count,
      vh_kulangana_committee: formData.kulangana_committee,
      vh_dayaka_sabha: formData.dayaka_sabha,
      vh_temple_working_committee: formData.temple_working_committee,
      vh_other_associations: formData.other_associations,
      
      // Step G: Land Information
      temple_owned_land: mappedLand,
      vh_land_info_certified: formData.land_info_certified,
      
      // Step H: Resident Bhikkhus
      resident_bhikkhus: mappedBhikkhus,
      vh_resident_bhikkhus_certified: formData.resident_bhikkhus_certified,
      
      // Step I: Inspection
      vh_inspection_report: formData.inspection_report,
      vh_inspection_code: formData.inspection_code,
      
      // Step J: Ownership
      vh_grama_niladhari_division_ownership: formData.grama_niladhari_division_ownership,
      vh_sanghika_donation_deed: formData.sanghika_donation_deed,
      vh_government_donation_deed: formData.government_donation_deed,
      vh_government_donation_deed_in_progress: formData.government_donation_deed_in_progress,
      vh_authority_consent_attached: formData.authority_consent_attached,
      vh_recommend_new_center: formData.recommend_new_center,
      vh_recommend_registered_temple: formData.recommend_registered_temple,
      
      // Step K: Annex II
      vh_annex2_recommend_construction: formData.annex2_recommend_construction,
      vh_annex2_land_ownership_docs: formData.annex2_land_ownership_docs,
      vh_annex2_chief_incumbent_letter: formData.annex2_chief_incumbent_letter,
      vh_annex2_coordinator_recommendation: formData.annex2_coordinator_recommendation,
      vh_annex2_divisional_secretary_recommendation: formData.annex2_divisional_secretary_recommendation,
      vh_annex2_approval_construction: formData.annex2_approval_construction,
      vh_annex2_referral_resubmission: formData.annex2_referral_resubmission,
    };
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

  const gridCols = current?.id === 7 ? "md:grid-cols-3" : "md:grid-cols-2";
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
    .letter-toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .letter-editor {
      min-height: 9in;
      outline: none;
      font-family: "Noto Sans Sinhala", "Noto Sans Tamil", Arial, sans-serif;
      line-height: 1.6;
      color: #0f172a;
    }
    .letter-editor[contenteditable="true"]:focus {
      outline: 2px solid #94a3b8;
      outline-offset: 4px;
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
      .letter-toolbar {
        display: none !important;
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
      regional_committee_divisional_secretariat:
        locationNames.divisional_secretariat || values.pradeshya_sabha || "",
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
  }, [certificateNumberLabel, display.nikaya, display.parshawaya, locationNames.divisional_secretariat, values.parshawaya, values.period_established, values.pradeshya_sabha, values.temple_address, values.temple_name, values.viharadhipathi_name, values.nikaya]);

  const handlePrintCertificate = () => {
    if (letterEditorRef.current) {
      const html = letterEditorRef.current.innerHTML || "";
      letterHtmlRef.current = html;
      setLetterHtml(html);
      setLetterDirty(true);
      letterDirtyRef.current = true;
    }
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

  const applyLetterCommand = (command: string, value?: string) => {
    if (!letterEditorRef.current) return;
    letterEditorRef.current.focus();
    try {
      document.execCommand(command, false, value);
    } catch {
      // ignore unsupported commands
    }
    const html = letterEditorRef.current.innerHTML || "";
    setLetterHtml(html);
    setLetterDirty(true);
    letterHtmlRef.current = html;
    letterDirtyRef.current = true;
  };

  const normalizeFontSizes = () => {
    if (!letterEditorRef.current) return;
    const sizeMap: Record<string, string> = {
      "1": "10px",
      "2": "12px",
      "3": "14px",
      "4": "16px",
      "5": "18px",
      "6": "24px",
      "7": "32px",
    };
    const nodes = letterEditorRef.current.querySelectorAll("font[size]");
    nodes.forEach((node) => {
      const sizeAttr = node.getAttribute("size") || "3";
      const span = document.createElement("span");
      span.style.fontSize = sizeMap[sizeAttr] || "14px";
      span.innerHTML = node.innerHTML;
      node.replaceWith(span);
    });
  };

  const applyLetterFontSize = (size: "3" | "4" | "5") => {
    if (!letterEditorRef.current) return;
    letterEditorRef.current.focus();
    try {
      document.execCommand("fontSize", false, size);
      normalizeFontSizes();
    } catch {
      // ignore unsupported commands
    }
    const html = letterEditorRef.current.innerHTML || "";
    setLetterHtml(html);
    setLetterDirty(true);
    letterHtmlRef.current = html;
    letterDirtyRef.current = true;
  };

  const handleLetterInput = () => {
    if (!letterEditorRef.current) return;
    letterHtmlRef.current = letterEditorRef.current.innerHTML || "";
    if (!letterDirtyRef.current) {
      letterDirtyRef.current = true;
      setLetterDirty(true);
    }
  };

  const handleLetterBlur = () => {
    if (!letterEditorRef.current) return;
    const html = letterEditorRef.current.innerHTML || "";
    letterHtmlRef.current = html;
    setLetterHtml(html);
    setLetterDirty(true);
    letterDirtyRef.current = true;
  };

  const handleResetLetter = () => {
    setLetterHtml(defaultLetterHtml);
    setLetterDirty(false);
    letterHtmlRef.current = defaultLetterHtml;
    letterDirtyRef.current = false;
    if (letterEditorRef.current) {
      letterEditorRef.current.innerHTML = defaultLetterHtml;
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
      const payload = (response as any)?.data ?? response;
      const nextStatus =
        payload?.workflow_status ||
        payload?.vh_workflow_status ||
        (stage === 1 ? "S1_PEND_APPROVAL" : "S2_PEND_APPROVAL");
      if (nextStatus) setWorkflowStatus(String(nextStatus));
      const pathFromResponse =
        (response as any)?.data?.vh_stage1_document_path ||
        (response as any)?.data?.vh_stage2_document_path ||
        (response as any)?.data?.vh_stage1_scanned_document_path ||
        (response as any)?.data?.vh_stage2_scanned_document_path ||
        (response as any)?.data?.stage_one_document_path ||
        (response as any)?.data?.stage_two_document_path ||
        (response as any)?.data?.stage1_document_path ||
        (response as any)?.data?.stage2_document_path ||
        (response as any)?.data?.stage1_scanned_document_path ||
        (response as any)?.data?.stage2_scanned_document_path ||
        (response as any)?.data?.vh_scanned_document_path ||
        (response as any)?.vh_stage1_document_path ||
        (response as any)?.vh_stage2_document_path ||
        (response as any)?.vh_stage1_scanned_document_path ||
        (response as any)?.vh_stage2_scanned_document_path ||
        (response as any)?.stage_one_document_path ||
        (response as any)?.stage_two_document_path ||
        (response as any)?.stage1_document_path ||
        (response as any)?.stage2_document_path ||
        (response as any)?.stage1_scanned_document_path ||
        (response as any)?.stage2_scanned_document_path ||
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
    if (letterEditorRef.current) {
      const html = letterEditorRef.current.innerHTML || "";
      letterHtmlRef.current = html;
      setLetterHtml(html);
      if (!letterDirtyRef.current) {
        setLetterDirty(true);
        letterDirtyRef.current = true;
      }
    }
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
    try {
      setApproving(true);
      if (!viharaId) throw new Error("Missing vihara id");
      const stage = activeMajorStep === 1 ? 1 : 2;
      await _approveStage(Number(viharaId), stage);
      toast.success(stage === 1 ? "Stage 1 approved." : "Stage 2 approved.", { autoClose: 1200 });
      router.push("/temple/vihara");
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
      router.push("/temple/vihara");
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
                    <h1 className="text-xl font-bold text-white mb-1">
                      Update Registration
                    </h1>
                    <p className="text-slate-300 text-sm">Editing: {viharaId}</p>
                  </div>
                  {canModerate && !stageApproved && stagePendingApproval && (
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleOpenApproveDialog}
                      disabled={loading || saving || approving}
                      className={`px-4 py-2 rounded-lg font-medium transition-all
                        ${
                          loading || saving || approving
                            ? "bg-green-700/60 text-white cursor-not-allowed"
                            : "bg-green-600 text-white hover:bg-green-700"
                        }`}
                      aria-label={activeMajorStep === 1 ? "Approve Stage 1" : "Approve Stage 2"}
                      title={activeMajorStep === 1 ? "Approve Stage 1" : "Approve Stage 2"}
                    >
                      {approving
                        ? activeMajorStep === 1
                          ? "Approving Stage 1…"
                          : "Approving Stage 2…"
                        : activeMajorStep === 1
                        ? "Approve Stage 1"
                        : "Approve Stage 2"}
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
                      aria-label={activeMajorStep === 1 ? "Reject Stage 1" : "Reject Stage 2"}
                      title={activeMajorStep === 1 ? "Reject Stage 1" : "Reject Stage 2"}
                    >
                      {rejecting
                        ? activeMajorStep === 1
                          ? "Rejecting Stage 1…"
                          : "Rejecting Stage 2…"
                        : activeMajorStep === 1
                        ? "Reject Stage 1"
                        : "Reject Stage 2"}
                    </button>
                  </div>
                  )}
                </div>
              </div>

              <div className="px-4 md:px-10 py-6" ref={sectionRef}>
                {majorStepGroups.length > 1 && (
                  <div className="flex flex-wrap gap-3 mb-4">
                    {majorStepGroups.map((group, idx) => {
                      const isActive = group.id === activeMajorStep;
                      const isVisible = visibleMajorStepGroups.some((g) => g.id === group.id);
                      const firstTabId = group.tabs[0]?.id;
                      return (
                        <button
                          key={group.id}
                          onClick={() => {
                            if (!isVisible) return;
                            setActiveMajorStep(group.id);
                            if (firstTabId) {
                              setActiveTabId(firstTabId);
                            }
                            scrollTop();
                          }}
                          disabled={!isVisible}
                          className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                            isActive
                              ? "bg-slate-800 text-white border-slate-800 shadow-sm"
                              : isVisible
                              ? "bg-white text-slate-700 border-slate-200 hover:border-slate-400"
                              : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
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
                    disabled: isTabLocked(s.id),
                  }))}
                  value={String(activeTabId)}
                  onChange={(id) => {
                    if (isTabLocked(Number(id))) return;
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
                          <h2 className="text-lg font-bold text-slate-800 mb-3">
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
                                          <p className="text-xl font-semibold text-slate-900">
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
                                      <div className="space-y-4">
                                        <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow">
                                          <div className="letter-toolbar">
                                            <button
                                              type="button"
                                              className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                              onClick={() => applyLetterFontSize("3")}
                                            >
                                              A-
                                            </button>
                                            <button
                                              type="button"
                                              className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                              onClick={() => applyLetterFontSize("4")}
                                            >
                                              A
                                            </button>
                                            <button
                                              type="button"
                                              className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                              onClick={() => applyLetterFontSize("5")}
                                            >
                                              A+
                                            </button>
                                            <button
                                              type="button"
                                              className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                              onClick={() => applyLetterCommand("bold")}
                                            >
                                              Bold
                                            </button>
                                            <button
                                              type="button"
                                              className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                              onClick={() => applyLetterCommand("italic")}
                                            >
                                              Italic
                                            </button>
                                            <button
                                              type="button"
                                              className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                              onClick={() => applyLetterCommand("underline")}
                                            >
                                              Underline
                                            </button>
                                            <button
                                              type="button"
                                              className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                              onClick={() => applyLetterCommand("insertHTML", "<br />")}
                                            >
                                              New Line
                                            </button>
                                            <button
                                              type="button"
                                              className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                              onClick={() => applyLetterCommand("justifyLeft")}
                                            >
                                              Align Left
                                            </button>
                                            <button
                                              type="button"
                                              className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                              onClick={() => applyLetterCommand("justifyCenter")}
                                            >
                                              Center
                                            </button>
                                            <button
                                              type="button"
                                              className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                              onClick={() => applyLetterCommand("justifyRight")}
                                            >
                                              Align Right
                                            </button>
                                            <button
                                              type="button"
                                              className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                              onClick={() => applyLetterCommand("removeFormat")}
                                            >
                                              Clear Format
                                            </button>
                                            <button
                                              type="button"
                                              className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                              onClick={handleResetLetter}
                                            >
                                              Reset Template
                                            </button>
                                          </div>
                                          <p className="mt-2 text-xs text-slate-500">
                                            Click inside the letter and edit text. Formatting will be printed with the QR code.
                                          </p>
                                        </div>

                                        <div className="flex justify-center">
                                          <section
                                            id={printAreaId}
                                            data-printing={isActivePrint ? "true" : undefined}
                                            ref={certificatePaperRef}
                                            className="certificate-page relative"
                                          >
                                            <div className="letter-page">
                                              <div
                                                ref={letterEditorRef}
                                                className="letter-editor"
                                                contentEditable
                                                suppressContentEditableWarning
                                                onInput={handleLetterInput}
                                                onBlur={handleLetterInput}
                                                dangerouslySetInnerHTML={{ __html: letterHtml || defaultLetterHtml }}
                                              />
                                            </div>
                                            <div className="letter-qr">
                                              <div className="rounded-lg border border-slate-200 bg-white p-2">
                                                <QRCode value={certificateQrValue} size={80} className="h-20 w-20" />
                                              </div>
                                            </div>
                                          </section>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}

                              </div>
                          ) : isScannedFilesTab ? (
                            <div className="space-y-6">
                              <style>{certificateTemplateStyles}</style>
                              <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow">
                                  {activeMajorStep === 1 ? (
                                    existingScanUrlStageOne ? (
                                      <div className="flex justify-center">
                                        <section className="certificate-page relative">
                                          <div className="letter-page">
                                            <div
                                              className="letter-editor"
                                              dangerouslySetInnerHTML={{ __html: letterHtml }}
                                            />
                                          </div>
                                          <div className="letter-qr">
                                            <div className="rounded-lg border border-slate-200 bg-white p-2">
                                              <QRCode value={certificateQrValue} size={80} className="h-20 w-20" />
                                            </div>
                                          </div>
                                        </section>
                                      </div>
                                    ) : null
                                  ) : (
                                    renderExistingScan(existingScanUrlStageTwo)
                                  )}
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
                            <div className={`grid grid-cols-1 ${gridCols} gap-3`}>
                              {current?.id === 8 && (
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
                              <span className="text-xs font-medium text-slate-700">I certify that the above information is true and correct.</span>
                            </label>
                            {errors.land_info_certified && <p className="mt-1 text-xs text-red-600">{errors.land_info_certified}</p>}
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

                            {current?.id === 9 && (
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
                              <span className="text-xs font-medium text-slate-700">I certify that the above information is true and correct.</span>
                            </label>
                            {errors.resident_bhikkhus_certified && <p className="mt-1 text-xs text-red-600">{errors.resident_bhikkhus_certified}</p>}
                          </div>
                              </div>
                            )}

                            {/* Step J: Annex II - Special rendering with sub-headers */}
                            {current?.id === 12 && (
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
                                      <span className="text-xs font-medium text-slate-700">{f.label}</span>
                                    </label>
                                    {err ? <p className="mt-1 text-xs text-red-600">{err}</p> : null}
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
                                      <span className="text-xs font-medium text-slate-700">{f.label}</span>
                                    </label>
                                    {err ? <p className="mt-1 text-xs text-red-600">{err}</p> : null}
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
                                      <span className="text-xs font-medium text-slate-700">{f.label}</span>
                                    </label>
                                    {err ? <p className="mt-1 text-xs text-red-600">{err}</p> : null}
                                  </div>
                                );
                              })}
                          </div>
                              </div>
                            )}

                            {current?.id !== 8 && current?.id !== 9 && current?.id !== 12 && current?.fields.map((f) => {
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
                                        provinceCode: values.province ? (values.province as string) : undefined,
                                        districtCode: values.district ? (values.district as string) : undefined,
                                        divisionCode: values.divisional_secretariat ? (values.divisional_secretariat as string) : undefined,
                                        gnCode: values.grama_niladhari_division ? (values.grama_niladhari_division as string) : undefined,
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
                                      <p className="mt-1 text-xs text-red-600">
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
                                    <SasanarakshakaAutocomplete
                                      id={id}
                                      label={f.label}
                                      placeholder="Type SSB name or code"
                                      initialDisplay={val}
                                      onPick={(picked) => {
                                        handleSetMany({
                                          pradeshya_sabha: picked.code ?? "",
                                        });
                                      }}
                                      onInputChange={() => {
                                        handleInputChange(f.name, "");
                                      }}
                                    />
                                    {err ? <p className="mt-1 text-xs text-red-600">{err}</p> : null}
                                  </div>
                                );
                              }

                              // Step C: Nikaya & Parshawa
                              if (id === "nikaya") {
                                return (
                                  <div key={id}>
                                    <label htmlFor={id} className="block text-xs font-medium text-slate-700 mb-1.5">{f.label}</label>
                                    {nikayaLoading ? (
                                      <div className="text-sm text-slate-600">Loading Nikaya…</div>
                                    ) : nikayaError ? (
                                      <div role="alert" className="text-xs text-red-600">Error: {nikayaError}</div>
                                    ) : (
                                      <select
                                        key={`nikaya-select-${values.nikaya}`}
                                        id={id}
                                        value={values.nikaya ?? ""}
                                        onChange={(e) => onPickNikaya(e.target.value)}
                                        required={!!f.rules?.required}
                                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                                      >
                                        <option value="">Select Nikaya</option>
                                        {nikayaData.map((n) => (
                                          <option key={n.nikaya.code} value={n.nikaya.code}>
                                            {n.nikaya.name} — {n.nikaya.code}
                                          </option>
                                        ))}
                                      </select>
                                    )}
                                    {err ? <p className="mt-1 text-xs text-red-600">{err}</p> : null}
                                  </div>
                                );
                              }

                              if (id === "parshawaya") {
                                const options = parshawaOptions(values.nikaya);
                                return (
                                  <div key={id}>
                                    <label htmlFor={id} className="block text-xs font-medium text-slate-700 mb-1.5">{f.label}</label>
                                    <select
                                      key={`parshawaya-select-${values.nikaya}-${values.parshawaya}`}
                                      id={id}
                                      value={values.parshawaya ?? ""}
                                      onChange={(e) => onPickParshawa(e.target.value)}
                                      required={!!f.rules?.required}
                                      disabled={!values.nikaya || options.length === 0}
                                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all disabled:bg-slate-100"
                                    >
                                      <option value="">{values.nikaya ? "Select Parshawaya" : "Select Nikaya first"}</option>
                                      {options.map((p) => (
                                        <option key={p.code} value={p.code}>
                                          {p.name} — {p.code}
                                        </option>
                                      ))}
                                    </select>
                                    {err ? <p className="mt-1 text-xs text-red-600">{err}</p> : null}
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
                                      placeholder="Search by name, REGN, temple, or address"
                                      showAddButton={true}
                                      onPick={(picked) => {
                                        const regnValue = picked.regn || String(picked.data?.br_regn ?? "");
                                        handleSetMany({
                                          viharadhipathi_name: picked.name ?? "",
                                          viharadhipathi_regn: regnValue,
                                        });
                                        
                                        // Auto-add viharadhipathi to resident bhikkhus as first entry
                                        try {
                                          const currentBhikkhus = JSON.parse(values.resident_bhikkhus || "[]");
                                          
                                          // Check if this bhikkhu already exists in the table
                                          const existingIndex = currentBhikkhus.findIndex(
                                            (b: any) => (b.registrationNumber || b.registration_number) === regnValue
                                          );
                                          
                                          // Remove existing entry if found
                                          if (existingIndex >= 0) {
                                            currentBhikkhus.splice(existingIndex, 1);
                                          }
                                          
                                          // Add as first entry
                                          const newEntry = {
                                            id: `bhikkhu-viharadhipathi-${Date.now()}`,
                                            serialNumber: 1,
                                            bhikkhuName: picked.name ?? "",
                                            registrationNumber: regnValue,
                                            occupationEducation: "Chief Incumbent (Viharadhipathi)",
                                          };
                                          
                                          // Insert at beginning and update serial numbers
                                          const updatedBhikkhus = [newEntry, ...currentBhikkhus].map((b, idx) => ({
                                            ...b,
                                            serialNumber: idx + 1,
                                          }));
                                          
                                          handleInputChange("resident_bhikkhus", JSON.stringify(updatedBhikkhus));
                                        } catch (e) {
                                          console.error("Error auto-adding viharadhipathi to resident bhikkhus:", e);
                                        }
                                      }}
                                    />
                                    {err ? <p className="mt-1 text-xs text-red-600">{err}</p> : null}
                                  </div>
                                );
                              }

                              // Bypass toggle fields (Stage F)
                              if (f.type === "checkbox") {
                                const BYPASS_FIELDS = ["vh_bypass_no_detail", "vh_bypass_no_chief", "vh_bypass_ltr_cert"];
                                if (BYPASS_FIELDS.includes(id)) {
                                  const checked = (values[f.name] as boolean) || false;
                                  const parts = f.label.split(" — ");
                                  const otherBypassIsOn = !!activeBypassEntry && activeBypassEntry.field !== id;
                                  const isLockedOn = checked && !canModerate;
                                  const toggleDisabled = otherBypassIsOn || isLockedOn;
                                  return (
                                    <div key={id} className="md:col-span-2">
                                      <div className={`flex items-center justify-between gap-4 p-4 rounded-xl border transition-colors ${checked ? "bg-amber-50 border-amber-300" : toggleDisabled ? "bg-slate-100 border-slate-200 opacity-60" : "bg-slate-50 border-slate-200"}`}>
                                        <div className="min-w-0">
                                          <p className="text-sm font-semibold text-slate-800">{parts[1] ?? parts[0]}</p>
                                          <p className="text-xs text-slate-500 mt-0.5">{parts[0]}</p>
                                          {isLockedOn && <p className="text-[10px] text-amber-600 mt-1 font-medium">Admin access required to disable</p>}
                                          {otherBypassIsOn && <p className="text-[10px] text-slate-400 mt-1">Another bypass is already active</p>}
                                        </div>
                                        <button
                                          type="button"
                                          role="switch"
                                          aria-checked={checked}
                                          disabled={toggleDisabled}
                                          title={otherBypassIsOn ? "Another bypass is active for this record" : isLockedOn ? "Only administrators can disable this" : undefined}
                                          onClick={() => {
                                            if (toggleDisabled) return;
                                            if (!checked) {
                                              setBypassConfirm({ field: f.name as keyof ViharaForm, label: f.label });
                                            } else {
                                              handleInputChange(f.name, false);
                                            }
                                          }}
                                          className={`relative shrink-0 inline-flex h-6 w-11 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${toggleDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} ${checked ? "bg-indigo-600" : "bg-slate-300"}`}
                                        >
                                          <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? "translate-x-5" : "translate-x-0"}`} />
                                        </button>
                                      </div>
                                      {err ? <p className="mt-1 text-xs text-red-600">{err}</p> : null}
                                    </div>
                                  );
                                }
                                // Non-bypass checkbox
                                return (
                                  <div key={id} className="md:col-span-2">
                                    <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                                      <input
                                        type="checkbox"
                                        checked={(values[f.name] as boolean) || false}
                                        onChange={(e) => handleInputChange(f.name, e.target.checked)}
                                        className="w-4 h-4 cursor-pointer"
                                      />
                                      <span className="text-sm font-medium text-slate-700">{f.label}</span>
                                    </label>
                                    {err ? <p className="mt-1 text-xs text-red-600">{err}</p> : null}
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
                                      <span className="text-xs font-medium text-slate-700">{f.label}</span>
                                    </label>
                                    {err ? <p className="mt-1 text-xs text-red-600">{err}</p> : null}
                                  </div>
                                );
                              }

                              // Step H: Inspection Code placeholder
                              if (id === "inspection_code") {
                                return (
                                  <div key={id}>
                                    <label htmlFor={id} className="block text-xs font-medium text-slate-700 mb-1.5">
                                      This temple has been personally inspected by me. Accordingly, the following code has been issued:
                                    </label>
                                    <input
                                      id={id}
                                      type="text"
                                      value={val}
                                      onChange={(e) => handleInputChange(f.name, e.target.value)}
                                      placeholder="Enter code"
                                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                                    />
                                    {err ? <p className="mt-1 text-xs text-red-600">{err}</p> : null}
                                  </div>
                                );
                              }

                              // Step I: Grama Niladhari Division placeholder
                              if (id === "grama_niladhari_division_ownership") {
                                return (
                                  <div key={id} className="md:col-span-2">
                                    <label htmlFor={id} className="block text-xs font-medium text-slate-700 mb-1.5">
                                      In the Grama Niladhari Division of .........................
                                    </label>
                                    <input
                                      id={id}
                                      type="text"
                                      value={val}
                                      onChange={(e) => handleInputChange(f.name, e.target.value)}
                                      placeholder="Enter division name"
                                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                                    />
                                    {err ? <p className="mt-1 text-xs text-red-600">{err}</p> : null}
                                  </div>
                                );
                              }

                              if (id === "buildings_description") {
                                const idStr = String(f.name);
                                const spanClass = current?.id === 7 ? "md:col-span-3" : "md:col-span-2";
                                return (
                                  <div key={idStr} className={spanClass}>
                                    <ViharaAngaMultipleSelector
                                      id={idStr}
                                      label={f.label}
                                      value={val}
                                      onChange={(next) => handleInputChange(f.name, next)}
                                      required={!!f.rules?.required}
                                      error={err}
                                      placeholder="Select existing temple buildings/structures"
                                    />
                                  </div>
                                );
                              }

                              // Date fields - Use DateField component from vihara/add
                              if (f.type === "date") {
                                return (
                                  <div key={id}>
                                    <DateField
                                      id={id}
                                      label={f.label}
                                      value={val}
                                      onChange={(displayValue) => handleInputChange(f.name, displayValue)}
                                      required={!!f.rules?.required}
                                      placeholder="YYYY/MM/DD"
                                      error={err}
                                    />
                                  </div>
                                );
                              }

                              // Textarea fields
                              if (f.type === "textarea") {
                                const idStr = String(f.name);
                                // For Step 7, make buildings_description span 3 columns, others span 1
                                const spanClass = current?.id === 7 
                                  ? (idStr === "buildings_description" ? "md:col-span-3" : "")
                                  : (idStr === "inspection_report" || idStr === "buildings_description" ? "md:col-span-2" : "");
                                return (
                                  <div key={idStr} className={spanClass}>
                                    <label htmlFor={idStr} className="block text-xs font-medium text-slate-700 mb-1.5">{f.label}</label>
                                    <textarea
                                      id={idStr}
                                      value={val}
                                      rows={f.rows ?? 4}
                                      onChange={(e) => handleInputChange(f.name, e.target.value)}
                                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all resize-none"
                                      placeholder={f.placeholder}
                                    />
                                    {err ? <p className="mt-1 text-xs text-red-600">{err}</p> : null}
                                  </div>
                                );
                              }

                              // Regular text/email/tel inputs
                              return (
                                <div key={id} className={current?.id === 7 && id === "dayaka_families_count" ? "md:col-span-3" : ""}>
                                  <label htmlFor={id} className="block text-xs font-medium text-slate-700 mb-1.5">{f.label}</label>
                                  <input
                                    id={id}
                                    type={f.type}
                                    value={val}
                                    onChange={(e) => handleInputChange(f.name, e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                                    placeholder={f.placeholder}
                                  />
                                  {err ? <p className="mt-1 text-xs text-red-600">{err}</p> : null}
                                </div>
                              );
                            })}

                            {/* Step I: Important Notes */}
                            {current?.id === 11 && (
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
                                className="flex items-center justify-center gap-2 px-4 py-2 text-sm bg-slate-700 text-white rounded-lg font-medium hover:bg-slate-800 transition-all disabled:opacity-70"
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

      {/* ── Admin Unlock Bypass Banner ───────────────────────────────── */}
      {canModerate && BYPASS_STATUSES.has(workflowStatus) && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            type="button"
            onClick={() => setUnlockConfirm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl shadow-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
            </svg>
            Unlock Record
          </button>
        </div>
      )}

      {/* ── Unlock Bypass Confirm Modal ──────────────────────────────── */}
      {unlockConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-amber-50 to-slate-50 px-6 py-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Unlock Bypass Record?</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Admin action — resets status to pending</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-slate-600">
                This will <strong className="text-slate-800">clear the active bypass flag</strong> and reset the record status back to{" "}
                <strong className="text-slate-800">S1_PENDING</strong>.
              </p>
              <p className="text-sm text-slate-500 mt-2">
                The record will be fully editable again. This action is logged with your credentials. Continue?
              </p>
            </div>
            <div className="px-6 pb-6 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setUnlockConfirm(false)}
                className="px-5 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUnlockBypass}
                disabled={saving}
                className="px-5 py-2 text-sm font-bold text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-60 flex items-center gap-2"
              >
                {saving ? (
                  <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>Unlocking…</>
                ) : "Unlock Record"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bypass Toggle Confirm Modal ─────────────────────────────── */}
      {bypassConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-50 to-slate-50 px-6 py-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Mark as Complete?</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{bypassConfirm.label.split(" — ")[0]}</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-slate-600">
                Enabling{" "}
                <strong className="text-slate-800">
                  {bypassConfirm.label.split(" — ")[1] ?? bypassConfirm.label}
                </strong>{" "}
                will mark this section as complete.
              </p>
              <p className="text-sm text-slate-500 mt-2">
                Your record will be <strong>saved</strong> and you will return to the vihara list. Continue?
              </p>
            </div>
            <div className="px-6 pb-6 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setBypassConfirm(null)}
                className="px-5 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBypassSave}
                disabled={saving}
                className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60 flex items-center gap-2"
              >
                {saving ? (
                  <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>Saving…</>
                ) : "Save & Return"}
              </button>
            </div>
          </div>
        </div>
      )}
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

