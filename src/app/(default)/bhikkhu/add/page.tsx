// File: src/app/(default)/bhikkhu/add/page.tsx
// ───────────────────────────────────────────────────────────────────────────────
"use client";

import React, { useMemo, useRef, useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { _getLocationData, _getGnDivitions } from "@/services/locationData";
import { _manageBhikku } from "@/services/bhikku";
import { _manageTemple } from "@/services/temple";
import { FooterBar } from "@/components/FooterBar";
import { TopBar } from "@/components/TopBar";
import { Sidebar } from "@/components/Sidebar";

// Avoid static prerender/export crashes for CSR pages using search params
export const dynamic = "force-dynamic";

/* ---------------- Types ---------------- */
type FieldRule<T> = {
  required?: boolean;
  pattern?: { regex: RegExp; message: string };
  maxDateToday?: boolean;
  custom?: (value: string, all: Partial<T>) => string | undefined;
};

type FieldConfig<T> = {
  name: keyof T;
  label: string;
  type: "text" | "email" | "tel" | "date" | "textarea";
  placeholder?: string;
  rows?: number;
  rules?: FieldRule<T>;
};

type StepConfig<T> = { id: number; title: string; fields: Array<FieldConfig<T>> };
type Errors<T> = Partial<Record<keyof T, string>>;

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

  br_viharadhipathi_name: string; // name text
  br_nikaya_name: string;
  br_parshawaya: string;
  br_mahanayaka_name: string; // stores br_regn
  br_mahanayaka_address: string;

  br_cat: string;
  br_currstat: string;
  br_residence_at_declaration: string;
  br_declaration_date: string;
  br_remarks: string;

  br_mahanadate: string;
  br_mahananame: string;
  br_mahanaacharyacd: string; // stores br_regn
  br_robing_tutor_residence: string; // stores vh_trn  ✅

  br_mahanatemple: string; // stores vh_trn
  br_robing_after_residence_temple: string; // stores vh_trn
};

const isPhoneLK = (v: string) => /^0\d{9}$/.test(v.trim());

/* ---------------- Search helpers ---------------- */
type BhikkhuOption = { regn: string; name: string };
async function searchBhikkhus(q: string, page = 1, limit = 10): Promise<BhikkhuOption[]> {
  const res = await _manageBhikku({
    action: "READ_ALL",
    payload: { skip: 0, limit, page, search_key: q ?? "" },
  } as any);
  const rows: any[] = (res as any)?.data?.data ?? [];
  return rows.map((r) => ({
    regn: r.br_regn,
    name: r.br_mahananame || r.br_gihiname || r.br_mahanayaka_name || r.br_regn,
  }));
}

type TempleOption = { trn: string; name: string };
async function searchTemples(q: string, page = 1, limit = 10): Promise<TempleOption[]> {
  const res = await _manageTemple({
    action: "READ_ALL",
    payload: { skip: 0, limit, page, search_key: q ?? "" },
  } as any);
  const rows: any[] = (res as any)?.data?.data ?? [];
  return rows.map((r) => ({
    trn: r.vh_trn,
    name: r.vh_vname || r.vh_trn,
  }));
}

/* ---------------- Steps ---------------- */
const bhikkhuSteps = (): StepConfig<BhikkhuForm>[] => [
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
      { name: "br_viharadhipathi_name", label: "Name of Viharadhipathi of temple of residence", type: "text", rules: { required: true } },
      { name: "br_nikaya_name", label: "Name of Nikaya", type: "text", rules: { required: true } },
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
      { name: "br_mahananame", label: "Name assumed at robing", type: "text", rules: { required: true } },
      { name: "br_mahanaacharyacd", label: "Name of robing tutor", type: "text", rules: { required: true } },
      { name: "br_robing_tutor_residence", label: "Name of robing tutor’s residence", type: "text", rules: { required: true } }, // autocomplete temple (vh_trn)
      { name: "br_mahanatemple", label: "Temple where robing took place", type: "text", rules: { required: true } }, // autocomplete temple (vh_trn)
      { name: "br_robing_after_residence_temple", label: "Temple of residence after robing", type: "text", rules: { required: true } }, // autocomplete temple (vh_trn)
    ],
  },
  {
    id: 5,
    title: "Additional Details",
    fields: [
      { name: "br_cat", label: "Category", type: "text", rules: { required: true } },
      { name: "br_currstat", label: "Current Status", type: "text", rules: { required: true } },
      { name: "br_residence_at_declaration", label: "Residence at time of declaration", type: "text", rules: { required: true } },
      { name: "br_declaration_date", label: "Date of making the declaration", type: "date", rules: { required: true, maxDateToday: true } },
      { name: "br_remarks", label: "Remarks", type: "textarea", rows: 4, rules: { required: true } },
    ],
  },
];

/* ---------------- Initial Values ---------------- */
const bhikkhuInitialValues: Partial<BhikkhuForm> = {
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

/* ---------------- Location UI ---------------- */
type Division = { dv_id: number; dv_dvcode: string; dv_distrcd: string; dv_dvname: string };
type District = { dd_id: number; dd_dcode: string; dd_dname: string; dd_prcode: string; divisional_secretariats: Division[] };
type Province = { cp_id: number; cp_code: string; cp_name: string; districts: District[] };
type GnDivision = { gn_code: string; gn_gnname: string; [k: string]: unknown };
type LocationSelection = { provinceCode?: string; districtCode?: string; divisionCode?: string; gnCode?: string };
type LocationPayload = { province?: Province; district?: District; division?: Division; gn?: GnDivision };

function LocationPicker({
  value,
  onChange,
  className,
  disabled = false,
  required = false,
  labels: labelsOverride,
}: {
  value?: LocationSelection;
  onChange?: (selection: LocationSelection, payload: LocationPayload) => void;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  labels?: Partial<{ province: string; district: string; division: string; gn: string }>;
}) {
  const labels = { province: "Province", district: "District", division: "Divisional Secretariat", gn: "GN Division", ...labelsOverride };

  const [provinces, setProvinces] = useState<Province[]>([]);
  const [gnDivisions, setGnDivisions] = useState<GnDivision[]>([]);
  const [loading, setLoading] = useState(true);
  const [gnLoading, setGnLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gnError, setGnError] = useState<string | null>(null);
  const [internal, setInternal] = useState<LocationSelection>({});

  const selection: LocationSelection = value ?? internal;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await _getLocationData();
        const arr = (result as any)?.data?.data as Province[] | undefined;
        if (!cancelled) setProvinces(Array.isArray(arr) ? arr : []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load locations");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const currentProvince = useMemo(() => provinces.find((p) => p.cp_code === selection.provinceCode), [provinces, selection.provinceCode]);
  const districts = currentProvince?.districts ?? [];
  const currentDistrict = useMemo(() => districts.find((d) => d.dd_dcode === selection.districtCode), [districts, selection.districtCode]);
  const divisions = currentDistrict?.divisional_secretariats ?? [];
  const currentDivision = useMemo(() => divisions.find((dv) => dv.dv_dvcode === selection.divisionCode), [divisions, selection.divisionCode]);
  const currentGn = useMemo(() => gnDivisions.find((g) => g.gn_code === selection.gnCode), [gnDivisions, selection.gnCode]);

  useEffect(() => {
    let cancelled = false;
    const code = currentDivision?.dv_dvcode;
    setGnError(null);
    setGnDivisions([]);
    if (!code) return;
    (async () => {
      try {
        setGnLoading(true);
        const res = await _getGnDivitions(code);
        const list = (res as any)?.data?.data as GnDivision[] | undefined;
        if (!cancelled) setGnDivisions(Array.isArray(list) ? list : []);
      } catch (err) {
        if (!cancelled) setGnError(err instanceof Error ? err.message : "Failed to load GN divisions");
      } finally {
        if (!cancelled) setGnLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentDivision?.dv_dvcode]);

  const emit = useCallback(
    (next: LocationSelection) => {
      onChange?.(next, { province: currentProvince, district: currentDistrict, division: currentDivision, gn: currentGn });
    },
    [onChange, currentProvince, currentDistrict, currentDivision, currentGn]
  );

  const setSelection = useCallback(
    (patch: Partial<LocationSelection>) => {
      const next = { ...(value ?? internal), ...patch };
      if (!value) setInternal(next);
      emit(next);
    },
    [emit, internal, value]
  );

  const handleProvince = (cp_code: string | "") => {
    const code = cp_code || undefined;
    setGnDivisions([]);
    setSelection({ provinceCode: code, districtCode: undefined, divisionCode: undefined, gnCode: undefined });
  };
  const handleDistrict = (dd_dcode: string | "") => {
    const code = dd_dcode || undefined;
    setGnDivisions([]);
    setSelection({ districtCode: code, divisionCode: undefined, gnCode: undefined });
  };
  const handleDivision = (dv_dvcode: string | "") => {
    const code = dv_dvcode || undefined;
    setSelection({ divisionCode: code, gnCode: undefined });
  };
  const handleGn = (gn_code: string | "") => {
    const code = gn_code || undefined;
    setSelection({ gnCode: code });
  };

  if (loading) return <div>Loading location…</div>;
  if (error) return <div role="alert">Error: {error}</div>;

  return (
    <div className={className}>
      <div className="mb-3">
        <label className="block mb-1 text-sm font-medium">{labels.province}</label>
        <select className="w-full border rounded-md px-3 py-2" value={selection.provinceCode ?? ""} onChange={(e) => handleProvince(e.target.value)} disabled={disabled} required={required}>
          <option value="">Select {labels.province}</option>
          {provinces.map((p) => (
            <option key={p.cp_code} value={p.cp_code}>
              {p.cp_name}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-3">
        <label className="block mb-1 text-sm font-medium">{labels.district}</label>
        <select className="w-full border rounded-md px-3 py-2" value={selection.districtCode ?? ""} onChange={(e) => handleDistrict(e.target.value)} disabled={disabled || !currentProvince} required={required}>
          <option value="">Select {labels.district}</option>
          {districts.map((d) => (
            <option key={d.dd_dcode} value={d.dd_dcode}>
              {d.dd_dname}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-3">
        <label className="block mb-1 text-sm font-medium">{labels.division}</label>
        <select className="w-full border rounded-md px-3 py-2" value={selection.divisionCode ?? ""} onChange={(e) => handleDivision(e.target.value)} disabled={disabled || !currentDistrict} required={required}>
          <option value="">Select {labels.division}</option>
          {divisions.map((dv) => (
            <option key={dv.dv_dvcode} value={dv.dv_dvcode}>
              {dv.dv_dvname}
            </option>
          ))}
        </select>
        {gnLoading && <p className="text-xs mt-1">Loading GN divisions…</p>}
        {gnError && <p className="text-xs text-red-600 mt-1" role="alert">{gnError}</p>}
      </div>

      <div className="mb-1">
        <label className="block mb-1 text-sm font-medium">{labels.gn}</label>
        <select className="w-full border rounded-md px-3 py-2" value={selection.gnCode ?? ""} onChange={(e) => handleGn(e.target.value)} disabled={disabled || !currentDivision || gnLoading || !gnDivisions.length} required={required}>
          <option value="">Select {labels.gn}</option>
          {gnDivisions.map((g) => (
            <option key={g.gn_code} value={g.gn_code}>{g.gn_gnname}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

/* ---------------- Autocomplete widgets ---------------- */
function BhikkhuAutocomplete({
  id,
  label,
  placeholder,
  required,
  initialDisplay = "",
  onPick,
  storeRegn = true,
}: {
  id: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  initialDisplay?: string;
  onPick: (picked: { regn?: string; name?: string; display: string }) => void;
  storeRegn?: boolean;
}) {
  const [input, setInput] = useState<string>(initialDisplay);
  const [options, setOptions] = useState<BhikkhuOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [debounceKey, setDebounceKey] = useState(0);

  useEffect(() => {
    const key = debounceKey;
    const h = setTimeout(async () => {
      const q = input?.trim() ?? "";
      setLoading(true);
      try {
        const rows = await searchBhikkhus(q, 1, 10);
        if (key === debounceKey) setOptions(rows);
      } finally {
        if (key === debounceKey) setLoading(false);
      }
    }, 300);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, debounceKey]);

  const handleSelect = (opt: BhikkhuOption) => {
    const display = `${opt.name} — ${opt.regn}`;
    onPick(storeRegn ? { regn: opt.regn, display } : { name: opt.name, display });
    setInput(display);
    setOpen(false);
  };

  return (
    <div className="relative">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-2">{label}</label>
      <input
        id={id}
        type="text"
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          setDebounceKey((k) => k + 1);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder ?? "Type a name / REGN…"}
        required={required}
        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
        autoComplete="off"
      />
      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-auto">
          {loading && <div className="px-3 py-2 text-sm text-slate-500">Searching…</div>}
          {!loading && options.length === 0 && <div className="px-3 py-2 text-sm text-slate-500">No matches</div>}
          {options.map((o) => (
            <button key={o.regn} type="button" onClick={() => handleSelect(o)} className="w-full text-left px-3 py-2 hover:bg-slate-50">
              <div className="text-sm font-medium text-slate-800">{o.name}</div>
              <div className="text-xs text-slate-500">{o.regn}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TempleAutocomplete({
  id,
  label,
  placeholder,
  required,
  initialDisplay = "",
  onPick,
  storeTrn = true,
}: {
  id: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  initialDisplay?: string;
  onPick: (picked: { trn?: string; name?: string; display: string }) => void;
  storeTrn?: boolean;
}) {
  const [input, setInput] = useState<string>(initialDisplay);
  const [options, setOptions] = useState<TempleOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [debounceKey, setDebounceKey] = useState(0);

  useEffect(() => {
    const key = debounceKey;
    const h = setTimeout(async () => {
      const q = input?.trim() ?? "";
      setLoading(true);
      try {
        const rows = await searchTemples(q, 1, 10);
        if (key === debounceKey) setOptions(rows);
      } finally {
        if (key === debounceKey) setLoading(false);
      }
    }, 300);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, debounceKey]);

  const handleSelect = (opt: TempleOption) => {
    const display = `${opt.name} — ${opt.trn}`;
    onPick(storeTrn ? { trn: opt.trn, display } : { name: opt.name, display });
    setInput(display);
    setOpen(false);
  };

  return (
    <div className="relative">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-2">{label}</label>
      <input
        id={id}
        type="text"
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          setDebounceKey((k) => k + 1);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder ?? "Type a temple name / TRN…"}
        required={required}
        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
        autoComplete="off"
      />
      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-auto">
          {loading && <div className="px-3 py-2 text-sm text-slate-500">Searching…</div>}
          {!loading && options.length === 0 && <div className="px-3 py-2 text-sm text-slate-500">No matches</div>}
          {options.map((o) => (
            <button key={o.trn} type="button" onClick={() => handleSelect(o)} className="w-full text-left px-3 py-2 hover:bg-slate-50">
              <div className="text-sm font-medium text-slate-800">{o.name}</div>
              <div className="text-xs text-slate-500">{o.trn}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- Validation & utils ---------------- */
function validateField<T>(field: FieldConfig<T>, value: string | undefined, all: Partial<T>, today: string): string {
  const v = (value ?? "").trim();
  const rules = field.rules ?? {};
  if (rules.required && !v) return "Required";
  if (rules.pattern && v && !rules.pattern.regex.test(v)) return rules.pattern.message;
  if (field.type === "date" && rules.maxDateToday && v && v > today) return "Date cannot be in the future";
  if (rules.custom) {
    const msg = rules.custom(v, all);
    if (msg) return msg;
  }
  return "";
}

async function safeReadText(res: Response) {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

/* ---------------- Inner Page (uses hooks) ---------------- */
function AddBhikkhuPageInner() {
  const search = useSearchParams();
  const bhikkhuId = search.get("id") || undefined;

  const steps = useMemo(() => bhikkhuSteps(), []);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [values, setValues] = useState<Partial<BhikkhuForm>>(bhikkhuInitialValues);
  const [errors, setErrors] = useState<Errors<BhikkhuForm>>({});
  const [submitting, setSubmitting] = useState(false);
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const reviewEnabled = true;
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const effectiveSteps: Array<StepConfig<BhikkhuForm>> = useMemo(() => {
    if (!reviewEnabled) return steps;
    return [...steps, { id: steps.length + 1, title: "Review & Confirm", fields: [] }];
  }, [steps, reviewEnabled]);

  const isReview = reviewEnabled && currentStep === effectiveSteps.length;
  const current = effectiveSteps[currentStep - 1];
  const stepTitle = current?.title ?? "";

  const fieldLabels: Record<string, string> = useMemo(() => {
    const map: Record<string, string> = {};
    steps.forEach((s) => s.fields.forEach((f) => (map[String(f.name)] = f.label)));
    return map;
  }, [steps]);

  const scrollTop = () => sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const handleInputChange = (name: keyof BhikkhuForm, value: string) => {
    setValues((prev) => {
      const next = { ...prev, [name]: value };
      const cfg = steps.flatMap((s) => s.fields).find((f) => f.name === name);
      if (cfg) {
        const msg = validateField(cfg, value, next, today);
        setErrors((e) => ({ ...e, [name]: msg }));
      }
      return next;
    });
  };

  const handleSetMany = (patch: Partial<BhikkhuForm>) => {
    setValues((prev) => {
      const next = { ...prev, ...patch };
      const cfgMap = new Map<string, FieldConfig<BhikkhuForm>>();
      steps.forEach((s) => s.fields.forEach((f) => cfgMap.set(String(f.name), f)));
      const nextErrors: Errors<BhikkhuForm> = { ...errors };
      Object.keys(patch).forEach((k) => {
        const cfg = cfgMap.get(k);
        if (cfg) {
          const raw = String((next as any)[k] ?? "");
          nextErrors[cfg.name as keyof BhikkhuForm] = validateField(cfg, raw, next, today);
        }
      });
      setErrors(nextErrors);
      return next;
    });
  };

  const validateStep = (stepIndex: number): boolean => {
    const step = effectiveSteps[stepIndex - 1];
    if (!step) return true;
    const nextErrors: Errors<BhikkhuForm> = { ...errors };
    let valid = true;
    for (const f of step.fields) {
      const raw = values[f.name] as unknown as string | undefined;
      const msg = validateField(f, raw, values, today);
      nextErrors[f.name] = msg;
      if (msg) valid = false;
    }
    setErrors(nextErrors);
    if (!valid) scrollTop();
    return valid;
  };

  const validateAll = (): { ok: boolean; firstInvalidStep: number | null } => {
    let firstInvalidStep: number | null = null;
    const aggregated: Errors<BhikkhuForm> = {};
    for (const step of steps) {
      let stepValid = true;
      for (const f of step.fields) {
        const raw = values[f.name] as unknown as string | undefined;
        const msg = validateField(f, raw, values, today);
        aggregated[f.name] = msg;
        if (msg) stepValid = false;
      }
      if (!stepValid && firstInvalidStep == null) firstInvalidStep = step.id;
    }
    setErrors(aggregated);
    return { ok: firstInvalidStep == null, firstInvalidStep };
  };

  const handleNext = () => {
    if (currentStep < effectiveSteps.length && validateStep(currentStep)) setCurrentStep((s) => s + 1);
  };
  const handlePrevious = () => {
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  };

  async function upsertBhikkhu(payload: Partial<BhikkhuForm>) {
    const endpoint = bhikkhuId ? `/api/bhikkhu/${encodeURIComponent(bhikkhuId)}` : `/api/bhikkhu`;
    const method = bhikkhuId ? "PUT" : "POST";
    const res = await fetch(endpoint, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!res.ok) {
      const msg = await safeReadText(res);
      throw new Error(msg || `Request failed (${res.status})`);
    }
    alert(bhikkhuId ? "Bhikkhu updated successfully." : "Bhikkhu created successfully.");
  }

  const handleSubmit = async () => {
    const { ok, firstInvalidStep } = validateAll();
    if (!ok && firstInvalidStep) {
      setCurrentStep(firstInvalidStep);
      scrollTop();
      return;
    }
    try {
      setSubmitting(true);
      await upsertBhikkhu(values);
    } finally {
      setSubmitting(false);
    }
  };

  // Friendly display for review/autocomplete fields
  const [display, setDisplay] = useState<{
    br_viharadhipathi_name?: string;
    br_mahanayaka_name?: string;
    br_mahanaacharyacd?: string;
    br_mahanatemple?: string;
    br_robing_after_residence_temple?: string;
    br_robing_tutor_residence?: string;
  }>({});

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
                    <h1 className="text-2xl font-bold text-white mb-1">Registration Form</h1>
                    <p className="text-slate-300 text-sm">Please complete all required information</p>
                  </div>
                </div>
              </div>

              <div className="px-4 md:px-10 py-6" ref={sectionRef}>
                {/* Stepper */}
                <div className="flex items-center justify-between mb-8">
                  {effectiveSteps.map((step, idx) => (
                    <div key={step.id} className="flex items-center flex-1">
                      <div className="flex flex-col items-center flex-1">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-300 ${currentStep > step.id ? "bg-green-500 text-white" : currentStep === step.id ? "bg-slate-700 text-white ring-4 ring-slate-200" : "bg-slate-200 text-slate-400"}`}>
                          {currentStep > step.id ? "✓" : step.id}
                        </div>
                        <span className={`text-xs mt-2 font-medium text-center ${currentStep >= step.id ? "text-slate-700" : "text-slate-400"}`}>{step.title}</span>
                      </div>
                      {idx < effectiveSteps.length - 1 && <div className={`h-1 flex-1 mx-2 rounded transition-all duration-300 ${currentStep > step.id ? "bg-green-500" : "bg-slate-200"}`} />}
                    </div>
                  ))}
                </div>

                {/* Form sections */}
                <div className="min-h-[400px]">
                  <h2 className="text-xl font-bold text-slate-800 mb-6">{stepTitle}</h2>

                  {!isReview && (
                    <div className="space-y-5">
                      {current.fields.map((f) => {
                        const id = String(f.name);
                        const val = (values[f.name] as unknown as string) ?? "";
                        const err = errors[f.name];

                        if (id === "br_province") {
                          const selection = {
                            provinceCode: (values.br_province as string) || undefined,
                            districtCode: (values.br_district as string) || undefined,
                            divisionCode: (values.br_division as string) || undefined,
                            gnCode: (values.br_gndiv as string) || undefined,
                          };
                          return (
                            <div key={id} className="grid grid-cols-1">
                              <label className="block text-sm font-medium text-slate-700 mb-2">{f.label}</label>
                              <LocationPicker
                                value={selection}
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
                              {err ? <p className="mt-1 text-sm text-red-600">{err}</p> : null}
                            </div>
                          );
                        }

                        if (id === "br_viharadhipathi_name") {
                          return (
                            <div key={id}>
                              <BhikkhuAutocomplete
                                id={id}
                                label={f.label}
                                required={!!f.rules?.required}
                                placeholder="Type a Viharadhipathi name…"
                                storeRegn={false}
                                initialDisplay={display.br_viharadhipathi_name ?? ""}
                                onPick={({ name, display: disp }) => {
                                  handleInputChange("br_viharadhipathi_name", name ?? "");
                                  setDisplay((d) => ({ ...d, br_viharadhipathi_name: disp }));
                                }}
                              />
                              {err ? <p className="mt-1 text-sm text-red-600">{err}</p> : null}
                            </div>
                          );
                        }

                        if (id === "br_mahanayaka_name") {
                          return (
                            <div key={id}>
                              <BhikkhuAutocomplete
                                id={id}
                                label={f.label}
                                required={!!f.rules?.required}
                                placeholder="Search and pick — saves REGN"
                                storeRegn={true}
                                initialDisplay={display.br_mahanayaka_name ?? ""}
                                onPick={({ regn, display: disp }) => {
                                  handleInputChange("br_mahanayaka_name", regn ?? "");
                                  setDisplay((d) => ({ ...d, br_mahanayaka_name: disp }));
                                }}
                              />
                              {err ? <p className="mt-1 text-sm text-red-600">{err}</p> : null}
                            </div>
                          );
                        }

                        if (id === "br_mahanaacharyacd") {
                          return (
                            <div key={id}>
                              <BhikkhuAutocomplete
                                id={id}
                                label={f.label}
                                required={!!f.rules?.required}
                                placeholder="Search and pick — saves REGN"
                                storeRegn={true}
                                initialDisplay={display.br_mahanaacharyacd ?? ""}
                                onPick={({ regn, display: disp }) => {
                                  handleInputChange("br_mahanaacharyacd", regn ?? "");
                                  setDisplay((d) => ({ ...d, br_mahanaacharyacd: disp }));
                                }}
                              />
                              {err ? <p className="mt-1 text-sm text-red-600">{err}</p> : null}
                            </div>
                          );
                        }

                        if (id === "br_robing_tutor_residence") {
                          return (
                            <div key={id}>
                              <TempleAutocomplete
                                id={id}
                                label={f.label}
                                required={!!f.rules?.required}
                                placeholder="Search temple — saves TRN"
                                storeTrn={true}
                                initialDisplay={display.br_robing_tutor_residence ?? ""}
                                onPick={({ trn, display: disp }) => {
                                  handleInputChange("br_robing_tutor_residence", trn ?? "");
                                  setDisplay((d) => ({ ...d, br_robing_tutor_residence: disp }));
                                }}
                              />
                              {err ? <p className="mt-1 text-sm text-red-600">{err}</p> : null}
                            </div>
                          );
                        }

                        if (id === "br_mahanatemple") {
                          return (
                            <div key={id}>
                              <TempleAutocomplete
                                id={id}
                                label={f.label}
                                required={!!f.rules?.required}
                                placeholder="Search temple — saves TRN"
                                storeTrn={true}
                                initialDisplay={display.br_mahanatemple ?? ""}
                                onPick={({ trn, display: disp }) => {
                                  handleInputChange("br_mahanatemple", trn ?? "");
                                  setDisplay((d) => ({ ...d, br_mahanatemple: disp }));
                                }}
                              />
                              {err ? <p className="mt-1 text-sm text-red-600">{err}</p> : null}
                            </div>
                          );
                        }

                        if (id === "br_robing_after_residence_temple") {
                          return (
                            <div key={id}>
                              <TempleAutocomplete
                                id={id}
                                label={f.label}
                                required={!!f.rules?.required}
                                placeholder="Search temple — saves TRN"
                                storeTrn={true}
                                initialDisplay={display.br_robing_after_residence_temple ?? ""}
                                onPick={({ trn, display: disp }) => {
                                  handleInputChange("br_robing_after_residence_temple", trn ?? "");
                                  setDisplay((d) => ({ ...d, br_robing_after_residence_temple: disp }));
                                }}
                              />
                              {err ? <p className="mt-1 text-sm text-red-600">{err}</p> : null}
                            </div>
                          );
                        }

                        if (f.type === "textarea") {
                          return (
                            <div key={id}>
                              <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-2">{f.label}</label>
                              <textarea
                                id={id}
                                value={val}
                                rows={f.rows ?? 4}
                                onChange={(e) => handleInputChange(f.name, e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all resize-none"
                                placeholder={f.placeholder}
                              />
                              {err ? <p className="mt-1 text-sm text-red-600">{err}</p> : null}
                            </div>
                          );
                        }

                        if (f.type === "date") {
                          return (
                            <div key={id} className="grid grid-cols-1">
                              <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-2">{f.label}</label>
                              <input
                                id={id}
                                type="date"
                                value={val}
                                onChange={(e) => handleInputChange(f.name, e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                                placeholder={f.placeholder}
                              />
                              {err ? <p className="mt-1 text-sm text-red-600">{err}</p> : null}
                            </div>
                          );
                        }

                        if (id === "br_district" || id === "br_division" || id === "br_gndiv") return null;

                        return (
                          <div key={id} className="grid grid-cols-1">
                            <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-2">{f.label}</label>
                            <input
                              id={id}
                              type={f.type}
                              value={val}
                              onChange={(e) => handleInputChange(f.name, e.target.value)}
                              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                              placeholder={f.placeholder}
                            />
                            {err ? <p className="mt-1 text-sm text-red-600">{err}</p> : null}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {isReview && (
                    <div className="space-y-6">
                      <p className="text-slate-600">Review your details below. Use <span className="font-medium">Edit</span> to jump to a section.</p>
                      {steps.map((s) => (
                        <div key={s.id} className="border border-slate-200 rounded-xl p-4 md:p-5">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-semibold text-slate-800">{s.title}</h3>
                            <button className="px-3 py-1.5 text-sm bg-slate-200 rounded-lg hover:bg-slate-300" onClick={() => setCurrentStep(s.id)}>Edit</button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {s.fields.map((f) => {
                              const key = String(f.name);
                              const v = (values[f.name] as unknown as string) ?? "";
                              const shown =
                                key === "br_viharadhipathi_name"
                                  ? display.br_viharadhipathi_name || v
                                  : key === "br_mahanayaka_name"
                                  ? display.br_mahanayaka_name || v
                                  : key === "br_mahanaacharyacd"
                                  ? display.br_mahanaacharyacd || v
                                  : key === "br_mahanatemple"
                                  ? display.br_mahanatemple || v
                                  : key === "br_robing_after_residence_temple"
                                  ? display.br_robing_after_residence_temple || v
                                  : key === "br_robing_tutor_residence"
                                  ? display.br_robing_tutor_residence || v
                                  : v;
                              return (
                                <div key={key} className="bg-slate-50 rounded-lg p-3">
                                  <div className="text-xs text-slate-500">{fieldLabels[key]}</div>
                                  <div className="text-sm font-medium text-slate-800 break-words">{shown || <span className="text-slate-400">—</span>}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col md:flex-row gap-4 md:gap-0 md:justify-between md:items-center mt-8 pt-6 border-t border-slate-200">
                  <button
                    onClick={handlePrevious}
                    disabled={currentStep === 1}
                    className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all ${currentStep === 1 ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-slate-200 text-slate-700 hover:bg-slate-300"}`}
                  >
                    ‹ Previous
                  </button>

                  <div className="text-sm text-slate-600 font-medium text-center">Step {currentStep} of {effectiveSteps.length}</div>

                  {currentStep < effectiveSteps.length ? (
                    <button onClick={handleNext} className="flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-700 text-white rounded-lg font-medium hover:bg-slate-800 transition-all">
                      Next ›
                    </button>
                  ) : (
                    <button
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="flex items-center justify-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-all disabled:opacity-70"
                    >
                      {submitting ? "Submitting..." : bhikkhuId ? "Update" : "Submit"}
                    </button>
                  )}
                </div>

              </div>
            </div>
          </div>
        </main>
        <FooterBar />
      </div>
    </div>
  );
}

/* ---------------- Page wrapper with Suspense (no hooks here) ---------------- */
export default function AddBhikkhuPage() {
  // why: satisfies Next.js requirement to wrap useSearchParams in Suspense
  return (
    <Suspense fallback={<div className="p-8 text-slate-600">Loading…</div>}>
      <AddBhikkhuPageInner />
    </Suspense>
  );
}