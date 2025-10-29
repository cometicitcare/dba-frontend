"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type SearchBarProps = {
  value?: string;
  onChange?: (val: string) => void;
  onSearch?: (val: string) => void;
  placeholder?: string;
  className?: string;
  /** show a primary action at right (e.g., Add button) */
  actionLabel?: string;
  onActionClick?: () => void;
  /** when true, show a spinner in the search button */
  loading?: boolean;
  /** submit on Enter key */
  submitOnEnter?: boolean;
};

export function SearchBar({
  value = "",
  onChange,
  onSearch,
  placeholder = "Search...",
  className,
  actionLabel,
  onActionClick,
  loading,
  submitOnEnter = true,
}: SearchBarProps) {
  const [local, setLocal] = useState(value);
  const firstLoad = useRef(true);

  useEffect(() => {
    if (firstLoad.current) {
      firstLoad.current = false;
      setLocal(value);
    } else if (value !== local) {
      setLocal(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const triggerSearch = useCallback(() => {
    onSearch?.(local.trim());
  }, [local, onSearch]);

  return (
    <div className={`flex items-center gap-3 ${className ?? ""}`}>
      <input
        type="text"
        className="form-input w-auto"
        placeholder={placeholder}
        value={local}
        onChange={(e) => {
          const next = e.target.value;
          setLocal(next);
          onChange?.(next);
        }}
        onKeyDown={(e) => {
          if (submitOnEnter && e.key === "Enter") triggerSearch();
        }}
      />
      <button
        type="button"
        className="btn btn-outline-primary"
        onClick={triggerSearch}
        disabled={loading}
      >
        {loading ? "Searching..." : "Search"}
      </button>
      {actionLabel && (
        <button type="button" className="btn btn-primary" onClick={onActionClick}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
