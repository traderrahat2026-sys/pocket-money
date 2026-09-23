"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type PackageData = {
  id: string;
  name: string;
  amount?: number | null;
  daily_earning?: number | null;
  duration_days?: number | null;
  total_earning?: number | null;
  image_url?: string | null;
  is_active?: boolean;
};

type Activation = {
  id: string;
  package_amount: number;
  activated_at?: string | null;
  active_from?: string | null;
  deactivated_at?: string | null;
  expires_at?: string | null;
};

type PopupType =
  | "success"
  | "error"
  | "warning"
  | "login"
  | null;

type PopupState = {
  type: PopupType;
  title: string;
  message: string;
};

type Props = {
  pkg: PackageData;
};

export default function PackageCard({ pkg }: Props) {
  const router = useRouter();

  const [isChecking, setIsChecking] = useState(true);
  const [isActivating, setIsActivating] = useState(false);
  const [isActivated, setIsActivated] = useState(false);
  const [popup, setPopup] = useState<PopupState | null>(null);

  const amount = Number(pkg.amount ?? 0);
  const dailyEarning = Number(pkg.daily_earning ?? 0);
  const durationDays = Number(pkg.duration_days ?? 0);
  const totalEarning = Number(
    pkg.total_earning ?? dailyEarning * durationDays
  );

  const money = (value: number) =>
    `৳${value.toLocaleString("en-BD")}`;

  /*
   * =====================================================
   * PACKAGE COLORS
   * =====================================================
   */

  const getPackageVisual = () => {
    if (amount === 500) {
      return {
        background:
          "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 50%, #a7f3d0 100%)",
        border: "#86efac",
        text: "#047857",
        dark: "#065f46",
        glow: "rgba(16,185,129,0.22)",
      };
    }

    if (amount === 1000) {
      return {
        background:
          "linear-gradient(135deg, #eff6ff 0%, #dbeafe 50%, #bfdbfe 100%)",
        border: "#93c5fd",
        text: "#2563eb",
        dark: "#1e40af",
        glow: "rgba(59,130,246,0.22)",
      };
    }

    if (amount === 1500) {
      return {
        background:
          "linear-gradient(135deg, #faf5ff 0%, #f3e8ff 50%, #e9d5ff 100%)",
        border: "#d8b4fe",
        text: "#9333ea",
        dark: "#6b21a8",
        glow: "rgba(168,85,247,0.22)",
      };
    }

    if (amount === 2000) {
      return {
        background:
          "linear-gradient(135deg, #fff7ed 0%, #ffedd5 50%, #fed7aa 100%)",
        border: "#fdba74",
        text: "#ea580c",
        dark: "#9a3412",
        glow: "rgba(249,115,22,0.22)",
      };
    }

    if (amount === 3000) {
      return {
        background:
          "linear-gradient(135deg, #fefce8 0%, #fef3c7 50%, #fde68a 100%)",
        border: "#facc15",
        text: "#ca8a04",
        dark: "#854d0e",
        glow: "rgba(234,179,8,0.24)",
      };
    }

    if (amount === 5000) {
      return {
        background:
          "linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #fbcfe8 100%)",
        border: "#f9a8d4",
        text: "#db2777",
        dark: "#9d174d",
        glow: "rgba(236,72,153,0.22)",
      };
    }

    if (amount === 10000) {
      return {
        background:
          "linear-gradient(135deg, #eef2ff 0%, #e0e7ff 50%, #c7d2fe 100%)",
        border: "#a5b4fc",
        text: "#4f46e5",
        dark: "#3730a3",
        glow: "rgba(99,102,241,0.24)",
      };
    }

    if (amount === 20000) {
      return {
        background:
          "linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 50%, #99f6e4 100%)",
        border: "#5eead4",
        text: "#0f766e",
        dark: "#115e59",
        glow: "rgba(20,184,166,0.24)",
      };
    }

    if (amount === 25000) {
      return {
        background:
          "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 50%, #ddd6fe 100%)",
        border: "#c4b5fd",
        text: "#7c3aed",
        dark: "#5b21b6",
        glow: "rgba(124,58,237,0.25)",
      };
    }

    return {
      background:
        "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 50%, #bbf7d0 100%)",
      border: "#86efac",
      text: "#16a34a",
      dark: "#166534",
      glow: "rgba(34,197,94,0.22)",
    };
  };

  const visual = getPackageVisual();

  /*
   * =====================================================
   * POPUP
   * =====================================================
   */

  const closePopup = () => {
    setPopup(null);
  };

  const showPopup = (
    type: PopupType,
    title: string,
    message: string
  ) => {
    setPopup({
      type,
      title,
      message,
    });
  };

  /*
   * =====================================================
   * CHECK ACTIVE PACKAGE
   * =====================================================
   */

  const checkActivePackage = useCallback(async () => {
    try {
      setIsChecking(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setIsActivated(false);
        setIsChecking(false);
        return;
      }

      const { data, error } = await supabase.rpc(
        "get_my_active_packages"
      );

      if (error) {
        console.error(
          "Active package check error:",
          error
        );

        setIsActivated(false);
        setIsChecking(false);
        return;
      }

      let activations: Activation[] = [];

      if (Array.isArray(data)) {
        activations = data as Activation[];
      } else if (
        data &&
        typeof data === "object"
      ) {
        activations = [data as Activation];
      }

      const matchingPackage = activations.find(
        (item) =>
          Number(item.package_amount) === Number(amount)
      );

      if (!matchingPackage) {
        setIsActivated(false);
        setIsChecking(false);
        return;
      }

      const now = new Date();

      let active = true;

      if (matchingPackage.expires_at) {
        const expiresAt = new Date(
          matchingPackage.expires_at
        );

        if (now >= expiresAt) {
          active = false;
        }
      }

      if (matchingPackage.deactivated_at) {
        const deactivatedAt = new Date(
          matchingPackage.deactivated_at
        );

        if (now >= deactivatedAt) {
          active = false;
        }
      }

      setIsActivated(active);
      setIsChecking(false);
    } catch (error) {
      console.error(
        "Package active check failed:",
        error
      );

      setIsActivated(false);
      setIsChecking(false);
    }
  }, [amount]);

  /*
   * =====================================================
   * AUTH LISTENER
   * =====================================================
   */

  useEffect(() => {
    checkActivePackage();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (
        event === "SIGNED_IN" ||
        event === "SIGNED_OUT" ||
        event === "TOKEN_REFRESHED" ||
        event === "USER_UPDATED"
      ) {
        checkActivePackage();
      }
    });

    const interval = setInterval(() => {
      checkActivePackage();
    }, 30000);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, [checkActivePackage]);

  /*
   * =====================================================
   * ACTIVATE PACKAGE
   * =====================================================
   */

  const handleActivate = async () => {
    if (isActivating) return;

    try {
      setIsActivating(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setIsActivating(false);

        showPopup(
          "login",
          "Login প্রয়োজন",
          "প্যাকেজ চালু করতে আগে Login করুন।"
        );

        return;
      }

      /*
       * Check already active
       */

      const {
        data: activeData,
        error: activeError,
      } = await supabase.rpc(
        "get_my_active_packages"
      );

      if (!activeError) {
        let activations: Activation[] = [];

        if (Array.isArray(activeData)) {
          activations = activeData as Activation[];
        } else if (
          activeData &&
          typeof activeData === "object"
        ) {
          activations = [
            activeData as Activation,
          ];
        }

        const existing = activations.find(
          (item) =>
            Number(item.package_amount) ===
            Number(amount)
        );

        if (existing) {
          let active = true;
          const now = new Date();

          if (existing.expires_at) {
            const expiresAt = new Date(
              existing.expires_at
            );

            if (now >= expiresAt) {
              active = false;
            }
          }

          if (existing.deactivated_at) {
            const deactivatedAt = new Date(
              existing.deactivated_at
            );

            if (now >= deactivatedAt) {
              active = false;
            }
          }

          if (active) {
            setIsActivated(true);
            setIsActivating(false);

            showPopup(
              "warning",
              "প্যাকেজ ইতিমধ্যে চালু",
              "এই প্যাকেজটি আপনার অ্যাকাউন্টে ইতিমধ্যে সক্রিয় আছে।"
            );

            return;
          }
        }
      }

      /*
       * Activate
       */

      const { data, error } = await supabase.rpc(
        "activate_user_package",
        {
          p_package_amount: amount,
        }
      );

      if (error) {
        console.error(
          "Package activation error:",
          error
        );

        const errorText =
          error.message?.toLowerCase() || "";

        if (
          errorText.includes("insufficient") ||
          errorText.includes("balance") ||
          errorText.includes("not enough") ||
          errorText.includes("fund")
        ) {
          showPopup(
            "error",
            "ব্যালেন্স পর্যাপ্ত নয়",
            "এই প্যাকেজটি চালু করার জন্য আপনার অ্যাকাউন্টে পর্যাপ্ত ব্যালেন্স নেই।"
          );
        } else if (
          errorText.includes("already") ||
          errorText.includes("active")
        ) {
          setIsActivated(true);

          showPopup(
            "warning",
            "প্যাকেজ ইতিমধ্যে চালু",
            "এই প্যাকেজটি আপনার অ্যাকাউন্টে ইতিমধ্যে সক্রিয় আছে।"
          );
        } else {
          showPopup(
            "error",
            "প্যাকেজ চালু করা যায়নি",
            error.message ||
              "প্যাকেজ চালু করার সময় একটি সমস্যা হয়েছে। আবার চেষ্টা করুন।"
          );
        }

        setIsActivating(false);
        return;
      }

      /*
       * RPC response
       */

      let result: any = data;

      if (Array.isArray(result)) {
        result = result[0];
      }

      if (typeof result === "string") {
        const normalized =
          result.toUpperCase();

        if (
          normalized.includes("ACTIVATED") ||
          normalized.includes("SUCCESS")
        ) {
          result = {
            success: true,
          };
        } else {
          result = {
            success: false,
            message: result,
          };
        }
      }

      const success =
        result?.success === true ||
        result?.status === "ACTIVATED" ||
        result?.status === "SUCCESS";

      if (!success) {
        const message =
          result?.message ||
          result?.error ||
          "প্যাকেজ চালু করার সময় একটি সমস্যা হয়েছে।";

        const messageText =
          String(message).toLowerCase();

        if (
          messageText.includes("insufficient") ||
          messageText.includes("balance") ||
          messageText.includes("not enough")
        ) {
          showPopup(
            "error",
            "ব্যালেন্স পর্যাপ্ত নয়",
            "এই প্যাকেজটি চালু করার জন্য আপনার অ্যাকাউন্টে পর্যাপ্ত ব্যালেন্স নেই।"
          );
        } else if (
          messageText.includes("already") ||
          messageText.includes("active")
        ) {
          setIsActivated(true);

          showPopup(
            "warning",
            "প্যাকেজ ইতিমধ্যে চালু",
            "এই প্যাকেজটি আপনার অ্যাকাউন্টে ইতিমধ্যে সক্রিয় আছে।"
          );
        } else {
          showPopup(
            "error",
            "প্যাকেজ চালু করা যায়নি",
            String(message)
          );
        }

        setIsActivating(false);
        return;
      }

      /*
       * Success
       */

      setIsActivated(true);

      showPopup(
        "success",
        "প্যাকেজ চালু হয়েছে",
        `${money(amount)} প্যাকেজটি সফলভাবে আপনার অ্যাকাউন্টে চালু হয়েছে।`
      );

      await checkActivePackage();
    } catch (error) {
      console.error(
        "Unexpected activation error:",
        error
      );

      showPopup(
        "error",
        "একটি সমস্যা হয়েছে",
        "প্যাকেজ চালু করার সময় একটি অপ্রত্যাশিত সমস্যা হয়েছে। আবার চেষ্টা করুন।"
      );
    } finally {
      setIsActivating(false);
    }
  };

  /*
   * =====================================================
   * DEPOSIT
   * =====================================================
   */

  const handleDeposit = () => {
    router.push("/deposit");
  };

  /*
   * =====================================================
   * POPUP ICON
   * =====================================================
   */

  const popupIcon = () => {
    if (popup?.type === "success") {
      return (
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <svg
            viewBox="0 0 24 24"
            className="h-7 w-7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 12.5l4 4L19 7"
            />
          </svg>
        </div>
      );
    }

    if (popup?.type === "warning") {
      return (
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <svg
            viewBox="0 0 24 24"
            className="h-7 w-7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 8v4m0 4h.01M10.3 4.5l-7 12A1.5 1.5 0 004.6 19h14.8a1.5 1.5 0 001.3-2.5l-7-12a1.5 1.5 0 00-2.6 0z"
            />
          </svg>
        </div>
      );
    }

    if (popup?.type === "login") {
      return (
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-600">
          <svg
            viewBox="0 0 24 24"
            className="h-7 w-7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10 17l5-5-5-5M15 12H3"
            />
          </svg>
        </div>
      );
    }

    return (
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600">
        <svg
          viewBox="0 0 24 24"
          className="h-7 w-7"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 6l12 12M18 6L6 18"
          />
        </svg>
      </div>
    );
  };

  /*
   * =====================================================
   * CARD UI
   * =====================================================
   */

  return (
    <>
      <article className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.07)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_14px_40px_rgba(15,23,42,0.11)]">

        {/* Package Visual */}

        <div
          className="relative h-[132px] overflow-hidden"
          style={{
            background: visual.background,
          }}
        >
          <div
            className="absolute -right-10 -top-10 h-28 w-28 rounded-full"
            style={{
              background: visual.glow,
            }}
          />

          <div
            className="absolute -bottom-12 -left-8 h-28 w-28 rounded-full"
            style={{
              background: visual.glow,
            }}
          />

          {/* Label */}

          <div className="absolute left-4 top-4">
            <span
              className="rounded-full border bg-white/70 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] backdrop-blur"
              style={{
                color: visual.dark,
                borderColor: visual.border,
              }}
            >
              প্যাকেজ
            </span>
          </div>

          {/* Active */}

          {isActivated && (
            <div className="absolute right-3 top-3">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-black text-white shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
                সক্রিয়
              </span>
            </div>
          )}

          {/* Huge Amount */}

          <div className="absolute inset-0 flex items-center justify-center pt-4">
            <div className="text-center">
              <div
                className="text-[42px] font-black leading-none tracking-[-0.06em]"
                style={{
                  color: visual.dark,
                  textShadow: `0 4px 20px ${visual.glow}`,
                }}
              >
                {amount.toLocaleString("en-BD")}
              </div>

              <div
                className="mt-1 text-[11px] font-black uppercase tracking-[0.18em]"
                style={{
                  color: visual.text,
                }}
              >
                টাকা
              </div>
            </div>
          </div>
        </div>

        {/* Content */}

        <div className="p-3.5">

          {/* Name */}

          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-black leading-tight text-slate-900">
                {pkg.name}
              </h2>

              <p className="mt-1 text-[11px] font-medium text-slate-400">
                {isActivated
                  ? "এই প্যাকেজটি আপনার অ্যাকাউন্টে সক্রিয়"
                  : "প্যাকেজ চালু করে কাজ শুরু করুন"}
              </p>
            </div>

            <div
              className="shrink-0 rounded-xl px-2.5 py-1.5 text-xs font-black"
              style={{
                background: visual.background,
                color: visual.dark,
              }}
            >
              {money(amount)}
            </div>
          </div>

          {/* Stats */}

          <div className="grid grid-cols-3 gap-2">

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-2.5">
              <div className="mb-1 text-[9px] font-bold text-slate-400">
                দৈনিক
              </div>

              <div className="text-sm font-black text-slate-900">
                {money(dailyEarning)}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-2.5">
              <div className="mb-1 text-[9px] font-bold text-slate-400">
                মোট
              </div>

              <div className="text-sm font-black text-slate-900">
                {money(totalEarning)}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-2.5">
              <div className="mb-1 text-[9px] font-bold text-slate-400">
                সময়কাল
              </div>

              <div className="text-sm font-black text-slate-900">
                {durationDays}
                <span className="ml-0.5 text-[10px] font-bold text-slate-400">
                  দিন
                </span>
              </div>
            </div>

          </div>

          {/* Status */}

          <div className="mt-3 flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${
                  isActivated
                    ? "bg-emerald-500"
                    : "bg-slate-300"
                }`}
              />

              <span className="text-xs font-bold text-slate-600">
                {isActivated
                  ? "প্যাকেজ সক্রিয়"
                  : "প্যাকেজ নিষ্ক্রিয়"}
              </span>
            </div>

            <span className="text-[10px] font-bold text-slate-400">
              {isChecking
                ? "চেক হচ্ছে..."
                : isActivated
                ? "চলমান"
                : "চালু করুন"}
            </span>
          </div>

          {/* Activate Button */}

          <div className="mt-3">
            {isActivated ? (
              <button
                type="button"
                disabled
                className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-50 text-sm font-black text-emerald-600"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 12.5l4 4L19 7"
                    />
                  </svg>
                </span>

                প্যাকেজ সক্রিয়
              </button>
            ) : (
              <button
                type="button"
                onClick={handleActivate}
                disabled={
                  isActivating || isChecking
                }
                className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl text-sm font-black text-white shadow-sm transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                style={{
                  background:
                    `linear-gradient(135deg, ${visual.text}, ${visual.dark})`,
                }}
              >
                {isActivating ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    চালু হচ্ছে...
                  </>
                ) : isChecking ? (
                  "অপেক্ষা করুন..."
                ) : (
                  <>
                    প্যাকেজ চালু করুন

                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 12h14M13 6l6 6-6 6"
                      />
                    </svg>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Deposit */}

          {!isActivated && (
            <button
              type="button"
              onClick={handleDeposit}
              className="mt-2 w-full py-1 text-center text-[11px] font-bold text-slate-400 transition hover:text-green-600"
            >
              ব্যালেন্স নেই? ডিপোজিট করুন
            </button>
          )}
        </div>
      </article>

      {/* =====================================================
          POPUP
      ===================================================== */}

      {popup && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 px-4 backdrop-blur-[2px]">

          <div className="relative max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-[28px] bg-white shadow-2xl">

            {/* Close */}

            <button
              type="button"
              onClick={closePopup}
              className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
              aria-label="বন্ধ করুন"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 6l12 12M18 6L6 18"
                />
              </svg>
            </button>

            <div className="px-6 pb-6 pt-8 text-center">

              {/* Icon */}

              <div className="flex justify-center">
                {popupIcon()}
              </div>

              {/* Title */}

              <h3 className="mt-5 text-xl font-black text-slate-900">
                {popup.title}
              </h3>

              {/* Message */}

              <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-slate-500">
                {popup.message}
              </p>

              {/* Login */}

              {popup.type === "login" ? (
                <div className="mt-6 grid grid-cols-2 gap-2.5">

                  <button
                    type="button"
                    onClick={closePopup}
                    className="h-11 rounded-2xl bg-slate-100 text-sm font-black text-slate-600"
                  >
                    পরে করব
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      closePopup();
                      router.push("/login");
                    }}
                    className="h-11 rounded-2xl bg-slate-900 text-sm font-black text-white"
                  >
                    Login
                  </button>

                </div>
              ) : popup.type === "error" &&
                popup.message.includes(
                  "ব্যালেন্স"
                ) ? (
                <div className="mt-6 grid grid-cols-2 gap-2.5">

                  <button
                    type="button"
                    onClick={closePopup}
                    className="h-11 rounded-2xl bg-slate-100 text-sm font-black text-slate-600"
                  >
                    বন্ধ করুন
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      closePopup();
                      handleDeposit();
                    }}
                    className="h-11 rounded-2xl bg-green-600 text-sm font-black text-white"
                  >
                    ডিপোজিট
                  </button>

                </div>
              ) : (
                <button
                  type="button"
                  onClick={closePopup}
                  className={`mt-6 h-11 w-full rounded-2xl text-sm font-black text-white ${
                    popup.type === "success"
                      ? "bg-emerald-600"
                      : popup.type === "warning"
                      ? "bg-amber-500"
                      : "bg-slate-900"
                  }`}
                >
                  ঠিক আছে
                </button>
              )}

            </div>
          </div>
        </div>
      )}
    </>
  );
}