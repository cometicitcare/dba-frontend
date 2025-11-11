// app/multi-step-form/page.tsx
'use client';

import { useMemo, useRef, useState } from 'react';
import { ChevronRight, ChevronLeft, Check } from 'lucide-react';

interface FormData {
  // Step 1: Personal
  br_reqstdate: string;
  br_gihiname: string;
  br_dofb: string;
  br_fathrname: string;
  br_email: string;
  br_mobile: string;
  br_fathrsaddrs: string;
  br_fathrsmobile: string;

  // Step 2: Birth Location
  br_birthpls: string;
  br_province: string;
  br_district: string;
  br_korale: string;
  br_pattu: string;
  br_division: string;
  br_vilage: string;
  br_gndiv: string;

  // Step 3: Temple (new)
  br_viharadhipathi_name: string;
  br_nikaya_name: string;
  br_chapter_name: string;
  br_mahanayaka_name: string;
  br_mahanayaka_address: string;

  // Step 5: Additional Details (includes added fields)
  br_cat: string;
  br_currstat: string;
  br_residence_at_declaration: string;
  br_declaration_date: string;
  br_remarks: string;

  // Step 4: Robing Informations (new)
  br_robing_date: string;
  br_robing_assumed_name: string;
  br_robing_tutor_name: string;
  br_robing_tutor_residence: string;
  br_robing_place_temple: string;
  br_robing_after_residence_temple: string;
}

const steps = [
  {
    id: 1,
    title: 'Personal Information',
    fields: [
      'br_reqstdate',
      'br_gihiname',
      'br_dofb',
      'br_fathrname',
      'br_email',
      'br_mobile',
      'br_fathrsaddrs',
      'br_fathrsmobile',
    ] as (keyof FormData)[],
  },
  {
    id: 2,
    title: 'Birth Location',
    fields: [
      'br_birthpls',
      'br_province',
      'br_district',
      'br_korale',
      'br_pattu',
      'br_division',
      'br_vilage',
      'br_gndiv',
    ] as (keyof FormData)[],
  },
  {
    id: 3,
    title: 'Temple Information',
    fields: [
      'br_viharadhipathi_name',
      'br_nikaya_name',
      'br_chapter_name',
      'br_mahanayaka_name',
      'br_mahanayaka_address',
    ] as (keyof FormData)[],
  },
  {
    id: 4,
    title: 'Robing Informations',
    fields: [
      'br_robing_date',
      'br_robing_assumed_name',
      'br_robing_tutor_name',
      'br_robing_tutor_residence',
      'br_robing_place_temple',
      'br_robing_after_residence_temple',
    ] as (keyof FormData)[],
  },
  {
    id: 5,
    title: 'Additional Details',
    fields: [
      'br_cat',
      'br_currstat',
      'br_residence_at_declaration',
      'br_declaration_date',
      'br_remarks',
    ] as (keyof FormData)[],
  },
  {
    id: 6,
    title: 'Review & Confirm',
    fields: [] as (keyof FormData)[], // why: no validation in review
  },
];

const fieldLabels: Record<keyof FormData, string> = {
  br_reqstdate: 'Request Date',
  br_gihiname: 'Full Name (Gihi Name)',
  br_dofb: 'Date of Birth',
  br_fathrname: "Father's Name",
  br_email: 'Email Address',
  br_mobile: 'Mobile Number',
  br_fathrsaddrs: "Father's Address",
  br_fathrsmobile: "Father's Mobile",

  br_birthpls: 'Birth Place',
  br_province: 'Province',
  br_district: 'District',
  br_korale: 'Korale',
  br_pattu: 'Pattu',
  br_division: 'Division',
  br_vilage: 'Village',
  br_gndiv: 'GN Division',

  br_viharadhipathi_name: 'Name of Viharadhipathi of temple of residence',
  br_nikaya_name: 'Name of Nikaya',
  br_chapter_name: 'Name of Chapter',
  br_mahanayaka_name: 'Name of Mahanayaka Thera or Nayaka Thero of the Nikaya',
  br_mahanayaka_address: 'Full postal address of the Mahanayaka Thera or Nayaka Theri of the Nikaya',

  br_cat: 'Category',
  br_currstat: 'Current Status',
  br_residence_at_declaration: 'Residence at time of declaration',
  br_declaration_date: 'Date of making the declaration',
  br_remarks: 'Remarks',

  br_robing_date: 'Date of robing',
  br_robing_assumed_name: 'Name assumed at robing',
  br_robing_tutor_name: 'Name of robing tutor',
  br_robing_tutor_residence: 'Name of robing tutor’s residence',
  br_robing_place_temple: 'Temple where robing took place',
  br_robing_after_residence_temple: 'Temple of residence after robing',
};

type Errors = Partial<Record<keyof FormData, string>>;

export default function MultiStepForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Partial<FormData>>({});
  const [errors, setErrors] = useState<Errors>({});
  const sectionRef = useRef<HTMLDivElement | null>(null);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const initialData: FormData = {
    // Step 1
    br_reqstdate: today,
    br_gihiname: 'Saman Kumara',
    br_dofb: '1995-05-20',
    br_fathrname: 'Kumara Senanayake',
    br_email: 'saman@example.com',
    br_mobile: '0711234567',
    br_fathrsaddrs: 'No. 12, Temple Rd, Kandy',
    br_fathrsmobile: '0777654321',

    // Step 2
    br_birthpls: 'Kandy',
    br_province: 'Central',
    br_district: 'Kandy',
    br_korale: 'Harispattuwa',
    br_pattu: 'Yatinuwara',
    br_division: 'Gangawata Korale',
    br_vilage: 'Peradeniya',
    br_gndiv: '123A',

    // Step 3
    br_viharadhipathi_name: 'Ven. Viharadhipathi Thera',
    br_nikaya_name: 'Siyam Nikaya',
    br_chapter_name: 'Malwathu Chapter',
    br_mahanayaka_name: 'Most Ven. Mahanayaka Thera',
    br_mahanayaka_address: 'Mahavihara, Sri Dalada Veediya, Kandy, Sri Lanka',

    // Step 5
    br_cat: 'CAT-01',
    br_currstat: 'Active',
    br_residence_at_declaration: 'Asgiriya Maha Viharaya, Kandy',
    br_declaration_date: today,
    br_remarks: 'N/A',

    // Step 4
    br_robing_date: '2010-06-15',
    br_robing_assumed_name: 'Ven. Sumedha',
    br_robing_tutor_name: 'Ven. Dhammika Thera',
    br_robing_tutor_residence: 'Dharmapala Aramaya, Galle',
    br_robing_place_temple: 'Asgiriya Maha Viharaya',
    br_robing_after_residence_temple: 'XYZ Aranya Senasanaya',
  };

  const isPhoneLK = (v: string) => /^0\d{9}$/.test(v.trim()); // why: enforce 10-digit local format
  const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

  function validateField(field: keyof FormData, value: string | undefined, all: Partial<FormData>): string {
    const v = (value ?? '').trim();
    if (!v) return 'Required';
    if (field === 'br_email' && !isEmail(v)) return 'Invalid email';
    if ((field === 'br_mobile' || field === 'br_fathrsmobile') && !isPhoneLK(v))
      return 'Must be 10 digits (e.g., 07XXXXXXXX)';
    if (
      field === 'br_dofb' ||
      field === 'br_reqstdate' ||
      field === 'br_robing_date' ||
      field === 'br_declaration_date'
    ) {
      if (v > today) return 'Date cannot be in the future';
    }
    return '';
  }

  function validateStep(stepId: number): boolean {
    const step = steps.find((s) => s.id === stepId)!;
    const nextErrors: Errors = { ...errors };
    let valid = true;
    for (const f of step.fields) {
      const msg = validateField(f, (formData as any)[f], formData);
      nextErrors[f] = msg;
      if (msg) valid = false;
    }
    setErrors(nextErrors);
    if (!valid) sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return valid;
  }

  function validateAll(): { ok: boolean; firstInvalidStep: number | null } {
    let firstInvalidStep: number | null = null;
    const aggregated: Errors = {};
    for (const step of steps) {
      let stepValid = true;
      for (const f of step.fields) {
        const msg = validateField(f, (formData as any)[f], formData);
        aggregated[f] = msg;
        if (msg) stepValid = false;
      }
      if (!stepValid && firstInvalidStep == null) firstInvalidStep = step.id;
    }
    setErrors(aggregated);
    return { ok: firstInvalidStep == null, firstInvalidStep };
  }

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      const msg = validateField(field, value, next);
      setErrors((e) => ({ ...e, [field]: msg }));
      return next;
    });
  };

  const fillDemo = () => {
    setFormData(initialData);
    setErrors({});
  };

  const handleNext = () => {
    if (currentStep < steps.length && validateStep(currentStep)) setCurrentStep((prev) => prev + 1);
  };

  const handlePrevious = () => {
    if (currentStep > 1) setCurrentStep((prev) => prev - 1);
  };

  const handleSubmit = () => {
    const { ok, firstInvalidStep } = validateAll();
    if (!ok && firstInvalidStep) {
      setCurrentStep(firstInvalidStep);
      sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    console.log('Form submitted:', formData);
    alert('Submitted! Check console for payload.');
  };

  const renderError = (field: keyof FormData) =>
    errors[field] ? <p className="mt-1 text-sm text-red-600">{errors[field]}</p> : null;

  const stepTitle = steps.find((s) => s.id === currentStep)?.title ?? '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-6 md:py-10 px-3 md:px-6">
      <div className="w-full">
        <div className="bg-white shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-6 md:px-10 py-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-white mb-1">Registration Form</h1>
                <p className="text-slate-300 text-sm">Please complete all required information</p>
              </div>
              <button
                type="button"
                onClick={fillDemo}
                className="hidden md:inline-flex items-center gap-2 px-4 py-2 bg-slate-200 text-slate-800 rounded-lg font-medium hover:bg-slate-300 transition-all"
                title="Prefill with demo data"
              >
                Auto-Fill
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <div className="px-4 md:px-10 py-6" ref={sectionRef}>
            {/* Stepper */}
            <div className="flex items-center justify-between mb-8">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-300 ${
                        currentStep > step.id
                          ? 'bg-green-500 text-white'
                          : currentStep === step.id
                          ? 'bg-slate-700 text-white ring-4 ring-slate-200'
                          : 'bg-slate-200 text-slate-400'
                      }`}
                    >
                      {currentStep > step.id ? <Check size={20} /> : step.id}
                    </div>
                    <span
                      className={`text-xs mt-2 font-medium text-center ${
                        currentStep >= step.id ? 'text-slate-700' : 'text-slate-400'
                      }`}
                    >
                      {step.title}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`h-1 flex-1 mx-2 rounded transition-all duration-300 ${
                        currentStep > step.id ? 'bg-green-500' : 'bg-slate-200'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Form sections */}
            <div className="min-h-[400px]">
              <h2 className="text-xl font-bold text-slate-800 mb-6">{stepTitle}</h2>

              {/* Step 1: Personal */}
              {currentStep === 1 && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="br_reqstdate" className="block text-sm font-medium text-slate-700 mb-2">
                        Request Date
                      </label>
                      <input
                        id="br_reqstdate"
                        type="date"
                        value={(formData as FormData).br_reqstdate || ''}
                        onChange={(e) => handleInputChange('br_reqstdate', e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                      />
                      {renderError('br_reqstdate')}
                    </div>
                    <div>
                      <label htmlFor="br_dofb" className="block text-sm font-medium text-slate-700 mb-2">
                        Date of Birth
                      </label>
                      <input
                        id="br_dofb"
                        type="date"
                        value={(formData as FormData).br_dofb || ''}
                        onChange={(e) => handleInputChange('br_dofb', e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                      />
                      {renderError('br_dofb')}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="br_gihiname" className="block text-sm font-medium text-slate-700 mb-2">
                      Full Name (Gihi Name)
                    </label>
                    <input
                      id="br_gihiname"
                      type="text"
                      value={(formData as FormData).br_gihiname || ''}
                      onChange={(e) => handleInputChange('br_gihiname', e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                      placeholder="Enter full name"
                    />
                    {renderError('br_gihiname')}
                  </div>

                  <div>
                    <label htmlFor="br_fathrname" className="block text-sm font-medium text-slate-700 mb-2">
                      Father's Name
                    </label>
                    <input
                      id="br_fathrname"
                      type="text"
                      value={(formData as FormData).br_fathrname || ''}
                      onChange={(e) => handleInputChange('br_fathrname', e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                      placeholder="Enter father's name"
                    />
                    {renderError('br_fathrname')}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="br_email" className="block text-sm font-medium text-slate-700 mb-2">
                        Email Address
                      </label>
                      <input
                        id="br_email"
                        type="email"
                        value={(formData as FormData).br_email || ''}
                        onChange={(e) => handleInputChange('br_email', e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                        placeholder="example@email.com"
                      />
                      {renderError('br_email')}
                    </div>
                    <div>
                      <label htmlFor="br_mobile" className="block text-sm font-medium text-slate-700 mb-2">
                        Mobile Number
                      </label>
                      <input
                        id="br_mobile"
                        type="tel"
                        value={(formData as FormData).br_mobile || ''}
                        onChange={(e) => handleInputChange('br_mobile', e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                        placeholder="07XXXXXXXX"
                      />
                      {renderError('br_mobile')}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="br_fathrsaddrs" className="block text-sm font-medium text-slate-700 mb-2">
                      Father's Address
                    </label>
                    <input
                      id="br_fathrsaddrs"
                      type="text"
                      value={(formData as FormData).br_fathrsaddrs || ''}
                      onChange={(e) => handleInputChange('br_fathrsaddrs', e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                      placeholder="Enter father's address"
                    />
                    {renderError('br_fathrsaddrs')}
                  </div>

                  <div>
                    <label htmlFor="br_fathrsmobile" className="block text-sm font-medium text-slate-700 mb-2">
                      Father's Mobile
                    </label>
                    <input
                      id="br_fathrsmobile"
                      type="tel"
                      value={(formData as FormData).br_fathrsmobile || ''}
                      onChange={(e) => handleInputChange('br_fathrsmobile', e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                      placeholder="07XXXXXXXX"
                    />
                    {renderError('br_fathrsmobile')}
                  </div>
                </div>
              )}

              {/* Step 2: Birth */}
              {currentStep === 2 && (
                <div className="space-y-5">
                  <div>
                    <label htmlFor="br_birthpls" className="block text-sm font-medium text-slate-700 mb-2">
                      Birth Place
                    </label>
                    <input
                      id="br_birthpls"
                      type="text"
                      value={(formData as FormData).br_birthpls || ''}
                      onChange={(e) => handleInputChange('br_birthpls', e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                      placeholder="Enter birth place"
                    />
                    {renderError('br_birthpls')}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="br_province" className="block text-sm font-medium text-slate-700 mb-2">
                        Province
                      </label>
                      <input
                        id="br_province"
                        type="text"
                        value={(formData as FormData).br_province || ''}
                        onChange={(e) => handleInputChange('br_province', e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                        placeholder="Enter province"
                      />
                      {renderError('br_province')}
                    </div>
                    <div>
                      <label htmlFor="br_district" className="block text-sm font-medium text-slate-700 mb-2">
                        District
                      </label>
                      <input
                        id="br_district"
                        type="text"
                        value={(formData as FormData).br_district || ''}
                        onChange={(e) => handleInputChange('br_district', e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                        placeholder="Enter district"
                      />
                      {renderError('br_district')}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="br_korale" className="block text-sm font-medium text-slate-700 mb-2">
                        Korale
                      </label>
                      <input
                        id="br_korale"
                        type="text"
                        value={(formData as FormData).br_korale || ''}
                        onChange={(e) => handleInputChange('br_korale', e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                        placeholder="Enter korale"
                      />
                      {renderError('br_korale')}
                    </div>
                    <div>
                      <label htmlFor="br_pattu" className="block text-sm font-medium text-slate-700 mb-2">
                        Pattu
                      </label>
                      <input
                        id="br_pattu"
                        type="text"
                        value={(formData as FormData).br_pattu || ''}
                        onChange={(e) => handleInputChange('br_pattu', e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                        placeholder="Enter pattu"
                      />
                      {renderError('br_pattu')}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="br_division" className="block text-sm font-medium text-slate-700 mb-2">
                        Division
                      </label>
                      <input
                        id="br_division"
                        type="text"
                        value={(formData as FormData).br_division || ''}
                        onChange={(e) => handleInputChange('br_division', e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                        placeholder="Enter division"
                      />
                      {renderError('br_division')}
                    </div>
                    <div>
                      <label htmlFor="br_vilage" className="block text-sm font-medium text-slate-700 mb-2">
                        Village
                      </label>
                      <input
                        id="br_vilage"
                        type="text"
                        value={(formData as FormData).br_vilage || ''}
                        onChange={(e) => handleInputChange('br_vilage', e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                        placeholder="Enter village"
                      />
                      {renderError('br_vilage')}
                    </div>
                  </div>
                  <div>
                    <label htmlFor="br_gndiv" className="block text-sm font-medium text-slate-700 mb-2">
                      GN Division
                    </label>
                    <input
                      id="br_gndiv"
                      type="text"
                      value={(formData as FormData).br_gndiv || ''}
                      onChange={(e) => handleInputChange('br_gndiv', e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                      placeholder="Enter GN division code"
                    />
                    {renderError('br_gndiv')}
                  </div>
                </div>
              )}

              {/* Step 3: Temple */}
              {currentStep === 3 && (
                <div className="space-y-5">
                  <div>
                    <label htmlFor="br_viharadhipathi_name" className="block text-sm font-medium text-slate-700 mb-2">
                      Name of Viharadhipathi of temple of residence
                    </label>
                    <input
                      id="br_viharadhipathi_name"
                      type="text"
                      value={(formData as FormData).br_viharadhipathi_name || ''}
                      onChange={(e) => handleInputChange('br_viharadhipathi_name', e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                    />
                    {renderError('br_viharadhipathi_name')}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="br_nikaya_name" className="block text-sm font-medium text-slate-700 mb-2">
                        Name of Nikaya
                      </label>
                      <input
                        id="br_nikaya_name"
                        type="text"
                        value={(formData as FormData).br_nikaya_name || ''}
                        onChange={(e) => handleInputChange('br_nikaya_name', e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                      />
                      {renderError('br_nikaya_name')}
                    </div>
                    <div>
                      <label htmlFor="br_chapter_name" className="block text-sm font-medium text-slate-700 mb-2">
                        Name of Chapter
                      </label>
                      <input
                        id="br_chapter_name"
                        type="text"
                        value={(formData as FormData).br_chapter_name || ''}
                        onChange={(e) => handleInputChange('br_chapter_name', e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                      />
                      {renderError('br_chapter_name')}
                    </div>
                  </div>
                  <div>
                    <label htmlFor="br_mahanayaka_name" className="block text-sm font-medium text-slate-700 mb-2">
                      Name of Mahanayaka Thera or Nayaka Thero of the Nikaya
                    </label>
                    <input
                      id="br_mahanayaka_name"
                      type="text"
                      value={(formData as FormData).br_mahanayaka_name || ''}
                      onChange={(e) => handleInputChange('br_mahanayaka_name', e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                    />
                    {renderError('br_mahanayaka_name')}
                  </div>
                  <div>
                    <label htmlFor="br_mahanayaka_address" className="block text sm font-medium text-slate-700 mb-2">
                      Full postal address of the Mahanayaka Thera or Nayaka Theri of the Nikaya
                    </label>
                    <textarea
                      id="br_mahanayaka_address"
                      value={(formData as FormData).br_mahanayaka_address || ''}
                      onChange={(e) => handleInputChange('br_mahanayaka_address', e.target.value)}
                      rows={4}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all resize-none"
                      placeholder="Enter full postal address"
                    />
                    {renderError('br_mahanayaka_address')}
                  </div>
                </div>
              )}

              {/* Step 4: Robing */}
              {currentStep === 4 && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="br_robing_date" className="block text-sm font-medium text-slate-700 mb-2">
                        Date of robing
                      </label>
                      <input
                        id="br_robing_date"
                        type="date"
                        value={(formData as FormData).br_robing_date || ''}
                        onChange={(e) => handleInputChange('br_robing_date', e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                      />
                      {renderError('br_robing_date')}
                    </div>
                    <div>
                      <label htmlFor="br_robing_assumed_name" className="block text-sm font-medium text-slate-700 mb-2">
                        Name assumed at robing
                      </label>
                      <input
                        id="br_robing_assumed_name"
                        type="text"
                        value={(formData as FormData).br_robing_assumed_name || ''}
                        onChange={(e) => handleInputChange('br_robing_assumed_name', e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                      />
                      {renderError('br_robing_assumed_name')}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="br_robing_tutor_name" className="block text-sm font-medium text-slate-700 mb-2">
                      Name of robing tutor
                    </label>
                    <input
                      id="br_robing_tutor_name"
                      type="text"
                      value={(formData as FormData).br_robing_tutor_name || ''}
                      onChange={(e) => handleInputChange('br_robing_tutor_name', e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                    />
                    {renderError('br_robing_tutor_name')}
                  </div>

                  <div>
                    <label htmlFor="br_robing_tutor_residence" className="block text-sm font-medium text-slate-700 mb-2">
                      Name of robing tutor’s residence
                    </label>
                    <input
                      id="br_robing_tutor_residence"
                      type="text"
                      value={(formData as FormData).br_robing_tutor_residence || ''}
                      onChange={(e) => handleInputChange('br_robing_tutor_residence', e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                    />
                    {renderError('br_robing_tutor_residence')}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="br_robing_place_temple" className="block text-sm font-medium text-slate-700 mb-2">
                        Temple where robing took place
                      </label>
                      <input
                        id="br_robing_place_temple"
                        type="text"
                        value={(formData as FormData).br_robing_place_temple || ''}
                        onChange={(e) => handleInputChange('br_robing_place_temple', e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                      />
                      {renderError('br_robing_place_temple')}
                    </div>
                    <div>
                      <label htmlFor="br_robing_after_residence_temple" className="block text-sm font-medium text-slate-700 mb-2">
                        Temple of residence after robing
                      </label>
                      <input
                        id="br_robing_after_residence_temple"
                        type="text"
                        value={(formData as FormData).br_robing_after_residence_temple || ''}
                        onChange={(e) => handleInputChange('br_robing_after_residence_temple', e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                      />
                      {renderError('br_robing_after_residence_temple')}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 5: Additional */}
              {currentStep === 5 && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="br_cat" className="block text-sm font-medium text-slate-700 mb-2">
                        Category
                      </label>
                      <input
                        id="br_cat"
                        type="text"
                        value={(formData as FormData).br_cat || ''}
                        onChange={(e) => handleInputChange('br_cat', e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                        placeholder="Enter category code"
                      />
                      {renderError('br_cat')}
                    </div>
                    <div>
                      <label htmlFor="br_currstat" className="block text-sm font-medium text-slate-700 mb-2">
                        Current Status
                      </label>
                      <input
                        id="br_currstat"
                        type="text"
                        value={(formData as FormData).br_currstat || ''}
                        onChange={(e) => handleInputChange('br_currstat', e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                        placeholder="Enter current status"
                      />
                      {renderError('br_currstat')}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="br_residence_at_declaration" className="block text-sm font-medium text-slate-700 mb-2">
                        Residence at time of declaration
                      </label>
                      <input
                        id="br_residence_at_declaration"
                        type="text"
                        value={(formData as FormData).br_residence_at_declaration || ''}
                        onChange={(e) => handleInputChange('br_residence_at_declaration', e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                        placeholder="Enter residence"
                      />
                      {renderError('br_residence_at_declaration')}
                    </div>
                    <div>
                      <label htmlFor="br_declaration_date" className="block text-sm font-medium text-slate-700 mb-2">
                        Date of making the declaration
                      </label>
                      <input
                        id="br_declaration_date"
                        type="date"
                        value={(formData as FormData).br_declaration_date || ''}
                        onChange={(e) => handleInputChange('br_declaration_date', e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                      />
                      {renderError('br_declaration_date')}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="br_remarks" className="block text-sm font-medium text-slate-700 mb-2">
                      Remarks
                    </label>
                    <textarea
                      id="br_remarks"
                      value={(formData as FormData).br_remarks || ''}
                      onChange={(e) => handleInputChange('br_remarks', e.target.value)}
                      rows={4}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all resize-none"
                      placeholder="Enter any additional remarks"
                    />
                    {renderError('br_remarks')}
                  </div>
                </div>
              )}

              {/* Step 6: Review & Confirm */}
              {currentStep === 6 && (
                <div className="space-y-6">
                  <p className="text-slate-600">
                    Review your details below. Use <span className="font-medium">Edit</span> to jump to a section.
                  </p>

                  {steps
                    .filter((s) => s.id !== 6)
                    .map((s) => (
                      <div key={s.id} className="border border-slate-200 rounded-xl p-4 md:p-5">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-lg font-semibold text-slate-800">{s.title}</h3>
                          <button
                            className="px-3 py-1.5 text-sm bg-slate-200 rounded-lg hover:bg-slate-300"
                            onClick={() => setCurrentStep(s.id)}
                          >
                            Edit
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {s.fields.map((f) => (
                            <div key={f} className="bg-slate-50 rounded-lg p-3">
                              <div className="text-xs text-slate-500">{fieldLabels[f]}</div>
                              <div className="text-sm font-medium text-slate-800 break-words">
                                {(formData as any)[f] || <span className="text-slate-400">—</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="flex flex-col md:flex-row gap-4 md:gap-0 md:justify-between md:items-center mt-8 pt-6 border-t border-slate-200">
              <button
                onClick={handlePrevious}
                disabled={currentStep === 1}
                className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all ${
                  currentStep === 1 ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                <ChevronLeft size={20} />
                Previous
              </button>

              <div className="text-sm text-slate-600 font-medium text-center">
                Step {currentStep} of {steps.length}
              </div>

              {currentStep < steps.length ? (
                <button
                  onClick={handleNext}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-700 text-white rounded-lg font-medium hover:bg-slate-800 transition-all"
                >
                  Next
                  <ChevronRight size={20} />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-all"
                >
                  <Check size={20} />
                  Submit
                </button>
              )}
            </div>

            {/* Mobile Auto-Fill button */}
            <div className="mt-4 md:hidden">
              <button
                type="button"
                onClick={fillDemo}
                className="w-full px-4 py-2.5 bg-slate-200 text-slate-800 rounded-lg font-medium hover:bg-slate-300 transition-all"
                title="Prefill with demo data"
              >
                Auto-Fill Demo Data
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
