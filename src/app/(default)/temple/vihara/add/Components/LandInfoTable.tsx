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

  const processRowUpdate = (newRow: LandInfoRow, oldRow: LandInfoRow): LandInfoRow => {
    const updated = rows.map((r) => (r.id === newRow.id ? { ...r, ...newRow } : r));
    setRows(updated);
    onChange(updated);
    return newRow;
  };

  const columns: GridColDef<LandInfoRow>[] = [
    {
      field: "serialNumber",
      headerName: "Serial Number",
      width: 100,
      editable: false,
    },
    {
      field: "landName",
      headerName: "Name of the Land",
      width: 150,
      editable: true,
    },
    {
      field: "village",
      headerName: "Village",
      width: 120,
      editable: true,
    },
    {
      field: "district",
      headerName: "District",
      width: 140,
      editable: true,
      type: "singleSelect",
      valueOptions: districtOptions,
    },
    {
      field: "extent",
      headerName: "Extent (Land Area)",
      width: 130,
      editable: true,
    },
    {
      field: "cultivationDescription",
      headerName: "Nature of Cultivation / Description of Buildings",
      width: 200,
      editable: true,
    },
    {
      field: "ownershipNature",
      headerName: "Nature of Ownership",
      width: 150,
      editable: true,
      type: "singleSelect",
      valueOptions: ["Bandara", "Rajakariya", "Other"],
    },
    {
      field: "deedNumber",
      headerName: "Deed Number",
      width: 120,
      editable: true,
    },
    {
      field: "titleRegistrationNumber",
      headerName: "Title Registration Number",
      width: 180,
      editable: true,
    },
    {
      field: "taxDetails",
      headerName: "Tax & Other Details",
      width: 150,
      editable: true,
    },
    {
      field: "landOccupants",
      headerName: "Land Occupants / Users",
      width: 150,
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
      <div className="mb-3 flex justify-between items-center">
        <h3 className="text-base font-semibold text-slate-800">Temple-Owned Land Information</h3>
        <button
          type="button"
          onClick={handleAddRow}
          className="px-3 py-1.5 text-sm bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-all"
        >
          + Add Row
        </button>
      </div>
      <div style={{ height: 360, width: "100%" }} className="bg-white">
        <DataGrid<LandInfoRow>
          rows={rows}
          columns={columns}
          processRowUpdate={processRowUpdate}
          disableRowSelectionOnClick
          hideFooter
          rowHeight={34}
          columnHeaderHeight={34}
          density="compact"
          sx={{
            "& .MuiDataGrid-cell": {
              fontSize: "0.75rem",
            },
            "& .MuiDataGrid-columnHeaders": {
              backgroundColor: "#f1f5f9",
              fontWeight: 600,
              fontSize: "0.75rem",
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
