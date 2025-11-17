"use client";

import React, { useMemo, useState, useCallback } from "react";
import selectionsData from "@/utils/selectionsData.json";

export type GnDivision = {
  gn_id?: number;
  gn_code?: string;
  gn_gnc?: string;
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

type Labels = {
  province: string;
  district: string;
  division: string;
  gn: string;
};

type LocationProps = {
  value?: LocationSelection;
  onChange?: (selection: LocationSelection, payload: LocationPayload) => void;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  labels?: Partial<Labels>;
};

const STATIC_PROVINCES: Province[] = Array.isArray((selectionsData as any)?.provinces)
  ? ((selectionsData as any).provinces as Province[])
  : [];

export default function Location({
  value,
  onChange,
  className,
  disabled = false,
  required = false,
  labels: labelsOverride,
}: LocationProps) {
  const labels: Labels = {
    province: "Province",
    district: "District",
    division: "Divisional Secretariat",
    gn: "GN Division",
    ...labelsOverride,
  };

  const provinces = STATIC_PROVINCES;
  const [internal, setInternal] = useState<LocationSelection>({
    provinceCode: undefined,
    districtCode: undefined,
    divisionCode: undefined,
    gnCode: undefined,
  });

  const selection: LocationSelection = value ?? internal;

  const currentProvince = useMemo(
    () => provinces.find((p) => p.cp_code === selection.provinceCode),
    [provinces, selection.provinceCode]
  );
  const districts = currentProvince?.districts ?? [];

  const currentDistrict = useMemo(
    () => districts.find((d) => d.dd_dcode === selection.districtCode),
    [districts, selection.districtCode]
  );
  const divisions = currentDistrict?.divisional_secretariats ?? [];

  const currentDivision = useMemo(
    () => divisions.find((dv) => dv.dv_dvcode === selection.divisionCode),
    [divisions, selection.divisionCode]
  );

  const gnDivisions = currentDivision?.gn_divisions ?? [];
  const currentGn = useMemo(
    () => gnDivisions.find((g) => g.gn_code === selection.gnCode || g.gn_gnc === selection.gnCode),
    [gnDivisions, selection.gnCode]
  );

  const emit = useCallback(
    (next: LocationSelection) => {
      onChange?.(next, {
        province: currentProvince,
        district: currentDistrict,
        division: currentDivision,
        gn: currentGn,
      });
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

  const handleProvince = (cp_code: string | "") => {
    const code = cp_code || undefined;
    setSelection({
      provinceCode: code,
      districtCode: undefined,
      divisionCode: undefined,
      gnCode: undefined,
    });
  };

  const handleDistrict = (dd_dcode: string | "") => {
    const code = dd_dcode || undefined;
    setSelection({
      districtCode: code,
      divisionCode: undefined,
      gnCode: undefined,
    });
  };

  const handleDivision = (dv_dvcode: string | "") => {
    const code = dv_dvcode || undefined;
    setSelection({
      divisionCode: code,
      gnCode: undefined,
    });
  };

  const handleGn = (gn_code: string | "") => {
    const code = gn_code || undefined;
    setSelection({ gnCode: code });
  };

  if (!provinces.length) return <div role="alert">No location data available.</div>;

  return (
    <div className={className}>
      {/* Province */}
      <div className="mb-3">
        <label className="block mb-1 text-sm font-medium">{labels.province}</label>
        <select
          className="w-full border rounded-md px-3 py-2"
          value={selection.provinceCode ?? ""}
          onChange={(e) => handleProvince(e.target.value)}
          disabled={disabled}
          required={required}
        >
          <option value="">Select {labels.province}</option>
          {provinces.map((p) => (
            <option key={p.cp_code} value={p.cp_code}>
              {p.cp_name}
            </option>
          ))}
        </select>
      </div>

      {/* District */}
      <div className="mb-3">
        <label className="block mb-1 text-sm font-medium">{labels.district}</label>
        <select
          className="w-full border rounded-md px-3 py-2"
          value={selection.districtCode ?? ""}
          onChange={(e) => handleDistrict(e.target.value)}
          disabled={disabled || !currentProvince}
          required={required}
        >
          <option value="">Select {labels.district}</option>
          {districts.map((d) => (
            <option key={d.dd_dcode} value={d.dd_dcode}>
              {d.dd_dname}
            </option>
          ))}
        </select>
      </div>

      {/* Divisional Secretariat */}
      <div className="mb-3">
        <label className="block mb-1 text-sm font-medium">{labels.division}</label>
        <select
          className="w-full border rounded-md px-3 py-2"
          value={selection.divisionCode ?? ""}
          onChange={(e) => handleDivision(e.target.value)}
          disabled={disabled || !currentDistrict}
          required={required}
        >
          <option value="">Select {labels.division}</option>
          {divisions.map((dv) => (
            <option key={dv.dv_dvcode} value={dv.dv_dvcode}>
              {dv.dv_dvname}
            </option>
          ))}
        </select>
      </div>

      {/* GN Division */}
      <div className="mb-1">
        <label className="block mb-1 text-sm font-medium">{labels.gn}</label>
        <select
          className="w-full border rounded-md px-3 py-2"
          value={selection.gnCode ?? ""}
          onChange={(e) => handleGn(e.target.value)}
          disabled={disabled || !currentDivision || !gnDivisions.length}
          required={required}
        >
          <option value="">Select {labels.gn}</option>
          {gnDivisions.map((g) => {
            const code = g.gn_code ?? g.gn_gnc;
            return (
              <option key={code} value={code}>
                {g.gn_gnname}
              </option>
            );
          })}
        </select>
      </div>
    </div>
  );
}
