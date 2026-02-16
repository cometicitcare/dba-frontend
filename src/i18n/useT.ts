"use client";

import { useCallback } from "react";
import { useAppSelector } from "@/store/hooks";
import { selectLanguage } from "@/store/slices/i18nSlice";
import { t } from "./index";

export function useT() {
  const language = useAppSelector(selectLanguage);

  return useCallback(
    (key: string, params?: Record<string, string | number>) =>
      t(key, params, language),
    [language]
  );
}
