"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Wallet = {
  balance: number;
  deposit_balance: number;
  earning_balance: number;
};

type Withdrawal = {
  id: string;
  amount: number;
  payment_method: string;
  account_number: string;
  status: string;
  created_at: string;
  requested_at?: string;
  reviewed_at?: string | null;
  admin_note?: string | null;
};

function taka(value: number) {
  return `৳${Number(value || 0).toLocaleString("en-BD")}`;
}

const withdrawalOptions = [
  {
    amount: 100,
    once: true,
  },
  {
    amount: 200,
    once: true,
  },
  {
    amount: 300,
    once: false,
  },
  {
    amount: 500,
    once: false,
  },
  {
    amount: 1000,
    once: false,
  },
  {
    amount: 2000,
    once: false,
  },
];

const paymentMethods = [
  {
    id: "bkash",
    label: "bKash",
  },
  {
    id: "nagad",
    label: "Nagad",
  },
  {
    id: "rocket",
    label: "Rocket",
  },
];

/*
 * IMPORTANT:
 * Database status lowercase হলেও UI সঠিকভাবে
 * status দেখাবে।
 *
 * approved  -> অনুমোদিত
 * rejected  -> বাতিল
 * pending   -> অপেক্ষমাণ
 * completed -> সম্পন্ন
 */

function normalizeStatus(status: string | null | undefined) {
  return String(status || "")
    .trim()
    .toLowerCase();
}

function getStatusLabel(
  status: string | null | undefined
) {
  const normalized =
    normalizeStatus(status);

  switch (normalized) {
    case "approved":
      return "অনুমোদিত";

    case "completed":
      return "সম্পন্ন";

    case "rejected":
    case "cancelled":
    case "canceled":
      return "বাতিল";

    case "verifying":
      return "যাচাই হচ্ছে";

    case "pending":
    default:
      return "অপেক্ষমাণ";
  }
}

function getStatusClass(
  status: string | null | undefined
) {
  const normalized =
    normalizeStatus(status);

  switch (normalized) {
    case "approved":
    case "completed":
      return "bg-green-100 text-green-700";

    case "rejected":
    case "cancelled":
    case "canceled":
      return "bg-red-100 text-red-700";

    case "verifying":
      return "bg-blue-100 text-blue-700";

    case "pending":
    default:
      return "bg-yellow-100 text-yellow-700";
  }
}

export default function WithdrawPage() {
  const [wallet, setWallet] =
    useState<Wallet | null>(null);

  const [withdrawals, setWithdrawals] =
    useState<Withdrawal[]>([]);

  const [selectedAmount, setSelectedAmount] =
    useState<number | null>(null);

  const [paymentMethod, setPaymentMethod] =
    useState("bkash");

  const [accountNumber, setAccountNumber] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  /*
   * =====================================================
   * LOAD DATA
   * =====================================================
   */

  const loadData = useCallback(
    async (showRefresh = false) => {
      try {
        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          console.error(
            "AUTH ERROR:",
            authError
          );

          throw new Error(
            authError.message ||
              "AUTH_ERROR"
          );
        }

        if (!user) {
          setError(
            "প্রথমে Login করুন।"
          );
          return;
        }

        /*
         * Wallet
         */

        const walletResult =
          await supabase.rpc(
            "get_my_wallet"
          );

        if (walletResult.error) {
          console.error(
            "WALLET ERROR:",
            walletResult.error
          );

          throw new Error(
            walletResult.error.message ||
              "WALLET_LOAD_FAILED"
          );
        }

        /*
         * IMPORTANT:
         * Withdrawal history সরাসরি withdrawals table
         * থেকে নেওয়া হচ্ছে।
         *
         * status এখানে database-এর বর্তমান status।
         */

        const withdrawalResult =
          await supabase
            .from("withdrawals")
            .select(
              `
                id,
                amount,
                payment_method,
                account_number,
                status,
                admin_note,
                requested_at,
                reviewed_at,
                created_at
              `
            )
            .eq(
              "user_id",
              user.id
            )
            .order(
              "created_at",
              {
                ascending: false,
              }
            )
            .limit(30);

        if (withdrawalResult.error) {
          console.error(
            "WITHDRAWAL HISTORY ERROR:",
            withdrawalResult.error
          );

          throw new Error(
            withdrawalResult.error.message ||
              "WITHDRAWAL_HISTORY_LOAD_FAILED"
          );
        }

        /*
         * Wallet data
         */

        const walletData =
          walletResult.data || {};

        setWallet({
          balance:
            Number(
              walletData.balance || 0
            ),

          deposit_balance:
            Number(
              walletData.deposit_balance ||
                0
            ),

          earning_balance:
            Number(
              walletData.earning_balance ||
                0
            ),
        });

        /*
         * Withdrawal rows
         */

        const rows: Withdrawal[] =
          Array.isArray(
            withdrawalResult.data
          )
            ? withdrawalResult.data.map(
                (item: any) => ({
                  id: String(
                    item.id
                  ),

                  amount:
                    Number(
                      item.amount || 0
                    ),

                  payment_method:
                    String(
                      item.payment_method ||
                        ""
                    ),

                  account_number:
                    String(
                      item.account_number ||
                        ""
                    ),

                  /*
                   * এখানে database-এর আসল
                   * status রাখা হচ্ছে।
                   */
                  status:
                    String(
                      item.status ||
                        "pending"
                    ),

                  created_at:
                    item.created_at ||
                    item.requested_at ||
                    "",

                  requested_at:
                    item.requested_at ||
                    item.created_at ||
                    "",

                  reviewed_at:
                    item.reviewed_at ||
                    null,

                  admin_note:
                    item.admin_note ||
                    null,
                })
              )
            : [];

        setWithdrawals(rows);

        /*
         * Console verification
         *
         * Browser console-এ প্রত্যেক withdrawal-এর
         * আসল database status দেখা যাবে।
         */

        console.log(
          "USER WITHDRAWAL HISTORY:",
          rows.map((item) => ({
            id: item.id,
            amount: item.amount,
            database_status:
              item.status,
            ui_status:
              getStatusLabel(
                item.status
              ),
          }))
        );
      } catch (err) {
        console.error(
          "WITHDRAW LOAD ERROR:",
          err
        );

        let errorText =
          "তথ্য লোড করা যায়নি। আবার চেষ্টা করুন।";

        if (
          err instanceof Error &&
          err.message
        ) {
          errorText =
            err.message;
        }

        if (
          errorText.includes(
            "JWT issued at future"
          )
        ) {
          errorText =
            "আপনার Login Session-এর সময় সংক্রান্ত সমস্যা হয়েছে। Logout করে আবার Login করুন।";
        }

        setError(errorText);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  /*
   * INITIAL LOAD
   */

  useEffect(() => {
    loadData();
  }, [loadData]);

  /*
   * =====================================================
   * AUTO REFRESH
   * =====================================================
   *
   * Admin panel থেকে approve/reject করার পর
   * user withdraw page-এ ফিরে এলে fresh status নেবে।
   */

  useEffect(() => {
    const handleFocus = () => {
      loadData(true);
    };

    const handleVisibility = () => {
      if (
        document.visibilityState ===
        "visible"
      ) {
        loadData(true);
      }
    };

    window.addEventListener(
      "focus",
      handleFocus
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibility
    );

    return () => {
      window.removeEventListener(
        "focus",
        handleFocus
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibility
      );
    };
  }, [loadData]);

  /*
   * =====================================================
   * ONE-TIME WITHDRAWAL CHECK
   * =====================================================
   */

  function isAmountAlreadyUsed(
    amount: number
  ) {
    if (
      amount !== 100 &&
      amount !== 200
    ) {
      return false;
    }

    return withdrawals.some(
      (item) => {
        const status =
          normalizeStatus(
            item.status
          );

        /*
         * Rejected withdrawal আবার ব্যবহার করা যাবে।
         *
         * Pending / Verifying / Approved / Completed
         * হলে একবারের withdrawal already used.
         */

        return (
          item.amount === amount &&
          (
            status === "pending" ||
            status === "verifying" ||
            status === "approved" ||
            status === "completed"
          )
        );
      }
    );
  }

  /*
   * =====================================================
   * SUBMIT WITHDRAWAL
   * =====================================================
   */

  async function submitWithdrawal() {
    setMessage("");
    setError("");

    if (!selectedAmount) {
      setError(
        "একটি উত্তোলনের পরিমাণ নির্বাচন করুন।"
      );
      return;
    }

    if (!accountNumber.trim()) {
      setError(
        "অ্যাকাউন্ট নম্বর দিন।"
      );
      return;
    }

    if (
      (wallet?.earning_balance || 0) <
      selectedAmount
    ) {
      setError(
        "আপনার উত্তোলনযোগ্য ব্যালেন্স পর্যাপ্ত নয়।"
      );
      return;
    }

    if (
      isAmountAlreadyUsed(
        selectedAmount
      )
    ) {
      setError(
        `৳${selectedAmount} উত্তোলনের সুযোগ ইতিমধ্যে ব্যবহার করা হয়েছে।`
      );
      return;
    }

    try {
      setSubmitting(true);

      const {
        data,
        error: rpcError,
      } = await supabase.rpc(
        "create_withdrawal",
        {
          p_amount:
            selectedAmount,

          p_payment_method:
            paymentMethod,

          p_account_number:
            accountNumber.trim(),
        }
      );

      if (rpcError) {
        console.error(
          "CREATE WITHDRAWAL RPC ERROR:",
          rpcError
        );

        throw new Error(
          rpcError.message ||
            "WITHDRAWAL_RPC_FAILED"
        );
      }

      if (
        !data?.success
      ) {
        throw new Error(
          data?.message ||
            "উত্তোলনের অনুরোধ জমা দেওয়া যায়নি।"
        );
      }

      setMessage(
        "আপনার উত্তোলনের অনুরোধ জমা হয়েছে।"
      );

      setSelectedAmount(null);
      setAccountNumber("");

      /*
       * New withdrawal + deducted balance
       * immediately refresh.
       */

      await loadData(true);
    } catch (err) {
      console.error(
        "WITHDRAW SUBMIT ERROR:",
        err
      );

      const text =
        err instanceof Error
          ? err.message
          : "";

      if (
        text.includes(
          "INSUFFICIENT_BALANCE"
        )
      ) {
        setError(
          "আপনার উত্তোলনযোগ্য ব্যালেন্স পর্যাপ্ত নয়।"
        );
      } else if (
        text.includes(
          "WITHDRAWAL_100_ALREADY_USED"
        )
      ) {
        setError(
          "৳100 উত্তোলনের সুযোগ ইতিমধ্যে ব্যবহার করা হয়েছে।"
        );
      } else if (
        text.includes(
          "WITHDRAWAL_200_ALREADY_USED"
        )
      ) {
        setError(
          "৳200 উত্তোলনের সুযোগ ইতিমধ্যে ব্যবহার করা হয়েছে।"
        );
      } else if (
        text.includes(
          "MINIMUM_WITHDRAWAL_IS_100"
        )
      ) {
        setError(
          "সর্বনিম্ন উত্তোলনের পরিমাণ ৳100।"
        );
      } else if (
        text.includes(
          "JWT issued at future"
        )
      ) {
        setError(
          "আপনার Login Session-এর সময় সংক্রান্ত সমস্যা হয়েছে। Logout করে আবার Login করুন।"
        );
      } else {
        setError(
          "উত্তোলনের অনুরোধ জমা দেওয়া যায়নি। আবার চেষ্টা করুন।"
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  /*
   * =====================================================
   * LOADING
   * =====================================================
   */

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f5f7f6] px-4 py-10">
        <div className="mx-auto max-w-3xl">

          <div className="rounded-[28px] bg-white p-10 text-center shadow-sm">

            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-green-100 border-t-green-600" />

            <p className="mt-4 text-sm font-semibold text-black/50">
              তথ্য লোড হচ্ছে...
            </p>

          </div>

        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f7f6] text-[#111827]">

      <div className="mx-auto max-w-3xl px-4 py-5 pb-28 sm:px-6">

        {/* HEADER */}

        <header className="mb-5 flex items-center justify-between">

          <Link
            href="/"
            className="text-xl font-black"
          >
            Pocket Money
          </Link>

          <div className="flex items-center gap-2">

            <button
              type="button"
              onClick={() =>
                loadData(true)
              }
              disabled={refreshing}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white text-lg shadow-sm transition active:scale-95 disabled:opacity-50"
              aria-label="রিফ্রেশ"
            >
              <span
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              >
                ↻
              </span>
            </button>

            <Link
              href="/wallet"
              className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-bold shadow-sm"
            >
              ওয়ালেট
            </Link>

          </div>

        </header>

        {/* ERROR */}

        {error && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {/* SUCCESS */}

        {message && (
          <div className="mb-5 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
            {message}
          </div>
        )}

        {/* BALANCE */}

        <section className="rounded-[28px] bg-[#111827] p-6 text-white shadow-[0_25px_70px_rgba(15,23,42,0.15)]">

          <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/40">
            উত্তোলনযোগ্য ব্যালেন্স
          </p>

          <p className="mt-2 text-4xl font-black">
            {taka(
              wallet?.earning_balance ||
                0
            )}
          </p>

          <p className="mt-2 text-sm text-white/50">
            শুধুমাত্র আয় করা টাকা উত্তোলন করা যাবে।
          </p>

        </section>

        {/* BALANCE BREAKDOWN */}

        <section className="mt-4 grid grid-cols-2 gap-3">

          <div className="rounded-[22px] border border-black/5 bg-white p-4 shadow-sm">

            <p className="text-xs font-bold text-black/40">
              প্যাকেজের ব্যালেন্স
            </p>

            <p className="mt-1 text-xl font-black text-[#111827]">
              {taka(
                wallet?.deposit_balance ||
                  0
              )}
            </p>

            <p className="mt-1 text-[11px] font-semibold text-black/35">
              উত্তোলনযোগ্য নয়
            </p>

          </div>

          <div className="rounded-[22px] border border-green-100 bg-green-50 p-4 shadow-sm">

            <p className="text-xs font-bold text-green-700/60">
              আয় ব্যালেন্স
            </p>

            <p className="mt-1 text-xl font-black text-green-700">
              {taka(
                wallet?.earning_balance ||
                  0
              )}
            </p>

            <p className="mt-1 text-[11px] font-semibold text-green-700/50">
              উত্তোলনযোগ্য
            </p>

          </div>

        </section>

        {/* AMOUNTS */}

        <section className="mt-5 rounded-[28px] border border-black/5 bg-white p-5 shadow-sm sm:p-6">

          <div>

            <p className="text-xs font-bold uppercase tracking-[0.16em] text-green-600">
              উত্তোলনের পরিমাণ
            </p>

            <h1 className="mt-1 text-xl font-black">
              পরিমাণ নির্বাচন করুন
            </h1>

          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">

            {withdrawalOptions.map(
              (option) => {

                const alreadyUsed =
                  isAmountAlreadyUsed(
                    option.amount
                  );

                const insufficient =
                  (wallet?.earning_balance ||
                    0) <
                  option.amount;

                const disabled =
                  alreadyUsed ||
                  insufficient;

                const selected =
                  selectedAmount ===
                  option.amount;

                return (
                  <button
                    key={
                      option.amount
                    }
                    type="button"
                    disabled={
                      disabled
                    }
                    onClick={() =>
                      setSelectedAmount(
                        option.amount
                      )
                    }
                    className={`rounded-2xl border p-4 text-left transition ${
                      selected
                        ? "border-green-500 bg-green-50 ring-4 ring-green-500/10"
                        : disabled
                        ? "border-black/5 bg-gray-50 opacity-45"
                        : "border-black/8 bg-white hover:-translate-y-0.5 hover:border-green-300"
                    }`}
                  >

                    <p className="text-xl font-black">
                      {taka(
                        option.amount
                      )}
                    </p>

                    <p className="mt-1 text-xs font-semibold text-black/40">

                      {alreadyUsed
                        ? "ব্যবহৃত"
                        : insufficient
                        ? "ব্যালেন্স কম"
                        : option.once
                        ? "একবার"
                        : "প্রয়োজন অনুযায়ী"}

                    </p>

                  </button>
                );
              }
            )}

          </div>

        </section>

        {/* PAYMENT */}

        <section className="mt-5 rounded-[28px] border border-black/5 bg-white p-5 shadow-sm sm:p-6">

          <p className="text-xs font-bold uppercase tracking-[0.16em] text-green-600">
            টাকা গ্রহণ
          </p>

          <h2 className="mt-1 text-xl font-black">
            আপনার পেমেন্ট তথ্য
          </h2>

          {/* METHOD */}

          <div className="mt-5 grid grid-cols-3 gap-2">

            {paymentMethods.map(
              (method) => (

                <button
                  key={method.id}
                  type="button"
                  onClick={() =>
                    setPaymentMethod(
                      method.id
                    )
                  }
                  className={`rounded-xl border px-3 py-3 text-sm font-black transition ${
                    paymentMethod ===
                    method.id
                      ? "border-green-500 bg-green-50 text-green-700"
                      : "border-black/10 bg-white"
                  }`}
                >
                  {method.label}
                </button>

              )
            )}

          </div>

          {/* ACCOUNT */}

          <div className="mt-5">

            <label className="text-sm font-bold">
              অ্যাকাউন্ট নম্বর
            </label>

            <input
              value={
                accountNumber
              }
              onChange={(e) =>
                setAccountNumber(
                  e.target.value.replace(
                    /[^0-9+]/g,
                    ""
                  )
                )
              }
              inputMode="tel"
              className="mt-2 w-full rounded-2xl border border-black/10 bg-[#f8faf9] px-4 py-4 text-sm font-semibold outline-none transition focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-500/10"
              placeholder="01XXXXXXXXX"
            />

          </div>

          {/* SUBMIT */}

          <button
            type="button"
            disabled={
              submitting ||
              !selectedAmount ||
              !accountNumber.trim()
            }
            onClick={
              submitWithdrawal
            }
            className="mt-5 w-full rounded-2xl bg-[#111827] px-5 py-4 text-sm font-black text-white transition hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-40"
          >

            {submitting
              ? "জমা হচ্ছে..."
              : selectedAmount
              ? `${taka(
                  selectedAmount
                )} উত্তোলনের অনুরোধ দিন`
              : "পরিমাণ নির্বাচন করুন"}

          </button>

        </section>

        {/* HISTORY */}

        <section className="mt-7">

          <div className="mb-3 flex items-center justify-between">

            <h2 className="text-lg font-black">
              উত্তোলনের ইতিহাস
            </h2>

            {refreshing && (
              <span className="text-[10px] font-bold text-black/35">
                আপডেট হচ্ছে...
              </span>
            )}

          </div>

          {withdrawals.length === 0 ? (

            <div className="rounded-[24px] bg-white p-8 text-center shadow-sm">

              <p className="text-sm font-semibold text-black/40">
                এখনো কোনো উত্তোলন নেই।
              </p>

            </div>

          ) : (

            <div className="space-y-3">

              {withdrawals.map(
                (withdrawal) => {

                  /*
                   * এখানে status সরাসরি database row
                   * থেকে normalize করা হচ্ছে।
                   */

                  const status =
                    normalizeStatus(
                      withdrawal.status
                    );

                  const statusLabel =
                    getStatusLabel(
                      status
                    );

                  const statusClass =
                    getStatusClass(
                      status
                    );

                  return (
                    <div
                      key={
                        withdrawal.id
                      }
                      className="rounded-[22px] border border-black/5 bg-white p-4 shadow-sm"
                    >

                      <div className="flex items-center justify-between gap-3">

                        <div className="min-w-0">

                          <p className="text-lg font-black">
                            {taka(
                              withdrawal.amount
                            )}
                          </p>

                          <p className="mt-1 truncate text-xs text-black/40">
                            {String(
                              withdrawal.payment_method ||
                                ""
                            ).toUpperCase()}{" "}
                            •{" "}
                            {
                              withdrawal.account_number
                            }
                          </p>

                        </div>

                        <span
                          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-black ${statusClass}`}
                        >
                          {statusLabel}
                        </span>

                      </div>

                      <div className="mt-3 border-t border-black/5 pt-3">

                        <p className="text-xs text-black/35">
                          {withdrawal.created_at
                            ? new Date(
                                withdrawal.created_at
                              ).toLocaleString(
                                "bn-BD"
                              )
                            : ""}
                        </p>

                        {withdrawal.reviewed_at && (
                          <p className="mt-1 text-[10px] text-black/25">
                            যাচাই:{" "}
                            {new Date(
                              withdrawal.reviewed_at
                            ).toLocaleString(
                              "bn-BD"
                            )}
                          </p>
                        )}

                        {withdrawal.admin_note && (
                          <p className="mt-2 rounded-xl bg-black/[0.025] px-3 py-2 text-[11px] text-black/45">
                            নোট:{" "}
                            {withdrawal.admin_note}
                          </p>
                        )}

                      </div>

                    </div>
                  );
                }
              )}

            </div>

          )}

        </section>

      </div>

      {/* BOTTOM NAV */}

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-black/5 bg-white/95 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl">

        <div className="mx-auto grid max-w-3xl grid-cols-5 gap-1">

          <Link
            href="/"
            className="flex min-h-[58px] flex-col items-center justify-center rounded-2xl text-[11px] font-bold text-black/45 transition hover:bg-gray-50"
          >
            <span className="text-[20px] leading-none">
              ⌂
            </span>

            <span className="mt-1">
              হোম
            </span>
          </Link>

          <Link
            href="/packages"
            className="flex min-h-[58px] flex-col items-center justify-center rounded-2xl text-[11px] font-bold text-black/45 transition hover:bg-gray-50"
          >
            <span className="text-[20px] leading-none">
              ▣
            </span>

            <span className="mt-1">
              প্যাকেজ
            </span>
          </Link>

          <Link
            href="/tasks"
            className="flex min-h-[58px] flex-col items-center justify-center rounded-2xl text-[11px] font-bold text-black/45 transition hover:bg-gray-50"
          >
            <span className="text-[20px] leading-none">
              ✓
            </span>

            <span className="mt-1">
              টাস্ক
            </span>
          </Link>

          <Link
            href="/wallet"
            className="flex min-h-[58px] flex-col items-center justify-center rounded-2xl text-[11px] font-bold text-black/45 transition hover:bg-gray-50"
          >
            <span className="text-[20px] leading-none">
              ৳
            </span>

            <span className="mt-1">
              ওয়ালেট
            </span>
          </Link>

          <Link
            href="/profile"
            className="flex min-h-[58px] flex-col items-center justify-center rounded-2xl text-[11px] font-bold text-black/45 transition hover:bg-gray-50"
          >
            <span className="text-[20px] leading-none">
              ●
            </span>

            <span className="mt-1">
              প্রোফাইল
            </span>
          </Link>

        </div>

      </nav>

    </main>
  );
}