"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", icon: "⌂", label: "Home" },
  { href: "/tasks", icon: "✓", label: "Tasks" },
  { href: "/packages", icon: "▣", label: "Packages" },
  { href: "/wallet", icon: "৳", label: "Wallet" },
  { href: "/profile", icon: "◎", label: "Profile" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto grid max-w-5xl grid-cols-5 px-2 py-2">
        {items.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-[58px] flex-col items-center justify-center rounded-xl ${
                active
                  ? "text-green-600"
                  : "text-slate-400 hover:bg-slate-50 hover:text-slate-700"
              }`}
            >
              <span className="text-lg font-black">{item.icon}</span>

              <span
                className={`mt-1 text-[10px] ${
                  active ? "font-black" : "font-semibold"
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