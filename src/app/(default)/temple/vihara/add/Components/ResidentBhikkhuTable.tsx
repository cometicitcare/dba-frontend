"use client";
import React, { useState, useEffect } from "react";
import { DataGrid, GridColDef, GridActionsCellItem } from "@mui/x-data-grid";
import type { ResidentBhikkhuRow } from "./steps";
import BhikkhuAutocomplete from "./AutocompleteBhikkhu";

type Props = {
  value: ResidentBhikkhuRow[];
  onChange: (rows: ResidentBhikkhuRow[]) => void;
  error?: string;
};

export default function ResidentBhikkhuTable({ value, onChange, error }: Props) {
  const [rows, setRows] = useState<ResidentBhikkhuRow[]>(value || []);

  useEffect(() => {
    setRows(value || []);
  }, [value]);

  const handleAddRow = () => {
    const newRow: ResidentBhikkhuRow = {
      id: `bhikkhu-${Date.now()}`,
      serialNumber: rows.length + 1,
      bhikkhuName: "",
      registrationNumber: "",
      occupationEducation: "",
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

  const processRowUpdate = (newRow: ResidentBhikkhuRow, oldRow: ResidentBhikkhuRow): ResidentBhikkhuRow => {
    const updated = rows.map((r) => (r.id === newRow.id ? { ...r, ...newRow } : r));
    setRows(updated);
    onChange(updated);
    return newRow;
  };

  const columns: GridColDef<ResidentBhikkhuRow>[] = [
    {
      field: "serialNumber",
      headerName: "Serial Number",
      width: 120,
      editable: false,
    },
    {
      field: "bhikkhuName",
      headerName: "Name of Bhikkhu",
      width: 200,
      editable: true,
    },
    {
      field: "registrationNumber",
      headerName: "Samanera / Upasampada Registration Number",
      width: 280,
      editable: true,
    },
    {
      field: "occupationEducation",
      headerName: "Occupation / Education Status",
      width: 250,
      editable: true,
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
        <h3 className="text-lg font-semibold text-slate-800">Information About Resident Bhikkhus in the Temple</h3>
        <button
          type="button"
          onClick={handleAddRow}
          className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-all"
        >
          + Add Row
        </button>
      </div>
      <div className="mb-4">
        <BhikkhuAutocomplete
          id="resident-bhikkhu-search"
          label="Search Bhikkhu to add"
          placeholder="Type a name or registration number"
          onPick={(picked) => {
            const regn = picked.regn || "";
            const name = picked.name || picked.display || "";
            const exists = rows.some(
              (r) => (regn && r.registrationNumber === regn) || (!regn && r.bhikkhuName === name)
            );
            if (exists) return;
            const newRow: ResidentBhikkhuRow = {
              id: `bhikkhu-${regn || Date.now()}`,
              serialNumber: rows.length + 1,
              bhikkhuName: name,
              registrationNumber: regn,
              occupationEducation: "",
            };
            const updated = [...rows, newRow];
            setRows(updated);
            onChange(updated);
          }}
        />
      </div>
      <div style={{ height: 400, width: "100%" }} className="bg-white">
        <DataGrid<ResidentBhikkhuRow>
          rows={rows}
          columns={columns}
          processRowUpdate={processRowUpdate}
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
