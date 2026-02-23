import { StepConfig } from "./helpers";
import { isPhoneLK } from "./helpers";

// Temple-Owned Land Information Row
export type LandInfoRow = {
  id: string;
  serialNumber: number;
  landName: string;
  village: string;
  district: string;
  extent: string;
  cultivationDescription: string;
  ownershipNature: string; // Bandara / Rajakariya / Other
  deedNumber: string;
  titleRegistrationNumber: string;
  taxDetails: string;
  landOccupants: string;
};

// Resident Bhikkhu Information Row
export type ResidentBhikkhuRow = {
  id: string;
  serialNumber: number;
  bhikkhuName: string;
  registrationNumber: string; // Samanera / Upasampada Registration Number
  occupationEducation: string;
};

export type ViharaForm = {
  // Step A: Temple Basic Information
  temple_name: string;
  temple_address: string;
  telephone_number: string;
  whatsapp_number: string;
  email_address: string;
  vh_file_number: string;
  vh_vihara_code: string;

  // Step B: Administrative Divisions
  province: string;
  district: string;
  divisional_secretariat: string;
  pradeshya_sabha: string; // Pradeshīya Shāsanarakshaka Bala Mandalaya
  grama_niladhari_division: string;

  // Step C: Religious Affiliation
  nikaya: string; // code
  parshawaya: string; // code

  // Step D: Leadership Information
  viharadhipathi_name: string; // REGN
  viharadhipathi_regn: string;
  viharadhipathi_date: string; // Date replaced with DateField
  period_established: string; // Period description (legacy, kept for backwards compatibility)
  
  // Historical Period Fields (Step D Extended)
  vh_period_era: string; // "AD" | "BC" | "BUDDHIST_ERA"
  vh_period_year: string; // 4 digits
  vh_period_month: string; // 01-12
  vh_period_day: string; // 01-31
  vh_period_notes: string; // Optional notes for approximate dates
  
  // Bypass Flags (Step C, D, E)
  vh_bypass_no_detail: boolean; // No Details (Complete) - Religious Affiliation
  vh_bypass_no_chief: boolean; // No Chief Incumbent (Complete) - Leadership
  vh_bypass_ltr_cert: boolean; // Letter & Cert Done - Mahanyake

  // Step E: Mahanyake Information
  mahanayake_date: string; // Date replaced with DateField
  mahanayake_letter_nu: string;
  mahanayake_remarks: string;

  // Step F: Temple Assets & Activities
  buildings_description: string;
  dayaka_families_count: string;
  kulangana_committee: string;
  dayaka_sabha: string;
  temple_working_committee: string;
  other_associations: string;

  // Step G: Temple-Owned Land Information (stored as JSON array)
  temple_owned_land: string; // JSON string of LandInfoRow[]
  land_info_certified: boolean;

  // Step H: Resident Bhikkhus (stored as JSON array)
  resident_bhikkhus: string; // JSON string of ResidentBhikkhuRow[]
  resident_bhikkhus_certified: boolean;

  // Step I: Report and Inspection
  inspection_report: string; // Report text
  inspection_code: string;

  // Step J: Ownership and Recommendation
  grama_niladhari_division_ownership: string;
  sanghika_donation_deed: boolean;
  government_donation_deed: boolean;
  government_donation_deed_in_progress: boolean;
  authority_consent_attached: boolean;
  recommend_new_center: boolean;
  recommend_registered_temple: boolean;

  // Step K: Annex II
  annex2_recommend_construction: boolean;
  annex2_land_ownership_docs: boolean;
  annex2_chief_incumbent_letter: boolean;
  annex2_coordinator_recommendation: boolean;
  annex2_divisional_secretary_recommendation: boolean;
  annex2_approval_construction: boolean;
  annex2_referral_resubmission: boolean;
};

export const viharaSteps = (): StepConfig<ViharaForm>[] => [
  {
    id: 1,
    title: "Temple Basic Information",
    fields: [
      { name: "temple_name", label: "Name of the Temple", type: "text", rules: { required: true } },
      { name: "temple_address", label: "Temple Address", type: "textarea", rows: 3, rules: { required: true } },
      { name: "vh_file_number", label: "File Number", type: "text", rules: { required: false } },
      { name: "vh_vihara_code", label: "Vihara Code", type: "text", rules: { required: false } },
      {
        name: "telephone_number",
        label: "Telephone Number",
        type: "tel",
        placeholder: "07XXXXXXXX",
        rules: { required: false, pattern: { regex: /^0\d{9}$/, message: "Must be 10 digits (e.g., 07XXXXXXXX)" } },
      },
      {
        name: "whatsapp_number",
        label: "WhatsApp Number",
        type: "tel",
        placeholder: "07XXXXXXXX",
        rules: { required: false, pattern: { regex: /^0\d{9}$/, message: "Must be 10 digits (e.g., 07XXXXXXXX)" } },
      },
      {
        name: "email_address",
        label: "Email Address",
        type: "email",
        rules: { required: false, pattern: { regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Invalid email" } },
      },
    ],
  },
  {
    id: 2,
    title: "Administrative Divisions",
    fields: [
      { name: "district", label: "District", type: "text", rules: { required: false } },
      { name: "divisional_secretariat", label: "Divisional Secretariat Division", type: "text", rules: { required: false } },
      { name: "pradeshya_sabha", label: "Pradeshīya Shāsanarakshaka Bala Mandalaya", type: "text", rules: { required: false } },
      { name: "grama_niladhari_division", label: "Grama Niladhari Division", type: "text", rules: { required: false } },
    ],
  },
  {
    id: 3,
    title: "Religious Affiliation",
    fields: [
      { name: "nikaya", label: "Nikaya (Monastic Order)", type: "text", rules: { required: true } },
      { name: "parshawaya", label: "Parshawaya (Sub-division / Sect)", type: "text", rules: { required: true } },
      { name: "vh_bypass_no_detail", label: "ව‍ිස්තර නොමැත — No Details (Complete)", type: "checkbox", rules: { required: false } },
    ],
  },
  {
    id: 4,
    title: "Leadership Information",
    fields: [
      { name: "viharadhipathi_name", label: "Name of Current Chief Incumbent (Viharadhipathi)", type: "text"},
      { name: "viharadhipathi_regn", label: "Chief Monk's Registration Number (Auto-populated or enter manually)", type: "text", rules: { required: false } },
      { name: "viharadhipathi_date", label: "Date of Appointment", type: "date", rules: { required: false } },
      { name: "period_established", label: "Period Temple Was Established", type: "date", rules: { required: false } },
      { name: "vh_period_era", label: "Era (If different from AD)", type: "text", placeholder: "AD / BC / Buddhist Era", rules: { required: false } },
      { name: "vh_period_year", label: "Year", type: "text", placeholder: "YYYY", rules: { required: false } },
      { name: "vh_period_month", label: "Month (Optional)", type: "text", placeholder: "MM", rules: { required: false } },
      { name: "vh_period_day", label: "Day (Optional)", type: "text", placeholder: "DD", rules: { required: false } },
      { name: "vh_period_notes", label: "Notes About Period", type: "textarea", rows: 2, placeholder: "Enter approximate or historical notes if exact date unavailable", rules: { required: false } },
      { name: "vh_bypass_no_chief", label: "විහාරාධිපති නම් කර නැත — No Chief Incumbent (Complete)", type: "checkbox", rules: { required: false } },
    ],
  },
  {
    id: 5,
    title: "Mahanyake thero Information",
    fields: [
      { name: "mahanayake_date", label: "Mahanyake Thero Letter Date", type: "date", rules: { required: false } },
      { name: "mahanayake_letter_nu", label: "Mahanyake Thero Letter Number", type: "text", rules: { required: false } },
      {
        name: "mahanayake_remarks",
        label: "Letter Remarks",
        type: "textarea",
        rows: 4,
        placeholder: "Add detailed remarks about the Mahanyake letter, guidance provided, or any special notes that should be kept with this registration.",
        rules: { required: false },
      },
      { name: "vh_bypass_ltr_cert", label: "ලිපිය හා සහතිකය සම්පූර්ණ — Letter & Cert Done", type: "checkbox", rules: { required: false } },
    ],
  },
  {
    id: 7,
    title: "Temple Assets & Activities",
    fields: [
      { name: "buildings_description", label: "Description of Existing Temple Buildings/Structures", type: "textarea", rows: 2, rules: { required: true } },
      { name: "dayaka_families_count", label: "Number of Dayaka (Donor) Families", type: "text", rules: { required: false } },
      { name: "kulangana_committee", label: "Kulangana Committee Information", type: "textarea", rows: 1, rules: { required: false } },
      { name: "dayaka_sabha", label: "Dayaka Sabha Information", type: "textarea", rows: 1, rules: { required: false } },
      { name: "temple_working_committee", label: "Temple Working Committee Information", type: "textarea", rows: 1, rules: { required: false } },
      { name: "other_associations", label: "Other Associations Information", type: "textarea", rows: 1, rules: { required: false } },
    ],
  },
  {
    id: 8,
    title: "Temple-Owned Land Information",
    fields: [
      // This step will be handled specially with an editable table
      { name: "temple_owned_land", label: "Land Information Table", type: "text", rules: { required: false } },
      { name: "land_info_certified", label: "I certify that the above information is true and correct", type: "text", rules: { required: true } },
    ],
  },
  {
    id: 9,
    title: "Resident Bhikkhus Information",
    fields: [
      // This step will be handled specially with an editable table
      { name: "resident_bhikkhus", label: "Resident Bhikkhus Table", type: "text", rules: { required: false } },
      { name: "resident_bhikkhus_certified", label: "I certify that the above information is true and correct", type: "text", rules: { required: true } },
    ],
  },
  {
    id: 10,
    title: "Inspection Report",
    fields: [
      { name: "inspection_report", label: "Report issued by the Buddhist Religious Affairs Coordinating Officer", type: "textarea", rows: 6, rules: { required: true } },
      { name: "inspection_code", label: "Inspection Code", type: "text", placeholder: "Enter code", rules: { required: true } },
    ],
  },
  {
    id: 11,
    title: "Ownership and Recommendation",
    fields: [
      { name: "grama_niladhari_division_ownership", label: "In the Grama Niladhari Division of .........................", type: "text", placeholder: "Enter division name", rules: { required: true } },
      { name: "sanghika_donation_deed", label: "Ownership has been obtained through a Sanghika (Saṅgha) donation deed", type: "text", rules: { required: false } },
      { name: "government_donation_deed", label: "A donation deed issued by the Government has been obtained", type: "text", rules: { required: false } },
      { name: "government_donation_deed_in_progress", label: "Necessary steps are being taken to prepare the donation deed", type: "text", rules: { required: false } },
      { name: "authority_consent_attached", label: "The letter of consent from the relevant Authority/Department has been attached", type: "text", rules: { required: false } },
      { name: "recommend_new_center", label: "I recommend that the premises be established and maintained as a new Buddhist religious center", type: "text", rules: { required: false } },
      { name: "recommend_registered_temple", label: "I recommend that the premises be registered as a Buddhist temple", type: "text", rules: { required: false } },
    ],
  },
  {
    id: 12,
    title: "Annex II",
    fields: [
      { name: "annex2_recommend_construction", label: "I recommend that the temple be constructed and maintained as a new religious center", type: "text", rules: { required: false } },
      { name: "annex2_land_ownership_docs", label: "Documents confirming land ownership", type: "text", rules: { required: false } },
      { name: "annex2_chief_incumbent_letter", label: "Letter of appointment of Chief Incumbent", type: "text", rules: { required: false } },
      { name: "annex2_coordinator_recommendation", label: "Recommendation of Buddhist Religious Affairs Coordinator", type: "text", rules: { required: false } },
      { name: "annex2_divisional_secretary_recommendation", label: "Recommendation of Divisional Secretary", type: "text", rules: { required: false } },
      { name: "annex2_approval_construction", label: "Approval for construction and maintenance", type: "text", rules: { required: false } },
      { name: "annex2_referral_resubmission", label: "Referral for re-submission with notes", type: "text", rules: { required: false } },
    ],
  },
];

export const viharaInitialValues: Partial<ViharaForm> = {
  temple_name: "",
  temple_address: "",
  telephone_number: "",
  whatsapp_number: "",
  email_address: "",
  vh_file_number: "",
  vh_vihara_code: "",
  province: "",
  district: "",
  divisional_secretariat: "",
  pradeshya_sabha: "",
  grama_niladhari_division: "",
  nikaya: "",
  parshawaya: "",
  viharadhipathi_name: "",
  viharadhipathi_regn: "",
  viharadhipathi_date: "",
  period_established: "",
  vh_period_era: "",
  vh_period_year: "",
  vh_period_month: "",
  vh_period_day: "",
  vh_period_notes: "",
  vh_bypass_no_detail: false,
  vh_bypass_no_chief: false,
  vh_bypass_ltr_cert: false,
  mahanayake_date: "",
  mahanayake_letter_nu: "",
  mahanayake_remarks: "",
  buildings_description: "",
  dayaka_families_count: "",
  kulangana_committee: "",
  dayaka_sabha: "",
  temple_working_committee: "",
  other_associations: "",
  temple_owned_land: "[]",
  land_info_certified: false,
  resident_bhikkhus: "[]",
  resident_bhikkhus_certified: false,
  inspection_report: "",
  inspection_code: "",
  grama_niladhari_division_ownership: "",
  sanghika_donation_deed: false,
  government_donation_deed: false,
  government_donation_deed_in_progress: false,
  authority_consent_attached: false,
  recommend_new_center: false,
  recommend_registered_temple: false,
  annex2_recommend_construction: false,
  annex2_land_ownership_docs: false,
  annex2_chief_incumbent_letter: false,
  annex2_coordinator_recommendation: false,
  annex2_divisional_secretary_recommendation: false,
  annex2_approval_construction: false,
  annex2_referral_resubmission: false,
};
