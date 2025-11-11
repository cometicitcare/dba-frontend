'use client';

import React from 'react';
import type { FieldRenderProps } from '../Forms/UpdateFrom';

type District = {
  dd_dcode: string;
  dd_dname: string;
  dd_id: number;
};

type Props = FieldRenderProps & {
  options?: District[];
  isLoading?: boolean;
  errorMessage?: string;
};

export default function DistrictSelect(props: Props) {
  const { value, onChange, error, placeholder, options = [], isLoading, errorMessage } = props;

  return (
    <>
      <select
        value={value !== undefined && value !== null ? String(value) : ''}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v ? Number(v) : undefined); // why: form needs the numeric id, not the label
        }}
        disabled={isLoading}
        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all bg-white disabled:opacity-60"
      >
        <option value="">{placeholder ?? 'Select district'}</option>
        {isLoading ? (
          <option value="" disabled>Loading…</option>
        ) : (
          options.map((d) => (
            <option key={d.dd_id} value={d.dd_id}>
              {d.dd_dname}
            </option>
          ))
        )}
      </select>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      {errorMessage && !error && <p className="mt-1 text-sm text-red-600">{errorMessage}</p>}
    </>
  );
}