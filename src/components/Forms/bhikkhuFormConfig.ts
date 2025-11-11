// =======================================
// src/components/Forms/bhikkhuFormConfig.ts
// Config + types for your Bhikkhu form
// =======================================
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

  br_viharadhipathi_name: string;
  br_nikaya_name: string;
  br_chapter_name: string;
  br_mahanayaka_name: string;
  br_mahanayaka_address: string;

  br_cat: string;
  br_currstat: string;
  br_residence_at_declaration: string;
  br_declaration_date: string;
  br_remarks: string;

  br_robing_date: string;
  br_robing_assumed_name: string;
  br_robing_tutor_name: string;
  br_robing_tutor_residence: string;
  br_robing_place_temple: string;
  br_robing_after_residence_temple: string;
};

const isPhoneLK = (v: string) => /^0\d{9}$/.test(v.trim());

export const bhikkhuSteps = (): import("./WizardForm").StepConfig<BhikkhuForm>[] => [
  {
    id: 1,
    title: "Personal Information",
    fields: [
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
        rules: {
          required: true,
          pattern: { regex: /^0\d{9}$/, message: "Must be 10 digits (e.g., 07XXXXXXXX)" },
        },
      },
      {
        name: "br_fathrsaddrs",
        label: "Father's Address",
        type: "text",
        rules: { required: true },
      },
      {
        name: "br_fathrsmobile",
        label: "Father's Mobile",
        type: "tel",
        placeholder: "07XXXXXXXX",
        rules: {
          required: true,
          custom: (v) => (isPhoneLK(v) ? undefined : "Must be 10 digits (e.g., 07XXXXXXXX)"),
        },
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
      {
        name: "br_viharadhipathi_name",
        label: "Name of Viharadhipathi of temple of residence",
        type: "text",
        rules: { required: true },
      },
      { name: "br_nikaya_name", label: "Name of Nikaya", type: "text", rules: { required: true } },
      { name: "br_chapter_name", label: "Name of Chapter", type: "text", rules: { required: true } },
      {
        name: "br_mahanayaka_name",
        label: "Name of Mahanayaka Thera or Nayaka Thero of the Nikaya",
        type: "text",
        rules: { required: true },
      },
      {
        name: "br_mahanayaka_address",
        label: "Full postal address of the Mahanayaka Thera or Nayaka Theri of the Nikaya",
        type: "textarea",
        rows: 4,
        rules: { required: true },
      },
    ],
  },
  {
    id: 4,
    title: "Robing Informations",
    fields: [
      { name: "br_robing_date", label: "Date of robing", type: "date", rules: { required: true, maxDateToday: true } },
      { name: "br_robing_assumed_name", label: "Name assumed at robing", type: "text", rules: { required: true } },
      { name: "br_robing_tutor_name", label: "Name of robing tutor", type: "text", rules: { required: true } },
      { name: "br_robing_tutor_residence", label: "Name of robing tutor’s residence", type: "text", rules: { required: true } },
      { name: "br_robing_place_temple", label: "Temple where robing took place", type: "text", rules: { required: true } },
      { name: "br_robing_after_residence_temple", label: "Temple of residence after robing", type: "text", rules: { required: true } },
    ],
  },
  {
    id: 5,
    title: "Additional Details",
    fields: [
      { name: "br_cat", label: "Category", type: "text", rules: { required: true } },
      { name: "br_currstat", label: "Current Status", type: "text", rules: { required: true } },
      {
        name: "br_residence_at_declaration",
        label: "Residence at time of declaration",
        type: "text",
        rules: { required: true },
      },
      {
        name: "br_declaration_date",
        label: "Date of making the declaration",
        type: "date",
        rules: { required: true, maxDateToday: true },
      },
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

  br_viharadhipathi_name: "",
  br_nikaya_name: "",
  br_chapter_name: "",
  br_mahanayaka_name: "",
  br_mahanayaka_address: "",

  br_cat: "",
  br_currstat: "",
  br_residence_at_declaration: "",
  br_declaration_date: "",
  br_remarks: "",

  br_robing_date: "",
  br_robing_assumed_name: "",
  br_robing_tutor_name: "",
  br_robing_tutor_residence: "",
  br_robing_place_temple: "",
  br_robing_after_residence_temple: "",
};

export const buildBhikkhuDemoValues = () => {
  const today = new Date().toISOString().slice(0, 10);
  return {
    // Step 1
    br_reqstdate: today,
    br_gihiname: "Saman Kumara",
    br_dofb: "1995-05-20",
    br_fathrname: "Kumara Senanayake",
    br_email: "saman@example.com",
    br_mobile: "0711234567",
    br_fathrsaddrs: "No. 12, Temple Rd, Kandy",
    br_fathrsmobile: "0777654321",

    // Step 2
    br_birthpls: "Kandy",
    br_province: "Central",
    br_district: "Kandy",
    br_korale: "Harispattuwa",
    br_pattu: "Yatinuwara",
    br_division: "Gangawata Korale",
    br_vilage: "Peradeniya",
    br_gndiv: "123A",

    // Step 3
    br_viharadhipathi_name: "Ven. Viharadhipathi Thera",
    br_nikaya_name: "Siyam Nikaya",
    br_chapter_name: "Malwathu Chapter",
    br_mahanayaka_name: "Most Ven. Mahanayaka Thera",
    br_mahanayaka_address: "Mahavihara, Sri Dalada Veediya, Kandy, Sri Lanka",

    // Step 5
    br_cat: "CAT-01",
    br_currstat: "Active",
    br_residence_at_declaration: "Asgiriya Maha Viharaya, Kandy",
    br_declaration_date: today,
    br_remarks: "N/A",

    // Step 4
    br_robing_date: "2010-06-15",
    br_robing_assumed_name: "Ven. Sumedha",
    br_robing_tutor_name: "Ven. Dhammika Thera",
    br_robing_tutor_residence: "Dharmapala Aramaya, Galle",
    br_robing_place_temple: "Asgiriya Maha Viharaya",
    br_robing_after_residence_temple: "XYZ Aranya Senasanaya",
  } as Partial<BhikkhuForm>;
};