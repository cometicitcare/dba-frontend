"use client";
import React, { useEffect, useState } from "react";
import { _aramaManage } from "@/services/arama";

type TempleOption = { trn: string; name: string; addrs?: string };

async function searchTemples(q: string, _page = 1, limit = 10): Promise<TempleOption[]> {
  const res = await _aramaManage({
    action: "READ_ALL",
    payload: { limit, search_key: q ?? "" },
  });
  const payload = (res as any)?.data ?? [];
  const rows = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload)
      ? payload
      : [];
  return rows.map((r: any) => ({
    trn: r.ar_trn,
    name: r.ar_vname || r.ar_trn,
    addrs: r.ar_addrs || "",
  }));
}

type Props = {
  id: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  initialDisplay?: string;
  onPick: (picked: { trn?: string; name?: string; display: string }) => void;
  storeTrn?: boolean;
};

export default function AramaAutocomplete({ id, label, placeholder, required, initialDisplay = "", onPick, storeTrn = true }: Props) {
  const [input, setInput] = useState<string>(initialDisplay);
  const [options, setOptions] = useState<TempleOption[]>([]);
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
        const rows = await searchTemples(q, 1, 10);
        if (key === debounceKey) setOptions(rows);
      } finally {
        if (key === debounceKey) setLoading(false);
      }
    }, 300);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, debounceKey]);

  const handleSelect = (opt: TempleOption) => {
    const display = `${opt.name} — ${opt.trn}`;
    onPick(storeTrn ? { trn: opt.trn, display } : { name: opt.name, display });
    setInput(display);
    setOpen(false);
  };

  return (
    <div
      className="relative"
      data-filter-keepopen="true"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-2">{label}</label>
      <input
        id={id}
        type="text"
        value={input}
        onChange={(e) => { setInput(e.target.value); setDebounceKey((k) => k + 1); setOpen(true); }}
        onFocus={() => { setFocused(true); setOpen(true); }}
        onBlur={() => { setFocused(false); setOpen(false); }}
        onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
        placeholder={placeholder ?? "Search temple — saves TRN"}
        required={required}
        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
        autoComplete="off"
      />
      {open && focused && (
        <div
          className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-auto"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {loading && <div className="px-3 py-2 text-sm text-slate-500">Searching…</div>}
          {!loading && options.length === 0 && <div className="px-3 py-2 text-sm text-slate-500">No matches</div>}
          {options.map((o) => (
            <button
              key={o.trn}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); handleSelect(o); }}
              className="w-full text-left px-3 py-2 hover:bg-slate-50"
            >
              <div className="text-sm font-medium text-slate-800">{o.name}</div>
              <div className="text-xs text-slate-500">{o.trn}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
