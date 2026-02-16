"use client";
import React, { useEffect, useState } from "react";
import { _getSasanarakshakaList } from "@/services/sasanarakshaka";

type SasanarakshakaOption = {
  code: string;
  name: string;
  id?: number;
  data?: any;
};

type Props = {
  id: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  initialDisplay?: string;
  onPick: (picked: { code: string; name: string; display: string; data?: any }) => void;
  onInputChange?: (value: string) => void;
  srDvcd?: string;
  limit?: number;
};

function getAuthToken() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as any;
    return (
      parsed?.token ??
      parsed?.access_token ??
      parsed?.accessToken ??
      parsed?.data?.token ??
      parsed?.data?.access_token ??
      parsed?.user?.token ??
      parsed?.user?.access_token ??
      null
    );
  } catch {
    return null;
  }
}

async function searchSasanarakshaka(
  q: string,
  srDvcd?: string,
  page = 1,
  limit = 10
): Promise<SasanarakshakaOption[]> {
  const token = getAuthToken();
  const res = await _getSasanarakshakaList(
    {
      page,
      limit,
      search_key: q ?? "",
      sr_dvcd: srDvcd ?? "",
    },
    token
  );
  const rows: any[] = (res as any)?.data?.data ?? [];
  return rows
    .filter((r) => r?.sr_ssbname || r?.sr_ssbmcode)
    .map((r) => ({
      code: r.sr_ssbmcode,
      name: r.sr_ssbname || r.sr_ssbmcode,
      id: r.sr_id,
      data: r,
    }));
}

export default function SasanarakshakaAutocomplete({
  id,
  label,
  placeholder,
  required,
  initialDisplay = "",
  onPick,
  onInputChange,
  srDvcd,
  limit = 10,
}: Props) {
  const [input, setInput] = useState<string>(initialDisplay);
  const [options, setOptions] = useState<SasanarakshakaOption[]>([]);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [debounceKey, setDebounceKey] = useState(0);

  useEffect(() => {
    const key = debounceKey;
    const h = setTimeout(async () => {
      const q = input?.trim() ?? "";
      setLoading(true);
      try {
        const rows = await searchSasanarakshaka(q, srDvcd, 1, limit);
        if (key === debounceKey) setOptions(rows);
      } finally {
        if (key === debounceKey) setLoading(false);
      }
    }, 300);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, debounceKey, srDvcd, limit]);

  const handleSelect = (opt: SasanarakshakaOption) => {
    const display = `${opt.name} - ${opt.code}`;
    onPick({ code: opt.code, name: opt.name, display, data: opt.data });
    setInput(display);
    setOpen(false);
  };

  return (
    <div className="relative">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
        <input
          id={id}
          type="text"
          value={input}
          onChange={(e) => {
            const value = e.target.value;
            setInput(value);
            setDebounceKey((k) => k + 1);
            setOpen(true);
            onInputChange?.(value);
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
          placeholder={placeholder ?? "Type SSB name or code"}
          required={required}
          className="w-full pr-4 pl-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
          autoComplete="off"
        />
        {open && focused && (
          <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-auto">
            {loading && <div className="px-3 py-2 text-sm text-slate-500">Searching...</div>}
            {!loading && options.length === 0 && (
              <div className="px-3 py-2 text-sm text-slate-500">No matches</div>
            )}
            {options.map((o) => (
              <button
                key={`${o.code}-${o.id ?? ""}`}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(o);
                }}
                className="w-full text-left px-3 py-2 hover:bg-slate-50"
              >
                <div className="text-sm font-medium text-slate-800">{o.name}</div>
                <div className="text-xs text-slate-500">{o.code}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
