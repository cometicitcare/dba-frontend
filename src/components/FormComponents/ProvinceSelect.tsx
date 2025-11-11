// components/FormComponents/ProvinceSelect.tsx
'use client';

import React, { forwardRef } from 'react';

type Province = {
  cp_id: number;
  cp_name: string;
  cp_code: string;
  cp_is_deleted?: boolean;
};

type FieldRenderProps = {
  value?: string | number | null;
  onChange: (value: string | number | undefined) => void;
  onBlur?: React.FocusEventHandler<HTMLSelectElement>;
  error?: string | boolean;
  placeholder?: string;
};

type Props = FieldRenderProps & {
  id?: string;
  name?: string;
  className?: string;
  disabled?: boolean;
  options?: Province[];
  isLoading?: boolean;
  errorMessage?: string;
};

const ProvinceSelect = forwardRef<HTMLSelectElement, Props>(function ProvinceSelect(
  {
    id,
    name,
    className,
    value,
    onChange,
    onBlur,
    error,
    placeholder,
    disabled,
    options = [],
    isLoading,
    errorMessage,
  },
  ref,
) {
  // why: form stores cp_name (stable display value, easier i18n mapping later)
  const displayValue =
    value !== undefined && value !== null && value !== '' ? String(value) : '';

  const hasError = Boolean(error || errorMessage);
  const describedBy = hasError && id ? `${id}-error` : undefined;

  const baseClass =
    'w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all bg-white disabled:opacity-60';
  const borderClass = hasError ? 'border-red-500' : 'border-slate-300';

  const cleaned: Province[] = (options || [])
    .filter(Boolean)
    .filter((p) => !p.cp_is_deleted)
    .filter((p) => p.cp_name && p.cp_name.toLowerCase() !== 'string') // drop placeholders
    .sort((a, b) => a.cp_name.localeCompare(b.cp_name));

  const getLabel = (p: Province) => p.cp_name;
  const getValue = (p: Province) => p.cp_name; // stored in form

  return (
    <>
      <select
        id={id}
        name={name}
        ref={ref}
        value={displayValue}
        onChange={(e) => {
          const raw = e.target.value;
          onChange(raw === '' ? undefined : raw);
        }}
        onBlur={onBlur}
        disabled={disabled || isLoading}
        aria-invalid={hasError || undefined}
        aria-describedby={describedBy}
        className={`${baseClass} ${borderClass} ${className ?? ''}`}
      >
        <option value="">{placeholder ?? 'Select province'}</option>

        {cleaned.map((p) => (
          <option key={p.cp_id} value={getValue(p)}>
            {getLabel(p)}
          </option>
        ))}

        {isLoading && (
          <option value="" disabled>
            Loading…
          </option>
        )}
      </select>

      {hasError && (
        <p id={describedBy} className="mt-1 text-sm text-red-600">
          {typeof error === 'string' ? error : errorMessage}
        </p>
      )}
    </>
  );
});

export default ProvinceSelect;
