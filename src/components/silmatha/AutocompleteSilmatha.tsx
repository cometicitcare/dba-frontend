"use client";
import React, { FormEvent, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { _manageSilmatha, _manageTempSilmatha } from "@/services/silmatah";
import LocationPicPd, { LocationSelection } from "@/components/common/LocationPicPd";

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
    name: row.sil_mahananame || row.sil_regn,
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
  onInputChange?: (value: string) => void;
  showAddButton?: boolean;
  onAddSilmatha?: (payload: { name: string }) => Promise<void> | void;
};

export default function SilmathaAutocomplete({
  id,
  label,
  placeholder,
  required,
  initialDisplay = "",
  onPick,
  storeRegn = true,
  onInputChange,
  showAddButton = true,
  onAddSilmatha,
}: Props) {
  const [input, setInput] = useState<string>(initialDisplay);
  const [options, setOptions] = useState<SilmathaOption[]>([]);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [debounceKey, setDebounceKey] = useState(0);
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [newSilmathaName, setNewSilmathaName] = useState("");
  const [tsAddress, setTsAddress] = useState("");
  const [tsAramaName, setTsAramaName] = useState("");
  const [ordainedDate, setOrdainedDate] = useState("");
  const [locationSelection, setLocationSelection] = useState<LocationSelection>({});
  const [addSubmitting, setAddSubmitting] = useState(false);

  const resetDialogFields = () => {
    setNewSilmathaName("");
    setTsAddress("");
    setTsAramaName("");
    setOrdainedDate("");
    setLocationSelection({});
  };

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
          placeholder={placeholder ?? "Type a Silmatha name / REGN"}
          required={required}
          className="w-full pr-12 pl-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
          autoComplete="off"
        />
        {showAddButton && (
          <button
            type="button"
            onClick={() => {
              resetDialogFields();
              setAddDialogOpen(true);
            }}
            className="absolute right-1 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm hover:border-slate-400 hover:text-slate-700 transition"
            aria-label="Add silmatha"
          >
            <span className="text-lg font-semibold leading-none">+</span>
          </button>
        )}
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
      {isAddDialogOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                Create Temporary Silmatha
              </h3>
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
                const name = newSilmathaName.trim();
                if (!name) return;
                setAddSubmitting(true);
                try {
                  await _manageTempSilmatha({
                    action: "CREATE",
                    payload: {
                      data: {
                        ts_name: name,
                        ts_address: tsAddress.trim(),
                        ts_district: locationSelection.districtCode,
                        ts_province: locationSelection.provinceCode,
                        ts_arama_name: tsAramaName.trim(),
                        ts_ordained_date: ordainedDate.trim(),
                      },
                    },
                  });
                  toast.success("Temporary silmatha created");
                  await onAddSilmatha?.({ name });
                  setAddDialogOpen(false);
                } finally {
                  setAddSubmitting(false);
                }
              }}
              className="space-y-4"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">
                  Name
                  <input
                    type="text"
                    value={newSilmathaName}
                    onChange={(e) => setNewSilmathaName(e.target.value)}
                    required
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Arama Name
                  <input
                    type="text"
                    value={tsAramaName}
                    onChange={(e) => setTsAramaName(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                  />
                </label>
              </div>
              <label className="block text-sm font-medium text-slate-700">
                Address
                <textarea
                  value={tsAddress}
                  onChange={(e) => setTsAddress(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                  placeholder="Address"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Ordained Date
                <input
                  type="date"
                  value={ordainedDate}
                  onChange={(e) => setOrdainedDate(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
              </label>
              <div className="space-y-2">
                <LocationPicPd
                  value={locationSelection}
                  onChange={(selection) => {
                    setLocationSelection(selection);
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
