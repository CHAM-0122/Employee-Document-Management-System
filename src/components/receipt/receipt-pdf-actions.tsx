"use client";

type Props = {
  pdfUrl: string;
};

export function ReceiptPdfActions({ pdfUrl }: Props) {
  return (
    <div className="flex flex-wrap gap-3 print:hidden">
      <button
        className="inline-flex rounded-full bg-sky-600 px-4 py-2 text-sm font-medium text-white"
        onClick={() => window.print()}
        type="button"
      >
        この画面を印刷
      </button>
      <a
        className="inline-flex rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
        download
        href={`${pdfUrl}?download=1`}
        rel="noopener noreferrer"
      >
        PDFをダウンロード
      </a>
    </div>
  );
}
