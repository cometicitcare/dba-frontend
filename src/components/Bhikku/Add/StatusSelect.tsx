"use client";
import React, { useEffect, useRef, useState } from "react";
import { _manageBhikkuStatus } from "@/services/bhikkuStatus";

type StatusOption = { code: string; name: string };

async function fetchBhikkhuStatuses(): Promise<StatusOption[]> {
  const res = await _manageBhikkuStatus({ action: "READ_ALL", payload: { page: 1, limit: 100, search_key: "" } });
  const rows: any[] = (res as any)?.data?.data ?? [];
  return rows.map((r) => ({ code: r.st_statcd as string, name: r.st_descr as string }));
}

type Props = {
  id: string;
  label: string;
  required?: boolean;
  initialCode?: string;
  value?: string;
  values?: string[];
  multiple?: boolean;
  disabled?: boolean;
  onPick?: (picked: { code: string; display: string }) => void;
  onChangeMulti?: (codes: string[]) => void;
};

export default function BhikkhuStatusSelect({
  id,
  label,
  required,
  initialCode = "",
  value,
  values,
  multiple = false,
  disabled = false,
  onPick,
  onChangeMulti,
}: Props) {
  const [options, setOptions] = useState<StatusOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [internalValue, setInternalValue] = useState<string>(initialCode);
  const [internalValues, setInternalValues] = useState<string[]>(initialCode ? [initialCode] : []);
  const isControlledSingle = !multiple && typeof value === "string";
  const isControlledMulti = multiple && Array.isArray(values);
  const currentSingle = isControlledSingle ? value ?? "" : internalValue;
  const currentMulti = isControlledMulti ? values ?? [] : internalValues;
  const onPickRef = useRef(onPick);

  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);

  const emitSinglePick = (code: string, opts: StatusOption[] = options) => {
    const opt = opts.find((o) => o.code === code);
    onPickRef.current?.({ code, display: opt ? `${opt.name} - ${opt.code}` : code });
  };

  const emitMultiChange = (codes: string[]) => {
    onChangeMulti?.(codes);
  };

  useEffect(() => {
    if (!multiple && !isControlledSingle) setInternalValue(initialCode);
  }, [initialCode, isControlledSingle, multiple]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const list = await fetchBhikkhuStatuses();
        if (!cancelled) {
          setOptions(list);
          if (!multiple && initialCode && !isControlledSingle) emitSinglePick(initialCode, list);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load statuses");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [initialCode, isControlledSingle, multiple]);

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    if (multiple) {
      const selected = Array.from(event.target.selectedOptions).map((opt) => opt.value);
      if (!isControlledMulti) setInternalValues(selected);
      emitMultiChange(selected);
    } else {
      const code = event.target.value;
      if (!isControlledSingle) setInternalValue(code);
      emitSinglePick(code);
    }
  };

  if (loading) return <div className="text-sm text-slate-600">Loading statuses...</div>;
  if (error) return <div role="alert" className="text-sm text-red-600">Error: {error}</div>;

  const selectValue: string | string[] = multiple ? currentMulti : currentSingle;

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-2">{label}</label>
      <select
        id={id}
        multiple={multiple}
        value={selectValue}
        onChange={handleChange}
        required={required && !multiple}
        disabled={disabled}
        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all disabled:bg-slate-100"
      >
        {!multiple && <option value="">Select status</option>}
        {options.map((o) => (
          <option key={o.code} value={o.code}>
            {o.name} - {o.code}
          </option>
        ))}
      </select>
      {multiple ? <p className="mt-1 text-xs text-slate-500">Hold Ctrl/Cmd to select multiple.</p> : null}
    </div>
  );
}
