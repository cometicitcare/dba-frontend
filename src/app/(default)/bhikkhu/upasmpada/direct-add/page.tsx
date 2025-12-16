"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { FooterBar } from "@/components/FooterBar";
import {
  BhikkhuAutocomplete,
  BhikkhuCategorySelect,
  BhikkhuStatusSelect,
  DateField,
  LocationPicker,
  TempleAutocomplete,
  Errors,
  StepConfig,
  FieldConfig,
  toYYYYMMDD,
  validateField,
} from "@/components/Bhikku/Add";
import selectionsData from "@/utils/selectionsData.json";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { getStoredUserData } from "@/utils/userData";
import { _manageDirectHighBhikku } from "@/services/bhikku";
import { BHIKKU_MANAGEMENT_DEPARTMENT } from "@/utils/config"
type UpasampadaForm = {
  currentStatus: string;
  higherOrdinationPlace: string;
  higherOrdinationDate: string;
  karmacharyaName: string;
  upaddhyayaName: string;
  assumedName: string;
  residenceAtHigherOrdination: string;
  permanentResidence: string;
  residenceAtDeclaration: string;
  bhikshuPresiding: string;
  declarationDate: string;
  remarks: string;
};

const INITIAL_UPASAMPADA_FORM: UpasampadaForm = {
  currentStatus: "",
  higherOrdinationPlace: "",
  higherOrdinationDate: "",
  karmacharyaName: "",
  upaddhyayaName: "",
  assumedName: "",
  residenceAtHigherOrdination: "",
  permanentResidence: "",
  residenceAtDeclaration: "",
  bhikshuPresiding: "",
  declarationDate: "",
  remarks: "",
};

type BhikkhuForm = {
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
  br_form_id: string;

  br_nikaya: string;
  br_parshawaya: string;
  br_mahanayaka_name: string;
  br_mahanayaka_address: string;

  br_cat: string;
  br_mahanadate: string;
  br_mahananame: string;
  br_mahanaacharyacd: string;
  br_robing_tutor_residence: string;

  br_mahanatemple: string;
};

type WizardStep = StepConfig<BhikkhuForm> | { title: string; description?: string };

const BHIKKHU_STEPS: StepConfig<BhikkhuForm>[] = [
  {
    id: 1,
    title: "Personal Information",
    fields: [
      // { name: "br_cat", label: "Category", type: "text", rules: { required: true } },
      { name: "br_reqstdate", label: "Request Date", type: "date", rules: { required: true, maxDateToday: true } },
      { name: "br_dofb", label: "Date of Birth", type: "date", rules: { required: true, maxDateToday: true } },
      { name: "br_gihiname", label: "Full Name (Gihi Name)", type: "text", rules: { required: true } },
      { name: "br_form_id", label: "Form number", type: "text", rules: { required: true } },
      { name: "br_fathrname", label: "Father's Name", type: "text", rules: { required: true } },
      // {
      //   name: "br_email",
      //   label: "Email Address",
      //   type: "email",
      //   rules: { required: true, pattern: { regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Invalid email" } },
      // },
 
      // { name: "br_fathrsaddrs", label: "Father's Address", type: "text", rules: { required: true } },
      // {
      //   name: "br_fathrsmobile",
      //   label: "Father's Mobile",
      //   type: "tel",
      //   placeholder: "07XXXXXXXX",
      //   rules: { required: true, custom: (v) => (v.length === 10 && v.startsWith("07") ? undefined : "Must be 10 digits (e.g., 07XXXXXXXX)") },
      // },
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
      { name: "br_nikaya", label: "Name of Nikaya", type: "text", rules: { required: true } },
      { name: "br_parshawaya", label: "Name of Chapter", type: "text", rules: { required: true } },
      { name: "br_mahanayaka_name", label: "Name of Mahanayaka Thera or Nayaka Thero of the Nikaya", type: "text", rules: { required: true } },
      { name: "br_mahanayaka_address", label: "Full postal address of the Mahanayaka Thera or Nayaka Theri of the Nikaya", type: "textarea", rows: 4, rules: { required: true } },
    ],
  },
  {
    id: 4,
    title: "Robing Informations",
    fields: [
      { name: "br_mahanadate", label: "Date of robing", type: "date", rules: { required: true, maxDateToday: true } },
      { name: "br_mahananame", label: "Samanera Name (optional)", type: "text", rules: { required: false } },
      { name: "br_mahanaacharyacd", label: "Name of robing tutor", type: "text", rules: { required: true } },
      { name: "br_robing_tutor_residence", label: "Name of robing tutor's residence", type: "text", rules: { required: true } },
      { name: "br_mahanatemple", label: "Temple where robing took place", type: "text", rules: { required: true } },
    ],
  },
];

const BHIKKHU_INITIAL_VALUES: Partial<BhikkhuForm> = {
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
  br_form_id: "",

  br_nikaya: "",
  br_parshawaya: "",
  br_mahanayaka_name: "",
  br_mahanayaka_address: "",

  br_cat: "",

  br_mahanadate: "",
  br_mahananame: "",
  br_mahanaacharyacd: "",
  br_robing_tutor_residence: "",

  br_mahanatemple: "",
};

const UPASAMPADA_STEPS = [
  {
    title: "Higher Ordination",
    description: "Capture the ceremony specifics for higher ordination.",
  },
  {
    title: "Declaration & Status",
    description: "Capture declaration registers, current status, and any remarks.",
  },
];

const REVIEW_STEP = {
  title: "Review & Confirm",
  description: "Double-check the Bhikkhu and Upasampada information before submission.",
};

const formatValueOrDash = (value?: string) => (value?.trim() ? value : "—");

const renderLabelWithStar = (label: string, required?: boolean) => (
  <>
    {label}
    {required && <span className="text-red-500 ml-1">*</span>}
  </>
);

type UpasReviewFieldConfig = {
  key: keyof UpasampadaForm;
  label: string;
  format?: (value: string, form: UpasampadaForm) => string;
};

const UPAS_REVIEW_FIELDS: Record<number, UpasReviewFieldConfig[]> = {
  1: [
    { key: "higherOrdinationPlace", label: "Place of Higher Ordination" },
    { key: "higherOrdinationDate", label: "Date of Higher Ordination" },
    { key: "karmacharyaName", label: "Karmacharya" },
    { key: "upaddhyayaName", label: "Upaddhyaya" },
    { key: "assumedName", label: "Name assumed at Higher Ordination" },
    { key: "residenceAtHigherOrdination", label: "Residence at time of Higher Ordination" },
    { key: "permanentResidence", label: "Permanent Residence" },
    {
      key: "residenceAtDeclaration",
      label: "Residence at time of declaration, and full Postal Address",
    },
    { key: "bhikshuPresiding", label: "Name of Bhikshu presiding at Higher Ordination" },
  ],
  2: [
    { key: "currentStatus", label: "Current Status" },
    { key: "declarationDate", label: "Declaration Date" },
    { key: "remarks", label: "Remarks" },
  ],
};

const REQUIRED_UPAS_STEP_FIELDS: Record<number, Array<keyof UpasampadaForm>> = {
  1: [
    "higherOrdinationPlace",
    "higherOrdinationDate",
    "karmacharyaName",
    "upaddhyayaName",
    "assumedName",
    "residenceAtHigherOrdination",
    "permanentResidence",
    "residenceAtDeclaration",
    "bhikshuPresiding",
  ],
  2: ["currentStatus", "declarationDate"],
};

const STATIC_NIKAYA_DATA = Array.isArray((selectionsData as any)?.nikayas)
  ? ((selectionsData as any).nikayas as Array<{
      nikaya: { code: string; name: string };
      parshawayas: Array<{ code: string; name: string; remarks?: string; start_date?: string; nayaka_regn?: string; nayaka?: any }>;
      main_bhikku: any;
    }>)
  : [];

const NOVICE_CATEGORY_CODE = "CAT03";
const OPTIONAL_LOCATION_FIELDS: Array<string> = ["br_korale", "br_pattu", "br_division", "br_vilage", "br_gndiv"];


export default function DirectAddPage() {
  const router = useRouter();
  const bhikkhuStepsList = useMemo(() => {
    return BHIKKHU_STEPS.map((step) => {
      if (step.id === 2) {
        return {
          ...step,
          fields: step.fields.map((field) =>
            OPTIONAL_LOCATION_FIELDS.includes(field.name as string)
              ? {
                  ...field,
                  rules: field.rules ? { ...field.rules, required: false } : { required: false },
                }
              : field
          ),
        };
      }
      return step;
    });
  }, []);

  const combinedSteps = useMemo<WizardStep[]>(() => [...bhikkhuStepsList, ...UPASAMPADA_STEPS, REVIEW_STEP], [bhikkhuStepsList]);
  const totalSteps = combinedSteps.length;
  const [currentStep, setCurrentStep] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [values, setValues] = useState(() => ({
    ...BHIKKHU_INITIAL_VALUES,
    br_cat: NOVICE_CATEGORY_CODE,
  }));
  const [errors, setErrors] = useState<Errors<typeof values>>({});
  const [display, setDisplay] = useState<Record<string, string>>({});
  const sectionRef = useRef<HTMLFormElement | null>(null);
  const [accessChecked, setAccessChecked] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [upasampadaForm, setUpasampadaForm] = useState<UpasampadaForm>(INITIAL_UPASAMPADA_FORM);

  const isBhikkhuStep = currentStep <= bhikkhuStepsList.length;
  const upasampadaStepNumber = currentStep - bhikkhuStepsList.length;
  const isUpasampadaStep = upasampadaStepNumber > 0 && upasampadaStepNumber <= UPASAMPADA_STEPS.length;
  const isReviewStep = currentStep === combinedSteps.length;
  const isLastStep = currentStep === totalSteps;
  const currentStepItem = combinedSteps[currentStep - 1];
  const currentTitle = currentStepItem?.title ?? "";
  const currentDescription =
    currentStepItem && "description" in currentStepItem ? currentStepItem.description ?? "" : "";

  useEffect(() => {
    const stored = getStoredUserData();
    if (!stored || stored.department !== BHIKKU_MANAGEMENT_DEPARTMENT) {
      setAccessDenied(true);
      router.replace("/");
      return;
    }
    setAccessChecked(true);
  }, [router]);

  const scrollTop = () => {
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleInputChange = (name: keyof typeof values, value: string) => {
    setValues((prev) => {
      const next = { ...prev, [name]: value };
      const cfg = bhikkhuStepsList.flatMap((step) => step.fields).find((field) => field.name === name);
      if (cfg) {
        const message = validateField(cfg as any, value, next, today);
        setErrors((prevErrors) => ({ ...prevErrors, [name]: message }));
      }
      return next;
    });
  };

  const handleSetMany = (patch: Partial<typeof values>) => {
    setValues((prev) => {
      const next = { ...prev, ...patch };
      const cfgMap = new Map<string, FieldConfig<BhikkhuForm>>();
      bhikkhuStepsList.forEach((step) => step.fields.forEach((field) => cfgMap.set(String(field.name), field)));
      setErrors((prevErrors) => {
        const nextErrors = { ...prevErrors };
        Object.keys(patch).forEach((key) => {
          const cfg = cfgMap.get(key);
          if (cfg) {
            const raw = String((next as any)[key] ?? "");
            const fieldName = cfg.name as keyof typeof values;
            nextErrors[fieldName] = validateField(cfg, raw, next, today);
          }
        });
        return nextErrors;
      });
      return next;
    });
  };

  const clearTutorAndResidence = () => {
    handleInputChange("br_mahanaacharyacd", "");
    handleInputChange("br_robing_tutor_residence", "");
    setDisplay((prev) => ({
      ...prev,
      br_mahanaacharyacd: "",
      br_robing_tutor_residence: "",
    }));
  };

  const formatBhikkhuFieldValue = (name: keyof BhikkhuForm) => {
    const raw = (values[name] as string) ?? "";
    const value = formatValueOrDash(raw);
    switch (name) {
      case "br_nikaya":
        return display.br_nikaya ?? value;
      case "br_parshawaya":
        return display.br_parshawaya ?? value;
      default:
        return value;
    }
  };

  const reviewSections = useMemo(() => {
    const sections = bhikkhuStepsList.map((step) => ({
      title: step.title,
      stepIndex: step.id,
      fields: step.fields.map((field) => ({
        label: field.label,
        value: formatBhikkhuFieldValue(field.name),
      })),
    }));

    UPASAMPADA_STEPS.forEach((step, idx) => {
      const stepNumber = idx + 1;
      const configs = UPAS_REVIEW_FIELDS[stepNumber] ?? [];
      sections.push({
        title: step.title,
        stepIndex: bhikkhuStepsList.length + stepNumber,
        fields: configs.map((config) => {
          const raw = upasampadaForm[config.key];
          const value = config.format ? config.format(raw, upasampadaForm) : formatValueOrDash(raw);
          return { label: config.label, value };
        }),
      });
    });

    return sections;
  }, [bhikkhuStepsList, upasampadaForm, values, display]);

  const validateStep = (stepIndex: number) => {
    const step = bhikkhuStepsList[stepIndex - 1];
    if (!step) return true;
    const nextErrors: Errors<typeof values> = { ...errors };
    let valid = true;
    for (const field of step.fields) {
      const raw = values[field.name] as string | undefined;
      const msg = validateField(field as any, raw, values, today);
      nextErrors[field.name] = msg;
      if (msg) valid = false;
    }
    setErrors(nextErrors);
    if (!valid) scrollTop();
    return valid;
  };

  const validateAllBhikkhu = () => {
    const aggregated: Errors<typeof values> = {};
    let firstInvalidStep: number | null = null;
    bhikkhuStepsList.forEach((step) => {
      let stepValid = true;
      for (const field of step.fields) {
        const raw = values[field.name] as string | undefined;
        const msg = validateField(field as any, raw, values, today);
        aggregated[field.name] = msg;
        if (msg && firstInvalidStep == null) {
          firstInvalidStep = step.id;
        }
        if (msg) stepValid = false;
      }
      if (!stepValid && firstInvalidStep == null) {
        firstInvalidStep = step.id;
      }
    });
    setErrors(aggregated);
    return firstInvalidStep;
  };

  const isUpasampadaStepValid = (stepNo: number) => {
    const required = REQUIRED_UPAS_STEP_FIELDS[stepNo] ?? [];
    return required.every((field) => (upasampadaForm[field] ?? "").trim().length > 0);
  };

  const getFirstInvalidUpasStep = () => {
    for (const stepNoString of Object.keys(REQUIRED_UPAS_STEP_FIELDS)) {
      const stepNo = Number(stepNoString);
      if (!isUpasampadaStepValid(stepNo)) return stepNo;
    }
    return null;
  };

  const handleNext = () => {
    if (isReviewStep) {
      return;
    }

    if (isBhikkhuStep) {
      if (!validateStep(currentStep)) return;
    } else {
      if (!isUpasampadaStepValid(upasampadaStepNumber)) {
        toast.info("Please fill all required fields before continuing.");
        return;
      }
    }
    setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
    scrollTop();
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    scrollTop();
  };

  const formatDateField = (value?: string) => toYYYYMMDD(value);

  const buildPayload = () => {
    const data: Record<string, string> = {
      dbh_reqstdate: formatDateField(values.br_reqstdate),
      dbh_birthpls: values.br_birthpls ?? "",
      dbh_province: values.br_province ?? "",
      dbh_district: values.br_district ?? "",
      dbh_korale: values.br_korale ?? "",
      dbh_pattu: values.br_pattu ?? "",
      dbh_division: values.br_division ?? "",
      dbh_vilage: values.br_vilage ?? "",
      dbh_gndiv: values.br_gndiv ?? "",
      dbh_form_id: values.br_form_id ?? "",
      dbh_gihiname: values.br_gihiname ?? "",
      dbh_dofb: formatDateField(values.br_dofb),
      dbh_fathrname: values.br_fathrname ?? "",
      dbh_parshawaya: values.br_parshawaya ?? "",
      dbh_mahanatemple: values.br_mahanatemple ?? "",
      dbh_mahanaacharyacd: values.br_mahanaacharyacd ?? "",
      dbh_mahananame: values.br_mahananame ?? "",
      dbh_mahanadate: formatDateField(values.br_mahanadate),
      dbh_cat: values.br_cat ?? NOVICE_CATEGORY_CODE,
      dbh_nikaya: values.br_nikaya ?? "",
      dbh_mahanayaka_name: values.br_mahanayaka_name ?? "",
      dbh_mahanayaka_address: values.br_mahanayaka_address ?? "",
      dbh_declaration_date: formatDateField(upasampadaForm.declarationDate),
      dbh_robing_tutor_residence: values.br_robing_tutor_residence ?? "",
      dbh_email: values.br_email ?? "",
      dbh_mobile: values.br_mobile ?? "",
      dbh_fathrsaddrs: values.br_fathrsaddrs ?? "",
      dbh_fathrsmobile: values.br_fathrsmobile ?? "",
      // Upasampada fields
      dbh_higher_ordination_place: upasampadaForm.higherOrdinationPlace ?? "",
      dbh_higher_ordination_date: formatDateField(upasampadaForm.higherOrdinationDate),
      dbh_higher_ordination_karmaacharya: upasampadaForm.karmacharyaName ?? "",
      dbh_higher_ordination_upaadhyaaya: upasampadaForm.upaddhyayaName ?? "",
      dbh_name_assumed_at_higher_ordination: upasampadaForm.assumedName ?? "",
      dbh_residence_at_time_of_higher_ordination: upasampadaForm.residenceAtHigherOrdination ?? "",
      dbh_permanent_residence: upasampadaForm.permanentResidence ?? "",
      dbh_residence_at_time_of_declaration_and_full_postal_address:
        upasampadaForm.residenceAtDeclaration ?? "",
      dbh_name_of_bhikshu_presiding_at_higher_ordination: upasampadaForm.bhikshuPresiding ?? "",
      dbh_u_date_declaration: formatDateField(upasampadaForm.declarationDate),
      dbh_remarks_upasampada: upasampadaForm.remarks ?? "",
      dbh_currstat: upasampadaForm.currentStatus ?? "",
    };
    return {
      action: "CREATE",
      payload: {
        data,
      },
    };
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isLastStep) {
      handleNext();
      return;
    }
    const firstInvalidBhikkhuStep = validateAllBhikkhu();
    if (firstInvalidBhikkhuStep) {
      setCurrentStep(firstInvalidBhikkhuStep);
      scrollTop();
      return;
    }
    const firstInvalidUpasStep = getFirstInvalidUpasStep();
    if (firstInvalidUpasStep) {
      setCurrentStep(bhikkhuStepsList.length + firstInvalidUpasStep);
      scrollTop();
      toast.error("Fill required Upasampada information before submitting.");
      return;
    }

    const payload = buildPayload();
    try {
      setSubmitting(true);
      await _manageDirectHighBhikku(payload);
      toast.success("Direct high Bhikkhu record created.", {
        autoClose: 1200,
        onClose: () => router.push("/bhikkhu"),
      });
      setTimeout(() => router.push("/bhikkhu"), 1400);
    } catch (error: any) {
      const message = error?.message ?? "Failed to create direct high Bhikkhu.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const onPickNikaya = useCallback(
    (code: string) => {
      const item = STATIC_NIKAYA_DATA.find((n) => n.nikaya.code === code);
      handleInputChange("br_nikaya", code);
      setDisplay((prev) => ({
        ...prev,
        br_nikaya: item ? `${item.nikaya.name} - ${item.nikaya.code}` : code,
      }));

      const autoName = item?.main_bhikku?.mahananame ?? "";
      const autoAddr = item?.main_bhikku?.address ?? "";
      const autoParsha = item?.main_bhikku?.parshawaya ?? "";

      handleSetMany({
        br_mahanayaka_name: autoName,
        br_mahanayaka_address: autoAddr,
        br_parshawaya: autoParsha,
      });

      if (autoParsha) {
        const matched = item?.parshawayas.find((p) => p.code === autoParsha);
        if (matched) {
          setDisplay((prev) => ({ ...prev, br_parshawaya: `${matched.name} - ${matched.code}` }));
        }
      } else {
        setDisplay((prev) => ({ ...prev, br_parshawaya: "" }));
      }
    },
    [handleInputChange, handleSetMany]
  );

  const onPickParshawa = useCallback(
    (code: string) => {
      handleInputChange("br_parshawaya", code);
      const nikaya = STATIC_NIKAYA_DATA.find((n) => n.nikaya.code === values.br_nikaya);
      const parsha = nikaya?.parshawayas.find((p) => p.code === code);
      if (parsha) {
        setDisplay((prev) => ({ ...prev, br_parshawaya: `${parsha.name} - ${parsha.code}` }));
      }
    },
    [values.br_nikaya, handleInputChange]
  );

  if (accessDenied) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm font-medium text-red-600">You do not have access to this section.</p>
      </div>
    );
  }

  if (!accessChecked) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">Checking access...</p>
      </div>
    );
  }

  const gridCols = currentTitle === "Birth Location" ? "md:grid-cols-3" : "md:grid-cols-2";
  const locationSelection = {
    provinceCode: (values.br_province as string) || undefined,
    districtCode: (values.br_district as string) || undefined,
    divisionCode: (values.br_division as string) || undefined,
    gnCode: (values.br_gndiv as string) || undefined,
  };

  const renderBhikkhuFields = () => {
    const currentConfig = bhikkhuStepsList[currentStep - 1];
    if (!currentConfig) return null;
    return (
      <div className={`grid grid-cols-1 ${gridCols} gap-5`}>
        {currentConfig.fields.map((field) => {
          const name = field.name as string;
          const value = (values[field.name] as string) ?? "";
          const error = errors[field.name];

          if (name === "br_province") {
            return (
              <div key={name} className={currentTitle === "Birth Location" ? "md:col-span-3" : "md:col-span-2"}>
                <LocationPicker
                  value={locationSelection}
                  onChange={(sel) => {
                    handleSetMany({
                      br_province: sel.provinceCode ?? "",
                      br_district: sel.districtCode ?? "",
                      br_division: sel.divisionCode ?? "",
                      br_gndiv: sel.gnCode ?? "",
                    });
                  }}
                  required
                />
                {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
              </div>
            );
          }

          if (name === "br_birthpls") {
            return (
              <div key={name} className={currentTitle === "Birth Location" ? "md:col-span-3" : undefined}>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {renderLabelWithStar(field.label, field.rules?.required)}
                </label>
                <input
                  id={name}
                  value={value}
                  onChange={(e) => handleInputChange(field.name, e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                />
                {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
              </div>
            );
          }

          if (name === "br_nikaya") {
            return (
              <div key={name}>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {renderLabelWithStar(field.label, field.rules?.required)}
                </label>
                <select
                  id={name}
                  value={values.br_nikaya ?? ""}
                  onChange={(e) => onPickNikaya(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                >
                  <option value="">Select Nikaya</option>
                  {STATIC_NIKAYA_DATA.map((nikaya) => (
                    <option key={nikaya.nikaya.code} value={nikaya.nikaya.code}>
                      {nikaya.nikaya.name} - {nikaya.nikaya.code}
                    </option>
                  ))}
                </select>
                {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
              </div>
            );
          }

          if (name === "br_parshawaya") {
            const options = STATIC_NIKAYA_DATA.find((n) => n.nikaya.code === values.br_nikaya)?.parshawayas ?? [];
            return (
              <div key={name}>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {renderLabelWithStar(field.label, field.rules?.required)}
                </label>
                <select
                  id={name}
                  value={values.br_parshawaya ?? ""}
                  onChange={(e) => onPickParshawa(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent disabled:bg-slate-100"
                  disabled={!values.br_nikaya || options.length === 0}
                >
                  <option value="">{values.br_nikaya ? "Select Chapter" : "Select Nikaya first"}</option>
                  {options.map((parsha) => (
                    <option key={parsha.code} value={parsha.code}>
                      {parsha.name} - {parsha.code}
                    </option>
                  ))}
                </select>
                {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
              </div>
            );
          }

          if (name === "br_mahanayaka_name") {
            return (
              <div key={name}>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {renderLabelWithStar(field.label, field.rules?.required)}
                </label>
                <input
                  id={name}
                  value={value}
                  onChange={(e) => handleInputChange(field.name, e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                  placeholder="Auto-filled from Nikaya, editable"
                />
                {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
              </div>
            );
          }

          if (name === "br_mahanaacharyacd") {
            return (
              <div key={name}>
                <BhikkhuAutocomplete
                  id={name}
                  label={field.label}
                  required={!!field.rules?.required}
                  placeholder="Search and pick, auto-fill REGN"
                  storeRegn
                  initialDisplay={display[name] ?? ""}
                  onInputChange={(value) => {
                    if (!value.trim()) {
                      clearTutorAndResidence();
                    }
                  }}
                  onPick={({ regn, display: disp, data }) => {
                    handleInputChange("br_mahanaacharyacd", regn ?? "");
                    setDisplay((prev) => ({ ...prev, br_mahanaacharyacd: disp }));
                    const tutorResidence = data?.br_robing_tutor_residence;
                    if (tutorResidence?.vh_trn) {
                      const residencyName = tutorResidence.vh_vname ?? "";
                      const residenceDisplay = residencyName
                        ? `${residencyName} ƒ?" ${tutorResidence.vh_trn}`
                        : tutorResidence.vh_trn;
                      handleInputChange("br_robing_tutor_residence", tutorResidence.vh_trn);
                      setDisplay((prev) => ({
                        ...prev,
                        br_robing_tutor_residence: residenceDisplay,
                      }));
                    } else {
                      handleInputChange("br_robing_tutor_residence", "");
                      setDisplay((prev) => ({ ...prev, br_robing_tutor_residence: "" }));
                    }
                  }}
                />
                {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
              </div>
            );
          }

          if (name === "br_robing_tutor_residence") {
            return (
              <div key={name}>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {renderLabelWithStar(field.label, field.rules?.required)}
                </label>
                <input
                  id={name}
                  type="text"
                  value={display[name] ?? (values.br_robing_tutor_residence ?? "")}
                  placeholder="Auto-populated from tutor selection"
                  readOnly
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-slate-100 text-slate-600"
                />
                {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
              </div>
            );
          }

          if (name === "br_mahanatemple") {
            return (
              <div key={name}>
                <TempleAutocomplete
                  id={name}
                  label={field.label}
                  required={!!field.rules?.required}
                  placeholder="Search temple, auto-fill TRN"
                  storeTrn
                  initialDisplay={display[name] ?? ""}
                  onPick={({ trn, display: disp }) => {
                    handleInputChange("br_mahanatemple", trn ?? "");
                    setDisplay((prev) => ({ ...prev, br_mahanatemple: disp }));
                  }}
                />
                {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
              </div>
            );
          }

          if (name === "br_cat") {
            return (
              <div key={name}>
                <BhikkhuCategorySelect id={name} label={field.label} value={values.br_cat ?? NOVICE_CATEGORY_CODE} disabled />
                {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
              </div>
            );
          }

          if (field.type === "textarea") {
            return (
          <div key={name} className={name === "br_mahanayaka_address" ? "md:col-span-2" : undefined}>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {renderLabelWithStar(field.label, field.rules?.required)}
            </label>
            <textarea
              id={name}
              value={value}
              rows={field.rows ?? 4}
              placeholder={field.placeholder}
              readOnly={name === "br_mahanayaka_address"}
              onChange={name === "br_mahanayaka_address" ? undefined : (e) => handleInputChange(field.name, e.target.value)}
              className={`w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all resize-none ${
                name === "br_mahanayaka_address" ? "bg-slate-100 text-slate-600" : ""
              }`}
            />
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          </div>
            );
          }

          if (field.type === "date") {
            return (
              <DateField
                key={name}
                id={name}
                label={field.label}
                value={value}
                placeholder="YYYY-MM-DD"
                required={!!field.rules?.required}
                error={error}
                onChange={(v) => handleInputChange(field.name, v)}
              />
            );
          }

          if (["br_district", "br_division", "br_gndiv"].includes(name)) {
            return null;
          }

          return (
            <div key={name}>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {renderLabelWithStar(field.label, field.rules?.required)}
              </label>
              <input
                id={name}
                type={field.type}
                value={value}
                placeholder={field.placeholder}
                onChange={(e) => handleInputChange(field.name, e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
              />
              {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          </div>
        );
      })}
    </div>
  );
};

  const updateUpasField = (field: keyof UpasampadaForm, value: string) => {
    setUpasampadaForm((prev) => ({ ...prev, [field]: value }));
  };

  const renderUpasampadaStep = () => {
    switch (upasampadaStepNumber) {
      case 1:
        return (
          <>
           <TextField
              id="assumed-name"
              label="Name assumed at Higher Ordination"
              value={upasampadaForm.assumedName}
              onChange={(value) => updateUpasField("assumedName", value)}
              required
            />
            <TempleAutocomplete
              id="residence-higher-ordination"
              label="Residence at time of Higher Ordination"
              required
              placeholder="Search temple, auto-fill TRN"
              storeTrn
              initialDisplay={display.residenceAtHigherOrdination ?? ""}
              onPick={({ trn, display: disp }) => {
                updateUpasField("residenceAtHigherOrdination", trn ?? "");
                setDisplay((prev) => ({ ...prev, residenceAtHigherOrdination: disp ?? "" }));
              }}
            />
            <TempleAutocomplete
              id="permanent-residence"
              label="Permanent Residence"
              required
              placeholder="Search temple, auto-fill TRN"
              storeTrn
              initialDisplay={display.permanentResidence ?? ""}
              onPick={({ trn, display: disp }) => {
                updateUpasField("permanentResidence", trn ?? "");
                setDisplay((prev) => ({ ...prev, permanentResidence: disp ?? "" }));
              }}
            />
            <TextField
              id="declaration-residence"
              label="Residence at time of declaration, and full Postal Address"
              value={upasampadaForm.residenceAtDeclaration}
              onChange={(value) => updateUpasField("residenceAtDeclaration", value)}
              required
              rows={3}
            />
            <BhikkhuAutocomplete
              id="bhikshu-presiding-name"
              label="Name of Bhikshu presiding at Higher Ordination"
              initialDisplay={upasampadaForm.bhikshuPresiding}
              onPick={({ display }) => updateUpasField("bhikshuPresiding", display ?? "")}
              required
            />
            <TempleAutocomplete
              id="place-higher-ordination"
              label="Place of Higher Ordination"
              required
              placeholder="Search temple, auto-fill TRN"
              storeTrn
              initialDisplay={display.higherOrdinationPlace ?? ""}
              onPick={({ trn, display: disp }) => {
                updateUpasField("higherOrdinationPlace", trn ?? "");
                setDisplay((prev) => ({ ...prev, higherOrdinationPlace: disp ?? "" }));
              }}
            />
            <DateField
              id="date-higher-ordination"
              label="Date of Higher Ordination"
              value={upasampadaForm.higherOrdinationDate}
              onChange={(value) => updateUpasField("higherOrdinationDate", value)}
              required
            />
            <BhikkhuAutocomplete
              id="karmacharya-name"
              label="Name of Karmacharya"
              initialDisplay={upasampadaForm.karmacharyaName}
              onPick={({ display }) => updateUpasField("karmacharyaName", display ?? "")}
              required
            />
            <BhikkhuAutocomplete
              id="upaddhyaya-name"
              label="Name of Upaddhyaya at Higher Ordination"
              initialDisplay={upasampadaForm.upaddhyayaName}
              onPick={({ display }) => updateUpasField("upaddhyayaName", display ?? "")}
              required
            />
           
          </>
        );
      case 2:
      default:
        return (
          <>
            <BhikkhuStatusSelect
              id="current-status"
              label="Current Status"
              value={upasampadaForm.currentStatus}
              onPick={({ code }) => updateUpasField("currentStatus", code)}
              required
            />
            <DateField
              id="declaration-date"
              label="Declaration Date"
              value={upasampadaForm.declarationDate}
              onChange={(value) => updateUpasField("declarationDate", value)}
              required
            />
            <TextField
              id="remarks"
              label="Remarks"
              value={upasampadaForm.remarks}
              onChange={(value) => updateUpasField("remarks", value)}
              rows={4}
            />
          </>
        );
    }
  };

  const renderReviewStep = () => (
    <div className="space-y-6">
      <p className="text-slate-600">Review your completed sections below. Use Edit to return to any part of the form.</p>
      {reviewSections.map((section) => (
        <div key={section.title} className="border border-slate-200 rounded-xl p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-slate-800">{section.title}</h3>
            <button className="px-3 py-1.5 text-sm bg-slate-200 rounded-lg hover:bg-slate-300" onClick={() => setCurrentStep(section.stepIndex)}>
              Edit
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {section.fields.map((field) => (
              <div key={field.label} className="bg-slate-50 rounded-lg p-3">
                <div className="text-xs text-slate-500">{field.label}</div>
                <div className="text-sm font-medium text-slate-800 break-words">{field.value}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="w-full min-h-screen bg-gray-50">
      <TopBar onMenuClick={() => setSidebarOpen((prev) => !prev)} />
      <Sidebar isOpen={sidebarOpen} />
      <div className={`transition-all duration-300 pt-16 ${sidebarOpen ? "ml-64" : "ml-0"}`}>
        <main className="p-2 mb-20">
          <div className="w-full">
            <div className="bg-white shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-6 md:px-10 py-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-white mb-1">Direct Upasampada Add</h1>
                  </div>
                </div>
              </div>

              <form className="px-4 md:px-10 py-6" ref={sectionRef} onSubmit={handleSubmit}>
                <div className="flex items-center justify-between mb-6">
                  {combinedSteps.map((step, idx) => {
                    const stepNumber = idx + 1;
                    return (
                      <div key={stepNumber} className="flex items-center flex-1">
                        <div className="flex flex-col items-center flex-1">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                              currentStep > stepNumber
                                ? "bg-green-500 text-white"
                                : currentStep === stepNumber
                                ? "bg-slate-700 text-white ring-4 ring-slate-200"
                                : "bg-slate-200 text-slate-400"
                            }`}
                          >
                            {currentStep > stepNumber ? "done" : stepNumber}
                          </div>
                          <span
                            className={`text-[11px] mt-2 font-medium text-center ${
                              currentStep >= stepNumber ? "text-slate-700" : "text-slate-400"
                            }`}
                          >
                            {step.title}
                          </span>
                        </div>
                        {idx < totalSteps - 1 && (
                          <div
                            className={`h-1 flex-1 mx-2 rounded transition-all duration-300 ${
                              currentStep > stepNumber ? "bg-green-500" : "bg-slate-200"
                            }`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="mb-4">
                  <h2 className="text-xl font-bold text-slate-800">{currentTitle}</h2>
                  {currentDescription && <p className="text-sm text-slate-500 mt-1">{currentDescription}</p>}
                </div>

                <div className="min-h-[360px]">
                  {isReviewStep
                    ? renderReviewStep()
                    : isBhikkhuStep
                      ? renderBhikkhuFields()
                      : <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{renderUpasampadaStep()}</div>}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handlePrevious}
                    disabled={currentStep === 1}
                    className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all ${
                      currentStep === 1 ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                    }`}
                  >
                    Back
                  </button>
                  <div className="flex items-center gap-3">
                    {!isLastStep && (
                      <button
                        type="button"
                        onClick={handleNext}
                        className="flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-700 text-white rounded-lg font-medium hover:bg-slate-800 transition-all"
                      >
                        Continue
                      </button>
                    )}
                    {isLastStep && (
                      <button
                        type="submit"
                        disabled={submitting}
                        className="flex items-center justify-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-all disabled:opacity-60"
                      >
                        {submitting ? "Submitting..." : "Submit"}
                      </button>
                    )}
                  </div>
                  <span className="text-sm text-slate-600 font-medium">
                    Step {currentStep} of {totalSteps}
                  </span>
                </div>
              </form>
            </div>
          </div>
        </main>
        <FooterBar />
      </div>
      <ToastContainer position="top-right" newestOnTop closeOnClick pauseOnHover />
    </div>
  );
}

type TextFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  rows?: number;
};

function TextField({ id, label, value, onChange, placeholder, required, rows }: TextFieldProps) {
  return (
    <div className="grid grid-cols-1">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-2">
        {renderLabelWithStar(label, required)}
      </label>
      {rows && rows > 1 ? (
        <textarea
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={rows}
          required={required}
          placeholder={placeholder}
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all resize-y"
        />
      ) : (
        <input
          id={id}
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required={required}
          placeholder={placeholder}
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
        />
      )}
    </div>
  );

}
