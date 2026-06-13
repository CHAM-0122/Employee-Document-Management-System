"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { AdminShell } from "@/src/components/admin/admin-shell";
import type {
  EmploymentContractPayload,
  JobPositionOption,
} from "@/src/lib/intake-contracts/types";

type ConsentDetail = {
  documentType: string;
  version: string;
  consentedAt: string;
  ipAddress: string;
  adminState?: "active" | "returned" | "invalidated";
  adminStateReason?: string;
  adminStateChangedAt?: string;
  workflowState?: "active" | "returned" | "invalidated" | "resubmitted";
  resubmittedAt?: string;
};

type SignatureDetail = {
  signerName: string;
  signedDate: string;
  signedAt: string;
  ipAddress: string;
  signatureImageUrl: string;
};

type DocumentDetail = {
  documentKind: string;
  fileName: string;
  url: string;
};

type IntakeDetail = {
  viewerRole: "hq_admin" | "store_admin";
  permissions: {
    canViewBankAccount: boolean;
    canViewMyNumber: boolean;
    canEditEmploymentContract: boolean;
    canManageDocuments?: boolean;
  };
  id: string;
  intakeToken: string;
  status: string;
  storeName: string;
  fullName: string;
  email: string;
  phone: string;
  birthDate: string;
  currentAddress: string;
  photoDataUrl?: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  commuteMethod: string;
  workDaysPerWeek?: number;
  hasSecondJob: string;
  isStudent: boolean;
  isMinor: boolean;
  guardianName?: string;
  isForeignNational?: boolean;
  residenceCardFrontDataUrl?: string;
  residenceCardBackDataUrl?: string;
  employmentContract?: EmploymentContractPayload;
  jobPositions: JobPositionOption[];
  bankAccount?: {
    bankName: string;
    branchName: string;
    branchCode: string;
    accountType: string;
    accountNumberMasked: string;
    accountHolderKana: string;
    bankBookImageDataUrl?: string;
  };
  myNumber?: {
    purposeOfUseVersion: string;
    myNumberMasked: string;
  };
  consents: ConsentDetail[];
  signature?: SignatureDetail;
  documents: DocumentDetail[];
  renewalHistory: Array<{
    id: string;
    periodYear: number;
    periodHalf: 1 | 2;
    periodLabel: string;
    status: "sent" | "viewed" | "signed" | "expired";
    issuedAt: string;
    renewalUrl: string;
  }>;
};

function normalizeAdminTime(value: string | undefined, fallback: string) {
  const normalized = value?.trim().replace("：", ":");

  if (normalized && /^([01]\d|2[0-3]):([0-5]\d)$/.test(normalized)) {
    return normalized;
  }

  return fallback;
}

function isDateInputValue(value: string | undefined) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function getCurrentHalfYearStartDate(now = new Date()) {
  const year = now.getFullYear();
  return now.getMonth() + 1 <= 6 ? `${year}-01-01` : `${year}-07-01`;
}

function isPermanentPartTimeContract(contract: EmploymentContractPayload) {
  return (
    contract.employmentCategory === "part_time" &&
    contract.renewalPatternText === "期間の定めなし"
  );
}

function shouldRequireContractEndDate(contract: EmploymentContractPayload) {
  return (
    contract.employmentCategory !== "regular_employee" &&
    contract.renewalPatternText !== "期間の定めなし"
  );
}

const WORK_LOCATION_ADDRESSES: Record<string, string> = {
  "本部": "熊本市中央区南坪井町2-8",
  "壱之倉庫": "熊本市中央区南坪井2-8",
  "ヨコバチ": "熊本市中央区上通町11-40",
  "小坊主": "熊本市中央区上通町11-20",
  "おでん屋小坊主": "熊本市中央区上通町11-20",
  "赤組": "熊本市中央区上通町7-29",
  "ラーメン赤組": "熊本市中央区上通町7-29",
  "餃子屋弐ノ弐上通本店": "熊本市中央区上通町2ー2",
  "餃子屋弐ノ弐下通店": "熊本市中央区下通2-2",
  "餃子屋弐ノ弐中央店": "熊本市中央区下通1丁目3ー1 NADELビル1F・A号",
  "餃子屋弐ノ弐今泉店": "福岡市中央区今泉2丁目4-33 エステートモア今泉1F",
  "餃子屋弐ノ弐南天神店": "福岡市中央区今泉1丁目16-16",
  "餃子屋弐ノ弐明治通り店": "福岡市中央区大名2丁目9-5グランドビル1F",
  "餃子屋弐ノ弐川端店": "福岡市博多区上川端町5-108",
  "餃子屋弐ノ弐渡辺通店": "福岡市中央区渡辺通5丁目12-3",
  "餃子屋弐ノ弐薬院店": "福岡市中央区薬院3丁目16-35 大山ビル1F",
  "餃子屋弐ノ弐大名店": "福岡市中央区大名1丁目14-27 ネイビー大名1F",
  "餃子屋弐ノ弐ソラリアステージ店": "福岡市中央区天神2-11-3 ソラリアステージB2F",
  "餃子屋弐ノ弐博多駅地下街店": "福岡市博多区博多駅中央街1-1 博多ステーションビル地下街C8号",
  "餃子屋弐ノ弐袋町店": "広島市中区袋町4-1 袋町産業ビル1F",
  "餃子屋弐ノ弐宗右衛門町店": "大阪市中央区宗右衛門町6-7",
  "餃子屋弐ノ弐那覇店": "那覇市牧志2-4-7 1F",
  "餃子屋弐ノ弐牧志店": "那覇市牧志3-13-10",
  "餃子屋弐ノ弐清水工場": "熊本市北区室園2-16",
  "餃子屋弐ノ弐近見販売所": "熊本市南区近見3丁目9-1",
  "餃子弐ノ弐福岡工場": "福岡市中央区大名2-9-5 グランドビル1F",
  "餃子屋弐ノ弐警固店": "福岡市中央区警固2-11-15 内野第三警固ビル1F",
  "餃子屋弐ノ弐プラリバ店": "福岡市早良区西新4丁目1-1 PRALIVA B113号（地下1F）",
  "餃子屋弐ノ弐ペイペイドーム店": "福岡市中央区地行浜2丁目2-2 PayPayドーム区画番号B.S-2（4ゲート餃子屋弐ノ弐）",
  "餃子屋弐ノ弐新梅田食道街店": "大阪市北区角田町9-29 新梅田食道街内N1区画",
  "餃子屋弐ノ弐天満店": "大阪市北区天神橋5丁目8-22",
};

function resolveWorkLocationAddress(contract: EmploymentContractPayload) {
  const current = contract.workLocationAddress?.trim();

  if (current) {
    return current;
  }

  return WORK_LOCATION_ADDRESSES[contract.workLocationName] ?? "住所設定待ち";
}

function normalizeEmploymentContractForAdmin(
  contract: EmploymentContractPayload,
): EmploymentContractPayload {
  if (contract.employmentCategory !== "part_time") {
    return {
      ...contract,
      workLocationAddress: resolveWorkLocationAddress(contract),
      shiftStartTime: normalizeAdminTime(contract.shiftStartTime, "09:00"),
      shiftEndTime: normalizeAdminTime(contract.shiftEndTime, "18:00"),
      breakMinutes:
        typeof contract.breakMinutes === "number" && contract.breakMinutes > 0
          ? contract.breakMinutes
          : 60,
    };
  }

  return {
    ...contract,
    workLocationAddress: resolveWorkLocationAddress(contract),
    jobPositionCode: contract.jobPositionCode || "1",
    currentRoleLabel: contract.currentRoleLabel || "ウォッシャー",
    shiftStartTime: normalizeAdminTime(contract.shiftStartTime, "13:00"),
    shiftEndTime:
      !contract.shiftEndTime || contract.shiftEndTime === "24:00"
        ? "17:00"
        : normalizeAdminTime(contract.shiftEndTime, "17:00"),
    commutingAllowanceMonthly: undefined,
    commutingAllowanceNote: "400円/日 ※通勤した日数分支給する",
  };
}

export function AdminIntakeDetailPage({ id }: { id: string }) {
  const searchParams = useSearchParams();
  const [detail, setDetail] = useState<IntakeDetail | null>(null);
  const [employmentContract, setEmploymentContract] =
    useState<EmploymentContractPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingContract, setSavingContract] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [issuingRenewal, setIssuingRenewal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [renewalResult, setRenewalResult] = useState<{
    periodLabel: string;
    renewalUrl: string;
  } | null>(null);
  const [documentActionLoading, setDocumentActionLoading] = useState<
    string | null
  >(null);
  const [documentActionDialog, setDocumentActionDialog] = useState<{
    documentType: string;
    action: "return" | "invalidate";
    reason: string;
  } | null>(null);
  const displayedWorkDaysPerWeek =
    employmentContract?.workDaysPerWeek ?? detail?.workDaysPerWeek;
  const canManageDocuments =
    detail?.viewerRole === "hq_admin" || detail?.viewerRole === "store_admin";

  async function reloadDetail() {
    const query = searchParams.toString();
    const response = await fetch(
      `/api/admin/intakes/${id}${query ? `?${query}` : ""}`,
    );
    if (!response.ok) {
      throw new Error("詳細の取得に失敗しました");
    }
    const json = (await response.json()) as IntakeDetail;
    const normalizedContract = json.employmentContract
      ? normalizeEmploymentContractForAdmin(json.employmentContract)
      : null;
    setDetail(json);
    setEmploymentContract(normalizedContract);
  }

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        await reloadDetail();
      } catch (err) {
        setError(err instanceof Error ? err.message : "読み込みに失敗しました");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [id, searchParams]);

  useEffect(() => {
    if (!detail || !employmentContract) {
      return;
    }

    const selected = detail.jobPositions.find(
      (item) => item.code === employmentContract.jobPositionCode,
    );

    if (!selected) {
      return;
    }

    setEmploymentContract((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        currentRoleLabel: selected.name,
        basicSalaryMonthly: selected.basicSalaryMonthly,
        dutyAllowanceMonthly: selected.dutyAllowanceMonthly,
        fixedOvertimeHoursNote:
          selected.fixedOvertimeNote ?? current.fixedOvertimeHoursNote,
      };
    });
  }, [detail, employmentContract?.jobPositionCode]);

  async function saveEmploymentContract() {
    if (!employmentContract) {
      return;
    }

    try {
      setSavingContract(true);
      setError(null);
      setSaveMessage(null);

      const query = searchParams.toString();
      const normalizedContract =
        normalizeEmploymentContractForAdmin(employmentContract);
      const isPermanentPartTime = isPermanentPartTimeContract(normalizedContract);
      const contractForSave = isPermanentPartTime
        ? {
            ...normalizedContract,
            contractStartDate: isDateInputValue(normalizedContract.contractStartDate)
              ? normalizedContract.contractStartDate
              : getCurrentHalfYearStartDate(),
            contractEndDate: "期間の定めなし",
            renewalPatternText: "期間の定めなし",
          }
        : normalizedContract;

      if (
        !isPermanentPartTime &&
        !isDateInputValue(contractForSave.contractStartDate)
      ) {
        throw new Error("契約開始日を入力してください");
      }

      if (
        shouldRequireContractEndDate(contractForSave) &&
        !isDateInputValue(contractForSave.contractEndDate)
      ) {
        throw new Error("契約終了日を入力してください");
      }

      const response = await fetch(
        `/api/admin/intakes/${id}${query ? `?${query}` : ""}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(contractForSave),
        },
      );

      if (!response.ok) {
        const json = (await response.json().catch(() => null)) as
          | {
              error?: {
                message?: string;
                fields?: Record<string, string>;
              };
            }
          | null;
        const firstFieldMessage = json?.error?.fields
          ? Object.values(json.error.fields)[0]
          : undefined;
        throw new Error(
          firstFieldMessage ??
            json?.error?.message ??
            "雇用条件の保存に失敗しました",
        );
      }

      await reloadDetail();
      setSaveMessage("雇用条件を更新しました。従業員画面にも反映されます。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setSavingContract(false);
    }
  }

  async function issueRenewal() {
    try {
      setIssuingRenewal(true);
      setError(null);
      setSaveMessage(null);

      const query = searchParams.toString();
      const response = await fetch(
        `/api/admin/intakes/${id}/renewals${query ? `?${query}` : ""}`,
        {
          method: "POST",
        },
      );

      const json = (await response.json().catch(() => null)) as
        | {
            renewalUrl?: string;
            periodLabel?: string;
            error?: { message?: string };
          }
        | null;

      if (!response.ok) {
        throw new Error(json?.error?.message ?? "更新発行に失敗しました");
      }

      setRenewalResult({
        periodLabel: json?.periodLabel ?? "",
        renewalUrl: json?.renewalUrl ?? "",
      });

      await reloadDetail();
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新発行に失敗しました");
    } finally {
      setIssuingRenewal(false);
    }
  }

  async function markReviewed() {
    try {
      setReviewing(true);
      setError(null);
      setSaveMessage(null);

      const query = searchParams.toString();
      const response = await fetch(
        `/api/admin/intakes/${id}/review${query ? `?${query}` : ""}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ note: "管理画面で確認済みに更新" }),
        },
      );

      const json = (await response.json().catch(() => null)) as
        | {
            error?: { message?: string };
            notification?: {
              provider?: string;
              delivered?: boolean;
              attempted?: boolean;
            };
          }
        | null;

      if (!response.ok) {
        throw new Error(json?.error?.message ?? "確認済みへの更新に失敗しました");
      }

      setSaveMessage("提出内容を確認済みにしました。");
      await reloadDetail();
    } catch (err) {
      setError(err instanceof Error ? err.message : "確認済みへの更新に失敗しました");
    } finally {
      setReviewing(false);
    }
  }

  async function runDocumentAction() {
    if (!documentActionDialog?.reason.trim()) {
      return;
    }

    try {
      setDocumentActionLoading(
        `${documentActionDialog.documentType}:${documentActionDialog.action}`,
      );
      setError(null);
      setSaveMessage(null);

      const query = searchParams.toString();
      const response = await fetch(
        `/api/admin/intakes/${id}/documents/${documentActionDialog.documentType}/${documentActionDialog.action}${query ? `?${query}` : ""}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reason: documentActionDialog.reason.trim() }),
        },
      );

      const json = (await response.json().catch(() => null)) as
        | {
            error?: { message?: string };
            notification?: {
              provider?: string;
              delivered?: boolean;
              attempted?: boolean;
            };
          }
        | null;

      if (!response.ok) {
        throw new Error(
          json?.error?.message ??
            (documentActionDialog.action === "return"
              ? "差し戻しに失敗しました"
              : "無効化に失敗しました"),
        );
      }

      const notification = json?.notification;
      const notificationMessage =
        documentActionDialog.action === "return" && notification?.delivered
          ? "本人へ通知メールを送信しました。"
          : documentActionDialog.action === "return" && notification?.provider === "console"
            ? "本人通知は開発用プレビューとして記録しました。"
            : "";

      setSaveMessage(
        documentActionDialog.action === "return"
          ? `${getDocumentLabel(documentActionDialog.documentType)}を差し戻しました。${notificationMessage}`
          : `${getDocumentLabel(documentActionDialog.documentType)}を無効化しました。`,
      );
      setDocumentActionDialog(null);
      await reloadDetail();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : documentActionDialog.action === "return"
            ? "差し戻しに失敗しました"
            : "無効化に失敗しました",
      );
    } finally {
      setDocumentActionLoading(null);
    }
  }

  return (
    <AdminShell
      title="提出詳細"
      description="入力された個人情報、文書同意の証跡、署名情報を確認します。"
    >
      <div className="mb-4">
        <Link
          href="/admin/intakes"
          className="text-sm font-medium text-slate-700 underline decoration-slate-300 underline-offset-4"
        >
          一覧へ戻る
        </Link>
      </div>

      {error ? (
        <section className="rounded-[2rem] border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
          {error}
        </section>
      ) : null}

      {loading ? (
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          読み込み中です...
        </section>
      ) : null}

      {detail ? (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-500">基本情報</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                  {detail.fullName}
                </h2>
                <p className="mt-2 text-sm text-slate-600">{detail.storeName}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <RolePill role={detail.viewerRole} />
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    口座情報: {detail.permissions.canViewBankAccount ? "表示可" : "非表示"}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    マイナンバー: {detail.permissions.canViewMyNumber ? "表示可" : "非表示"}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    雇用条件編集:{" "}
                    {detail.permissions.canEditEmploymentContract ? "可" : "不可"}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    文書操作: {canManageDocuments ? "可" : "不可"}
                  </span>
                </div>
                <div className="mt-4">
                  <a
                    href={`/employment-contracts/${detail.intakeToken}`}
                    className="inline-flex rounded-full bg-sky-100 px-4 py-2 text-xs font-semibold text-sky-900 transition hover:bg-sky-200"
                  >
                    雇用契約更新ページを開く
                  </a>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void markReviewed()}
                    disabled={reviewing || detail.status === "reviewed"}
                    className="rounded-full bg-emerald-100 px-4 py-2 text-xs font-semibold text-emerald-900 transition hover:bg-emerald-200 disabled:opacity-50"
                  >
                    {reviewing
                      ? "確認中..."
                      : detail.status === "reviewed"
                        ? "確認済み"
                        : "確認済みにする"}
                  </button>
                </div>
              </div>
              <span className={`inline-flex whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold ${getIntakeStatusBadgeClass(detail.status)}`}>
                {formatIntakeStatus(detail.status)}
              </span>
            </div>

            <dl className="mt-6 grid gap-4 md:grid-cols-2">
              <Info label="メールアドレス" value={detail.email} />
              <Info label="電話番号" value={detail.phone} />
              <Info label="生年月日" value={detail.birthDate} />
              <Info
                label="通勤手段"
                value={formatCommuteMethod(detail.commuteMethod)}
              />
              <Info
                label="掛け持ち"
                value={detail.hasSecondJob === "yes" ? "あり" : "なし"}
              />
              <Info
                label="学生"
                value={detail.isStudent ? "はい" : "いいえ"}
              />
              <Info
                label="未成年"
                value={detail.isMinor ? "はい" : "いいえ"}
              />
              <Info
                label="外国籍"
                value={detail.isForeignNational ? "はい" : "いいえ"}
              />
              <Info
                label="緊急連絡先"
                value={`${detail.emergencyContactName} / ${detail.emergencyContactPhone}`}
              />
            </dl>

            <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                現住所
              </p>
              <p className="mt-2 text-sm leading-7 text-slate-700">
                {detail.currentAddress}
              </p>
            </div>
          </section>

          <section className="space-y-6">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-500">雇用契約更新発行</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    半年更新の雇用契約フローを発行します。更新期間は当年の上期または下期で自動判定します。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void issueRenewal()}
                  disabled={issuingRenewal || !detail.permissions.canEditEmploymentContract}
                  className="rounded-full bg-sky-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-sky-500 disabled:opacity-50"
                >
                  {issuingRenewal ? "発行中..." : "更新フローを発行"}
                </button>
              </div>

              {renewalResult ? (
                <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-4 text-sm text-sky-900">
                  <p className="font-semibold">{renewalResult.periodLabel} の更新フローを発行しました</p>
                  <p className="mt-2 break-all">{renewalResult.renewalUrl}</p>
                  <div className="mt-4 rounded-2xl bg-white p-3">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                        renewalResult.renewalUrl,
                      )}`}
                      alt="更新フローのQRコード"
                      className="mx-auto h-44 w-44"
                    />
                  </div>
                </div>
              ) : null}

              <div className="mt-5 space-y-3">
                {detail.renewalHistory.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                    まだ更新発行履歴はありません。
                  </div>
                ) : (
                  detail.renewalHistory.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl bg-slate-50 px-4 py-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {item.periodLabel}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            発行日時: {new Date(item.issuedAt).toLocaleString("ja-JP")}
                          </p>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                          {formatRenewalStatus(item.status)}
                        </span>
                      </div>
                      <a
                        href={item.renewalUrl}
                        className="mt-3 block break-all text-sm text-sky-700 underline decoration-sky-300 underline-offset-4"
                      >
                        {item.renewalUrl}
                      </a>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-500">雇用条件設定</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    管理画面から雇用区分と賃金条件を調整できます。
                  </p>
                </div>
                {detail.permissions.canEditEmploymentContract ? (
                  <button
                    type="button"
                    onClick={() => void saveEmploymentContract()}
                    disabled={!employmentContract || savingContract}
                    className="rounded-full bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
                  >
                    {savingContract ? "保存中..." : "雇用条件を保存"}
                  </button>
                ) : null}
              </div>

              {saveMessage ? (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {saveMessage}
                </div>
              ) : null}

              {!employmentContract ? (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                  雇用条件データがまだ作成されていません。
                </div>
              ) : detail.permissions.canEditEmploymentContract ? (
                <div className="mt-4 space-y-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <AdminField label="雇用区分">
                      <select
                        value={employmentContract.employmentCategory}
                        onChange={(event) =>
                          setEmploymentContract((current) =>
                            current
                              ? {
                                  ...current,
                                  employmentCategory: event.target.value as EmploymentContractPayload["employmentCategory"],
                                  renewalPatternText:
                                    event.target.value === "regular_employee"
                                      ? "期間の定めなし"
                                      : current.renewalPatternText || "以後、半年ごとの契約更新",
                                }
                              : current,
                          )
                        }
                        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-900"
                      >
                        <option value="regular_employee">無期社員</option>
                        <option value="fixed_term_employee">有期社員</option>
                        <option value="part_time">アルバイト・パート</option>
                      </select>
                    </AdminField>
                    {employmentContract.employmentCategory !== "part_time" ? (
                      <AdminField label="役職">
                        <select
                          value={employmentContract.jobPositionCode}
                          onChange={(event) =>
                            setEmploymentContract((current) =>
                              current
                                ? { ...current, jobPositionCode: event.target.value }
                                : current,
                            )
                          }
                          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-900"
                        >
                          {detail.jobPositions.map((position) => (
                            <option key={position.code} value={position.code}>
                              {position.name}
                            </option>
                          ))}
                        </select>
                      </AdminField>
                    ) : null}
                    {!isPermanentPartTimeContract(employmentContract) ? (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                        契約期間は店長入力項目です。本人画面では入力できず、ここで保存した日付が雇用契約書に反映されます。
                      </div>
                    ) : null}
                    {employmentContract.employmentCategory === "part_time" ? (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                        アルバイト・パートは時給も店長入力項目です。
                      </div>
                    ) : null}
                    {!isPermanentPartTimeContract(employmentContract) ? (
                      <>
                        <AdminField label="契約開始日">
                          <input
                            type="date"
                            value={employmentContract.contractStartDate}
                            onChange={(event) =>
                              setEmploymentContract((current) =>
                                current
                                  ? {
                                      ...current,
                                      contractStartDate: event.target.value,
                                    }
                                  : current,
                              )
                            }
                            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-900"
                          />
                        </AdminField>
                        <AdminField label="契約終了日">
                          <input
                            type="date"
                            value={
                              isDateInputValue(employmentContract.contractEndDate)
                                ? employmentContract.contractEndDate
                                : ""
                            }
                            onChange={(event) =>
                              setEmploymentContract((current) =>
                                current
                                  ? {
                                      ...current,
                                      contractEndDate: event.target.value,
                                    }
                                  : current,
                              )
                            }
                            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-900 disabled:bg-slate-100"
                          />
                        </AdminField>
                      </>
                    ) : null}
                    <AdminField label="就業店舗名">
                      <input
                        value={employmentContract.workLocationName}
                        onChange={(event) =>
                          setEmploymentContract((current) =>
                            current
                              ? { ...current, workLocationName: event.target.value }
                              : current,
                          )
                        }
                        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-900"
                      />
                    </AdminField>
                    <AdminField label="勤務時間">
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="time"
                          value={employmentContract.shiftStartTime}
                          onChange={(event) =>
                            setEmploymentContract((current) =>
                              current
                                ? { ...current, shiftStartTime: event.target.value }
                                : current,
                            )
                          }
                          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-900"
                        />
                        <input
                          type="time"
                          value={employmentContract.shiftEndTime}
                          onChange={(event) =>
                            setEmploymentContract((current) =>
                              current
                                ? { ...current, shiftEndTime: event.target.value }
                                : current,
                            )
                          }
                          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-900"
                        />
                      </div>
                    </AdminField>
                    {employmentContract.employmentCategory === "part_time" ? (
                      <AdminField label="就業日数">
                        <div className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
                          {typeof displayedWorkDaysPerWeek === "number" &&
                          displayedWorkDaysPerWeek > 0
                            ? `週${displayedWorkDaysPerWeek}日`
                            : "本人入力待ち"}
                        </div>
                        <p className="mt-2 text-xs font-semibold text-slate-500">
                          雇用契約書で本人が入力した内容が反映されます。
                        </p>
                      </AdminField>
                    ) : null}
                    {employmentContract.employmentCategory !== "part_time" ? (
                      <AdminField label="休憩時間">
                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            min={0}
                            value={employmentContract.breakMinutes ?? 60}
                            onChange={(event) =>
                              setEmploymentContract((current) =>
                                current
                                  ? {
                                      ...current,
                                      breakMinutes: Number(event.target.value || 0),
                                    }
                                  : current,
                              )
                            }
                            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-900"
                          />
                          <span className="text-sm font-semibold text-slate-500">
                            分
                          </span>
                        </div>
                      </AdminField>
                    ) : null}
                  </div>

                  <AdminField label="更新ルール">
                    <input
                      value={employmentContract.renewalPatternText}
                      onChange={(event) =>
                        setEmploymentContract((current) =>
                          current
                            ? { ...current, renewalPatternText: event.target.value }
                            : current,
                        )
                      }
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-900"
                    />
                  </AdminField>

                  {employmentContract.employmentCategory === "part_time" ? (
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                        店長入力項目です。無期・有期のアルバイト・パートは、契約期間と時給を店舗責任者が入力してから保存してください。
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <AdminField label="時給">
                          <input
                            type="number"
                            value={employmentContract.hourlyWage ?? ""}
                            onChange={(event) =>
                              setEmploymentContract((current) =>
                                current
                                  ? {
                                      ...current,
                                      hourlyWage:
                                        event.target.value === ""
                                          ? undefined
                                          : Number(event.target.value),
                                    }
                                  : current,
                              )
                            }
                            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-900"
                          />
                        </AdminField>
                        <AdminField label="交通費">
                          <div className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
                            400円/日 ※通勤した日数分支給する
                          </div>
                          <p className="mt-2 text-xs font-semibold text-slate-500">
                            アルバイト・パートの交通費は固定です。
                          </p>
                        </AdminField>
                      </div>
                    </div>
                ) : (
                  <>
                      <div className="grid gap-4 md:grid-cols-2">
                        <AdminField label="基本給">
                          <input
                            type="number"
                            value={employmentContract.basicSalaryMonthly}
                            onChange={(event) =>
                              setEmploymentContract((current) =>
                                current
                                  ? {
                                      ...current,
                                      basicSalaryMonthly: Number(event.target.value || 0),
                                    }
                                  : current,
                              )
                            }
                            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-900"
                          />
                        </AdminField>
                        <AdminField label="職務手当">
                          <input
                            type="number"
                            value={employmentContract.dutyAllowanceMonthly}
                            onChange={(event) =>
                              setEmploymentContract((current) =>
                                current
                                  ? {
                                      ...current,
                                      dutyAllowanceMonthly: Number(event.target.value || 0),
                                    }
                                  : current,
                              )
                            }
                            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-900"
                          />
                        </AdminField>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                  この権限では雇用条件を編集できません。
                </div>
              )}
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold text-slate-500">機微情報</p>

              {detail.permissions.canViewBankAccount && detail.bankAccount ? (
                <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-4">
                  <p className="text-sm font-semibold text-slate-900">給与振込口座</p>
                  <dl className="mt-3 grid gap-3 md:grid-cols-2">
                    <Info
                      label="銀行名"
                      value={detail.bankAccount.bankName}
                    />
                    <Info
                      label="支店名"
                      value={`${detail.bankAccount.branchName} (${detail.bankAccount.branchCode})`}
                    />
                    <Info
                      label="口座種別"
                      value={formatBankAccountType(detail.bankAccount.accountType)}
                    />
                    <Info
                      label="口座番号"
                      value={detail.bankAccount.accountNumberMasked}
                    />
                    <Info
                      label="口座名義(カナ)"
                      value={detail.bankAccount.accountHolderKana}
                    />
                  </dl>
                  <div className="mt-4">
                    <p className="text-sm font-semibold text-slate-700">
                      通帳またはキャッシュカードの写真
                    </p>
                    {detail.bankAccount.bankBookImageDataUrl ? (
                      <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                        <img
                          src={detail.bankAccount.bankBookImageDataUrl}
                          alt="通帳またはキャッシュカードの写真"
                          className="mx-auto max-h-80 w-full object-contain"
                        />
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-slate-500">
                        添付写真はまだありません。
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                  口座情報は、この権限では表示されません。
                </div>
              )}

              {detail.permissions.canViewMyNumber && detail.myNumber ? (
                <div className="mt-4 rounded-2xl bg-rose-50 px-4 py-4">
                  <p className="text-sm font-semibold text-rose-900">マイナンバー</p>
                  <dl className="mt-3 grid gap-3 md:grid-cols-2">
                    <Info
                      label="番号"
                      value={detail.myNumber.myNumberMasked}
                    />
                    <Info
                      label="利用目的版"
                      value={detail.myNumber.purposeOfUseVersion}
                    />
                  </dl>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
                  マイナンバーは、この権限では表示されません。
                </div>
              )}
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold text-slate-500">同意証跡</p>
              <div className="mt-4 space-y-3">
                {detail.consents.map((item) => (
                  <div
                    key={`${item.documentType}-${item.version}`}
                    className="rounded-2xl bg-slate-50 px-4 py-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {getDocumentLabel(item.documentType)}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <DocumentStateBadge
                            state={item.workflowState ?? item.adminState ?? "active"}
                          />
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                            版: {item.version}
                          </span>
                        </div>
                      </div>
                      {canManageDocuments ? (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setDocumentActionDialog({
                                documentType: item.documentType,
                                action: "return",
                                reason: item.adminState === "returned"
                                  ? item.adminStateReason || ""
                                  : "",
                              })
                            }
                            disabled={
                              documentActionLoading ===
                              `${item.documentType}:return`
                            }
                            className="rounded-full bg-amber-100 px-4 py-2 text-xs font-semibold text-amber-900 transition hover:bg-amber-200 disabled:opacity-50"
                          >
                            {documentActionLoading === `${item.documentType}:return`
                              ? "差し戻し中..."
                              : "差し戻し"}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDocumentActionDialog({
                                documentType: item.documentType,
                                action: "invalidate",
                                reason: item.adminState === "invalidated"
                                  ? item.adminStateReason || ""
                                  : "",
                              })
                            }
                            disabled={
                              documentActionLoading ===
                              `${item.documentType}:invalidate`
                            }
                            className="rounded-full bg-rose-100 px-4 py-2 text-xs font-semibold text-rose-900 transition hover:bg-rose-200 disabled:opacity-50"
                          >
                            {documentActionLoading ===
                            `${item.documentType}:invalidate`
                              ? "無効化中..."
                              : "無効化"}
                          </button>
                        </div>
                      ) : null}
                    </div>
                    <p className="mt-3 text-sm text-slate-600">
                      同意日時: {new Date(item.consentedAt).toLocaleString("ja-JP")}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">IP: {item.ipAddress}</p>
                    {item.workflowState === "resubmitted" ? (
                      <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                        <p className="text-xs font-semibold text-emerald-800">
                          再提出対応
                        </p>
                        <p className="mt-2 text-sm leading-7 text-emerald-900">
                          従業員が再提出を完了しています。
                        </p>
                        {item.resubmittedAt ? (
                          <p className="mt-2 text-xs text-emerald-800/80">
                            再提出日時:{" "}
                            {new Date(item.resubmittedAt).toLocaleString("ja-JP")}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                    {item.adminState && item.adminState !== "active" ? (
                      <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <p className="text-xs font-semibold text-slate-700">
                          {item.adminState === "returned" ? "差し戻し理由" : "無効化理由"}
                        </p>
                        <p className="mt-2 text-sm leading-7 text-slate-700">
                          {item.adminStateReason || "理由未入力"}
                        </p>
                        {item.adminStateChangedAt ? (
                          <p className="mt-2 text-xs text-slate-500">
                            処理日時:{" "}
                            {new Date(item.adminStateChangedAt).toLocaleString("ja-JP")}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold text-slate-500">本人写真</p>
              {detail.photoDataUrl ? (
                <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                  <img
                    src={detail.photoDataUrl}
                    alt="本人写真"
                    className="mx-auto max-h-80 w-full object-contain"
                  />
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">写真はまだありません。</p>
              )}
              <p className="mt-3 text-xs leading-6 text-slate-500">
                本人一人で写っている写真でお願いします。
              </p>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold text-slate-500">在留カード</p>
              {detail.isForeignNational ? (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <ResidenceCardPreview
                    label="表面"
                    src={detail.residenceCardFrontDataUrl}
                  />
                  <ResidenceCardPreview
                    label="裏面"
                    src={detail.residenceCardBackDataUrl}
                  />
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">
                  外国籍ではありません。
                </p>
              )}
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold text-slate-500">署名情報</p>
              {detail.signature ? (
                <div className="mt-4 space-y-4">
                  <div className="rounded-2xl bg-slate-50 px-4 py-4">
                    <p className="text-sm text-slate-700">
                      署名者: {detail.signature.signerName}
                    </p>
                    <p className="mt-1 text-sm text-slate-700">
                      署名日: {detail.signature.signedDate}
                    </p>
                    <p className="mt-1 text-sm text-slate-700">
                      署名時刻:{" "}
                      {new Date(detail.signature.signedAt).toLocaleString("ja-JP")}
                    </p>
                  </div>
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <img
                      src={detail.signature.signatureImageUrl}
                      alt="署名画像"
                      className="h-auto w-full bg-white object-contain"
                    />
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">署名はまだありません。</p>
              )}
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold text-slate-500">生成済みPDF</p>
              <div className="mt-4 space-y-3">
                {detail.documents.map((doc) => (
                  <a
                    key={`${doc.documentKind}-${doc.fileName}`}
                    href={doc.url}
                    className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-700 transition hover:bg-slate-100"
                  >
                    <span>{doc.fileName}</span>
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      {doc.documentKind}
                    </span>
                  </a>
                ))}
                {detail.documents.length === 0 ? (
                  <p className="text-sm text-slate-500">まだPDFはありません。</p>
                ) : null}
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {documentActionDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
          <section className="w-full max-w-2xl rounded-[2rem] border border-amber-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-500">文書操作理由</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">
                  {getDocumentLabel(documentActionDialog.documentType)} を
                  {documentActionDialog.action === "return" ? "差し戻し" : "無効化"}
                </h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  例: 退職済み、内容不備、誤提出 など
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDocumentActionDialog(null)}
                className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
              >
                閉じる
              </button>
            </div>
            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                {documentActionDialog.action === "return" ? "差し戻し理由" : "無効化理由"}
              </span>
              <textarea
                value={documentActionDialog.reason}
                onChange={(event) =>
                  setDocumentActionDialog((current) =>
                    current
                      ? {
                          ...current,
                          reason: event.target.value,
                        }
                      : current,
                  )
                }
                rows={4}
                placeholder="例: 退職済みのため本書類は無効化します"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-amber-100"
              />
            </label>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void runDocumentAction()}
                disabled={
                  !documentActionDialog.reason.trim() ||
                  documentActionLoading ===
                    `${documentActionDialog.documentType}:${documentActionDialog.action}`
                }
                className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                {documentActionLoading ===
                `${documentActionDialog.documentType}:${documentActionDialog.action}`
                  ? "実行中..."
                  : documentActionDialog.action === "return"
                    ? "差し戻しを実行"
                    : "無効化を実行"}
              </button>
              <button
                type="button"
                onClick={() => setDocumentActionDialog(null)}
                className="rounded-full bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
              >
                キャンセル
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </AdminShell>
  );
}

function RolePill({
  role,
}: {
  role: "hq_admin" | "store_admin";
}) {
  const label = role === "hq_admin" ? "本部管理者" : "店舗責任者";

  return (
    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
      {label}
    </span>
  );
}

function getDocumentLabel(documentType: string) {
  if (documentType === "employment_contract") {
    return "雇用契約書";
  }
  if (documentType === "employee_pledge") {
    return "従業員誓約書";
  }
  if (documentType === "retirement_pledge") {
    return "退職時誓約書";
  }
  return "SNS誓約書";
}

function DocumentStateBadge({
  state,
}: {
  state: "active" | "returned" | "invalidated" | "resubmitted";
}) {
  if (state === "resubmitted") {
    return (
      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900">
        再提出済み
      </span>
    );
  }

  if (state === "returned") {
    return (
      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
        差し戻し済み
      </span>
    );
  }

  if (state === "invalidated") {
    return (
      <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-900">
        無効
      </span>
    );
  }

  return (
    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900">
      有効
    </span>
  );
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

function formatRenewalStatus(status: string) {
  if (status === "sent") return "発行済み";
  if (status === "viewed") return "閲覧済み";
  if (status === "signed") return "署名済み";
  if (status === "expired") return "期限切れ";
  return status;
}

function formatCommuteMethod(method: string) {
  const labels: Record<string, string> = {
    walk: "徒歩",
    bicycle: "自転車",
    train: "電車",
    bus: "バス",
    bike: "バイク",
    car: "車",
  };

  return labels[method] ?? method;
}

function formatBankAccountType(type: string) {
  const labels: Record<string, string> = {
    ordinary: "普通",
    checking: "当座",
    savings: "貯蓄",
  };

  return labels[type] ?? type;
}

function Info({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-4">
      <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
        {label}
      </dt>
      <dd className="mt-2 text-sm text-slate-800">{value || "-"}</dd>
    </div>
  );
}

function ResidenceCardPreview({
  label,
  src,
}: {
  label: string;
  src?: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-4">
      <p className="text-sm font-semibold text-slate-700">{label}</p>
      {src ? (
        <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <img
            src={src}
            alt={`在留カード${label}`}
            className="mx-auto max-h-80 w-full object-contain"
          />
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-500">写真はまだありません。</p>
      )}
    </div>
  );
}

function AdminField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
