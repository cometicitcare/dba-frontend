"use client";
import React, { FormEvent, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { _listTemple, _manageTempTemple } from "@/services/temple";
import DateField from "@/components/common/DateField";
import LocationPicPd, { LocationSelection, Province } from "@/components/common/LocationPicPd";
import selectionsData from "@/utils/selectionsData.json";

const STATIC_PROVINCES: Province[] = Array.isArray((selectionsData as any)?.provinces)
  ? ((selectionsData as any).provinces as Province[])
  : [];

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
  showAddButton?: boolean;
  onAddTemple?: (result: { name?: string; trn?: string; display?: string; data?: any }) => Promise<void> | void;
};

export default function TempleAutocompleteAddress({
  id,
  label,
  placeholder,
  required,
  initialDisplay = "",
  onPick,
  showAddButton = true,
  onAddTemple,
}: Props) {
  const [input, setInput] = useState<string>(initialDisplay);
  const [options, setOptions] = useState<TempleOption[]>([]);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [debounceKey, setDebounceKey] = useState(0);
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [newBhikkhuName, setNewBhikkhuName] = useState("");
  const [newViharaName, setNewViharaName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newOrdainedDate, setNewOrdainedDate] = useState("");
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
    const display = `${opt.name}${opt.addrs ? ` - ${opt.addrs}` : ""}`;
    const trimmedAddress = (opt.addrs ?? "").trim();
    const address = trimmedAddress || opt.name;
    onPick({ address, display, trn: opt.trn, name: opt.name });
    setInput(display);
    setOpen(false);
  };

  const resetAddForm = () => {
    setNewBhikkhuName("");
    setNewViharaName("");
    setNewAddress("");
    setNewOrdainedDate("");
    setLocationSelection({});
  };

  const handleLocationChange = (selection: LocationSelection) => {
    setLocationSelection(selection);
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
            const next = e.target.value;
            setInput(next);
            setDebounceKey((k) => k + 1);
            setOpen(true);
            onPick({ address: next.trim(), display: next });
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
          placeholder={placeholder ?? "Type any address or pick a suggestion - "}
          required={required}
          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
          autoComplete="off"
        />
        {showAddButton && (
          <button
            type="button"
            className="absolute right-1 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm hover:border-slate-400 hover:text-slate-700 transition"
            aria-label="Add temporary vihara"
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
        <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-auto">
          {loading && <div className="px-3 py-2 text-sm text-slate-500">Searching...</div>}
          {!loading && options.length === 0 && <div className="px-3 py-2 text-sm text-slate-500">No matches</div>}
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
              <div className="text-xs text-slate-500">{o.addrs || "-"}</div>
              <div className="text-[11px] text-slate-400">{o.trn}</div>
            </button>
          ))}
        </div>
      )}

      {isAddDialogOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Temporary Temple</h3>
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
                const selectedProvince = STATIC_PROVINCES.find(
                  (province) => province.cp_code === locationSelection.provinceCode
                );
                const selectedDistrict = selectedProvince?.districts?.find(
                  (district) => district.dd_dcode === locationSelection.districtCode
                );
                const provinceName = selectedProvince?.cp_name ?? "";
                const districtName = selectedDistrict?.dd_dname ?? "";
                setAddSubmitting(true);
                try {
                  const payloadData = {
                    tv_name: newViharaName.trim(),
                    tv_address: newAddress.trim(),
                    tv_district: districtName,
                    tv_province: provinceName,
                    tv_viharadhipathi_name: newBhikkhuName.trim(),
                  };
                  const res = await _manageTempTemple({
                    action: "CREATE",
                    payload: {
                      data: payloadData,
                    },
                  });
                  const created = (res as any)?.data?.data;
                  const displayName = created?.tv_name ?? newViharaName.trim();
                  const createdTrn = created?.vh_trn ?? created?.tv_trn;
                  toast.success("Temporary vihara created");
                  await onAddTemple?.({
                    name: displayName,
                    trn: createdTrn,
                    display: displayName,
                    data: created,
                  });
                  const addressOption = created?.tv_address ?? newAddress.trim();
                  onPick({
                    address: addressOption,
                    display: `${displayName} - ${districtName || ""}`.trim(),
                    name: displayName,
                    trn: createdTrn,
                  });
                  setInput(addressOption);
                  setAddDialogOpen(false);
                  resetAddForm();
                  setDebounceKey((k) => k + 1);
                } finally {
                  setAddSubmitting(false);
                }
              }}
              className="space-y-4"
            >
              <div className="grid gap-4 md:grid-cols-4">
                <label className="block text-sm font-medium text-slate-700">
                  Bhikkhu Name
                  <input
                    type="text"
                    value={newBhikkhuName}
                    onChange={(e) => setNewBhikkhuName(e.target.value)}
                    required
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Temple Name
                  <input
                    type="text"
                    value={newViharaName}
                    onChange={(e) => setNewViharaName(e.target.value)}
                    required
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                  />
                </label>
                <div className="md:col-span-2">
                  <DateField
                    id={`${id}-ordained`}
                    label="Ordained Date"
                    value={newOrdainedDate}
                    onChange={setNewOrdainedDate}
                    required
                  />
                </div>
                <div className="col-span-full">
                  <label className="block text-sm font-medium text-slate-700">
                    Address
                    <textarea
                      value={newAddress}
                      onChange={(e) => setNewAddress(e.target.value)}
                      required
                      rows={3}
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                    />
                  </label>
                </div>
                <div className="col-span-full">
                  <LocationPicPd
                    value={locationSelection}
                    onChange={handleLocationChange}
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
