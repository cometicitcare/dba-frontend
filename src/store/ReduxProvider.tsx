"use client";

import { Provider } from "react-redux";
import { type ReactNode, useEffect } from "react";
import { store } from "./store";
import { useAppDispatch, useAppSelector } from "./hooks";
import { selectLanguage, setLanguage, type Lang } from "./slices/i18nSlice";

const STORAGE_KEY = "dba-hrms.language";

const isLang = (value: string | null): value is Lang =>
  value === "en" || value === "si" || value === "ta";

function LanguagePersistor({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const language = useAppSelector(selectLanguage);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isLang(stored) && stored !== language) {
      dispatch(setLanguage(stored));
    }
  }, [dispatch]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language);
  }, [language]);

  return children;
}

export default function ReduxProvider({ children }: { children: ReactNode }) {
  return (
    <Provider store={store}>
      <LanguagePersistor>{children}</LanguagePersistor>
    </Provider>
  );
}
