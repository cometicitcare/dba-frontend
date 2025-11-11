"use client";

import React, { useMemo, useRef, useState } from "react";
import { ChevronRight, ChevronLeft, Check } from "lucide-react";
import DateInput from "@/components/FormComponents/DateInput";

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

export type StepConfig<T> = {
  id: number;
  title: string;
  fields: Array<FieldConfig<T>>;
};

type Errors<T> = Partial<Record<keyof T, string>>;

export type WizardFormProps<T> = {
  steps: Array<StepConfig<T>>;
  initialValues: Partial<T>;
  demoValues?: Partial<T>;
  onSubmit: (values: Partial<T>) => Promise<void> | void;
  onChange?: (values: Partial<T>) => void;
  reviewStep?: { enabled: boolean; title?: string };
  submitLabel?: string;
  autoFillLabel?: string;
  customRenderers?: Record<
    string,
    (args: {
      id?: string;
      name?: string;
      className?: string;
      value: string | number | null | undefined;
      setValue: (v: string | number) => void;
      /** NEW: update multiple fields at once */
      setMany: (patch: Partial<T>) => void;
      error?: string | boolean;
      placeholder?: string;
      disabled?: boolean;
    }) => React.ReactNode
  >;
};

export default function WizardForm<T>({
  steps,
  initialValues,
  demoValues,
  onSubmit,
  onChange,
  reviewStep = { enabled: true, title: "Review & Confirm" },
  submitLabel = "Submit",
  autoFillLabel = "Auto-Fill",
  customRenderers = {},
}: WizardFormProps<T>) {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [values, setValues] = useState<Partial<T>>(initialValues ?? {});
  const [errors, setErrors] = useState<Errors<T>>({});
  const [submitting, setSubmitting] = useState(false);
  const sectionRef = useRef<HTMLDivElement | null>(null);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const effectiveSteps: Array<StepConfig<T>> = useMemo(() => {
    if (!reviewStep?.enabled) return steps;
    const reviewId = steps.length + 1;
    return [
      ...steps,
      {
        id: reviewId,
        title: reviewStep.title ?? "Review & Confirm",
        fields: [],
      },
    ];
  }, [steps, reviewStep]);

  function scrollTop() {
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function validateField(field: FieldConfig<T>, value: string | undefined, all: Partial<T>): string {
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

  function validateStep(stepIndex: number): boolean {
    const step = effectiveSteps[stepIndex - 1];
    if (!step) return true;
    const nextErrors: Errors<T> = { ...errors };
    let valid = true;
    for (const f of step.fields) {
      const raw = values[f.name as keyof T] as unknown as string | undefined;
      const msg = validateField(f, raw, values);
      nextErrors[f.name] = msg;
      if (msg) valid = false;
    }
    setErrors(nextErrors);
    if (!valid) scrollTop();
    return valid;
  }

  function validateAll(): { ok: boolean; firstInvalidStep: number | null } {
    let firstInvalidStep: number | null = null;
    const aggregated: Errors<T> = {};
    for (const step of steps) {
      let stepValid = true;
      for (const f of step.fields) {
        const raw = values[f.name as keyof T] as unknown as string | undefined;
        const msg = validateField(f, raw, values);
        aggregated[f.name] = msg;
        if (msg) stepValid = false;
      }
      if (!stepValid && firstInvalidStep == null) firstInvalidStep = step.id;
    }
    setErrors(aggregated);
    return { ok: firstInvalidStep == null, firstInvalidStep };
  }

  function handleInputChange(name: keyof T, value: string) {
    setValues((prev) => {
      const next = { ...prev, [name]: value };
      const cfg = steps.flatMap((s) => s.fields).find((f) => f.name === name);
      if (cfg) {
        const msg = validateField(cfg, value, next);
        setErrors((e) => ({ ...e, [name]: msg }));
      }
      onChange?.(next);
      return next;
    });
  }

  /** NEW: batch update utility for custom renderers */
  function handleSetMany(patch: Partial<T>) {
    setValues((prev) => {
      const next = { ...prev, ...patch };
      // revalidate only fields present in patch
      const cfgMap = new Map<string, FieldConfig<T>>();
      steps.forEach((s) => s.fields.forEach((f) => cfgMap.set(String(f.name), f)));
      const nextErrors: Errors<T> = { ...errors };
      Object.keys(patch).forEach((k) => {
        const cfg = cfgMap.get(k);
        if (cfg) {
          const raw = String((next as any)[k] ?? "");
          nextErrors[cfg.name] = validateField(cfg, raw, next);
        }
      });
      setErrors(nextErrors);
      onChange?.(next);
      return next;
    });
  }

  function handleNext() {
    if (currentStep < effectiveSteps.length && validateStep(currentStep)) setCurrentStep((s) => s + 1);
  }
  function handlePrevious() {
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  }

  async function handleSubmit() {
    const { ok, firstInvalidStep } = validateAll();
    if (!ok && firstInvalidStep) {
      setCurrentStep(firstInvalidStep);
      scrollTop();
      return;
    }
    try {
      setSubmitting(true);
      await onSubmit(values);
    } finally {
      setSubmitting(false);
    }
  }

  const current = effectiveSteps[currentStep - 1];
  const isReview = reviewStep.enabled && currentStep === effectiveSteps.length;
  const stepTitle = current?.title ?? "";

  const fieldLabels: Record<string, string> = useMemo(() => {
    const map: Record<string, string> = {};
    steps.forEach((s) => s.fields.forEach((f) => (map[String(f.name)] = f.label)));
    return map;
  }, [steps]);

  return (
    <div className="w-full">
      <div className="bg-white shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-6 md:px-10 py-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Registration Form</h1>
              <p className="text-slate-300 text-sm">Please complete all required information</p>
            </div>
            {demoValues && (
              <button
                type="button"
                onClick={() => {
                  setValues(demoValues);
                  setErrors({});
                  onChange?.(demoValues);
                }}
                className="hidden md:inline-flex items-center gap-2 px-4 py-2 bg-slate-200 text-slate-800 rounded-lg font-medium hover:bg-slate-300 transition-all"
                title="Prefill with demo data"
              >
                {autoFillLabel}
                <ChevronRight size={18} />
              </button>
            )}
          </div>
        </div>

        <div className="px-4 md:px-10 py-6" ref={sectionRef}>
          {/* Stepper */}
          <div className="flex items-center justify-between mb-8">
            {effectiveSteps.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-300 ${
                      currentStep > step.id
                        ? "bg-green-500 text-white"
                        : currentStep === step.id
                        ? "bg-slate-700 text-white ring-4 ring-slate-200"
                        : "bg-slate-200 text-slate-400"
                    }`}
                  >
                    {currentStep > step.id ? <Check size={20} /> : step.id}
                  </div>
                  <span
                    className={`text-xs mt-2 font-medium text-center ${
                      currentStep >= step.id ? "text-slate-700" : "text-slate-400"
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
                {index < effectiveSteps.length - 1 && (
                  <div
                    className={`h-1 flex-1 mx-2 rounded transition-all duration-300 ${
                      currentStep > step.id ? "bg-green-500" : "bg-slate-200"
                    }`}
                  />
                )}
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

                  // Custom renderer hook (e.g., Location)
                  const custom = customRenderers[id];
                  if (custom) {
                    return (
                      <div key={id} className="grid grid-cols-1">
                        <label className="block text-sm font-medium text-slate-700 mb-2">{f.label}</label>
                        {custom({
                          id,
                          name: id,
                          className:
                            "w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all",
                          value: val,
                          setValue: (v) => handleInputChange(f.name, String(v ?? "")),
                          setMany: handleSetMany,
                          error: err,
                          placeholder: f.placeholder,
                          disabled: false,
                        })}
                        {err ? <p className="mt-1 text-sm text-red-600">{err}</p> : null}
                      </div>
                    );
                  }

                  if (f.type === "textarea") {
                    return (
                      <div key={id}>
                        <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-2">
                          {f.label}
                        </label>
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
                        <DateInput
                          name={id}
                          label={f.label}
                          value={val}
                          onChange={(v: any) => handleInputChange(f.name, String(v ?? ""))}
                          error={err}
                          placeholder={f.placeholder}
                        />
                        {err ? <p className="mt-1 text-sm text-red-600">{err}</p> : null}
                      </div>
                    );
                  }

                  // default inputs
                  return (
                    <div key={id} className="grid grid-cols-1">
                      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-2">
                        {f.label}
                      </label>
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
                <p className="text-slate-600">
                  Review your details below. Use <span className="font-medium">Edit</span> to jump to a section.
                </p>
                {steps.map((s) => (
                  <div key={s.id} className="border border-slate-200 rounded-xl p-4 md:p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-slate-800">{s.title}</h3>
                      <button
                        className="px-3 py-1.5 text-sm bg-slate-200 rounded-lg hover:bg-slate-300"
                        onClick={() => setCurrentStep(s.id)}
                      >
                        Edit
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {s.fields.map((f) => {
                        const key = String(f.name);
                        const v = (values[f.name] as unknown as string) ?? "";
                        return (
                          <div key={key} className="bg-slate-50 rounded-lg p-3">
                            <div className="text-xs text-slate-500">{fieldLabels[key]}</div>
                            <div className="text-sm font-medium text-slate-800 break-words">
                              {v || <span className="text-slate-400">—</span>}
                            </div>
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
              className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all ${
                currentStep === 1
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                  : "bg-slate-200 text-slate-700 hover:bg-slate-300"
              }`}
            >
              <ChevronLeft size={20} />
              Previous
            </button>

            <div className="text-sm text-slate-600 font-medium text-center">
              Step {currentStep} of {effectiveSteps.length}
            </div>

            {currentStep < effectiveSteps.length ? (
              <button
                onClick={handleNext}
                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-700 text-white rounded-lg font-medium hover:bg-slate-800 transition-all"
              >
                Next
                <ChevronRight size={20} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-all disabled:opacity-70"
              >
                <Check size={20} />
                {submitting ? "Submitting..." : submitLabel}
              </button>
            )}
          </div>

          {demoValues && (
            <div className="mt-4 md:hidden">
              <button
                type="button"
                onClick={() => {
                  setValues(demoValues);
                  setErrors({});
                  onChange?.(demoValues);
                }}
                className="w-full px-4 py-2.5 bg-slate-200 text-slate-800 rounded-lg font-medium hover:bg-slate-300 transition-all"
                title="Prefill with demo data"
              >
                {autoFillLabel} Demo Data
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
