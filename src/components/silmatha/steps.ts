import { StepConfig } from "./helpers";

export type SilmathaForm = {
  sm_form_number: string;
  sm_reqstdate: string;
  sm_gihiname: string;
  sm_dofb: string;
  sm_fathername: string;
  sm_birthplace: string;
  sm_province: string;
  sm_district: string;
  sm_divisional_secretariat: string;
  sm_gn_division: string;
  sm_korale: string;
  sm_pattu: string;
  sm_village: string;
  sm_viharadhipathi: string;
  sm_robing_date: string;
  sm_robing_name: string;
  sm_robing_tutor: string;
  sm_robing_tutor_residence: string;
  sm_robing_temple: string;
  sm_post_robing_temple: string;
  sil_declaration_date: string;
  sil_remarks: string;
  sil_currstat: string;
  sil_student_signature: string;
  sil_acharya_signature: string;
  sil_aramadhipathi_signature: string;
  sil_district_secretary_signature: string;
};

export const silmathaSteps: StepConfig<SilmathaForm>[] = [
  {
    id: 1,
    title: "Personal Information",
    fields: [
      { name: "sm_reqstdate", label: "Request Date", type: "date", rules: { required: true } },
      { name: "sm_form_number", label: "Form Number", type: "text", rules: { required: true } },
      { name: "sm_gihiname", label: "Full Name (Gihi Name)", type: "text", rules: { required: true } },
      { name: "sm_dofb", label: "Date of Birth", type: "date", rules: { required: true, maxDateToday: true } },
      { name: "sm_fathername", label: "Father's Name", type: "text", rules: { required: true } },
    ],
  },
  {
    id: 2,
    title: "Birth Location",
    fields: [
      { name: "sm_birthplace", label: "Birth Place", type: "text", rules: { required: true } },
      { name: "sm_province", label: "Province", type: "text", rules: { required: true } },
      { name: "sm_district", label: "District", type: "text", rules: { required: true } },
      { name: "sm_divisional_secretariat", label: "Divisional Secretariat", type: "text" },
      { name: "sm_gn_division", label: "GN Division", type: "text" },
      { name: "sm_korale", label: "Korale", type: "text" },
      { name: "sm_pattu", label: "Pattu", type: "text" },
      { name: "sm_village", label: "Village", type: "text" },
    ],
  },
  {
    id: 3,
    title: "Arama Information",
    fields: [
      {
        name: "sm_viharadhipathi",
        label: "Name of Viharadhipathi of temple of residence",
        type: "text",
        rules: { required: true },
      },
    ],
  },
  {
    id: 4,
    title: "Robing Informations",
    fields: [
      { name: "sm_robing_date", label: "Date of robing", type: "date", rules: { required: true, maxDateToday: true } },
      { name: "sm_robing_name", label: "Name assumed at robing", type: "text", rules: { required: true } },
      { name: "sm_robing_tutor", label: "Name of robing tutor", type: "text", rules: { required: true } },
      {
        name: "sm_robing_tutor_residence",
        label: "Name of robing tutor's residence",
        type: "text",
        rules: { required: true },
      },
      { name: "sm_robing_temple", label: "Temple where robing took place", type: "text", rules: { required: true } },
      { name: "sm_post_robing_temple", label: "Temple of residence after robing", type: "text", rules: { required: true } },
    ],
  },
  {
    id: 5,
    title: "Declaration",
    fields: [
      { name: "sil_declaration_date", label: "Declaration Date", type: "date", rules: { required: true, maxDateToday: true } },
      { name: "sil_remarks", label: "Remarks", type: "text" },
      { name: "sil_currstat", label: "Current Status", type: "text", rules: { required: true } },
      { name: "sil_student_signature", label: "Student Signature", type: "checkbox" },
      { name: "sil_acharya_signature", label: "Acharya Signature", type: "checkbox" },
      { name: "sil_aramadhipathi_signature", label: "Aramadhipathi Signature", type: "checkbox" },
      { name: "sil_district_secretary_signature", label: "District Secretary Signature", type: "checkbox" },
    ],
  },
];

export const silmathaInitialValues: SilmathaForm = {
  sm_form_number: "",
  sm_reqstdate: "",
  sm_gihiname: "",
  sm_dofb: "",
  sm_fathername: "",
  sm_birthplace: "",
  sm_province: "",
  sm_district: "",
  sm_divisional_secretariat: "",
  sm_gn_division: "",
  sm_korale: "",
  sm_pattu: "",
  sm_village: "",
  sm_viharadhipathi: "",
  sm_robing_date: "",
  sm_robing_name: "",
  sm_robing_tutor: "",
  sm_robing_tutor_residence: "",
  sm_robing_temple: "",
  sm_post_robing_temple: "",
  sil_declaration_date: "",
  sil_remarks: "",
  sil_currstat: "ST01",
  sil_student_signature: "false",
  sil_acharya_signature: "false",
  sil_aramadhipathi_signature: "false",
  sil_district_secretary_signature: "false",
};
