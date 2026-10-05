"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Wallet = {
  balance: number;
  deposit_balance: number;
  earning_balance: number;
};

type Withdrawal = {
  id: string;
  amount: number;
  fee_amount: number;
  net_amount: number;
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

const MIN_WITHDRAWAL = 200;
const WITHDRAWAL_FEE_PERCENT = 10;

const withdrawalOptions = [
  200,
  300,
  500,
  1000,
  2000,
];

const paymentMethods = [
  {
    id: "bkash",
    label: "bKash",
    icon: "৳",
  },
  {
    id: "nagad",
    label: "Nagad",
    icon: "৳",
  },
  {
    id: "rocket",
    label: "Rocket",
    icon: "৳",
  },
];

function normalizeStatus(status: string | null | undefined) {
  return String(status || "")
    .trim()
    .toLowerCase();
}

function getStatusLabel(status: string | null | undefined) {
  const normalized = normalizeStatus(status);

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

function getStatusClass(status: string | null | undefined) {
  const normalized = normalizeStatus(status);

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

function maskAccountNumber(account: string) {
  const value = String(account || "").trim();

  if (value.length <= 4) {
    return value;
  }

  return `${value.slice(0, 3)}******${value.slice(-3)}`;
}

export default function WithdrawPage() {
  const [wallet, setWallet] = useState<Wallet | null>(null);

  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);

  const [selectedAmount, setSelectedAmount] =
    useState<number | null>(null);

  const [paymentMethod, setPaymentMethod] =
    useState("bkash");

  const [accountNumber, setAccountNumber] = useState("");

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const [message, setMessage] = useState("");

  const [error, setError] = useState("");

  /*
   * =====================================================
   * SELECTED AMOUNT CALCULATION
   * =====================================================
   */

  const feeAmount = useMemo(() => {
    if (!selectedAmount) {
      return 0;
    }

    return Number(
      (selectedAmount * WITHDRAWAL_FEE_PERCENT) / 100
    ).toFixed(2) as unknown as number;
  }, [selectedAmount]);

  const calculatedFee = selectedAmount
    ? Number(
        (
          selectedAmount *
          WITHDRAWAL_FEE_PERCENT
        ) /
          100
      )
    : 0;

  const netAmount = selectedAmount
    ? Number(
        (
          selectedAmount -
          calculatedFee
        ).toFixed(2)
      )
    : 0;

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
         * Withdrawal history
         */

        const withdrawalResult =
          await supabase
            .from("withdrawals")
            .select(
              `
                id,
                amount,
                fee_amount,
                net_amount,
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
          balance: Number(
            walletData.balance || 0
          ),

          deposit_balance: Number(
            walletData.deposit_balance || 0
          ),

          earning_balance: Number(
            walletData.earning_balance || 0
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

                  amount: Number(
                    item.amount || 0
                  ),

                  fee_amount: Number(
                    item.fee_amount || 0
                  ),

                  net_amount:
                    item.net_amount !==
                    null &&
                    item.net_amount !==
                      undefined
                      ? Number(
                          item.net_amount
                        )
                      : Number(
                          item.amount || 0
                        ) *
                          0.9,

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

                  status: String(
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

        console.log(
          "USER WITHDRAWAL HISTORY:",
          rows.map((item) => ({
            id: item.id,
            amount: item.amount,
            fee: item.fee_amount,
            net: item.net_amount,
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
   * AUTO REFRESH
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

    if (
      selectedAmount <
      MIN_WITHDRAWAL
    ) {
      setError(
        "সর্বনিম্ন উত্তোলনের পরিমাণ ৳200।"
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

      if (!data?.success) {
        throw new Error(
          data?.message ||
            "উত্তোলনের অনুরোধ জমা দেওয়া যায়নি।"
        );
      }

      setMessage(
        `উত্তোলনের অনুরোধ সফল হয়েছে। ${taka(
          netAmount
        )} টাকা আপনি পাবেন।`
      );

      setSelectedAmount(null);
      setAccountNumber("");

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
          "Minimum withdrawal amount is ৳200"
        )
      ) {
        setError(
          "সর্বনিম্ন উত্তোলনের পরিমাণ ৳200।"
        );
      } else if (
        text.includes(
          "Insufficient earning balance"
        )
      ) {
        setError(
          "আপনার উত্তোলনযোগ্য ব্যালেন্স পর্যাপ্ত নয়।"
        );
      } else if (
        text.includes(
          "Account number is required"
        )
      ) {
        setError(
          "অ্যাকাউন্ট নম্বর দিন।"
        );
      } else if (
        text.includes(
          "Invalid payment method"
        )
      ) {
        setError(
          "পেমেন্ট পদ্ধতি সঠিক নয়।"
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
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold leading-6 text-red-700">
            {error}
          </div>
        )}

        {/* SUCCESS */}

        {message && (
          <div className="mb-5 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold leading-6 text-green-800">
            {message}
          </div>
        )}

        {/* MAIN BALANCE */}

        <section className="overflow-hidden rounded-[30px] bg-[#111827] p-6 text-white shadow-[0_25px_70px_rgba(15,23,42,0.15)]">

          <div className="flex items-start justify-between">

            <div>

              <p className="text-xs font-bold tracking-wide text-white/45">
                উত্তোলনযোগ্য ব্যালেন্স
              </p>

              <p className="mt-2 text-4xl font-black tracking-tight">
                {taka(
                  wallet?.earning_balance ||
                    0
                )}
              </p>

            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-2xl">
              ৳
            </div>

          </div>

          <div className="mt-5 rounded-2xl bg-white/10 p-4">

            <p className="text-sm font-bold text-white/85">
              উত্তোলনের নিয়ম
            </p>

            <div className="mt-3 grid grid-cols-2 gap-3">

              <div>
                <p className="text-[11px] text-white/45">
                  সর্বনিম্ন
                </p>
                <p className="mt-1 text-base font-black">
                  ৳200
                </p>
              </div>

              <div>
                <p className="text-[11px] text-white/45">
                  উত্তোলন ফি
                </p>
                <p className="mt-1 text-base font-black">
                  ১০%
                </p>
              </div>

            </div>

          </div>

          <p className="mt-4 text-xs leading-5 text-white/45">
            আপনি যে পরিমাণ উত্তোলন করবেন, তার ১০% ফি কেটে বাকি টাকা আপনার নির্বাচিত অ্যাকাউন্টে পাঠানো হবে।
          </p>

        </section>

        {/* BALANCE BREAKDOWN */}

        <section className="mt-4 grid grid-cols-2 gap-3">

          <div className="rounded-[22px] border border-black/5 bg-white p-4 shadow-sm">

            <p className="text-xs font-bold text-black/40">
              প্যাকেজের ব্যালেন্স
            </p>

            <p className="mt-1 text-xl font-black">
              {taka(
                wallet?.deposit_balance ||
                  0
              )}
            </p>

            <p className="mt-1 text-[11px] font-semibold text-black/35">
              উত্তোলন করা যাবে না
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
              উত্তোলন করা যাবে
            </p>

          </div>

        </section>

        {/* AMOUNT */}

        <section className="mt-5 rounded-[28px] border border-black/5 bg-white p-5 shadow-sm sm:p-6">

          <div>

            <p className="text-xs font-bold tracking-[0.12em] text-green-600">
              উত্তোলনের পরিমাণ
            </p>

            <h1 className="mt-1 text-xl font-black">
              কত টাকা উত্তোলন করবেন?
            </h1>

            <p className="mt-2 text-xs leading-5 text-black/45">
              সর্বনিম্ন ৳200। প্রতিটি উত্তোলনে ১০% ফি কাটা হবে।
            </p>

          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">

            {withdrawalOptions.map(
              (amount) => {

                const insufficient =
                  (wallet?.earning_balance ||
                    0) < amount;

                const selected =
                  selectedAmount ===
                  amount;

                return (
                  <button
                    key={amount}
                    type="button"
                    disabled={
                      insufficient
                    }
                    onClick={() => {
                      setSelectedAmount(
                        amount
                      );
                      setError("");
                      setMessage("");
                    }}
                    className={`rounded-2xl border p-4 text-left transition active:scale-[0.98] ${
                      selected
                        ? "border-green-500 bg-green-50 ring-4 ring-green-500/10"
                        : insufficient
                        ? "border-black/5 bg-gray-50 opacity-45"
                        : "border-black/8 bg-white hover:-translate-y-0.5 hover:border-green-300"
                    }`}
                  >

                    <div className="flex items-center justify-between">

                      <p className="text-xl font-black">
                        {taka(amount)}
                      </p>

                      {selected && (
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-600 text-xs font-black text-white">
                          ✓
                        </span>
                      )}

                    </div>

                    <p className="mt-2 text-xs font-semibold text-black/40">

                      {insufficient
                        ? "ব্যালেন্স কম"
                        : amount === 200
                        ? "সর্বনিম্ন"
                        : "উত্তোলন করা যাবে"}

                    </p>

                  </button>
                );
              }
            )}

          </div>

        </section>

        {/* CALCULATION */}

        {selectedAmount && (
          <section className="mt-4 rounded-[28px] border border-green-100 bg-green-50 p-5 shadow-sm sm:p-6">

            <div className="flex items-center justify-between">

              <div>
                <p className="text-xs font-bold text-green-700/60">
                  আপনার উত্তোলনের হিসাব
                </p>

                <p className="mt-1 text-lg font-black text-green-900">
                  টাকা পাওয়ার হিসাব
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-lg shadow-sm">
                ৳
              </div>

            </div>

            <div className="mt-5 space-y-3">

              <div className="flex items-center justify-between text-sm">

                <span className="font-semibold text-black/50">
                  উত্তোলনের পরিমাণ
                </span>

                <span className="font-black">
                  {taka(
                    selectedAmount
                  )}
                </span>

              </div>

              <div className="flex items-center justify-between text-sm">

                <span className="font-semibold text-black/50">
                  উত্তোলন ফি (১০%)
                </span>

                <span className="font-black text-red-600">
                  - {taka(
                    calculatedFee
                  )}
                </span>

              </div>

              <div className="border-t border-green-200 pt-3">

                <div className="flex items-end justify-between">

                  <div>
                    <p className="text-xs font-bold text-green-700/60">
                      আপনি পাবেন
                    </p>

                    <p className="mt-1 text-3xl font-black text-green-700">
                      {taka(
                        netAmount
                      )}
                    </p>
                  </div>

                  <span className="mb-1 rounded-full bg-white px-3 py-1 text-[10px] font-black text-green-700 shadow-sm">
                    ১০% ফি কাটা হয়েছে
                  </span>

                </div>

              </div>

            </div>

          </section>
        )}

        {/* PAYMENT */}

        <section className="mt-5 rounded-[28px] border border-black/5 bg-white p-5 shadow-sm sm:p-6">

          <p className="text-xs font-bold tracking-[0.12em] text-green-600">
            টাকা গ্রহণ
          </p>

          <h2 className="mt-1 text-xl font-black">
            কোথায় টাকা নিতে চান?
          </h2>

          <p className="mt-2 text-xs leading-5 text-black/45">
            আপনার নিজের bKash, Nagad অথবা Rocket নম্বর দিন।
          </p>

          {/* PAYMENT METHOD */}

          <div className="mt-5 grid grid-cols-3 gap-2">

            {paymentMethods.map(
              (method) => (

                <button
                  key={method.id}
                  type="button"
                  onClick={() => {
                    setPaymentMethod(
                      method.id
                    );
                    setError("");
                  }}
                  className={`rounded-2xl border px-3 py-3 transition ${
                    paymentMethod ===
                    method.id
                      ? "border-green-500 bg-green-50 text-green-700 ring-2 ring-green-500/10"
                      : "border-black/10 bg-white"
                  }`}
                >

                  <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-xl bg-black/[0.04] text-sm font-black">
                    {method.icon}
                  </div>

                  <p className="mt-2 text-xs font-black">
                    {method.label}
                  </p>

                </button>

              )
            )}

          </div>

          {/* ACCOUNT NUMBER */}

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
              maxLength={15}
              className="mt-2 w-full rounded-2xl border border-black/10 bg-[#f8faf9] px-4 py-4 text-sm font-semibold outline-none transition focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-500/10"
              placeholder="01XXXXXXXXX"
            />

            <p className="mt-2 text-[11px] leading-5 text-black/35">
              নম্বরটি ভালোভাবে যাচাই করে দিন। ভুল নম্বর দিলে টাকা পেতে সমস্যা হতে পারে।
            </p>

          </div>

          {/* FINAL SUMMARY */}

          {selectedAmount && (
            <div className="mt-5 rounded-2xl bg-[#f8faf9] p-4">

              <p className="text-xs font-bold text-black/40">
                আপনার অনুরোধের সংক্ষিপ্ত তথ্য
              </p>

              <div className="mt-3 space-y-2">

                <div className="flex justify-between text-sm">
                  <span className="text-black/45">
                    উত্তোলন
                  </span>
                  <span className="font-black">
                    {taka(
                      selectedAmount
                    )}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-black/45">
                    ফি
                  </span>
                  <span className="font-black text-red-600">
                    {taka(
                      calculatedFee
                    )}
                  </span>
                </div>

                <div className="border-t border-black/5 pt-2">

                  <div className="flex justify-between text-sm">

                    <span className="font-bold">
                      আপনি পাবেন
                    </span>

                    <span className="font-black text-green-700">
                      {taka(
                        netAmount
                      )}
                    </span>

                  </div>

                </div>

              </div>

            </div>
          )}

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
            className="mt-5 w-full rounded-2xl bg-[#111827] px-5 py-4 text-sm font-black text-white transition hover:bg-green-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
          >

            {submitting
              ? "অনুরোধ জমা হচ্ছে..."
              : selectedAmount
              ? `${taka(
                  netAmount
                )} পাওয়ার জন্য অনুরোধ দিন`
              : "প্রথমে পরিমাণ নির্বাচন করুন"}

          </button>

          <p className="mt-3 text-center text-[10px] leading-5 text-black/30">
            অনুরোধ জমা দেওয়ার আগে পরিমাণ, ফি এবং অ্যাকাউন্ট নম্বর যাচাই করে নিন।
          </p>

        </section>

        {/* HISTORY */}

        <section className="mt-7">

          <div className="mb-3 flex items-center justify-between">

            <div>
              <h2 className="text-lg font-black">
                উত্তোলনের ইতিহাস
              </h2>

              <p className="mt-1 text-[11px] text-black/35">
                আপনার আগের সব উত্তোলনের তথ্য
              </p>
            </div>

            {refreshing && (
              <span className="text-[10px] font-bold text-black/35">
                আপডেট হচ্ছে...
              </span>
            )}

          </div>

          {withdrawals.length === 0 ? (

            <div className="rounded-[24px] bg-white p-8 text-center shadow-sm">

              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-black/[0.04] text-xl">
                ৳
              </div>

              <p className="mt-3 text-sm font-bold text-black/50">
                এখনো কোনো উত্তোলন নেই।
              </p>

              <p className="mt-1 text-[11px] text-black/30">
                আপনার প্রথম উত্তোলনের তথ্য এখানে দেখা যাবে।
              </p>

            </div>

          ) : (

            <div className="space-y-3">

              {withdrawals.map(
                (withdrawal) => {

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
                      className="rounded-[24px] border border-black/5 bg-white p-4 shadow-sm"
                    >

                      <div className="flex items-start justify-between gap-3">

                        <div className="min-w-0">

                          <p className="text-lg font-black">
                            {taka(
                              withdrawal.amount
                            )}
                          </p>

                          <p className="mt-1 text-xs text-black/40">
                            {String(
                              withdrawal.payment_method ||
                                ""
                            ).toUpperCase()}{" "}
                            •{" "}
                            {maskAccountNumber(
                              withdrawal.account_number
                            )}
                          </p>

                        </div>

                        <span
                          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-black ${statusClass}`}
                        >
                          {statusLabel}
                        </span>

                      </div>

                      <div className="mt-4 rounded-2xl bg-[#f8faf9] p-3">

                        <div className="flex justify-between text-xs">

                          <span className="text-black/40">
                            উত্তোলনের পরিমাণ
                          </span>

                          <span className="font-bold">
                            {taka(
                              withdrawal.amount
                            )}
                          </span>

                        </div>

                        <div className="mt-2 flex justify-between text-xs">

                          <span className="text-black/40">
                            ফি (১০%)
                          </span>

                          <span className="font-bold text-red-600">
                            - {taka(
                              withdrawal.fee_amount
                            )}
                          </span>

                        </div>

                        <div className="mt-2 border-t border-black/5 pt-2">

                          <div className="flex justify-between text-sm">

                            <span className="font-bold">
                              আপনি পাবেন
                            </span>

                            <span className="font-black text-green-700">
                              {taka(
                                withdrawal.net_amount
                              )}
                            </span>

                          </div>

                        </div>

                      </div>

                      <div className="mt-3 border-t border-black/5 pt-3">

                        <p className="text-[11px] text-black/35">
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
                          <div className="mt-2 rounded-xl bg-yellow-50 px-3 py-2">

                            <p className="text-[10px] font-bold text-yellow-700">
                              অ্যাডমিনের নোট
                            </p>

                            <p className="mt-1 text-[11px] leading-5 text-yellow-800/70">
                              {
                                withdrawal.admin_note
                              }
                            </p>

                          </div>
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
              কাজ
            </span>
          </Link>

          <Link
            href="/wallet"
            className="flex min-h-[58px] flex-col items-center justify-center rounded-2xl bg-green-50 text-[11px] font-black text-green-700"
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