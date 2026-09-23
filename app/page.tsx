"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Package = {
  id: number;
  amount: number;
  dailyEarning: number;
  duration: number;
};

const packages: Package[] = [
  { id: 1, amount: 500, dailyEarning: 100, duration: 30 },
  { id: 2, amount: 1000, dailyEarning: 250, duration: 30 },
  { id: 3, amount: 1500, dailyEarning: 500, duration: 30 },
  { id: 4, amount: 2000, dailyEarning: 400, duration: 30 },
  { id: 5, amount: 3000, dailyEarning: 800, duration: 30 },
  { id: 6, amount: 5000, dailyEarning: 1000, duration: 30 },
  { id: 7, amount: 10000, dailyEarning: 2000, duration: 30 },
  { id: 8, amount: 20000, dailyEarning: 4000, duration: 30 },
  { id: 9, amount: 25000, dailyEarning: 5000, duration: 30 },
];

function taka(amount: number | null | undefined) {
  const safeAmount = Number(amount ?? 0);
  return `৳${safeAmount.toLocaleString("en-BD")}`;
}

const packageThemes = [
  {
    background:
      "linear-gradient(135deg,#f0fdf4,#dcfce7 55%,#ffffff)",
    accent: "#16a34a",
    soft: "#dcfce7",
    text: "#166534",
  },
  {
    background:
      "linear-gradient(135deg,#eff6ff,#dbeafe 55%,#ffffff)",
    accent: "#2563eb",
    soft: "#dbeafe",
    text: "#1d4ed8",
  },
  {
    background:
      "linear-gradient(135deg,#faf5ff,#f3e8ff 55%,#ffffff)",
    accent: "#9333ea",
    soft: "#f3e8ff",
    text: "#7e22ce",
  },
  {
    background:
      "linear-gradient(135deg,#fff7ed,#ffedd5 55%,#ffffff)",
    accent: "#ea580c",
    soft: "#ffedd5",
    text: "#c2410c",
  },
  {
    background:
      "linear-gradient(135deg,#ecfeff,#cffafe 55%,#ffffff)",
    accent: "#0891b2",
    soft: "#cffafe",
    text: "#0e7490",
  },
  {
    background:
      "linear-gradient(135deg,#fdf4ff,#fae8ff 55%,#ffffff)",
    accent: "#c026d3",
    soft: "#fae8ff",
    text: "#a21caf",
  },
  {
    background:
      "linear-gradient(135deg,#eef2ff,#e0e7ff 55%,#ffffff)",
    accent: "#4f46e5",
    soft: "#e0e7ff",
    text: "#4338ca",
  },
  {
    background:
      "linear-gradient(135deg,#f0fdfa,#ccfbf1 55%,#ffffff)",
    accent: "#0d9488",
    soft: "#ccfbf1",
    text: "#0f766e",
  },
  {
    background:
      "linear-gradient(135deg,#fff1f2,#ffe4e6 55%,#ffffff)",
    accent: "#e11d48",
    soft: "#ffe4e6",
    text: "#be123c",
  },
];

export default function Home() {
  const router = useRouter();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [referralCount, setReferralCount] = useState(0);
  const [referralClaimed, setReferralClaimed] = useState(false);
  const [loadingReferral, setLoadingReferral] = useState(false);

  const requiredReferrals = 10;
  const referralProgress = Math.min(
    referralCount,
    requiredReferrals
  );

  const referralCompleted =
    referralProgress >= requiredReferrals;

  /* =====================================================
     AUTH
  ===================================================== */

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      try {
        const { data } =
          await supabase.auth.getSession();

        if (!mounted) return;

        setIsLoggedIn(!!data.session);
      } catch {
        if (!mounted) return;

        setIsLoggedIn(false);
      } finally {
        if (mounted) {
          setCheckingAuth(false);
        }
      }
    };

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;

        setIsLoggedIn(!!session);
        setCheckingAuth(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /* =====================================================
     REFERRAL
  ===================================================== */

  useEffect(() => {
    let mounted = true;

    const loadReferralStats = async () => {
      if (!isLoggedIn) {
        if (mounted) {
          setReferralCount(0);
          setReferralClaimed(false);
        }

        return;
      }

      setLoadingReferral(true);

      try {
        const { data, error } =
          await supabase.rpc("get_referral_stats");

        if (!mounted) return;

        if (error) {
          console.error(
            "Referral stats error:",
            error
          );

          setReferralCount(0);
          setReferralClaimed(false);

          return;
        }

        const row = Array.isArray(data)
          ? data[0]
          : data;

        setReferralCount(
          Number(row?.valid_referrals ?? 0)
        );

        setReferralClaimed(
          Boolean(row?.already_claimed)
        );
      } catch (error) {
        console.error(
          "Referral loading error:",
          error
        );

        if (!mounted) return;

        setReferralCount(0);
        setReferralClaimed(false);
      } finally {
        if (mounted) {
          setLoadingReferral(false);
        }
      }
    };

    loadReferralStats();

    return () => {
      mounted = false;
    };
  }, [isLoggedIn]);

  /* =====================================================
     DEPOSIT
  ===================================================== */

  const handleDeposit = () => {
    if (checkingAuth) return;

    if (isLoggedIn) {
      router.push("/deposit");
    } else {
      router.push("/register");
    }
  };

  /* =====================================================
     REFERRAL BUTTON
  ===================================================== */

  const handleReferralClick = () => {
    if (!isLoggedIn) {
      router.push("/register");
      return;
    }

    router.push("/profile");
  };

  /* =====================================================
     CLAIM REFERRAL
  ===================================================== */

  const handleClaim = async () => {
    if (
      !isLoggedIn ||
      !referralCompleted ||
      referralClaimed
    ) {
      return;
    }

    try {
      setLoadingReferral(true);

      const { error } = await supabase.rpc(
        "claim_referral_reward"
      );

      if (error) {
        console.error(
          "Referral claim error:",
          error
        );

        alert(
          error.message ||
            "এই মুহূর্তে রেফারেল পুরস্কার নেওয়া যাচ্ছে না।"
        );

        return;
      }

      setReferralClaimed(true);

      alert(
        "আপনার ৳১,০০০ রেফারেল পুরস্কার সফলভাবে যোগ করা হয়েছে।"
      );
    } catch (error) {
      console.error(
        "Referral claim error:",
        error
      );

      alert(
        "এই মুহূর্তে রেফারেল পুরস্কার নেওয়া যাচ্ছে না।"
      );
    } finally {
      setLoadingReferral(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f7f9f8] pb-24 text-slate-900">

      {/* =================================================
          HEADER
      ================================================= */}

      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/90 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">

          <Link
            href="/"
            className="flex items-center gap-3"
          >
            <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-[14px] bg-slate-950 shadow-lg">
              <div className="absolute -right-2 -top-2 h-7 w-7 rounded-full bg-green-400/30 blur-md" />

              <span className="relative text-lg font-black text-white">
                P
              </span>
            </div>

            <div>
              <h1 className="text-[16px] font-black tracking-tight">
                পকেট মানি
              </h1>

              <p className="text-[10px] font-semibold text-slate-400">
                কাজ করুন • পুরস্কার নিন
              </p>
            </div>
          </Link>

          {isLoggedIn ? (
            <Link
              href="/profile"
              className="rounded-xl border border-green-200 bg-green-50 px-3.5 py-2 text-xs font-black text-green-700 transition hover:bg-green-100"
            >
              প্রোফাইল
            </Link>
          ) : (
            <Link
              href="/login"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 shadow-sm transition hover:border-green-300 hover:text-green-600"
            >
              Login
            </Link>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 sm:px-6">

        {/* =================================================
            TOP ACTIONS
        ================================================= */}

        <section className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">

          <button
            type="button"
            onClick={handleDeposit}
            disabled={checkingAuth}
            className="group flex h-[74px] items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 shadow-sm transition hover:border-green-200 hover:shadow-md active:scale-[0.98] disabled:cursor-wait disabled:opacity-60 sm:h-[82px] sm:justify-center sm:gap-3"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-lg font-black text-green-600 group-hover:bg-green-100">
              ＋
            </span>

            <div className="text-left">
              <p className="text-[9px] font-bold text-slate-400">
                টাকা যোগ
              </p>

              <p className="mt-0.5 text-[11px] font-black text-slate-800 sm:text-xs">
                ডিপোজিট
              </p>
            </div>
          </button>

          <Link
            href="/withdraw"
            className="group flex h-[74px] items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 shadow-sm transition hover:border-blue-200 hover:shadow-md active:scale-[0.98] sm:h-[82px] sm:justify-center sm:gap-3"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg font-black text-blue-600">
              ↗
            </span>

            <div className="text-left">
              <p className="text-[9px] font-bold text-slate-400">
                টাকা বের করুন
              </p>

              <p className="mt-0.5 text-[11px] font-black text-slate-800 sm:text-xs">
                উত্তোলন
              </p>
            </div>
          </Link>

          <Link
            href="/wallet"
            className="group flex h-[74px] items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 shadow-sm transition hover:border-purple-200 hover:shadow-md active:scale-[0.98] sm:h-[82px] sm:justify-center sm:gap-3"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-base font-black text-purple-600">
              ৳
            </span>

            <div className="text-left">
              <p className="text-[9px] font-bold text-slate-400">
                আপনার টাকা
              </p>

              <p className="mt-0.5 text-[11px] font-black text-slate-800 sm:text-xs">
                ব্যালেন্স
              </p>
            </div>
          </Link>

        </section>

        {/* =================================================
            COMPACT DEPOSIT BONUS
        ================================================= */}

        <section className="relative mt-4 overflow-hidden rounded-[24px] bg-slate-950 shadow-[0_14px_40px_rgba(15,23,42,0.10)]">

          <div className="absolute -right-16 -top-20 h-44 w-44 rounded-full bg-green-500/15 blur-3xl" />

          <div className="absolute -bottom-16 -left-12 h-36 w-36 rounded-full bg-emerald-400/10 blur-3xl" />

          <div className="relative p-4 sm:p-5">

            <div className="flex items-center justify-between gap-3">

              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full border border-green-400/20 bg-green-400/10 px-2.5 py-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-400" />

                  <span className="text-[9px] font-black text-green-300">
                    বিশেষ অফার
                  </span>
                </div>

                <h2 className="mt-2 text-base font-black tracking-tight text-white sm:text-lg">
                  ডিপোজিট করুন, বোনাস পান
                </h2>
              </div>

              <div className="hidden rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-right sm:block">
                <p className="text-[8px] font-bold text-slate-500">
                  অতিরিক্ত
                </p>

                <p className="text-sm font-black text-green-400">
                  +৳৫০০
                </p>
              </div>

            </div>

            <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2">

              <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-3 sm:px-4">
                <p className="text-[8px] font-bold text-slate-500">
                  ডিপোজিট
                </p>

                <p className="mt-0.5 text-xl font-black text-white sm:text-2xl">
                  ৳২,০০০
                </p>
              </div>

              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-base font-black text-white shadow-lg shadow-green-900/30">
                +
              </div>

              <div className="rounded-2xl border border-green-400/20 bg-green-500/10 px-3 py-3 sm:px-4">
                <p className="text-[8px] font-bold text-green-300">
                  বোনাস
                </p>

                <p className="mt-0.5 text-xl font-black text-green-400 sm:text-2xl">
                  ৳৫০০
                </p>
              </div>

            </div>

            <div className="mt-2 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5">

              <div>
                <p className="text-[8px] font-bold text-slate-500">
                  মোট
                </p>

                <p className="text-base font-black text-white">
                  ৳২,৫০০
                </p>
              </div>

              <button
                type="button"
                onClick={handleDeposit}
                disabled={checkingAuth}
                className="rounded-xl bg-green-500 px-4 py-2.5 text-[10px] font-black text-white shadow-lg shadow-green-950/20 transition hover:bg-green-400 active:scale-[0.98] disabled:cursor-wait disabled:opacity-60 sm:px-5 sm:text-xs"
              >
                {checkingAuth
                  ? "অপেক্ষা করুন..."
                  : "ডিপোজিট শুরু করুন"}
                <span className="ml-1.5">
                  →
                </span>
              </button>

            </div>

          </div>
        </section>

        {/* =================================================
            REFERRAL
        ================================================= */}

        <section className="mt-4 overflow-hidden rounded-[24px] border border-green-100 bg-white shadow-sm">

          <div className="p-4 sm:p-5">

            <div className="flex items-center justify-between gap-3">

              <div>
                <span className="rounded-full bg-green-50 px-2.5 py-1 text-[8px] font-black text-green-700">
                  বিশেষ পুরস্কার
                </span>

                <h2 className="mt-2 text-base font-black tracking-tight text-slate-950 sm:text-lg">
                  বন্ধুদের আমন্ত্রণ করুন
                </h2>
              </div>

              <div className="hidden h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-base sm:flex">
                👥
              </div>

            </div>

            <div className="mt-4 rounded-2xl bg-slate-50 p-3.5">

              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-slate-500">
                  বৈধ রেফারেল
                </span>

                <span className="text-xs font-black text-green-600">
                  {loadingReferral
                    ? "..."
                    : `${referralProgress}/${requiredReferrals}`}
                </span>
              </div>

              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-500"
                  style={{
                    width: `${
                      (referralProgress /
                        requiredReferrals) *
                      100
                    }%`,
                  }}
                />
              </div>

            </div>

            <div className="mt-3 flex items-center justify-between gap-3">

              <div>
                <p className="text-[8px] font-bold text-slate-400">
                  রেফারেল পুরস্কার
                </p>

                <p className="mt-0.5 text-xl font-black text-slate-950">
                  ৳১,০০০
                </p>
              </div>

              {referralCompleted &&
              !referralClaimed ? (
                <button
                  type="button"
                  onClick={handleClaim}
                  disabled={loadingReferral}
                  className="rounded-xl bg-green-600 px-4 py-2.5 text-[10px] font-black text-white shadow-sm transition hover:bg-green-700 disabled:cursor-wait disabled:opacity-60"
                >
                  {loadingReferral
                    ? "নেওয়া হচ্ছে..."
                    : "৳১,০০০ নিন"}
                </button>
              ) : referralClaimed ? (
                <div className="rounded-xl bg-green-50 px-4 py-2.5 text-[10px] font-black text-green-700">
                  নেওয়া হয়েছে ✓
                </div>
              ) : (
                <div className="rounded-xl bg-slate-100 px-3 py-2.5 text-[9px] font-bold text-slate-500">
                  ১০টি রেফারেল
                </div>
              )}

            </div>

            <button
              type="button"
              onClick={handleReferralClick}
              className="mt-3 flex w-full items-center justify-center rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-[10px] font-black text-green-700 transition hover:bg-green-100"
            >
              {isLoggedIn
                ? "বন্ধুদের আমন্ত্রণ করুন"
                : "Registration করুন"}

              <span className="ml-1.5">
                →
              </span>
            </button>

          </div>
        </section>

        {/* =================================================
            PACKAGES
        ================================================= */}

        <section className="mt-7">

          <div className="flex items-end justify-between gap-3">

            <div>
              <p className="text-[9px] font-black tracking-[0.15em] text-green-600">
                প্যাকেজ
              </p>

              <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
                উপলব্ধ প্যাকেজ
              </h2>

              <p className="mt-1 text-[10px] text-slate-500 sm:text-xs">
                আপনার প্রয়োজন অনুযায়ী প্যাকেজ বেছে নিন।
              </p>
            </div>

            <Link
              href="/packages"
              className="shrink-0 rounded-xl bg-white px-3 py-2 text-[9px] font-black text-green-600 shadow-sm ring-1 ring-slate-200 transition hover:bg-green-50"
            >
              সব দেখুন →
            </Link>

          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {packages.map((pkg, index) => (
              <PackageCard
                key={pkg.id}
                pkg={pkg}
                index={index}
              />
            ))}
          </div>

        </section>

        {/* =================================================
            HOW IT WORKS
        ================================================= */}

        <section className="mt-7 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">

          <p className="text-[9px] font-black tracking-[0.15em] text-green-600">
            শুরু করুন
          </p>

          <h2 className="mt-1 text-lg font-black tracking-tight text-slate-950">
            কীভাবে কাজ করে
          </h2>

          <div className="mt-4 grid gap-2.5 sm:grid-cols-3">

            <Step
              number="০১"
              title="অ্যাকাউন্ট তৈরি করুন"
              description="আপনার ব্যক্তিগত অ্যাকাউন্ট তৈরি করুন।"
            />

            <Step
              number="০২"
              title="কাজ সম্পন্ন করুন"
              description="যোগ্য কাজ সম্পন্ন করে প্রমাণ জমা দিন।"
            />

            <Step
              number="০৩"
              title="পুরস্কার পান"
              description="অনুমোদনের পর প্রযোজ্য পুরস্কার ব্যালেন্সে যোগ হবে।"
            />

          </div>
        </section>

        {/* =================================================
            NOTICE
        ================================================= */}

        <section className="mt-4 rounded-2xl border border-green-100 bg-green-50/80 p-3.5">

          <div className="flex gap-3">

            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-xs font-black text-green-600 shadow-sm">
              ✓
            </div>

            <div>
              <h3 className="text-[11px] font-black text-green-800">
                পুরস্কার সংক্রান্ত তথ্য
              </h3>

              <p className="mt-1 text-[9px] leading-4 text-green-700">
                পুরস্কার কাজ, যোগ্যতা, অনুমোদন ও সংশ্লিষ্ট
                অফারের শর্তের ওপর নির্ভরশীল।
              </p>
            </div>

          </div>
        </section>

        <div className="h-4" />
      </div>

      {/* =================================================
          BOTTOM NAV
      ================================================= */}

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200/80 bg-white/90 backdrop-blur-2xl">

        <div className="mx-auto grid max-w-6xl grid-cols-5 gap-1 px-2 py-2">

          <BottomNavItem
            href="/"
            icon="⌂"
            label="হোম"
            active
          />

          <BottomNavItem
            href="/tasks"
            icon="✓"
            label="কাজ"
          />

          <BottomNavItem
            href="/packages"
            icon="▣"
            label="প্যাকেজ"
          />

          <BottomNavItem
            href="/wallet"
            icon="৳"
            label="ওয়ালেট"
          />

          <BottomNavItem
            href="/profile"
            icon="◎"
            label="প্রোফাইল"
          />

        </div>
      </nav>

    </main>
  );
}

/* =====================================================
   PACKAGE CARD
===================================================== */

function PackageCard({
  pkg,
  index,
}: {
  pkg: Package;
  index: number;
}) {
  const totalEarning =
    pkg.dailyEarning * pkg.duration;

  const theme =
    packageThemes[index % packageThemes.length];

  return (
    <article className="group overflow-hidden rounded-[23px] border border-slate-200/80 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg">

      <div
        className="relative overflow-hidden px-5 py-5"
        style={{
          background: theme.background,
        }}
      >

        <div
          className="absolute -right-10 -top-12 h-32 w-32 rounded-full blur-2xl"
          style={{
            background: `${theme.accent}18`,
          }}
        />

        <div className="relative flex items-center justify-between">

          <span
            className="rounded-full px-2.5 py-1 text-[8px] font-black"
            style={{
              backgroundColor: theme.soft,
              color: theme.text,
            }}
          >
            প্যাকেজ
          </span>

          <span className="text-[8px] font-bold text-slate-400">
            {pkg.duration} দিন
          </span>

        </div>

        <div className="relative mt-4 flex items-end justify-between">

          <div>
            <p className="text-[8px] font-bold text-slate-500">
              প্যাকেজ মূল্য
            </p>

            <h3
              className="mt-1 text-[34px] font-black leading-none tracking-[-0.04em]"
              style={{
                color: theme.text,
              }}
            >
              {taka(pkg.amount)}
            </h3>
          </div>

          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/80 text-xs font-black shadow-sm"
            style={{
              color: theme.accent,
            }}
          >
            ✓
          </div>

        </div>
      </div>

      <div className="p-3.5">

        <div className="grid grid-cols-3 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">

          <div className="p-2.5">
            <p className="text-[7px] font-bold text-slate-400">
              দৈনিক
            </p>

            <p
              className="mt-1 text-xs font-black"
              style={{
                color: theme.accent,
              }}
            >
              {taka(pkg.dailyEarning)}
            </p>
          </div>

          <div className="border-x border-slate-200 p-2.5">
            <p className="text-[7px] font-bold text-slate-400">
              মেয়াদ
            </p>

            <p className="mt-1 text-xs font-black text-slate-800">
              {pkg.duration} দিন
            </p>
          </div>

          <div className="p-2.5">
            <p className="text-[7px] font-bold text-slate-400">
              মোট
            </p>

            <p className="mt-1 text-xs font-black text-slate-800">
              {taka(totalEarning)}
            </p>
          </div>

        </div>

        <Link
          href={`/packages?id=${pkg.id}`}
          className="mt-3 flex w-full items-center justify-center rounded-xl px-4 py-3 text-[10px] font-black text-white shadow-sm transition active:scale-[0.99]"
          style={{
            background: `linear-gradient(135deg, ${theme.accent}, ${theme.text})`,
          }}
        >
          প্যাকেজ দেখুন

          <span className="ml-1.5 text-sm">
            →
          </span>
        </Link>

      </div>
    </article>
  );
}

/* =====================================================
   STEP
===================================================== */

function Step({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5">

      <div className="flex items-center gap-3">

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[9px] font-black text-green-600 shadow-sm">
          {number}
        </div>

        <h3 className="text-[11px] font-black text-slate-900">
          {title}
        </h3>

      </div>

      <p className="mt-2.5 text-[9px] leading-4 text-slate-500">
        {description}
      </p>

    </div>
  );
}

/* =====================================================
   BOTTOM NAV
===================================================== */

function BottomNavItem({
  href,
  icon,
  label,
  active = false,
}: {
  href: string;
  icon: string;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex min-h-[56px] flex-col items-center justify-center rounded-xl transition ${
        active
          ? "bg-green-50 text-green-600"
          : "text-slate-400 hover:bg-slate-50 hover:text-slate-700"
      }`}
    >

      <span
        className={`text-lg leading-none ${
          active
            ? "font-black"
            : "font-bold"
        }`}
      >
        {icon}
      </span>

      <span
        className={`mt-1 text-[9px] ${
          active
            ? "font-black"
            : "font-semibold"
        }`}
      >
        {label}
      </span>

    </Link>
  );
}