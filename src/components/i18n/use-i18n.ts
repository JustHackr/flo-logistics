"use client";

import { useContext } from "react";
import { I18nContext } from "@/components/i18n/locale-provider";

export function useI18n() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useI18n must be used within a LocaleProvider");
  }

  return context;
}
