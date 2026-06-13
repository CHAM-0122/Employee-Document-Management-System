import { notFound } from "next/navigation";

import { IntakeReceiptHtml } from "@/src/components/receipt/intake-receipt-html";
import { getPublicReceiptPreviewData } from "@/src/lib/pdf/intake-receipt-preview";

export default async function ReceiptPreviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await getPublicReceiptPreviewData(token);

  if (!data) {
    notFound();
  }

  return <IntakeReceiptHtml data={data} pdfUrl={`/api/public/intakes/${token}/receipt`} />;
}
