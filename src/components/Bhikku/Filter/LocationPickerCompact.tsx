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

type DistrictOption = District & { provinceCode: string };
type DivisionOption = Division & { districtCode: string; provinceCode: string };

const STATIC_PROVINCES: Province[] = Array.isArray((selectionsData as any)?.provinces)
  ? ((selectionsData as any).provinces as Province[])
  : [];

const gnCodeOf = (g?: GnDivision): string | undefined => g?.gn_gnc ?? g?.gn_code ?? undefined;

export type LocationSelection = { provinceCode?: string; districtCode?: string; divisionCode?: string; gnCode?: string };
export type LocationPayload = { province?: Province; district?: District; division?: Division; gn?: GnDivision };

type Props = {
  value?: LocationSelection;
  onChange?: (selection: LocationSelection, payload: LocationPayload) => void;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  labels?: Partial<{ province: string; district: string; division: string; gn: string }>;
};

export default function LocationPickerCompact({
  value,
  onChange,
  className,
  disabled = false,
  required = false,
  labels: labelsOverride,
}: Props) {
  const labels = { province: "Province", district: "District", division: "Divisional Secretariat", gn: "GN Division", ...labelsOverride };

  const provinces = STATIC_PROVINCES;
  const districtOptionsAll = useMemo<DistrictOption[]>(
    () => provinces.flatMap((p) => p.districts.map((d) => ({ ...d, provinceCode: p.cp_code }))),
    [provinces]
  );
  const divisionOptionsAll = useMemo<DivisionOption[]>(
    () =>
      provinces.flatMap((p) =>
        p.districts.flatMap((d) =>
          d.divisional_secretariats.map((dv) => ({ ...dv, districtCode: d.dd_dcode, provinceCode: p.cp_code }))
        )
      ),
    [provinces]
  );

  const [internal, setInternal] = useState<LocationSelection>({});
  const selection: LocationSelection = value ?? internal;

  const currentProvince = useMemo(() => provinces.find((p) => p.cp_code === selection.provinceCode), [provinces, selection.provinceCode]);

  const currentDistrict = useMemo(() => {
    if (!selection.districtCode) return undefined;
    if (currentProvince) {
      const match = currentProvince.districts.find((d) => d.dd_dcode === selection.districtCode);
      if (match) return match;
    }
    return districtOptionsAll.find((d) => d.dd_dcode === selection.districtCode);
  }, [currentProvince, districtOptionsAll, selection.districtCode]);

  const districtOptions = useMemo<DistrictOption[]>(() => {
    if (currentProvince) {
      return currentProvince.districts.map((d) => ({ ...d, provinceCode: currentProvince.cp_code }));
    }
    return districtOptionsAll;
  }, [currentProvince, districtOptionsAll]);

  const divisionsSource = currentDistrict?.divisional_secretariats ?? [];

  const currentDivision = useMemo(() => {
    if (!selection.divisionCode) return undefined;
    const direct = divisionsSource.find((dv) => dv.dv_dvcode === selection.divisionCode);
    if (direct) return direct;
    return divisionOptionsAll.find((dv) => dv.dv_dvcode === selection.divisionCode);
  }, [divisionsSource, divisionOptionsAll, selection.divisionCode]);

  const divisionOptions = useMemo<DivisionOption[]>(() => {
    if (currentDistrict) {
      return currentDistrict.divisional_secretariats.map((dv) => ({
        ...dv,
        districtCode: currentDistrict.dd_dcode,
        provinceCode: currentDistrict.dd_prcode,
      }));
    }
    return divisionOptionsAll;
  }, [currentDistrict, divisionOptionsAll]);

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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <div>
          <select
            className="w-full border rounded-md px-2 py-1 text-xs"
            value={selection.provinceCode ?? ""}
            onChange={(e) =>
              setSelection({ provinceCode: e.target.value || undefined, districtCode: undefined, divisionCode: undefined, gnCode: undefined })
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
          <select
            className="w-full border rounded-md px-2 py-1 text-xs"
            value={selection.districtCode ?? ""}
            onChange={(e) => {
              const code = e.target.value || undefined;
              const info = districtOptionsAll.find((d) => d.dd_dcode === code);
              const patch: LocationSelection = { districtCode: code, divisionCode: undefined, gnCode: undefined };
              if (info?.provinceCode) patch.provinceCode = info.provinceCode;
              setSelection(patch);
            }}
            disabled={disabled}
            required={required}
          >
            <option value="">Select District</option>
            {districtOptions.map((d) => (
              <option key={d.dd_dcode} value={d.dd_dcode}>
                {d.dd_dname}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            className="w-full border rounded-md px-2 py-1 text-xs"
            value={selection.divisionCode ?? ""}
            onChange={(e) => {
              const code = e.target.value || undefined;
              const info = divisionOptionsAll.find((dv) => dv.dv_dvcode === code);
              const patch: LocationSelection = { divisionCode: code, gnCode: undefined };
              if (info?.districtCode) patch.districtCode = info.districtCode;
              if (info?.provinceCode) patch.provinceCode = info.provinceCode;
              setSelection(patch);
            }}
            disabled={disabled}
            required={required}
          >
            <option value="">Select Divisional Secretariat</option>
            {divisionOptions.map((dv) => (
              <option key={dv.dv_dvcode} value={dv.dv_dvcode}>
                {dv.dv_dvname}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            className="w-full border rounded-md px-2 py-1 text-xs"
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
