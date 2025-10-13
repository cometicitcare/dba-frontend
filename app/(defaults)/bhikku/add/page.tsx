"use client";

import { useState } from "react";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.css";
import { useSelector } from "react-redux";
import { IRootState } from "@/store";
import { _manageBhikku } from "@/services/bhikku";

const BhikkhuAdd = () => {
  const isRtl =
    useSelector((state: IRootState) => state.themeConfig.rtlClass) === "rtl";

  const [formData, setFormData] = useState({
    br_reqstdate: "",
    br_birthpls: "",
    br_province: "",
    br_district: "",
    br_korale: "",
    br_pattu: "",
    br_division: "",
    br_vilage: "",
    br_gndiv: "",
    br_gihiname: "",
    br_dofb: "",
    br_fathrname: "",
    br_remarks: "",
    br_currstat: "",
    br_effctdate: "",
    br_parshawaya: "",
    br_livtemple: "",
    br_mahanatemple: "",
    br_mahanaacharyacd: "",
    br_multi_mahanaacharyacd: "",
    br_mahananame: "",
    br_mahanadate: "",
    br_cat: "",
    br_mobile: "",
    br_email: "",
    br_fathrsaddrs: "",
    br_fathrsmobile: "",
    br_upasampada_serial_no: "",
  });

  const [alert, setAlert] = useState<{ type: "success" | "error" | ""; message: string }>({
    type: "",
    message: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (name: string, date: Date[]) => {
    setFormData((prev) => ({
      ...prev,
      [name]: date[0]?.toISOString().slice(0, 10) || "",
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlert({ type: "", message: "" });

    try {
      const body = {
        action: "CREATE",
        payload: { data: formData },
      };
      const result = await _manageBhikku(body);
      console.log("✅ Added successfully:", result);
      setAlert({ type: "success", message: "Bhikku added successfully!" });
    } catch (err) {
      console.error("❌ Error adding bhikku:", err);
      setAlert({ type: "error", message: "Error adding Bhikku. Please try again." });
    }
  };

  return (
    <div className="p-6 bg-white shadow-md rounded-2xl">
      <h2 className="text-2xl font-semibold mb-6 text-gray-800">Add New Bhikku</h2>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Request Info */}
        <div>
          <label>Request Date</label>
          <Flatpickr
            value={formData.br_reqstdate}
            onChange={(date) => handleDateChange("br_reqstdate", date)}
            options={{ dateFormat: "Y-m-d", position: isRtl ? "auto right" : "auto left" }}
            className="form-input"
          />
        </div>

        <div>
          <label>Birth Place</label>
          <input
            name="br_birthpls"
            value={formData.br_birthpls}
            onChange={handleChange}
            className="form-input"
            placeholder="Colombo General Hospital"
          />
        </div>

        <div>
          <label>Province</label>
          <input
            name="br_province"
            value={formData.br_province}
            onChange={handleChange}
            className="form-input"
            placeholder="Western Province"
          />
        </div>

        <div>
          <label>District</label>
          <input
            name="br_district"
            value={formData.br_district}
            onChange={handleChange}
            className="form-input"
            placeholder="Colombo"
          />
        </div>

        <div>
          <label>Korale</label>
          <input
            name="br_korale"
            value={formData.br_korale}
            onChange={handleChange}
            className="form-input"
            placeholder="Siyane Korale"
          />
        </div>

        <div>
          <label>Pattu</label>
          <input
            name="br_pattu"
            value={formData.br_pattu}
            onChange={handleChange}
            className="form-input"
            placeholder="Colombo Pattu"
          />
        </div>

        <div>
          <label>Division</label>
          <input
            name="br_division"
            value={formData.br_division}
            onChange={handleChange}
            className="form-input"
            placeholder="Colombo Division"
          />
        </div>

        <div>
          <label>Village</label>
          <input
            name="br_vilage"
            value={formData.br_vilage}
            onChange={handleChange}
            className="form-input"
            placeholder="Colombo"
          />
        </div>

        <div>
          <label>GN Division</label>
          <input
            name="br_gndiv"
            value={formData.br_gndiv}
            onChange={handleChange}
            className="form-input"
            placeholder="GN005"
          />
        </div>

        {/* Personal Info */}
        <div>
          <label>Lay Name</label>
          <input
            name="br_gihiname"
            value={formData.br_gihiname}
            onChange={handleChange}
            className="form-input"
            placeholder="Sumith Silva"
          />
        </div>

        <div>
          <label>Date of Birth</label>
          <Flatpickr
            value={formData.br_dofb}
            onChange={(date) => handleDateChange("br_dofb", date)}
            options={{ dateFormat: "Y-m-d", position: isRtl ? "auto right" : "auto left" }}
            className="form-input"
          />
        </div>

        <div>
          <label>Father’s Name</label>
          <input
            name="br_fathrname"
            value={formData.br_fathrname}
            onChange={handleChange}
            className="form-input"
            placeholder="W.A. Silva"
          />
        </div>

        <div>
          <label>Remarks</label>
          <input
            name="br_remarks"
            value={formData.br_remarks}
            onChange={handleChange}
            className="form-input"
            placeholder="Initial registration"
          />
        </div>

        {/* Status */}
        <div>
          <label>Current Status</label>
          <input
            name="br_currstat"
            value={formData.br_currstat}
            onChange={handleChange}
            className="form-input"
            placeholder="ST01"
          />
        </div>

        <div>
          <label>Effective Date</label>
          <Flatpickr
            value={formData.br_effctdate}
            onChange={(date) => handleDateChange("br_effctdate", date)}
            options={{ dateFormat: "Y-m-d" }}
            className="form-input"
          />
        </div>

        {/* Temple Details */}
        <div>
          <label>Parshawaya</label>
          <input
            name="br_parshawaya"
            value={formData.br_parshawaya}
            onChange={handleChange}
            className="form-input"
            placeholder="PR001"
          />
        </div>

        <div>
          <label>Living Temple</label>
          <input
            name="br_livtemple"
            value={formData.br_livtemple}
            onChange={handleChange}
            className="form-input"
            placeholder="TRN0000001"
          />
        </div>

        <div>
          <label>Mahanayaka Temple</label>
          <input
            name="br_mahanatemple"
            value={formData.br_mahanatemple}
            onChange={handleChange}
            className="form-input"
            placeholder="TRN0000002"
          />
        </div>

        <div>
          <label>Mahanayaka Acharya Code</label>
          <input
            name="br_mahanaacharyacd"
            value={formData.br_mahanaacharyacd}
            onChange={handleChange}
            className="form-input"
            placeholder="BH2025000005"
          />
        </div>

        <div>
          <label>Multiple Mahanayaka Acharya Codes</label>
          <input
            name="br_multi_mahanaacharyacd"
            value={formData.br_multi_mahanaacharyacd}
            onChange={handleChange}
            className="form-input"
            placeholder="BH2025000005,BH2025000006"
          />
        </div>

        <div>
          <label>Mahanayaka Name</label>
          <input
            name="br_mahananame"
            value={formData.br_mahananame}
            onChange={handleChange}
            className="form-input"
            placeholder="Ven. Mahanayake Thero"
          />
        </div>

        <div>
          <label>Mahanayaka Date</label>
          <Flatpickr
            value={formData.br_mahanadate}
            onChange={(date) => handleDateChange("br_mahanadate", date)}
            options={{ dateFormat: "Y-m-d" }}
            className="form-input"
          />
        </div>

        <div>
          <label>Category</label>
          <input
            name="br_cat"
            value={formData.br_cat}
            onChange={handleChange}
            className="form-input"
            placeholder="CAT01"
          />
        </div>

        {/* Contact Info */}
        <div>
          <label>Mobile</label>
          <input
            name="br_mobile"
            value={formData.br_mobile}
            onChange={handleChange}
            className="form-input"
            placeholder="0771234567"
          />
        </div>

        <div>
          <label>Email</label>
          <input
            name="br_email"
            type="email"
            value={formData.br_email}
            onChange={handleChange}
            className="form-input"
            placeholder="bhikku01@temple.lk"
          />
        </div>

        <div>
          <label>Father’s Address</label>
          <input
            name="br_fathrsaddrs"
            value={formData.br_fathrsaddrs}
            onChange={handleChange}
            className="form-input"
            placeholder="123, Main Street, Colombo 07"
          />
        </div>

        <div>
          <label>Father’s Mobile</label>
          <input
            name="br_fathrsmobile"
            value={formData.br_fathrsmobile}
            onChange={handleChange}
            className="form-input"
            placeholder="0719876543"
          />
        </div>

        <div>
          <label>Upasampada Serial No</label>
          <input
            name="br_upasampada_serial_no"
            value={formData.br_upasampada_serial_no}
            onChange={handleChange}
            className="form-input"
            placeholder="UPS2025001"
          />
        </div>

        {/* Alert Message */}
        <div className="sm:col-span-3">
          {alert.message && (
            <div
              className={`mb-4 rounded-lg p-3 text-sm ${
                alert.type === "success"
                  ? "bg-green-100 text-green-800 border border-green-300"
                  : "bg-red-100 text-red-800 border border-red-300"
              }`}
            >
              {alert.message}
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="sm:col-span-3 flex justify-end">
          <button type="submit" className="btn btn-primary px-6 py-2">
            Add Bhikku
          </button>
        </div>
      </form>
    </div>
  );
};

export default BhikkhuAdd;
