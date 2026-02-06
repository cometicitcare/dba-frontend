"use client";
import React, { useMemo, useState, useEffect } from "react";
import { DataGrid, GridColDef, GridActionsCellItem } from "@mui/x-data-grid";
import selectionsData from "@/utils/selectionsData.json";
import type { LandInfoRow } from "./steps";

type Props = {
  value: LandInfoRow[];
  onChange: (rows: LandInfoRow[]) => void;
  error?: string;
};

export default function LandInfoTable({ value, onChange, error }: Props) {
  const [rows, setRows] = useState<LandInfoRow[]>(value || []);

  useEffect(() => {
    setRows(value || []);
  }, [value]);

  const districtOptions = useMemo(() => {
    const provinces = (selectionsData as any)?.provinces;
    if (!Array.isArray(provinces)) return [];
    const names: string[] = [];
    provinces.forEach((p: any) => {
      (p?.districts ?? []).forEach((d: any) => {
        const name = d?.dd_dname ?? d?.dd_name ?? d?.name;
        if (name && !names.includes(name)) names.push(name);
      });
    });
    return names.sort((a, b) => a.localeCompare(b));
  }, []);

  const handleAddRow = () => {
    const newRow: LandInfoRow = {
      id: `land-${Date.now()}`,
      serialNumber: rows.length + 1,
      landName: "",
      village: "",
      district: "",
      extent: "",
      cultivationDescription: "",
      ownershipNature: "",
      deedNumber: "",
      titleRegistrationNumber: "",
      taxDetails: "",
      landOccupants: "",
    };
    const updated = [...rows, newRow];
    setRows(updated);
    onChange(updated);
  };

  const handleDeleteRow = (id: string) => {
    const updated = rows.filter((r) => r.id !== id).map((r, idx) => ({ ...r, serialNumber: idx + 1 }));
    setRows(updated);
    onChange(updated);
  };

  const handleCellChange = <K extends keyof LandInfoRow>(id: string, field: K, value: LandInfoRow[K]) => {
    const updated = rows.map((r) => (r.id === id ? { ...r, [field]: value } : r));
    setRows(updated);
    onChange(updated);
  };

  const inputClassName =
    "w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200";

  const columns: GridColDef<LandInfoRow>[] = [
    {
      field: "serialNumber",
      headerName: "Serial Number",
      width: 100,
      editable: false,
      renderCell: (params) => <span className="text-sm text-slate-700">{params.value as number}</span>,
    },
    {
      field: "landName",
      headerName: "Name of the Land",
      width: 150,
      editable: false,
      renderCell: (params) => (
        <input
          className={inputClassName}
          value={(params.value as string) ?? ""}
          onChange={(e) => handleCellChange(params.row.id, "landName", e.target.value)}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    {
      field: "village",
      headerName: "Village",
      width: 120,
      editable: false,
      renderCell: (params) => (
        <input
          className={inputClassName}
          value={(params.value as string) ?? ""}
          onChange={(e) => handleCellChange(params.row.id, "village", e.target.value)}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    {
      field: "district",
      headerName: "District",
      width: 140,
      editable: false,
      renderCell: (params) => (
        <select
          className={inputClassName}
          value={(params.value as string) ?? ""}
          onChange={(e) => handleCellChange(params.row.id, "district", e.target.value)}
          onClick={(e) => e.stopPropagation()}
        >
          <option value="">Select</option>
          {districtOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ),
    },
    {
      field: "extent",
      headerName: "Extent (Land Area)",
      width: 130,
      editable: false,
      renderCell: (params) => (
        <input
          className={inputClassName}
          value={(params.value as string) ?? ""}
          onChange={(e) => handleCellChange(params.row.id, "extent", e.target.value)}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    {
      field: "cultivationDescription",
      headerName: "Nature of Cultivation / Description of Buildings",
      width: 200,
      editable: false,
      renderCell: (params) => (
        <input
          className={inputClassName}
          value={(params.value as string) ?? ""}
          onChange={(e) => handleCellChange(params.row.id, "cultivationDescription", e.target.value)}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    {
      field: "ownershipNature",
      headerName: "Nature of Ownership",
      width: 150,
      editable: false,
      renderCell: (params) => (
        <select
          className={inputClassName}
          value={(params.value as string) ?? ""}
          onChange={(e) => handleCellChange(params.row.id, "ownershipNature", e.target.value)}
          onClick={(e) => e.stopPropagation()}
        >
          <option value="">Select</option>
          {["Bandara", "Rajakariya", "Other"].map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ),
    },
    {
      field: "deedNumber",
      headerName: "Deed Number",
      width: 120,
      editable: false,
      renderCell: (params) => (
        <input
          className={inputClassName}
          value={(params.value as string) ?? ""}
          onChange={(e) => handleCellChange(params.row.id, "deedNumber", e.target.value)}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    {
      field: "titleRegistrationNumber",
      headerName: "Title Registration Number",
      width: 180,
      editable: false,
      renderCell: (params) => (
        <input
          className={inputClassName}
          value={(params.value as string) ?? ""}
          onChange={(e) => handleCellChange(params.row.id, "titleRegistrationNumber", e.target.value)}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    {
      field: "taxDetails",
      headerName: "Tax & Other Details",
      width: 150,
      editable: false,
      renderCell: (params) => (
        <input
          className={inputClassName}
          value={(params.value as string) ?? ""}
          onChange={(e) => handleCellChange(params.row.id, "taxDetails", e.target.value)}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    {
      field: "landOccupants",
      headerName: "Land Occupants / Users",
      width: 150,
      editable: false,
      renderCell: (params) => (
        <input
          className={inputClassName}
          value={(params.value as string) ?? ""}
          onChange={(e) => handleCellChange(params.row.id, "landOccupants", e.target.value)}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    {
      field: "actions",
      type: "actions",
      headerName: "Actions",
      width: 100,
      getActions: (params) => [
        <GridActionsCellItem
          key="delete"
          icon={<span className="text-red-600">🗑️</span>}
          label="Delete"
          onClick={() => handleDeleteRow(params.id as string)}
        />,
      ],
    },
  ];

  return (
    <div className="w-full">
      <div className="mb-4 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-slate-800">Details of the Land Belonging to the Aramaya</h3>
        <button
          type="button"
          onClick={handleAddRow}
          className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-all"
        >
          + Add Row
        </button>
      </div>
      <div style={{ height: 400, width: "100%" }} className="bg-white">
        <DataGrid<LandInfoRow>
          rows={rows}
          columns={columns}
          disableRowSelectionOnClick
          hideFooter
          sx={{
            "& .MuiDataGrid-cell": {
              fontSize: "0.875rem",
            },
            "& .MuiDataGrid-columnHeaders": {
              backgroundColor: "#f1f5f9",
              fontWeight: 600,
            },
            "& .MuiDataGrid-cell:focus": {
              outline: "none",
            },
            "& .MuiDataGrid-cell:focus-within": {
              outline: "none",
            },
          }}
        />
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
