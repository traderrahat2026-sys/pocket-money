"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const DEPOSIT_BONUS_AMOUNT = 500;
const QUALIFYING_DEPOSIT = 2000;
const MIN_DEPOSIT = 500;

const PAYMENT_METHODS = {
  bkash: {
    name: "bKash",
    number: "01869506686",
    color: "pink",
    description: "bKash Send Money",
  },

  nagad: {
    name: "Nagad",
    number: "01928156849",
    color: "orange",
    description: "Nagad Send Money",
  },

  rocket: {
    name: "Rocket",
    number: "01619952823",
    color: "purple",
    description: "Rocket Send Money",
  },
} as const;

type PaymentMethod = keyof typeof PAYMENT_METHODS;

type Deposit = {
  id: number;
  amount: number;
  payment_method: string;
  transaction_id: string;
  status: string;
  bonus_amount: number;
  created_at: string;
  approved_at: string | null;
};

function taka(value: number) {
  return `৳${Number(value || 0).toLocaleString("en-BD")}`;
}

/* =========================================================
   STATUS HELPERS
========================================================= */

function getStatusLabel(status: string) {
  switch (status) {
    case "Pending":
      return "অপেক্ষমাণ";

    case "Verifying":
      return "যাচাই হচ্ছে";

    case "Approved":
      return "অনুমোদিত";

    case "Rejected":
      return "বাতিল";

    default:
      return "অপেক্ষমাণ";
  }
}

function getStatusClass(status: string) {
  switch (status) {
    case "Pending":
      return "border-yellow-200 bg-yellow-50 text-yellow-700";

    case "Verifying":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "Approved":
      return "border-green-200 bg-green-50 text-green-700";

    case "Rejected":
      return "border-red-200 bg-red-50 text-red-700";

    default:
      return "border-yellow-200 bg-yellow-50 text-yellow-700";
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case "Pending":
      return "◷";

    case "Verifying":
      return "⌁";

    case "Approved":
      return "✓";

    case "Rejected":
      return "×";

    default:
      return "◷";
  }
}

function getStatusDescription(status: string) {
  switch (status) {
    case "Pending":
      return "আপনার ডিপোজিটের তথ্য জমা হয়েছে। যাচাই শুরু হওয়ার অপেক্ষায় আছে।";

    case "Verifying":
      return "আপনার পেমেন্টের তথ্য বর্তমানে যাচাই করা হচ্ছে।";

    case "Approved":
      return "আপনার ডিপোজিট অনুমোদিত হয়েছে এবং প্রযোজ্য ব্যালেন্সে যোগ হয়েছে।";

    case "Rejected":
      return "এই ডিপোজিটটি অনুমোদিত হয়নি। প্রয়োজন হলে সাপোর্টে যোগাযোগ করুন।";

    default:
      return "আপনার ডিপোজিটের তথ্য যাচাইয়ের অপেক্ষায় আছে।";
  }
}

export default function DepositPage() {
  const [amount, setAmount] = useState("2000");

  const [transactionId, setTransactionId] =
    useState("");

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("bkash");

  const [loading, setLoading] =
    useState(false);

  const [pageLoading, setPageLoading] =
    useState(true);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const [bonusClaimed, setBonusClaimed] =
    useState(false);

  const [deposits, setDeposits] =
    useState<Deposit[]>([]);

  /* =======================================================
     LOAD DATA
  ======================================================= */

  async function loadData() {
    try {
      setPageLoading(true);
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("প্রথমে Login করুন।");
        return;
      }

      const [
        walletResult,
        depositResult,
      ] = await Promise.all([
        supabase.rpc("get_my_wallet"),

        supabase
          .from("deposits")
          .select(
            "id, amount, payment_method, transaction_id, status, bonus_amount, created_at, approved_at"
          )
          .eq("user_id", user.id)
          .order("created_at", {
            ascending: false,
          }),
      ]);

      if (walletResult.error) {
        throw walletResult.error;
      }

      if (depositResult.error) {
        throw depositResult.error;
      }

      const wallet = walletResult.data;

      /*
       * IMPORTANT
       *
       * deposit_bonus_claimed এখন submit_deposit-এর সময়ই
       * true হয়ে যায়।
       *
       * তাই qualifying deposit submit করার পর loadData()
       * চালালেই bonus card disappear করবে।
       */
      setBonusClaimed(
        Boolean(
          wallet?.deposit_bonus_claimed
        )
      );

      setDeposits(
        Array.isArray(depositResult.data)
          ? depositResult.data.map(
              (item) => ({
                id: item.id,

                amount:
                  Number(item.amount || 0),

                payment_method:
                  item.payment_method ||
                  "bkash",

                transaction_id:
                  item.transaction_id ||
                  "",

                status:
                  item.status ||
                  "Pending",

                bonus_amount:
                  Number(
                    item.bonus_amount || 0
                  ),

                created_at:
                  item.created_at || "",

                approved_at:
                  item.approved_at || null,
              })
            )
          : []
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "তথ্য লোড করা যায়নি।"
      );
    } finally {
      setPageLoading(false);
    }
  }

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    loadData();
  }, []);

  /* =======================================================
     SUBMIT DEPOSIT
  ======================================================= */

  async function submitDeposit() {
    setMessage("");
    setError("");

    const depositAmount =
      Number(amount);

    /* -------------------------------------------------------
       MINIMUM DEPOSIT
    ------------------------------------------------------- */

    if (
      !Number.isFinite(depositAmount) ||
      depositAmount < MIN_DEPOSIT
    ) {
      setError(
        `সর্বনিম্ন ${taka(
          MIN_DEPOSIT
        )} ডিপোজিট করতে হবে।`
      );

      return;
    }

    /* -------------------------------------------------------
       TRANSACTION ID
    ------------------------------------------------------- */

    if (!transactionId.trim()) {
      setError("Transaction ID দিন।");
      return;
    }

    const selectedPayment =
      PAYMENT_METHODS[paymentMethod];

    try {
      setLoading(true);

      const {
        data,
        error: rpcError,
      } = await supabase.rpc(
        "submit_deposit",
        {
          p_amount: depositAmount,

          p_payment_method:
            paymentMethod,

          p_payment_number:
            selectedPayment.number,

          p_transaction_id:
            transactionId.trim(),
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      if (!data?.success) {
        throw new Error(
          "ডিপোজিট জমা দেওয়া যায়নি।"
        );
      }

      /*
       * =====================================================
       * ONE-TIME BONUS LOCK
       *
       * SQL function qualifying deposit submit হওয়ার সময়
       * bonus_amount = 500 এবং bonus_locked = true ফেরত দেয়।
       *
       * তাই এখানে সঙ্গে সঙ্গে bonusClaimed = true করছি।
       *
       * ফলে:
       * - bonus card disappear করবে
       * - +৳500 indicator disappear করবে
       * - user দ্বিতীয়বার bonus claim করতে পারবে না
       * =====================================================
       */

      const submittedBonus =
        Number(data?.bonus_amount || 0);

      const bonusWasLocked =
        Boolean(data?.bonus_locked) ||
        submittedBonus > 0;

      if (bonusWasLocked) {
        setBonusClaimed(true);
      }

      /*
       * Success message
       */

      if (bonusWasLocked) {
        setMessage(
          `ডিপোজিট জমা হয়েছে। আপনার ${taka(
            DEPOSIT_BONUS_AMOUNT
          )} এককালীন বোনাস এই ডিপোজিটের সাথে সংরক্ষিত হয়েছে। অনুমোদনের পর ডিপোজিট ব্যালেন্সে যোগ হবে।`
        );
      } else {
        setMessage(
          "ডিপোজিটের তথ্য জমা হয়েছে। অনুমোদনের অপেক্ষায় আছে।"
        );
      }

      setTransactionId("");

      /*
       * Database থেকে latest data reload
       */
      await loadData();
    } catch (err) {
      console.error(err);

      const text =
        err instanceof Error
          ? err.message
          : "";

      if (
        text.includes(
          "TRANSACTION_ALREADY_SUBMITTED"
        )
      ) {
        setError(
          "এই Transaction ID আগে জমা দেওয়া হয়েছে।"
        );
      } else if (
        text.includes(
          "USER_NOT_AUTHENTICATED"
        )
      ) {
        setError(
          "প্রথমে Login করুন।"
        );
      } else if (
        text.includes(
          "MINIMUM_DEPOSIT"
        )
      ) {
        setError(
          `সর্বনিম্ন ${taka(
            MIN_DEPOSIT
          )} ডিপোজিট করতে হবে।`
        );
      } else if (
        text.includes(
          "INVALID_AMOUNT"
        )
      ) {
        setError(
          "সঠিক ডিপোজিটের পরিমাণ দিন।"
        );
      } else if (
        text.includes(
          "PAYMENT_METHOD_REQUIRED"
        )
      ) {
        setError(
          "পেমেন্ট মাধ্যম নির্বাচন করুন।"
        );
      } else if (
        text.includes(
          "TRANSACTION_ID_REQUIRED"
        )
      ) {
        setError(
          "Transaction ID দিন।"
        );
      } else {
        setError(
          "ডিপোজিট জমা দেওয়া যায়নি। আবার চেষ্টা করুন।"
        );
      }
    } finally {
      setLoading(false);
    }
  }

  /* =======================================================
     PAGE LOADING
  ======================================================= */

  if (pageLoading) {
    return (
      <main className="min-h-screen bg-[#f5f7f6] px-4 py-10">
        <div className="mx-auto max-w-2xl">

          <div className="rounded-[28px] border border-black/5 bg-white p-10 text-center shadow-[0_20px_60px_rgba(15,23,42,0.07)]">

            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-green-100 border-t-green-600" />

            <p className="mt-4 text-sm font-semibold text-black/50">
              তথ্য লোড হচ্ছে...
            </p>

          </div>

        </div>
      </main>
    );
  }

  const selectedPayment =
    PAYMENT_METHODS[paymentMethod];

  return (
    <main className="min-h-screen bg-[#f5f7f6] text-[#111827]">

      <div className="mx-auto max-w-3xl px-4 py-5 pb-32 sm:px-6">

        {/* =================================================
            HEADER
        ================================================= */}

        <header className="mb-5 flex items-center justify-between">

          <Link
            href="/"
            className="text-xl font-black tracking-tight"
          >
            Pocket Money
          </Link>

          <Link
            href="/wallet"
            className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-bold shadow-sm transition hover:border-green-200 hover:bg-green-50"
          >
            ওয়ালেট
          </Link>

        </header>

        {/* =================================================
            BONUS CARD
        ================================================= */}

        {!bonusClaimed && (
          <section className="relative overflow-hidden rounded-[28px] bg-[#111827] p-5 text-white shadow-[0_25px_70px_rgba(15,23,42,0.16)] sm:p-7">

            <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-green-400/20 blur-3xl" />

            <div className="relative">

              <div className="flex items-start justify-between gap-4">

                <div>

                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">
                    বিশেষ ডিপোজিট সুবিধা
                  </p>

                  <h1 className="mt-2 text-2xl font-black sm:text-3xl">
                    ৳2,000 ডিপোজিট
                  </h1>

                  <p className="mt-1 text-sm leading-6 text-white/60">
                    প্রথমবার যোগ্য ডিপোজিট করলে{" "}
                    <span className="font-black text-green-400">
                      ৳500
                    </span>{" "}
                    বোনাস প্রযোজ্য।
                  </p>

                </div>

                <div className="shrink-0 rounded-2xl bg-green-400/10 px-4 py-3 text-center ring-1 ring-green-300/20">

                  <p className="text-[11px] font-bold text-white/45">
                    মোট
                  </p>

                  <p className="mt-1 text-xl font-black text-green-300">
                    ৳2,500
                  </p>

                </div>

              </div>

              <div className="mt-5 rounded-2xl bg-white/8 px-4 py-3 text-sm leading-6 text-white/65">
                এই বোনাস একজন ইউজার জীবনে মাত্র একবার পাবেন।
              </div>

            </div>

          </section>
        )}

        {/* =================================================
            BONUS CLAIMED MESSAGE
        ================================================= */}

        {bonusClaimed && (
          <section className="rounded-[24px] border border-green-100 bg-green-50 px-4 py-4">

            <div className="flex items-start gap-3">

              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-100 font-black text-green-700">
                ✓
              </div>

              <div>

                <p className="text-sm font-black text-green-900">
                  এককালীন ডিপোজিট বোনাস নেওয়া হয়েছে
                </p>

                <p className="mt-1 text-xs leading-5 text-green-800/70">
                  আপনার ৳500 বোনাসের সুবিধা ইতিমধ্যে এই ডিপোজিটের জন্য সংরক্ষিত হয়েছে। একই বোনাস আর দ্বিতীয়বার পাওয়া যাবে না।
                </p>

              </div>

            </div>

          </section>
        )}

        {/* =================================================
            DEPOSIT RULE
        ================================================= */}

        <section className="mt-4 rounded-[22px] border border-green-100 bg-green-50/70 px-4 py-3">

          <div className="flex items-center gap-3">

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-100 text-sm font-black text-green-700">
              ৳
            </div>

            <div className="min-w-0">

              <p className="text-sm font-black text-green-900">
                ডিপোজিট সীমা
              </p>

              <p className="mt-0.5 text-xs leading-5 text-green-800/70">
                সর্বনিম্ন ৳500 • সর্বোচ্চ কোনো সীমা নেই
              </p>

            </div>

          </div>

        </section>

        {/* =================================================
            PAYMENT
        ================================================= */}

        <section className="mt-4 rounded-[28px] border border-black/5 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)] sm:p-7">

          <div>

            <p className="text-xs font-bold uppercase tracking-[0.16em] text-green-600">
              ডিপোজিট
            </p>

            <h2 className="mt-1 text-xl font-black">
              টাকা জমা দিন
            </h2>

            <p className="mt-1 text-sm leading-6 text-black/45">
              আপনার পছন্দের পেমেন্ট মাধ্যম নির্বাচন করে টাকা পাঠান।
            </p>

          </div>

          {/* =================================================
              PAYMENT METHOD
          ================================================= */}

          <div className="mt-5">

            <label className="text-sm font-bold">
              পেমেন্ট মাধ্যম নির্বাচন করুন
            </label>

            <div className="mt-3 grid grid-cols-3 gap-2">

              {(
                Object.keys(
                  PAYMENT_METHODS
                ) as PaymentMethod[]
              ).map((method) => {

                const item =
                  PAYMENT_METHODS[method];

                const active =
                  paymentMethod === method;

                return (
                  <button
                    key={method}
                    type="button"
                    onClick={() => {
                      setPaymentMethod(
                        method
                      );

                      setMessage("");
                      setError("");
                    }}
                    className={`rounded-2xl border px-3 py-3.5 text-center transition active:scale-[0.98] ${
                      active
                        ? "border-[#111827] bg-[#111827] text-white shadow-lg"
                        : "border-black/8 bg-[#f8faf9] text-black/65 hover:border-black/15 hover:bg-white"
                    }`}
                  >

                    <p className="text-sm font-black">
                      {item.name}
                    </p>

                    <p
                      className={`mt-1 text-[9px] font-semibold ${
                        active
                          ? "text-white/50"
                          : "text-black/35"
                      }`}
                    >
                      Send Money
                    </p>

                  </button>
                );
              })}

            </div>

          </div>

          {/* =================================================
              SELECTED PAYMENT NUMBER
          ================================================= */}

          <div
            className={`mt-4 rounded-2xl p-4 ${
              selectedPayment.color === "pink"
                ? "border border-pink-100 bg-pink-50/60"
                : selectedPayment.color === "orange"
                ? "border border-orange-100 bg-orange-50/60"
                : "border border-purple-100 bg-purple-50/60"
            }`}
          >

            <div className="flex items-center justify-between gap-3">

              <div>

                <p className="text-sm font-black">
                  {selectedPayment.name}
                </p>

                <p className="mt-1 text-xs text-black/45">
                  {selectedPayment.description}
                </p>

              </div>

              <div className="rounded-xl bg-white px-3 py-2.5 text-sm font-black tracking-wide shadow-sm">
                {selectedPayment.number}
              </div>

            </div>

            <p className="mt-3 text-xs leading-5 text-black/55">
              এই নম্বরে টাকা পাঠিয়ে নিচে Transaction ID দিন।
            </p>

          </div>

          {/* =================================================
              AMOUNT
          ================================================= */}

          <div className="mt-5">

            <div className="flex items-center justify-between">

              <label className="text-sm font-bold">
                ডিপোজিটের পরিমাণ
              </label>

              <span className="text-xs font-semibold text-black/35">
                সর্বনিম্ন ৳500
              </span>

            </div>

            <div className="relative mt-2">

              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-black/35">
                ৳
              </span>

              <input
                value={amount}
                onChange={(e) =>
                  setAmount(
                    e.target.value.replace(
                      /[^0-9]/g,
                      ""
                    )
                  )
                }
                inputMode="numeric"
                min={MIN_DEPOSIT}
                className="w-full rounded-2xl border border-black/10 bg-[#f8faf9] py-4 pl-10 pr-4 text-lg font-black outline-none transition focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-500/10"
                placeholder="500"
              />

            </div>

            {Number(amount) > 0 &&
              Number(amount) < MIN_DEPOSIT && (
                <div className="mt-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-semibold leading-5 text-red-700">
                  সর্বনিম্ন ৳500 ডিপোজিট করতে হবে।
                </div>
              )}

            {!bonusClaimed &&
              Number(amount) >= QUALIFYING_DEPOSIT && (
                <div className="mt-3 flex items-center justify-between rounded-2xl bg-green-50 px-4 py-3">

                  <span className="text-sm font-semibold text-green-800">
                    ডিপোজিট বোনাস
                  </span>

                  <span className="font-black text-green-700">
                    +৳500
                  </span>

                </div>
              )}

          </div>

          {/* =================================================
              TRANSACTION ID
          ================================================= */}

          <div className="mt-5">

            <label className="text-sm font-bold">
              Transaction ID
            </label>

            <input
              value={transactionId}
              onChange={(e) =>
                setTransactionId(
                  e.target.value
                )
              }
              className="mt-2 w-full rounded-2xl border border-black/10 bg-[#f8faf9] px-4 py-4 text-sm font-semibold outline-none transition focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-500/10"
              placeholder="Transaction ID লিখুন"
            />

          </div>

          {/* =================================================
              MESSAGE
          ================================================= */}

          {message && (
            <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold leading-6 text-green-800">
              {message}
            </div>
          )}

          {error && (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold leading-6 text-red-700">
              {error}
            </div>
          )}

          {/* =================================================
              SUBMIT
          ================================================= */}

          <button
            type="button"
            onClick={submitDeposit}
            disabled={loading}
            className="mt-5 w-full rounded-2xl bg-[#111827] px-5 py-4 text-sm font-black text-white shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50"
          >

            {loading
              ? "জমা হচ্ছে..."
              : `${selectedPayment.name} দিয়ে ডিপোজিট জমা দিন`}

          </button>

        </section>

        {/* =================================================
            DEPOSIT HISTORY
        ================================================= */}

        <section className="mt-5">

          <div className="mb-3 flex items-center justify-between">

            <div>

              <h2 className="text-lg font-black">
                ডিপোজিটের ইতিহাস
              </h2>

              <p className="mt-0.5 text-xs text-black/40">
                আপনার সব ডিপোজিটের বর্তমান অবস্থা
              </p>

            </div>

            <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-black/40 shadow-sm">
              {deposits.length} টি
            </span>

          </div>

          {deposits.length === 0 ? (

            <div className="rounded-[24px] border border-black/5 bg-white p-8 text-center shadow-sm">

              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-xl font-black text-green-600">
                ৳
              </div>

              <p className="mt-4 text-sm font-semibold text-black/45">
                এখনো কোনো ডিপোজিট নেই।
              </p>

            </div>

          ) : (

            <div className="space-y-3">

              {deposits.map((deposit) => {

                const depositMethod =
                  deposit.payment_method?.toLowerCase();

                const methodName =
                  depositMethod === "nagad"
                    ? "Nagad"
                    : depositMethod === "rocket"
                    ? "Rocket"
                    : "bKash";

                return (

                  <div
                    key={deposit.id}
                    className="overflow-hidden rounded-[24px] border border-black/5 bg-white shadow-sm transition hover:shadow-md"
                  >

                    <div className="p-4">

                      <div className="flex items-start justify-between gap-3">

                        <div className="min-w-0">

                          <div className="flex flex-wrap items-center gap-2">

                            <p className="text-lg font-black">
                              {taka(
                                deposit.amount
                              )}
                            </p>

                            <span className="rounded-full bg-black/5 px-2.5 py-1 text-[9px] font-black text-black/50">
                              {methodName}
                            </span>

                          </div>

                          <p className="mt-1 text-xs text-black/40">
                            {deposit.created_at
                              ? new Date(
                                  deposit.created_at
                                ).toLocaleString(
                                  "bn-BD"
                                )
                              : "সময় পাওয়া যায়নি"}
                          </p>

                        </div>

                        <span
                          className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-black ${getStatusClass(
                            deposit.status
                          )}`}
                        >

                          <span className="text-sm leading-none">
                            {getStatusIcon(
                              deposit.status
                            )}
                          </span>

                          {getStatusLabel(
                            deposit.status
                          )}

                        </span>

                      </div>

                      {/* =================================================
                          STATUS DESCRIPTION
                      ================================================= */}

                      <div
                        className={`mt-4 rounded-2xl border px-4 py-3 ${
                          deposit.status === "Approved"
                            ? "border-green-100 bg-green-50/70"
                            : deposit.status === "Rejected"
                            ? "border-red-100 bg-red-50/70"
                            : deposit.status === "Verifying"
                            ? "border-blue-100 bg-blue-50/70"
                            : "border-yellow-100 bg-yellow-50/70"
                        }`}
                      >

                        <p className="text-xs font-semibold leading-5 text-black/60">
                          {getStatusDescription(
                            deposit.status
                          )}
                        </p>

                      </div>

                      {/* =================================================
                          TRANSACTION
                      ================================================= */}

                      <div className="mt-3 flex items-center justify-between gap-3 border-t border-black/5 pt-3">

                        <p className="text-xs text-black/45">
                          Transaction ID
                        </p>

                        <p className="max-w-[55%] truncate text-xs font-bold">
                          {deposit.transaction_id}
                        </p>

                      </div>

                      {/* =================================================
                          BONUS
                      ================================================= */}

                      {deposit.bonus_amount > 0 && (
                        <div className="mt-3 flex items-center justify-between rounded-xl bg-green-50 px-3 py-2.5">

                          <span className="text-xs font-bold text-green-700">
                            ডিপোজিট বোনাস
                          </span>

                          <span className="text-xs font-black text-green-700">
                            +৳
                            {deposit.bonus_amount.toLocaleString(
                              "en-BD"
                            )}
                          </span>

                        </div>
                      )}

                    </div>

                  </div>

                );
              })}

            </div>

          )}

        </section>

        {/* =================================================
            STATUS INFORMATION
        ================================================= */}

        <section className="mt-5 rounded-[24px] border border-black/5 bg-white p-5 shadow-sm">

          <h3 className="text-sm font-black">
            ডিপোজিটের স্ট্যাটাস কীভাবে কাজ করে?
          </h3>

          <div className="mt-4 space-y-3">

            {/* PENDING */}

            <div className="flex gap-3">

              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-yellow-50 text-sm font-black text-yellow-600">
                ◷
              </div>

              <div>

                <p className="text-sm font-bold">
                  অপেক্ষমাণ
                </p>

                <p className="text-xs leading-5 text-black/45">
                  ডিপোজিট জমা হয়েছে এবং যাচাই শুরু হওয়ার অপেক্ষায় আছে।
                </p>

              </div>

            </div>

            {/* VERIFYING */}

            <div className="flex gap-3">

              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-black text-blue-600">
                ⌁
              </div>

              <div>

                <p className="text-sm font-bold">
                  যাচাই হচ্ছে
                </p>

                <p className="text-xs leading-5 text-black/45">
                  পেমেন্টের তথ্য যাচাই করা হচ্ছে।
                </p>

              </div>

            </div>

            {/* APPROVED */}

            <div className="flex gap-3">

              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-green-50 text-sm font-black text-green-600">
                ✓
              </div>

              <div>

                <p className="text-sm font-bold">
                  অনুমোদিত
                </p>

                <p className="text-xs leading-5 text-black/45">
                  ডিপোজিট অনুমোদিত হলে প্রযোজ্য ব্যালেন্স আপডেট হবে।
                </p>

              </div>

            </div>

            {/* REJECTED */}

            <div className="flex gap-3">

              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-red-50 text-sm font-black text-red-600">
                ×
              </div>

              <div>

                <p className="text-sm font-bold">
                  বাতিল
                </p>

                <p className="text-xs leading-5 text-black/45">
                  পেমেন্ট যাচাই করা সম্ভব না হলে ডিপোজিট বাতিল হতে পারে।
                </p>

              </div>

            </div>

          </div>

        </section>

      </div>

      {/* =========================================================
          BOTTOM NAVIGATION
      ========================================================= */}

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-black/[0.06] bg-white/95 px-3 pt-2 backdrop-blur-xl">

        <div className="mx-auto grid max-w-3xl grid-cols-5 gap-1 pb-[calc(7px+env(safe-area-inset-bottom))]">

          {/* HOME */}

          <Link
            href="/"
            className="flex flex-col items-center justify-center rounded-2xl py-2 text-black/40 transition active:scale-95"
          >

            <span className="flex h-7 items-center justify-center text-[19px]">
              ⌂
            </span>

            <span className="text-[10px] font-bold">
              হোম
            </span>

          </Link>

          {/* PACKAGES */}

          <Link
            href="/packages"
            className="flex flex-col items-center justify-center rounded-2xl py-2 text-black/40 transition active:scale-95"
          >

            <span className="flex h-7 items-center justify-center text-[18px]">
              ▦
            </span>

            <span className="text-[10px] font-bold">
              প্যাকেজ
            </span>

          </Link>

          {/* TASKS */}

          <Link
            href="/tasks"
            className="flex flex-col items-center justify-center rounded-2xl py-2 text-black/40 transition active:scale-95"
          >

            <span className="flex h-7 items-center justify-center text-[18px]">
              ✓
            </span>

            <span className="text-[10px] font-bold">
              টাস্ক
            </span>

          </Link>

          {/* WALLET */}

          <Link
            href="/wallet"
            className="flex flex-col items-center justify-center rounded-2xl py-2 text-green-600 transition active:scale-95"
          >

            <span className="flex h-7 w-9 items-center justify-center rounded-xl bg-green-50 text-[18px] font-black">
              ৳
            </span>

            <span className="mt-0.5 text-[10px] font-black">
              ওয়ালেট
            </span>

          </Link>

          {/* PROFILE */}

          <Link
            href="/profile"
            className="flex flex-col items-center justify-center rounded-2xl py-2 text-black/40 transition active:scale-95"
          >

            <span className="flex h-7 items-center justify-center text-[18px]">
              ◉
            </span>

            <span className="text-[10px] font-bold">
              প্রোফাইল
            </span>

          </Link>

        </div>

      </nav>

    </main>
  );
}