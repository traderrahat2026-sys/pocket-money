"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import PackageCard from "./PackageCard";

type PackageRow = {
  id: string;
  package_amount: number | string;
  daily_reward: number | string;
  duration_days: number | string | null;
  is_active: boolean | null;
};

type PackageData = {
  id: string;
  package_amount: number;
  daily_reward: number;
  duration_days: number;
  is_active: boolean;
};

export default function PackageGrid() {
  const [packages, setPackages] = useState<PackageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadPackages = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("packages")
        .select(
          "id, package_amount, daily_reward, duration_days, is_active"
        )
        .eq("is_active", true)
        .order("package_amount", {
          ascending: true,
        });

      if (error) {
        console.error(
          "Package loading error:",
          error
        );

        setPackages([]);
        setErrorMessage(
          "প্যাকেজ লোড করা যাচ্ছে না। আবার চেষ্টা করুন।"
        );

        return;
      }

      const normalizedPackages: PackageData[] =
        ((data || []) as PackageRow[]).map(
          (item) => ({
            id: item.id,

            package_amount: Number(
              item.package_amount || 0
            ),

            daily_reward: Number(
              item.daily_reward || 0
            ),

            duration_days: Number(
              item.duration_days || 30
            ),

            is_active:
              item.is_active === true,
          })
        );

      setPackages(normalizedPackages);
    } catch (error) {
      console.error(
        "Unexpected package loading error:",
        error
      );

      setPackages([]);

      setErrorMessage(
        "প্যাকেজ লোড করার সময় একটি সমস্যা হয়েছে।"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPackages();

    /*
     * Admin Panel থেকে package reward change করলে
     * User Panel কিছুক্ষণ পর automatically refresh করবে।
     */

    const interval = setInterval(() => {
      loadPackages();
    }, 30000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  /*
   * =====================================================
   * LOADING
   * =====================================================
   */

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm"
          >
            <div className="h-[132px] animate-pulse bg-slate-100" />

            <div className="space-y-3 p-3.5">
              <div className="h-5 w-2/3 animate-pulse rounded bg-slate-100" />

              <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />

              <div className="grid grid-cols-3 gap-2">
                <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
                <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
                <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
              </div>

              <div className="h-11 animate-pulse rounded-2xl bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  /*
   * =====================================================
   * ERROR
   * =====================================================
   */

  if (errorMessage) {
    return (
      <div className="rounded-3xl border border-red-100 bg-red-50 p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
          <svg
            viewBox="0 0 24 24"
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v4m0 4h.01M10.3 4.5l-7 12A1.5 1.5 0 004.6 19h14.8a1.5 1.5 0 001.3-2.5l-7-12a1.5 1.5 0 00-2.6 0z"
            />
          </svg>
        </div>

        <p className="mt-3 text-sm font-bold text-red-600">
          {errorMessage}
        </p>

        <button
          type="button"
          onClick={loadPackages}
          className="mt-4 rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-black text-white"
        >
          আবার চেষ্টা করুন
        </button>
      </div>
    );
  }

  /*
   * =====================================================
   * NO PACKAGE
   * =====================================================
   */

  if (packages.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <svg
            viewBox="0 0 24 24"
            className="h-7 w-7"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 7.5L12 3l8 4.5v9L12 21l-8-4.5v-9z"
            />

            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 7.5l8 4.5 8-4.5M12 12v9"
            />
          </svg>
        </div>

        <h3 className="mt-4 text-base font-black text-slate-800">
          কোনো প্যাকেজ পাওয়া যায়নি
        </h3>

        <p className="mt-1 text-sm text-slate-400">
          বর্তমানে কোনো সক্রিয় প্যাকেজ নেই।
        </p>
      </div>
    );
  }

  /*
   * =====================================================
   * PACKAGE GRID
   * =====================================================
   */

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {packages.map((pkg) => (
        <PackageCard
          key={pkg.id}
          pkg={pkg}
        />
      ))}
    </div>
  );
}