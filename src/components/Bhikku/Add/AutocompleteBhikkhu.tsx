"use client";
import React, { FormEvent, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { _manageBhikku, _manageTempBhikku } from "@/services/bhikku";
import LocationPicPd, { LocationPayload, LocationSelection } from "@/components/common/LocationPicPd";

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

type AddPayload = { name: string; phone?: string };

type Props = {
  id: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  initialDisplay?: string;
  onPick: (picked: { regn?: string; name?: string; display: string; data?: any }) => void;
  storeRegn?: boolean;
  onInputChange?: (value: string) => void;
  showAddButton?: boolean;
  onAddBhikkhu?: (payload: AddPayload) => Promise<void> | void;
};

export default function BhikkhuAutocomplete({
  id,
  label,
  placeholder,
  required,
  initialDisplay = "",
  onPick,
  storeRegn = true,
  onInputChange,
  showAddButton = true,
  onAddBhikkhu,
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
    const display = `${opt.name} - ${opt.regn}`;
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
          placeholder={placeholder ?? "Type a name / REGN"}
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
            aria-label="Add bhikkhu"
          >
            <span className="text-lg font-semibold leading-none">+</span>
          </button>
        )}
        {open && focused && (
          <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-auto">
            {loading && <div className="px-3 py-2 text-sm text-slate-500">Searching...</div>}
            {!loading && options.length === 0 && (
              <div className="px-3 py-2 text-sm text-slate-500">No matches</div>
            )}
            {options.map((o) => (
              <button
                key={o.regn}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(o);
                }}
                className="w-full text-left px-3 py-2 hover:bg-slate-50"
              >
                <div className="text-sm font-medium text-slate-800">{o.name}</div>
                <div className="text-xs text-slate-500">{o.regn}</div>
              </button>
            ))}
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

                  const bhikkuRegn = created?.br_regn || "";
                  const bhikkhuName = created?.br_mahananame || created?.br_gihiname || name;
                  const display = `${bhikkhuName} - ${bhikkuRegn}`;

                  onPick(
                    storeRegn
                      ? { regn: bhikkuRegn, name: bhikkhuName, display, data: created }
                      : { name: bhikkhuName, display, data: created }
                  );
                  setInput(display);
                  await onAddBhikkhu?.({
                    name,
                  });
                  setAddDialogOpen(false);
                  resetDialogFields();
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

