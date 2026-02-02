"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Autocomplete,
  TextField,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import request from "@/services/backendClient";

type ViharaAngaOption = {
  vg_id: number;
  vg_code: string;
  vg_item: string;
  _custom?: boolean;
};

type Props = {
  id: string;
  label: string;
  value?: string;
  onChange: (value: string) => void;
  required?: boolean;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
};

const API_URL = "https://api.dbagovlk.com/api/v1/viharanga/manage";

const getAuthToken = () => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as any;
    return (
      parsed?.token ??
      parsed?.access_token ??
      parsed?.accessToken ??
      parsed?.data?.token ??
      parsed?.data?.access_token ??
      parsed?.user?.token ??
      parsed?.user?.access_token ??
      null
    );
  } catch {
    return null;
  }
};

const parseTokens = (raw?: string): string[] => {
  const value = (raw ?? "").trim();
  if (!value) return [];
  if (value.startsWith("[")) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed
          .map((entry) => {
            if (!entry) return "";
            if (typeof entry === "string") return entry;
            return entry?.vg_item ?? entry?.name ?? entry?.label ?? "";
          })
          .map((entry) => String(entry).trim())
          .filter(Boolean);
      }
    } catch {
      // fall through to comma-separated parsing
    }
  }
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
};

export default function ViharaAngaMultipleSelector({
  id,
  label,
  value,
  onChange,
  required,
  error,
  placeholder,
  disabled,
}: Props) {
  const [options, setOptions] = useState<ViharaAngaOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newItem, setNewItem] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const tokens = useMemo(() => parseTokens(value), [value]);
  const selectedOptions = useMemo(() => {
    if (!tokens.length) return [];
    return tokens.map((token, index) => {
      const match = options.find(
        (opt) => opt.vg_item === token || opt.vg_code === token
      );
      if (match) return match;
      return {
        vg_id: -1 * (index + 1),
        vg_code: token,
        vg_item: token,
        _custom: true,
      };
    });
  }, [options, tokens]);

  const loadOptions = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const token = getAuthToken();
      const response = await request.post<{ data?: ViharaAngaOption[] }>(
        API_URL,
        { action: "READ_ALL", payload: { page: 1, limit: 100 } },
        { headers: token ? { Authorization: `Bearer ${token}` } : undefined }
      );
      const rows = Array.isArray(response?.data?.data) ? response.data.data : [];
      setOptions(
        rows
          .filter((row) => row?.vg_item)
          .map((row) => ({
            vg_id: Number(row.vg_id),
            vg_code: String(row.vg_code ?? ""),
            vg_item: String(row.vg_item ?? ""),
          }))
      );
    } catch (err) {
      console.error("Failed to load Viharanga list", err);
      setLoadError("Failed to load list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOptions();
  }, []);

  const handleSelectionChange = (_: any, selected: ViharaAngaOption[]) => {
    const items = selected
      .map((opt) => opt.vg_item?.trim())
      .filter(Boolean);
    const next = items.join(", ");
    onChange(next);
  };

  const handleOpenAddDialog = () => {
    setCreateError(null);
    setNewCode("");
    setNewItem("");
    setOpenAddDialog(true);
  };

  const handleCreate = async () => {
    const code = newCode.trim();
    const item = newItem.trim();
    if (!code || !item) {
      setCreateError("Code and item are required.");
      return;
    }
    try {
      setCreating(true);
      setCreateError(null);
      const token = getAuthToken();
      const response = await request.post<{ data?: ViharaAngaOption }>(
        API_URL,
        { action: "CREATE", payload: { data: { vg_code: code, vg_item: item } } },
        { headers: token ? { Authorization: `Bearer ${token}` } : undefined }
      );
      const created = response?.data?.data;
      if (created?.vg_item) {
        const normalized: ViharaAngaOption = {
          vg_id: Number(created.vg_id ?? Date.now()),
          vg_code: String(created.vg_code ?? code),
          vg_item: String(created.vg_item ?? item),
        };
        setOptions((prev) => {
          const exists = prev.some((opt) => opt.vg_code === normalized.vg_code);
          return exists ? prev : [normalized, ...prev];
        });
        const nextTokens = Array.from(
          new Set([...tokens, normalized.vg_item].filter(Boolean))
        );
        onChange(nextTokens.join(", "));
      }
      setOpenAddDialog(false);
    } catch (err) {
      console.error("Failed to create Viharanga item", err);
      setCreateError("Failed to create. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <label htmlFor={id} className="block text-sm font-medium text-slate-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <button
          type="button"
          onClick={handleOpenAddDialog}
          className="text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          + Add new
        </button>
      </div>

      <Autocomplete
        id={id}
        multiple
        options={options}
        value={selectedOptions}
        loading={loading}
        onChange={handleSelectionChange}
        getOptionLabel={(option) =>
          option?.vg_item ? `${option.vg_item} (${option.vg_code})` : ""
        }
        isOptionEqualToValue={(option, valueOption) =>
          option.vg_id === valueOption.vg_id || option.vg_item === valueOption.vg_item
        }
        filterSelectedOptions
        disabled={disabled}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder={placeholder ?? "Select temple buildings/structures"}
            error={Boolean(error || loadError)}
            helperText={error || loadError || "Select multiple items"}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading ? <CircularProgress color="inherit" size={18} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
      />

      <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add Viharanga Item</DialogTitle>
        <DialogContent dividers>
          <div className="space-y-4">
            <TextField
              label="Code"
              fullWidth
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
            />
            <TextField
              label="Item"
              fullWidth
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
            />
            {createError ? <p className="text-sm text-red-600">{createError}</p> : null}
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddDialog(false)} disabled={creating}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleCreate} disabled={creating}>
            {creating ? "Saving..." : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
