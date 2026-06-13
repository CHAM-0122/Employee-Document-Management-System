import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AdminIntakeDetailPage } from "@/src/components/admin/admin-intake-detail-page";
import { ADMIN_SESSION_COOKIE } from "@/src/lib/admin-auth/session";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const cookieStore = await cookies();
  const hasSession = cookieStore.has(ADMIN_SESSION_COOKIE);
  const role = query.role;

  if (!hasSession && typeof role !== "string") {
    redirect("/admin/login");
  }

  return (
    <Suspense fallback={null}>
      <AdminIntakeDetailPage id={id} />
    </Suspense>
  );
}
