/**
 * Smart Cascading Location Filter Component
 * Users see human-readable names (Colombo, Gampaha) in dropdowns
 * System internally uses codes (DC001, DC003) for all API calls
 * Implements hierarchical filtering: Province → District → DV → GN/SBM
 */

"use client";

import React, { useState, useEffect } from "react";
import {
  locationHierarchyService,
  type LocationOption,
} from "@/services/locationHierarchyService";

export interface SmartFilterSelection {
  province: {
    code: string;
    name: string;
  } | null;
  district: {
    code: string;
    name: string;
  } | null;
  divisionalSecretariat: {
    code: string;
    name: string;
  } | null;
  gnDivision: {
    code: string;
    name: string;
  } | null;
  sasanarakshakaBalaMandalaSBM: {
    code: string;
    name: string;
  } | null;
}

interface SmartLocationFilterProps {
  onFilterChange: (filters: {
    province?: string;
    district?: string;
    divisional_secretariat?: string;
    gn_division?: string;
    ssbmcode?: string;
  }) => void;
  disabled?: boolean;
}

export const SmartLocationFilter: React.FC<SmartLocationFilterProps> = ({
  onFilterChange,
  disabled = false,
}) => {
  // UI State - what user sees
  const [provinces, setProvinces] = useState<LocationOption[]>([]);
  const [districts, setDistricts] = useState<LocationOption[]>([]);
  const [dvs, setDvs] = useState<LocationOption[]>([]);
  const [gns, setGns] = useState<LocationOption[]>([]);
  const [sbms, setSbms] = useState<LocationOption[]>([]);

  // Selection state - codes are sent to API
  const [selection, setSelection] = useState<SmartFilterSelection>({
    province: null,
    district: null,
    divisionalSecretariat: null,
    gnDivision: null,
    sasanarakshakaBalaMandalaSBM: null,
  });

  // Loading states
  const [loading, setLoading] = useState(false);

  // Initialize: Load provinces on mount
  useEffect(() => {
    // Provinces come from static JSON — no network call, no loading state needed
    locationHierarchyService.getProvinces()
      .then(setProvinces)
      .catch((err) => console.error("Failed to load provinces:", err));
  }, []);

  // Cascade effect: When province changes, load districts
  useEffect(() => {
    if (selection.province) {
      const loadDistricts = async () => {
        // Districts come from static JSON — no loading state needed
        try {
          const districtList = await locationHierarchyService.getDistrictsByProvince(
            selection.province!.code
          );
          setDistricts(districtList);
          // Reset dependent fields
          setSelection((prev) => ({
            ...prev,
            district: null,
            divisionalSecretariat: null,
            gnDivision: null,
            sasanarakshakaBalaMandalaSBM: null,
          }));
          setDvs([]);
          setGns([]);
          setSbms([]);
        } catch (error) {
          console.error("Failed to load districts:", error);
        }
      };

      loadDistricts();
    } else {
      setDistricts([]);
      setSelection((prev) => ({ ...prev, district: null }));
    }
  }, [selection.province]);

  // Cascade effect: When district changes, load DVs + all SBMs in district
  useEffect(() => {
    if (selection.district) {
      const loadDvsAndSbms = async () => {
        setLoading(true);
        try {
          const [dvList, sbmList] = await Promise.all([
            locationHierarchyService.getDvsByDistrict(selection.district!.code),
            locationHierarchyService.getSbmsByDistrict(selection.district!.code),
          ]);
          setDvs(dvList);
          setSbms(sbmList);
          // Reset dependent fields
          setSelection((prev) => ({
            ...prev,
            divisionalSecretariat: null,
            gnDivision: null,
            sasanarakshakaBalaMandalaSBM: null,
          }));
          setGns([]);
        } catch (error) {
          console.error("Failed to load district data:", error);
        } finally {
          setLoading(false);
        }
      };

      loadDvsAndSbms();
    } else {
      setDvs([]);
      setSbms([]);
      setSelection((prev) => ({
        ...prev,
        divisionalSecretariat: null,
        gnDivision: null,
        sasanarakshakaBalaMandalaSBM: null,
      }));
      setGns([]);
    }
  }, [selection.district]);

  // Cascade effect: When DV changes, load GNs + narrow SBMs to that DV
  useEffect(() => {
    if (selection.divisionalSecretariat) {
      const loadGnAndNarrowSbm = async () => {
        setLoading(true);
        try {
          const [gnList, dvSbmList] = await Promise.all([
            locationHierarchyService.getGnsByDv(selection.divisionalSecretariat!.code),
            locationHierarchyService.getSbmsByDv(selection.divisionalSecretariat!.code),
          ]);
          setGns(gnList);
          setSbms(dvSbmList); // narrowed — only SBMs for this DV
          // Clear SBM selection if current one doesn't belong to new DV
          setSelection((prev) => {
            if (prev.sasanarakshakaBalaMandalaSBM &&
                !dvSbmList.some((s) => s.code === prev.sasanarakshakaBalaMandalaSBM!.code)) {
              return { ...prev, gnDivision: null, sasanarakshakaBalaMandalaSBM: null };
            }
            return { ...prev, gnDivision: null };
          });
        } catch (error) {
          console.error("Failed to load GNs and SBMs for DV:", error);
        } finally {
          setLoading(false);
        }
      };

      loadGnAndNarrowSbm();
    } else if (selection.district) {
      // DV cleared but district still selected — restore full district SBM list
      setGns([]);
      setSelection((prev) => ({ ...prev, gnDivision: null, sasanarakshakaBalaMandalaSBM: null }));
      locationHierarchyService.getSbmsByDistrict(selection.district.code)
        .then(setSbms)
        .catch(() => setSbms([]));
    } else {
      setGns([]);
      setSbms([]);
      setSelection((prev) => ({
        ...prev,
        gnDivision: null,
        sasanarakshakaBalaMandalaSBM: null,
      }));
    }
  }, [selection.divisionalSecretariat]);

  // Notify parent component whenever selection changes
  useEffect(() => {
    const filterCodes = {
      ...(selection.province && { province: selection.province.code }),
      ...(selection.district && { district: selection.district.code }),
      ...(selection.divisionalSecretariat && {
        divisional_secretariat: selection.divisionalSecretariat.code,
      }),
      ...(selection.gnDivision && { gn_division: selection.gnDivision.code }),
      ...(selection.sasanarakshakaBalaMandalaSBM && {
        ssbmcode: selection.sasanarakshakaBalaMandalaSBM.code,
      }),
    };

    onFilterChange(filterCodes);
  }, [selection, onFilterChange]);

  const handleProvinceChange = (code: string) => {
    const selected = provinces.find((p) => p.code === code);
    setSelection((prev) => ({
      ...prev,
      province: selected || null,
      district: null,
      divisionalSecretariat: null,
    }));
  };

  const handleDistrictChange = (code: string) => {
    const selected = districts.find((d) => d.code === code);
    setSelection((prev) => ({
      ...prev,
      district: selected || null,
      divisionalSecretariat: null,
    }));
  };

  const handleDvChange = (code: string) => {
    const selected = dvs.find((dv) => dv.code === code);
    setSelection((prev) => ({
      ...prev,
      divisionalSecretariat: selected || null,
    }));
  };

  const handleGnChange = (code: string) => {
    const selected = gns.find((gn) => gn.code === code);
    setSelection((prev) => ({
      ...prev,
      gnDivision: selected || null,
    }));
  };

  const handleSbmChange = (code: string) => {
    const selected = sbms.find((sbm) => sbm.code === code);
    setSelection((prev) => ({
      ...prev,
      sasanarakshakaBalaMandalaSBM: selected || null,
    }));
  };

  const handleReset = () => {
    setSelection({
      province: null,
      district: null,
      divisionalSecretariat: null,
      gnDivision: null,
      sasanarakshakaBalaMandalaSBM: null,
    });
    onFilterChange({});
  };

  const hasAnySelection = Object.values(selection).some((v) => v !== null);
  const selectCls =
    "w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed";
  const labelCls = "block text-xs font-semibold text-gray-700 mb-1";

  return (
    <div className="space-y-2">
      {/* Row label + clear button */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Location Filter
          {loading && (
            <span className="ml-2 text-blue-500 font-normal normal-case">loading…</span>
          )}
        </span>
        {hasAnySelection && (
          <button
            type="button"
            onClick={handleReset}
            disabled={disabled || loading}
            className="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-50"
          >
            ✕ Clear location
          </button>
        )}
      </div>

      {/* Compact dropdown grid */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-5">
        {/* Province */}
        <div>
          <label className={labelCls}>Province</label>
          <select
            value={selection.province?.code || ""}
            onChange={(e) => handleProvinceChange(e.target.value)}
            disabled={disabled || loading}
            className={selectCls}
          >
            <option value="">All Provinces</option>
            {provinces.map((p) => (
              <option key={p.code} value={p.code}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* District */}
        <div>
          <label className={labelCls}>District</label>
          <select
            value={selection.district?.code || ""}
            onChange={(e) => handleDistrictChange(e.target.value)}
            disabled={disabled || loading || !selection.province}
            className={selectCls}
          >
            <option value="">
              {selection.province ? "All Districts" : "Select Province first"}
            </option>
            {districts.map((d) => (
              <option key={d.code} value={d.code}>{d.name || d.code}</option>
            ))}
          </select>
        </div>

        {/* Divisional Secretariat */}
        <div>
          <label className={labelCls}>Div. Secretariat</label>
          <select
            value={selection.divisionalSecretariat?.code || ""}
            onChange={(e) => handleDvChange(e.target.value)}
            disabled={disabled || loading || !selection.district}
            className={selectCls}
          >
            <option value="">
              {selection.district ? "All Div. Secretariats" : "Select District first"}
            </option>
            {dvs.map((dv) => (
              <option key={dv.code} value={dv.code}>{dv.name || dv.code}</option>
            ))}
          </select>
        </div>

        {/* GN Division */}
        <div>
          <label className={labelCls}>GN Division</label>
          <select
            value={selection.gnDivision?.code || ""}
            onChange={(e) => handleGnChange(e.target.value)}
            disabled={disabled || loading || !selection.divisionalSecretariat}
            className={selectCls}
          >
            <option value="">
              {selection.divisionalSecretariat ? "All GN Divisions" : "Select Div. Sec. first"}
            </option>
            {gns.map((gn) => (
              <option key={gn.code} value={gn.code}>{gn.name || gn.code}</option>
            ))}
          </select>
        </div>

        {/* Sasanarakshaka Bala Mandala */}
        <div>
          <label className={labelCls}>SBM</label>
          <select
            value={selection.sasanarakshakaBalaMandalaSBM?.code || ""}
            onChange={(e) => handleSbmChange(e.target.value)}
            disabled={disabled || loading || !selection.district}
            className={selectCls}
          >
            <option value="">
              {selection.district ? "All SBMs" : "Select District first"}
            </option>
            {sbms.map((sbm) => (
              <option key={sbm.code} value={sbm.code}>{sbm.name || sbm.code}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Active filter breadcrumb chips */}
      {hasAnySelection && (
        <div className="flex flex-wrap gap-1 pt-1">
          {selection.province && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-xs text-blue-700">
              {selection.province.name}
            </span>
          )}
          {selection.district && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-xs text-blue-700">
              → {selection.district.name}
            </span>
          )}
          {selection.divisionalSecretariat && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-xs text-blue-700">
              → {selection.divisionalSecretariat.name}
            </span>
          )}
          {selection.gnDivision && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-200 px-2 py-0.5 text-xs text-green-700">
              GN: {selection.gnDivision.name}
            </span>
          )}
          {selection.sasanarakshakaBalaMandalaSBM && (
            <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 border border-purple-200 px-2 py-0.5 text-xs text-purple-700">
              SBM: {selection.sasanarakshakaBalaMandalaSBM.name}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default SmartLocationFilter;
