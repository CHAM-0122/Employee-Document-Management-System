import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#fff7ed_0%,_#f8fafc_100%)] px-4 py-10 text-slate-900 md:px-8">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-[2rem] bg-slate-900 px-6 py-10 text-white shadow-xl shadow-slate-900/20 md:px-10">
          <p className="text-sm uppercase tracking-[0.3em] text-amber-300">
            Employee Intake MVP
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight">
            入社時の誓約書を
            <br />
            スマホで完結させる土台
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
            従業員誓約書、SNS誓約書、署名、管理画面までを一連で試せる
            Next.js のMVPです。
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/intakes/sample-token"
              className="rounded-full bg-amber-300 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-amber-200"
            >
              入社フローを見る
            </Link>
            <Link
              href="/employment-contracts/sample-token"
              className="rounded-full bg-sky-300 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-sky-200"
            >
              雇用契約更新フローを見る
            </Link>
            <Link
              href="/admin/intakes"
              className="rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              管理画面を見る
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
