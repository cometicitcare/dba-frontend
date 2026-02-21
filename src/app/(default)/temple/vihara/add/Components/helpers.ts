export type FieldRule<T> = {
  required?: boolean;
  pattern?: { regex: RegExp; message: string };
  maxDateToday?: boolean;
  custom?: (value: string, all: Partial<T>) => string | undefined;
};

export type FieldConfig<T> = {
  name: keyof T;
  label: string;
  type: "text" | "email" | "tel" | "date" | "textarea";
  placeholder?: string;
  rows?: number;
  rules?: FieldRule<T>;
};

export type StepConfig<T> = { id: number; title: string; fields: Array<FieldConfig<T>> };
export type Errors<T> = Partial<Record<keyof T, string>>;

export const isPhoneLK = (v: string) => /^0\d{9}$/.test(v.trim());

/** 
 * Normalize date to ISO format (YYYY-MM-DD) for API/hidden inputs.
 * Accepts both YYYY-MM-DD and YYYY/MM/DD formats as input.
 * Returns "" on bad input.
 */
export function toISOFormat(input: string | undefined | null): string {
  const s = (input ?? "").trim();
  if (!s) return "";
  
  // Already in ISO format
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  
  // Convert from display format (YYYY/MM/DD)
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(s)) {
    return s.replace(/\//g, "-");
  }
  
  // Try parsing as date
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 
 * Convert date to display format (YYYY/MM/DD).
 * Accepts both YYYY-MM-DD and YYYY/MM/DD formats as input.
 * Returns "" on bad input.
 */
export function toDisplayFormat(input: string | undefined | null): string {
  const isoDate = toISOFormat(input);
  if (!isoDate) return "";
  return isoDate.replace(/-/g, "/");
}

/** 
 * Legacy function - now maps to toDisplayFormat for backward compatibility.
 * Normalize to YYYY/MM/DD (display format); returns "" on bad input.
 */
export function toYYYYMMDD(input: string | undefined | null): string {
  return toDisplayFormat(input);
}

/** Shared field validator. */
export function validateField<T>(field: FieldConfig<T>, value: string | undefined, all: Partial<T>, today: string): string {
  const v0 = (value ?? "").trim();
  const v = field.type === "date" ? toISOFormat(v0) : v0;
  const todayIso = toISOFormat(today);
  const rules = field.rules ?? {};
  if (rules.required) {
    // For checkbox-like fields, check the actual boolean value in all
    const fieldName = String(field.name);
    if (fieldName.includes("certified") || fieldName.includes("_deed") || fieldName.includes("recommend_") || fieldName.includes("annex2_")) {
      const boolVal = all[field.name] as unknown;
      if (boolVal !== true && boolVal !== "true") return "Required";
    } else if (!v) {
      return "Required";
    }
  }
  if (rules.pattern && v && !rules.pattern.regex.test(v)) return rules.pattern.message;
  if (field.type === "date" && rules.maxDateToday && v && todayIso && v > todayIso) return "Date cannot be in the future";
  if (rules.custom) {
    const msg = rules.custom(v, all);
    if (msg) return msg;
  }
  return "";
}

export async function safeReadText(res: Response) {
  try { return await res.text(); } catch { return ""; }
}