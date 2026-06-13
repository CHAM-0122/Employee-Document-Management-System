"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const demoAccounts = [
  {
    label: "本部管理者",
    email: "hq@example.com",
    password: "demo-hq-pass",
  },
  {
    label: "店舗責任者",
    email: "store@example.com",
    password: "demo-store-pass",
  },
];

export function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("hq@example.com");
  const [password, setPassword] = useState("demo-hq-pass");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const json = (await response.json().catch(() => null)) as
        | { role?: string; error?: { message?: string } }
        | null;

      if (!response.ok) {
        throw new Error(json?.error?.message ?? "ログインに失敗しました");
      }

      const role = json?.role ?? "hq_admin";
      const storeId = role === "store_admin" ? "&storeId=mock-store-solaria" : "";
      router.push(`/admin/intakes?role=${role}${storeId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ログインに失敗しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#bae6fd,_transparent_35%),linear-gradient(180deg,_#f8fafc_0%,_#e2e8f0_100%)] px-4 py-10 md:px-8">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[2rem] bg-slate-900 p-8 text-white shadow-xl shadow-slate-900/20">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">
            Admin Login
          </p>
          <h1 className="mt-4 text-4xl font-semibold">管理者ログイン</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
            本番では SSO や NextAuth に置き換える前提の簡易ログインです。今は cookie ベースでロールごとの見え方を確認できます。
          </p>

          <div className="mt-8 space-y-3">
            {demoAccounts.map((account) => (
              <button
                key={account.label}
                type="button"
                onClick={() => {
                  setEmail(account.email);
                  setPassword(account.password);
                }}
                className="flex w-full items-center justify-between rounded-2xl bg-white/10 px-4 py-4 text-left transition hover:bg-white/15"
              >
                <span>
                  <span className="block text-sm font-semibold">{account.label}</span>
                  <span className="mt-1 block text-xs text-slate-300">
                    {account.email}
                  </span>
                </span>
                <span className="rounded-full bg-cyan-300 px-3 py-1 text-xs font-semibold text-slate-950">
                  使用
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">サインイン</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            デモ用アカウントを選ぶか、そのまま送信してください。
          </p>

          {error ? (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                メールアドレス
              </span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-cyan-100"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                パスワード
              </span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-cyan-100"
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              {loading ? "ログイン中..." : "ログイン"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
