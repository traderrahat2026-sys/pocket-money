"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type MenuItem = {
  label: string;
  href: string;
  icon: string;
};

const menuItems: MenuItem[] = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: "▣",
  },
  {
    label: "Users",
    href: "/admin/users",
    icon: "♙",
  },
  {
    label: "Deposits",
    href: "/admin/deposits",
    icon: "৳",
  },
  {
    label: "Withdrawals",
    href: "/admin/withdrawals",
    icon: "↗",
  },
  {
    label: "Packages",
    href: "/admin/packages",
    icon: "▣",
  },
  {
    label: "Tasks",
    href: "/admin/tasks",
    icon: "✓",
  },
  {
    label: "Task Submissions",
    href: "/admin/task-submissions",
    icon: "📋",
  },
  {
    label: "Referrals",
    href: "/admin/referrals",
    icon: "♧",
  },
  {
    label: "Transactions",
    href: "/admin/transactions",
    icon: "⇄",
  },
  {
    label: "Help Line",
    href: "/admin/help-line",
    icon: "🛟",
  },
  {
    label: "Settings",
    href: "/admin/settings",
    icon: "⚙",
  },
];

export default function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  async function handleLogout() {
    if (loggingOut) return;

    try {
      setLoggingOut(true);

      await fetch("/api/admin/logout", {
        method: "POST",
      });
    } catch (error) {
      console.error("ADMIN LOGOUT ERROR:", error);
    } finally {
      router.replace("/admin/login");
      router.refresh();
    }
  }

  if (isLoginPage) {
    return (
      <div className="min-h-screen bg-[#f6f8f7] text-[#17201b]">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f7f9] text-[#111827]">
      {/* =========================================================
          MOBILE TOP BAR
      ========================================================= */}

      <header className="sticky top-0 z-40 flex h-16 items-center border-b border-gray-200 bg-white px-4 lg:hidden">
        <button
          type="button"
          aria-label="Open admin menu"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-xl font-bold text-gray-800 shadow-sm transition hover:bg-gray-50"
        >
          ☰
        </button>

        <div className="ml-3 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-black text-sm font-black text-white">
            PM
          </div>

          <div>
            <p className="text-sm font-black leading-tight">
              Pocket Money Home
            </p>

            <p className="text-[10px] font-semibold text-gray-400">
              Admin Control Center
            </p>
          </div>
        </div>
      </header>

      {/* =========================================================
          MOBILE OVERLAY
      ========================================================= */}

      {mobileOpen && (
        <button
          type="button"
          aria-label="Close admin menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        />
      )}

      {/* =========================================================
          SIDEBAR
      ========================================================= */}

      <aside
        className={[
          "fixed left-0 top-0 z-50 flex h-screen w-[280px] flex-col border-r border-gray-200 bg-white",
          "transition-transform duration-200 ease-out",
          "lg:translate-x-0",
          mobileOpen
            ? "translate-x-0"
            : "-translate-x-full",
        ].join(" ")}
      >
        {/* Logo */}

        <div className="flex h-20 shrink-0 items-center border-b border-gray-100 px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-black text-base font-black text-white shadow-sm">
              PM
            </div>

            <div>
              <h1 className="text-[15px] font-black tracking-tight text-gray-900">
                Pocket Money Home
              </h1>

              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">
                Admin Panel
              </p>
            </div>
          </div>

          {/* Mobile close */}

          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
            className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg text-lg text-gray-500 hover:bg-gray-100 lg:hidden"
          >
            ×
          </button>
        </div>

        {/* Navigation */}

        <nav className="flex-1 overflow-y-auto px-3 py-5">
          <p className="mb-3 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">
            Management
          </p>

          <div className="space-y-1">
            {menuItems.map((item) => {
              const isActive =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname === item.href ||
                    pathname.startsWith(
                      `${item.href}/`
                    );

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() =>
                    setMobileOpen(false)
                  }
                  className={[
                    "group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition",
                    isActive
                      ? "bg-black text-white shadow-sm"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-black",
                      isActive
                        ? "bg-white/15 text-white"
                        : "bg-gray-100 text-gray-500 group-hover:bg-white",
                    ].join(" ")}
                  >
                    {item.icon}
                  </span>

                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Bottom section */}

        <div className="shrink-0 border-t border-gray-100 p-3">
          <div className="mb-3 rounded-xl bg-gray-50 px-3 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400">
              Admin
            </p>

            <p className="mt-1 truncate text-sm font-bold text-gray-800">
              Control Center
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-base">
              ↪
            </span>

            <span>
              {loggingOut
                ? "Logging out..."
                : "Logout"}
            </span>
          </button>
        </div>
      </aside>

      {/* =========================================================
          MAIN CONTENT
      ========================================================= */}

      <div className="min-h-screen lg:pl-[280px]">
        {children}
      </div>
    </div>
  );
}