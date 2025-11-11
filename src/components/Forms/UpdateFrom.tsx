// app/components/MultiStepForm.tsx
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Save } from 'lucide-react';

export type TabStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';
export type FieldType = 'text' | 'email' | 'tel' | 'date' | 'textarea' | 'custom';

export interface FieldRenderProps {
  name: string;
  label: string;
  value: any;
  onChange: (value: any) => void;
  onBlur?: () => void;
  error?: string;
  placeholder?: string;
  rows?: number;
  /** read-only hint for custom renderers */
  readOnly?: boolean;
  /** disabled hint for custom renderers (while saving, etc.) */
  disabled?: boolean;
}

export interface FieldConfig {
  name: string;
  label: string;
  type?: FieldType;
  placeholder?: string;
  rows?: number;
  grid?: 'full' | 'half';
  required?: boolean;
  validate?: (value: any, values: Record<string, any>) => string;
  render?: (props: FieldRenderProps) => React.ReactNode;
  rendererKey?: string;
}

export interface StepConfig {
  id: number;
  title: string;
  fields: FieldConfig[];
}

export interface MultiStepFormProps {
  title?: string;
  id?: string;
  steps: StepConfig[];
  initialValues?: Record<string, any>;
  demoValues?: Record<string, any>;
  loadData?: (id: string) => Promise<Record<string, any>>;
  saveSection?: (args: {
    id?: string;
    step: StepConfig;
    values: Record<string, any>;
    payload: Record<string, any>;
  }) => Promise<void>;
  renderers?: Record<string, (props: FieldRenderProps) => React.ReactNode>;
  onStatusChange?: (msg: string) => void;

  /** NEW: start in 'view' or 'edit' */
  mode?: 'view' | 'edit';
  /** NEW: allow the header Edit/Done toggle */
  allowToggle?: boolean;
  /** NEW: notify external mode changes */
  onModeChange?: (mode: 'view' | 'edit') => void;
}

export const validators = {
  required: (label: string) => (v: any) =>
    (v === undefined || String(v ?? '').trim() === '') ? `${label} is required` : '',
  email: (v: string) =>
    !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim()) ? '' : 'Invalid email',
  sriLankaPhone10: (v: string) =>
    /^0\d{9}$/.test(String(v).trim()) ? '' : 'Must be 10 digits (e.g., 07XXXXXXXX)',
  notFutureDate: (todayISO: string) => (v: string) =>
    !v || v <= todayISO ? '' : 'Date cannot be in the future',
};

export default function MultiStepForm({
  title = 'Form',
  id,
  steps,
  initialValues = {},
  demoValues,
  loadData,
  saveSection,
  renderers = {},
  onStatusChange,

  mode = 'edit',
  allowToggle = true,
  onModeChange,
}: MultiStepFormProps) {
  const [currentTab, setCurrentTab] = useState<number>(steps[0]?.id ?? 1);
  const [values, setValues] = useState<Record<string, any>>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tabStatuses, setTabStatuses] = useState<Record<number, TabStatus>>(
    Object.fromEntries(steps.map((s) => [s.id, 'idle']))
  );
  const [loading, setLoading] = useState<boolean>(!!id && !!loadData);
  const [status, setStatus] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(mode === 'edit'); // NEW
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // keep local edit state in sync with controlled prop
  useEffect(() => {
    setIsEditing(mode === 'edit');
  }, [mode]);

  // Data IO
  useEffect(() => {
    let cancelled = false;
    async function doLoad() {
      if (!id || !loadData) return;
      setLoading(true);
      setStatus('');
      try {
        const data = await loadData(id);
        if (!cancelled) setValues((prev) => ({ ...prev, ...data }));
      } catch {
        if (!cancelled) {
          if (demoValues) setValues((prev) => ({ ...prev, ...demoValues }));
          setStatus('Loaded demo data (API fallback).');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    doLoad();
    return () => {
      cancelled = true;
    };
  }, [id, loadData, demoValues]);

  // External status sink (optional)
  useEffect(() => {
    onStatusChange?.(status);
  }, [status, onStatusChange]);

  const fieldToStepId = useMemo(() => {
    const map = new Map<string, number>();
    steps.forEach((s) => s.fields.forEach((f) => map.set(f.name, s.id)));
    return map;
  }, [steps]);

  const setField = (name: string, value: any) => {
    if (!isEditing) return; // prevent edits in view mode
    setValues((prev) => {
      const next = { ...prev, [name]: value };
      const stepId = fieldToStepId.get(name);
      const cfg = steps.flatMap((s) => s.fields).find((f) => f.name === name);
      let msg = '';
      if (cfg) {
        if (cfg.required) msg = validators.required(cfg.label)(value);
        if (!msg && cfg.validate) msg = cfg.validate(value, next);
      }
      setErrors((e) => ({ ...e, [name]: msg }));
      if (stepId) setTabStatuses((s) => ({ ...s, [stepId]: 'dirty' }));
      return next;
    });
  };

  function validateStep(stepId: number): boolean {
    const step = steps.find((s) => s.id === stepId);
    if (!step) return true;
    const nextErrors = { ...errors };
    let ok = true;
    for (const f of step.fields) {
      const v = values[f.name];
      let msg = '';
      if (f.required) msg = validators.required(f.label)(v);
      if (!msg && f.validate) msg = f.validate(v, values);
      nextErrors[f.name] = msg;
      if (msg) ok = false;
    }
    setErrors(nextErrors);
    if (!ok) sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return ok;
  }

  async function handleSave(stepId: number) {
    if (!isEditing) return; // ignore in view mode
    if (!validateStep(stepId)) {
      setTabStatuses((s) => ({ ...s, [stepId]: 'error' }));
      return;
    }
    const step = steps.find((s) => s.id === stepId);
    if (!step) return;

    const payload: Record<string, any> = {};
    step.fields.forEach((f) => (payload[f.name] = values[f.name]));

    if (!saveSection) {
      setTabStatuses((s) => ({ ...s, [stepId]: 'saved' }));
      setStatus('Section validated (not persisted).');
      return;
    }

    setTabStatuses((s) => ({ ...s, [stepId]: 'saving' }));
    setStatus('');
    try {
      await saveSection({ id, step, values, payload });
      setTabStatuses((s) => ({ ...s, [stepId]: 'saved' }));
      setStatus('Section saved.');
    } catch {
      setTabStatuses((s) => ({ ...s, [stepId]: 'error' }));
      setStatus('Failed to save section.');
    }
  }

  const badgeFor = (stepId: number) => {
    const st = tabStatuses[stepId];
    if (st === 'saved')
      return <span className="ml-2 text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">Saved</span>;
    if (st === 'dirty')
      return <span className="ml-2 text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700">Unsaved</span>;
    if (st === 'saving')
      return <span className="ml-2 text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700">Saving…</span>;
    if (st === 'error')
      return <span className="ml-2 text-xs px-2 py-0.5 rounded bg-red-100 text-red-700">Fix errors</span>;
    return null;
  };

  const currentStep = steps.find((s) => s.id === currentTab);
  const stepTitle = currentStep?.title ?? '';

  const toggleEdit = () => {
    const next = isEditing ? 'view' : 'edit';
    setIsEditing(next === 'edit');
    onModeChange?.(next);
  };

  const ReadOnlyValue = ({ value }: { value: any }) => {
    const v =
      value === null || value === undefined || String(value).trim() === '' ? '—' : String(value);
    return (
      <div
        className="w-full px-4 py-2.5 rounded-lg border border-transparent bg-slate-50 text-slate-800"
        aria-readonly
      >
        {v}
      </div>
    );
  };

  return (
    <div className="w-full">
      <div className="bg-white shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-6 md:px-10 py-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">{title}</h1>
              <p className="text-slate-300 text-sm">
                {loading ? 'Loading…' : isEditing ? 'Edit fields, then Save Section' : 'View mode'}
              </p>
            </div>

            {allowToggle && (
              <button
                type="button"
                onClick={toggleEdit}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  isEditing
                    ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                    : 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                }`}
                title={isEditing ? 'Done (switch to view mode)' : 'Edit this form'}
              >
                {isEditing ? 'Done' : 'Edit'}
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 md:px-10 py-4 md:py-6" ref={sectionRef}>
          <div
            role="tablist"
            aria-label="Form sections"
            className="flex flex-wrap gap-2 md:gap-3 mb-6 border-b border-slate-200 pb-2"
          >
            {steps.map((s) => {
              const active = currentTab === s.id;
              return (
                <button
                  key={s.id}
                  role="tab"
                  aria-selected={active}
                  aria-controls={`panel-${s.id}`}
                  id={`tab-${s.id}`}
                  onClick={() => setCurrentTab(s.id)}
                  className={`group relative px-3 md:px-4 py-2 rounded-t-lg text-sm font-medium transition-all border-b-2 ${
                    active
                      ? 'border-slate-700 text-slate-900'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <span
                      className={`w-6 h-6 grid place-items-center rounded-full text-xs ${
                        active ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {tabStatuses[s.id] === 'saved' ? <Check size={14} /> : s.id}
                    </span>
                    {s.title}
                    {badgeFor(s.id)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Panels */}
          <div className="min-h-[360px]">
            <h2 className="text-xl font-bold text-slate-800 mb-4">{stepTitle}</h2>

            {steps.map((s) =>
              currentTab === s.id ? (
                <section
                  key={s.id}
                  id={`panel-${s.id}`}
                  role="tabpanel"
                  aria-labelledby={`tab-${s.id}`}
                  className="space-y-5"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {s.fields.map((f) => {
                      const fullWidth = f.grid === 'full' || f.type === 'textarea';
                      const value = values[f.name] ?? '';
                      const commonProps: FieldRenderProps = {
                        name: f.name,
                        label: f.label,
                        value,
                        onChange: (v: any) => setField(f.name, v),
                        error: errors[f.name],
                        placeholder: f.placeholder,
                        rows: f.rows,
                        readOnly: !isEditing,
                        disabled: loading || tabStatuses[s.id] === 'saving' || !isEditing,
                      };
                      const renderer =
                        f.render ??
                        (f.rendererKey ? renderers[f.rendererKey] : undefined) ??
                        renderers[f.name];

                      return (
                        <div key={f.name} className={fullWidth ? 'md:col-span-2' : ''}>
                          <label
                            htmlFor={f.name}
                            className="block text-sm font-medium text-slate-700 mb-2"
                          >
                            {f.label}
                          </label>

                          {/* VIEW MODE */}
                          {!isEditing ? (
                            renderer ? (
                              <>
                                {renderer(commonProps)}
                                {/* In view mode, we do not show validation errors */}
                              </>
                            ) : (
                              <ReadOnlyValue value={value} />
                            )
                          ) : /* EDIT MODE */ renderer ? (
                            <>
                              {renderer(commonProps)}
                              {errors[f.name] ? (
                                <p className="mt-1 text-sm text-red-600">{errors[f.name]}</p>
                              ) : null}
                            </>
                          ) : f.type === 'textarea' ? (
                            <>
                              <textarea
                                id={f.name}
                                value={value}
                                onChange={(e) => commonProps.onChange(e.target.value)}
                                rows={commonProps.rows ?? 4}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all resize-none"
                                placeholder={commonProps.placeholder}
                                disabled={commonProps.disabled}
                                aria-readonly={!isEditing}
                              />
                              {errors[f.name] ? (
                                <p className="mt-1 text-sm text-red-600">{errors[f.name]}</p>
                              ) : null}
                            </>
                          ) : (
                            <>
                              <input
                                id={f.name}
                                type={f.type ?? 'text'}
                                value={value}
                                onChange={(e) => commonProps.onChange(e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                                placeholder={commonProps.placeholder}
                                disabled={commonProps.disabled}
                                aria-readonly={!isEditing}
                              />
                              {errors[f.name] ? (
                                <p className="mt-1 text-sm text-red-600">{errors[f.name]}</p>
                              ) : null}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              ) : null
            )}
          </div>

          {/* Footer */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-6 pt-4 border-t border-slate-200">
            <div className="flex items-center gap-2">
              {isEditing && (
                <button
                  onClick={() => handleSave(currentTab)}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-700 text-white rounded-lg font-medium hover:bg-slate-800 disabled:opacity-60"
                  title="Validate and save this tab only"
                >
                  <Save size={18} />
                  Save Section
                </button>
              )}
              {isEditing && demoValues ? (
                <button
                  type="button"
                  onClick={() => setValues((prev) => ({ ...prev, ...demoValues }))}
                  className="px-4 py-2.5 bg-slate-200 text-slate-800 rounded-lg font-medium hover:bg-slate-300 transition-all"
                  title="Prefill with demo data"
                >
                  Load Demo
                </button>
              ) : null}
            </div>

            <div className="text-sm text-slate-600 font-medium text-center">
              {status || '—'}
            </div>

            <div className="text-sm text-slate-600 font-medium text-center">
              Tab {steps.findIndex((x) => x.id === currentTab) + 1} of {steps.length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
