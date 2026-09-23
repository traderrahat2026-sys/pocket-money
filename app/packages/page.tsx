import Link from "next/link";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import PackageGrid from "@/components/PackageGrid";

export default function PackagesPage() {
  return (
    <main className="min-h-screen bg-[#f6f8f7] pb-24">
      <Header />

      <div className="mx-auto max-w-5xl px-4 py-6">
        {/* Back */}
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm font-bold text-green-600 transition hover:text-green-700"
        >
          ← হোমে ফিরুন
        </Link>

        {/* Page Header */}
        <div className="mt-6 mb-7">
          <div className="mb-3 inline-flex items-center rounded-full border border-green-200 bg-green-50 px-3 py-1.5">
            <span className="text-xs font-black uppercase tracking-[0.12em] text-green-700">
              প্যাকেজ সেন্টার
            </span>
          </div>

          <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            আপনার জন্য প্যাকেজ
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
            উপলব্ধ প্যাকেজগুলো দেখুন এবং প্রতিটি প্যাকেজের ডিপোজিট,
            দৈনিক রিওয়ার্ড, মেয়াদ ও মোট রিওয়ার্ড সম্পর্কে বিস্তারিত
            তথ্য দেখুন।
          </p>
        </div>

        {/* Package Grid */}
        <PackageGrid />
      </div>

      <BottomNav />
    </main>
  );
}