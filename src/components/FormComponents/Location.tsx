"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { _getLocationData, _getGnDivitions } from "@/services/locationData";

export type Division = {
  dv_id: number;
  dv_dvcode: string;
  dv_distrcd: string;
  dv_dvname: string;
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

export type GnDivision = {
  gn_code: string;
  gn_gnname: string;
  [k: string]: unknown;
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

  const [provinces, setProvinces] = useState<Province[]>([]);
  const [gnDivisions, setGnDivisions] = useState<GnDivision[]>([]);
  const [loading, setLoading] = useState(true);
  const [gnLoading, setGnLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gnError, setGnError] = useState<string | null>(null);

  const [internal, setInternal] = useState<LocationSelection>({
    provinceCode: undefined,
    districtCode: undefined,
    divisionCode: undefined,
    gnCode: undefined,
  });

  const selection: LocationSelection = value ?? internal;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await _getLocationData();
        const arr = (result as any)?.data?.data as Province[] | undefined;
        if (!cancelled) setProvinces(Array.isArray(arr) ? arr : []);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Failed to load locations");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  const currentGn = useMemo(
    () => gnDivisions.find((g) => g.gn_code === selection.gnCode),
    [gnDivisions, selection.gnCode]
  );

  useEffect(() => {
    let cancelled = false;
    const code = currentDivision?.dv_dvcode;
    setGnError(null);
    setGnDivisions([]);
    if (!code) return;
    (async () => {
      try {
        setGnLoading(true);
        const res = await _getGnDivitions(code);
        const list = (res as any)?.data?.data as GnDivision[] | undefined;
        if (!cancelled) setGnDivisions(Array.isArray(list) ? list : []);
      } catch (err) {
        if (!cancelled)
          setGnError(err instanceof Error ? err.message : "Failed to load GN divisions");
      } finally {
        if (!cancelled) setGnLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentDivision?.dv_dvcode]);

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
    setGnDivisions([]);
    setSelection({
      provinceCode: code,
      districtCode: undefined,
      divisionCode: undefined,
      gnCode: undefined,
    });
  };

  const handleDistrict = (dd_dcode: string | "") => {
    const code = dd_dcode || undefined;
    setGnDivisions([]);
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

  if (loading) return <div>Loading location…</div>;
  if (error) return <div role="alert">Error: {error}</div>;

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
        {gnLoading && <p className="text-xs mt-1">Loading GN divisions…</p>}
        {gnError && (
          <p className="text-xs text-red-600 mt-1" role="alert">
            {gnError}
          </p>
        )}
      </div>

      {/* GN Division */}
      <div className="mb-1">
        <label className="block mb-1 text-sm font-medium">{labels.gn}</label>
        <select
          className="w-full border rounded-md px-3 py-2"
          value={selection.gnCode ?? ""}
          onChange={(e) => handleGn(e.target.value)}
          disabled={disabled || !currentDivision || gnLoading || !gnDivisions.length}
          required={required}
        >
          <option value="">Select {labels.gn}</option>
          {gnDivisions.map((g) => (
            <option key={g.gn_code} value={g.gn_code}>
              {g.gn_gnname /* fixed from gn_gnname */}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}