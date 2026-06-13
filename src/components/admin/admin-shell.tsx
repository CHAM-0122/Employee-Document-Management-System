"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function AdminShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentRole = searchParams.get("role") ?? "hq_admin";
  const currentStoreId = searchParams.get("storeId") ?? "mock-store-solaria";

  function buildHref(role: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("role", role);

    if (role === "store_admin") {
      params.set("storeId", currentStoreId);
    } else {
      params.delete("storeId");
    }

    const query = params.toString();
    return `${pathname}${query ? `?${query}` : ""}`;
  }

  function buildSectionHref(sectionPath: string) {
    const params = new URLSearchParams(searchParams.toString());
    const query = params.toString();
    return `${sectionPath}${query ? `?${query}` : ""}`;
  }

  async function handleSignOut() {
    await fetch("/api/admin/session", {
      method: "DELETE",
    });

    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#f8fafc_0%,_#e0f2fe_100%)] px-4 py-8 md:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="rounded-[2rem] bg-slate-900 px-6 py-8 text-white shadow-xl shadow-slate-900/20">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">
            Admin Console
          </p>
          <h1 className="mt-3 text-3xl font-semibold">{title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300">
            {description}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <SectionLink
              href={buildSectionHref("/admin/intakes")}
              active={pathname === "/admin/intakes"}
              label="提出一覧"
            />
            <SectionLink
              href={buildSectionHref("/admin/qr-library")}
              active={pathname === "/admin/qr-library"}
              label="QR一覧"
            />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Demo Role
            </span>
            <RoleLink
              href={buildHref("hq_admin")}
              active={currentRole === "hq_admin"}
              label="本部管理者"
            />
            <RoleLink
              href={buildHref("store_admin")}
              active={currentRole === "store_admin"}
              label="店舗責任者"
            />
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/20"
            >
              サインアウト
            </button>
          </div>
        </header>
        <main className="mt-6">{children}</main>
      </div>
    </div>
  );
}

function RoleLink({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
        active
          ? "bg-cyan-300 text-slate-950"
          : "bg-white/10 text-slate-200 hover:bg-white/20"
      }`}
    >
      {label}
    </Link>
  );
}


function SectionLink({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
        active
          ? "bg-white text-slate-950"
          : "bg-white/10 text-slate-200 hover:bg-white/20"
      }`}
    >
      {label}
    </Link>
  );
}
