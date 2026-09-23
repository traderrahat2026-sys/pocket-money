"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Header() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (mounted) {
        setIsLoggedIn(!!session);
      }
    };

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (
        event === "SIGNED_IN" ||
        event === "TOKEN_REFRESHED" ||
        event === "USER_UPDATED"
      ) {
        setIsLoggedIn(!!session);
      }

      if (event === "SIGNED_OUT") {
        setIsLoggedIn(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-green-600 text-xl font-black text-white shadow-sm">
            P
          </div>

          <div>
            <h1 className="text-[17px] font-black">
              Pocket Money
            </h1>

            <p className="text-[11px] font-medium text-slate-500">
              Work • Earn • Withdraw
            </p>
          </div>
        </Link>

        {isLoggedIn ? (
          <Link
            href="/profile"
            className="rounded-xl bg-green-50 px-4 py-2 text-sm font-bold text-green-700 transition hover:bg-green-100"
          >
            Profile
          </Link>
        ) : (
          <Link
            href="/login"
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-green-300 hover:text-green-600"
          >
            Login
          </Link>
        )}
      </div>
    </header>
  );
}
