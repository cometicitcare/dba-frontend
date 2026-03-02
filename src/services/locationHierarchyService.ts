/**
 * Smart Cascading Location Filter Service
 * Province / District / Divisional Secretariat / GN Division: all from local selectionsData.json (instant, no network call)
 * SBM (Sasanarakshaka Bala Mandala): fetched from backend API (live DB data)
 */

import selectionsData from "@/utils/selectionsData.json";

export interface LocationOption {
  code: string;
  name: string;
}

export interface LocationHierarchy {
  provinces: LocationOption[];
  districtsByProvince: Record<string, LocationOption[]>;
  dvsByDistrict: Record<string, LocationOption[]>;
  gnsByDv: Record<string, LocationOption[]>;
  sbmsByDv: Record<string, LocationOption[]>;
}

// ── Build static lookups from selectionsData.json once at module load ──────────

type RawGn       = { gn_gnc: string; gn_gnname: string; gn_dvcode?: string };
type RawSbm      = { sr_ssbmcode: string; sr_ssbname: string; sr_dvcd: string };
type RawDv       = { dv_dvcode: string; dv_dvname: string; dv_distrcd: string; gn_divisions: RawGn[]; sbm_list: RawSbm[] };
type RawDistrict = { dd_dcode: string; dd_dname: string; dd_prcode: string; divisional_secretariats: RawDv[] };
type RawProvince = { cp_code: string; cp_name: string; districts: RawDistrict[] };

const STATIC_PROVINCES: RawProvince[] = Array.isArray((selectionsData as any).provinces)
  ? (selectionsData as any).provinces
  : [];

// province code → districts
const DISTRICTS_BY_PROVINCE: Record<string, LocationOption[]> = {};
// district code → divisional secretariats
const DVS_BY_DISTRICT: Record<string, LocationOption[]> = {};
// dv code → gn divisions
const GNS_BY_DV: Record<string, LocationOption[]> = {};
// dv code → SBMs
const SBMS_BY_DV: Record<string, LocationOption[]> = {};
// district code → SBMs (all across all its DVs)
const SBMS_BY_DISTRICT: Record<string, LocationOption[]> = {};

STATIC_PROVINCES.forEach((p) => {
  DISTRICTS_BY_PROVINCE[p.cp_code] = (p.districts ?? []).map((d) => ({
    code: d.dd_dcode,
    name: d.dd_dname,
  }));
  (p.districts ?? []).forEach((d) => {
    DVS_BY_DISTRICT[d.dd_dcode] = (d.divisional_secretariats ?? []).map((dv) => ({
      code: dv.dv_dvcode,
      name: dv.dv_dvname,
    }));
    const districtSbms: LocationOption[] = [];
    (d.divisional_secretariats ?? []).forEach((dv) => {
      GNS_BY_DV[dv.dv_dvcode] = (dv.gn_divisions ?? []).map((gn) => ({
        code: gn.gn_gnc,
        name: gn.gn_gnname,
      }));
      const dvSbms = (dv.sbm_list ?? []).map((sbm) => ({
        code: sbm.sr_ssbmcode,
        name: sbm.sr_ssbname,
      }));
      SBMS_BY_DV[dv.dv_dvcode] = dvSbms;
      districtSbms.push(...dvSbms);
    });
    // Sort district-level SBMs by code
    SBMS_BY_DISTRICT[d.dd_dcode] = districtSbms.sort((a, b) => a.code.localeCompare(b.code));
  });
});

class LocationHierarchyServiceImpl {
  /** Province list — instant, from local JSON, no network call */
  async getProvinces(): Promise<LocationOption[]> {
    return STATIC_PROVINCES.map((p) => ({ code: p.cp_code, name: p.cp_name }));
  }

  /** District list for a province — instant, from local JSON, no network call */
  async getDistrictsByProvince(provinceCode: string): Promise<LocationOption[]> {
    return DISTRICTS_BY_PROVINCE[provinceCode] ?? [];
  }

  /** Divisional Secretariats for a district — instant, from local JSON, no network call */
  async getDvsByDistrict(districtCode: string): Promise<LocationOption[]> {
    return DVS_BY_DISTRICT[districtCode] ?? [];
  }

  /** GN Divisions for a divisional secretariat — instant, from local JSON, no network call */
  async getGnsByDv(dvCode: string): Promise<LocationOption[]> {
    return GNS_BY_DV[dvCode] ?? [];
  }

  /** SBMs for a district (all DVs combined) — instant, from local JSON, no network call */
  async getSbmsByDistrict(districtCode: string): Promise<LocationOption[]> {
    return SBMS_BY_DISTRICT[districtCode] ?? [];
  }

  /** SBMs for a specific DV (narrowed list) — instant, from local JSON, no network call */
  async getSbmsByDv(dvCode: string): Promise<LocationOption[]> {
    return SBMS_BY_DV[dvCode] ?? [];
  }
}

export const locationHierarchyService = new LocationHierarchyServiceImpl();
