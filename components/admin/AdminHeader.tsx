"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type AdminHeaderProps = {
  title?: string;
  description?: string;
  onMenuClick?: () => void;
};

export default function AdminHeader({
  title = "ড্যাশবোর্ড",
  description = "Pocket Money প্রশাসনিক নিয়ন্ত্রণ কেন্দ্র",
  onMenuClick,
}: AdminHeaderProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    if (loggingOut) return;

    const confirmed = window.confirm(
      "আপনি কি প্রশাসনিক প্যানেল থেকে বের হতে চান?",
    );

    if (!confirmed) return;

    setLoggingOut(true);

    try {
      /*
       * Admin logout API পরের authentication ধাপে যুক্ত করা হবে।
       * বর্তমানে login page-এ ফেরত পাঠানো হচ্ছে।
       */

      router.replace("/admin/login");
      router.refresh();
    } catch (error) {
      console.error("ADMIN LOGOUT ERROR:", error);
      setLoggingOut(false);
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-black/[0.06] bg-white/90 backdrop-blur-xl">
      <div className="flex min-h-[76px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Left */}
        <div className="flex min-w-0 items-center gap-3">
          {/* Mobile menu */}
          <button
            type="button"
            onClick={onMenuClick}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-black/[0.07] bg-white text-lg font-black text-[#26322b] transition hover:bg-[#f4f7f5] lg:hidden"
            aria-label="মেনু খুলুন"
          >
            ☰
          </button>

          <div className="min-w-0">
            <p className="truncate text-xl font-black tracking-[-0.035em] text-[#151d18] sm:text-2xl">
              {title}
            </p>

            <p className="mt-0.5 hidden truncate text-xs font-medium text-black/40 sm:block">
              {description}
            </p>
          </div>
        </div>

        {/* Right */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {/* System Status */}
          <div className="hidden items-center gap-2 rounded-xl border border-[#7ed957]/20 bg-[#eef9e9] px-3 py-2 sm:flex">
            <span className="h-2 w-2 rounded-full bg-[#58b83b]" />

            <span className="text-xs font-bold text-[#3d8329]">
              সক্রিয়
            </span>
          </div>

          {/* Admin Profile */}
          <Link
            href="/admin/settings"
            className="flex items-center gap-2 rounded-xl border border-black/[0.07] bg-white px-2.5 py-2 transition hover:bg-[#f5f8f6] sm:px-3"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#101713] text-xs font-black text-white">
              A
            </div>

            <div className="hidden text-left md:block">
              <p className="text-xs font-black text-[#17201b]">
                প্রশাসক
              </p>

              <p className="text-[10px] font-medium text-black/35">
                নিয়ন্ত্রণকারী
              </p>
            </div>
          </Link>

          {/* Logout */}
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex h-10 items-center justify-center rounded-xl border border-red-500/10 bg-red-50 px-3 text-xs font-black text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4"
          >
            {loggingOut ? "বের হচ্ছে..." : "বের হন"}
          </button>
        </div>
      </div>
    </header>
  );
}