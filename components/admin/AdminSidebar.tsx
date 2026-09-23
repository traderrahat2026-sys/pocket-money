"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type MenuItem = {
  label: string;
  href: string;
  icon: string;
};

const menuItems: MenuItem[] = [
  {
    label: "ড্যাশবোর্ড",
    href: "/admin",
    icon: "⌂",
  },
  {
    label: "জমা",
    href: "/admin/deposits",
    icon: "৳",
  },
  {
    label: "উত্তোলন",
    href: "/admin/withdrawals",
    icon: "↗",
  },
  {
    label: "ব্যবহারকারী",
    href: "/admin/users",
    icon: "◉",
  },
  {
    label: "প্যাকেজ",
    href: "/admin/packages",
    icon: "▣",
  },
  {
    label: "টাস্ক",
    href: "/admin/tasks",
    icon: "✓",
  },
  {
    label: "লেনদেন",
    href: "/admin/transactions",
    icon: "⇄",
  },
  {
    label: "রেফারেল",
    href: "/admin/referrals",
    icon: "♧",
  },
  {
    label: "সেটিংস",
    href: "/admin/settings",
    icon: "⚙",
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-[260px] shrink-0 border-r border-black/[0.06] bg-white lg:block">
      <div className="sticky top-0 flex h-screen flex-col">
        {/* Brand */}
        <div className="flex h-[82px] items-center border-b border-black/[0.06] px-5">
          <Link
            href="/admin"
            className="flex items-center gap-3"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#101713] text-lg font-black text-white shadow-lg shadow-black/10">
              ৳
            </div>

            <div>
              <p className="text-[16px] font-black tracking-[-0.03em] text-[#151d18]">
                Pocket Money
              </p>

              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-black/35">
                Admin Panel
              </p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-5">
          <p className="mb-3 px-3 text-[10px] font-black uppercase tracking-[0.15em] text-black/30">
            প্রধান মেনু
          </p>

          <nav className="space-y-1">
            {menuItems.map((item) => {
              const isActive =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold transition ${
                    isActive
                      ? "bg-[#101713] text-white shadow-[0_8px_22px_rgba(16,23,19,0.12)]"
                      : "text-black/55 hover:bg-[#f4f7f5] hover:text-[#17201b]"
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-black transition ${
                      isActive
                        ? "bg-white/10 text-[#7ed957]"
                        : "bg-[#f4f7f5] text-black/40 group-hover:bg-[#eef9e9] group-hover:text-[#4f9d32]"
                    }`}
                  >
                    {item.icon}
                  </span>

                  <span className="flex-1">{item.label}</span>

                  {isActive && (
                    <span className="h-1.5 w-1.5 rounded-full bg-[#7ed957]" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Area */}
        <div className="border-t border-black/[0.06] p-4">
          <div className="rounded-2xl bg-[#f5f8f6] p-4">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#58b83b]" />

              <span className="text-xs font-black text-[#3d8329]">
                সিস্টেম সক্রিয়
              </span>
            </div>

            <p className="mt-2 text-[11px] leading-5 text-black/40">
              প্রশাসনিক নিয়ন্ত্রণ কেন্দ্র প্রস্তুত আছে।
            </p>
          </div>

          <Link
            href="/"
            className="mt-3 flex items-center justify-center rounded-xl px-3 py-2.5 text-xs font-bold text-black/45 transition hover:bg-[#f4f7f5] hover:text-[#17201b]"
          >
            ← মূল ওয়েবসাইট
          </Link>
        </div>
      </div>
    </aside>
  );
}