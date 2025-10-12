"use client";

import { useEffect, useState } from "react";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.css";
import { useSelector } from "react-redux";
import { IRootState } from "@/store";
import { _manageBhikku } from "@/services/bhikku";
import { useParams, useRouter } from "next/navigation";

const BhikkhuEdit = () => {
  const isRtl =
    useSelector((state: IRootState) => state.themeConfig.rtlClass) === "rtl";

  const { id } = useParams(); // id = br_regn
  const router = useRouter();

  const [formData, setFormData] = useState({
    br_regn: "",
    br_reqstdate: "",
    br_gndiv: "",
    br_currstat: "",
    br_parshawaya: "",
    br_livtemple: "",
    br_mahanatemple: "",
    br_mahanaacharyacd: "",
    br_vilage: "",
    br_gihiname: "",
    br_dofb: "",
    br_mobile: "",
    br_email: "",
  });

  const [alert, setAlert] = useState<{ type: "success" | "error" | ""; message: string }>({
    type: "",
    message: "",
  });

  // ✅ Fetch existing Bhikku data
  useEffect(() => {
    const fetchBhikku = async () => {
      try {
        const body = {
          action: "READ_ONE",
          payload: { br_regn: id },
        };

        const res = await _manageBhikku(body);
        console.log("res?.data",res?.data)
        if (res?.data) {
          setFormData(res.data?.data);
        }
      } catch (err) {
        console.error("❌ Error fetching bhikku:", err);
        setAlert({ type: "error", message: "Failed to load Bhikku details." });
      }
    };

    if (id) fetchBhikku();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ✅ Update Bhikku
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlert({ type: "", message: "" });

    try {
      const body = {
        action: "UPDATE",
        payload: {
          br_regn: formData.br_regn,
          data: formData,
        },
      };

      const result = await _manageBhikku(body);
      console.log("✅ Updated successfully:", result);
      setAlert({ type: "success", message: "Bhikku updated successfully!" });

      // optional redirect after update
      setTimeout(() => router.push("/bhikku-list"), 1500);
    } catch (err) {
      console.error("❌ Error updating bhikku:", err);
      setAlert({ type: "error", message: "Error updating Bhikku. Please try again." });
    }
  };

  return (
    <div className="p-6 bg-white shadow-md rounded-2xl">
      <h2 className="text-2xl font-semibold mb-6 text-gray-800">Edit Bhikku</h2>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Registration No */}
        <div>
          <label>Registration No</label>
          <input
            type="text"
            name="br_regn"
            value={formData.br_regn}
            onChange={handleChange}
            className="form-input"
            disabled // not editable
          />
        </div>

        {/* Request Date */}
        <div>
          <label>Request Date</label>
          <Flatpickr
            value={formData.br_reqstdate}
            options={{ dateFormat: "Y-m-d", position: isRtl ? "auto right" : "auto left" }}
            className="form-input"
            onChange={(date) =>
              setFormData((prev) => ({
                ...prev,
                br_reqstdate: date[0]?.toISOString().slice(0, 10) || "",
              }))
            }
          />
        </div>

        {/* GN Division */}
        <div>
          <label>GN Division</label>
          <input
            type="text"
            name="br_gndiv"
            value={formData.br_gndiv}
            onChange={handleChange}
            placeholder="GN005"
            className="form-input"
          />
        </div>

        <div>
          <label>Current Status</label>
          <input
            type="text"
            name="br_currstat"
            value={formData.br_currstat}
            onChange={handleChange}
            placeholder="ST01"
            className="form-input"
          />
        </div>

        <div>
          <label>Parshawaya</label>
          <input
            type="text"
            name="br_parshawaya"
            value={formData.br_parshawaya}
            onChange={handleChange}
            placeholder="PR001"
            className="form-input"
          />
        </div>

        <div>
          <label>Living Temple</label>
          <input
            type="text"
            name="br_livtemple"
            value={formData.br_livtemple}
            onChange={handleChange}
            placeholder="TRN0000001"
            className="form-input"
          />
        </div>

        <div>
          <label>Mahanayaka Temple</label>
          <input
            type="text"
            name="br_mahanatemple"
            value={formData.br_mahanatemple}
            onChange={handleChange}
            placeholder="TRN0000002"
            className="form-input"
          />
        </div>

        <div>
          <label>Mahanayaka Acharya Code</label>
          <input
            type="text"
            name="br_mahanaacharyacd"
            value={formData.br_mahanaacharyacd}
            onChange={handleChange}
            placeholder="BH2025000005"
            className="form-input"
          />
        </div>

        <div>
          <label>Village</label>
          <input
            type="text"
            name="br_vilage"
            value={formData.br_vilage}
            onChange={handleChange}
            placeholder="Colombo"
            className="form-input"
          />
        </div>

        <div>
          <label>Lay Name</label>
          <input
            type="text"
            name="br_gihiname"
            value={formData.br_gihiname}
            onChange={handleChange}
            placeholder="Sumith Silva"
            className="form-input"
          />
        </div>

        <div>
          <label>Date of Birth</label>
          <Flatpickr
            value={formData.br_dofb}
            options={{ dateFormat: "Y-m-d", position: isRtl ? "auto right" : "auto left" }}
            className="form-input"
            onChange={(date) =>
              setFormData((prev) => ({
                ...prev,
                br_dofb: date[0]?.toISOString().slice(0, 10) || "",
              }))
            }
          />
        </div>

        <div>
          <label>Mobile</label>
          <input
            type="text"
            name="br_mobile"
            value={formData.br_mobile}
            onChange={handleChange}
            placeholder="0771234567"
            className="form-input"
          />
        </div>

        <div>
          <label>Email</label>
          <input
            type="email"
            name="br_email"
            value={formData.br_email}
            onChange={handleChange}
            placeholder="bhikku01@temple.lk"
            className="form-input"
          />
        </div>

        {/* ✅ Alert */}
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

        {/* ✅ Button */}
        <div className="sm:col-span-3 flex justify-end">
          <button type="submit" className="btn btn-primary px-6 py-2">
            Update Bhikku
          </button>
        </div>
      </form>
    </div>
  );
};

export default BhikkhuEdit;
