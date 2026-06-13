import type { ReceiptPreviewData } from "@/src/lib/pdf/intake-receipt-preview";

import { ReceiptPdfActions } from "@/src/components/receipt/receipt-pdf-actions";

type Props = {
  data: ReceiptPreviewData;
  pdfUrl: string;
};

function getDocumentLabel(documentType: string) {
  switch (documentType) {
    case "employee_pledge":
      return "従業員誓約書";
    case "sns_pledge":
      return "SNS誓約書";
    case "retirement_pledge":
      return "退職時誓約書";
    case "employment_contract":
      return "雇用契約書";
    default:
      return documentType;
  }
}

function formatStatus(status: string) {
  switch (status) {
    case "submitted":
      return "提出済み";
    case "reviewed":
      return "確認済み";
    case "returned":
      return "差し戻し";
    case "approved":
      return "承認済み";
    case "in_progress":
      return "入力中";
    case "sent":
      return "送付済み";
    default:
      return status;
  }
}

function formatWorkflowState(state?: string) {
  switch (state) {
    case "returned":
      return "差し戻し済み";
    case "invalidated":
      return "無効化済み";
    case "resubmitted":
      return "再提出済み";
    default:
      return "有効";
  }
}

function formatDateTime(value?: string) {
  if (!value) {
    return "未登録";
  }

  try {
    return new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function InfoCard({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 whitespace-pre-wrap break-words text-base text-slate-900">
        {value && value.trim().length > 0 ? value : "未登録"}
      </p>
    </div>
  );
}

export function IntakeReceiptHtml({ data, pdfUrl }: Props) {
  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6 print:bg-white print:p-0">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 print:max-w-none">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm print:rounded-none print:border-none print:p-0 print:shadow-none">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-start md:justify-between print:border-b print:pb-4">
            <div>
              <p className="text-sm font-medium tracking-wide text-slate-500">{data.companyName}</p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-950">{data.title}</h1>
              <p className="mt-3 text-sm text-slate-600">
                PDFビューアが開けない環境向けに、提出控えの内容をこの画面でも確認できるようにしています。
              </p>
            </div>
            <ReceiptPdfActions pdfUrl={pdfUrl} />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
              状態: {formatStatus(data.status)}
            </span>
            <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600">
              店舗: {data.storeName}
            </span>
            <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600">
              氏名: {data.employeeName}
            </span>
          </div>

          <section className="mt-8">
            <h2 className="text-lg font-semibold text-slate-900">基本情報</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <InfoCard label="氏名" value={data.employeeName} />
              <InfoCard label="店舗" value={data.storeName} />
              <InfoCard label="記入日" value={data.pledgeDate} />
              <InfoCard label="提出日時" value={formatDateTime(data.submittedAt)} />
              <InfoCard label="生年月日" value={data.birthDate} />
              <InfoCard label="電話番号" value={data.phone} />
              <InfoCard label="メールアドレス" value={data.email} />
              <InfoCard label="緊急連絡先" value={data.emergencyContact} />
            </div>
            <div className="mt-4">
              <InfoCard label="現住所" value={data.currentAddress} />
            </div>
          </section>

          {data.bankSummary ? (
            <section className="mt-8">
              <h2 className="text-lg font-semibold text-slate-900">口座情報</h2>
              <div className="mt-4">
                <InfoCard label="登録口座" value={data.bankSummary} />
              </div>
            </section>
          ) : null}

          {data.myNumberSummary ? (
            <section className="mt-8">
              <h2 className="text-lg font-semibold text-slate-900">マイナンバー</h2>
              <div className="mt-4">
                <InfoCard label="マイナンバー" value={data.myNumberSummary} />
              </div>
            </section>
          ) : null}

          <section className="mt-8">
            <h2 className="text-lg font-semibold text-slate-900">本人写真</h2>
            <p className="mt-2 text-sm text-slate-500">
              本人一人で写っている写真でお願いします。
            </p>
            {data.photoDataUrl ? (
              <div className="mt-4 max-w-xs overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <img
                  alt="本人写真"
                  className="mx-auto max-h-72 w-full rounded-xl object-contain"
                  src={data.photoDataUrl}
                />
              </div>
            ) : (
              <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                写真は登録されていません。
              </p>
            )}
          </section>

          <section className="mt-8">
            <h2 className="text-lg font-semibold text-slate-900">提出書類</h2>
            <div className="mt-4 space-y-4">
              {data.documents.map((document) => (
                <div key={`${document.documentType}-${document.version ?? "na"}`} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="rounded-t-2xl border-b border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="font-medium text-slate-900">{getDocumentLabel(document.documentType)}</p>
                  </div>
                  <div className="grid gap-3 p-4 md:grid-cols-2">
                    <InfoCard label="版" value={document.version} />
                    <InfoCard label="同意日時" value={formatDateTime(document.consentedAt)} />
                    <InfoCard label="状態" value={formatWorkflowState(document.workflowState ?? document.adminState)} />
                    <InfoCard label="再提出日時" value={formatDateTime(document.resubmittedAt)} />
                    <div className="md:col-span-2">
                      <InfoCard label="理由" value={document.adminStateReason} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-8">
            <h2 className="text-lg font-semibold text-slate-900">署名情報</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <InfoCard label="署名者" value={data.signature?.signerName} />
              <InfoCard label="署名日" value={data.signature?.signedDate} />
              <InfoCard label="署名日時" value={formatDateTime(data.signature?.signedAt)} />
            </div>
            {data.signature?.signatureImageUrl ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-500">手書き署名</p>
                <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-white p-4">
                  <img alt="手書き署名" className="max-h-40 w-full object-contain" src={data.signature.signatureImageUrl} />
                </div>
              </div>
            ) : null}
          </section>
        </section>
      </div>
    </main>
  );
}
