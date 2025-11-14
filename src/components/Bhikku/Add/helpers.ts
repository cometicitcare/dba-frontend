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

/** Normalize to YYYY-MM-DD; returns "" on bad input. */
export function toYYYYMMDD(input: string | undefined | null): string {
  const s = (input ?? "").trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Shared field validator. */
export function validateField<T>(field: FieldConfig<T>, value: string | undefined, all: Partial<T>, today: string): string {
  const v0 = (value ?? "").trim();
  const v = field.type === "date" ? toYYYYMMDD(v0) : v0;
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

export async function safeReadText(res: Response) {
  try { return await res.text(); } catch { return ""; }
}