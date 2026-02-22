"use client";
import React from "react";
import { toISOFormat } from "./helpers";

type Props = {
  id: string;
  label: string;
  value: string;
  onChange: (displayFormat: string) => void;
  required?: boolean;
  placeholder?: string;
  error?: string;
};

function formatAsIsoInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

export default function DateField({ id, label, value, onChange, required, placeholder, error }: Props) {
  const displayValue = toISOFormat(value) || value;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatAsIsoInput(e.target.value);
    onChange(formatted);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const trimmed = e.target.value.trim();
    if (!trimmed) {
      onChange("");
      return;
    }
    const iso = toISOFormat(trimmed);
    onChange(iso);
  };

  return (
    <div className="grid grid-cols-1">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative flex">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          pattern="\d{4}-\d{2}-\d{2}"
          placeholder={placeholder ?? "YYYY-MM-DD"}
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          required={required}
          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
        />
      </div>
      <p className="mt-1 text-xs text-slate-500">Format: YYYY-MM-DD</p>
      {error ? <p className="mt-1 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}