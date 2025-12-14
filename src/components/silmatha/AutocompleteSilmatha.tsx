"use client";
import React, { useEffect, useState } from "react";
import { _manageSilmatha } from "@/services/silmatah";

type SilmathaOption = {
  regn: string;
  name: string;
  district?: string;
  province?: string;
};

export async function fetchSilmathaOptions(q: string, limit = 200): Promise<SilmathaOption[]> {
  const res: any = await _manageSilmatha({
    action: "READ_ALL",
    payload: { limit, search_key: q ?? "" },
  });
  const rows: any[] = res?.data?.data ?? [];
  return rows.map((row) => ({
    regn: row.sil_regn,
    name: row.sil_gihiname || row.sil_reqstdate || row.sil_regn,
    district: row.sil_district?.ds_name,
    province: row.sil_province?.pr_name,
  }));
}

type Props = {
  id: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  initialDisplay?: string;
  onPick: (picked: { regn?: string; name?: string; display: string }) => void;
  storeRegn?: boolean;
};

export default function SilmathaAutocomplete({
  id,
  label,
  placeholder,
  required,
  initialDisplay = "",
  onPick,
  storeRegn = true,
}: Props) {
  const [input, setInput] = useState<string>(initialDisplay);
  const [options, setOptions] = useState<SilmathaOption[]>([]);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [debounceKey, setDebounceKey] = useState(0);

  useEffect(() => {
    const key = debounceKey;
    const timeout = setTimeout(async () => {
      const q = input?.trim() ?? "";
      setLoading(true);
      try {
        const rows = await fetchSilmathaOptions(q);
        if (key === debounceKey) setOptions(rows);
      } finally {
        if (key === debounceKey) setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, debounceKey]);

  const handleSelect = (opt: SilmathaOption) => {
    const display = `${opt.name} (${opt.regn})`;
    onPick({ regn: storeRegn ? opt.regn : undefined, name: opt.name, display });
    setInput(display);
    setOpen(false);
  };

  return (
    <div className="relative">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-2">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          setDebounceKey((k) => k + 1);
          setOpen(true);
        }}
        onFocus={() => {
          setFocused(true);
          setOpen(true);
        }}
        onBlur={() => {
          setFocused(false);
          setOpen(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder={placeholder ?? "Type a Silmatha name / REGN"}
        required={required}
        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
        autoComplete="off"
      />
      {open && focused && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-auto">
          {loading && (
            <div className="px-3 py-2 text-sm text-slate-500">Searching...</div>
          )}
          {!loading && options.length === 0 && (
            <div className="px-3 py-2 text-sm text-slate-500">No matches</div>
          )}
          {options.map((opt) => (
            <button
              key={opt.regn}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(opt);
              }}
              className="w-full text-left px-3 py-2 hover:bg-slate-50"
            >
              <div className="text-sm font-medium text-slate-800">{opt.name}</div>
              <div className="text-xs text-slate-500">{opt.regn}</div>
              {(opt.district || opt.province) && (
                <div className="text-xs text-slate-400">
                  {opt.province ? `${opt.province} - ` : ""}
                  {opt.district ?? ""}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
