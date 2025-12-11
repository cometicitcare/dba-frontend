"use client";
import React, { useState, useEffect } from "react";
import { DataGrid, GridColDef, GridActionsCellItem } from "@mui/x-data-grid";
import type { ResidentSilmathaRow } from "./steps";

type Props = {
  value: ResidentSilmathaRow[];
  onChange: (rows: ResidentSilmathaRow[]) => void;
  error?: string;
};

export default function ResidentSilmathaTable({ value, onChange, error }: Props) {
  const [rows, setRows] = useState<ResidentSilmathaRow[]>(value || []);

  useEffect(() => {
    setRows(value || []);
  }, [value]);

  const handleAddRow = () => {
    const newRow: ResidentSilmathaRow = {
      id: `silmatha-${Date.now()}`,
      serialNumber: rows.length + 1,
      silmathaName: "",
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

  const processRowUpdate = (newRow: ResidentSilmathaRow, oldRow: ResidentSilmathaRow): ResidentSilmathaRow => {
    const updated = rows.map((r) => (r.id === newRow.id ? { ...r, ...newRow } : r));
    setRows(updated);
    onChange(updated);
    return newRow;
  };

  const columns: GridColDef<ResidentSilmathaRow>[] = [
    {
      field: "serialNumber",
      headerName: "Serial Number",
      width: 120,
      editable: false,
    },
    {
      field: "silmathaName",
      headerName: "Name of the Sil Māthā",
      width: 250,
      editable: true,
    },
    {
      field: "registrationNumber",
      headerName: "Registration Number",
      width: 250,
      editable: true,
    },
    {
      field: "occupationEducation",
      headerName: "Occupation / Whether Currently Studying",
      width: 300,
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
        <h3 className="text-lg font-semibold text-slate-800">Information About the Ten Sil Māthā Residents of the Aramaya</h3>
        <button
          type="button"
          onClick={handleAddRow}
          className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-all"
        >
          + Add Row
        </button>
      </div>
      <div style={{ height: 400, width: "100%" }} className="bg-white">
        <DataGrid<ResidentSilmathaRow>
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


