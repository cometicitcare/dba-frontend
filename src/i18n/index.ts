import en from "./en.json";
import si from "./si.json";
import ta from "./ta.json";
import type { Lang } from "@/store/slices/i18nSlice";

interface Dict {
  [key: string]: string | Dict;
}

const dictionaries: Record<Lang, Dict> = {
  en,
  si,
  ta,
};

const getValue = (obj: Dict, key: string): string | undefined => {
  const parts = key.split(".");
  let current: string | Dict | undefined = obj;

  for (const part of parts) {
    if (!current || typeof current !== "object" || !(part in current)) return undefined;
    current = (current as Dict)[part];
  }

  return typeof current === "string" ? current : undefined;
};

const replaceParams = (
  text: string,
  params?: Record<string, string | number>
): string => {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, key) => {
    const value = params[key];
    return value === undefined ? match : String(value);
  });
};

export function t(
  key: string,
  params?: Record<string, string | number>,
  lang: Lang = "en"
): string {
  const fromLang = getValue(dictionaries[lang], key);
  const fromEn = getValue(dictionaries.en, key);
  const resolved = fromLang ?? fromEn ?? key;
  return replaceParams(resolved, params);
}
