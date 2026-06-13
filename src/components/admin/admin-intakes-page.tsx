"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { AdminShell } from "@/src/components/admin/admin-shell";

type ResubmissionState = "なし" | "要再提出" | "再提出済み" | "無効化";

type AdminListItem = {
  id: string;
  intakeToken?: string;
  fullName: string;
  storeName: string;
  status: string;
  employmentCategoryLabel?: string;
  documentTypes?: AdminRowDocumentType[];
  submittedAt?: string;
  documentCount: number;
  resubmissionState?: ResubmissionState;
  latestRenewalPeriod?: string;
  latestRenewalStatus?: "sent" | "viewed" | "signed" | "expired";
  pdfUrl?: string;
};

type ViewerRole = "hq_admin" | "store_admin";

type PendingSubmissionItem = {
  id: string;
  fullName: string;
  storeName: string;
  employmentCategoryLabel: "社員" | "社員C" | "アルバイト・パート";
  documentLabel: "誓約書" | "雇用契約書";
  dueLabel: string;
  state: "pending" | "returned";
  note?: string;
};

type QrHistoryEntry = {
  kind: "pledge" | "employment_contract";
  label: string;
  storeName: string;
  url: string;
  generatedAt: string;
};
type InviteFlowKind = "onboarding" | "employment_contract";
type AdminRowDocumentType =
  | "employee_pledge"
  | "sns_pledge"
  | "employment_contract"
  | "retirement_pledge";
type AdminRowDocumentAction = "return" | "invalidate";
type AdminRowActionValue =
  | "review"
  | `${AdminRowDocumentAction}:${AdminRowDocumentType}`;
type DocumentFilterValue = "all" | "pledge" | "employment_contract";
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

const inviteStoreOptions = [
  { id: "mock-store-hq", name: "本部" },
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
  { id: "mock-store-kumamoto-factory", name: "餃子屋弐ノ弐清水工場" },
  { id: "mock-store-kumamoto-sales", name: "餃子屋弐ノ弐近見販売所" },
  { id: "mock-store-fukuoka-factory", name: "餃子弐ノ弐福岡工場" },
  { id: "mock-store-keigo", name: "餃子屋弐ノ弐警固店" },
  { id: "mock-store-praliva", name: "餃子屋弐ノ弐プラリバ店" },
  { id: "mock-store-paypaydome", name: "餃子屋弐ノ弐ペイペイドーム店" },
  { id: "mock-store-shin-umeda", name: "餃子屋弐ノ弐新梅田食道街店" },
  { id: "mock-store-osaka", name: "餃子屋弐ノ弐天満店" },
];

const allStoreNames = inviteStoreOptions
  .map((option) => option.name)
  .sort((a, b) => a.localeCompare(b, "ja"));

const inviteStoreOptionMap = new Map(
  inviteStoreOptions.map((option) => [option.id, option]),
);

const inviteFlowLabels: Record<InviteFlowKind, string> = {
  onboarding: "入社手続き",
  employment_contract: "雇用契約更新",
};

const QR_HISTORY_STORAGE_KEY = "admin-qr-history";
const KUMAMOTO_FACTORY_STORE_ID = "mock-store-kumamoto-factory";
const HEAD_OFFICE_STORE_ID = "mock-store-hq";

const pledgeEmploymentTermLabels: Record<PledgeEmploymentTerm, string> = {
  fixed_term: "有期社員用",
  permanent: "無期社員用",
  employee_c: "社員C用",
  fixed_part_time: "有期アルバイト・パート用",
  permanent_part_time: "無期アルバイト・パート用",
  timee: "タイミー用",
  retirement: "退職時誓約書用",
};

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

const inviteEmploymentTrackLabels: Record<InviteEmploymentTrack, string> = {
  part_time: "アルバイト・パート",
  permanent_part_time: "無期アルバイト・パート",
  head_office_employee: "直営有期社員",
  permanent_head_office_employee: "直営無期社員",
  commissioned_store_employee: "委託有期社員",
  permanent_commissioned_store_employee: "委託無期社員",
  employee_c: "社員C",
};

const inviteEmploymentTracks = [
  "part_time",
  "head_office_employee",
  "permanent_head_office_employee",
  "commissioned_store_employee",
  "permanent_commissioned_store_employee",
  "employee_c",
] as const satisfies InviteEmploymentTrack[];

const pledgeTermEmploymentTracks: Record<PledgeEmploymentTerm, InviteEmploymentTrack> = {
  fixed_term: "head_office_employee",
  permanent: "head_office_employee",
  employee_c: "employee_c",
  fixed_part_time: "part_time",
  permanent_part_time: "permanent_part_time",
  timee: "part_time",
  retirement: "part_time",
};

function getEmploymentContractTracksForStore(
  storeId: string,
): InviteEmploymentTrack[] {
  if (storeId === HEAD_OFFICE_STORE_ID) {
    return ["head_office_employee", "permanent_head_office_employee", "part_time"];
  }

  return storeId === KUMAMOTO_FACTORY_STORE_ID
    ? [...inviteEmploymentTracks, "permanent_part_time"]
    : [...inviteEmploymentTracks];
}

export function AdminIntakesPage() {
  const searchParams = useSearchParams();
  const [items, setItems] = useState<AdminListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingItems, setPendingItems] = useState<PendingSubmissionItem[]>([]);
  const [pendingDisplayActive, setPendingDisplayActive] = useState(false);
  const [inviteLoading, setInviteLoading] = useState<null | "pledge" | "employment_contract">(null);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [inviteResult, setInviteResult] = useState<QrHistoryEntry | null>(null);
  const [shareBaseUrl, setShareBaseUrl] = useState("");
  const [viewerRole, setViewerRole] = useState<ViewerRole>("hq_admin");
  const [selectedStoreName, setSelectedStoreName] = useState<string>("all");
  const [selectedEmploymentCategory, setSelectedEmploymentCategory] = useState<string>("all");
  const [selectedDocumentFilter, setSelectedDocumentFilter] =
    useState<DocumentFilterValue>("all");
  const [selectedPledgeStoreId, setSelectedPledgeStoreId] = useState<string>("");
  const [selectedPledgeEmploymentTerm, setSelectedPledgeEmploymentTerm] =
    useState<PledgeEmploymentTerm>("fixed_term");
  const [selectedContractStoreId, setSelectedContractStoreId] = useState<string>("");
  const [selectedContractTrack, setSelectedContractTrack] = useState<InviteEmploymentTrack>("part_time");
  const [rowActionLoading, setRowActionLoading] = useState<string | null>(null);
  const [rowActionDialog, setRowActionDialog] = useState<{
    intakeId: string;
    fullName: string;
    documentType: AdminRowDocumentType;
    action: AdminRowDocumentAction;
    reason: string;
  } | null>(null);
  const [permissions, setPermissions] = useState({
    canViewBankAccount: true,
    canViewMyNumber: true,
    canInvite: true,
    restrictToStore: false,
  });

  async function loadList() {
    try {
      setLoading(true);
      setError(null);
      const query = searchParams.toString();
      const response = await fetch(
        `/api/admin/intakes${query ? `?${query}` : ""}`,
      );
      if (!response.ok) {
        throw new Error("一覧の取得に失敗しました");
      }
      const json = (await response.json()) as {
        viewerRole: ViewerRole;
        permissions: typeof permissions;
        items: AdminListItem[];
        pendingItems?: PendingSubmissionItem[];
        pendingDisplayActive?: boolean;
      };
      setViewerRole(json.viewerRole);
      setPermissions(json.permissions);
      setItems(json.items);
      setPendingItems(json.pendingItems ?? []);
      setPendingDisplayActive(Boolean(json.pendingDisplayActive));
    } catch (err) {
      setError(err instanceof Error ? err.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadList();
  }, [searchParams]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setShareBaseUrl(window.location.origin);
  }, []);

  const activeStoreNames = useMemo(
    () => Array.from(new Set([...items.map((item) => item.storeName), ...pendingItems.map((item) => item.storeName)])).sort((a, b) => a.localeCompare(b, "ja")),
    [items, pendingItems],
  );

  const currentStoreId = searchParams.get("storeId");

  const visibleInviteStoreOptions = useMemo(() => {
    if (viewerRole !== "store_admin") {
      return inviteStoreOptions;
    }

    if (currentStoreId) {
      const matched = inviteStoreOptionMap.get(currentStoreId);
      if (matched) {
        return [matched];
      }
    }

    const allowedNames = new Set(activeStoreNames);
    return inviteStoreOptions.filter((option) => allowedNames.has(option.name));
  }, [activeStoreNames, currentStoreId, viewerRole]);

  useEffect(() => {
    if (!visibleInviteStoreOptions.length) {
      setSelectedPledgeStoreId("");
      setSelectedContractStoreId("");
      return;
    }

    setSelectedPledgeStoreId((current) =>
      visibleInviteStoreOptions.some((option) => option.id === current)
        ? current
        : visibleInviteStoreOptions[0]?.id ?? "",
    );

    setSelectedContractStoreId((current) =>
      visibleInviteStoreOptions.some((option) => option.id === current)
        ? current
        : visibleInviteStoreOptions[0]?.id ?? "",
    );
  }, [visibleInviteStoreOptions]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const storeMatches =
        selectedStoreName === "all" || item.storeName === selectedStoreName;
      const employmentMatches =
        selectedEmploymentCategory === "all" ||
        item.employmentCategoryLabel === selectedEmploymentCategory;
      const documentMatches = matchesDocumentFilter(
        item.documentTypes ?? [],
        selectedDocumentFilter,
      );

      return storeMatches && employmentMatches && documentMatches;
    });
  }, [items, selectedDocumentFilter, selectedEmploymentCategory, selectedStoreName]);

  const filteredPendingItems = useMemo(() => {
    return pendingItems.filter((item) => {
      const storeMatches =
        selectedStoreName === "all" || item.storeName === selectedStoreName;
      const employmentMatches =
        selectedEmploymentCategory === "all" ||
        item.employmentCategoryLabel === selectedEmploymentCategory;
      const documentMatches =
        selectedDocumentFilter === "all" ||
        (selectedDocumentFilter === "pledge" && item.documentLabel === "誓約書") ||
        (selectedDocumentFilter === "employment_contract" &&
          item.documentLabel === "雇用契約書");

      return storeMatches && employmentMatches && documentMatches;
    });
  }, [pendingItems, selectedDocumentFilter, selectedEmploymentCategory, selectedStoreName]);

  const employmentCategoryOptions = useMemo(
    () =>
      Array.from(
        new Set(
          [...items, ...pendingItems]
            .map((item) => item.employmentCategoryLabel)
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort((a, b) => a.localeCompare(b, "ja")),
    [items, pendingItems],
  );

  const groupedItems = useMemo(
    () =>
      activeStoreNames
        .map((storeName) => ({
          storeName,
          items: filteredItems.filter((item) => item.storeName === storeName),
        }))
        .filter((group) => group.items.length > 0),
    [filteredItems, activeStoreNames],
  );

  const groupedPendingItems = useMemo(
    () =>
      activeStoreNames
        .map((storeName) => ({
          storeName,
          items: filteredPendingItems.filter((item) => item.storeName === storeName),
        }))
        .filter((group) => group.items.length > 0),
    [filteredPendingItems, activeStoreNames],
  );

  const summaryCards = useMemo(
    () => [
      {
        label: "提出待ち",
        value: filteredPendingItems.length,
        tone: "bg-rose-50 text-rose-900",
      },
      {
        label: "表示中の提出",
        value: filteredItems.length,
        tone: "bg-slate-50 text-slate-900",
      },
      {
        label: "要再提出",
        value: filteredItems.filter((item) => item.resubmissionState === "要再提出").length,
        tone: "bg-amber-50 text-amber-900",
      },
      {
        label: "無効化",
        value: filteredItems.filter((item) => item.resubmissionState === "無効化").length,
        tone: "bg-slate-100 text-slate-900",
      },
      {
        label: "更新署名済み",
        value: filteredItems.filter((item) => item.latestRenewalStatus === "signed").length,
        tone: "bg-emerald-50 text-emerald-900",
      },
      {
        label: "表示店舗数",
        value: groupedItems.length,
        tone: "bg-sky-50 text-sky-900",
      },
    ],
    [filteredItems, filteredPendingItems.length, groupedItems.length],
  );

  function saveQrHistory(entry: QrHistoryEntry) {
    if (typeof window === "undefined") {
      return;
    }

    const raw = window.localStorage.getItem(QR_HISTORY_STORAGE_KEY);
    const current = raw ? (JSON.parse(raw) as QrHistoryEntry[]) : [];
    const next = [entry, ...current.filter((item) => item.url !== entry.url)].slice(0, 120);
    window.localStorage.setItem(QR_HISTORY_STORAGE_KEY, JSON.stringify(next));
  }

  async function issueInvite(params: {
    kind: "pledge" | "employment_contract";
    storeId: string;
    flowKind: InviteFlowKind;
    employmentTrack: InviteEmploymentTrack;
    pledgeEmploymentTerm?: PledgeEmploymentTerm;
  }) {
    try {
      setInviteLoading(params.kind);
      setError(null);
      setSaveMessage(null);
      setInviteResult(null);

      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 5);

      const query = searchParams.toString();
      const response = await fetch(
        `/api/admin/intakes/invite${query ? `?${query}` : ""}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inviteEmail: `${params.kind}.${params.storeId}@qr.local`,
            storeId: params.storeId,
            expiresAt: expiresAt.toISOString(),
            documentTypes:
              params.flowKind === "employment_contract"
                ? ["employment_contract"]
                : params.pledgeEmploymentTerm === "retirement"
                  ? ["retirement_pledge"]
                  : ["employee_pledge", "sns_pledge"],
            flowKind: params.flowKind,
            employmentTrack: params.employmentTrack ?? "part_time",
            pledgeEmploymentTerm: params.pledgeEmploymentTerm,
          }),
        },
      );

      const json = (await response.json()) as
        | {
            intakeToken?: string;
            flowPath?: string;
            error?: { message?: string };
          }
        | undefined;

      if (!response.ok) {
        throw new Error(json?.error?.message ?? "QR発行に失敗しました");
      }

      const baseUrl = shareBaseUrl || window.location.origin;
      const rawFlowPath =
        json?.flowPath ??
        (params.flowKind === "employment_contract"
          ? `/employment-contracts/${json?.intakeToken ?? ""}`
          : `/intakes/${json?.intakeToken ?? ""}`);
      const flowPath =
        params.kind === "pledge" && params.pledgeEmploymentTerm
          ? `${rawFlowPath}?pledgeTerm=${params.pledgeEmploymentTerm}`
          : rawFlowPath;
      const storeName =
        inviteStoreOptions.find((option) => option.id === params.storeId)?.name ?? params.storeId;

      const historyEntry: QrHistoryEntry = {
        kind: params.kind,
        label:
          params.kind === "pledge"
            ? `${pledgeEmploymentTermLabels[params.pledgeEmploymentTerm ?? "fixed_term"]} 誓約書QR`
            : `${inviteEmploymentTrackLabels[params.employmentTrack]} 雇用契約書QR`,
        url: `${baseUrl}${flowPath}`,
        storeName,
        generatedAt: new Date().toISOString(),
      };

      setInviteResult(historyEntry);
      saveQrHistory(historyEntry);

      await loadList();
    } catch (err) {
      setError(err instanceof Error ? err.message : "QR発行に失敗しました");
    } finally {
      setInviteLoading(null);
    }
  }

  async function markRowReviewed(intakeId: string) {
    try {
      setRowActionLoading(`${intakeId}:review`);
      setError(null);
      setSaveMessage(null);

      const query = searchParams.toString();
      const response = await fetch(
        `/api/admin/intakes/${intakeId}/review${query ? `?${query}` : ""}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ note: "一覧画面で確認済みに更新" }),
        },
      );

      const json = (await response.json().catch(() => null)) as
        | {
            error?: { message?: string };
            notification?: {
              provider?: string;
              delivered?: boolean;
              attempted?: boolean;
              error?: string;
            };
          }
        | null;

      if (!response.ok) {
        throw new Error(json?.error?.message ?? "確認済みへの更新に失敗しました");
      }

      await loadList();
      setSaveMessage("提出内容を確認済みにしました。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "確認済みへの更新に失敗しました");
    } finally {
      setRowActionLoading(null);
    }
  }

  async function runRowDocumentAction() {
    if (!rowActionDialog?.reason.trim()) {
      return;
    }

    try {
      setRowActionLoading(`${rowActionDialog.intakeId}:${rowActionDialog.action}:${rowActionDialog.documentType}`);
      setError(null);
      setSaveMessage(null);

      const query = searchParams.toString();
      const response = await fetch(
        `/api/admin/intakes/${rowActionDialog.intakeId}/documents/${rowActionDialog.documentType}/${rowActionDialog.action}${query ? `?${query}` : ""}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reason: rowActionDialog.reason.trim() }),
        },
      );

      const json = (await response.json().catch(() => null)) as
        | {
            error?: { message?: string };
            notification?: {
              provider?: string;
              delivered?: boolean;
              attempted?: boolean;
              error?: string;
            };
          }
        | null;

      if (!response.ok) {
        throw new Error(
          json?.error?.message ??
            (rowActionDialog.action === "return"
              ? "差し戻しに失敗しました"
              : "無効化に失敗しました"),
        );
      }

      const notification = json?.notification;
      const notificationMessage =
        rowActionDialog.action === "return" && notification?.delivered
          ? "本人へ通知メールを送信しました。"
          : rowActionDialog.action === "return" && notification?.provider === "console"
            ? "本人通知は開発用プレビューとして記録しました。"
            : rowActionDialog.action === "return" && notification?.provider === "skipped"
              ? "通知先メールアドレスが未設定のため、メール送信はスキップされました。"
              : rowActionDialog.action === "return" && notification?.error
                ? `本人通知は送信できませんでした（${notification.error}）。`
                : "";

      setSaveMessage(
        rowActionDialog.action === "return"
          ? `${getRowDocumentTypeLabel(rowActionDialog.documentType)}を差し戻しました。${notificationMessage}`
          : `${getRowDocumentTypeLabel(rowActionDialog.documentType)}を無効化しました。`,
      );
      setRowActionDialog(null);
      await loadList();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : rowActionDialog.action === "return"
            ? "差し戻しに失敗しました"
            : "無効化に失敗しました",
      );
    } finally {
      setRowActionLoading(null);
    }
  }

  function handleRowActionSelect(item: AdminListItem, value: AdminRowActionValue | "") {
    if (!value) {
      return;
    }

    if (value === "review") {
      void markRowReviewed(item.id);
      return;
    }

    const [action, documentType] = value.split(":") as [
      AdminRowDocumentAction,
      AdminRowDocumentType,
    ];

    setRowActionDialog({
      intakeId: item.id,
      fullName: item.fullName,
      documentType,
      action,
      reason: "",
    });
  }

  async function handlePledgeQrClick(
    storeId: string,
    pledgeEmploymentTerm: PledgeEmploymentTerm,
  ) {
    await issueInvite({
      kind: "pledge",
      storeId,
      flowKind: "onboarding",
      employmentTrack: pledgeTermEmploymentTracks[pledgeEmploymentTerm],
      pledgeEmploymentTerm,
    });
  }

  async function handleEmploymentContractQrClick(
    storeId: string,
    employmentTrack: InviteEmploymentTrack,
  ) {
    await issueInvite({
      kind: "employment_contract",
      storeId,
      flowKind: "employment_contract",
      employmentTrack,
    });
  }

  function buildQrBulkPrintHref(kind: "pledge" | "employment_contract") {
    const params = new URLSearchParams(searchParams.toString());
    params.set("kind", kind);
    return `/admin/qr-bulk-print?${params.toString()}`;
  }

  return (
    <AdminShell
      title="提出一覧"
      description="店舗ごとの提出状況と雇用契約の進行状況を一覧で確認できます。必要に応じてQR発行や詳細確認もここから行います。"
    >
      <div className="flex flex-col">
      <section className="order-0 mb-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <RoleBadge role={viewerRole} />
          <PermissionBadge
            label="口座情報"
            enabled={permissions.canViewBankAccount}
          />
          <PermissionBadge
            label="マイナンバー"
            enabled={permissions.canViewMyNumber}
          />
          <PermissionBadge label="招待作成" enabled={permissions.canInvite} />
        </div>
      </section>

      {permissions.canInvite ? (
        <section className="order-5 mb-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold text-slate-500">店舗配布用QR</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                誓約書QR / 雇用契約書QR
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <p className="text-sm leading-7 text-slate-600">
                  各店舗に印刷して置いておけるよう、用途ごとに固定QRを発行します。現場では QRを読み取ってもらうだけで入力画面へ案内できます。
                </p>
                <Link
                  href={`/admin/qr-library${searchParams.toString() ? `?${searchParams.toString()}` : ""}`}
                  className="shrink-0 rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                >
                  QR一覧を見る
                </Link>
                <Link
                  href={buildQrBulkPrintHref("pledge")}
                  className="shrink-0 rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-900 transition hover:border-amber-400 hover:bg-amber-100"
                >
                  誓約書QRをまとめて印刷
                </Link>
                <Link
                  href={buildQrBulkPrintHref("employment_contract")}
                  className="shrink-0 rounded-full border border-sky-300 bg-sky-50 px-4 py-2 text-xs font-semibold text-sky-900 transition hover:border-sky-400 hover:bg-sky-100"
                >
                  雇用契約書QRをまとめて印刷
                </Link>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">誓約書QRは店舗ごとに発行</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">雇用契約書QRは店舗・雇用区分ごとに発行</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">印刷して店頭掲示に利用可能</span>
              </div>
            </div>
            {inviteResult ? (
              <div className="rounded-[1.75rem] border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white px-5 py-5 text-sm text-emerald-800 shadow-sm lg:max-w-md">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-emerald-950">{inviteResult.label}を発行しました</p>
                    <p className="mt-1 text-xs text-emerald-900/80">対象店舗： {inviteResult.storeName}</p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold tracking-[0.18em] text-emerald-900">READY</span>
                </div>
                <div className="mt-3 rounded-2xl border border-emerald-100 bg-white/80 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">リンクURL</p>
                  <p className="mt-2 break-all text-xs leading-6 text-slate-700">{inviteResult.url}</p>
                </div>
                <div className="mt-4 rounded-2xl bg-white p-3">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
                      inviteResult.url,
                    )}`}
                    alt={`${inviteResult.label}のQRコード`}
                    className="mx-auto h-48 w-48"
                  />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <a
                    href={inviteResult.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-emerald-300 bg-emerald-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-800"
                  >
                    入力画面を開く
                  </a>
                  <Link
                    href={{
                      pathname: "/admin/qr-print",
                      query: {
                        label: inviteResult.label,
                        store: inviteResult.storeName,
                        url: inviteResult.url,
                      },
                    }}
                    className="rounded-full border border-emerald-300 bg-white px-4 py-2 text-xs font-semibold text-emerald-900 transition hover:border-emerald-400 hover:bg-emerald-100"
                  >
                    印刷用ページ / 印刷用ページ / PDF化
                  </Link>
                </div>
                <p className="mt-3 text-xs leading-6 text-emerald-900/80">
                  スマホで読み取る場合は、`localhost` ではなく同じWi-Fiから見えるURLをベースにしてください。印刷用ページ / PDF化ボタンから印刷画面を開き、ブラウザの印刷機能でPDF保存できます。
                </p>
              </div>
            ) : null}
          </div>

          <label className="mt-6 block">
            <span className="mb-2 block text-sm font-medium text-slate-700">
              スマホ共有用ベースURL
            </span>
            <input
              value={shareBaseUrl}
              onChange={(event) => setShareBaseUrl(event.target.value)}
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-cyan-100"
              placeholder="例: http://10.32.1.72:3001"
            />
            <p className="mt-2 text-xs leading-6 text-slate-500">
              スマホでQRを読む場合は、同じWi-Fiから見えるURLを指定してください。今 `localhost`
              で開いている場合、そのままだとスマホでは開けません。
            </p>
          </label>

          <div className="mt-6 space-y-6">
            {viewerRole === "hq_admin" ? (
              <div className="grid gap-4 xl:grid-cols-2">
                <section className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm font-semibold text-slate-500">入社時共通</p>
                  <h3 className="mt-2 text-xl font-semibold text-slate-900">誓約書QR</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    店舗を選んで、誓約書とSNS誓約書の入力フローへ入る固定QRを表示します。
                  </p>

                  <div className="mt-5 space-y-4">
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">対象店舗</span>
                      <select
                        value={selectedPledgeStoreId}
                        onChange={(event) => {
                          const nextStoreId = event.target.value;
                          setSelectedPledgeStoreId(nextStoreId);
                          if (!getPledgeEmploymentTermsForStore(nextStoreId).includes(selectedPledgeEmploymentTerm)) {
                            setSelectedPledgeEmploymentTerm("fixed_term");
                          }
                        }}
                        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-cyan-100"
                      >
                        {visibleInviteStoreOptions.map((option) => (
                          <option key={`pledge-option-${option.id}`} value={option.id}>
                            {option.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">誓約書区分</span>
                      <select
                        value={selectedPledgeEmploymentTerm}
                        onChange={(event) =>
                          setSelectedPledgeEmploymentTerm(event.target.value as PledgeEmploymentTerm)
                        }
                        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-cyan-100"
                      >
                        {getPledgeEmploymentTermsForStore(selectedPledgeStoreId).map((term) => (
                          <option key={`pledge-term-${term}`} value={term}>
                            {pledgeEmploymentTermLabels[term]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        selectedPledgeStoreId &&
                        void handlePledgeQrClick(selectedPledgeStoreId, selectedPledgeEmploymentTerm)
                      }
                      disabled={inviteLoading !== null || !selectedPledgeStoreId}
                      className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                    >
                      {inviteLoading === "pledge" ? "発行中..." : "誓約書QRを表示"}
                    </button>
                  </div>
                </section>

                <section className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm font-semibold text-slate-500">契約更新・雇用条件確認</p>
                  <h3 className="mt-2 text-xl font-semibold text-slate-900">雇用契約書QR</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    店舗と雇用区分を選んで、雇用契約更新フロー用QRを表示します。
                  </p>

                  <div className="mt-5 space-y-4">
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">対象店舗</span>
                      <select
                        value={selectedContractStoreId}
                        onChange={(event) => {
                          const nextStoreId = event.target.value;
                          setSelectedContractStoreId(nextStoreId);
                          if (
                            !getEmploymentContractTracksForStore(nextStoreId).includes(
                              selectedContractTrack,
                            )
                          ) {
                            setSelectedContractTrack("part_time");
                          }
                        }}
                        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-cyan-100"
                      >
                        {visibleInviteStoreOptions.map((option) => (
                          <option key={`contract-option-${option.id}`} value={option.id}>
                            {option.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">雇用区分</span>
                      <select
                        value={selectedContractTrack}
                        onChange={(event) => setSelectedContractTrack(event.target.value as InviteEmploymentTrack)}
                        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-cyan-100"
                      >
                        {getEmploymentContractTracksForStore(selectedContractStoreId).map((track) => (
                          <option key={`track-${track}`} value={track}>
                            {inviteEmploymentTrackLabels[track]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        selectedContractStoreId &&
                        void handleEmploymentContractQrClick(selectedContractStoreId, selectedContractTrack)
                      }
                      disabled={inviteLoading !== null || !selectedContractStoreId}
                      className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50"
                    >
                      {inviteLoading === "employment_contract" ? "発行中..." : "雇用契約書QRを表示"}
                    </button>
                  </div>
                </section>
              </div>
            ) : (
              <>
                <section className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm font-semibold text-slate-500">入社時共通</p>
                  <h3 className="mt-2 text-xl font-semibold text-slate-900">誓約書QR</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    店舗ごとに、誓約書とSNS誓約書の入力フローへ入る固定QRをそのまま表示します。
                  </p>

                  <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {visibleInviteStoreOptions.map((option) => (
                      <article
                        key={`pledge-${option.id}`}
                        className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm"
                      >
                        <p className="text-sm font-semibold text-slate-900">{option.name}</p>
                        <p className="mt-1 text-xs leading-6 text-slate-500">
                          入社時に読み取ってもらう誓約書QRです。
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {getPledgeEmploymentTermsForStore(option.id).map((term) => (
                            <button
                              key={`${option.id}-${term}`}
                              type="button"
                              onClick={() => void handlePledgeQrClick(option.id, term)}
                              disabled={inviteLoading !== null}
                              className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                            >
                              {inviteLoading === "pledge"
                                ? "発行中..."
                                : `${pledgeEmploymentTermLabels[term]}QR`}
                            </button>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>

                <section className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm font-semibold text-slate-500">契約更新・雇用条件確認</p>
                  <h3 className="mt-2 text-xl font-semibold text-slate-900">雇用契約書QR</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    店舗ごとに、雇用区分別の雇用契約更新フロー用QRをそのまま表示します。
                  </p>

                  <div className="mt-5 grid gap-4 xl:grid-cols-2">
                    {visibleInviteStoreOptions.map((option) => (
                      <article
                        key={`contract-${option.id}`}
                        className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm"
                      >
                        <p className="text-base font-semibold text-slate-900">{option.name}</p>
                        <p className="mt-1 text-xs leading-6 text-slate-500">
                          必要な雇用区分を選んで、店舗掲示用のQRを表示します。
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {getEmploymentContractTracksForStore(option.id).map((track) => (
                            <button
                              key={`${option.id}-${track}`}
                              type="button"
                              onClick={() => void handleEmploymentContractQrClick(option.id, track)}
                              disabled={inviteLoading !== null}
                              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50"
                            >
                              {inviteLoading === "employment_contract"
                                ? "発行中..."
                                : `${inviteEmploymentTrackLabels[track]}QR`}
                            </button>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              </>
            )}
          </div>
        </section>
      ) : (
        <section className="order-5 mb-6 rounded-[2rem] border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600 shadow-sm">
          現在の権限では招待リンクを発行できません。
        </section>
      )}

      {viewerRole === "hq_admin" ? (
        <section className="order-1 mb-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500">店舗別表示</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">
                店舗ごとに提出書類を確認
              </h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                本部管理者は、一覧を店舗単位で絞り込んで、各店舗から上がってきた誓約書や雇用契約書を確認できます。
              </p>
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
                  {allStoreNames.map((storeName) => (
                    <option key={storeName} value={storeName}>
                      {storeName}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">雇用区分で絞り込む</span>
                <select
                  value={selectedEmploymentCategory}
                  onChange={(event) => setSelectedEmploymentCategory(event.target.value)}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-cyan-100"
                >
                  <option value="all">全区分</option>
                  {employmentCategoryOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block lg:col-span-2">
                <span className="mb-2 block text-sm font-medium text-slate-700">書類種別で絞り込む</span>
                <select
                  value={selectedDocumentFilter}
                  onChange={(event) =>
                    setSelectedDocumentFilter(event.target.value as DocumentFilterValue)
                  }
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-cyan-100"
                >
                  <option value="all">全書類</option>
                  <option value="pledge">誓約書</option>
                  <option value="employment_contract">雇用契約書</option>
                </select>
              </label>
            </div>
          </div>
        </section>
      ) : null}

      <section className="order-2 mb-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
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

      <section className="order-3 mb-6 rounded-[2rem] border border-rose-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-rose-100 pb-4">
          <div>
            <p className="text-sm font-semibold text-rose-500">提出対象</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">
              {viewerRole === "hq_admin" ? "提出待ち一覧" : "自店舗の提出待ち一覧"}
            </h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              提出時期が来ていて、まだ誓約書または雇用契約書が未提出の人を表示しています。6/1〜、12/1〜の提出期間に表示され、提出が完了するとこの一覧から外れます。
            </p>
          </div>
          <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-900">
            {filteredPendingItems.length}名
          </span>
        </div>

        <div className="mt-5 space-y-4">
          {groupedPendingItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
              {pendingDisplayActive
                ? "現在、提出待ちの対象者はいません。"
                : "提出待ち一覧は6/1〜、12/1〜の提出期間に表示されます。現在は表示期間外です。"}
            </div>
          ) : (
            groupedPendingItems.map((group) => (
              <section key={`pending-${group.storeName}`} className="overflow-hidden rounded-[1.5rem] border border-rose-100">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rose-100 bg-rose-50 px-5 py-4">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">{group.storeName}</h3>
                    <p className="text-xs text-slate-500">提出待ち {group.items.length} 名</p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-rose-700 ring-1 ring-rose-200">
                    提出待ち
                  </span>
                </div>
                <div className="divide-y divide-rose-50">
                  {group.items.map((item) => (
                    <article key={item.id} className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-base font-semibold text-slate-900">{item.fullName}</p>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            {item.employmentCategoryLabel}
                          </span>
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-rose-700 ring-1 ring-rose-200">
                            {item.documentLabel}
                          </span>
                          <PendingStateBadge state={item.state} />
                        </div>
                        <p className="mt-2 text-sm text-slate-600">
                          {item.dueLabel}
                          {item.note ? ` / ${item.note}` : ""}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </section>

      <section className="order-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        {error ? (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {saveMessage ? (
          <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {saveMessage}
          </div>
        ) : null}

        {loading ? (
          <p className="text-sm text-slate-500">読み込み中です...</p>
        ) : (
          <div className="space-y-6">
            {groupedItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                まだデータがありません。
              </div>
            ) : (
              groupedItems.map((group) => (
                <section
                  key={group.storeName}
                  className="overflow-hidden rounded-[1.5rem] border border-slate-200"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">
                        {group.storeName}
                      </h3>
                      <p className="text-xs text-slate-500">
                        提出件数 {group.items.length} 件
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                      提出一覧
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500">
                          <th className="px-4 py-3 font-medium">氏名</th>
                          <th className="px-4 py-3 font-medium">雇用区分</th>
                          <th className="px-4 py-3 font-medium">状態</th>
                          <th className="px-4 py-3 font-medium">提出日</th>
                          <th className="px-4 py-3 font-medium">提出済み書類</th>
                          <th className="px-4 py-3 font-medium">再提出対応</th>
                          <th className="px-4 py-3 font-medium">最新更新期間</th>
                          <th className="px-4 py-3 font-medium">更新状態</th>
                          <th className="px-4 py-3 font-medium">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.items.map((item) => (
                          <tr key={item.id} className="border-b border-slate-100">
                            <td className="px-4 py-4 text-slate-900">{item.fullName}</td>
                            <td className="px-4 py-4 text-slate-600">
                              {item.employmentCategoryLabel ?? "-"}
                            </td>
                            <td className="px-4 py-4">
                              <span className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${getIntakeStatusBadgeClass(item.status)}`}>
                                {formatIntakeStatus(item.status)}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-slate-600">
                              {item.submittedAt
                                ? new Date(item.submittedAt).toLocaleString("ja-JP")
                                : "-"}
                            </td>
                            <td className="px-4 py-4 text-slate-600">
                              {formatSubmittedDocumentSummary(
                                item.documentTypes ?? [],
                                item.documentCount,
                              )}
                            </td>
                            <td className="px-4 py-4">
                              <ResubmissionBadge
                                state={item.resubmissionState}
                                status={item.status}
                              />
                            </td>
                            <td className="px-4 py-4 text-slate-600">
                              {item.latestRenewalPeriod ?? "-"}
                            </td>
                            <td className="px-4 py-4">
                              <span className="inline-flex whitespace-nowrap rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-900">
                                {formatRenewalStatus(item.latestRenewalStatus)}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex flex-wrap gap-2">
                                <a
                                  href={getAdminPdfHref({
                                    item,
                                    documentFilter: selectedDocumentFilter,
                                    query: searchParams.toString(),
                                  })}
                                  className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                                >
                                  PDFを見る
                                </a>
                                <button
                                  type="button"
                                  onClick={() => void markRowReviewed(item.id)}
                                  disabled={
                                    item.status === "reviewed" ||
                                    rowActionLoading?.startsWith(`${item.id}:`)
                                  }
                                  className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {item.status === "reviewed" ? "確認済み" : "確認済みにする"}
                                </button>
                                <select
                                  value=""
                                  onChange={(event) =>
                                    handleRowActionSelect(
                                      item,
                                      event.target.value as AdminRowActionValue | "",
                                    )
                                  }
                                  disabled={rowActionLoading?.startsWith(`${item.id}:`)}
                                  className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 outline-none transition hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50"
                                >
                                  <option value="">誓約書操作</option>
                                  <option value="return:employee_pledge">誓約書を差し戻し</option>
                                  <option value="return:sns_pledge">SNS誓約書を差し戻し</option>
                                  <option value="return:retirement_pledge">退職時誓約書を差し戻し</option>
                                  <option value="invalidate:employee_pledge">誓約書を無効化</option>
                                  <option value="invalidate:sns_pledge">SNS誓約書を無効化</option>
                                  <option value="invalidate:retirement_pledge">退職時誓約書を無効化</option>
                                </select>
                                <select
                                  value=""
                                  onChange={(event) =>
                                    handleRowActionSelect(
                                      item,
                                      event.target.value as AdminRowActionValue | "",
                                    )
                                  }
                                  disabled={rowActionLoading?.startsWith(`${item.id}:`)}
                                  className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 outline-none transition hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50"
                                >
                                  <option value="">雇用契約書操作</option>
                                  <option value="return:employment_contract">雇用契約書を差し戻し</option>
                                  <option value="invalidate:employment_contract">雇用契約書を無効化</option>
                                </select>
                                <Link
                                  href={`/admin/intakes/${item.id}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`}
                                  className="rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-white transition hover:bg-slate-800"
                                >
                                  詳細を見る
                                </Link>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ))
            )}
          </div>
        )}
      </section>

      {rowActionDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6">
          <div className="w-full max-w-lg rounded-[2rem] bg-white p-6 shadow-2xl">
            <p className="text-sm font-semibold text-slate-500">文書操作</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">
              {rowActionDialog.fullName}さんの
              {getRowDocumentTypeLabel(rowActionDialog.documentType)}を
              {getRowDocumentActionLabel(rowActionDialog.action)}
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              理由を入力して実行してください。一覧画面からそのまま処理できるので、
              詳細画面を開かずに確認作業を進められます。
            </p>
            <label className="mt-5 block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                理由
              </span>
              <textarea
                value={rowActionDialog.reason}
                onChange={(event) =>
                  setRowActionDialog((current) =>
                    current
                      ? {
                          ...current,
                          reason: event.target.value,
                        }
                      : current,
                  )
                }
                className="min-h-32 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-cyan-100"
                placeholder="例: 記入内容に不備があるため、再提出をお願いします。"
              />
            </label>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setRowActionDialog(null)}
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={() => void runRowDocumentAction()}
                disabled={
                  !rowActionDialog.reason.trim() || rowActionLoading !== null
                }
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                {rowActionLoading
                  ? "処理中..."
                  : `${getRowDocumentActionLabel(rowActionDialog.action)}を実行`}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      </div>
    </AdminShell>
  );
}

function matchesDocumentFilter(
  documentTypes: AdminRowDocumentType[],
  filter: DocumentFilterValue,
) {
  if (filter === "all") {
    return true;
  }

  if (filter === "pledge") {
    return documentTypes.some(
      (documentType) =>
        documentType === "employee_pledge" ||
        documentType === "sns_pledge" ||
        documentType === "retirement_pledge",
    );
  }

  return documentTypes.includes("employment_contract");
}

function getAdminPdfHref(params: {
  item: AdminListItem;
  documentFilter: DocumentFilterValue;
  query: string;
}) {
  const documentTypes = params.item.documentTypes ?? [];
  const hasEmploymentContract = documentTypes.includes("employment_contract");
  const hasPledge = documentTypes.some(
    (documentType) =>
      documentType === "employee_pledge" ||
      documentType === "sns_pledge" ||
      documentType === "retirement_pledge",
  );
  const shouldOpenEmploymentContract =
    hasEmploymentContract &&
    Boolean(params.item.intakeToken) &&
    (params.documentFilter === "employment_contract" || !hasPledge);

  if (shouldOpenEmploymentContract) {
    return `/employment-contracts/${params.item.intakeToken}/print`;
  }

  if (params.item.pdfUrl) {
    return `${params.item.pdfUrl}${params.query && params.item.pdfUrl.startsWith("/admin/")
      ? `?${params.query}`
      : ""}`;
  }

  return `/admin/intakes/${params.item.id}/pdf${params.query ? `?${params.query}` : ""}`;
}

function getRowDocumentTypeLabel(documentType: AdminRowDocumentType) {
  if (documentType === "employee_pledge") return "誓約書";
  if (documentType === "sns_pledge") return "SNS誓約書";
  if (documentType === "retirement_pledge") return "退職時誓約書";
  return "雇用契約書";
}

function getSubmittedDocumentShortLabel(documentType: AdminRowDocumentType) {
  if (documentType === "employee_pledge") return "誓約書";
  if (documentType === "sns_pledge") return "SNS";
  if (documentType === "retirement_pledge") return "退職時";
  return "雇用契約書";
}

function formatSubmittedDocumentSummary(
  documentTypes: AdminRowDocumentType[],
  documentCount: number,
) {
  if (!documentTypes.length) {
    return `${documentCount}件`;
  }

  const labels = documentTypes.map(getSubmittedDocumentShortLabel);
  return `${documentTypes.length}件（${labels.join("・")}）`;
}

function getRowDocumentActionLabel(action: AdminRowDocumentAction) {
  return action === "return" ? "差し戻し" : "無効化";
}

function formatIntakeStatus(status: string) {
  if (status === "sent") return "未提出";
  if (status === "started" || status === "in_progress") return "入力中";
  if (status === "submitted") return "未確認";
  if (status === "reviewed") return "確認済み";
  if (status === "returned") return "差し戻し中";
  if (status === "expired") return "期限切れ";
  return status;
}

function getIntakeStatusBadgeClass(status: string) {
  if (status === "reviewed") return "bg-emerald-100 text-emerald-900";
  if (status === "returned") return "bg-amber-100 text-amber-900";
  if (status === "submitted") return "bg-sky-100 text-sky-900";
  if (status === "started" || status === "in_progress") return "bg-indigo-100 text-indigo-900";
  if (status === "expired") return "bg-rose-100 text-rose-900";
  return "bg-slate-100 text-slate-700";
}

function ResubmissionBadge({
  state,
  status,
}: {
  state?: ResubmissionState;
  status?: string;
}) {
  if (status === "reviewed" && state === "再提出済み") {
    return (
      <span className="inline-flex whitespace-nowrap rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900">
        対応完了
      </span>
    );
  }

  if (state === "要再提出") {
    return (
      <span className="inline-flex whitespace-nowrap rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
        要再提出
      </span>
    );
  }

  if (state === "再提出済み") {
    return (
      <span className="inline-flex whitespace-nowrap rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900">
        再提出済み
      </span>
    );
  }

  if (state === "無効化") {
    return (
      <span className="inline-flex whitespace-nowrap rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-800">
        無効化
      </span>
    );
  }

  return (
    <span className="inline-flex whitespace-nowrap rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
      なし
    </span>
  );
}

function formatRenewalStatus(
  status?: "sent" | "viewed" | "signed" | "expired",
) {
  if (!status) {
    return "未発行";
  }

  if (status === "sent") return "発行済み";
  if (status === "viewed") return "閲覧済み";
  if (status === "signed") return "署名済み";
  return "期限切れ";
}

function RoleBadge({ role }: { role: ViewerRole }) {
  const label =
    role === "hq_admin" ? "本部管理者" : "店舗責任者";

  return (
    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
      {label}
    </span>
  );
}

function PermissionBadge({
  label,
  enabled,
}: {
  label: string;
  enabled: boolean;
}) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium ${
        enabled
          ? "bg-emerald-100 text-emerald-900"
          : "bg-slate-100 text-slate-500"
      }`}
    >
      {label}: {enabled ? "可" : "不可"}
    </span>
  );
}


function PendingStateBadge({
  state,
}: {
  state: "pending" | "returned";
}) {
  if (state === "returned") {
    return (
      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
        差し戻し
      </span>
    );
  }

  return (
    <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-900">
      未提出
    </span>
  );
}
