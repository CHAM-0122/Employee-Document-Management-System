"use client";

import { useEffect } from "react";

const QR_PRINT_HISTORY_STORAGE_KEY = "admin-qr-print-history";

type QrPrintHistoryEntry = {
  label: string;
  storeName: string;
  url: string;
  openedAt: string;
};

export function QrPrintTracker({
  label,
  storeName,
  url,
}: {
  label: string;
  storeName: string;
  url: string;
}) {
  useEffect(() => {
    if (!url || typeof window === "undefined") {
      return;
    }

    const raw = window.localStorage.getItem(QR_PRINT_HISTORY_STORAGE_KEY);
    const current = raw ? (JSON.parse(raw) as QrPrintHistoryEntry[]) : [];
    const entry: QrPrintHistoryEntry = {
      label,
      storeName,
      url,
      openedAt: new Date().toISOString(),
    };
    const next = [entry, ...current.filter((item) => item.url !== url)].slice(0, 120);
    window.localStorage.setItem(QR_PRINT_HISTORY_STORAGE_KEY, JSON.stringify(next));
  }, [label, storeName, url]);

  return null;
}
