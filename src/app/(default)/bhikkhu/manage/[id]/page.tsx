"use client";

import React, {
  useMemo,
  useRef,
  useState,
  useEffect,
  useCallback,
  Suspense,
} from "react";
import { useRouter } from "next/navigation";
import { _manageBhikku } from "@/services/bhikku";
import { FooterBar } from "@/components/FooterBar";
import { TopBar } from "@/components/TopBar";
import { Sidebar } from "@/components/Sidebar";
import selectionsData from "@/utils/selectionsData.json";

import {
  DateField,
  LocationPicker,
  BhikkhuAutocomplete,
  TempleAutocomplete,
  TempleAutocompleteAddress,
  BhikkhuCategorySelect,
  BhikkhuStatusSelect,
  bhikkhuSteps,
  bhikkhuInitialValues,
  toYYYYMMDD,
  validateField,
  Errors,
} from "@/components/Bhikku/Add";

import type {
  BhikkhuForm,
  FieldConfig,
  StepConfig,
} from "@/components/Bhikku/Add";

import QRCode from "react-qr-code";
import { Tabs } from "@/components/ui/Tabs";

import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const HIDDEN_FIELDS: ReadonlySet<keyof BhikkhuForm> = new Set([
  "br_fathrname",
  "br_email",
  "br_fathrsaddrs",
  "br_mobile",
  "br_fathrsmobile",
]);

const OPTIONAL_LOCATION_FIELDS: ReadonlySet<keyof BhikkhuForm> = new Set([
  "br_division",
  "br_gndiv",
  "br_korale",
  "br_pattu",
  "br_vilage",
]);

const CERTIFICATE_URL_BASE =
  "https://hrms.dbagovlk.com/bhikkhu/certificate";
const SAMPLE_CERT_URL = `${CERTIFICATE_URL_BASE}/sample`;

type CertificateMeta = {
  number: string;
  url: string;
};

type CertificateScanItem = {
  id: string;
  file_name: string;
  file_url: string;
  uploaded_at?: string;
};

// ---------------- Page code ----------------

type NikayaAPIItem = {
  nikaya: { code: string; name: string };
  main_bhikku: {
    regn: string;
    gihiname: string;
    mahananame: string;
    current_status: string;
    parshawaya: string;
    livtemple: string;
    mahanatemple: string;
    address: string;
  } | null;
  parshawayas: Array<{
    code: string;
    name: string;
    remarks?: string;
    start_date?: string;
    nayaka_regn?: string;
    nayaka?: any;
  }>;
};

const STATIC_NIKAYA_DATA: NikayaAPIItem[] = Array.isArray(
  (selectionsData as any)?.nikayas
)
  ? ((selectionsData as any).nikayas as NikayaAPIItem[])
  : [];

const NOVICE_CATEGORY_CODE = "CAT03";
export const dynamic = "force-dynamic";

type PageProps = { params: { id: string } };

function ManageBhikkhuInner({ params }: PageProps) {
  const editId = params.id;
  const router = useRouter();

  const baseSteps = useMemo(() => bhikkhuSteps(), []);
  const processedSteps = useMemo<StepConfig<BhikkhuForm>[]>(
    () =>
      baseSteps.map((step) => ({
        ...step,
        fields: step.fields
          .filter((field) => !HIDDEN_FIELDS.has(field.name))
          .map((field) => {
            if (!OPTIONAL_LOCATION_FIELDS.has(field.name)) return field;
            const nextRules = field.rules ? { ...field.rules } : {};
            return {
              ...field,
              rules: { ...nextRules, required: false },
            };
          }),
      })),
    [baseSteps]
  );
  const steps = useMemo(() => {
    const certTab: StepConfig<BhikkhuForm> = {
      id: processedSteps.length + 1,
      title: "Certificates",
      fields: [],
    };
    const scannedTab: StepConfig<BhikkhuForm> = {
      id: processedSteps.length + 2,
      title: "Upload Scanned Files",
      fields: [],
    };
    return [...processedSteps, certTab, scannedTab];
  }, [processedSteps]);

  const [activeTab, setActiveTab] = useState<number>(1);
  const [values, setValues] = useState<Partial<BhikkhuForm>>({
    ...bhikkhuInitialValues,
    br_cat: NOVICE_CATEGORY_CODE,
  });
  const [errors, setErrors] = useState<Errors<BhikkhuForm>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const certificatePaperRef = useRef<HTMLDivElement | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [certificateMeta, setCertificateMeta] = useState<CertificateMeta>({
    number: "",
    url: "",
  });
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [scannedFile, setScannedFile] = useState<File | null>(null);
  const [uploadingScan, setUploadingScan] = useState(false);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const current = steps[activeTab - 1];
  const stepTitle = current?.title ?? "";
  const isCertificatesTab = stepTitle === "Certificates";

  const fieldLabels: Record<string, string> = useMemo(() => {
    const map: Record<string, string> = {};
    steps.forEach((s) =>
      s.fields.forEach((f) => (map[String(f.name)] = f.label))
    );
    return map;
  }, [steps]);

  const fieldByName: Map<string, FieldConfig<BhikkhuForm>> = useMemo(() => {
    const m = new Map<string, FieldConfig<BhikkhuForm>>();
    steps.forEach((s) => s.fields.forEach((f) => m.set(String(f.name), f)));
    return m;
  }, [steps]);

  const scrollTop = () =>
    sectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

  const handleInputChange = (name: keyof BhikkhuForm, value: string) => {
    setValues((prev) => {
      const next = { ...prev, [name]: value };
      const cfg = fieldByName.get(String(name));
      if (cfg) {
        const msg = validateField(cfg, value, next, today);
        setErrors((e) => ({ ...e, [name]: msg }));
      }
      return next;
    });
  };

  const handleSetMany = (patch: Partial<BhikkhuForm>) => {
    setValues((prev) => {
      const next: Partial<BhikkhuForm> = { ...prev, ...patch };
      const nextErrors: Errors<BhikkhuForm> = { ...errors };
      Object.keys(patch).forEach((k) => {
        const cfg = fieldByName.get(k);
        if (cfg) {
          const raw = String((next as any)[k] ?? "");
          nextErrors[cfg.name as keyof BhikkhuForm] = validateField(
            cfg,
            raw,
            next,
            today
          );
        }
      });
      setErrors(nextErrors);
      return next;
    });
  };

  const validateTab = (tabIndex: number): boolean => {
    const step = steps[tabIndex - 1];
    if (!step) return true;
    const nextErrors: Errors<BhikkhuForm> = { ...errors };
    let valid = true;
    for (const f of step.fields) {
      const raw = values[f.name] as unknown as string | undefined;
      const msg = validateField(f, raw, values, today);
      nextErrors[f.name] = msg;
      if (msg) valid = false;
    }
    setErrors(nextErrors);
    if (!valid) scrollTop();
    return valid;
  };

  const buildPartialPayloadForTab = (
    tabIndex: number
  ): Partial<BhikkhuForm> => {
    const s = steps[tabIndex - 1];
    const payload: Partial<BhikkhuForm> = {};
    s.fields.forEach((f) => {
      const v = values[f.name] as unknown as string | undefined;
      if (v == null) return;
      (payload as any)[f.name] = f.type === "date" ? toYYYYMMDD(v) : v;
    });
    ["br_reqstdate", "br_dofb", "br_mahanadate", "br_declaration_date"].forEach(
      (k) => {
        if ((payload as any)[k] != null)
          (payload as any)[k] = toYYYYMMDD((payload as any)[k]);
      }
    );
    return payload;
  };

  const handleSaveTab = async () => {
    if (!validateTab(activeTab)) return;
    try {
      setSaving(true);
      const partial = buildPartialPayloadForTab(activeTab);
      await _manageBhikku({
        action: "UPDATE",
        payload: { br_regn: editId, data: partial },
      } as any);
      toast.success(`Saved "${stepTitle}"`, { autoClose: 1200 });
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : "Failed to save. Please try again.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (
      !window.confirm(
        "Approve this registration? This action may be irreversible."
      )
    )
      return;
    try {
      setApproving(true);
      await _manageBhikku({
        action: "APPROVE",
        payload: { br_regn: editId },
      } as any);
      toast.success("Approved successfully.", { autoClose: 1200 });
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message
          : "Failed to approve. Please try again.";
      toast.error(msg);
    } finally {
      setApproving(false);
    }
  };

  const [display, setDisplay] = useState<{
    br_viharadhipathi?: string;
    br_mahanayaka_name?: string;
    br_mahanayaka_address?: string;
    br_mahanaacharyacd?: string;
    br_mahanatemple?: string;
    br_robing_after_residence_temple?: string;
    br_robing_tutor_residence?: string;
    br_residence_at_declaration?: string;
    br_cat?: string;
    br_currstat?: string;
    br_nikaya?: string;
    br_parshawaya?: string;
  }>({});

  const nikayaData = STATIC_NIKAYA_DATA;
  const findNikayaByCode = useCallback(
    (code?: string | null) =>
      nikayaData.find((n) => n.nikaya.code === (code ?? "")),
    [nikayaData]
  );
  const parshawaOptions = useCallback(
    (nikayaCode?: string | null) =>
      findNikayaByCode(nikayaCode)?.parshawayas ?? [],
    [findNikayaByCode]
  );

  const onPickNikaya = (code: string) => {
    const item = findNikayaByCode(code);
    handleInputChange("br_nikaya", code);
    setDisplay((d) => ({
      ...d,
      br_nikaya: item ? `${item.nikaya.name} — ${item.nikaya.code}` : code,
    }));

    const autoName = item?.main_bhikku?.mahananame ?? "";
    const autoAddr = item?.main_bhikku?.address ?? "";
    const autoParshaFromMain = item?.main_bhikku?.parshawaya ?? "";

    handleSetMany({
      br_mahanayaka_name: autoName,
      br_mahanayaka_address: autoAddr,
      br_parshawaya: parshawaOptions(code).some(
        (p) => p.code === autoParshaFromMain
      )
        ? autoParshaFromMain
        : "",
    });

    if (autoParshaFromMain) {
      const p = parshawaOptions(code).find(
        (x) => x.code === autoParshaFromMain
      );
      setDisplay((d) => ({
        ...d,
        br_parshawaya: p ? `${p.name} — ${p.code}` : "",
      }));
    } else {
      setDisplay((d) => ({ ...d, br_parshawaya: "" }));
    }
  };

  const onPickParshawa = (code: string) => {
    handleInputChange("br_parshawaya", code);
    const nikaya = findNikayaByCode(values.br_nikaya);
    const p = nikaya?.parshawayas.find((x) => x.code === code);
    setDisplay((d) => ({
      ...d,
      br_parshawaya: p ? `${p.name} - ${p.code}` : code,
    }));
  };

  // Normalize API -> form/display (existing)
  const normalizeApi = useCallback((api: any) => {
    const s = (v: unknown) => (v == null ? "" : String(v));

    const br_currstat_code = s(api?.br_currstat?.st_statcd);
    const br_currstat_disp = br_currstat_code
      ? `${s(api?.br_currstat?.st_descr)} - ${br_currstat_code}`
      : "";

    const br_cat_code = s(api?.br_cat?.cc_code || api?.br_cat);
    const br_cat_disp = br_cat_code
      ? `${s(api?.br_cat?.cc_catogry || "")} - ${br_cat_code}`
      : "";

    const nik_code = s(api?.br_nikaya?.code || api?.br_nikaya);
    const nik_disp = api?.br_nikaya?.name
      ? `${s(api?.br_nikaya?.name)} — ${nik_code}`
      : nik_code;

    const parsha_code = s(api?.br_parshawaya?.code || api?.br_parshawaya);
    const parsha_disp = api?.br_parshawaya?.name
      ? `${s(api?.br_parshawaya?.name)} — ${parsha_code}`
      : parsha_code;

    const maha_trn = s(api?.br_mahanatemple?.vh_trn || api?.br_mahanatemple);
    const maha_disp = api?.br_mahanatemple?.vh_vname
      ? `${s(api?.br_mahanatemple?.vh_vname)} - ${maha_trn}`
      : maha_trn;

    const rob_after_trn = s(
      api?.br_robing_after_residence_temple?.vh_trn ||
        api?.br_robing_after_residence_temple
    );
    const rob_after_disp = api?.br_robing_after_residence_temple?.vh_vname
      ? `${s(api?.br_robing_after_residence_temple?.vh_vname)} — ${rob_after_trn}`
      : rob_after_trn;

    const tutor_regn = s(
      api?.br_mahanaacharyacd?.br_regn || api?.br_mahanaacharyacd
    );
    const tutor_disp = api?.br_mahanaacharyacd?.br_mahananame
      ? `${s(api?.br_mahanaacharyacd?.br_mahananame)} — ${tutor_regn}`
      : tutor_regn;

    const rob_tutor_trn = s(
      api?.br_robing_tutor_residence?.vh_trn || api?.br_robing_tutor_residence
    );
    const rob_tutor_disp = api?.br_robing_tutor_residence?.vh_vname
      ? `${s(api?.br_robing_tutor_residence?.vh_vname)} - ${rob_tutor_trn}`
      : rob_tutor_trn;

    const viharadhipathi_regn = s(
      api?.br_viharadhipathi?.br_regn || api?.br_viharadhipathi
    );
    const viharadhipathi_name = s(
      api?.br_viharadhipathi?.br_mahananame || ""
    );
    const viharadhipathi_disp = viharadhipathi_name
      ? viharadhipathi_regn
        ? `${viharadhipathi_name} - ${viharadhipathi_regn}`
        : viharadhipathi_name
      : viharadhipathi_regn;

    const province_code = s(
      api?.br_province?.cp_code ||
        api?.br_province?.code ||
        (typeof api?.br_province === "string" ? api?.br_province : "")
    );
    const district_code = s(
      api?.br_district?.dd_dcode ||
        api?.br_district?.code ||
        (typeof api?.br_district === "string" ? api?.br_district : "")
    );
    const division_code = s(
      api?.br_division?.dv_dvcode ||
        api?.br_division?.code ||
        (typeof api?.br_division === "string" ? api?.br_division : "")
    );
    const gn_code = s(
      api?.br_gndiv?.gn_gnc || api?.br_gndiv?.gn_code || api?.br_gndiv
    );

    const formPatch: Partial<BhikkhuForm> = {
      br_cat: (br_cat_code as any) || NOVICE_CATEGORY_CODE,
      br_reqstdate: toYYYYMMDD(s(api?.br_reqstdate)),
      br_dofb: toYYYYMMDD(s(api?.br_dofb)),
      br_gihiname: s(api?.br_gihiname),
      br_fathrname: s(api?.br_fathrname),
      br_email: s(api?.br_email),
      br_mobile: s(api?.br_mobile),
      br_fathrsaddrs: s(api?.br_fathrsaddrs),
      br_fathrsmobile: s(api?.br_fathrsmobile),

      br_birthpls: s(api?.br_birthpls),
      br_province: province_code,
      br_district: district_code,
      br_korale: s(api?.br_korale),
      br_pattu: s(api?.br_pattu),
      br_division: division_code,
      br_vilage: s(api?.br_vilage),
      br_gndiv: gn_code,

      br_viharadhipathi: viharadhipathi_regn,
      br_nikaya: nik_code,
      br_parshawaya: parsha_code,
      br_mahanayaka_name: s(api?.br_mahanayaka_name || ""),
      br_mahanayaka_address: s(api?.br_mahanayaka_address || ""),

      br_currstat: br_currstat_code,
      br_residence_at_declaration: s(api?.br_residence_at_declaration || ""),
      br_declaration_date: toYYYYMMDD(s(api?.br_declaration_date)),
      br_remarks: s(api?.br_remarks),

      br_mahanadate: toYYYYMMDD(s(api?.br_mahanadate)),
      br_mahananame: s(api?.br_mahananame),
      br_mahanaacharyacd: tutor_regn,
      br_robing_tutor_residence: rob_tutor_trn,

      br_mahanatemple: maha_trn,
      br_robing_after_residence_temple: rob_after_trn,
    };

    const displayPatch = {
      br_currstat: br_currstat_disp,
      br_cat: br_cat_disp,
      br_nikaya: nik_disp,
      br_parshawaya: parsha_disp,
      br_mahanatemple: maha_disp,
      br_robing_after_residence_temple: rob_after_disp,
      br_robing_tutor_residence: rob_tutor_disp,
      br_mahanaacharyacd: tutor_disp,
      br_residence_at_declaration: s(api?.br_residence_at_declaration || ""),
      br_mahanayaka_name: s(api?.br_mahanayaka_name || ""),
      br_mahanayaka_address: s(api?.br_mahanayaka_address || ""),
      br_viharadhipathi: viharadhipathi_disp,
    };

    return { formPatch, displayPatch };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await _manageBhikku({
          action: "READ_ONE",
          payload: { br_regn: editId },
        } as any);
        const api = (res as any)?.data?.data ?? {};
        const { formPatch, displayPatch } = normalizeApi(api);
        if (cancelled) return;

        handleSetMany(formPatch);
        setDisplay((d) => ({ ...d, ...displayPatch }));

        const certificateNumber = String(api?.br_regn ?? "");
        const certificateUrl = certificateNumber
          ? `${CERTIFICATE_URL_BASE}/${encodeURIComponent(certificateNumber)}`
          : "";
        setCertificateMeta({ number: certificateNumber, url: certificateUrl });

        if (formPatch.br_nikaya && formPatch.br_parshawaya) {
          const p = parshawaOptions(formPatch.br_nikaya).find(
            (x) => x.code === formPatch.br_parshawaya
          );
          if (p)
            setDisplay((dd) => ({
              ...dd,
              br_parshawaya: `${p.name} - ${p.code}`,
            }));
        }
      } catch (e: any) {
        toast.error(e?.message || "Failed to load record.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editId, normalizeApi, parshawaOptions]);

  const gridCols =
    stepTitle === "Birth Location" ? "md:grid-cols-3" : "md:grid-cols-2";
  const certificateNumberLabel =
    certificateMeta.number || "Pending assignment";
  const certificateUrlLabel =
    certificateMeta.url || "Not assigned yet";
  const certificateQrValue = certificateMeta.url || SAMPLE_CERT_URL;
  const hasCertificateUrl = Boolean(certificateMeta.url);
  const handlePrintCertificate = () => {
    window.print();
    setShowUploadModal(true);
  };

  const handleScanFileChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    setScannedFile(file ?? null);
  };

  const fileToBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result === "string") resolve(result.split(",")[1] ?? "");
        else reject(new Error("Failed to read file"));
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleUploadScannedCertificate = async () => {
    if (!scannedFile) {
      toast.error("Please choose the scanned certificate image.");
      return;
    }
    try {
      setUploadingScan(true);
      const base64 = await fileToBase64(scannedFile);
      await _manageBhikku({
        action: "CERTIFICATES_UPLOAD_SCAN",
        payload: {
          br_regn: editId,
          file_name: scannedFile.name,
          file_content: base64,
        },
      } as any);
      toast.success("Scan uploaded successfully.");
      setShowUploadModal(false);
      setScannedFile(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to upload scan.");
    } finally {
      setUploadingScan(false);
    }
  };
  const handleCloseUploadModal = () => {
    setShowUploadModal(false);
    setScannedFile(null);
  };

  return (
    <div className="w-full min-h-screen bg-gray-50">
      <TopBar onMenuClick={() => setSidebarOpen((v) => !v)} />
      <Sidebar isOpen={sidebarOpen} />
      <div
        className={`transition-all duration-300 pt-16 ${
          sidebarOpen ? "ml-64" : "ml-0"
        }`}
      >
        <main className="p-2 mb-20">
          <div className="w-full">
            <div className="bg-white shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-6 md:px-10 py-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-white mb-1">
                      Update Registration
                    </h1>
                    <p className="text-slate-300 text-sm">Editing: {editId}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleApprove}
                      disabled={loading || saving || approving}
                      className={`px-4 py-2 rounded-lg font-medium transition-all
                        ${
                          loading || saving || approving
                            ? "bg-green-700/60 text-white cursor-not-allowed"
                            : "bg-green-600 text-white hover:bg-green-700"
                        }`}
                      aria-label="Approve registration"
                      title="Approve registration"
                    >
                      {approving ? "Approving…" : "Approve"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="px-4 md:px-10 py-6" ref={sectionRef}>
                <Tabs
                  tabs={steps.map((s) => ({
                    id: String(s.id),
                    label: s.title,
                  }))}
                  value={String(activeTab)}
                  onChange={(id) => {
                    setActiveTab(Number(id));
                    scrollTop();
                  }}
                  contentClassName="pt-6"
                  renderContent={() => (
                    <>
                      {loading ? (
                        <div className="p-6 text-slate-600">
                          Loading record…
                        </div>
                      ) : (
                        <div className="min-h-[360px]">
                          <h2 className="text-xl font-bold text-slate-800 mb-5">
                            {stepTitle}
                          </h2>

                          {isCertificatesTab ? (
                            <div className="space-y-6">
                              <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white/80 p-6 shadow">
                                <div className="flex flex-col gap-2 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
                                  <div>
                                    <p className="text-xs uppercase tracking-[0.5em] text-slate-400">
                                      Certificate number
                                    </p>
                                    <p className="text-2xl font-semibold text-slate-900">
                                      {certificateNumberLabel}
                                    </p>
                                    <p className="break-all text-slate-500">
                                      {certificateUrlLabel}
                                    </p>
                                  </div>
                                  <button
                                    onClick={handlePrintCertificate}
                                    className="inline-flex items-center justify-center rounded-full bg-slate-800 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-400"
                                  >
                                    Print QR on Certificate
                                  </button>
                                </div>
                                <p className="text-xs text-slate-500">
                                  Insert the pre-printed legal-size certificate into the printer.
                                  Only the QR code positioned at the bottom-right corner of the sheet will be printed.
                                </p>
                              </div>

                                <div className="flex justify-center">
                                  <div
                                    id="certificate-print-area"
                                    ref={certificatePaperRef}
                                    className="relative bg-white"
                                    style={{ width: "8.5in", height: "14in" }}
                                  >
                                  <div className="absolute inset-0 pointer-events-none" />
                                  <div className="absolute bottom-20 right-16">
                                    <div className="rounded-lg border border-slate-200 bg-white p-2">
                                      <QRCode
                                        value={certificateQrValue}
                                        size={80}
                                        className="h-20 w-20"
                                      />
                                    </div>
                                  </div>
                                    </div>
                                  </div>

                              <style>{`
                                @media print {
                                  @page {
                                    margin: 0;
                                  }
                                  body {
                                    margin: 0 !important;
                                    padding: 0 !important;
                                  }
                                  body * {
                                    visibility: hidden;
                                    box-shadow: none !important;
                                  }
                                  #certificate-print-area,
                                  #certificate-print-area * {
                                    visibility: visible;
                                  }
                                  #certificate-print-area {
                                    position: absolute;
                                    left: 0;
                                    top: 0;
                                    right: 0;
                                    margin: 0 auto;
                                    box-shadow: none !important;
                                  }
                                }
                              `}</style>
                            </div>
                          ) : (
                            <>
                              <div
                                className={`grid grid-cols-1 ${gridCols} gap-5`}
                              >
                                {current.fields.map((f) => {
                                  const id = String(f.name);
                                  const val =
                                    (values[f.name] as unknown as string) ?? "";
                                  const err = errors[f.name];

                                  if (id === "br_province") {
                                    const selection = {
                                      provinceCode:
                                        (values.br_province as string) ||
                                        undefined,
                                      districtCode:
                                        (values.br_district as string) ||
                                        undefined,
                                      divisionCode:
                                        (values.br_division as string) ||
                                        undefined,
                                      gnCode:
                                        (values.br_gndiv as string) ||
                                        undefined,
                                    };
                                    return (
                                      <div
                                        key={id}
                                        className={
                                          stepTitle === "Birth Location"
                                            ? "md:col-span-3"
                                            : "md:col-span-2"
                                        }
                                      >
                                        <LocationPicker
                                          value={selection}
                                          onChange={(sel) => {
                                            handleSetMany({
                                              br_province:
                                                sel.provinceCode ?? "",
                                              br_district:
                                                sel.districtCode ?? "",
                                              br_division:
                                                sel.divisionCode ?? "",
                                              br_gndiv: sel.gnCode ?? "",
                                            });
                                          }}
                                          required
                                        />
                                        {err ? (
                                          <p className="mt-1 text-sm text-red-600">
                                            {err}
                                          </p>
                                        ) : null}
                                      </div>
                                    );
                                  }

                                  if (id === "br_birthpls") {
                                    return (
                                      <div
                                        key={id}
                                        className={
                                          stepTitle === "Birth Location"
                                            ? "md:col-span-3"
                                            : ""
                                        }
                                      >
                                        <label
                                          htmlFor={id}
                                          className="block text-sm font-medium text-slate-700 mb-2"
                                        >
                                          {f.label}
                                        </label>
                                        <input
                                          id={id}
                                          type="text"
                                          value={val}
                                          onChange={(e) =>
                                            handleInputChange(
                                              f.name,
                                              e.target.value
                                            )
                                          }
                                          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                                        />
                                        {err ? (
                                          <p className="mt-1 text-sm text-red-600">
                                            {err}
                                          </p>
                                        ) : null}
                                      </div>
                                    );
                                  }

                                  if (id === "br_viharadhipathi") {
                                    return (
                                      <div key={id}>
                                        <BhikkhuAutocomplete
                                          id={id}
                                          label={f.label}
                                          required={!!f.rules?.required}
                                          placeholder="Search and pick — saves REGN"
                                          storeRegn
                                          initialDisplay={
                                            display.br_viharadhipathi ?? ""
                                          }
                                          onPick={({ regn, display: disp }) => {
                                            handleInputChange(
                                              "br_viharadhipathi",
                                              regn ?? ""
                                            );
                                            setDisplay((d) => ({
                                              ...d,
                                              br_viharadhipathi: disp,
                                            }));
                                          }}
                                        />
                                        {err ? (
                                          <p className="mt-1 text-sm text-red-600">
                                            {err}
                                          </p>
                                        ) : null}
                                      </div>
                                    );
                                  }

                                  if (id === "br_nikaya") {
                                    return (
                                      <div key={id}>
                                        <label
                                          htmlFor={id}
                                          className="block text-sm font-medium text-slate-700 mb-2"
                                        >
                                          {f.label}
                                        </label>
                                        <select
                                          id={id}
                                          value={values.br_nikaya ?? ""}
                                          onChange={(e) =>
                                            onPickNikaya(e.target.value)
                                          }
                                          required={!!f.rules?.required}
                                          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                                        >
                                          <option value="">
                                            Select Nikaya
                                          </option>
                                          {STATIC_NIKAYA_DATA.map((n) => (
                                            <option
                                              key={n.nikaya.code}
                                              value={n.nikaya.code}
                                            >
                                              {n.nikaya.name} —{" "}
                                              {n.nikaya.code}
                                            </option>
                                          ))}
                                        </select>
                                        {err ? (
                                          <p className="mt-1 text-sm text-red-600">
                                            {err}
                                          </p>
                                        ) : null}
                                      </div>
                                    );
                                  }

                                  if (id === "br_parshawaya") {
                                    const options = parshawaOptions(
                                      values.br_nikaya
                                    );
                                    return (
                                      <div key={id}>
                                        <label
                                          htmlFor={id}
                                          className="block text-sm font-medium text-slate-700 mb-2"
                                        >
                                          {f.label}
                                        </label>
                                        <select
                                          id={id}
                                          value={values.br_parshawaya ?? ""}
                                          onChange={(e) =>
                                            onPickParshawa(e.target.value)
                                          }
                                          required={!!f.rules?.required}
                                          disabled={
                                            !values.br_nikaya ||
                                            options.length === 0
                                          }
                                          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all disabled:bg-slate-100"
                                        >
                                          <option value="">
                                            {values.br_nikaya
                                              ? "Select Chapter"
                                              : "Select Nikaya first"}
                                          </option>
                                          {options.map((p) => (
                                            <option
                                              key={p.code}
                                              value={p.code}
                                            >
                                              {p.name} — {p.code}
                                            </option>
                                          ))}
                                        </select>
                                        {err ? (
                                          <p className="mt-1 text-sm text-red-600">
                                            {err}
                                          </p>
                                        ) : null}
                                      </div>
                                    );
                                  }

                                  if (id === "br_mahanayaka_name") {
                                    return (
                                      <div key={id} className="grid grid-cols-1">
                                        <label
                                          htmlFor={id}
                                          className="block text-sm font-medium text-slate-700 mb-2"
                                        >
                                          {f.label}
                                        </label>
                                        <input
                                          id={id}
                                          type="text"
                                          value={val}
                                          onChange={(e) =>
                                            handleInputChange(
                                              f.name,
                                              e.target.value
                                            )
                                          }
                                          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                                          placeholder="Auto-filled from Nikaya, editable…"
                                        />
                                        {err ? (
                                          <p className="mt-1 text-sm text-red-600">
                                            {err}
                                          </p>
                                        ) : null}
                                      </div>
                                    );
                                  }

                                  if (id === "br_mahanaacharyacd") {
                                    return (
                                      <div key={id}>
                                        <BhikkhuAutocomplete
                                          id={id}
                                          label={f.label}
                                          required={!!f.rules?.required}
                                          placeholder="Search and pick — saves REGN"
                                          storeRegn
                                          initialDisplay={
                                            display.br_mahanaacharyacd ?? ""
                                          }
                                          onPick={({ regn, display: disp }) => {
                                            handleInputChange(
                                              "br_mahanaacharyacd",
                                              regn ?? ""
                                            );
                                            setDisplay((d) => ({
                                              ...d,
                                              br_mahanaacharyacd: disp,
                                            }));
                                          }}
                                        />
                                        {err ? (
                                          <p className="mt-1 text-sm text-red-600">
                                            {err}
                                          </p>
                                        ) : null}
                                      </div>
                                    );
                                  }

                                  if (id === "br_robing_tutor_residence") {
                                    return (
                                      <div key={id}>
                                        <TempleAutocomplete
                                          id={id}
                                          label={f.label}
                                          required={!!f.rules?.required}
                                          placeholder="Search temple — saves TRN"
                                          storeTrn
                                          initialDisplay={
                                            display.br_robing_tutor_residence ??
                                            ""
                                          }
                                          onPick={({ trn, display: disp }) => {
                                            handleInputChange(
                                              "br_robing_tutor_residence",
                                              trn ?? ""
                                            );
                                            setDisplay((d) => ({
                                              ...d,
                                              br_robing_tutor_residence: disp,
                                            }));
                                          }}
                                        />
                                        {err ? (
                                          <p className="mt-1 text-sm text-red-600">
                                            {err}
                                          </p>
                                        ) : null}
                                      </div>
                                    );
                                  }

                                  if (id === "br_mahanatemple") {
                                    return (
                                      <div key={id}>
                                        <TempleAutocomplete
                                          id={id}
                                          label={f.label}
                                          required={!!f.rules?.required}
                                          placeholder="Search temple — saves TRN"
                                          storeTrn
                                          initialDisplay={
                                            display.br_mahanatemple ?? ""
                                          }
                                          onPick={({ trn, display: disp }) => {
                                            handleInputChange(
                                              "br_mahanatemple",
                                              trn ?? ""
                                            );
                                            setDisplay((d) => ({
                                              ...d,
                                              br_mahanatemple: disp,
                                            }));
                                          }}
                                        />
                                        {err ? (
                                          <p className="mt-1 text-sm text-red-600">
                                            {err}
                                          </p>
                                        ) : null}
                                      </div>
                                    );
                                  }

                                  if (id === "br_robing_after_residence_temple") {
                                    return (
                                      <div key={id}>
                                        <TempleAutocomplete
                                          id={id}
                                          label={f.label}
                                          required={!!f.rules?.required}
                                          placeholder="Search temple — saves TRN"
                                          storeTrn
                                          initialDisplay={
                                            display.br_robing_after_residence_temple ??
                                            ""
                                          }
                                          onPick={({ trn, display: disp }) => {
                                            handleInputChange(
                                              "br_robing_after_residence_temple",
                                              trn ?? ""
                                            );
                                            setDisplay((d) => ({
                                              ...d,
                                              br_robing_after_residence_temple:
                                                disp,
                                            }));
                                          }}
                                        />
                                        {err ? (
                                          <p className="mt-1 text-sm text-red-600">
                                            {err}
                                          </p>
                                        ) : null}
                                      </div>
                                    );
                                  }

                                  if (id === "br_cat") {
                                    return (
                                      <div key={id}>
                                        <BhikkhuCategorySelect
                                          id={id}
                                          label={f.label}
                                          required={!!f.rules?.required}
                                          value={
                                            values.br_cat ?? NOVICE_CATEGORY_CODE
                                          }
                                          disabled
                                        />
                                        {err ? (
                                          <p className="mt-1 text-sm text-red-600">
                                            {err}
                                          </p>
                                        ) : null}
                                      </div>
                                    );
                                  }

                                  if (id === "br_currstat") {
                                    return (
                                      <div key={id}>
                                        <BhikkhuStatusSelect
                                          id={id}
                                          label={f.label}
                                          required={!!f.rules?.required}
                                          initialCode={values.br_currstat ?? ""}
                                          onPick={({
                                            code,
                                            display: disp,
                                          }) => {
                                            handleInputChange(
                                              "br_currstat",
                                              code
                                            );
                                            setDisplay((d) => ({
                                              ...d,
                                              br_currstat: disp,
                                            }));
                                          }}
                                        />
                                        {err ? (
                                          <p className="mt-1 text-sm text-red-600">
                                            {err}
                                          </p>
                                        ) : null}
                                      </div>
                                    );
                                  }

                                  if (id === "br_residence_at_declaration") {
                                    return (
                                      <div key={id}>
                                        <TempleAutocompleteAddress
                                          id={id}
                                          label={f.label}
                                          required={!!f.rules?.required}
                                          placeholder="Type any address or pick a temple address…"
                                          initialDisplay={
                                            display.br_residence_at_declaration ??
                                            values.br_residence_at_declaration ??
                                            ""
                                          }
                                          onPick={({
                                            address,
                                            display: disp,
                                          }) => {
                                            handleInputChange(
                                              "br_residence_at_declaration",
                                              address ?? ""
                                            );
                                            setDisplay((d) => ({
                                              ...d,
                                              br_residence_at_declaration: disp,
                                            }));
                                          }}
                                        />
                                        {err ? (
                                          <p className="mt-1 text-sm text-red-600">
                                            {err}
                                          </p>
                                        ) : null}
                                      </div>
                                    );
                                  }

                                  if (f.type === "textarea") {
                                    const idStr = String(f.name);
                                    const span2 =
                                      idStr === "br_mahanayaka_address" ||
                                      idStr === "br_remarks";
                                    const spanClass =
                                      idStr === "br_remarks"
                                        ? gridCols.includes("md:grid-cols-3")
                                          ? "md:col-span-3"
                                          : "md:col-span-2"
                                        : "";
                                    return (
                                      <div
                                        key={idStr}
                                        className={span2 ? spanClass : ""}
                                      >
                                        <label
                                          htmlFor={idStr}
                                          className="block text-sm font-medium text-slate-700 mb-2"
                                        >
                                          {f.label}
                                        </label>
                                        <textarea
                                          id={idStr}
                                          value={val}
                                          rows={f.rows ?? 4}
                                          onChange={(e) =>
                                            handleInputChange(
                                              f.name,
                                              e.target.value
                                            )
                                          }
                                          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all resize-none"
                                          placeholder={
                                            f.placeholder ??
                                            (idStr === "br_mahanayaka_address"
                                              ? "Auto-filled from Nikaya, editable…"
                                              : undefined)
                                          }
                                        />
                                        {err ? (
                                          <p className="mt-1 text-sm text-red-600">
                                            {err}
                                          </p>
                                        ) : null}
                                      </div>
                                    );
                                  }

                                  if (f.type === "date") {
                                    return (
                                      <DateField
                                        key={id}
                                        id={id}
                                        label={f.label}
                                        value={val}
                                        required={!!f.rules?.required}
                                        placeholder="YYYY-MM-DD"
                                        error={err}
                                        onChange={(v) =>
                                          handleInputChange(f.name, v)
                                        }
                                      />
                                    );
                                  }

                                  if (
                                    id === "br_district" ||
                                    id === "br_division" ||
                                    id === "br_gndiv"
                                  )
                                    return null;

                                  return (
                                    <div key={id} className="grid grid-cols-1">
                                      <label
                                        htmlFor={id}
                                        className="block text-sm font-medium text-slate-700 mb-2"
                                      >
                                        {f.label}
                                      </label>
                                      <input
                                        id={id}
                                        type={f.type}
                                        value={val}
                                        onChange={(e) =>
                                          handleInputChange(
                                            f.name,
                                            e.target.value
                                          )
                                        }
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                                        placeholder={f.placeholder}
                                      />
                                      {err ? (
                                        <p className="mt-1 text-sm text-red-600">
                                          {err}
                                        </p>
                                      ) : null}
                                    </div>
                                  );
                                })}
                              </div>

                              <div className="flex justify-end mt-8 pt-6 border-t border-slate-200">
                                <button
                                  onClick={handleSaveTab}
                                  disabled={saving || loading || approving}
                                  className="flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-700 text-white rounded-lg font-medium hover:bg-slate-800 transition-all disabled:opacity-70"
                                >
                                  {saving ? "Saving…" : "Save this section"}
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </>
                  )}
                />
              </div>
            </div>
          </div>
        </main>
        <FooterBar />
      </div>

      {showUploadModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleCloseUploadModal}
          />
          <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Upload Scanned Certificate
                </p>
                <p className="text-xs text-slate-500">
                  Attach the scanned image/PDF after printing.
                </p>
              </div>
              <button
                aria-label="Close upload"
                onClick={handleCloseUploadModal}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4 px-6 py-6">
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 p-6 text-center text-sm text-slate-500">
                <p>
                  Drag & drop or click to select the scanned certificate file.
                </p>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="mt-4 block w-full text-sm text-slate-700"
                  onChange={handleScanFileChange}
                />
                {scannedFile ? (
                  <p className="mt-2 text-xs text-slate-600">
                    Selected: {scannedFile.name}
                  </p>
                ) : null}
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  className="rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                  onClick={handleCloseUploadModal}
                  disabled={uploadingScan}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="rounded-full bg-slate-900 px-6 py-2 text-sm font-semibold text-white hover:bg-slate-950 disabled:cursor-not-allowed disabled:bg-slate-600"
                  onClick={handleUploadScannedCertificate}
                  disabled={uploadingScan || !scannedFile}
                >
                  {uploadingScan ? "Uploading…" : "Upload Scan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <ToastContainer
        position="top-right"
        newestOnTop
        closeOnClick
        pauseOnHover
      />
    </div>
  );
}

export default function ManageBhikkhuPage(props: PageProps) {
  return (
    <Suspense fallback={<div className="p-8 text-slate-600">Loading…</div>}>
      <ManageBhikkhuInner {...props} />
    </Suspense>
  );
}

