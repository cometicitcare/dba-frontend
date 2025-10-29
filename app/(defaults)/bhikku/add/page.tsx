"use client";

import React, { useState } from "react";
import { useSelector } from "react-redux";
import { IRootState } from "@/store";
import { z } from "zod";
import FormBuilder, { FieldConfig } from "@/components/reuseforms/FormBuilder";
import AlertBanner from "@/components/ui/AlertBanner";
import { _manageBhikku } from "@/services/bhikku";

// 1) validation (Zod). Adjust rules as you need.
const schema = z.object({
  br_reqstdate: z.string().min(1, "Request date is required"),
  br_birthpls: z.string().min(1, "Birth place is required"),
  br_province: z.string().min(1, "Province is required"),
  br_district: z.string().min(1, "District is required"),
  br_gihiname: z.string().min(1, "Lay name is required"),
  br_dofb: z.string().min(1, "Date of birth is required"),
  br_mobile: z
    .string()
    .regex(/^\d{9,12}$/, "Enter a valid phone number"),
  br_email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  // …add more if you like, or keep them optional:
  br_fathrname: z.string().optional().or(z.literal("")),
  br_remarks: z.string().optional().or(z.literal("")),
  br_currstat: z.string().optional().or(z.literal("")),
  br_effctdate: z.string().optional().or(z.literal("")),
  br_parshawaya: z.string().optional().or(z.literal("")),
  br_livtemple: z.string().optional().or(z.literal("")),
  br_mahanatemple: z.string().optional().or(z.literal("")),
  br_mahanaacharyacd: z.string().optional().or(z.literal("")),
  br_multi_mahanaacharyacd: z.string().optional().or(z.literal("")),
  br_mahananame: z.string().optional().or(z.literal("")),
  br_mahanadate: z.string().optional().or(z.literal("")),
  br_cat: z.string().optional().or(z.literal("")),
  br_fathrsaddrs: z.string().optional().or(z.literal("")),
  br_fathrsmobile: z.string().optional().or(z.literal("")),
  br_upasampada_serial_no: z.string().optional().or(z.literal("")),
});

// 2) describe fields (order, type, grid span, etc.)
const fields: FieldConfig[] = [
  // Request Info
  { name: "br_reqstdate", label: "Request Date", type: "date", colSpan: 1, order: 1 },
  { name: "br_birthpls", label: "Birth Place", type: "text", placeholder: "Colombo General Hospital", order: 2 },
  { name: "br_province", label: "Province", type: "text", placeholder: "Western Province", order: 3 },
  { name: "br_district", label: "District", type: "text", placeholder: "Colombo", order: 4 },
  { name: "br_korale", label: "Korale", type: "text", placeholder: "Siyane Korale", order: 5 },
  { name: "br_pattu", label: "Pattu", type: "text", placeholder: "Colombo Pattu", order: 6 },
  { name: "br_division", label: "Division", type: "text", placeholder: "Colombo Division", order: 7 },
  { name: "br_vilage", label: "Village", type: "text", placeholder: "Colombo", order: 8 },
  { name: "br_gndiv", label: "GN Division", type: "text", placeholder: "GN005", order: 9 },

  // Personal Info
  { name: "br_gihiname", label: "Lay Name", type: "text", placeholder: "Sumith Silva", order: 10 },
  { name: "br_dofb", label: "Date of Birth", type: "date", order: 11 },
  { name: "br_fathrname", label: "Father’s Name", type: "text", placeholder: "W.A. Silva", order: 12 },
  { name: "br_remarks", label: "Remarks", type: "textarea", placeholder: "Initial registration", colSpan: 2, order: 13 },

  // Status
  // Example select (you can drive options from API)
  {
    name: "br_currstat",
    label: "Current Status",
    type: "select",
    options: [
      { label: "— Select —", value: "" },
      { label: "ST01", value: "ST01" },
      { label: "ST02", value: "ST02" },
    ],
    order: 14,
  },
  { name: "br_effctdate", label: "Effective Date", type: "date", order: 15 },

  // Temple
  { name: "br_parshawaya", label: "Parshawaya", type: "text", placeholder: "PR001", order: 16 },
  { name: "br_livtemple", label: "Living Temple", type: "text", placeholder: "TRN0000001", order: 17 },
  { name: "br_mahanatemple", label: "Mahanayaka Temple", type: "text", placeholder: "TRN0000002", order: 18 },
  { name: "br_mahanaacharyacd", label: "Mahanayaka Acharya Code", type: "text", placeholder: "BH2025000005", order: 19 },
  {
    name: "br_multi_mahanaacharyacd",
    label: "Multiple Mahanayaka Acharya Codes",
    type: "text",
    placeholder: "BH2025000005,BH2025000006",
    order: 20,
  },
  { name: "br_mahananame", label: "Mahanayaka Name", type: "text", placeholder: "Ven. Mahanayake Thero", order: 21 },
  { name: "br_mahanadate", label: "Mahanayaka Date", type: "date", order: 22 },
  { name: "br_cat", label: "Category", type: "text", placeholder: "CAT01", order: 23 },

  // Contact
  { name: "br_mobile", label: "Mobile", type: "text", placeholder: "0771234567", order: 24 },
  { name: "br_email", label: "Email", type: "email", placeholder: "bhikku01@temple.lk", order: 25 },
  { name: "br_fathrsaddrs", label: "Father’s Address", type: "textarea", placeholder: "123, Main Street, Colombo 07", colSpan: 2, order: 26 },
  { name: "br_fathrsmobile", label: "Father’s Mobile", type: "text", placeholder: "0719876543", order: 27 },
  { name: "br_upasampada_serial_no", label: "Upasampada Serial No", type: "text", placeholder: "UPS2025001", order: 28 },
];

export default function BhikkhuAddForm() {
  const rtl =
    useSelector((s: IRootState) => s.themeConfig.rtlClass) === "rtl";

  // shared banner
  const [alert, setAlert] = useState<{ type: "success" | "error" | ""; message: string }>({
    type: "",
    message: "",
  });

  const defaultValues = Object.fromEntries(fields.map((f) => [f.name, ""])) as any;

  async function onSubmit(values: any) {
    setAlert({ type: "", message: "" });
    try {
      const body = { action: "CREATE", payload: { data: values } };
      const result = await _manageBhikku(body);
      console.log("✅ Added successfully:", result);
      setAlert({ type: "success", message: "Bhikku added successfully!" });
    } catch (err) {
      console.error("❌ Error adding bhikku:", err);
      setAlert({ type: "error", message: "Error adding Bhikku. Please try again." });
    }
  }

  return (
    <div className="p-6 bg-white shadow-md rounded-2xl">
      <h2 className="text-2xl font-semibold mb-4 text-gray-800">Add New Bhikku</h2>

      <AlertBanner
        type={alert.type}
        message={alert.message}
        onClose={() => setAlert({ type: "", message: "" })}
      />

      <FormBuilder
        fields={fields}
        defaultValues={defaultValues}
        zodSchema={schema}
        onSubmit={onSubmit}
        submitLabel="Add Bhikku"
        columns={3}
        rtl={rtl}
        enableDragReorder
        onReorder={(names) => {
          // Persist order to your CMS if needed
          console.log("New order:", names);
        }}
      />
    </div>
  );
}
