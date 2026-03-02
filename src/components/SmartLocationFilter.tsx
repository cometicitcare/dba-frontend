'use client';

/**
 * Smart Hierarchical Location Filter Component
 * 
 * Features:
 * - Province → District → Divisional Secretariat → GN + SSBM cascade
 * - Smart loading of child levels based on parent selection
 * - Proper code-based filtering (not names)
 * - Supports all location levels
 */

import React, { useEffect, useState, useCallback } from 'react';
import { ChevronDown, Loader2, AlertCircle } from 'lucide-react';

interface LocationOption {
  code: string;
  name: string;
  [key: string]: any;
}

interface SmartLocationFilterProps {
  onFilterChange: (filters: {
    province?: string;
    district?: string;
    divisional_secretariat?: string;
    gn_division?: string;
    ssbmcode?: string;
  }) => void;
  apiBaseUrl?: string;
  token?: string;
}

export default function SmartLocationFilter({
  onFilterChange,
  apiBaseUrl = 'http://localhost:8000',
  token = '',
}: SmartLocationFilterProps) {
  // State for selections
  const [selectedProvince, setSelectedProvince] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [selectedDivSec, setSelectedDivSec] = useState<string>('');
  const [selectedGN, setSelectedGN] = useState<string>('');
  const [selectedSSBM, setSelectedSSBM] = useState<string>('');

  // State for available options
  const [provinces, setProvinces] = useState<LocationOption[]>([]);
  const [districts, setDistricts] = useState<LocationOption[]>([]);
  const [divSecs, setDivSecs] = useState<LocationOption[]>([]);
  const [gnDivisions, setGnDivisions] = useState<LocationOption[]>([]);
  const [ssbms, setSsbms] = useState<LocationOption[]>([]);

  // Loading states
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingDivSecs, setLoadingDivSecs] = useState(false);
  const [loadingGN, setLoadingGN] = useState(false);
  const [loadingSSBM, setLoadingSSBM] = useState(false);

  // Error states
  const [errors, setErrors] = useState<Record<string, string>>({});

  const apiHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // Fetch provinces on component mount
  useEffect(() => {
    fetchProvinces();
  }, []);

  // Fetch districts when province changes
  useEffect(() => {
    if (selectedProvince) {
      // Reset lower levels
      setSelectedDistrict('');
      setSelectedDivSec('');
      setSelectedGN('');
      setSelectedSSBM('');
      setDivSecs([]);
      setGnDivisions([]);
      setSsbms([]);
      
      fetchDistricts(selectedProvince);
    } else {
      setDistricts([]);
      setDivSecs([]);
      setGnDivisions([]);
      setSsbms([]);
    }
  }, [selectedProvince]);

  // Fetch divisional secretariats when district changes
  useEffect(() => {
    if (selectedDistrict) {
      // Reset lower levels
      setSelectedDivSec('');
      setSelectedGN('');
      setSelectedSSBM('');
      setGnDivisions([]);
      setSsbms([]);
      
      fetchDivSecs(selectedDistrict);
    } else {
      setDivSecs([]);
      setGnDivisions([]);
      setSsbms([]);
    }
  }, [selectedDistrict]);

  // Fetch GN divisions and SSBM when divisional secretariat changes
  useEffect(() => {
    if (selectedDivSec) {
      // Reset lower levels
      setSelectedGN('');
      setSelectedSSBM('');
      
      fetchGNDivisions(selectedDivSec);
      fetchSSBM(selectedDivSec);
    } else {
      setGnDivisions([]);
      setSsbms([]);
    }
  }, [selectedDivSec]);

  // Notify parent of filter changes
  useEffect(() => {
    onFilterChange({
      province: selectedProvince || undefined,
      district: selectedDistrict || undefined,
      divisional_secretariat: selectedDivSec || undefined,
      gn_division: selectedGN || undefined,
      ssbmcode: selectedSSBM || undefined,
    });
  }, [selectedProvince, selectedDistrict, selectedDivSec, selectedGN, selectedSSBM]);

  // API calls
  const fetchProvinces = useCallback(async () => {
    setLoadingProvinces(true);
    setErrors(prev => ({ ...prev, provinces: '' }));
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/v1/locations/provinces`,
        { headers: apiHeaders }
      );
      if (!response.ok) throw new Error('Failed to fetch provinces');
      const data = await response.json();
      setProvinces(data.data || []);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setErrors(prev => ({ ...prev, provinces: message }));
    } finally {
      setLoadingProvinces(false);
    }
  }, [apiBaseUrl, apiHeaders]);

  const fetchDistricts = useCallback(async (provinceCode: string) => {
    setLoadingDistricts(true);
    setErrors(prev => ({ ...prev, districts: '' }));
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/v1/locations/districts?province=${provinceCode}`,
        { headers: apiHeaders }
      );
      if (!response.ok) throw new Error('Failed to fetch districts');
      const data = await response.json();
      setDistricts(data.data || []);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setErrors(prev => ({ ...prev, districts: message }));
    } finally {
      setLoadingDistricts(false);
    }
  }, [apiBaseUrl, apiHeaders]);

  const fetchDivSecs = useCallback(async (districtCode: string) => {
    setLoadingDivSecs(true);
    setErrors(prev => ({ ...prev, divSecs: '' }));
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/v1/locations/divisional-secretariats?district=${districtCode}`,
        { headers: apiHeaders }
      );
      if (!response.ok) throw new Error('Failed to fetch divisional secretariats');
      const data = await response.json();
      setDivSecs(data.data || []);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setErrors(prev => ({ ...prev, divSecs: message }));
    } finally {
      setLoadingDivSecs(false);
    }
  }, [apiBaseUrl, apiHeaders]);

  const fetchGNDivisions = useCallback(async (divSecCode: string) => {
    setLoadingGN(true);
    setErrors(prev => ({ ...prev, gn: '' }));
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/v1/locations/gn-divisions?divisional_secretariat=${divSecCode}`,
        { headers: apiHeaders }
      );
      if (!response.ok) throw new Error('Failed to fetch GN divisions');
      const data = await response.json();
      setGnDivisions(data.data || []);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setErrors(prev => ({ ...prev, gn: message }));
    } finally {
      setLoadingGN(false);
    }
  }, [apiBaseUrl, apiHeaders]);

  const fetchSSBM = useCallback(async (divSecCode: string) => {
    setLoadingSSBM(true);
    setErrors(prev => ({ ...prev, ssbm: '' }));
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/v1/locations/ssbm?divisional_secretariat=${divSecCode}`,
        { headers: apiHeaders }
      );
      if (!response.ok) throw new Error('Failed to fetch SSBM');
      const data = await response.json();
      setSsbms(data.data || []);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setErrors(prev => ({ ...prev, ssbm: message }));
    } finally {
      setLoadingSSBM(false);
    }
  }, [apiBaseUrl, apiHeaders]);

  // Render select dropdown
  const SelectField = ({
    label,
    value,
    onChange,
    options,
    loading,
    error,
    disabled,
    placeholder = 'Select...',
  }: {
    label: string;
    value: string;
    onChange: (val: string) => void;
    options: LocationOption[];
    loading: boolean;
    error?: string;
    disabled: boolean;
    placeholder?: string;
  }) => (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || loading}
          className={`w-full px-3 py-2 border rounded-lg appearance-none bg-white 
            ${disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'text-gray-900'}
            ${error ? 'border-red-500' : 'border-gray-300'}
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            disabled:opacity-50`}
        >
          <option value="">{placeholder}</option>
          {options.map((opt) => (
            <option key={opt.code} value={opt.code}>
              {opt.name} ({opt.code})
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-3 h-4 w-4 pointer-events-none text-gray-400" />
        {loading && <Loader2 className="absolute right-9 top-3 h-4 w-4 animate-spin text-blue-500" />}
      </div>
      {error && (
        <div className="flex items-center gap-1 text-red-600 text-xs">
          <AlertCircle className="h-3 w-3" />
          {error}
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Location Filter</h3>
      
      {/* Info panel about code-based filtering */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
        <strong>💡 Smart Filtering:</strong> Select a level to automatically load the next level's options.
        All filters use official codes (e.g., DC001 for Colombo, not the name).
      </div>

      {/* Filter Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Province */}
        <SelectField
          label="Province"
          value={selectedProvince}
          onChange={setSelectedProvince}
          options={provinces}
          loading={loadingProvinces}
          error={errors.provinces}
          disabled={false}
          placeholder="Select province..."
        />

        {/* District */}
        <SelectField
          label="District"
          value={selectedDistrict}
          onChange={setSelectedDistrict}
          options={districts}
          loading={loadingDistricts}
          error={errors.districts}
          disabled={!selectedProvince}
          placeholder={selectedProvince ? 'Select district...' : 'Select province first'}
        />

        {/* Divisional Secretariat */}
        <SelectField
          label="Divisional Secretariat"
          value={selectedDivSec}
          onChange={setSelectedDivSec}
          options={divSecs}
          loading={loadingDivSecs}
          error={errors.divSecs}
          disabled={!selectedDistrict}
          placeholder={selectedDistrict ? 'Select divisional secretariat...' : 'Select district first'}
        />

        {/* GN Division */}
        <SelectField
          label="Grama Niladhari Division"
          value={selectedGN}
          onChange={setSelectedGN}
          options={gnDivisions}
          loading={loadingGN}
          error={errors.gn}
          disabled={!selectedDivSec}
          placeholder={selectedDivSec ? 'Select GN division...' : 'Select divisional secretariat first'}
        />

        {/* Sasanarakshaka Bala Mandala */}
        <SelectField
          label="Sasanarakshaka Bala Mandala"
          value={selectedSSBM}
          onChange={setSelectedSSBM}
          options={ssbms}
          loading={loadingSSBM}
          error={errors.ssbm}
          disabled={!selectedDivSec}
          placeholder={selectedDivSec ? 'Select SSBM...' : 'Select divisional secretariat first'}
        />
      </div>

      {/* Clear all button */}
      {(selectedProvince || selectedDistrict || selectedDivSec || selectedGN || selectedSSBM) && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={() => {
              setSelectedProvince('');
              setSelectedDistrict('');
              setSelectedDivSec('');
              setSelectedGN('');
              setSelectedSSBM('');
            }}
            className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}
