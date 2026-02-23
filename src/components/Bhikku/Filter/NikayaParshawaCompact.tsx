"use client";
import React from "react";

type Option = { code: string; name: string };

type Props = {
  nikayaValue: string;
  onNikayaChange: (code: string) => void;
  parshawaValue: string;
  onParshawaChange: (code: string) => void;
  nikayaOptions: Option[];
  parshawaOptions: Option[];
  nikayaLoading?: boolean;
  nikayaError?: string | null;
  onRetry?: () => void;
};

export default function NikayaParshawaCompact({
  nikayaValue,
  onNikayaChange,
  parshawaValue,
  onParshawaChange,
  nikayaOptions,
  parshawaOptions,
  nikayaLoading = false,
  nikayaError = null,
  onRetry,
}: Props) {
  return (
    <>
      <div className="flex flex-col gap-1">
        {nikayaLoading ? (
          <span className="text-xs text-gray-500">Loading Nikaya...</span>
        ) : nikayaError ? (
          <div className="flex flex-wrap items-center gap-2 text-xs text-red-600">
            <span>Error loading Nikaya</span>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="text-xs font-medium text-blue-600 underline disabled:text-blue-400"
                disabled={nikayaLoading}
              >
                Retry
              </button>
            )}
          </div>
        ) : (
          <select
            value={nikayaValue}
            onChange={(e) => onNikayaChange(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            disabled={!nikayaOptions.length}
          >
            <option value="">Select Nikaya</option>
            {nikayaOptions.map((n) => (
              <option key={n.code} value={n.code}>
                {n.name} - {n.code}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <select
          value={parshawaValue}
          onChange={(e) => onParshawaChange(e.target.value)}
          className="w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          disabled={!nikayaValue || parshawaOptions.length === 0}
        >
          <option value="">
            {!nikayaValue
              ? "Select Nikaya first"
              : parshawaOptions.length
              ? "Select Chapter"
              : "No chapters available"}
          </option>
          {parshawaOptions.map((p) => (
            <option key={p.code} value={p.code}>
              {p.name} - {p.code}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
