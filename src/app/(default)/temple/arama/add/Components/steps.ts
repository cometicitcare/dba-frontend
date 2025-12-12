import { StepConfig } from "./helpers";

// Arama-Owned Land Information Row (same as vihara)
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

// Resident Sil Mathā Information Row
export type ResidentSilmathaRow = {
  id: string;
  serialNumber: number;
  silmathaName: string;
  registrationNumber: string;
  occupationEducation: string;
};

export type AramaForm = {
  // Step 1: Basic Information
  arama_name: string;
  arama_address: string;
  telephone_number: string;
  whatsapp_number: string;
  email_address: string;

  // Step 2: Location Details
  province: string;
  district: string;
  divisional_secretariat: string;
  provincial_sasanaarakshaka_council: string;
  grama_niladhari_division: string;

  // Step 3: Administrative Details
  chief_nun_name: string;
  chief_nun_registration_number: string;
  established_period: string;

  // Step 4: Land & Facilities
  land_size: string;
  land_ownership: string; // State / Private
  legal_ownership_proof: string; // Grant Deed / Power of Attorney / Tax / Other (multi-select, comma-separated)
  existing_buildings_facilities: string;
  donor_families_count: string;
  committees: string;

  // Step 5: Details of the Land Belonging to the Aramaya (stored as JSON array)
  arama_owned_land: string; // JSON string of LandInfoRow[]
  land_info_certified: boolean;

  // Step 6: Information About the Ten Sil Māthā Residents (stored as JSON array)
  resident_silmathas: string; // JSON string of ResidentSilmathaRow[]
  resident_silmathas_certified: boolean;

  // Step 7: Report issued by the Buddhist Religious Affairs Coordinating Officer
  inspection_report: string;
  inspection_code: string;

  // Step 8: Land Ownership Statement
  ownership_district: string;
  ownership_divisional_secretariat: string;
  ownership_grama_niladhari_division: string;
  ownership_arama_name: string;
  pooja_deed_obtained: boolean;
  government_pooja_deed_obtained: boolean;
  government_pooja_deed_in_progress: boolean;
  institution_name: string;
  institution_consent_obtained: boolean;
  recommend_new_center: boolean;
  recommend_registered_arama: boolean;

  // Step 9: Annex II
  annex2_chief_nun_registered: boolean;
  annex2_land_ownership_docs: boolean;
  annex2_institution_consent: boolean;
  annex2_district_association_recommendation: boolean;
  annex2_divisional_secretary_recommendation: boolean;
  annex2_recommend_district: string;
  annex2_recommend_divisional_secretariat: string;
  annex2_recommend_grama_niladhari_division: string;
  annex2_recommend_arama_name: string;

  // Step 10: Approval of the Secretary
  secretary_approve_construction: boolean;
  secretary_not_approve_construction: boolean;
  secretary_refer_registration: boolean;
  secretary_refer_resubmission: boolean;
  secretary_resubmission_notes: string;
};

export const aramaSteps = (): StepConfig<AramaForm>[] => [
  {
    id: 1,
    title: "Basic Info",
    fields: [
      { name: "arama_name", label: "Name of the Sil Mathā Aramaya", type: "textarea", rows: 2, rules: { required: true } },
      { name: "arama_address", label: "Address", type: "textarea", rows: 3, rules: { required: true } },
      {
        name: "telephone_number",
        label: "Telephone Number",
        type: "tel",
        placeholder: "0XX-XXXXXXX",
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
    title: "Location",
    fields: [
      { name: "district", label: "District", type: "text", rules: { required: true } },
      { name: "divisional_secretariat", label: "Divisional Secretariat Division", type: "text", rules: { required: true } },
      { name: "provincial_sasanaarakshaka_council", label: "Provincial Sasanaarakshaka Council", type: "text", rules: { required: false } },
      { name: "grama_niladhari_division", label: "Grama Niladhari Division", type: "text", rules: { required: true } },
    ],
  },
  {
    id: 3,
    title: "Admin Details",
    fields: [
      { name: "chief_nun_name", label: "Current Chief Nun (Aramādhipathi)", type: "text", rules: { required: true } },
      { name: "chief_nun_registration_number", label: "Chief Nun's Registration Number (Dept. of Buddhist Affairs)", type: "text", rules: { required: true } },
      { name: "established_period", label: "Established Period / Year of the Aramaya", type: "date", rules: { required: true } },
    ],
  },
  {
    id: 4,
    title: "Land & Facilities",
    fields: [
      { name: "land_size", label: "Land Size", type: "text", rules: { required: true } },
      { name: "land_ownership", label: "Land Ownership (State / Private)", type: "text", rules: { required: true } },
      { name: "legal_ownership_proof", label: "Legal Ownership Proof Documents (Grant Deed / Power of Attorney / Tax / Other)", type: "text", placeholder: "Comma-separated if multiple", rules: { required: false } },
      { name: "existing_buildings_facilities", label: "Existing Buildings / Facilities", type: "textarea", rows: 3, rules: { required: true } },
      { name: "donor_families_count", label: "Number of Donor Families", type: "text", rules: { required: false } },
      { name: "committees", label: "Committees (Donor Society / Working Committees / Others)", type: "textarea", rows: 2, rules: { required: false } },
    ],
  },
  {
    id: 5,
    title: "Land Details",
    fields: [
      { name: "arama_owned_land", label: "Land Information Table", type: "text", rules: { required: false } },
      { name: "land_info_certified", label: "I certify that the above information is true and correct", type: "text", rules: { required: true } },
    ],
  },
  {
    id: 6,
    title: "Residents",
    fields: [
      { name: "resident_silmathas", label: "Resident Sil Mathā Table", type: "text", rules: { required: false } },
      { name: "resident_silmathas_certified", label: "I certify that the above information is true and correct", type: "text", rules: { required: true } },
    ],
  },
  {
    id: 7,
    title: "Inspection Report",
    fields: [
      { name: "inspection_report", label: "Report on the Current Condition of the Arama", type: "textarea", rows: 6, rules: { required: true } },
      { name: "inspection_code", label: "Inspection Code", type: "text", placeholder: "Enter code", rules: { required: true } },
    ],
  },
  {
    id: 8,
    title: "Ownership",
    fields: [
      { name: "ownership_district", label: "District", type: "text", rules: { required: true } },
      { name: "ownership_divisional_secretariat", label: "Divisional Secretariat Division", type: "text", rules: { required: true } },
      { name: "ownership_grama_niladhari_division", label: "Grama Niladhari Division", type: "text", rules: { required: true } },
      { name: "ownership_arama_name", label: "Arama Name", type: "text", rules: { required: true } },
      { name: "pooja_deed_obtained", label: "The ownership of the land has been obtained through a Pooja Deed", type: "text", rules: { required: false } },
      { name: "government_pooja_deed_obtained", label: "A Pooja Deed issued by the Government has been obtained", type: "text", rules: { required: false } },
      { name: "government_pooja_deed_in_progress", label: "The necessary work to prepare the Pooja Deed is currently being carried out", type: "text", rules: { required: false } },
      { name: "institution_name", label: "Institution Name", type: "text", rules: { required: false } },
      { name: "institution_consent_obtained", label: "Consent of the relevant institution has been obtained (The relevant letter is attached)", type: "text", rules: { required: false } },
      { name: "recommend_new_center", label: "I recommend approval to construct and maintain it as a new religious center as a Buddhist Arama", type: "text", rules: { required: false } },
      { name: "recommend_registered_arama", label: "I recommend to register it as a Buddhist Arama", type: "text", rules: { required: false } },
    ],
  },
  {
    id: 9,
    title: "Annex II",
    fields: [
      { name: "annex2_chief_nun_registered", label: "The applicant Chief Nun (Aramādhipathi Sil Meniya) is registered with the Department of Buddhist Affairs", type: "text", rules: { required: false } },
      { name: "annex2_land_ownership_docs", label: "Documents confirming the legal ownership of the land (Pooja Deed / Permit / Tax Receipt / Other) are submitted", type: "text", rules: { required: false } },
      { name: "annex2_institution_consent", label: "Consent letter from the institution that owns the land is submitted", type: "text", rules: { required: false } },
      { name: "annex2_district_association_recommendation", label: "Recommendation letter from the Secretary of the District Sil Mathā Association is submitted", type: "text", rules: { required: false } },
      { name: "annex2_divisional_secretary_recommendation", label: "Recommendation from the Divisional Secretary is submitted", type: "text", rules: { required: false } },
      { name: "annex2_recommend_district", label: "District", type: "text", rules: { required: false } },
      { name: "annex2_recommend_divisional_secretariat", label: "Divisional Secretariat Division", type: "text", rules: { required: false } },
      { name: "annex2_recommend_grama_niladhari_division", label: "Grama Niladhari Division", type: "text", rules: { required: false } },
      { name: "annex2_recommend_arama_name", label: "Arama Name", type: "text", rules: { required: false } },
    ],
  },
  {
    id: 10,
    title: "Secretary Approval",
    fields: [
      { name: "secretary_approve_construction", label: "I approve the Arama to be constructed and maintained as a new religious center", type: "text", rules: { required: false } },
      { name: "secretary_not_approve_construction", label: "I do not approve the Arama to be constructed and maintained as a new religious center", type: "text", rules: { required: false } },
      { name: "secretary_refer_registration", label: "I refer this Arama for registration as a Buddhist Arama", type: "text", rules: { required: false } },
      { name: "secretary_refer_resubmission", label: "I refer the Arama to be resubmitted for registration as a Buddhist Arama after considering the following matters", type: "text", rules: { required: false } },
      { name: "secretary_resubmission_notes", label: "Resubmission Notes", type: "textarea", rows: 3, rules: { required: false } },
    ],
  },
];

export const aramaInitialValues: Partial<AramaForm> = {
  arama_name: "",
  arama_address: "",
  telephone_number: "",
  whatsapp_number: "",
  email_address: "",
  province: "",
  district: "",
  divisional_secretariat: "",
  provincial_sasanaarakshaka_council: "",
  grama_niladhari_division: "",
  chief_nun_name: "",
  chief_nun_registration_number: "",
  established_period: "",
  land_size: "",
  land_ownership: "",
  legal_ownership_proof: "",
  existing_buildings_facilities: "",
  donor_families_count: "",
  committees: "",
  arama_owned_land: "[]",
  land_info_certified: false,
  resident_silmathas: "[]",
  resident_silmathas_certified: false,
  inspection_report: "",
  inspection_code: "",
  ownership_district: "",
  ownership_divisional_secretariat: "",
  ownership_grama_niladhari_division: "",
  ownership_arama_name: "",
  pooja_deed_obtained: false,
  government_pooja_deed_obtained: false,
  government_pooja_deed_in_progress: false,
  institution_name: "",
  institution_consent_obtained: false,
  recommend_new_center: false,
  recommend_registered_arama: false,
  annex2_chief_nun_registered: false,
  annex2_land_ownership_docs: false,
  annex2_institution_consent: false,
  annex2_district_association_recommendation: false,
  annex2_divisional_secretary_recommendation: false,
  annex2_recommend_district: "",
  annex2_recommend_divisional_secretariat: "",
  annex2_recommend_grama_niladhari_division: "",
  annex2_recommend_arama_name: "",
  secretary_approve_construction: false,
  secretary_not_approve_construction: false,
  secretary_refer_registration: false,
  secretary_refer_resubmission: false,
  secretary_resubmission_notes: "",
};

