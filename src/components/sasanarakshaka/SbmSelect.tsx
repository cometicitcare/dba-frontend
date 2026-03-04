"use client";
/**
 * SbmSelect
 * A cascading select for Pradeshīya Shāsanarakshaka Bala Mandalaya (SBM/SSBM).
 * Options come from selectionsData.json (static) — no API call needed.
 *
 * Behaviour:
 *   no district  → disabled, shows "Select District first"
 *   district set → loads all SBMs in that district
 *   DV set       → narrows to only SBMs in that divisional secretariat
 *
 * Always shows the human-readable name in the list. Stores the sr_ssbmcode as value.
 */

import React, { useEffect, useRef, useState } from "react";
import {
  locationHierarchyService,
  type LocationOption,
} from "@/services/locationHierarchyService";

interface SbmSelectProps {
  id?: string;
  label: string;
  value: string; // sr_ssbmcode stored in form state
  districtCode?: string;
  dvCode?: string;
  onChange: (code: string) => void;
  error?: string;
  required?: boolean;
  className?: string;
}

export default function SbmSelect({
  id = "pradeshya_sabha",
  label,
  value,
  districtCode,
  dvCode,
  onChange,
  error,
  required,
  className,
}: SbmSelectProps) {
  const [options, setOptions] = useState<LocationOption[]>([]);
  // Track whether this is the very first options load so we don't auto-clear
  // a pre-populated value that was saved in a previous session (update form).
  const isFirstOptionsLoad = useRef(true);

  useEffect(() => {
    // Cascade: DV-level is narrower, district-level is broader
    if (dvCode) {
      locationHierarchyService.getSbmsByDv(dvCode).then(setOptions);
    } else if (districtCode) {
      locationHierarchyService.getSbmsByDistrict(districtCode).then(setOptions);
    } else {
      setOptions([]);
    }
  }, [dvCode, districtCode]);

  // When DV/district change and current value no longer belongs to new list, clear it.
  // Skip on the very first load so an existing saved code is preserved (update form).
  useEffect(() => {
    if (isFirstOptionsLoad.current) {
      // First load: preserve whatever was loaded from the existing record
      isFirstOptionsLoad.current = false;
      return;
    }
    if (value && options.length > 0 && !options.some((o) => o.code === value)) {
      onChange("");
    }
  }, [options]); // eslint-disable-line react-hooks/exhaustive-deps

  const placeholder = dvCode
    ? "Select SBM (filtered by Div. Sec.)"
    : districtCode
    ? "Select SBM (filtered by District)"
    : "Select District first";

  const disabled = !districtCode;

  return (
    <div>
      <label
        htmlFor={id}
        className="block text-xs font-medium text-slate-700 mb-1.5"
      >
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
        className={
          className ??
          "w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all disabled:bg-slate-100 disabled:cursor-not-allowed"
        }
      >
        <option value="">{placeholder}</option>
        {/* If saved code isn't in the current list (e.g. old record / code mismatch),
            render it as a visible fallback so the field doesn't appear blank */}
        {value && options.length > 0 && !options.some((o) => o.code === value) && (
          <option value={value}>{value} (saved — not in current list)</option>
        )}
        {options.map((opt) => (
          <option key={opt.code} value={opt.code}>
            {opt.name}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
