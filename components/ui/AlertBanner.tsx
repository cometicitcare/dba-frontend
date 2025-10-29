"use client";
import React from "react";

type AlertType = "success" | "error" | "info" | "";

export default function AlertBanner({
  type = "",
  message = "",
  onClose,
}: {
  type?: AlertType;
  message?: string;
  onClose?: () => void;
}) {
  if (!type || !message) return null;

  const base =
    "mb-4 rounded-lg border p-3 text-sm flex items-start justify-between gap-3";
  const styles =
    type === "success"
      ? "bg-green-50 border-green-200 text-green-800"
      : type === "error"
      ? "bg-red-50 border-red-200 text-red-800"
      : "bg-blue-50 border-blue-200 text-blue-800";

  return (
    <div className={`${base} ${styles}`}>
      <div>{message}</div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-md px-2 py-1 hover:bg-black/5"
          aria-label="Close"
        >
          ✕
        </button>
      )}
    </div>
  );
}
