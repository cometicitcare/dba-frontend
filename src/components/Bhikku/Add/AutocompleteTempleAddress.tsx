"use client";
import React, { useEffect, useState } from "react";
import { _listTemple } from "@/services/temple";

type TempleOption = { trn: string; name: string; addrs?: string };

async function searchTemples(q: string, page = 1, limit = 10): Promise<TempleOption[]> {
  const res = await _listTemple({
    action: "READ_ALL",
    payload: { skip: 0, limit, page, search_key: q ?? "" },
  } as any);
  const rows: any[] = (res as any)?.data?.data ?? [];
  return rows.map((r) => ({
    trn: r.vh_trn,
    name: r.vh_vname || r.vh_trn,
    addrs: r.vh_addrs || "",
  }));
}

type Props = {
  id: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  initialDisplay?: string;
  onPick: (picked: { address: string; display: string; trn?: string; name?: string }) => void;
};

export default function TempleAutocompleteAddress({ id, label, placeholder, required, initialDisplay = "", onPick }: Props) {
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
    const display = `${opt.name}${opt.addrs ? ` — ${opt.addrs}` : ""}`;
    const address = opt.addrs ?? "";
    onPick({ address, display, trn: opt.trn, name: opt.name });
    setInput(display);
    setOpen(false);
  };

  return (
    <div className="relative">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-2">{label}</label>
      <input
        id={id}
        type="text"
        value={input}
        onChange={(e) => {
          const next = e.target.value;
          setInput(next);
          setDebounceKey((k) => k + 1);
          setOpen(true);
          onPick({ address: next.trim(), display: next });
        }}
        onFocus={() => { setFocused(true); setOpen(true); }}
        onBlur={() => { setFocused(false); setOpen(false); }}
        onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
        placeholder={placeholder ?? "Type any address or pick a suggestion…"}
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
              key={o.trn}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); handleSelect(o); }}
              className="w-full text-left px-3 py-2 hover:bg-slate-50"
            >
              <div className="text-sm font-medium text-slate-800">{o.name}</div>
              <div className="text-xs text-slate-500">{o.addrs || "—"}</div>
              <div className="text-[11px] text-slate-400">{o.trn}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}