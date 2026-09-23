"use client";

import { ReactNode, useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";
import AdminMobileNav from "./AdminMobileNav";

type AdminShellProps = {
  children: ReactNode;
  title?: string;
  description?: string;
};

export default function AdminShell({
  children,
  title,
  description,
}: AdminShellProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [checking, setChecking] = useState(true);

  const checkSession = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/session", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        router.replace("/admin/login");
        return;
      }

      setChecking(false);
    } catch (error) {
      console.error("ADMIN SESSION ERROR:", error);
      router.replace("/admin/login");
    }
  }, [router]);

  useEffect(() => {
    if (pathname === "/admin/login") {
      setChecking(false);
      return;
    }

    checkSession();
  }, [pathname, checkSession]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f8f6]">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-black/10 border-t-[#4f9d32]" />
          <p className="mt-4 text-sm font-bold text-black/45">
            নিরাপত্তা যাচাই হচ্ছে...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#f5f8f6]">
      <AdminSidebar />

      <div className="min-w-0 flex-1">
        <AdminHeader
          title={title}
          description={description}
          onMenuClick={() => setMobileOpen(true)}
        />

        <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1400px]">{children}</div>
        </main>
      </div>

      <AdminMobileNav
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
    </div>
  );
}