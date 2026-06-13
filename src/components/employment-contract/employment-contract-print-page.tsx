"use client";

import { useEffect, useMemo, useState } from "react";

import { PrintButton } from "@/src/components/admin/print-button";
import {
  buildHeadOfficeDocumentHtml,
  buildPartTimeDocumentHtml,
  type HeadOfficeEditableFields,
  type IntakeDocument,
  type PartTimeEditableFields,
  type RenewalBootstrap,
} from "@/src/components/employment-contract/employment-contract-renewal-page";

function splitTime(value?: string) {
  if (!value) return ["", ""] as const;
  const [hour = "", minute = ""] = value.split(":");
  return [hour, minute] as const;
}

function getHalfYearStartDate(baseDate = new Date()) {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  return month < 6 ? `${year}-01-01` : `${year}-07-01`;
}

function getHalfYearPeriodLabel(baseDate = new Date()) {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  return month < 6 ? `${year}年1月〜${year}年6月` : `${year}年7月〜${year}年12月`;
}

function buildHeadOfficeSupplementHtml({
  isNoFixedTerm = false,
}: { isNoFixedTerm?: boolean } = {}) {
  return `
    <section class="supplement-page">
      <h2>補足説明</h2>
      <div class="supplement-block">
        <h3>休日について</h3>
        <p>◆月曜日〜日曜日の間に2日</p>
        <p>◆月が変わる週も同様に、「月曜日〜日曜日の間に2日」</p>
        <p>◆週1日は必ず休みを取ること</p>
        <p>◆週に2回目の休みを取れない場合は、他の週の休みと振替</p>
      </div>
      <div class="supplement-block">
        <h3>労働時間について</h3>
        <p>◆実際の労働時間は、「始業時間」から「業務終了」までとなる</p>
      </div>
      <div class="supplement-block">
        <h3>休憩時間について</h3>
        <p>◆仕込み完了後〜営業開始前まで：店長の指示に従う</p>
        <p>休憩に入る前と、休憩が終わった後に必ずタイムカードを押す</p>
        <p>◆その他の休憩：上記以外に1日15分（賄いの時間等）</p>
        <p>※タイムカードが休憩回数分押せない場合は、1日15分の休憩分を一律合計時間から差し引く</p>
      </div>
      <div class="supplement-block">
        <h3>異動について</h3>
        <p>◆グループ店舗内で、異動を命じることがある</p>
      </div>
      <div class="supplement-block">
        <h3>有給休暇について</h3>
        <p>◆入社後6ヶ月経過後の翌月に、年10日付与</p>
        <p>◆シフトの都合上、原則有給取得は月2回まで</p>
        <p>◆毎月9月1日に繰越（残日数の繰越は1回まで）</p>
        <p>◆繰越時、退職時の有給残日数の買取は行わない</p>
        <p>退職時の一括取得も原則受け付けないので、普段から取得をし、心身の休息を心がける</p>
      </div>
      ${
        isNoFixedTerm
          ? ""
          : `<div class="supplement-block">
        <h3>契約期間について</h3>
        <p>◆入社後、半年ごとの雇用契約</p>
        <p>◆契約満了日（または契約更新日）：毎年、6月30日、及び12月31日</p>
        <p>◆契約の満了は、会社からでも、社員からでも通知できる</p>
        <p>◆契約満了する場合は、満了日の1ヶ月前までに会社からの場合は店長から、社員からの場合は店長へ通知する</p>
        <p>◆双方から通知がない場合、契約は更新となる</p>
      </div>`
      }
      <div class="supplement-block">
        <h3>役職定年について</h3>
        <p>◆50歳の誕生日の月末で、役職定年となる</p>
        <p>それ以降、役職はつかない</p>
      </div>
      <div class="supplement-block">
        <h3>残業代について</h3>
        <p>◆残業代は、固定残業代として、職務手当に含まれる</p>
        <p>◆固定残業代で残業可能な時間は、役職ごとに異なる</p>
      </div>
    </section>
  `;
}

function splitHeadOfficePages(
  html: string,
  options: { isNoFixedTerm?: boolean } = {},
) {
  const appendix1Marker = '<h3>別紙1 役職ごとの基本給・職務手当</h3>';
  const appendix2Marker = '<h3>別紙2 残業代について</h3>';
  const appendix1Index = html.indexOf(appendix1Marker);
  const appendix2Index = html.indexOf(appendix2Marker);

  if (appendix1Index === -1 || appendix2Index === -1) {
    return [html];
  }

  const main = html.slice(0, appendix1Index);
  const appendix1 = html.slice(appendix1Index, appendix2Index);
  const appendix2 = html.slice(appendix2Index);

  return [
    main,
    buildHeadOfficeSupplementHtml({ isNoFixedTerm: options.isNoFixedTerm }),
    appendix1,
    appendix2,
  ];
}

function ReceiptActionLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
    >
      {label}
    </a>
  );
}

export function EmploymentContractPrintPage({ token }: { token: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bootstrap, setBootstrap] = useState<RenewalBootstrap | null>(null);
  const [document, setDocument] = useState<IntakeDocument | null>(null);
  const [partTimeFields, setPartTimeFields] = useState<PartTimeEditableFields | null>(null);
  const [headOfficeFields, setHeadOfficeFields] = useState<HeadOfficeEditableFields | null>(null);

  const periodLabel = useMemo(() => getHalfYearPeriodLabel(), []);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const [intakeRes, docsRes] = await Promise.all([
          fetch(`/api/public/intakes/${token}`),
          fetch(`/api/public/intakes/${token}/documents`),
        ]);

        if (!intakeRes.ok || !docsRes.ok) {
          throw new Error("雇用契約情報の取得に失敗しました");
        }

        const intakeJson = (await intakeRes.json()) as RenewalBootstrap;
        const docsJson = (await docsRes.json()) as { documents: IntakeDocument[] };
        const contract = intakeJson.employmentContract;

        setBootstrap(intakeJson);
        setDocument(
          docsJson.documents.find((item) => item.type === "employment_contract") ?? null,
        );

        if (contract?.employmentCategory === "part_time") {
          const [startHour = "", startMinute = ""] = splitTime(contract.shiftStartTime);
          const [endHour = "", endMinute = ""] = splitTime(contract.shiftEndTime);
          setPartTimeFields({
            employeeName: intakeJson.profile.fullName ?? "",
            contractStartDate: contract.contractStartDate ?? "",
            contractEndDate: contract.contractEndDate ?? "",
            workDaysPerWeek: "",
            shiftStartHour: startHour,
            shiftStartMinute: startMinute,
            shiftEndHour: endHour,
            shiftEndMinute: endMinute,
            hourlyWage:
              typeof contract.hourlyWage === "number"
                ? String(contract.hourlyWage)
                : "",
            signedDate:
              intakeJson.profile.pledgeDate ??
              contract.contractStartDate ??
              new Date().toISOString().slice(0, 10),
            addressZip: intakeJson.profile.postalCode ?? "",
            addressText: intakeJson.profile.currentAddress ?? "",
            signatureName: intakeJson.profile.fullName ?? "",
          });
        }

        if (contract?.employmentCategory === "regular_employee") {
          setHeadOfficeFields({
            updateDate: contract.contractStartDate || getHalfYearStartDate(),
            selectedStoreName: intakeJson.store.name,
            contractStartDate: contract.contractStartDate ?? "",
            contractEndDate: contract.contractEndDate ?? "",
            currentRoleCode: contract.jobPositionCode ?? "",
            currentRoleLabel: contract.currentRoleLabel ?? "",
            shiftStartTime: contract.shiftStartTime || "09:00",
            shiftEndTime: contract.shiftEndTime || "18:00",
            breakMinutes: String(contract.breakMinutes || 60),
            socialInsuranceStatus:
              contract.socialInsuranceNote?.includes("無") ? "無" : "有",
            employmentInsuranceStatus:
              contract.employmentInsuranceNote?.includes("無") ? "無" : "有",
            signedDate:
              intakeJson.profile.pledgeDate ??
              contract.contractStartDate ??
              new Date().toISOString().slice(0, 10),
            addressZip: intakeJson.profile.postalCode ?? "",
            addressText: intakeJson.profile.currentAddress ?? "",
            signatureName: intakeJson.profile.fullName ?? "",
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "印刷データの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [token]);

  const htmlPages = useMemo(() => {
    if (!bootstrap?.employmentContract) return [] as string[];
    const contract = bootstrap.employmentContract;
    if (contract.employmentCategory === "part_time") {
      if (!partTimeFields) return [] as string[];
      return [
        buildPartTimeDocumentHtml({
          fields: partTimeFields,
          contract,
          storeName: bootstrap.store.name,
          periodLabel,
        }),
      ];
    }
    if (!headOfficeFields) return [] as string[];
    const isNoFixedTerm =
      contract.employmentCategory === "regular_employee" &&
      (contract.contractEndDate === "期間の定めなし" ||
        contract.renewalPatternText === "期間の定めなし");
    return splitHeadOfficePages(
      buildHeadOfficeDocumentHtml({
        fields: headOfficeFields,
        periodLabel,
        isNoFixedTerm,
      }),
      { isNoFixedTerm },
    );
  }, [bootstrap, headOfficeFields, partTimeFields, periodLabel]);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 print:bg-white print:px-0 print:py-0">
      <div className="mx-auto max-w-5xl space-y-6 print:max-w-none print:space-y-0">
        <header className="rounded-[2rem] border border-slate-200 bg-white px-6 py-5 shadow-sm print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">
                Employment Contract PDF
              </p>
              <h1 className="mt-2 text-2xl font-semibold">
                雇用契約書 印刷ページ
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                A4印刷向けのレイアウトです。本文、補足説明、別紙1、別紙2をページごとに分けています。
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <PrintButton />
              <ReceiptActionLink href={`/employment-contracts/${token}`} label="更新フローへ戻る" />
              <ReceiptActionLink href={`/api/public/intakes/${token}/documents`} label="元データを確認" />
            </div>
          </div>
        </header>

        {loading ? (
          <div className="rounded-[2rem] bg-white px-6 py-10 text-sm text-slate-600 shadow-sm">
            印刷データを準備しています...
          </div>
        ) : null}
        {error ? (
          <div className="rounded-[2rem] border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {!loading && !error && bootstrap && document && htmlPages.length > 0
          ? htmlPages.map((html, index) => (
              <section
                key={index}
                className="contract-print-page overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm print:mb-0 print:rounded-none print:border-0 print:shadow-none"
              >
                <div className="border-b border-slate-200 px-8 py-5 print:hidden">
                  <div className="flex items-center justify-between gap-4 text-sm text-slate-500">
                    <span>{bootstrap.profile.fullName || "-"}</span>
                    <span>{bootstrap.store.name}</span>
                    <span>
                      {index + 1} / {htmlPages.length} ページ
                    </span>
                  </div>
                </div>
                <div
                  className="contract-print-body px-8 py-8"
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              </section>
            ))
          : null}
      </div>

      <style jsx global>{`
        @page {
          size: A4 portrait;
          margin: 12mm;
        }

        .contract-print-page {
          page-break-after: always;
        }

        .contract-print-page:last-child {
          page-break-after: auto;
        }

        .contract-print-body {
          color: #0f172a;
          font-size: 13px;
          line-height: 1.8;
        }

        .contract-print-body h2 {
          margin: 0 0 12px;
          text-align: center;
          font-size: 28px;
          font-weight: 700;
          letter-spacing: 0.08em;
        }

        .contract-print-body h3 {
          margin: 28px 0 12px;
          font-size: 20px;
          font-weight: 700;
        }

        .contract-print-body p {
          margin: 0 0 8px;
        }

        .contract-print-body table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 16px;
        }

        .contract-print-body th,
        .contract-print-body td {
          border: 1px solid #cbd5e1;
          padding: 12px 14px;
          vertical-align: top;
        }

        .contract-print-body th {
          width: 24%;
          background: #f8fafc;
          font-weight: 700;
          text-align: left;
        }

        .contract-print-body thead th {
          background: #e2e8f0;
          text-align: center;
        }

        .supplement-page h2 {
          margin-bottom: 18px;
        }

        .supplement-block {
          margin-bottom: 18px;
        }

        .supplement-block h3 {
          display: inline-block;
          margin: 0 0 10px;
          background: #fef3c7;
          padding: 4px 10px;
          font-size: 15px;
        }

        @media print {
          body {
            background: white;
          }

          .contract-print-body {
            font-size: 12px;
            line-height: 1.65;
          }
        }
      `}</style>
    </main>
  );
}
