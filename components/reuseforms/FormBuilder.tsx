"use client";

import React, { useMemo, useState } from "react";
import {
  useForm,
  Controller,
  FieldValues,
  SubmitHandler,
  DefaultValues,
  Resolver,
} from "react-hook-form";
import type { ZodTypeAny, ZodIssue } from "zod";
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
  defaultValues?: DefaultValues<TForm>;
  /** Keep loose to avoid zod version generic constraints */
  zodSchema?: ZodTypeAny;
  onSubmit: SubmitHandler<TForm>;
  submitLabel?: string;
  columns?: 1 | 2 | 3 | 4; // grid columns
  showReset?: boolean;
  rtl?: boolean;
  // optional controlled re-ordering
  enableDragReorder?: boolean;
  onReorder?: (orderedFieldNames: string[]) => void;
};

/** Minimal Zod -> RHF error mapper */
function zodToRHFErrors(issues: ZodIssue[]) {
  // RHF expects a nested field error map; we’ll build a shallow map from paths
  const errors: Record<
    string,
    {
      type: string;
      message?: string;
      // RHF accepts additional properties; keep minimal
    }
  > = {};
  for (const issue of issues) {
    const key = issue.path?.join(".") || "_root";
    if (!errors[key]) {
      errors[key] = { type: issue.code || "zod", message: issue.message };
    }
  }
  return errors;
}

/** Custom resolver that avoids zodResolver overload issues entirely */
function makeZodResolver<TForm extends FieldValues>(
  schema: ZodTypeAny
): Resolver<TForm, any, TForm> {
  return async (values: any) => {
    const parsed = schema.safeParse(values);
    if (parsed.success) {
      // parsed.data may be narrowed/transformed by Zod; assert as TForm (caller responsibility)
      return {
        values: parsed.data as TForm,
        errors: {},
      };
    }
    return {
      values: {} as any,
      errors: zodToRHFErrors(parsed.error.issues) as any,
    };
  };
}

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

  // Keep local order in sync if parent updates fields
  React.useEffect(() => {
    setOrdered([...fields].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
  }, [fields]);

  const resolver = zodSchema ? makeZodResolver<TForm>(zodSchema) : undefined;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<TForm, any, TForm>({
    defaultValues,
    resolver,
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

  // lightweight drag-n-drop
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
      <div key={f.name} {...(wrapProps as any)}>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          {f.label}
        </label>

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
                    <label
                      key={`${f.name}_${opt.value}`}
                      className="flex items-center gap-2"
                    >
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
                <Controller<TForm>
                  name={f.name as any}
                  control={control}
                  rules={zodSchema ? {} : f.rules}
                  render={({ field }) => (
                    <Flatpickr
                      value={(field.value as any) || ""}
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
