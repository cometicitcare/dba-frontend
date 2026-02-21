"use client";
import React, { useRef } from "react";
import { toDisplayFormat, toISOFormat } from "./helpers";

type Props = {
  id: string;
  label: string;
  value: string;
  onChange: (displayFormat: string) => void;
  required?: boolean;
  placeholder?: string;
  error?: string;
};

export default function DateField({ id, label, value, onChange, required, placeholder, error }: Props) {
  const hiddenRef = useRef<HTMLInputElement | null>(null);
  const displayValue = toDisplayFormat(value);
  const isoValue = toISOFormat(value);

  const openPicker = () => {
    const el = hiddenRef.current;
    if (el?.showPicker) el.showPicker();
    else el?.click();
  };

  return (
    <div className="grid grid-cols-1">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-2">{label}</label>
      <div className="relative flex">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          pattern="(\d{4}-\d{2}-\d{2}|\d{4}/\d{2}/\d{2})"
          placeholder={placeholder ?? "YYYY/MM/DD"}
          value={displayValue}
          onChange={(e) => onChange(toDisplayFormat(e.target.value))}
          onBlur={(e) => onChange(toDisplayFormat(e.target.value))}
          required={required}
          className="w-full px-4 py-2.5 border border-slate-300 rounded-l-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
        />
        <button
          type="button"
          onClick={openPicker}
          className="px-3 border border-l-0 border-slate-300 rounded-r-lg text-slate-600 hover:bg-slate-50"
          aria-label="Open date picker"
          title="Open date picker"
        >
          📅
        </button>
        <input
          ref={hiddenRef}
          type="date"
          value={isoValue}
          onChange={(e) => onChange(toDisplayFormat(e.target.value))}
          className="absolute opacity-0 pointer-events-none w-0 h-0"
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>
      <p className="mt-1 text-xs text-slate-500">Format: YYYY/MM/DD</p>
      {error ? <p className="mt-1 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}