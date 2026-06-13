import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { IntakeReceiptHtml } from "@/src/components/receipt/intake-receipt-html";
import { type ResolvedAdminSession, ADMIN_SESSION_COOKIE } from "@/src/lib/admin-auth/session";
import { getAdminReceiptPreviewData } from "@/src/lib/pdf/intake-receipt-preview";
import { decryptJson } from "@/src/lib/security/encryption";

export default async function AdminReceiptPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cookieStore = await cookies();
  const rawSession = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!rawSession) {
    redirect("/admin/login");
  }

  let session: ResolvedAdminSession;
  try {
    session = decryptJson<ResolvedAdminSession>(rawSession);
  } catch {
    redirect("/admin/login");
  }

  const data = await getAdminReceiptPreviewData(id, session);
  if (!data) {
    notFound();
  }

  return <IntakeReceiptHtml data={data} pdfUrl={`/api/admin/intakes/${id}/pdf`} />;
}
