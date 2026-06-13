"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { SignaturePad } from "@/src/components/intake/signature-pad";
import type {
  AttributesPayload,
  BankAccountPayload,
  EmploymentPayload,
  MyNumberPayload,
  ProfilePayload,
} from "@/src/lib/intake-contracts/types";

type IntakeDocument = {
  type:
    | "employment_contract"
    | "employee_pledge"
    | "sns_pledge"
    | "retirement_pledge";
  templateId: string;
  version: string;
  title: string;
  bodyHtml: string;
};

type IntakeBootstrap = {
  intakeId: string;
  status: string;
  companyName: string;
  store: {
    id: string;
    name: string;
  };
  inviteEmail: string;
  inviteExpiresAt: string;
  profile: Partial<ProfilePayload>;
  employment?: Partial<EmploymentPayload>;
  attributes?: Partial<AttributesPayload>;
  bankAccount?: Partial<BankAccountPayload>;
  myNumber?: Partial<MyNumberPayload>;
  documentStatuses?: Array<{
    documentType:
      | "employment_contract"
      | "employee_pledge"
      | "sns_pledge"
      | "retirement_pledge";
    adminState: "active" | "returned" | "invalidated";
    adminStateReason?: string;
    adminStateChangedAt?: string;
  }>;
};

const initialProfile: ProfilePayload = {
  pledgeDate: "",
  storeName: "",
  fullName: "",
  fullNameKana: "",
  gender: "no_answer",
  birthDate: "",
  email: "",
  phone: "",
  postalCode: "",
  currentAddress: "",
  residentSameAsCurrent: true,
  residentAddress: "",
  photoDataUrl: "",
};

function sanitizeQrInviteEmail(email?: string | null) {
  if (!email || email.endsWith("@qr.local")) {
    return "";
  }

  return email;
}

function sanitizeInitialName(name?: string | null) {
  if (!name || name === "未入力") {
    return "";
  }

  return name;
}

const initialEmployment: EmploymentPayload = {
  emergencyContactName: "",
  emergencyContactKana: "",
  emergencyContactRelation: "",
  emergencyContactPhone: "",
  commuteMethod: "walk",
  commuteDistanceKm: undefined,
  referralSource: undefined,
  referralPerson: "",
  referralStoreName: "",
  workDaysPerWeek: undefined,
  workHoursPerWeek: undefined,
  shiftStartTime: "",
  shiftEndTime: "",
};

const initialAttributes: AttributesPayload = {
  hasSecondJob: "no",
  secondJobType: "",
  secondJobNote: "",
  isStudent: false,
  schoolType: undefined,
  schoolGrade: "",
  schoolSchedule: undefined,
  schoolName: "",
  isMinor: false,
  guardianName: "",
  guardianRelation: "",
  guardianPhone: "",
  guardianWorkPermissionConfirmed: false,
  isForeignNational: false,
  residenceCardFrontDataUrl: "",
  residenceCardBackDataUrl: "",
};

const initialBankAccount: BankAccountPayload = {
  bankName: "",
  branchName: "",
  branchCode: "",
  accountType: "ordinary",
  accountNumber: "",
  accountHolderKana: "",
  bankBookImageDataUrl: "",
  agreedUsage: false,
  confirmedOwnAccount: false,
};

const initialMyNumber: MyNumberPayload = {
  myNumber: "",
  confirmMyNumber: "",
  purposeOfUseVersion: "MN-001",
  agreedPurpose: false,
  confirmedAccuracy: false,
};

const allStepDefinitions = [
  { key: "profile", label: "基本情報" },
  { key: "employment", label: "勤務情報" },
  { key: "attributes", label: "追加情報" },
  { key: "bank_account", label: "口座情報" },
  { key: "my_number", label: "マイナンバー" },
  { key: "employee_pledge", label: "従業員誓約書" },
  { key: "sns_pledge", label: "SNS誓約書" },
  { key: "retirement_pledge", label: "退職時誓約書" },
  { key: "signature", label: "署名" },
] as const;

const intakeStoreOptions = [
  "本部",
  "壱之倉庫",
  "ヨコバチ",
  "小坊主",
  "赤組",
  "餃子屋弐ノ弐上通本店",
  "餃子屋弐ノ弐下通店",
  "餃子屋弐ノ弐中央店",
  "餃子屋弐ノ弐今泉店",
  "餃子屋弐ノ弐南天神店",
  "餃子屋弐ノ弐明治通り店",
  "餃子屋弐ノ弐川端店",
  "餃子屋弐ノ弐渡辺通店",
  "餃子屋弐ノ弐薬院店",
  "餃子屋弐ノ弐大名店",
  "餃子屋弐ノ弐ソラリアステージ店",
  "餃子屋弐ノ弐博多駅地下街店",
  "餃子屋弐ノ弐袋町店",
  "餃子屋弐ノ弐宗右衛門町店",
  "餃子屋弐ノ弐那覇店",
  "餃子屋弐ノ弐牧志店",
  "餃子屋弐ノ弐清水工場",
  "餃子屋弐ノ弐近見販売所",
  "餃子弐ノ弐福岡工場",
  "餃子屋弐ノ弐警固店",
  "餃子屋弐ノ弐プラリバ店",
  "餃子屋弐ノ弐ペイペイドーム店",
  "餃子屋弐ノ弐新梅田食道街店",
  "餃子屋弐ノ弐天満店",
] as const;

const bankOptions = [
  "肥後銀行",
  "福岡銀行",
  "三菱UFJ銀行",
  "広島銀行",
  "琉球銀行",
  "ゆうちょ銀行",
] as const;

type StepKey = (typeof allStepDefinitions)[number]["key"];

export function IntakeWizard({ token }: { token: string }) {
  const searchParams = useSearchParams();
  const pledgeTerm = searchParams.get("pledgeTerm");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [bootstrap, setBootstrap] = useState<IntakeBootstrap | null>(null);
  const [documents, setDocuments] = useState<IntakeDocument[]>([]);
  const [profile, setProfile] = useState<ProfilePayload>(initialProfile);
  const [employment, setEmployment] = useState<EmploymentPayload>(initialEmployment);
  const [attributes, setAttributes] = useState<AttributesPayload>(initialAttributes);
  const [bankAccount, setBankAccount] =
    useState<BankAccountPayload>(initialBankAccount);
  const [myNumber, setMyNumber] = useState<MyNumberPayload>(initialMyNumber);
  const [employeePledgeChecks, setEmployeePledgeChecks] = useState({
    agreeRead: false,
    agreeConfidentiality: false,
    agreeDiscipline: false,
  });
  const [snsChecks, setSnsChecks] = useState({
    agreeRules: false,
    agreeMedia: false,
    agreeLiability: false,
  });
  const [retirementPledgeChecks, setRetirementPledgeChecks] = useState({
    agreeRead: false,
    agreeConfidentiality: false,
    agreeReturnItems: false,
    agreeNoClaims: false,
  });
  const [signature, setSignature] = useState("");
  const [signatureChecks, setSignatureChecks] = useState({
    confirmInputAccuracy: false,
    confirmElectronicConsent: false,
  });
  const [completed, setCompleted] = useState(false);

  const employeePledge = useMemo(
    () => documents.find((item) => item.type === "employee_pledge"),
    [documents],
  );
  const snsPledge = useMemo(
    () => documents.find((item) => item.type === "sns_pledge"),
    [documents],
  );
  const retirementPledge = useMemo(
    () => documents.find((item) => item.type === "retirement_pledge"),
    [documents],
  );
  const isTimeePledgeTerm = pledgeTerm === "timee";
  const isRetirementPledgeTerm = pledgeTerm === "retirement";
  const activeStepDefinitions = useMemo(
    () => {
      if (isRetirementPledgeTerm) {
        return allStepDefinitions.filter(
          (item) =>
            item.key === "profile" ||
            item.key === "retirement_pledge" ||
            item.key === "signature",
        );
      }

      const withoutRetirement = allStepDefinitions.filter(
        (item) => item.key !== "retirement_pledge",
      );

      return isTimeePledgeTerm
        ? withoutRetirement.filter(
            (item) => item.key !== "attributes" && item.key !== "bank_account",
          )
        : withoutRetirement;
    },
    [isRetirementPledgeTerm, isTimeePledgeTerm],
  );
  const currentStepKey =
    activeStepDefinitions[step]?.key ?? activeStepDefinitions[0].key;
  const isPartTimePledgeTerm =
    pledgeTerm === "fixed_part_time" || pledgeTerm === "permanent_part_time";
  const returnedDocuments =
    bootstrap?.documentStatuses?.filter(
      (item) => item.adminState === "returned" || item.adminState === "invalidated",
    ) ?? [];

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const [intakeRes, docsRes] = await Promise.all([
          fetch(`/api/public/intakes/${token}`),
          fetch(
            `/api/public/intakes/${token}/documents${
              pledgeTerm ? `?pledgeTerm=${encodeURIComponent(pledgeTerm)}` : ""
            }`,
          ),
        ]);

        if (!intakeRes.ok) {
          throw new Error("手続き情報の取得に失敗しました");
        }
        if (!docsRes.ok) {
          throw new Error("文書情報の取得に失敗しました");
        }

        const intakeJson = (await intakeRes.json()) as IntakeBootstrap;
        const docsJson = (await docsRes.json()) as { documents: IntakeDocument[] };

        setBootstrap(intakeJson);
        setDocuments(docsJson.documents);
        setProfile({
          ...initialProfile,
          ...intakeJson.profile,
          pledgeDate:
            intakeJson.profile.pledgeDate ??
            new Date().toISOString().slice(0, 10),
          storeName: intakeJson.profile.storeName ?? intakeJson.store.name,
          fullName: sanitizeInitialName(intakeJson.profile.fullName),
          email:
            sanitizeQrInviteEmail(intakeJson.profile.email) ||
            sanitizeQrInviteEmail(intakeJson.inviteEmail),
        });
        setEmployment({
          ...initialEmployment,
          ...intakeJson.employment,
        });
        setAttributes({
          ...initialAttributes,
          ...intakeJson.attributes,
        });
        setBankAccount({
          ...initialBankAccount,
          ...intakeJson.bankAccount,
        });
        setMyNumber({
          ...initialMyNumber,
          ...intakeJson.myNumber,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "読み込みに失敗しました");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [pledgeTerm, token]);

  useEffect(() => {
    if (!profile.birthDate) return;
    const birth = new Date(profile.birthDate);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const hasNotHadBirthdayThisYear =
      now.getMonth() < birth.getMonth() ||
      (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate());
    if (hasNotHadBirthdayThisYear) age -= 1;

    setAttributes((current) => ({
      ...current,
      isMinor: age < 18,
    }));
  }, [profile.birthDate]);

  useEffect(() => {
    if (step <= activeStepDefinitions.length - 1) {
      return;
    }

    setStep(activeStepDefinitions.length - 1);
  }, [activeStepDefinitions, step]);

  useEffect(() => {
    if (!bootstrap?.documentStatuses?.length) {
      return;
    }

    const firstReturned = bootstrap.documentStatuses.find(
      (item) => item.adminState === "returned" || item.adminState === "invalidated",
    );

    if (!firstReturned) {
      return;
    }

    const returnedStepKey =
      firstReturned.documentType === "employee_pledge"
        ? "employee_pledge"
        : firstReturned.documentType === "sns_pledge"
          ? "sns_pledge"
          : null;

    if (!returnedStepKey) {
      return;
    }

    const returnedStepIndex = activeStepDefinitions.findIndex(
      (item) => item.key === returnedStepKey,
    );

    if (returnedStepIndex >= 0) {
      setStep(returnedStepIndex);
    }
  }, [bootstrap?.documentStatuses, activeStepDefinitions]);

  async function patchJson(path: string, body: unknown) {
    const response = await fetch(path, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const json = (await response.json().catch(() => null)) as
        | { error?: { message?: string } }
        | null;
      throw new Error(json?.error?.message ?? "保存に失敗しました");
    }
  }

  async function postJson(path: string, body: unknown) {
    const response = await fetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const json = (await response.json().catch(() => null)) as
        | { error?: { message?: string } }
        | null;
      throw new Error(json?.error?.message ?? "送信に失敗しました");
    }

    return response.json().catch(() => null);
  }

  async function handleNext() {
    try {
      setSaving(true);
      setError(null);

      if (currentStepKey === "profile") {
        await patchJson(`/api/public/intakes/${token}/profile`, profile);
      }

      if (currentStepKey === "employment") {
        await patchJson(`/api/public/intakes/${token}/employment`, {
          ...employment,
          commuteDistanceKm:
            employment.commuteDistanceKm === undefined ||
            Number.isNaN(employment.commuteDistanceKm)
              ? undefined
              : employment.commuteDistanceKm,
          workDaysPerWeek:
            employment.workDaysPerWeek === undefined ||
            Number.isNaN(employment.workDaysPerWeek)
              ? undefined
              : employment.workDaysPerWeek,
          workHoursPerWeek:
            employment.workHoursPerWeek === undefined ||
            Number.isNaN(employment.workHoursPerWeek)
              ? undefined
              : employment.workHoursPerWeek,
          shiftStartTime: employment.shiftStartTime || undefined,
          shiftEndTime: employment.shiftEndTime || undefined,
        });
      }

      if (currentStepKey === "attributes") {
        await patchJson(`/api/public/intakes/${token}/attributes`, attributes);
      }

      if (currentStepKey === "bank_account") {
        await patchJson(`/api/public/intakes/${token}/bank-account`, bankAccount);
      }

      if (currentStepKey === "my_number") {
        await patchJson(`/api/public/intakes/${token}/my-number`, myNumber);
      }

      if (currentStepKey === "employee_pledge" && employeePledge) {
        if (
          isPartTimePledgeTerm &&
          attributes.isMinor &&
          !attributes.guardianWorkPermissionConfirmed
        ) {
          throw new Error(
            "18歳未満の方は、保護者の許可確認にチェックしてください",
          );
        }

        if (isPartTimePledgeTerm && attributes.isMinor) {
          await patchJson(`/api/public/intakes/${token}/attributes`, attributes);
        }

        await postJson(
          `/api/public/intakes/${token}/consents/employee-pledge`,
          {
            templateId: employeePledge.templateId,
            version: employeePledge.version,
            bodySnapshotHtml: employeePledge.bodyHtml,
            scrolledToEnd: true,
            ...employeePledgeChecks,
          },
        );
      }

      if (currentStepKey === "sns_pledge" && snsPledge) {
        await postJson(`/api/public/intakes/${token}/consents/sns-pledge`, {
          templateId: snsPledge.templateId,
          version: snsPledge.version,
          bodySnapshotHtml: snsPledge.bodyHtml,
          scrolledToEnd: true,
          ...snsChecks,
        });
      }

      if (currentStepKey === "retirement_pledge" && retirementPledge) {
        await postJson(
          `/api/public/intakes/${token}/consents/retirement-pledge`,
          {
            templateId: retirementPledge.templateId,
            version: retirementPledge.version,
            bodySnapshotHtml: retirementPledge.bodyHtml,
            scrolledToEnd: true,
            ...retirementPledgeChecks,
          },
        );
      }

      if (step < activeStepDefinitions.length - 1) {
        setStep((current) => current + 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "処理に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit() {
    try {
      setSubmitting(true);
      setError(null);

      await patchJson(`/api/public/intakes/${token}/profile`, profile);

      await postJson(`/api/public/intakes/${token}/signature`, {
        signerName: profile.fullName,
        signedDate: profile.pledgeDate,
        signatureDataUrl: signature,
        ...signatureChecks,
      });

      await postJson(
        `/api/public/intakes/${token}/submit${
          pledgeTerm ? `?pledgeTerm=${encodeURIComponent(pledgeTerm)}` : ""
        }`,
        {
          finalConfirm: true,
        },
      );

      setCompleted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "提出に失敗しました");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <Shell>読み込み中です...</Shell>;
  }

  if (error && !bootstrap) {
    return <Shell>{error}</Shell>;
  }

  if (!bootstrap) {
    return <Shell>招待情報が見つかりませんでした。</Shell>;
  }

  if (completed) {
    return (
      <Shell>
        <section className="mx-auto max-w-2xl rounded-3xl border border-emerald-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold text-emerald-700">提出完了</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">
            手続きが完了しました
          </h1>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            従業員誓約書とSNS誓約書の提出を受け付けました。控えPDFは、
            実装時にメール送信またはダウンロード表示へつなげられます。
          </p>
        </section>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 rounded-[2rem] bg-slate-900 px-6 py-8 text-white shadow-xl shadow-slate-900/20">
          <p className="text-sm uppercase tracking-[0.3em] text-amber-300">
            Employee Intake
          </p>
          <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-semibold">{bootstrap.companyName}</h1>
              <p className="mt-2 text-sm text-slate-300">
                {bootstrap.store.name} の入社手続きです。スマホ入力を前提に、
                {activeStepDefinitions.length}ステップで完了できます。
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm text-slate-200">
              有効期限: {new Date(bootstrap.inviteExpiresAt).toLocaleString("ja-JP")}
            </div>
          </div>
        </header>

        {returnedDocuments.length > 0 ? (
          <section className="mb-6 rounded-[2rem] border border-amber-200 bg-amber-50 p-6 text-amber-950 shadow-sm">
            <p className="text-sm font-semibold text-amber-800">再提出が必要です</p>
            <h2 className="mt-2 text-2xl font-semibold">
              管理者から差し戻しまたは無効化された項目があります
            </h2>
            <div className="mt-4 space-y-3">
              {returnedDocuments.map((item) => (
                <div
                  key={item.documentType}
                  className="rounded-2xl bg-white px-4 py-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {getReturnedDocumentLabel(item.documentType)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        状態: {item.adminState === "returned" ? "差し戻し" : "無効化"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const documentStepKey =
                          item.documentType === "employee_pledge"
                            ? "employee_pledge"
                            : item.documentType === "sns_pledge"
                              ? "sns_pledge"
                              : item.documentType === "retirement_pledge"
                                ? "retirement_pledge"
                                : "signature";
                        const targetStep = activeStepDefinitions.findIndex(
                          (stepItem) => stepItem.key === documentStepKey,
                        );
                        if (targetStep >= 0) {
                          setStep(targetStep);
                        }
                      }}
                      className="rounded-full bg-amber-100 px-4 py-2 text-xs font-semibold text-amber-900 transition hover:bg-amber-200"
                    >
                      修正箇所へ移動
                    </button>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-slate-700">
                    {item.adminStateReason || "管理者から再提出依頼があります。"}
                  </p>
                  {item.adminStateChangedAt ? (
                    <p className="mt-2 text-xs text-slate-500">
                      処理日時: {new Date(item.adminStateChangedAt).toLocaleString("ja-JP")}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">進行状況</p>
            <ol className="mt-4 space-y-3">
              {activeStepDefinitions.map((stepDefinition, index) => {
                const active = index === step;
                const done = index < step;
                return (
                  <li
                    key={stepDefinition.key}
                    className={`rounded-2xl px-4 py-3 text-sm ${
                      active
                        ? "bg-amber-100 text-amber-950"
                        : done
                          ? "bg-emerald-50 text-emerald-800"
                          : "bg-slate-50 text-slate-500"
                    }`}
                  >
                    <span className="mr-3 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-semibold">
                      {index + 1}
                    </span>
                    {stepDefinition.label}
                  </li>
                );
              })}
            </ol>
          </aside>

          <main className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            {error ? (
              <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            {currentStepKey === "profile" ? (
              <ProfileStep profile={profile} onChange={setProfile} />
            ) : null}

            {currentStepKey === "employment" ? (
              <EmploymentStep
                employment={employment}
                onChange={setEmployment}
                attributes={attributes}
                onAttributesChange={setAttributes}
              />
            ) : null}

            {currentStepKey === "attributes" ? (
              <AttributesStep
                attributes={attributes}
                onChange={setAttributes}
              />
            ) : null}

            {currentStepKey === "bank_account" ? (
              <BankAccountStep
                bankAccount={bankAccount}
                onChange={setBankAccount}
              />
            ) : null}

            {currentStepKey === "my_number" ? (
              <MyNumberStep myNumber={myNumber} onChange={setMyNumber} />
            ) : null}

            {currentStepKey === "employee_pledge" && employeePledge ? (
              <DocumentStep
                title={employeePledge.title}
                version={employeePledge.version}
                bodyHtml={employeePledge.bodyHtml}
                eyebrow={`Step ${step + 1}`}
                checks={[
                  {
                    key: "agreeRead",
                    label: "内容を確認し、理解しました",
                  },
                  {
                    key: "agreeConfidentiality",
                    label: "在職中および退職後の守秘義務を理解しました",
                  },
                  {
                    key: "agreeDiscipline",
                    label: "違反時の処分について理解しました",
                  },
                ]}
                values={employeePledgeChecks}
                onChange={setEmployeePledgeChecks}
                guardianWorkPermissionCheck={
                  isPartTimePledgeTerm && attributes.isMinor
                    ? {
                        checked: Boolean(
                          attributes.guardianWorkPermissionConfirmed,
                        ),
                        onChange: (checked) =>
                          setAttributes((current) => ({
                            ...current,
                            guardianWorkPermissionConfirmed: checked,
                          })),
                      }
                    : undefined
                }
              />
            ) : null}

            {currentStepKey === "sns_pledge" && snsPledge ? (
              <DocumentStep
                title={snsPledge.title}
                version={snsPledge.version}
                bodyHtml={snsPledge.bodyHtml}
                eyebrow={`Step ${step + 1}`}
                checks={[
                  {
                    key: "agreeRules",
                    label: "投稿禁止事項を理解しました",
                  },
                  {
                    key: "agreeMedia",
                    label: "写真・動画・レビュー等の制限を理解しました",
                  },
                  {
                    key: "agreeLiability",
                    label: "違反時の責任を理解しました",
                  },
                ]}
                values={snsChecks}
                onChange={setSnsChecks}
              />
            ) : null}

            {currentStepKey === "retirement_pledge" && retirementPledge ? (
              <DocumentStep
                title={retirementPledge.title}
                version={retirementPledge.version}
                bodyHtml={retirementPledge.bodyHtml}
                eyebrow={`Step ${step + 1}`}
                checks={[
                  {
                    key: "agreeRead",
                    label: "内容を確認し、理解しました",
                  },
                  {
                    key: "agreeConfidentiality",
                    label: "退職後の守秘義務を理解しました",
                  },
                  {
                    key: "agreeReturnItems",
                    label: "会社貸与物の返却について理解しました",
                  },
                  {
                    key: "agreeNoClaims",
                    label: "退職後の異議申し立てに関する内容を理解しました",
                  },
                ]}
                values={retirementPledgeChecks}
                onChange={setRetirementPledgeChecks}
              />
            ) : null}

            {currentStepKey === "signature" ? (
              <SignatureStep
                fullName={profile.fullName}
                signedDate={profile.pledgeDate}
                signature={signature}
                onSignatureChange={setSignature}
                checks={signatureChecks}
                onChecksChange={setSignatureChecks}
              />
            ) : null}

            <footer className="mt-8 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep((current) => Math.max(0, current - 1))}
                className="rounded-full border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                disabled={saving || submitting || step === 0}
              >
                戻る
              </button>

              {step < activeStepDefinitions.length - 1 ? (
                <button
                  type="button"
                  onClick={() => void handleNext()}
                  className="rounded-full bg-slate-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
                  disabled={saving}
                >
                  {saving ? "保存中..." : "次へ進む"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  className="rounded-full bg-emerald-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
                  disabled={submitting}
                >
                  {submitting ? "提出中..." : "提出を完了する"}
                </button>
              )}
            </footer>
          </main>
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fef3c7,_transparent_30%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] px-4 py-8 text-slate-900 md:px-8">
      {children}
    </div>
  );
}

function getReturnedDocumentLabel(documentType: string) {
  if (documentType === "employee_pledge") {
    return "従業員誓約書";
  }
  if (documentType === "sns_pledge") {
    return "SNS誓約書";
  }
  if (documentType === "retirement_pledge") {
    return "退職時誓約書";
  }
  return "雇用契約書";
}

function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="mb-6">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-600">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 text-sm leading-7 text-slate-600">{description}</p>
    </header>
  );
}

function Field({
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

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-amber-100 ${
        props.className ?? ""
      }`}
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-amber-100 ${
        props.className ?? ""
      }`}
    />
  );
}

function CheckboxRow({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 rounded border-slate-300"
      />
      <span>{label}</span>
    </label>
  );
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () =>
      reject(reader.error ?? new Error("写真の読み込みに失敗しました"));
    reader.readAsDataURL(file);
  });
}

function ProfileStep({
  profile,
  onChange,
}: {
  profile: ProfilePayload;
  onChange: React.Dispatch<React.SetStateAction<ProfilePayload>>;
}) {
  return (
    <div>
      <SectionTitle
        eyebrow="Step 1"
        title="基本情報を入力"
        description="氏名・連絡先・住所など、本人情報の基本項目を入力します。"
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="誓約日">
          <Input
            type="date"
            value={profile.pledgeDate}
            onChange={(e) =>
              onChange((current) => ({ ...current, pledgeDate: e.target.value }))
            }
          />
        </Field>
        <Field label="入社店舗名">
          <Select
            value={profile.storeName}
            onChange={(e) =>
              onChange((current) => ({ ...current, storeName: e.target.value }))
            }
          >
            <option value="">選択してください</option>
            {intakeStoreOptions.map((storeName) => (
              <option key={storeName} value={storeName}>
                {storeName}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="氏名">
          <Input
            value={profile.fullName}
            onChange={(e) =>
              onChange((current) => ({ ...current, fullName: e.target.value }))
            }
          />
        </Field>
        <Field label="フリガナ">
          <Input
            value={profile.fullNameKana}
            onChange={(e) =>
              onChange((current) => ({ ...current, fullNameKana: e.target.value }))
            }
          />
        </Field>
        <Field label="性別">
          <Select
            value={profile.gender}
            onChange={(e) =>
              onChange((current) => ({
                ...current,
                gender: e.target.value as ProfilePayload["gender"],
              }))
            }
          >
            <option value="no_answer">回答しない</option>
            <option value="male">男性</option>
            <option value="female">女性</option>
          </Select>
        </Field>
        <Field label="生年月日">
          <Input
            type="date"
            value={profile.birthDate}
            onChange={(e) =>
              onChange((current) => ({ ...current, birthDate: e.target.value }))
            }
          />
        </Field>
        <Field label="メールアドレス">
          <Input
            type="email"
            value={profile.email}
            onChange={(e) =>
              onChange((current) => ({ ...current, email: e.target.value }))
            }
          />
        </Field>
        <Field label="携帯・電話">
          <Input
            value={profile.phone}
            onChange={(e) =>
              onChange((current) => ({ ...current, phone: e.target.value }))
            }
          />
        </Field>
        <Field label="郵便番号">
          <Input
            value={profile.postalCode ?? ""}
            onChange={(e) =>
              onChange((current) => ({ ...current, postalCode: e.target.value }))
            }
          />
        </Field>
        <div />
        <div className="md:col-span-2">
          <Field label="現住所">
            <Input
              value={profile.currentAddress}
              onChange={(e) =>
                onChange((current) => ({
                  ...current,
                  currentAddress: e.target.value,
                }))
              }
            />
          </Field>
        </div>
        <div className="md:col-span-2">
          <CheckboxRow
            checked={profile.residentSameAsCurrent}
            label="住民票住所は現住所と同じ"
            onChange={(checked) =>
              onChange((current) => ({
                ...current,
                residentSameAsCurrent: checked,
              }))
            }
          />
        </div>
        {!profile.residentSameAsCurrent ? (
          <div className="md:col-span-2">
            <Field label="住民票住所">
              <Input
                value={profile.residentAddress ?? ""}
                onChange={(e) =>
                  onChange((current) => ({
                    ...current,
                    residentAddress: e.target.value,
                  }))
                }
              />
            </Field>
          </div>
        ) : null}
        <div className="md:col-span-2">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="max-w-xl">
                <p className="text-sm font-semibold text-slate-700">本人写真</p>
                <p className="mt-2 text-sm leading-7 text-slate-500">
                  誓約書に添付する写真です。本人一人で写っている写真でお願いします。
                  JPGまたはPNG形式でアップロードしてください。
                </p>
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  className="mt-4 block w-full text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-700"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) {
                      return;
                    }
                    if (!["image/jpeg", "image/png"].includes(file.type)) {
                      alert("JPGまたはPNG形式の写真を選択してください。");
                      event.target.value = "";
                      return;
                    }
                    if (file.size > 5 * 1024 * 1024) {
                      alert("写真は5MB以内の画像を選択してください。");
                      event.target.value = "";
                      return;
                    }
                    const dataUrl = await readFileAsDataUrl(file);
                    onChange((current) => ({
                      ...current,
                      photoDataUrl: dataUrl,
                    }));
                  }}
                />
                {profile.photoDataUrl ? (
                  <button
                    type="button"
                    className="mt-3 text-sm font-semibold text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline"
                    onClick={() =>
                      onChange((current) => ({ ...current, photoDataUrl: "" }))
                    }
                  >
                    写真を削除
                  </button>
                ) : null}
              </div>
              <div className="flex h-36 w-36 shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-dashed border-slate-300 bg-white text-center text-xs font-semibold text-slate-400">
                {profile.photoDataUrl ? (
                  <img
                    src={profile.photoDataUrl}
                    alt="本人写真プレビュー"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  "写真未選択"
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmploymentStep({
  employment,
  onChange,
  attributes,
  onAttributesChange,
}: {
  employment: EmploymentPayload;
  onChange: React.Dispatch<React.SetStateAction<EmploymentPayload>>;
  attributes: AttributesPayload;
  onAttributesChange: React.Dispatch<React.SetStateAction<AttributesPayload>>;
}) {
  return (
    <div>
      <SectionTitle
        eyebrow="Step 2"
        title="緊急連絡先と勤務情報"
        description="緊急連絡先、通勤方法、勤務条件などを入力します。"
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="緊急連絡先氏名">
          <Input
            value={employment.emergencyContactName}
            onChange={(e) =>
              onChange((current) => ({
                ...current,
                emergencyContactName: e.target.value,
              }))
            }
          />
        </Field>
        <Field label="緊急連絡先フリガナ">
          <Input
            value={employment.emergencyContactKana ?? ""}
            onChange={(e) =>
              onChange((current) => ({
                ...current,
                emergencyContactKana: e.target.value,
              }))
            }
          />
        </Field>
        <Field label="続柄">
          <Input
            value={employment.emergencyContactRelation}
            onChange={(e) =>
              onChange((current) => ({
                ...current,
                emergencyContactRelation: e.target.value,
              }))
            }
          />
        </Field>
        <Field label="電話番号">
          <Input
            value={employment.emergencyContactPhone}
            onChange={(e) =>
              onChange((current) => ({
                ...current,
                emergencyContactPhone: e.target.value,
              }))
            }
          />
        </Field>
        {attributes.isMinor ? (
          <div className="md:col-span-2 rounded-[1.5rem] border border-amber-200 bg-amber-50 p-4">
            <label className="flex items-start gap-3 text-sm font-semibold leading-7 text-amber-900">
              <input
                type="checkbox"
                checked={Boolean(attributes.guardianWorkPermissionConfirmed)}
                onChange={(e) =>
                  onAttributesChange((current) => ({
                    ...current,
                    guardianWorkPermissionConfirmed: e.target.checked,
                  }))
                }
                className="mt-1 h-5 w-5 rounded border-amber-300 text-amber-700"
              />
              <span>
                弊社で労働することについて、保護者の許可を得ました
              </span>
            </label>
          </div>
        ) : null}
        <Field label="通勤手段">
          <Select
            value={employment.commuteMethod}
            onChange={(e) =>
              onChange((current) => ({
                ...current,
                commuteMethod: e.target.value as EmploymentPayload["commuteMethod"],
              }))
            }
          >
            <option value="walk">徒歩</option>
            <option value="bicycle">自転車</option>
            <option value="train">電車</option>
            <option value="bus">バス</option>
            <option value="bike">バイク</option>
            <option value="car">自家用車</option>
          </Select>
        </Field>
        <Field label="通勤距離(片道km)">
          <Input
            type="number"
            step="0.1"
            value={employment.commuteDistanceKm ?? ""}
            onChange={(e) =>
              onChange((current) => ({
                ...current,
                commuteDistanceKm:
                  e.target.value === "" ? undefined : Number(e.target.value),
              }))
            }
          />
        </Field>
        <Field label="入社のきっかけ">
          <Select
            value={employment.referralSource ?? ""}
            onChange={(e) =>
              onChange((current) => ({
                ...current,
                referralSource:
                  e.target.value === ""
                    ? undefined
                    : (e.target.value as EmploymentPayload["referralSource"]),
                referralPerson:
                  e.target.value === "referral" ? current.referralPerson : "",
                referralStoreName:
                  e.target.value === "referral" ? current.referralStoreName : "",
              }))
            }
          >
            <option value="">未選択</option>
            <option value="job_posting">求人応募</option>
            <option value="referral">紹介</option>
            <option value="other">その他</option>
          </Select>
        </Field>
        {employment.referralSource === "referral" ? (
          <div className="md:col-span-2 grid gap-4 md:grid-cols-2">
            <Field label="紹介者名">
              <Input
                value={employment.referralPerson ?? ""}
                onChange={(e) =>
                  onChange((current) => ({
                    ...current,
                    referralPerson: e.target.value,
                  }))
                }
              />
            </Field>
            <Field label="紹介者の店舗">
              <Select
                value={employment.referralStoreName ?? ""}
                onChange={(e) =>
                  onChange((current) => ({
                    ...current,
                    referralStoreName: e.target.value,
                  }))
                }
              >
                <option value="">店舗を選択してください</option>
                {intakeStoreOptions.map((storeName) => (
                  <option key={storeName} value={storeName}>
                    {storeName}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function AttributesStep({
  attributes,
  onChange,
}: {
  attributes: AttributesPayload;
  onChange: React.Dispatch<React.SetStateAction<AttributesPayload>>;
}) {
  return (
    <div>
      <SectionTitle
        eyebrow="Step 3"
        title="追加情報"
        description="掛け持ち、学生、未成年者、外国籍に関する追加情報を入力します。"
      />
      <div className="space-y-4">
        <Field label="掛け持ち">
          <Select
            value={attributes.hasSecondJob}
            onChange={(e) =>
              onChange((current) => ({
                ...current,
                hasSecondJob: e.target.value as AttributesPayload["hasSecondJob"],
              }))
            }
          >
            <option value="no">なし</option>
            <option value="yes">あり</option>
          </Select>
        </Field>
        {attributes.hasSecondJob === "yes" ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="掛け持ち店舗名">
              <Input
                placeholder="例: ○○カフェ 渋谷店"
                value={attributes.secondJobType ?? ""}
                onChange={(e) =>
                  onChange((current) => ({
                    ...current,
                    secondJobType: e.target.value,
                  }))
                }
              />
            </Field>
            <Field label="どちらが主勤務先ですか">
              <Select
                value={attributes.secondJobNote ?? ""}
                onChange={(e) =>
                  onChange((current) => ({
                    ...current,
                    secondJobNote: e.target.value,
                  }))
                }
              >
                <option value="">選択してください</option>
                <option value="self_main">自店が主</option>
                <option value="other_main">他店が主</option>
              </Select>
            </Field>
          </div>
        ) : null}

        <CheckboxRow
          checked={attributes.isStudent}
          label="学生です"
          onChange={(checked) =>
            onChange((current) => ({ ...current, isStudent: checked }))
          }
        />

        {attributes.isStudent ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="学校区分">
              <Select
                value={attributes.schoolType ?? ""}
                onChange={(e) =>
                  onChange((current) => ({
                    ...current,
                    schoolType:
                      e.target.value === ""
                        ? undefined
                        : (e.target.value as AttributesPayload["schoolType"]),
                  }))
                }
              >
                <option value="">未選択</option>
                <option value="university">大学</option>
                <option value="junior_college">短大</option>
                <option value="vocational">専門</option>
                <option value="high_school">高校</option>
              </Select>
            </Field>
            <Field label="学年">
              <Input
                value={attributes.schoolGrade ?? ""}
                onChange={(e) =>
                  onChange((current) => ({
                    ...current,
                    schoolGrade: e.target.value,
                  }))
                }
              />
            </Field>
            <Field label="昼間/夜間">
              <Select
                value={attributes.schoolSchedule ?? ""}
                onChange={(e) =>
                  onChange((current) => ({
                    ...current,
                    schoolSchedule:
                      e.target.value === ""
                        ? undefined
                        : (e.target.value as AttributesPayload["schoolSchedule"]),
                  }))
                }
              >
                <option value="">未選択</option>
                <option value="daytime">昼間</option>
                <option value="nighttime">夜間</option>
              </Select>
            </Field>
            <Field label="学校名">
              <Input
                value={attributes.schoolName ?? ""}
                onChange={(e) =>
                  onChange((current) => ({
                    ...current,
                    schoolName: e.target.value,
                  }))
                }
              />
            </Field>
          </div>
        ) : null}

        <CheckboxRow
          checked={Boolean(attributes.isForeignNational)}
          label="外国籍ですか？"
          onChange={(checked) =>
            onChange((current) => ({
              ...current,
              isForeignNational: checked,
              residenceCardFrontDataUrl: checked
                ? current.residenceCardFrontDataUrl
                : "",
              residenceCardBackDataUrl: checked
                ? current.residenceCardBackDataUrl
                : "",
            }))
          }
        />

        {attributes.isForeignNational ? (
          <div className="rounded-[1.75rem] border border-sky-200 bg-sky-50 p-5">
            <p className="text-sm font-semibold text-sky-900">
              在留カードの写真を添付してください
            </p>
            <p className="mt-2 text-sm leading-7 text-sky-800">
              表面と裏面の両方が必要です。文字が読めるように、明るい場所で撮影してください。
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <ResidenceCardUploadField
                label="在留カード（表面）"
                value={attributes.residenceCardFrontDataUrl ?? ""}
                onChange={(dataUrl) =>
                  onChange((current) => ({
                    ...current,
                    residenceCardFrontDataUrl: dataUrl,
                  }))
                }
              />
              <ResidenceCardUploadField
                label="在留カード（裏面）"
                value={attributes.residenceCardBackDataUrl ?? ""}
                onChange={(dataUrl) =>
                  onChange((current) => ({
                    ...current,
                    residenceCardBackDataUrl: dataUrl,
                  }))
                }
              />
            </div>
          </div>
        ) : null}

        {attributes.isMinor ? (
          <div className="rounded-[1.75rem] border border-amber-200 bg-amber-50 p-5">
            <p className="text-sm font-semibold text-amber-800">
              18歳未満のため保護者情報が必要です
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="保護者氏名">
                <Input
                  value={attributes.guardianName ?? ""}
                  onChange={(e) =>
                    onChange((current) => ({
                      ...current,
                      guardianName: e.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="保護者続柄">
                <Input
                  value={attributes.guardianRelation ?? ""}
                  onChange={(e) =>
                    onChange((current) => ({
                      ...current,
                      guardianRelation: e.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="保護者電話番号">
                <Input
                  value={attributes.guardianPhone ?? ""}
                  onChange={(e) =>
                    onChange((current) => ({
                      ...current,
                      guardianPhone: e.target.value,
                    }))
                  }
                />
              </Field>
            </div>
            <label className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm font-semibold leading-7 text-amber-900">
              <input
                type="checkbox"
                checked={Boolean(attributes.guardianWorkPermissionConfirmed)}
                onChange={(e) =>
                  onChange((current) => ({
                    ...current,
                    guardianWorkPermissionConfirmed: e.target.checked,
                  }))
                }
                className="mt-1 h-5 w-5 rounded border-amber-300 text-amber-700"
              />
              <span>
                弊社で労働することについて、保護者の許可を得ました
              </span>
            </label>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ResidenceCardUploadField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (dataUrl: string) => void;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-semibold text-slate-700">{label}</p>
      <input
        type="file"
        accept="image/jpeg,image/png"
        className="mt-3 block w-full text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) {
            return;
          }
          if (!["image/jpeg", "image/png"].includes(file.type)) {
            alert("JPEGまたはPNGの画像を添付してください。");
            event.target.value = "";
            return;
          }
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === "string") {
              onChange(reader.result);
            }
          };
          reader.readAsDataURL(file);
          event.target.value = "";
        }}
      />
      {value ? (
        <div className="mt-4 space-y-3">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
            <img
              src={value}
              alt={label}
              className="mx-auto max-h-56 w-full object-contain"
            />
          </div>
          <button
            type="button"
            onClick={() => onChange("")}
            className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            画像を削除
          </button>
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-500">未添付</p>
      )}
    </div>
  );
}

function BankAccountStep({
  bankAccount,
  onChange,
}: {
  bankAccount: BankAccountPayload;
  onChange: React.Dispatch<React.SetStateAction<BankAccountPayload>>;
}) {
  return (
    <div>
      <SectionTitle
        eyebrow="Step 4"
        title="給与振込口座を入力"
        description="給与振込に利用する本人名義の口座情報を入力してください。マイナンバーはこの次の段階で別フローに分けて扱います。"
      />
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="銀行名">
            <Select
              value={bankAccount.bankName}
              onChange={(e) =>
                onChange((current) => ({
                  ...current,
                  bankName: e.target.value,
                }))
              }
            >
              <option value="">選択してください</option>
              {bankOptions.map((bankName) => (
                <option key={bankName} value={bankName}>
                  {bankName}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="支店名">
            <Input
              value={bankAccount.branchName}
              onChange={(e) =>
                onChange((current) => ({
                  ...current,
                  branchName: e.target.value,
                }))
              }
            />
          </Field>
          <Field label="支店番号(3桁)">
            <Input
              inputMode="numeric"
              maxLength={3}
              value={bankAccount.branchCode}
              onChange={(e) =>
                onChange((current) => ({
                  ...current,
                  branchCode: e.target.value.slice(0, 3),
                }))
              }
            />
          </Field>
          <Field label="口座種別">
            <Select
              value={bankAccount.accountType}
              onChange={(e) =>
                onChange((current) => ({
                  ...current,
                  accountType: e.target.value as BankAccountPayload["accountType"],
                }))
              }
            >
              <option value="ordinary">普通</option>
              <option value="checking">当座</option>
              <option value="savings">貯蓄</option>
            </Select>
          </Field>
          <Field label="口座番号(7桁)">
            <Input
              inputMode="numeric"
              maxLength={7}
              value={bankAccount.accountNumber}
              onChange={(e) =>
                onChange((current) => ({
                  ...current,
                  accountNumber: e.target.value.slice(0, 7),
                }))
              }
            />
          </Field>
          <Field label="口座名義(カナ)">
            <Input
              value={bankAccount.accountHolderKana}
              onChange={(e) =>
                onChange((current) => ({
                  ...current,
                  accountHolderKana: e.target.value,
                }))
              }
            />
          </Field>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="max-w-xl">
              <p className="text-sm font-semibold text-slate-700">
                通帳またはキャッシュカードの写真
              </p>
              <p className="mt-2 text-sm leading-7 text-slate-500">
                通帳の1ページ目見開き、または通帳がない場合はキャッシュカードの写真を添付してください。
                JPGまたはPNG形式でアップロードできます。
              </p>
              <input
                type="file"
                accept="image/jpeg,image/png"
                className="mt-4 block w-full text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-700"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) {
                    return;
                  }
                  if (!["image/jpeg", "image/png"].includes(file.type)) {
                    alert("JPGまたはPNG形式の写真を選択してください。");
                    event.target.value = "";
                    return;
                  }
                  if (file.size > 5 * 1024 * 1024) {
                    alert("写真は5MB以内の画像を選択してください。");
                    event.target.value = "";
                    return;
                  }
                  const dataUrl = await readFileAsDataUrl(file);
                  onChange((current) => ({
                    ...current,
                    bankBookImageDataUrl: dataUrl,
                  }));
                }}
              />
              {bankAccount.bankBookImageDataUrl ? (
                <button
                  type="button"
                  className="mt-3 text-sm font-semibold text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline"
                  onClick={() =>
                    onChange((current) => ({
                      ...current,
                      bankBookImageDataUrl: "",
                    }))
                  }
                >
                  添付写真を削除
                </button>
              ) : null}
            </div>
            <div className="flex h-36 w-48 shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-dashed border-slate-300 bg-white text-center text-xs font-semibold text-slate-400">
              {bankAccount.bankBookImageDataUrl ? (
                <img
                  src={bankAccount.bankBookImageDataUrl}
                  alt="通帳またはキャッシュカードの写真プレビュー"
                  className="h-full w-full object-contain"
                />
              ) : (
                "写真未選択"
              )}
            </div>
          </div>
        </div>

        <div className="space-y-3 rounded-[1.75rem] border border-sky-200 bg-sky-50 p-5">
          <p className="text-sm leading-7 text-sky-900">
            この口座情報は給与振込のために利用します。管理権限のある本部担当者のみが閲覧する想定です。
          </p>
          <CheckboxRow
            checked={bankAccount.agreedUsage}
            label="給与振込目的で口座情報を利用することに同意します"
            onChange={(checked) =>
              onChange((current) => ({ ...current, agreedUsage: checked }))
            }
          />
          <CheckboxRow
            checked={bankAccount.confirmedOwnAccount}
            label="本人名義の口座であることを確認しました"
            onChange={(checked) =>
              onChange((current) => ({
                ...current,
                confirmedOwnAccount: checked,
              }))
            }
          />
        </div>
      </div>
    </div>
  );
}

function MyNumberStep({
  myNumber,
  onChange,
}: {
  myNumber: MyNumberPayload;
  onChange: React.Dispatch<React.SetStateAction<MyNumberPayload>>;
}) {
  return (
    <div>
      <SectionTitle
        eyebrow="Step 5"
        title="マイナンバーを入力"
        description="法定調書や社会保険等の法定業務に必要なため、マイナンバーを入力してください。店舗ではなく、本部の権限保有者のみが扱う前提です。"
      />
      <div className="space-y-4">
        <div className="rounded-[1.75rem] border border-rose-200 bg-rose-50 p-5 text-sm leading-7 text-rose-900">
          利用目的: 税・社会保険・雇用保険など法令に基づく手続きに限って利用します。スクリーンショットや第三者共有は避け、入力後はすみやかに提出してください。
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="マイナンバー(12桁)">
            <Input
              inputMode="numeric"
              maxLength={12}
              value={myNumber.myNumber}
              onChange={(e) =>
                onChange((current) => ({
                  ...current,
                  myNumber: e.target.value.slice(0, 12),
                }))
              }
            />
          </Field>
          <Field label="確認用マイナンバー(再入力)">
            <Input
              inputMode="numeric"
              maxLength={12}
              value={myNumber.confirmMyNumber}
              onChange={(e) =>
                onChange((current) => ({
                  ...current,
                  confirmMyNumber: e.target.value.slice(0, 12),
                }))
              }
            />
          </Field>
        </div>

        <div className="space-y-3 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm text-slate-700">
            利用目的版: <span className="font-semibold">{myNumber.purposeOfUseVersion}</span>
          </p>
          <CheckboxRow
            checked={myNumber.agreedPurpose}
            label="利用目的を確認し、法定業務のための利用に同意します"
            onChange={(checked) =>
              onChange((current) => ({ ...current, agreedPurpose: checked }))
            }
          />
          <CheckboxRow
            checked={myNumber.confirmedAccuracy}
            label="入力した番号に誤りがないことを確認しました"
            onChange={(checked) =>
              onChange((current) => ({
                ...current,
                confirmedAccuracy: checked,
              }))
            }
          />
        </div>
      </div>
    </div>
  );
}

function DocumentStep<T extends Record<string, boolean>>({
  eyebrow = "Document",
  title,
  version,
  bodyHtml,
  checks,
  values,
  onChange,
  guardianWorkPermissionCheck,
}: {
  eyebrow?: string;
  title: string;
  version: string;
  bodyHtml: string;
  checks: Array<{ key: keyof T; label: string }>;
  values: T;
  onChange: React.Dispatch<React.SetStateAction<T>>;
  guardianWorkPermissionCheck?: {
    checked: boolean;
    onChange: (checked: boolean) => void;
  };
}) {
  return (
    <div>
      <SectionTitle
        eyebrow={eyebrow}
        title={title}
        description={`文書版 ${version} を確認し、内容を理解したうえでチェックを入れてください。`}
      />
      <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
        <div
          className="prose prose-slate max-h-[460px] overflow-y-auto rounded-2xl bg-white p-5 prose-headings:mb-3 prose-headings:mt-6 prose-li:leading-7 prose-p:leading-7"
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
      </div>
      <div className="mt-5 space-y-3">
        {guardianWorkPermissionCheck ? (
          <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-4">
            <p className="mb-3 text-sm font-semibold text-amber-950">
              18歳未満のアルバイト・パートの方は、保護者の許可確認が必要です。
            </p>
            <CheckboxRow
              checked={guardianWorkPermissionCheck.checked}
              label="弊社で労働することについて、保護者の許可を得ました"
              onChange={guardianWorkPermissionCheck.onChange}
            />
          </div>
        ) : null}
        {checks.map((item) => (
          <CheckboxRow
            key={String(item.key)}
            checked={values[item.key]}
            label={item.label}
            onChange={(checked) =>
              onChange((current) => ({
                ...current,
                [item.key]: checked,
              }))
            }
          />
        ))}
      </div>
    </div>
  );
}

function SignatureStep({
  fullName,
  signedDate,
  signature,
  onSignatureChange,
  checks,
  onChecksChange,
}: {
  fullName: string;
  signedDate: string;
  signature: string;
  onSignatureChange: (value: string) => void;
  checks: {
    confirmInputAccuracy: boolean;
    confirmElectronicConsent: boolean;
  };
  onChecksChange: React.Dispatch<
    React.SetStateAction<{
      confirmInputAccuracy: boolean;
      confirmElectronicConsent: boolean;
    }>
  >;
}) {
  return (
    <div>
      <SectionTitle
        eyebrow="Final Step"
        title="最終署名"
        description="最後に内容を確認し、手書きサインを入力してください。今はMVP段階のため、簡易な署名入力欄で置いています。"
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="氏名">
          <Input value={fullName} readOnly />
        </Field>
        <Field label="署名日">
          <Input type="date" value={signedDate} readOnly />
        </Field>
      </div>
      <div className="mt-4">
        <Field label="手書きサイン">
          <SignaturePad value={signature} onChange={onSignatureChange} />
        </Field>
      </div>
      <div className="mt-5 space-y-3">
        <CheckboxRow
          checked={checks.confirmInputAccuracy}
          label="入力内容に誤りがありません"
          onChange={(checked) =>
            onChecksChange((current) => ({
              ...current,
              confirmInputAccuracy: checked,
            }))
          }
        />
        <CheckboxRow
          checked={checks.confirmElectronicConsent}
          label="電子的に誓約することに同意します"
          onChange={(checked) =>
            onChecksChange((current) => ({
              ...current,
              confirmElectronicConsent: checked,
            }))
          }
        />
      </div>
    </div>
  );
}
