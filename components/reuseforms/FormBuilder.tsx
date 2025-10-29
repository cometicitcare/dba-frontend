"use client";

import React, { useMemo, useState } from "react";
import { useForm, Controller, FieldValues, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ZodTypeAny } from "zod";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.css";

export type Option = { label: string; value: string | number };
export type FieldType =
  | "text"
  | "email"
  | "number"
  | "textarea"
  | "select"
  | "multiselect"
  | "checkbox"
  | "radio"
  | "date";

export type FieldConfig = {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  helpText?: string;
  options?: Option[]; // for select, multiselect, radio
  colSpan?: 1 | 2 | 3 | 4; // grid span
  order?: number; // lower first
  disabled?: boolean;
  // RHF register options (minLength, maxLength, pattern, required, etc.)
  rules?: Record<string, any>;
};

type Props<TForm extends FieldValues> = {
  fields: FieldConfig[];
  defaultValues?: TForm;
  zodSchema?: ZodTypeAny; // optional. if provided, overrides rules
  onSubmit: SubmitHandler<TForm>;
  submitLabel?: string;
  columns?: 1 | 2 | 3 | 4; // grid columns
  showReset?: boolean;
  rtl?: boolean;
  // optional controlled re-ordering
  enableDragReorder?: boolean;
  onReorder?: (orderedFieldNames: string[]) => void;
};

export default function FormBuilder<TForm extends FieldValues>({
  fields,
  defaultValues,
  zodSchema,
  onSubmit,
  submitLabel = "Submit",
  columns = 3,
  showReset = true,
  rtl = false,
  enableDragReorder = false,
  onReorder,
}: Props<TForm>) {
  const [ordered, setOrdered] = useState<FieldConfig[]>(
    [...fields].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  );

  // If parent changes the fields prop, keep local in sync
  React.useEffect(() => {
    setOrdered([...fields].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
  }, [fields]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<TForm>({
    defaultValues: defaultValues as any,
    resolver: zodSchema ? zodResolver(zodSchema) : undefined,
    mode: "onSubmit",
  });

  const gridCols = useMemo(() => {
    const map: Record<number, string> = {
      1: "grid-cols-1",
      2: "sm:grid-cols-2",
      3: "sm:grid-cols-3",
      4: "sm:grid-cols-4",
    };
    return map[columns] || "sm:grid-cols-3";
  }, [columns]);

  // naive drag-n-drop (no 3rd-party deps)
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const onDragStart = (i: number) => () => setDragIndex(i);
  const onDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === i) return;
  };
  const onDrop = (i: number) => (e: React.DragEvent) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === i) return;
    const copy = [...ordered];
    const [moved] = copy.splice(dragIndex, 1);
    copy.splice(i, 0, moved);
    setOrdered(copy);
    setDragIndex(null);
    onReorder?.(copy.map((f) => f.name));
  };

  const renderField = (f: FieldConfig, idx: number) => {
    const base = "form-input w-full";
    const span =
      f.colSpan === 4
        ? "sm:col-span-4"
        : f.colSpan === 2
        ? "sm:col-span-2"
        : f.colSpan === 1
        ? "sm:col-span-1"
        : "sm:col-span-1";

    const wrapProps = enableDragReorder
      ? {
          draggable: true,
          onDragStart: onDragStart(idx),
          onDragOver: (e: React.DragEvent) => onDragOver(e, idx),
          onDrop: onDrop(idx),
          className:
            `${span} relative rounded-xl border border-transparent hover:border-black/10 px-1 py-1` +
            (dragIndex === idx ? " ring-2 ring-primary-500" : ""),
        }
      : { className: `${span}` };

    return (
      <div key={f.name} {...wrapProps}>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          {f.label}
        </label>

        {/* switch on type */}
        {(() => {
          switch (f.type) {
            case "textarea":
              return (
                <textarea
                  {...register(f.name as any, zodSchema ? {} : f.rules)}
                  disabled={f.disabled}
                  placeholder={f.placeholder}
                  className={`${base} min-h-[96px]`}
                />
              );
            case "select":
              return (
                <select
                  {...register(f.name as any, zodSchema ? {} : f.rules)}
                  disabled={f.disabled}
                  className={base}
                >
                  <option value="">Select...</option>
                  {f.options?.map((opt) => (
                    <option key={`${f.name}_${opt.value}`} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              );
            case "multiselect":
              return (
                <select
                  multiple
                  {...register(f.name as any, zodSchema ? {} : f.rules)}
                  disabled={f.disabled}
                  className={base}
                >
                  {f.options?.map((opt) => (
                    <option key={`${f.name}_${opt.value}`} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              );
            case "checkbox":
              return (
                <input
                  type="checkbox"
                  {...register(f.name as any, zodSchema ? {} : f.rules)}
                  disabled={f.disabled}
                  className="h-4 w-4 rounded border-gray-300"
                />
              );
            case "radio":
              return (
                <div className="flex flex-wrap gap-4">
                  {f.options?.map((opt) => (
                    <label key={`${f.name}_${opt.value}`} className="flex items-center gap-2">
                      <input
                        type="radio"
                        value={opt.value}
                        {...register(f.name as any, zodSchema ? {} : f.rules)}
                        disabled={f.disabled}
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              );
            case "date":
              return (
                <Controller
                  name={f.name as any}
                  control={control}
                  rules={zodSchema ? {} : f.rules}
                  render={({ field }) => (
                    <Flatpickr
                      value={field.value || ""}
                      onChange={(dates) =>
                        field.onChange(
                          dates[0] ? dates[0].toISOString().slice(0, 10) : ""
                        )
                      }
                      options={{
                        dateFormat: "Y-m-d",
                        position: rtl ? "auto right" : "auto left",
                      }}
                      className={base}
                      placeholder={f.placeholder}
                    />
                  )}
                />
              );
            case "email":
            case "number":
            case "text":
            default:
              return (
                <input
                  type={f.type}
                  {...register(f.name as any, zodSchema ? {} : f.rules)}
                  disabled={f.disabled}
                  placeholder={f.placeholder}
                  className={base}
                />
              );
          }
        })()}

        {f.helpText && (
          <p className="mt-1 text-xs text-gray-500">{f.helpText}</p>
        )}

        {/* error under field */}
        <p className="mt-1 text-xs text-red-600">
          {(errors as any)[f.name]?.message as string}
        </p>
      </div>
    );
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={`grid grid-cols-1 ${gridCols} gap-4`}
    >
      {ordered.map((f, idx) => renderField(f, idx))}

      <div className="sm:col-span-full mt-2 flex items-center justify-end gap-3">
        {showReset && (
          <button
            type="button"
            onClick={() => reset(defaultValues)}
            className="btn border px-4 py-2"
            disabled={!isDirty || isSubmitting}
          >
            Reset
          </button>
        )}
        <button
          type="submit"
          className="btn btn-primary px-6 py-2"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
