import { StepConfig } from "./helpers";
import { isPhoneLK } from "./helpers";

export type BhikkhuForm = {
  br_reqstdate: string;
  br_gihiname: string;
  br_dofb: string;
  br_fathrname: string;
  br_email: string;
  br_mobile: string;
  br_fathrsaddrs: string;
  br_fathrsmobile: string;

  br_birthpls: string;
  br_province: string;
  br_district: string;
  br_korale: string;
  br_pattu: string;
  br_division: string;
  br_vilage: string;
  br_gndiv: string;

  br_viharadhipathi: string; // REGN
  br_nikaya: string;         // code
  br_parshawaya: string;
  br_mahanayaka_name: string;
  br_mahanayaka_address: string;

  br_cat: string;
  br_currstat: string;
  br_residence_at_declaration: string;
  br_declaration_date: string;
  br_remarks: string;

  br_mahanadate: string;
  br_mahananame: string;
  br_mahanaacharyacd: string; // REGN
  br_robing_tutor_residence: string; // TRN

  br_mahanatemple: string; // TRN
  br_robing_after_residence_temple: string; // TRN
};

export const bhikkhuSteps = (): StepConfig<BhikkhuForm>[] => [
  {
    id: 1,
    title: "Personal Information",
    fields: [
      { name: "br_cat", label: "Category", type: "text", rules: { required: true } },
      { name: "br_reqstdate", label: "Request Date", type: "date", rules: { required: true, maxDateToday: true } },
      { name: "br_dofb", label: "Date of Birth", type: "date", rules: { required: true, maxDateToday: true } },
      { name: "br_gihiname", label: "Full Name (Gihi Name)", type: "text", rules: { required: true } },
      { name: "br_fathrname", label: "Father's Name", type: "text", rules: { required: true } },
      {
        name: "br_email",
        label: "Email Address",
        type: "email",
        rules: { required: true, pattern: { regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Invalid email" } },
      },
      {
        name: "br_mobile",
        label: "Mobile Number",
        type: "tel",
        placeholder: "07XXXXXXXX",
        rules: { required: true, pattern: { regex: /^0\d{9}$/, message: "Must be 10 digits (e.g., 07XXXXXXXX)" } },
      },
      { name: "br_fathrsaddrs", label: "Father's Address", type: "text", rules: { required: true } },
      {
        name: "br_fathrsmobile",
        label: "Father's Mobile",
        type: "tel",
        placeholder: "07XXXXXXXX",
        rules: { required: true, custom: (v) => (isPhoneLK(v) ? undefined : "Must be 10 digits (e.g., 07XXXXXXXX)") },
      },
    ],
  },
  {
    id: 2,
    title: "Birth Location",
    fields: [
      { name: "br_birthpls", label: "Birth Place", type: "text", rules: { required: true } },
      { name: "br_province", label: "Province", type: "text", rules: { required: true } },
      { name: "br_district", label: "District", type: "text", rules: { required: true } },
      { name: "br_korale", label: "Korale", type: "text", rules: { required: true } },
      { name: "br_pattu", label: "Pattu", type: "text", rules: { required: true } },
      { name: "br_division", label: "Division", type: "text", rules: { required: true } },
      { name: "br_vilage", label: "Village", type: "text", rules: { required: true } },
      { name: "br_gndiv", label: "GN Division", type: "text", rules: { required: true } },
    ],
  },
  {
    id: 3,
    title: "Temple Information",
    fields: [
      { name: "br_viharadhipathi", label: "Name of Viharadhipathi of temple of residence", type: "text", rules: { required: true } },
      { name: "br_nikaya", label: "Name of Nikaya", type: "text", rules: { required: true } },
      { name: "br_parshawaya", label: "Name of Chapter", type: "text", rules: { required: true } },
      { name: "br_mahanayaka_name", label: "Name of Mahanayaka Thera or Nayaka Thero of the Nikaya", type: "text", rules: { required: true } },
      { name: "br_mahanayaka_address", label: "Full postal address of the Mahanayaka Thera or Nayaka Theri of the Nikaya", type: "textarea", rows: 4, rules: { required: true } },
      { name: "br_robing_after_residence_temple", label: "Temple of residence after robing", type: "text", rules: { required: true } },
    ],
  },
  {
    id: 4,
    title: "Robing Informations",
    fields: [
      { name: "br_mahanadate", label: "Date of robing", type: "date", rules: { required: true, maxDateToday: true } },
      { name: "br_mahananame", label: "Name assumed at robing", type: "text", rules: { required: true } },
      { name: "br_mahanaacharyacd", label: "Name of robing tutor", type: "text", rules: { required: true } },
      { name: "br_robing_tutor_residence", label: "Name of robing tutor’s residence", type: "text", rules: { required: true } },
      { name: "br_mahanatemple", label: "Temple where robing took place", type: "text", rules: { required: true } },
    ],
  },
  {
    id: 5,
    title: "Additional Details",
    fields: [
      { name: "br_currstat", label: "Current Status", type: "text", rules: { required: true } },
      { name: "br_residence_at_declaration", label: "Residence at time of declaration", type: "text", rules: { required: true } },
      { name: "br_declaration_date", label: "Date of making the declaration", type: "date", rules: { required: true, maxDateToday: true } },
      { name: "br_remarks", label: "Remarks", type: "textarea", rows: 4, rules: { required: true } },
    ],
  },
];

export const bhikkhuInitialValues: Partial<BhikkhuForm> = {
  br_reqstdate: "",
  br_gihiname: "",
  br_dofb: "",
  br_fathrname: "",
  br_email: "",
  br_mobile: "",
  br_fathrsaddrs: "",
  br_fathrsmobile: "",

  br_birthpls: "",
  br_province: "",
  br_district: "",
  br_korale: "",
  br_pattu: "",
  br_division: "",
  br_vilage: "",
  br_gndiv: "",

  br_viharadhipathi: "",
  br_nikaya: "",
  br_parshawaya: "",
  br_mahanayaka_name: "",
  br_mahanayaka_address: "",

  br_cat: "",
  br_currstat: "",
  br_residence_at_declaration: "",
  br_declaration_date: "",
  br_remarks: "",

  br_mahanadate: "",
  br_mahananame: "",
  br_mahanaacharyacd: "",
  br_robing_tutor_residence: "",

  br_mahanatemple: "",
  br_robing_after_residence_temple: "",
};