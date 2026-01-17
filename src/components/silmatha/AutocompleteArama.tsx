"use client";
import React, { FormEvent, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { _aramaManage, _manageTempArama } from "@/services/arama";
import LocationPicPd, { LocationSelection } from "@/components/common/LocationPicPd";

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
  showAddButton?: boolean;
  onAddArama?: (result: {
    name?: string;
    trn?: string;
    display?: string;
    data?: any;
  }) => Promise<void> | void;
};

export default function AramaAutocomplete({
  id,
  label,
  placeholder,
  required,
  initialDisplay = "",
  onPick,
  storeTrn = true,
  showAddButton = true,
  onAddArama,
}: Props) {
  const [input, setInput] = useState<string>(initialDisplay);
  const [options, setOptions] = useState<TempleOption[]>([]);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [debounceKey, setDebounceKey] = useState(0);
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [newAramadhipathiName, setNewAramadhipathiName] = useState("");
  const [newAramaName, setNewAramaName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [locationSelection, setLocationSelection] = useState<LocationSelection>({});

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
    const display = `${opt.name} - ${opt.trn}`;
    onPick(storeTrn ? { trn: opt.trn, display } : { name: opt.name, display });
    setInput(display);
    setOpen(false);
  };

  const resetAddForm = () => {
    setNewAramadhipathiName("");
    setNewAramaName("");
    setNewAddress("");
    setLocationSelection({});
  };

  return (
    <div
      className="relative"
      data-filter-keepopen="true"
      onMouseDown={(e) => e.stopPropagation()}
    >
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
          placeholder={placeholder ?? "Search arama - saves TRN"}
          required={required}
          className="w-full pr-12 px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
          autoComplete="off"
        />
        {showAddButton && (
          <button
            type="button"
            className="absolute right-1 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm hover:border-slate-400 hover:text-slate-700 transition"
            aria-label="Add temporary arama"
            onClick={() => {
              resetAddForm();
              setAddDialogOpen(true);
            }}
          >
            <span className="text-lg font-semibold leading-none">+</span>
          </button>
        )}
      </div>
      {open && focused && (
        <div
          className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-auto"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {loading && <div className="px-3 py-2 text-sm text-slate-500">Searching...</div>}
          {!loading && options.length === 0 && (
            <div className="px-3 py-2 text-sm text-slate-500">No matches</div>
          )}
          {options.map((o) => (
            <button
              key={o.trn}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(o);
              }}
              className="w-full text-left px-3 py-2 hover:bg-slate-50"
            >
              <div className="text-sm font-medium text-slate-800">{o.name}</div>
              <div className="text-xs text-slate-500">{o.trn}</div>
            </button>
          ))}
        </div>
      )}

      {isAddDialogOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Create Temporary Arama</h3>
              <button
                type="button"
                onClick={() => {
                  setAddDialogOpen(false);
                  resetAddForm();
                }}
                className="text-slate-500 hover:text-slate-800"
                aria-label="Close dialog"
              >
                x
              </button>
            </div>
            <form
              onSubmit={async (event: FormEvent<HTMLFormElement>) => {
                event.preventDefault();
                const name = newAramaName.trim();
                if (!name) return;
                setAddSubmitting(true);
                try {
                  const res = await _manageTempArama({
                    action: "CREATE",
                    payload: {
                      data: {
                        ta_name: name,
                        ta_address: newAddress.trim(),
                        ta_district: locationSelection.districtCode,
                        ta_province: locationSelection.provinceCode,
                        ta_aramadhipathi_name: newAramadhipathiName.trim(),
                      },
                    },
                  });
                  const created = (res as any)?.data?.data;
                  const displayName = created?.ta_name ?? name;
                  const createdTrn = created?.ta_trn ?? created?.ar_trn;
                  toast.success("Temporary arama created");
                  await onAddArama?.({
                    name: displayName,
                    trn: createdTrn,
                    display: displayName,
                    data: created,
                  });
                  setAddDialogOpen(false);
                  resetAddForm();
                  setDebounceKey((k) => k + 1);
                } finally {
                  setAddSubmitting(false);
                }
              }}
              className="space-y-4"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">
                  Aramadhipathi Name
                  <input
                    type="text"
                    value={newAramadhipathiName}
                    onChange={(e) => setNewAramadhipathiName(e.target.value)}
                    required
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Arama Name
                  <input
                    type="text"
                    value={newAramaName}
                    onChange={(e) => setNewAramaName(e.target.value)}
                    required
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                  />
                </label>
                <div className="col-span-full">
                  <label className="block text-sm font-medium text-slate-700">
                    Address
                    <textarea
                      value={newAddress}
                      onChange={(e) => setNewAddress(e.target.value)}
                      rows={3}
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                    />
                  </label>
                </div>
                <div className="col-span-full">
                  <LocationPicPd
                    value={locationSelection}
                    onChange={setLocationSelection}
                    required
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAddDialogOpen(false);
                    resetAddForm();
                  }}
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
