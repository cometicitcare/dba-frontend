import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../store";

export type Lang = "en" | "si" | "ta";

interface I18nState {
  language: Lang;
}

const initialState: I18nState = {
  language: "en",
};

const i18nSlice = createSlice({
  name: "i18n",
  initialState,
  reducers: {
    setLanguage(state, action: PayloadAction<Lang>) {
      state.language = action.payload;
    },
  },
});

export const { setLanguage } = i18nSlice.actions;

export const selectLanguage = (state: RootState) => state.i18n.language;

export default i18nSlice.reducer;
