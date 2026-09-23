"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type ProfileData = {
  username: string | null;
  full_name: string | null;
  phone: string | null;
  referral_code: string | null;
  avatar_url: string | null;
};

type WalletData = {
  balance: number;
  total_earned: number;
};

type ReferralStats = {
  referral_code: string | null;
  valid_referrals: number;
  required_referrals: number;
  reward_amount: number;
  already_claimed: boolean;
};

type ActivePackage = {
  id: string;
  package_amount: number;
  activated_at: string;
  active_from?: string;
  expires_at: string;
};

function taka(value: number) {
  return `৳${Number(value || 0).toLocaleString("en-BD")}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("bn-BD", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function ProfilePage() {
  const router = useRouter();
  const pathname = usePathname();

  const [loading, setLoading] = useState(true);

  const [profile, setProfile] = useState<ProfileData | null>(
    null
  );

  const [wallet, setWallet] = useState<WalletData | null>(
    null
  );

  const [referral, setReferral] =
    useState<ReferralStats | null>(null);

  const [activePackages, setActivePackages] = useState<
    ActivePackage[]
  >([]);

  const [memberSince, setMemberSince] = useState<string | null>(
    null
  );

  const [copied, setCopied] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      setLoading(true);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        console.error(
          "PROFILE AUTH ERROR:",
          authError
        );

        setLoading(false);
        router.replace("/login");
        return;
      }

      if (!user) {
        setLoading(false);
        router.replace("/login");
        return;
      }

      const [
        profileResult,
        walletResult,
        referralResult,
        packageResult,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "username, full_name, phone, referral_code, avatar_url"
          )
          .eq("id", user.id)
          .maybeSingle(),

        supabase
          .from("wallets")
          .select("balance, total_earned")
          .eq("user_id", user.id)
          .maybeSingle(),

        supabase.rpc("get_referral_stats"),

        supabase.rpc("get_my_active_packages"),
      ]);

      if (profileResult.error) {
        console.error(
          "PROFILE DATA ERROR:",
          profileResult.error
        );
      }

      if (walletResult.error) {
        console.error(
          "PROFILE WALLET ERROR:",
          walletResult.error
        );
      }

      if (referralResult.error) {
        console.error(
          "PROFILE REFERRAL ERROR:",
          referralResult.error
        );
      }

      if (packageResult.error) {
        console.error(
          "PROFILE PACKAGE ERROR:",
          packageResult.error
        );
      }

      if (profileResult.data) {
        setProfile(profileResult.data);
      }

      if (walletResult.data) {
        setWallet({
          balance: Number(
            walletResult.data.balance || 0
          ),

          total_earned: Number(
            walletResult.data.total_earned || 0
          ),
        });
      }

      if (referralResult.data) {
        const raw = Array.isArray(
          referralResult.data
        )
          ? referralResult.data[0]
          : referralResult.data;

        if (raw) {
          setReferral({
            referral_code:
              raw.referral_code ||
              profileResult.data?.referral_code ||
              null,

            valid_referrals: Number(
              raw.valid_referrals || 0
            ),

            required_referrals: Number(
              raw.required_referrals || 10
            ),

            reward_amount: Number(
              raw.reward_amount || 1000
            ),

            already_claimed: Boolean(
              raw.already_claimed
            ),
          });
        }
      }

      if (packageResult.data) {
        setActivePackages(
          packageResult.data as ActivePackage[]
        );
      }

      setMemberSince(user.created_at);
    } catch (error) {
      console.error(
        "PROFILE LOAD ERROR:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  const referralCode =
    referral?.referral_code ||
    profile?.referral_code ||
    "";

  const referralLink = useMemo(() => {
    if (
      !referralCode ||
      typeof window === "undefined"
    ) {
      return "";
    }

    return `${window.location.origin}/register?ref=${encodeURIComponent(
      referralCode
    )}`;
  }, [referralCode]);

  async function copyReferralLink() {
    if (!referralLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        referralLink
      );

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error(
        "COPY REFERRAL ERROR:",
        error
      );

      setCopied(false);
    }
  }

  async function handleLogout() {
    if (loggingOut) {
      return;
    }

    try {
      setLoggingOut(true);

      const { error } =
        await supabase.auth.signOut();

      if (error) {
        console.error(
          "LOGOUT ERROR:",
          error
        );

        setLoggingOut(false);

        return;
      }

      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error(
        "LOGOUT ERROR:",
        error
      );

      setLoggingOut(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#eef3f7] px-4 py-8 pb-32">
        <div className="mx-auto max-w-md">

          <div className="animate-pulse space-y-4">

            <div className="h-40 rounded-[30px] bg-slate-200" />

            <div className="h-56 rounded-[30px] bg-slate-200" />

            <div className="h-80 rounded-[30px] bg-slate-200" />

          </div>

        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#eef3f7] px-4 pb-32">

        <div className="w-full max-w-md rounded-3xl bg-white p-7 text-center shadow-sm">

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-purple-50 text-3xl">
            👤
          </div>

          <h1 className="mt-5 text-xl font-black text-slate-900">
            প্রোফাইল পাওয়া যায়নি
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            আপনার প্রোফাইলের তথ্য পাওয়া যাচ্ছে না।
          </p>

          <Link
            href="/"
            className="mt-5 inline-flex rounded-2xl bg-purple-600 px-6 py-3 font-black text-white"
          >
            হোমে যান
          </Link>

        </div>

      </main>
    );
  }

  const displayName =
    profile.full_name ||
    profile.username ||
    "ব্যবহারকারী";

  const referralCount =
    referral?.valid_referrals || 0;

  const requiredReferral =
    referral?.required_referrals || 10;

  const referralProgress =
    requiredReferral > 0
      ? Math.min(
          100,
          (referralCount /
            requiredReferral) *
            100
        )
      : 0;

  const navigationItems = [
    {
      href: "/",
      label: "হোম",
      icon: "⌂",
    },
    {
      href: "/packages",
      label: "প্যাকেজ",
      icon: "▣",
    },
    {
      href: "/wallet",
      label: "ওয়ালেট",
      icon: "৳",
    },
    {
      href: "/profile",
      label: "প্রোফাইল",
      icon: "●",
    },
  ];

  return (
    <main className="min-h-screen bg-[#eef3f7] pb-32">

      <div className="mx-auto w-full max-w-md px-4 py-6">

        {/* PROFILE HEADER */}

        <section className="relative rounded-[30px] bg-gradient-to-br from-[#5b22a7] via-[#7132c8] to-[#9254e9] px-5 pb-7 pt-14 text-white shadow-lg">

          <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">

            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-white shadow-lg">

              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="প্রোফাইল ছবি"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="text-5xl">
                  👤
                </div>
              )}

            </div>

          </div>

          <div className="text-center">

            <p className="text-xs font-black tracking-[0.2em] text-purple-100">
              পকেট মানি
            </p>

            <h1 className="mt-1 text-2xl font-black">
              {displayName}
            </h1>

            <p className="mt-1 text-sm font-medium text-purple-100">
              {profile.phone ||
                "মোবাইল নম্বর যোগ করা হয়নি"}
            </p>

          </div>

        </section>


        {/* REFERRAL SECTION */}

        <section className="mt-4 rounded-[28px] border border-purple-100 bg-white p-5 shadow-sm">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-xs font-black uppercase tracking-wider text-purple-600">
                রেফারেল
              </p>

              <h2 className="mt-1 text-lg font-black text-slate-900">
                বন্ধুদের আমন্ত্রণ করুন
              </h2>

            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-2xl">
              👥
            </div>

          </div>


          {/* REFERRAL CODE */}

          <div className="mt-4 rounded-2xl bg-slate-50 p-4">

            <p className="text-[11px] font-black text-slate-400">
              আপনার রেফারেল কোড
            </p>

            <p className="mt-1 break-all text-lg font-black text-purple-700">
              {referralCode ||
                "তৈরি হয়নি"}
            </p>

          </div>


          {/* COPY BUTTON */}

          {referralLink && (
            <button
              type="button"
              onClick={
                copyReferralLink
              }
              className="mt-3 w-full rounded-2xl bg-purple-600 px-4 py-3.5 text-sm font-black text-white transition active:scale-[0.98]"
            >
              {copied
                ? "রেফারেল লিংক কপি হয়েছে"
                : "রেফারেল লিংক কপি করুন"}
            </button>
          )}


          {/* PROGRESS */}

          <div className="mt-5">

            <div className="flex items-center justify-between">

              <span className="text-sm font-bold text-slate-600">
                বৈধ রেফারেল
              </span>

              <span className="text-sm font-black text-slate-900">
                {referralCount}/
                {requiredReferral}
              </span>

            </div>

            <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">

              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-purple-700 transition-all"
                style={{
                  width: `${referralProgress}%`,
                }}
              />

            </div>

            <p className="mt-3 text-xs font-medium leading-5 text-slate-500">

              {requiredReferral} জন বৈধ রেফারেল
              সম্পন্ন হলে ৳
              {Number(
                referral?.reward_amount ||
                  1000
              ).toLocaleString(
                "en-BD"
              )}{" "}
              পুরস্কারের যোগ্যতা অর্জন করবেন।

            </p>

          </div>

        </section>


        {/* ACCOUNT INFORMATION */}

        <section className="mt-4 overflow-hidden rounded-[28px] bg-white shadow-sm">

          <div className="border-b border-slate-100 px-5 py-4">

            <h2 className="text-lg font-black text-slate-900">
              অ্যাকাউন্ট তথ্য
            </h2>

          </div>

          <div className="divide-y divide-slate-100">

            {/* NAME */}

            <div className="flex items-center gap-4 px-5 py-4">

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-purple-50 text-xl">
                👤
              </div>

              <div className="min-w-0 flex-1">

                <p className="text-xs font-medium text-slate-400">
                  নাম
                </p>

                <p className="mt-1 truncate text-sm font-black text-slate-800">
                  {displayName}
                </p>

              </div>

            </div>


            {/* PHONE */}

            <div className="flex items-center gap-4 px-5 py-4">

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-purple-50 text-xl">
                📱
              </div>

              <div className="min-w-0 flex-1">

                <p className="text-xs font-medium text-slate-400">
                  মোবাইল
                </p>

                <p className="mt-1 truncate text-sm font-black text-slate-800">
                  {profile.phone ||
                    "-"}
                </p>

              </div>

            </div>


            {/* BALANCE */}

            <div className="flex items-center gap-4 px-5 py-4">

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-purple-50 text-xl">
                💰
              </div>

              <div className="min-w-0 flex-1">

                <p className="text-xs font-medium text-slate-400">
                  ব্যালেন্স
                </p>

                <p className="mt-1 text-sm font-black text-slate-900">
                  {taka(
                    wallet?.balance ||
                      0
                  )}
                </p>

              </div>

            </div>


            {/* TOTAL EARNED */}

            <div className="flex items-center gap-4 px-5 py-4">

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-green-50 text-xl">
                📈
              </div>

              <div className="min-w-0 flex-1">

                <p className="text-xs font-medium text-slate-400">
                  মোট আয়
                </p>

                <p className="mt-1 text-sm font-black text-green-600">
                  {taka(
                    wallet?.total_earned ||
                      0
                  )}
                </p>

              </div>

            </div>


            {/* ACTIVE PACKAGE */}

            <div className="flex items-center gap-4 px-5 py-4">

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-xl">
                📦
              </div>

              <div className="min-w-0 flex-1">

                <p className="text-xs font-medium text-slate-400">
                  প্যাকেজ
                </p>

                <p className="mt-1 text-sm font-black text-slate-800">
                  {activePackages.length >
                  0
                    ? "সক্রিয়"
                    : "কোনো সক্রিয় প্যাকেজ নেই"}
                </p>

              </div>

            </div>


            {/* REFERRALS */}

            <div className="flex items-center gap-4 px-5 py-4">

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-xl">
                👥
              </div>

              <div className="min-w-0 flex-1">

                <p className="text-xs font-medium text-slate-400">
                  মোট রেফারেল
                </p>

                <p className="mt-1 text-sm font-black text-slate-800">
                  {referralCount}
                </p>

              </div>

            </div>


            {/* MEMBER SINCE */}

            <div className="flex items-center gap-4 px-5 py-4">

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-xl">
                📅
              </div>

              <div className="min-w-0 flex-1">

                <p className="text-xs font-medium text-slate-400">
                  সদস্য হওয়ার তারিখ
                </p>

                <p className="mt-1 text-sm font-black text-slate-800">
                  {formatDate(
                    memberSince
                  )}
                </p>

              </div>

            </div>

          </div>

        </section>


        {/* ACTIVE PACKAGES */}

        {activePackages.length >
          0 && (
          <section className="mt-4 rounded-[28px] bg-white p-5 shadow-sm">

            <div className="flex items-center justify-between">

              <h2 className="text-lg font-black text-slate-900">
                সক্রিয় প্যাকেজ
              </h2>

              <Link
                href="/packages"
                className="text-xs font-black text-purple-600"
              >
                সব দেখুন
              </Link>

            </div>

            <div className="mt-4 space-y-3">

              {activePackages.map(
                (item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-purple-100 bg-purple-50 p-4"
                  >

                    <div className="flex items-center justify-between gap-3">

                      <div>

                        <p className="text-xs font-bold text-purple-600">
                          প্যাকেজ
                        </p>

                        <p className="mt-1 text-xl font-black text-slate-900">
                          {taka(
                            item.package_amount
                          )}
                        </p>

                      </div>

                      <span className="rounded-full bg-green-100 px-3 py-1.5 text-xs font-black text-green-700">
                        সক্রিয়
                      </span>

                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs">

                      <span className="font-medium text-slate-500">
                        শুরু
                      </span>

                      <span className="font-black text-slate-700">
                        {formatDate(
                          item.active_from ||
                            item.activated_at
                        )}
                      </span>

                    </div>

                    <div className="mt-1 flex items-center justify-between text-xs">

                      <span className="font-medium text-slate-500">
                        শেষ
                      </span>

                      <span className="font-black text-slate-700">
                        {formatDate(
                          item.expires_at
                        )}
                      </span>

                    </div>

                  </div>
                )
              )}

            </div>

          </section>
        )}


        {/* QUICK ACTIONS */}

        <div className="mt-5 grid grid-cols-2 gap-3">

          <Link
            href="/wallet"
            className="rounded-2xl bg-white px-4 py-3.5 text-center text-sm font-black text-slate-800 shadow-sm transition active:scale-[0.98]"
          >
            ওয়ালেট
          </Link>

          <Link
            href="/withdraw"
            className="rounded-2xl bg-white px-4 py-3.5 text-center text-sm font-black text-slate-800 shadow-sm transition active:scale-[0.98]"
          >
            উত্তোলন
          </Link>

          <Link
            href="/deposit"
            className="rounded-2xl bg-white px-4 py-3.5 text-center text-sm font-black text-slate-800 shadow-sm transition active:scale-[0.98]"
          >
            ডিপোজিট
          </Link>

          <Link
            href="/packages"
            className="rounded-2xl bg-white px-4 py-3.5 text-center text-sm font-black text-slate-800 shadow-sm transition active:scale-[0.98]"
          >
            প্যাকেজ
          </Link>

        </div>


        {/* LOGOUT */}

        <button
          type="button"
          onClick={
            handleLogout
          }
          disabled={
            loggingOut
          }
          className="mt-4 w-full rounded-2xl bg-gradient-to-r from-purple-700 to-purple-500 px-5 py-4 text-sm font-black text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loggingOut
            ? "লগ আউট হচ্ছে..."
            : "লগ আউট করুন"}
        </button>

      </div>


      {/* FIXED BOTTOM NAVIGATION */}

      <nav className="fixed bottom-0 left-0 right-0 z-[100] px-3 pb-3">

        <div className="mx-auto flex w-full max-w-md items-center justify-between rounded-[26px] border border-white/80 bg-white/95 p-2 shadow-[0_-8px_35px_rgba(15,23,42,0.12)] backdrop-blur-xl">

          {navigationItems.map(
            (item) => {

              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname ===
                      item.href ||
                    pathname.startsWith(
                      `${item.href}/`
                    );

              return (
                <Link
                  key={item.href}
                  href={
                    item.href
                  }
                  className={`flex min-w-0 flex-1 flex-col items-center justify-center rounded-[20px] px-2 py-2.5 transition-all duration-200 ${
                    isActive
                      ? "bg-purple-600 text-white shadow-lg shadow-purple-200"
                      : "text-slate-400 hover:bg-slate-50 hover:text-purple-600"
                  }`}
                >

                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-lg font-black ${
                      isActive
                        ? "bg-white/15"
                        : ""
                    }`}
                  >
                    {item.icon}
                  </span>

                  <span
                    className={`mt-1 text-[10px] font-black ${
                      isActive
                        ? "text-white"
                        : "text-slate-500"
                    }`}
                  >
                    {item.label}
                  </span>

                </Link>
              );
            }
          )}

        </div>

      </nav>

    </main>
  );
}