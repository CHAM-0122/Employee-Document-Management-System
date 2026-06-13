import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AdminIntakesPage } from "@/src/components/admin/admin-intakes-page";
import { ADMIN_SESSION_COOKIE } from "@/src/lib/admin-auth/session";

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

  return (
    <Suspense fallback={null}>
      <AdminIntakesPage />
    </Suspense>
  );
}
