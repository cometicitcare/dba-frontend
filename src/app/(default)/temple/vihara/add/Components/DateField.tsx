"use client";
import React, { useState, useEffect } from "react";
import { toDisplayFormat } from "./helpers";

type Props = {
  id: string;
  label: string;
  value: string;
  onChange: (displayFormat: string) => void;
  required?: boolean;
  placeholder?: string;
  error?: string;
};

/**
 * Plain text date input — user types YYYY/MM/DD freely.
 *
 * Key behaviour:
 *  - A LOCAL draft state holds whatever the user is currently typing.
 *    `toDisplayFormat` is NEVER called during active typing — only on blur.
 *    This prevents the input from blanking out mid-keystroke.
 *  - On blur the draft is normalised to YYYY/MM/DD and pushed to the parent.
 *  - When the parent `value` prop changes from outside (e.g. initial API load)
 *    the draft is synced via useEffect, converting to display format once.
 */
export default function DateField({ id, label, value, onChange, required, placeholder, error }: Props) {
  // draft holds raw in-progress text while the user is typing
  const [draft, setDraft] = useState<string>(() => toDisplayFormat(value));

  // Sync draft when the external value changes (e.g. API data loaded, form reset)
  useEffect(() => {
    setDraft(toDisplayFormat(value));
  }, [value]);

  const handleChange = (raw: string) => {
    // Allow digits and slashes only, cap at 10 chars — NO reformatting here
    const cleaned = raw.replace(/[^\d/]/g, "").slice(0, 10);
    setDraft(cleaned);
  };

  const handleBlur = () => {
    const normalised = toDisplayFormat(draft);
    setDraft(normalised);   // show normalised form in the input
    onChange(normalised);   // push to parent
  };

  return (
    <div className="grid grid-cols-1">
      <label htmlFor={id} className="block text-xs font-medium text-slate-700 mb-1.5">{label}</label>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        placeholder={placeholder ?? "YYYY/MM/DD"}
        value={draft}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        required={required}
        maxLength={10}
        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
      />
      <p className="mt-1 text-[11px] text-slate-500">Format: YYYY/MM/DD</p>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
