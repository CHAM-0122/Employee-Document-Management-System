"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { AdminShell } from "@/src/components/admin/admin-shell";

const QR_HISTORY_STORAGE_KEY = "admin-qr-history";
const QR_PRINT_HISTORY_STORAGE_KEY = "admin-qr-print-history";

type QrHistoryEntry = {
  kind: "pledge" | "employment_contract";
  label: string;
  storeName: string;
  url: string;
  generatedAt: string;
};

type QrPrintHistoryEntry = {
  label: string;
  storeName: string;
  url: string;
  openedAt: string;
};

const STORE_NAME_BY_ID: Record<string, string> = {
  "mock-store-hq": "本部",
  "mock-store-ichinokura": "壱之倉庫",
  "mock-store-yokobachi": "ヨコバチ",
  "mock-store-kobozu": "おでん屋小坊主",
  "mock-store-akagumi": "ラーメン赤組",
  "mock-store-kamitori": "餃子屋弐ノ弐上通本店",
  "mock-store-shimotori": "餃子屋弐ノ弐下通店",
  "mock-store-central": "餃子屋弐ノ弐中央店",
  "mock-store-imaizumi": "餃子屋弐ノ弐今泉店",
  "mock-store-minamitenjin": "餃子屋弐ノ弐南天神店",
  "mock-store-meijidori": "餃子屋弐ノ弐明治通り店",
  "mock-store-kawabata": "餃子屋弐ノ弐川端店",
  "mock-store-watanabedori": "餃子屋弐ノ弐渡辺通店",
  "mock-store-yakuin": "餃子屋弐ノ弐薬院店",
  "mock-store-daimyo": "餃子屋弐ノ弐大名店",
  "mock-store-solaria": "餃子屋弐ノ弐ソラリアステージ店",
  "mock-store-hakata-underground": "餃子屋弐ノ弐博多駅地下街店",
  "mock-store-fukuromachi": "餃子屋弐ノ弐袋町店",
  "mock-store-soemoncho": "餃子屋弐ノ弐宗右衛門町店",
  "mock-store-naha": "餃子屋弐ノ弐那覇店",
  "mock-store-makishi": "餃子屋弐ノ弐牧志店",
  "mock-store-kumamoto-factory": "餃子屋弐ノ弐清水工場",
  "mock-store-kumamoto-sales": "餃子屋弐ノ弐近見販売所",
  "mock-store-fukuoka-factory": "餃子弐ノ弐福岡工場",
  "mock-store-keigo": "餃子屋弐ノ弐警固店",
  "mock-store-praliva": "餃子屋弐ノ弐プラリバ店",
  "mock-store-paypaydome": "餃子屋弐ノ弐ペイペイドーム店",
  "mock-store-shin-umeda": "餃子屋弐ノ弐新梅田食道街店",
  "mock-store-osaka": "餃子屋弐ノ弐天満店",
};

export function AdminQrLibraryPage() {
  const searchParams = useSearchParams();
  const [issuedItems, setIssuedItems] = useState<QrHistoryEntry[]>([]);
  const [printedItems, setPrintedItems] = useState<QrPrintHistoryEntry[]>([]);
  const [selectedStoreName, setSelectedStoreName] = useState<string>("all");
  const [selectedKind, setSelectedKind] = useState<string>("all");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const issuedRaw = window.localStorage.getItem(QR_HISTORY_STORAGE_KEY);
    const printRaw = window.localStorage.getItem(QR_PRINT_HISTORY_STORAGE_KEY);

    setIssuedItems(issuedRaw ? (JSON.parse(issuedRaw) as QrHistoryEntry[]) : []);
    setPrintedItems(printRaw ? (JSON.parse(printRaw) as QrPrintHistoryEntry[]) : []);
  }, []);

  const viewerRole = searchParams.get("role");
  const currentStoreId = searchParams.get("storeId");
  const scopedStoreName = currentStoreId ? STORE_NAME_BY_ID[currentStoreId] : undefined;

  const roleScopedIssuedItems = useMemo(() => {
    if (viewerRole === "store_admin" && scopedStoreName) {
      return issuedItems.filter((item) => item.storeName === scopedStoreName);
    }
    return issuedItems;
  }, [issuedItems, scopedStoreName, viewerRole]);

  const storeNames = useMemo(
    () => Array.from(new Set(roleScopedIssuedItems.map((item) => item.storeName))).sort((a, b) => a.localeCompare(b, "ja")),
    [roleScopedIssuedItems],
  );

  const items = useMemo(() => {
    const printMap = new Map(printedItems.map((item) => [item.url, item]));
    const merged = roleScopedIssuedItems.map((item) => ({
      ...item,
      printOpenedAt: printMap.get(item.url)?.openedAt,
    }));

    return merged.filter((item) => {
      const storeMatches =
        selectedStoreName === "all" || item.storeName === selectedStoreName;
      const kindMatches = selectedKind === "all" || item.kind === selectedKind;

      return storeMatches && kindMatches;
    });
  }, [printedItems, roleScopedIssuedItems, selectedKind, selectedStoreName]);

  const groupedItems = useMemo(
    () =>
      storeNames
        .map((storeName) => ({
          storeName,
          items: items.filter((item) => item.storeName === storeName),
        }))
        .filter((group) => group.items.length > 0),
    [items, storeNames],
  );

  function buildQrBulkPrintHref(kind: "pledge" | "employment_contract") {
    const params = new URLSearchParams(searchParams.toString());
    params.set("kind", kind);
    return `/admin/qr-bulk-print?${params.toString()}`;
  }


  const summaryCards = useMemo(
    () => [
      {
        label: "表示中のQR",
        value: items.length,
        tone: "bg-slate-50 text-slate-900",
      },
      {
        label: "誓約書QR",
        value: items.filter((item) => item.kind === "pledge").length,
        tone: "bg-amber-50 text-amber-900",
      },
      {
        label: "雇用契約書QR",
        value: items.filter((item) => item.kind === "employment_contract").length,
        tone: "bg-sky-50 text-sky-900",
      },
      {
        label: "印刷済み",
        value: items.filter((item) => item.printOpenedAt).length,
        tone: "bg-emerald-50 text-emerald-900",
      },
    ],
    [items],
  );

  return (
    <AdminShell
      title="QR一覧"
      description="発行した店舗配布用QRを店舗ごとに確認できます。印刷用ページを開いた履歴もここで確認できます。"
    >
      <section className="mb-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500">発行済みQR一覧</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">店舗ごとのQR一覧</h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              発行済みのQRを店舗単位で確認できます。印刷用ページを開いた日時も確認できるため、店舗掲示の差し替え状況を追いやすくしています。
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={buildQrBulkPrintHref("pledge")}
                className="rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-900 transition hover:border-amber-400 hover:bg-amber-100"
              >
                誓約書QRをまとめて印刷
              </Link>
              <Link
                href={buildQrBulkPrintHref("employment_contract")}
                className="rounded-full border border-sky-300 bg-sky-50 px-4 py-2 text-xs font-semibold text-sky-900 transition hover:border-sky-400 hover:bg-sky-100"
              >
                雇用契約書QRをまとめて印刷
              </Link>
            </div>
          </div>

          <div className="grid gap-4 lg:min-w-[24rem] lg:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">店舗で絞り込む</span>
              <select
                value={selectedStoreName}
                onChange={(event) => setSelectedStoreName(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-cyan-100"
              >
                <option value="all">全店舗</option>
                {storeNames.map((storeName) => (
                  <option key={storeName} value={storeName}>
                    {storeName}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">QR種別で絞り込む</span>
              <select
                value={selectedKind}
                onChange={(event) => setSelectedKind(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-cyan-100"
              >
                <option value="all">全種類</option>
                <option value="pledge">誓約書QR</option>
                <option value="employment_contract">雇用契約書QR</option>
              </select>
            </label>
          </div>
        </div>
      </section>

      <section className="mb-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <article
              key={card.label}
              className={`rounded-[1.5rem] border border-slate-200 px-5 py-4 shadow-sm ${card.tone}`}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                {card.label}
              </p>
              <p className="mt-3 text-3xl font-semibold">{card.value}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        {groupedItems.length === 0 ? (
          <div className="rounded-[1.5rem] border border-dashed border-slate-300 px-5 py-10 text-center text-sm text-slate-500">
            まだ QR 発行履歴がありません。提出一覧で QR を発行するとここに表示されます。
          </div>
        ) : (
          <div className="space-y-6">
            {groupedItems.map((group) => (
              <section key={group.storeName} className="overflow-hidden rounded-[1.5rem] border border-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">{group.storeName}</h3>
                    <p className="text-xs text-slate-500">QR {group.items.length} 件</p>
                  </div>
                  <Link
                    href={`/admin/intakes${searchParams.toString() ? `?${searchParams.toString()}` : ""}`}
                    className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                  >
                    提出一覧へ戻る
                  </Link>
                </div>

                <div className="grid gap-4 p-5 lg:grid-cols-2">
                  {group.items.map((item) => (
                    <article key={item.url} className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{item.kind === "pledge" ? "誓約書QR" : "雇用契約書QR"}</p>
                          <h4 className="mt-2 text-lg font-semibold text-slate-900">{item.label}</h4>
                        </div>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold tracking-[0.18em] text-slate-700">有効</span>
                      </div>

                      <div className="mt-4 rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(item.url)}`}
                          alt={`${item.label}のQRコード`}
                          className="mx-auto h-44 w-44"
                        />
                      </div>

                      <dl className="mt-4 space-y-3 text-sm">
                        <div>
                          <dt className="font-semibold text-slate-500">発行日時</dt>
                          <dd className="mt-1 text-slate-700">{new Date(item.generatedAt).toLocaleString("ja-JP")}</dd>
                        </div>
                        <div>
                          <dt className="font-semibold text-slate-500">印刷ページを開いた日時</dt>
                          <dd className="mt-1 text-slate-700">
                            {item.printOpenedAt ? new Date(item.printOpenedAt).toLocaleString("ja-JP") : "未表示"}
                          </dd>
                        </div>
                        <div>
                          <dt className="font-semibold text-slate-500">リンクURL</dt>
                          <dd className="mt-1 break-all text-slate-700">{item.url}</dd>
                        </div>
                      </dl>

                      <div className="mt-5 flex flex-wrap gap-2">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                        >
                          入力画面を開く
                        </a>
                        <Link
                          href={{
                            pathname: "/admin/qr-print",
                            query: {
                              label: item.label,
                              store: item.storeName,
                              url: item.url,
                            },
                          }}
                          className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                        >
                          印刷用ページ / PDF化
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>
    </AdminShell>
  );
}
