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

function isValidDateParts(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12) return false;
  if (day < 1) return false;
  const maxDay = new Date(year, month, 0).getDate();
  return day <= maxDay;
}

/** 
 * Normalize date to ISO format (YYYY-MM-DD) for API/hidden inputs.
 * Accepts both YYYY-MM-DD and YYYY/MM/DD formats as input.
 * Returns "" on bad input.
 */
export function toISOFormat(input: string | undefined | null): string {
  const s = (input ?? "").trim();
  if (!s) return "";

  // Already in ISO format
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-").map(Number);
    if (!isValidDateParts(y, m, d)) return "";
    return s;
  }

  // Convert from display format (YYYY/MM/DD)
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(s)) {
    const [y, m, d] = s.split("/").map(Number);
    if (!isValidDateParts(y, m, d)) return "";
    const yy = String(y).padStart(4, "0");
    const mm = String(m).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
  }

  return "";
}

/** 
 * Convert date to display format (YYYY-MM-DD).
 * Accepts both YYYY-MM-DD and YYYY/MM/DD formats as input.
 * Returns "" on bad input.
 */
export function toDisplayFormat(input: string | undefined | null): string {
  return toISOFormat(input);
}

/** 
 * Legacy function - now maps to toDisplayFormat for backward compatibility.
 * Normalize to YYYY-MM-DD (display format); returns "" on bad input.
 */
export function toYYYYMMDD(input: string | undefined | null): string {
  return toISOFormat(input);
}

/** Shared field validator. */
export function validateField<T>(field: FieldConfig<T>, value: string | undefined, all: Partial<T>, today: string): string {
  const v0 = (value ?? "").trim();
  const v = field.type === "date" ? toISOFormat(v0) : v0;
  const todayIso = toISOFormat(today);
  const rules = field.rules ?? {};
  if (rules.required && !v) return "Required";
  if (field.type === "date" && v0) {
    const isoPattern = /^\d{4}-\d{2}-\d{2}$/;
    // Allow partial input while typing
    if (v0.length < 10) return "";
    if (!isoPattern.test(v0)) return "Invalid date format. Use YYYY-MM-DD.";
    if (!v) return "Invalid date. Check year, month and day.";
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
