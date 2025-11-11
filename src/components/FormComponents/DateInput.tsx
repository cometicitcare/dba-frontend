'use client';

import React from 'react';
import type { FieldRenderProps } from '../Forms/UpdateFrom';

export default function DateInput({ value, onChange, error, placeholder }: FieldRenderProps) {
  // why: keep date constraints or plug in a date picker later without touching form core
  return (
    <>
      <input
        type="date"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
      />
      {error ? <p className="mt-1 text-sm text-red-600">{error}</p> : null}
    </>
  );
}
