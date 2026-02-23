"use client";
import React, { FormEvent, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { _manageBhikku, _manageTempBhikku } from "@/services/bhikku";
import LocationPicPd, { LocationPayload, LocationSelection } from "@/components/common/LocationPicPd";

type BhikkhuOption = { regn: string; name: string; data?: any };

async function searchBhikkhus(q: string, page = 1, limit = 10): Promise<BhikkhuOption[]> {
  // Search all bhikkhus (including temp ones marked with [TEMP_BHIKKU] in remarks)
  // Backend now saves temp bhikkhus to bhikku_regist table with normal BH numbers
  const res = await _manageBhikku({
    action: "READ_ALL",
    payload: { skip: 0, limit, search_key: q ?? "" },
  } as any);
  const rows: any[] = (res as any)?.data?.data ?? [];
  return rows.map((r) => ({
    regn: r.br_regn,
    name: r.br_mahananame || r.br_gihiname || r.br_regn,
    data: r,
  }));
}

type AddPayload = { name: string; phone?: string };

type Props = {
  id: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  initialDisplay?: string;
  onPick: (picked: { regn?: string; name?: string; display: string; data?: any }) => void;
  onInputChange?: (value: string) => void;
  storeRegn?: boolean;
  showAddButton?: boolean;
  onAddBhikkhu?: (payload: AddPayload) => Promise<void> | void;
  clearAfterPick?: boolean;
};

export default function BhikkhuAutocomplete({ 
  id, 
  label, 
  placeholder, 
  required, 
  initialDisplay = "", 
  onPick, 
  onInputChange, 
  storeRegn = true,
  showAddButton = true,
  onAddBhikkhu,
  clearAfterPick = false,
}: Props) {
  const [input, setInput] = useState<string>(initialDisplay);
  const [options, setOptions] = useState<BhikkhuOption[]>([]);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [debounceKey, setDebounceKey] = useState(0);
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [newBhikkhuName, setNewBhikkhuName] = useState("");
  const [tbAddress, setTbAddress] = useState("");
  const [tbViharaName, setTbViharaName] = useState("");
  const [locationSelection, setLocationSelection] = useState<LocationSelection>({});
  const [locationPayload, setLocationPayload] = useState<LocationPayload>({});
  const [addSubmitting, setAddSubmitting] = useState(false);

  const resetDialogFields = () => {
    setNewBhikkhuName("");
    setTbAddress("");
    setTbViharaName("");
    setLocationSelection({});
    setLocationPayload({});
  };

  // Sync input with initialDisplay when it changes (for controlled updates)
  useEffect(() => {
    if (initialDisplay !== input) {
      setInput(initialDisplay);
    }
  }, [initialDisplay]);

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
    onPick(storeRegn ? { regn: opt.regn, name: opt.name, display, data: opt.data } : { name: opt.name, display, data: opt.data });
    setInput(display);
    setOpen(false);
    
    // Clear input after a brief delay if clearAfterPick is true
    if (clearAfterPick) {
      setTimeout(() => {
        setInput("");
      }, 800);
    }
  };

  return (
    <div className="relative">
      <label htmlFor={id} className="block text-xs font-medium text-slate-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
        <input
          id={id}
          type="text"
          value={input}
          onChange={(e) => {
            const next = e.target.value;
            setInput(next);
            onInputChange?.(next);
            setDebounceKey((k) => k + 1);
            setOpen(true);
          }}
          onFocus={() => { setFocused(true); setOpen(true); }}
          onBlur={() => { setFocused(false); setOpen(false); }}
          onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
          placeholder={placeholder ?? "Search by name, REGN, temple, or address"}
          required={required}
          className="w-full pr-12 pl-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
          autoComplete="off"
        />
        {showAddButton && (
          <button
            type="button"
            onClick={() => {
              resetDialogFields();
              setAddDialogOpen(true);
            }}
            className="absolute right-1 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm hover:border-slate-400 hover:text-slate-700 transition"
            aria-label="Add temporary bhikkhu"
          >
            <span className="text-lg font-semibold leading-none">+</span>
          </button>
        )}
        {open && focused && (
          <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-80 overflow-auto">
            {loading && <div className="px-3 py-2 text-xs text-slate-500">Searching…</div>}
            {!loading && options.length === 0 && <div className="px-3 py-2 text-xs text-slate-500">No matches</div>}
            {options.map((o) => {
              // Determine if this is a temporary bhikku
              const isTemporary = o.regn?.startsWith('TEMP-');
              
              // Get living temple info
              const livTemple = o.data?.br_livtemple;
              const livTempleInfo = typeof livTemple === 'object' ? livTemple : null;
              const livTempleName = livTempleInfo?.vh_vname || '';
              const livTempleAddr = livTempleInfo?.vh_addrs || '';
              
              // Get mahana temple info
              const mahanaTemple = o.data?.br_mahanatemple;
              const mahanaTempleInfo = typeof mahanaTemple === 'object' ? mahanaTemple : null;
              const mahanaTempleName = mahanaTempleInfo?.vh_vname || '';
              const mahanaTempleAddr = mahanaTempleInfo?.vh_addrs || '';
              
              // Use living temple if available, otherwise use mahana temple
              const displayTemplate = livTempleInfo || mahanaTempleInfo;
              const displayName = livTempleName || mahanaTempleName;
              const displayAddr = livTempleAddr || mahanaTempleAddr;
              const isSecondary = !livTempleInfo && mahanaTempleInfo;
              
              return (
                <button
                  key={o.regn}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); handleSelect(o); }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-medium text-slate-800">{o.name}</div>
                      <div className="text-[11px] text-slate-500">{o.regn}</div>
                    </div>
                    {isTemporary && (
                      <span className="inline-block ml-2 px-2 py-1 text-[10px] font-semibold text-amber-700 bg-amber-100 rounded">
                        TEMPORARY
                      </span>
                    )}
                  </div>
                  {displayName ? (
                    <div className="text-[11px] text-slate-600 mt-1">
                      <span className="font-semibold">{isSecondary ? 'Mahana Temple:' : 'Living Temple:'}</span> {displayName}
                    </div>
                  ) : (
                    <div className="text-[11px] text-amber-600 mt-1">
                      <span className="font-semibold">Temple:</span> <span className="italic">(Not assigned)</span>
                    </div>
                  )}
                  {displayAddr ? (
                    <div className="text-[11px] text-slate-600">
                      <span className="font-semibold">Address:</span> {displayAddr}
                    </div>
                  ) : displayName ? (
                    <div className="text-[11px] text-amber-600">
                      <span className="font-semibold">Address:</span> <span className="italic">(Not recorded)</span>
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
      </div>
      {isAddDialogOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Create Temporary Bhikkhu</h3>
              <button
                type="button"
                onClick={() => setAddDialogOpen(false)}
                className="text-slate-500 hover:text-slate-800"
                aria-label="Close dialog"
              >
                x
              </button>
            </div>
            <form
              onSubmit={async (event: FormEvent<HTMLFormElement>) => {
                event.preventDefault();
                const name = newBhikkhuName.trim();
                if (!name) return;
                setAddSubmitting(true);
                try {
                  const response = await _manageTempBhikku({
                    action: "CREATE",
                    payload: {
                      data: {
                        tb_bname: name,
                        tb_name: name,
                        tb_address: tbAddress.trim(),
                        tb_district: locationPayload.district?.dd_dname ?? "කොළඹ",
                        tb_province: locationPayload.province?.cp_name,
                        tb_vihara_name: tbViharaName.trim(),
                      },
                    },
                  });
                  const created = (response as any)?.data?.data;
                  toast.success("Temporary bhikkhu created");
                  
                  // Backend now returns normal bhikku with BH registration number (not TEMP- prefix)
                  // Response contains standard bhikku fields: br_regn, br_mahananame, etc.
                  const bhikkuRegn = created?.br_regn || "";
                  const bhikkhuName = created?.br_mahananame || created?.br_gihiname || name;
                  const display = `${bhikkhuName} — ${bhikkuRegn}`;
                  
                  // Call onPick to populate the parent form
                  onPick({
                    regn: bhikkuRegn,
                    name: bhikkhuName,
                    display,
                    data: created, // Pass the full bhikku object
                  });
                  
                  setInput(display);
                  await onAddBhikkhu?.({ name });
                  setAddDialogOpen(false);
                  resetDialogFields();
                  
                  // Clear input after brief delay if clearAfterPick is true
                  if (clearAfterPick) {
                    setTimeout(() => {
                      setInput("");
                    }, 800);
                  }
                } finally {
                  setAddSubmitting(false);
                }
              }}
              className="space-y-4"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">
                  Name <span className="text-xs text-red-500">*</span>
                  <input
                    type="text"
                    value={newBhikkhuName}
                    onChange={(e) => setNewBhikkhuName(e.target.value)}
                    required
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Vihara Name
                  <input
                    type="text"
                    value={tbViharaName}
                    onChange={(e) => setTbViharaName(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                  />
                </label>
              </div>
              <label className="block text-sm font-medium text-slate-700">
                Address <span className="text-xs text-slate-500">(Optional)</span>
                <textarea
                  value={tbAddress}
                  onChange={(e) => setTbAddress(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                  placeholder="Address"
                />
              </label>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Location <span className="text-xs text-slate-500">(Optional)</span>
                </label>
                <LocationPicPd
                  value={locationSelection}
                  onChange={(selection, payload) => {
                    setLocationSelection(selection);
                    setLocationPayload(payload);
                  }}
                  required={false}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddDialogOpen(false)}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addSubmitting}
                  className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60 transition"
                >
                  {addSubmitting ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
