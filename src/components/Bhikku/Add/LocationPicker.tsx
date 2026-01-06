"use client";
import React, { useCallback, useMemo, useState } from "react";
import selectionsData from "@/utils/selectionsData.json";

export type GnDivision = {
  gn_id?: number;
  gn_gnc?: string;
  gn_code?: string;
  gn_gnname: string;
  [k: string]: unknown;
};

export type Division = {
  dv_id: number;
  dv_dvcode: string;
  dv_distrcd: string;
  dv_dvname: string;
  gn_divisions?: GnDivision[];
};

export type District = {
  dd_id: number;
  dd_dcode: string;
  dd_dname: string;
  dd_prcode: string;
  divisional_secretariats: Division[];
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
  divisionCode?: string;
  gnCode?: string;
};

export type LocationPayload = {
  province?: Province;
  district?: District;
  division?: Division;
  gn?: GnDivision;
};

export const gnCodeOf = (g?: GnDivision): string | undefined => g?.gn_gnc ?? g?.gn_code ?? undefined;

type Props = {
  value?: LocationSelection;
  onChange?: (selection: LocationSelection, payload: LocationPayload) => void;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  labels?: Partial<{ province: string; district: string; division: string; gn: string }>;
};

export default function LocationPicker({
  value,
  onChange,
  className,
  disabled = false,
  required = false,
  labels: labelsOverride,
}: Props) {
  const labels = { province: "Province", district: "District", division: "Divisional Secretariat", gn: "GN Division", ...labelsOverride };

  const renderLabel = (text: string, includeRequiredSymbol = true) => (
    <>
      {text}
      {required && includeRequiredSymbol && <span className="text-red-500 ml-1">*</span>}
    </>
  );

  const provinces = STATIC_PROVINCES;
  const [internal, setInternal] = useState<LocationSelection>({});
  const selection: LocationSelection = value ?? internal;

  const currentProvince = useMemo(() => provinces.find((p) => p.cp_code === selection.provinceCode), [provinces, selection.provinceCode]);
  const districts = currentProvince?.districts ?? [];
  const currentDistrict = useMemo(() => districts.find((d) => d.dd_dcode === selection.districtCode), [districts, selection.districtCode]);
  const divisions = currentDistrict?.divisional_secretariats ?? [];
  const currentDivision = useMemo(() => divisions.find((dv) => dv.dv_dvcode === selection.divisionCode), [divisions, selection.divisionCode]);
  const gnDivisions = currentDivision?.gn_divisions ?? [];
  const currentGn = useMemo(() => gnDivisions.find((g) => gnCodeOf(g) === selection.gnCode), [gnDivisions, selection.gnCode]);

  const emit = useCallback(
    (next: LocationSelection) => {
      onChange?.(next, { province: currentProvince, district: currentDistrict, division: currentDivision, gn: currentGn });
    },
    [onChange, currentProvince, currentDistrict, currentDivision, currentGn]
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="block mb-1 text-sm font-medium">{renderLabel(labels.province)}</label>
          <select
            className="w-full border rounded-md px-3 py-2"
            value={selection.provinceCode ?? ""}
            onChange={(e) => setSelection({ provinceCode: e.target.value || undefined, districtCode: undefined, divisionCode: undefined, gnCode: undefined })}
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
            onChange={(e) => setSelection({ districtCode: e.target.value || undefined, divisionCode: undefined, gnCode: undefined })}
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

        <div>
          <label className="block mb-1 text-sm font-medium">{renderLabel(labels.division, false)}</label>
          <select
            className="w-full border rounded-md px-3 py-2"
            value={selection.divisionCode ?? ""}
            onChange={(e) => setSelection({ divisionCode: e.target.value || undefined, gnCode: undefined })}
            disabled={disabled || !currentDistrict}
            required={required}
          >
            <option value="">Select Divisional Secretariat</option>
            {divisions.map((dv) => (
              <option key={dv.dv_dvcode} value={dv.dv_dvcode}>
                {dv.dv_dvname}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block mb-1 text-sm font-medium">{renderLabel(labels.gn, false)}</label>
          <select
            className="w-full border rounded-md px-3 py-2"
            value={selection.gnCode ?? ""}
            onChange={(e) => setSelection({ gnCode: e.target.value || undefined })}
            disabled={disabled || !currentDivision || !gnDivisions.length}
            required={required}
          >
            <option value="">Select GN Division</option>
            {gnDivisions.map((g) => {
              const code = gnCodeOf(g);
              return (
                <option key={code} value={code}>
                  {g.gn_gnname}
                </option>
              );
            })}
          </select>
        </div>
      </div>
    </div>
  );
}
