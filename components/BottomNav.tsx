"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", icon: "⌂", label: "হোম" },
  { href: "/tasks", icon: "✓", label: "কাজ" },
  { href: "/packages", icon: "▣", label: "প্যাকেজ" },
  { href: "/wallet", icon: "৳", label: "ওয়ালেট" },
  { href: "/profile", icon: "◎", label: "প্রোফাইল" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[9999] h-[78px] w-full border-t border-slate-700 bg-slate-950 shadow-[0_-8px_30px_rgba(0,0,0,0.35)]"
      style={{
        paddingBottom:
          "env(safe-area-inset-bottom)",
      }}
    >
      <div className="mx-auto grid h-full w-full max-w-5xl grid-cols-5 px-2">
        {items.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex h-full min-w-0 flex-col items-center justify-center rounded-xl transition ${
                active
                  ? "text-green-400"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span
                className={`flex h-7 items-center justify-center text-xl leading-none ${
                  active
                    ? "font-black"
                    : "font-bold"
                }`}
              >
                {item.icon}
              </span>

              <span
                className={`mt-1 whitespace-nowrap text-[10px] leading-none ${
                  active
                    ? "font-black text-green-400"
                    : "font-semibold text-slate-400"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}