"use client";
import React, { useEffect, useState } from "react";
import { _manageBhikku } from "@/services/bhikku";

type BhikkhuOption = { regn: string; name: string; data: any };

async function searchBhikkhus(q: string, page = 1, limit = 10): Promise<BhikkhuOption[]> {
  const res = await _manageBhikku({
    action: "READ_ALL",
    payload: { skip: 0, limit, page, search_key: q ?? "" },
  } as any);
  const rows: any[] = (res as any)?.data?.data ?? [];
  return rows.map((r) => ({
    regn: r.br_regn,
    name: r.br_mahananame || r.br_gihiname || r.br_regn,
    data: r,
  }));
}

type Props = {
  id: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  initialDisplay?: string;
  onPick: (picked: { regn?: string; name?: string; display: string; data?: any }) => void;
  storeRegn?: boolean;
  onInputChange?: (value: string) => void;
};

export default function BhikkhuAutocomplete({ id, label, placeholder, required, initialDisplay = "", onPick, storeRegn = true, onInputChange }: Props) {
  const [input, setInput] = useState<string>(initialDisplay);
  const [options, setOptions] = useState<BhikkhuOption[]>([]);
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
        const rows = await searchBhikkhus(q, 1, 10);
        if (key === debounceKey) setOptions(rows);
      } finally {
        if (key === debounceKey) setLoading(false);
      }
    }, 300);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, debounceKey]);

  const handleSelect = (opt: BhikkhuOption) => {
    const display = `${opt.name} — ${opt.regn}`;
    onPick(
      storeRegn
        ? { regn: opt.regn, display, data: opt.data }
        : { name: opt.name, display, data: opt.data }
    );
    setInput(display);
    setOpen(false);
  };

  return (
    <div className="relative">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
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
        onFocus={() => { setFocused(true); setOpen(true); }}
        onBlur={() => { setFocused(false); setOpen(false); }}
        onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
        placeholder={placeholder ?? "Type a name / REGN…"}
        required={required}
        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
        autoComplete="off"
      />
      {open && focused && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-auto">
          {loading && <div className="px-3 py-2 text-sm text-slate-500">Searching…</div>}
          {!loading && options.length === 0 && <div className="px-3 py-2 text-sm text-slate-500">No matches</div>}
          {options.map((o) => (
            <button
              key={o.regn}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); handleSelect(o); }}
              className="w-full text-left px-3 py-2 hover:bg-slate-50"
            >
              <div className="text-sm font-medium text-slate-800">{o.name}</div>
              <div className="text-xs text-slate-500">{o.regn}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
