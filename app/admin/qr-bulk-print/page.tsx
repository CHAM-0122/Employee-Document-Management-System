import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AdminQrBulkPrintPage } from "@/src/components/admin/admin-qr-bulk-print-page";
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
  const role = getSingleParam(params.role);

  if (!hasSession && !role) {
    redirect("/admin/login");
  }

  const kindParam = getSingleParam(params.kind);
  const kind = kindParam === "employment_contract" ? "employment_contract" : "pledge";
  const storeId = getSingleParam(params.storeId);

  return (
    <Suspense fallback={null}>
      <AdminQrBulkPrintPage kind={kind} role={role || undefined} storeId={storeId || undefined} />
    </Suspense>
  );
}
