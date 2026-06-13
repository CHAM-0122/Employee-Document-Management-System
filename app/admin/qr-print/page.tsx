import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { PrintButton } from "@/src/components/admin/print-button";
import { QrPrintTracker } from "@/src/components/admin/qr-print-tracker";
import { ADMIN_SESSION_COOKIE } from "@/src/lib/admin-auth/session";

function getSingleParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value : Array.isArray(value) ? value[0] : "";
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const hasSession = cookieStore.has(ADMIN_SESSION_COOKIE);
  const role = params.role;

  if (!hasSession && typeof role !== "string") {
    redirect("/admin/login");
  }

  const label = getSingleParam(params.label) || "QRコード";
  const store = getSingleParam(params.store) || "店舗未設定";
  const url = getSingleParam(params.url);
  const generatedAt = new Date().toLocaleString("ja-JP");
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=360x360&data=${encodeURIComponent(url)}`;

  return (
    <main className="min-h-screen bg-[#eef3f1] px-6 py-10 text-slate-900 print:bg-white print:px-0 print:py-0">
      <QrPrintTracker label={label} storeName={store} url={url} />
      <div className="mx-auto max-w-4xl print:max-w-none">
        <div className="mb-6 flex items-center justify-between print:hidden">
          <div>
            <p className="text-sm font-semibold text-slate-500">印刷用QRページ</p>
            <h1 className="mt-2 text-3xl font-semibold">{label}</h1>
            <p className="mt-2 text-sm text-slate-600">
              「印刷」から PDF に保存するか、そのまま紙で印刷してください。
            </p>
          </div>
          <PrintButton />
        </div>

        <section className="rounded-[2rem] border border-slate-300 bg-white p-10 shadow-sm print:rounded-none print:border-0 print:p-[12mm] print:shadow-none">
          <div className="border-b border-slate-200 pb-6 text-center">
            <p className="text-sm font-semibold tracking-[0.28em] text-slate-500">STAFF ENTRY QR</p>
            <h2 className="mt-4 text-4xl font-semibold text-slate-900">{label}</h2>
            <p className="mt-4 text-lg font-medium text-slate-700">{store}</p>
            <p className="mt-2 text-xs text-slate-500">発行日時: {generatedAt}</p>
          </div>

          <div className="mt-8 grid gap-8 md:grid-cols-[340px,1fr] md:items-start">
            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
              <div className="rounded-[1.25rem] border border-dashed border-slate-300 bg-white p-4">
                <img src={qrSrc} alt={`${label}のQRコード`} className="mx-auto h-[300px] w-[300px]" />
              </div>
              <p className="mt-4 text-center text-xs leading-6 text-slate-500">スマートフォンのカメラで読み取り、表示されたフォームから提出してください。</p>
            </div>
            <div className="space-y-5">
              <div className="rounded-[1.5rem] border border-slate-200 p-5">
                <p className="text-sm font-semibold text-slate-500">利用方法</p>
                <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-7 text-slate-700">
                  <li>スマートフォンのカメラで QRコードを読み取ってください。</li>
                  <li>表示されたページで必要事項を入力し、内容を確認してください。</li>
                  <li>最後に署名または同意を行い、提出を完了してください。</li>
                </ol>
              </div>

              <div className="rounded-[1.5rem] border border-slate-200 p-5">
                <p className="text-sm font-semibold text-slate-500">リンクURL</p>
                <p className="mt-3 break-all text-sm leading-7 text-slate-700">{url || "URLが設定されていません"}</p>
              </div>

              <div className="rounded-[1.5rem] border border-dashed border-slate-300 p-5 text-sm leading-7 text-slate-600">
                店舗掲示用の印刷ページです。古いQRを差し替えるときは、必ず最新のQRを再発行してください。
              </div>

              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-700">
                <p className="font-semibold text-slate-900">掲示時のおすすめ</p>
                <ul className="mt-3 list-disc space-y-1 pl-5">
                  <li>面談スペースやバックヤードに掲示する</li>
                  <li>印刷時はA4縦で余白を標準にする</li>
                  <li>差し替え日を控えて、古いQRは回収する</li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
