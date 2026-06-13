"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { PrintButton } from "@/src/components/admin/print-button";

const QR_HISTORY_STORAGE_KEY = "admin-qr-history";

type QrBulkPrintKind = "pledge" | "employment_contract";

type QrHistoryEntry = {
  kind: QrBulkPrintKind;
  label: string;
  storeName: string;
  url: string;
  generatedAt: string;
};

type PledgeEmploymentTerm =
  | "fixed_term"
  | "permanent"
  | "employee_c"
  | "fixed_part_time"
  | "permanent_part_time"
  | "timee"
  | "retirement";

type InviteEmploymentTrack =
  | "part_time"
  | "permanent_part_time"
  | "head_office_employee"
  | "permanent_head_office_employee"
  | "commissioned_store_employee"
  | "permanent_commissioned_store_employee"
  | "employee_c";

type QrTarget = {
  kind: QrBulkPrintKind;
  storeId: string;
  storeName: string;
  label: string;
  flowKind: "onboarding" | "employment_contract";
  pledgeEmploymentTerm?: PledgeEmploymentTerm;
  employmentTrack?: InviteEmploymentTrack;
};

const KUMAMOTO_FACTORY_STORE_ID = "mock-store-kumamoto-factory";
const HEAD_OFFICE_STORE_ID = "mock-store-hq";

const STORE_OPTIONS = [
  { id: HEAD_OFFICE_STORE_ID, name: "本部" },
  { id: "mock-store-ichinokura", name: "壱之倉庫" },
  { id: "mock-store-yokobachi", name: "ヨコバチ" },
  { id: "mock-store-kobozu", name: "おでん屋小坊主" },
  { id: "mock-store-akagumi", name: "ラーメン赤組" },
  { id: "mock-store-kamitori", name: "餃子屋弐ノ弐上通本店" },
  { id: "mock-store-shimotori", name: "餃子屋弐ノ弐下通店" },
  { id: "mock-store-central", name: "餃子屋弐ノ弐中央店" },
  { id: "mock-store-imaizumi", name: "餃子屋弐ノ弐今泉店" },
  { id: "mock-store-minamitenjin", name: "餃子屋弐ノ弐南天神店" },
  { id: "mock-store-meijidori", name: "餃子屋弐ノ弐明治通り店" },
  { id: "mock-store-kawabata", name: "餃子屋弐ノ弐川端店" },
  { id: "mock-store-watanabedori", name: "餃子屋弐ノ弐渡辺通店" },
  { id: "mock-store-yakuin", name: "餃子屋弐ノ弐薬院店" },
  { id: "mock-store-daimyo", name: "餃子屋弐ノ弐大名店" },
  { id: "mock-store-solaria", name: "餃子屋弐ノ弐ソラリアステージ店" },
  { id: "mock-store-hakata-underground", name: "餃子屋弐ノ弐博多駅地下街店" },
  { id: "mock-store-fukuromachi", name: "餃子屋弐ノ弐袋町店" },
  { id: "mock-store-soemoncho", name: "餃子屋弐ノ弐宗右衛門町店" },
  { id: "mock-store-naha", name: "餃子屋弐ノ弐那覇店" },
  { id: "mock-store-makishi", name: "餃子屋弐ノ弐牧志店" },
  { id: KUMAMOTO_FACTORY_STORE_ID, name: "餃子屋弐ノ弐清水工場" },
  { id: "mock-store-kumamoto-sales", name: "餃子屋弐ノ弐近見販売所" },
  { id: "mock-store-fukuoka-factory", name: "餃子弐ノ弐福岡工場" },
  { id: "mock-store-keigo", name: "餃子屋弐ノ弐警固店" },
  { id: "mock-store-praliva", name: "餃子屋弐ノ弐プラリバ店" },
  { id: "mock-store-paypaydome", name: "餃子屋弐ノ弐ペイペイドーム店" },
  { id: "mock-store-shin-umeda", name: "餃子屋弐ノ弐新梅田食道街店" },
  { id: "mock-store-osaka", name: "餃子屋弐ノ弐天満店" },
];

const STORE_NAME_BY_ID = Object.fromEntries(
  STORE_OPTIONS.map((store) => [store.id, store.name]),
);

const pledgeEmploymentTermLabels: Record<PledgeEmploymentTerm, string> = {
  fixed_term: "有期社員用",
  permanent: "無期社員用",
  employee_c: "社員C用",
  fixed_part_time: "有期アルバイト・パート用",
  permanent_part_time: "無期アルバイト・パート用",
  timee: "タイミー用",
  retirement: "退職時誓約書用",
};

const inviteEmploymentTrackLabels: Record<InviteEmploymentTrack, string> = {
  part_time: "アルバイト・パート",
  permanent_part_time: "無期アルバイト・パート",
  head_office_employee: "直営有期社員",
  permanent_head_office_employee: "直営無期社員",
  commissioned_store_employee: "委託有期社員",
  permanent_commissioned_store_employee: "委託無期社員",
  employee_c: "社員C",
};

const baseEmploymentTracks = [
  "part_time",
  "head_office_employee",
  "permanent_head_office_employee",
  "commissioned_store_employee",
  "permanent_commissioned_store_employee",
  "employee_c",
] as const satisfies InviteEmploymentTrack[];

function getPledgeEmploymentTermsForStore(storeId: string): PledgeEmploymentTerm[] {
  if (storeId === HEAD_OFFICE_STORE_ID) {
    return ["fixed_term", "permanent", "fixed_part_time", "timee", "retirement"];
  }

  return storeId === KUMAMOTO_FACTORY_STORE_ID
    ? [
        "fixed_term",
        "permanent",
        "employee_c",
        "fixed_part_time",
        "permanent_part_time",
        "timee",
        "retirement",
      ]
    : ["fixed_term", "permanent", "employee_c", "fixed_part_time", "timee", "retirement"];
}

function getEmploymentContractTracksForStore(storeId: string): InviteEmploymentTrack[] {
  if (storeId === HEAD_OFFICE_STORE_ID) {
    return ["head_office_employee", "permanent_head_office_employee", "part_time"];
  }

  return storeId === KUMAMOTO_FACTORY_STORE_ID
    ? [...baseEmploymentTracks, "permanent_part_time"]
    : [...baseEmploymentTracks];
}

function getQrSrc(url: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(url)}`;
}

function getKindLabel(kind: QrBulkPrintKind) {
  return kind === "pledge" ? "誓約書QR" : "雇用契約書QR";
}

function normalizeLabel(label: string, kind: QrBulkPrintKind) {
  return label.replace(getKindLabel(kind), "").trim() || label;
}

function getTargetKey(item: Pick<QrHistoryEntry, "kind" | "label" | "storeName">) {
  return `${item.kind}:${item.storeName}:${item.label}`;
}

function getTargets(kind: QrBulkPrintKind, storeId?: string): QrTarget[] {
  const stores = storeId
    ? STORE_OPTIONS.filter((store) => store.id === storeId)
    : STORE_OPTIONS;

  return stores.flatMap<QrTarget>((store) => {
    if (kind === "pledge") {
      return getPledgeEmploymentTermsForStore(store.id).map<QrTarget>((pledgeEmploymentTerm) => ({
        kind,
        storeId: store.id,
        storeName: store.name,
        label: `${pledgeEmploymentTermLabels[pledgeEmploymentTerm]} 誓約書QR`,
        flowKind: "onboarding" as const,
        pledgeEmploymentTerm,
      }));
    }

    return getEmploymentContractTracksForStore(store.id).map<QrTarget>((employmentTrack) => ({
      kind,
      storeId: store.id,
      storeName: store.name,
      label: `${inviteEmploymentTrackLabels[employmentTrack]} 雇用契約書QR`,
      flowKind: "employment_contract" as const,
      employmentTrack,
    }));
  });
}

export function AdminQrBulkPrintPage({
  kind,
  role,
  storeId,
}: {
  kind: QrBulkPrintKind;
  role?: string;
  storeId?: string;
}) {
  const [issuedItems, setIssuedItems] = useState<QrHistoryEntry[]>([]);
  const [isPreparing, setIsPreparing] = useState(true);
  const [prepareError, setPrepareError] = useState<string | null>(null);

  useEffect(() => {
    const raw = window.localStorage.getItem(QR_HISTORY_STORAGE_KEY);
    setIssuedItems(raw ? (JSON.parse(raw) as QrHistoryEntry[]) : []);
  }, []);

  const scopedStoreId = storeId ? storeId : undefined;
  const scopedStoreName = scopedStoreId ? STORE_NAME_BY_ID[scopedStoreId] : undefined;
  const returnHref = `/admin/intakes${role ? `?role=${role}${storeId ? `&storeId=${storeId}` : ""}` : ""}`;
  const kindLabel = getKindLabel(kind);

  useEffect(() => {
    let cancelled = false;

    async function prepareQrCodes() {
      try {
        setIsPreparing(true);
        setPrepareError(null);

        const raw = window.localStorage.getItem(QR_HISTORY_STORAGE_KEY);
        const currentItems = raw ? (JSON.parse(raw) as QrHistoryEntry[]) : [];
        const targets = getTargets(kind, scopedStoreId);
        const existingKeys = new Set(currentItems.map(getTargetKey));
        const missingTargets = targets.filter(
          (target) =>
            !existingKeys.has(
              getTargetKey({
                kind: target.kind,
                storeName: target.storeName,
                label: target.label,
              }),
            ),
        );

        if (missingTargets.length === 0) {
          if (!cancelled) {
            setIssuedItems(currentItems);
          }
          return;
        }

        const createdItems: QrHistoryEntry[] = [];
        const baseUrl = window.location.origin;

        for (const target of missingTargets) {
          const expiresAt = new Date();
          expiresAt.setFullYear(expiresAt.getFullYear() + 5);

          const response = await fetch("/api/admin/intakes/invite", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              inviteEmail: `${target.kind}.${target.storeId}@qr.local`,
              storeId: target.storeId,
              expiresAt: expiresAt.toISOString(),
              documentTypes:
                target.flowKind === "employment_contract"
                  ? ["employment_contract"]
                  : target.pledgeEmploymentTerm === "retirement"
                    ? ["retirement_pledge"]
                  : ["employee_pledge", "sns_pledge"],
              flowKind: target.flowKind,
              employmentTrack: target.employmentTrack ?? "part_time",
              pledgeEmploymentTerm: target.pledgeEmploymentTerm,
            }),
          });

          const json = (await response.json()) as
            | { intakeToken?: string; flowPath?: string; error?: { message?: string } }
            | undefined;

          if (!response.ok) {
            throw new Error(json?.error?.message ?? "QRの一括発行に失敗しました");
          }

          const rawFlowPath =
            json?.flowPath ??
            (target.flowKind === "employment_contract"
              ? `/employment-contracts/${json?.intakeToken ?? ""}`
              : `/intakes/${json?.intakeToken ?? ""}`);
          const flowPath =
            target.kind === "pledge" && target.pledgeEmploymentTerm
              ? `${rawFlowPath}?pledgeTerm=${target.pledgeEmploymentTerm}`
              : rawFlowPath;

          createdItems.push({
            kind: target.kind,
            label: target.label,
            storeName: target.storeName,
            url: `${baseUrl}${flowPath}`,
            generatedAt: new Date().toISOString(),
          });
        }

        const nextItems = [...createdItems, ...currentItems].filter(
          (item, index, array) =>
            array.findIndex((candidate) => getTargetKey(candidate) === getTargetKey(item)) === index,
        );
        window.localStorage.setItem(QR_HISTORY_STORAGE_KEY, JSON.stringify(nextItems));

        if (!cancelled) {
          setIssuedItems(nextItems);
        }
      } catch (error) {
        if (!cancelled) {
          setPrepareError(error instanceof Error ? error.message : "QRの一括発行に失敗しました");
        }
      } finally {
        if (!cancelled) {
          setIsPreparing(false);
        }
      }
    }

    void prepareQrCodes();

    return () => {
      cancelled = true;
    };
  }, [kind, scopedStoreId]);

  const items = useMemo(() => {
    return issuedItems
      .filter((item) => item.kind === kind)
      .filter((item) => !scopedStoreName || item.storeName === scopedStoreName)
      .sort((a, b) => {
        const storeCompare = a.storeName.localeCompare(b.storeName, "ja");
        return storeCompare || a.label.localeCompare(b.label, "ja");
      });
  }, [issuedItems, kind, scopedStoreName]);

  const groupedItems = useMemo(() => {
    const groups = new Map<string, QrHistoryEntry[]>();
    items.forEach((item) => {
      const currentItems = groups.get(item.storeName) ?? [];
      currentItems.push(item);
      groups.set(item.storeName, currentItems);
    });

    return Array.from(groups.entries()).map(([storeName, groupItems]) => ({
      storeName,
      items: groupItems,
    }));
  }, [items]);

  return (
    <main className="min-h-screen bg-[#eef3f1] px-6 py-8 text-slate-900 print:bg-white print:p-0">
      <div className="mx-auto max-w-[210mm]">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div>
            <p className="text-sm font-semibold text-slate-500">QRまとめ印刷</p>
            <h1 className="mt-1 text-3xl font-semibold">{kindLabel} 一括印刷</h1>
            <p className="mt-2 text-sm text-slate-600">
              発行済みの{kindLabel}を1店舗につきA4 1枚で印刷できます。各店舗へ配布するときに使えます。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={returnHref}
              className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
            >
              管理画面へ戻る
            </Link>
            <PrintButton />
          </div>
        </div>

        <section className="bg-white p-6 shadow-sm print:p-0 print:shadow-none">
          <header className="mb-4 border-b border-slate-300 pb-3 text-center print:hidden">
            <p className="text-[11px] font-semibold tracking-[0.3em] text-slate-500 print:text-[8pt]">
              STAFF ENTRY QR
            </p>
            <h2 className="mt-2 text-2xl font-semibold print:text-[18pt]">{kindLabel} 一括印刷</h2>
            <p className="mt-1 text-xs text-slate-500 print:text-[8pt]">
              印刷日: {new Date().toLocaleDateString("ja-JP")}
            </p>
          </header>

          {isPreparing ? (
            <div className="mb-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-center text-sm font-semibold text-sky-900 print:hidden">
              印刷用QRを準備しています...
            </div>
          ) : null}

          {prepareError ? (
            <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-900 print:hidden">
              {prepareError}
            </div>
          ) : null}

          {groupedItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm leading-7 text-slate-600 print:border-slate-400">
              まだ発行済みの{kindLabel}がありません。
              <br />
              管理画面でQRを表示すると、このまとめ印刷ページに追加されます。
            </div>
          ) : (
            <div className="space-y-4 print:space-y-0">
              {groupedItems.map((group) => (
                <article
                  key={group.storeName}
                  className="break-inside-avoid rounded-[2rem] border border-slate-300 p-6 shadow-sm print:flex print:min-h-[297mm] print:w-[210mm] print:break-after-page print:flex-col print:rounded-none print:border-0 print:p-[12mm] print:shadow-none"
                >
                  <div className="border-b border-slate-300 pb-5 text-center print:pb-[6mm]">
                    <p className="text-[11px] font-semibold tracking-[0.3em] text-slate-500 print:text-[9pt]">
                      STAFF ENTRY QR
                    </p>
                    <h3 className="mt-3 text-2xl font-semibold text-slate-950 print:text-[22pt]">
                      {group.storeName}
                    </h3>
                    <p className="mt-2 text-sm font-semibold text-slate-600 print:text-[12pt]">
                      {kindLabel}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 print:text-[9pt]">
                      印刷日: {new Date().toLocaleDateString("ja-JP")}
                    </p>
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 print:mt-[9mm] print:grid-cols-2 print:gap-[8mm]">
                    {group.items.map((item) => (
                      <div
                        key={item.url}
                        className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 print:min-h-[42mm] print:rounded-[5mm] print:border-slate-300 print:bg-white print:p-[4mm]"
                      >
                        <img
                          src={getQrSrc(item.url)}
                          alt={`${item.label}のQRコード`}
                          className="h-28 w-28 shrink-0 print:h-[34mm] print:w-[34mm]"
                        />
                        <div className="min-w-0">
                          <p className="text-base font-semibold leading-6 text-slate-900 print:text-[13pt] print:leading-snug">
                            {normalizeLabel(item.label, kind)}
                          </p>
                          <p className="mt-2 break-all text-[10px] leading-4 text-slate-500 print:hidden">
                            {item.url}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-auto pt-6 print:pt-[8mm]">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm leading-7 text-slate-700 print:rounded-[5mm] print:border-slate-300 print:bg-white print:px-[5mm] print:py-[4mm] print:text-[10pt] print:leading-relaxed">
                      <p className="font-semibold text-slate-950">使い方</p>
                      <ol className="mt-2 list-decimal space-y-1 pl-5">
                        <li>スマートフォンのカメラで該当するQRコードを読み取ってください。</li>
                        <li>表示された入力画面で必要事項を入力し、提出してください。</li>
                        <li>雇用区分に合ったQRコードを使用してください。</li>
                      </ol>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          <p className="mt-4 text-center text-[10px] leading-5 text-slate-500 print:hidden">
            QRコードを読み取り、表示された入力画面から提出してください。未発行のQRは管理画面でQRを表示すると追加されます。
          </p>
        </section>
      </div>
    </main>
  );
}
