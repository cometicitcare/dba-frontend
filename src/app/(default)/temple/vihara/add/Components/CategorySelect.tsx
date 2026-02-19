"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import selectionsData from "@/utils/selectionsData.json";

type CategoryRecord = {
  cc_code: string;
  cc_catogry: string;
};

type CategoryOption = { code: string; name: string };

const STATIC_CATEGORIES: CategoryRecord[] = Array.isArray((selectionsData as any)?.categories)
  ? ((selectionsData as any).categories as CategoryRecord[])
  : Array.isArray(selectionsData)
    ? (selectionsData as CategoryRecord[])
    : [];

const CATEGORY_OPTIONS: CategoryOption[] = STATIC_CATEGORIES.map((r) => ({
  code: r.cc_code,
  name: r.cc_catogry,
}));

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

export default function BhikkhuCategorySelect({
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
  const options = useMemo(() => CATEGORY_OPTIONS, []);
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

  const emitSinglePick = (code: string, opts: CategoryOption[] = options) => {
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
    if (!multiple && initialCode && !isControlledSingle) {
      emitSinglePick(initialCode, options);
    }
  }, [initialCode, isControlledSingle, multiple, options]);

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

  const selectValue: string | string[] = multiple ? currentMulti : currentSingle;

  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-slate-700 mb-1.5">
        {label}
      </label>
      <select
        id={id}
        multiple={multiple}
        value={selectValue}
        onChange={handleChange}
        required={required && !multiple}
        disabled={disabled}
        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all disabled:bg-slate-100"
      >
        {!multiple && <option value="">Select category</option>}
        {options.map((o) => (
          <option key={o.code} value={o.code}>
            {o.name} - {o.code}
          </option>
        ))}
      </select>
      {multiple ? <p className="mt-1 text-[11px] text-slate-500">Hold Ctrl/Cmd to select multiple.</p> : null}
    </div>
  );
}
