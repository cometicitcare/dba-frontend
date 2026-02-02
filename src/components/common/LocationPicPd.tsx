"use client";
import React, { useCallback, useMemo, useState } from "react";
import selectionsData from "@/utils/selectionsData.json";

export type District = {
  dd_id: number;
  dd_dcode: string;
  dd_dname: string;
  dd_prcode: string;
  divisional_secretariats?: unknown[];
};

export type Province = {
  cp_id: number;
  cp_code: string;
  cp_name: string;
  districts: District[];
};

const STATIC_PROVINCES: Province[] = Array.isArray((selectionsData as any)?.provinces)
  ? ((selectionsData as any).provinces as Province[])
  : [];

export type LocationSelection = {
  provinceCode?: string;
  districtCode?: string;
};

export type LocationPayload = {
  province?: Province;
  district?: District;
};

type Props = {
  value?: LocationSelection;
  onChange?: (selection: LocationSelection, payload: LocationPayload) => void;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  labels?: Partial<{ province: string; district: string }>;
};

export default function LocationPicPd({
  value,
  onChange,
  className,
  disabled = false,
  required = false,
  labels: labelsOverride,
}: Props) {
  const labels = { province: "Province", district: "District", ...labelsOverride };

  const renderLabel = (text: string) => (
    <>
      {text}
      {required && <span className="text-red-500 ml-1">*</span>}
    </>
  );

  const provinces = STATIC_PROVINCES;
  const [internal, setInternal] = useState<LocationSelection>({});
  const selection = value ?? internal;

  const currentProvince = useMemo(
    () => provinces.find((p) => p.cp_code === selection.provinceCode),
    [provinces, selection.provinceCode]
  );
  const districts = currentProvince?.districts ?? [];
  const currentDistrict = useMemo(
    () => districts.find((d) => d.dd_dcode === selection.districtCode),
    [districts, selection.districtCode]
  );

  const emit = useCallback(
    (next: LocationSelection) => {
      onChange?.(next, { province: currentProvince, district: currentDistrict });
    },
    [onChange, currentProvince, currentDistrict]
  );

  const setSelection = useCallback(
    (patch: Partial<LocationSelection>) => {
      const next = { ...(value ?? internal), ...patch };
      if (!value) setInternal(next);
      emit(next);
    },
    [emit, internal, value]
  );

  if (!provinces.length) return <div role="alert">No location data available.</div>;

  return (
    <div className={className}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block mb-1 text-sm font-medium">{renderLabel(labels.province)}</label>
          <select
            className="w-full border rounded-md px-3 py-2"
            value={selection.provinceCode ?? ""}
            onChange={(e) =>
              setSelection({
                provinceCode: e.target.value || undefined,
                districtCode: undefined,
              })
            }
            disabled={disabled}
            required={required}
          >
            <option value="">Select Province</option>
            {provinces.map((p) => (
              <option key={p.cp_code} value={p.cp_code}>
                {p.cp_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block mb-1 text-sm font-medium">{renderLabel(labels.district)}</label>
          <select
            className="w-full border rounded-md px-3 py-2"
            value={selection.districtCode ?? ""}
            onChange={(e) => setSelection({ districtCode: e.target.value || undefined })}
            disabled={disabled || !currentProvince}
            required={required}
          >
            <option value="">Select District</option>
            {districts.map((d) => (
              <option key={d.dd_dcode} value={d.dd_dcode}>
                {d.dd_dname}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
