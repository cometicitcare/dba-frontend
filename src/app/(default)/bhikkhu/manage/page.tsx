// ───────────────────────────────────────────────────────────────────────────────
// File: src/app/(default)/bhikkhu/manage/page.tsx
// ───────────────────────────────────────────────────────────────────────────────
"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import MultiStepForm, { validators, type StepConfig } from "@/components/Forms/UpdateFrom";
import DistrictSelect from "@/components/FormComponents/DistrictSelect";
import ProvinceSelect from "@/components/FormComponents/ProvinceSelect";
import DateInput from "@/components/FormComponents/DateInput";
import { _manageDistrict } from "@/services/district";
import { _manageProvince } from "@/services/province";
import { _getLocationData } from "@/services/locationData";
import { TopBar } from "@/components/TopBar";
import { Sidebar } from "@/components/Sidebar";
import { FooterBar } from "@/components/FooterBar";

// Avoid static prerender/export crashes for CSR pages using search params
export const dynamic = "force-dynamic";

type District = {
  dd_dcode: string;
  dd_dname: string;
  dd_id: number;
};

type Province = {
  name: string;
};

type FormData = {
  br_reqstdate: string;
  br_gihiname: string;
  br_dofb: string;
  br_fathrname: string;
  br_email: string;
  br_mobile: string;
  br_fathrsaddrs: string;
  br_fathrsmobile: string;

  br_birthpls: string;
  br_province: string;
  br_district: number;
  br_korale: string;
  br_pattu: string;
  br_division: string;
  br_vilage: string;
  br_gndiv: string;

  br_viharadhipathi_name: string;
  br_nikaya_name: string;
  br_chapter_name: string;
  br_mahanayaka_name: string;
  br_mahanayaka_address: string;

  br_cat: string;
  br_currstat: string;
  br_residence_at_declaration: string;
  br_declaration_date: string;
  br_remarks: string;

  br_robing_date: string;
  br_robing_assumed_name: string;
  br_robing_tutor_name: string;
  br_robing_tutor_residence: string;
  br_robing_place_temple: string;
  br_robing_after_residence_temple: string;
};

type ApiOk<T> = { data?: T };
function hasData<T>(v: unknown): v is ApiOk<T> {
  return typeof v === "object" && v !== null && "data" in (v as Record<string, unknown>);
}

/* ---------------- Inner Page (uses hooks) ---------------- */
function ManageBhikkhuPageInner() {
  const params = useSearchParams();
  const id = params.get("id") ?? undefined;
  const today = new Date().toISOString().slice(0, 10);

  const [districts, setDistricts] = useState<District[]>([]);
  const [districtsLoading, setDistrictsLoading] = useState<boolean>(false);
  const [districtsError, setDistrictsError] = useState<string | null>(null);

  const [provinces, setProvinces] = useState<Province[]>([]);
  const [provincesLoading, setProvincesLoading] = useState<boolean>(false);
  const [provincesError, setProvincesError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const steps: StepConfig[] = [
    {
      id: 1,
      title: "Personal Information",
      fields: [
        { name: "br_reqstdate", label: "Request Date", type: "custom", required: true, validate: validators.notFutureDate(today), rendererKey: "date" },
        { name: "br_dofb", label: "Date of Birth", type: "custom", required: true, validate: validators.notFutureDate(today), rendererKey: "date" },
        { name: "br_gihiname", label: "Full Name (Gihi Name)", type: "text", required: true, grid: "full" },
        { name: "br_fathrname", label: "Father's Name", type: "text", required: true, grid: "full" },
        { name: "br_email", label: "Email Address", type: "email", required: true, validate: validators.email },
        { name: "br_mobile", label: "Mobile Number", type: "tel", required: true, validate: validators.sriLankaPhone10 },
        { name: "br_fathrsaddrs", label: "Father's Address", type: "text", required: true, grid: "full" },
        { name: "br_fathrsmobile", label: "Father's Mobile", type: "tel", required: true, validate: validators.sriLankaPhone10 },
      ],
    },
    {
      id: 2,
      title: "Birth Location",
      fields: [
        { name: "br_birthpls", label: "Birth Place", type: "text", required: true, grid: "full" },
        { name: "br_province", label: "Province", type: "custom", required: true, rendererKey: "province" },
        { name: "br_district", label: "District", type: "custom", required: true, rendererKey: "district" },
        { name: "br_korale", label: "Korale", type: "text", required: true },
        { name: "br_pattu", label: "Pattu", type: "text", required: true },
        { name: "br_division", label: "Division", type: "text", required: true },
        { name: "br_vilage", label: "Village", type: "text", required: true },
        { name: "br_gndiv", label: "GN Division", type: "text", required: true, grid: "full" },
      ],
    },
    {
      id: 3,
      title: "Temple Information",
      fields: [
        { name: "br_viharadhipathi_name", label: "Name of Viharadhipathi of temple of residence", type: "text", required: true, grid: "full" },
        { name: "br_nikaya_name", label: "Name of Nikaya", type: "text", required: true },
        { name: "br_chapter_name", label: "Name of Chapter", type: "text", required: true },
        { name: "br_mahanayaka_name", label: "Name of Mahanayaka Thera or Nayaka Thero of the Nikaya", type: "text", required: true, grid: "full" },
        { name: "br_mahanayaka_address", label: "Full postal address of the Mahanayaka Thera or Nayaka Theri of the Nikaya", type: "textarea", rows: 4, required: true, grid: "full" },
      ],
    },
    {
      id: 4,
      title: "Robing Informations",
      fields: [
        { name: "br_robing_date", label: "Date of robing", type: "custom", required: true, validate: validators.notFutureDate(today), rendererKey: "date" },
        { name: "br_robing_assumed_name", label: "Name assumed at robing", type: "text", required: true },
        { name: "br_robing_tutor_name", label: "Name of robing tutor", type: "text", required: true, grid: "full" },
        { name: "br_robing_tutor_residence", label: "Name of robing tutor’s residence", type: "text", required: true, grid: "full" },
        { name: "br_robing_place_temple", label: "Temple where robing took place", type: "text", required: true },
        { name: "br_robing_after_residence_temple", label: "Temple of residence after robing", type: "text", required: true },
      ],
    },
    {
      id: 5,
      title: "Additional Details",
      fields: [
        { name: "br_cat", label: "Category", type: "text", required: true },
        { name: "br_currstat", label: "Current Status", type: "text", required: true },
        { name: "br_residence_at_declaration", label: "Residence at time of declaration", type: "text", required: true, grid: "full" },
        { name: "br_declaration_date", label: "Date of making the declaration", type: "custom", required: true, validate: validators.notFutureDate(today), rendererKey: "date" },
        { name: "br_remarks", label: "Remarks", type: "textarea", rows: 4, required: true, grid: "full" },
      ],
    },
  ];

  const demoValues: Partial<FormData> = {
    br_reqstdate: today,
    br_gihiname: "Saman Kumara",
    br_dofb: "1995-05-20",
    br_fathrname: "Kumara Senanayake",
    br_email: "saman@example.com",
    br_mobile: "0711234567",
    br_fathrsaddrs: "No. 12, Temple Rd, Kandy",
    br_fathrsmobile: "0777654321",

    br_birthpls: "Kandy",
    br_province: "Central",
    br_district: 2,
    br_korale: "Harispattuwa",
    br_pattu: "Yatinuwara",
    br_division: "Gangawata Korale",
    br_vilage: "Peradeniya",
    br_gndiv: "123A",

    br_viharadhipathi_name: "Ven. Viharadhipathi Thera",
    br_nikaya_name: "Siyam Nikaya",
    br_chapter_name: "Malwathu Chapter",
    br_mahanayaka_name: "Most Ven. Mahanayaka Thera",
    br_mahanayaka_address: "Mahavihara, Sri Dalada Veediya, Kandy, Sri Lanka",

    br_cat: "CAT-01",
    br_currstat: "Active",
    br_residence_at_declaration: "Asgiriya Maha Viharaya, Kandy",
    br_declaration_date: today,
    br_remarks: "N/A",

    br_robing_date: "2010-06-15",
    br_robing_assumed_name: "Ven. Sumedha",
    br_robing_tutor_name: "Ven. Dhammika Thera",
    br_robing_tutor_residence: "Dharmapala Aramaya, Galle",
    br_robing_place_temple: "Asgiriya Maha Viharaya",
    br_robing_after_residence_temple: "XYZ Aranya Senasanaya",
  };

  async function loadData(recordId: string) {
    const res = await fetch(`/api/registrations/${recordId}`, { cache: "no-store" });
    if (!res.ok) throw new Error("load failed");
    return (await res.json()) as Partial<FormData>;
  }

  async function saveSection({ id: recordId, step, payload }: { id?: string; step: StepConfig; payload: Partial<FormData> }) {
    if (!recordId) return;
    const res = await fetch(`/api/registrations/${recordId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("patch failed");
  }

  const fetchLocationData = async () => {
    try {
      const result = await _getLocationData();
      if (hasData<unknown>(result)) {
        const payload = (result as any)?.data?.data;
        console.log("fetchLocationData", payload);
      } else {
        console.log("fetchLocationData: unexpected shape", result);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDistricts = async () => {
    setDistrictsLoading(true);
    setDistrictsError(null);
    try {
      const body = { action: "READ_ALL", payload: { page: 1, limit: 20, search_key: "" } };
      const result = await _manageDistrict(body);
      const rows: District[] = Array.isArray((result as any)?.data?.data) ? ((result as any).data.data as District[]) : [];
      setDistricts(rows);
    } catch (err) {
      setDistrictsError("Failed to load districts");
      console.error(err);
    } finally {
      setDistrictsLoading(false);
    }
  };

  const fetchProvinces = async () => {
    setProvincesLoading(true);
    setProvincesError(null);
    try {
      const body = { action: "READ_ALL", payload: { page: 1, limit: 20, search_key: "" } };
      const result = await _manageProvince(body);
      const rows: Province[] = Array.isArray((result as any)?.data?.data) ? ((result as any).data.data as Province[]) : [];
      setProvinces(rows);
    } catch (err) {
      setProvincesError("Failed to load provinces");
      console.error(err);
    } finally {
      setProvincesLoading(false);
    }
  };

  useEffect(() => {
    fetchLocationData();
    fetchDistricts();
    fetchProvinces();
  }, []);

  return (
    <div className="w-full min-h-screen bg-gray-50">
      <TopBar onMenuClick={() => setSidebarOpen((v) => !v)} />
      <Sidebar isOpen={sidebarOpen} />
      <div className={`transition-all duration-300 pt-16 ${sidebarOpen ? "ml-64" : "ml-0"}`}>
        <main className="p-2 mb-20">
          <MultiStepForm
            title="Update Registration"
            id={id}
            steps={steps}
            initialValues={demoValues}
            demoValues={demoValues}
            loadData={loadData}
            saveSection={saveSection}
            mode="view"
            renderers={{
              district: (p: any) => (
                <DistrictSelect
                  {...p}
                  options={districts}
                  isLoading={districtsLoading}
                  errorMessage={districtsError ?? undefined}
                  placeholder="Select district"
                />
              ),
              province: (p: any) => (
                <ProvinceSelect
                  {...p}
                  options={provinces}
                  placeholder="Select province"
                  disabled={provincesLoading}
                  errorMessage={provincesError ?? undefined}
                />
              ),
              date: (p: any) => <DateInput {...p} />,
            }}
          />
        </main>
        <FooterBar />
      </div>
    </div>
  );
}

/* ---------------- Page wrapper with Suspense (no hooks here) ---------------- */
export default function Page() {
  // why: satisfies Next.js requirement to wrap useSearchParams in Suspense
  return (
    <Suspense fallback={<div className="p-8 text-slate-600">Loading…</div>}>
      <ManageBhikkhuPageInner />
    </Suspense>
  );
}