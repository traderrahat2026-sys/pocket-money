"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Wallet = {
  balance: number;
  deposit_balance: number;
  earning_balance: number;
  total_earned: number;
  total_deposited: number;
  total_withdrawn: number;
  deposit_bonus_claimed: boolean;
  deposit_bonus_amount: number;
};

type DepositItem = {
  id: number;
  amount: number;
  payment_method: string | null;
  payment_number: string | null;
  transaction_id: string | null;
  status: string | null;
  bonus_amount: number;
  created_at: string;
  approved_at: string | null;
};

type WithdrawalItem = {
  id: string;
  amount: number;
  payment_method: string | null;
  account_number: string | null;
  status: string | null;
  admin_note: string | null;
  requested_at: string;
  reviewed_at: string | null;
  created_at: string;
};

type LedgerItem = {
  id: number;
  type: string;
  amount: number;
  description: string | null;
  created_at: string;
};

type TransactionItem = {
  id: string;
  source: "deposit" | "withdrawal" | "ledger";
  type: string;
  title: string;
  description: string;
  amount: number;
  status: string;
  created_at: string;
};

function taka(value: number) {
  return `৳${Number(value || 0).toLocaleString("en-BD")}`;
}

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString("bn-BD", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

function methodName(method: string | null | undefined) {
  const value = String(method || "").toLowerCase();

  if (value === "bkash") return "bKash";
  if (value === "nagad") return "Nagad";
  if (value === "rocket") return "Rocket";

  return method || "অনলাইন পেমেন্ট";
}

function depositStatus(status: string | null | undefined) {
  const value = String(status || "").trim().toLowerCase();

  if (value === "approved" || value === "completed") {
    return {
      text: "অনুমোদিত",
      className: "bg-green-50 text-green-700",
    };
  }

  if (value === "rejected" || value === "cancelled") {
    return {
      text: "বাতিল",
      className: "bg-red-50 text-red-600",
    };
  }

  return {
    text: "অপেক্ষমাণ",
    className: "bg-amber-50 text-amber-700",
  };
}

function withdrawalStatus(status: string | null | undefined) {
  const value = String(status || "").trim().toLowerCase();

  if (value === "approved" || value === "completed") {
    return {
      text: value === "completed" ? "সম্পন্ন" : "অনুমোদিত",
      className: "bg-green-50 text-green-700",
    };
  }

  if (
    value === "rejected" ||
    value === "cancelled" ||
    value === "canceled"
  ) {
    return {
      text: "বাতিল",
      className: "bg-red-50 text-red-600",
    };
  }

  return {
    text: "অপেক্ষমাণ",
    className: "bg-amber-50 text-amber-700",
  };
}

export default function WalletPage() {
  const [wallet, setWallet] = useState<Wallet | null>(null);

  const [deposits, setDeposits] = useState<DepositItem[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalItem[]>([]);
  const [ledger, setLedger] = useState<LedgerItem[]>([]);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadWallet = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("প্রথমে Login করুন।");
        return;
      }

      /*
       * IMPORTANT
       * সব data fresh করে database থেকে নেওয়া হচ্ছে।
       * Withdrawal status-এর source হলো withdrawals table।
       */

      const [
        walletResult,
        depositResult,
        withdrawalResult,
        ledgerResult,
      ] = await Promise.all([
        supabase.rpc("get_my_wallet"),

        supabase
          .from("deposits")
          .select(
            `
              id,
              amount,
              payment_method,
              payment_number,
              transaction_id,
              status,
              bonus_amount,
              created_at,
              approved_at
            `
          )
          .eq("user_id", user.id)
          .order("created_at", {
            ascending: false,
          })
          .limit(50),

        supabase
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
          .eq("user_id", user.id)
          .order("requested_at", {
            ascending: false,
          })
          .limit(50),

        supabase
          .from("wallet_ledger")
          .select(
            `
              id,
              type,
              amount,
              description,
              created_at
            `
          )
          .eq("user_id", user.id)
          .order("created_at", {
            ascending: false,
          })
          .limit(50),
      ]);

      if (walletResult.error) {
        throw walletResult.error;
      }

      if (depositResult.error) {
        console.error(
          "DEPOSIT HISTORY ERROR:",
          depositResult.error
        );
      }

      if (withdrawalResult.error) {
        console.error(
          "WITHDRAWAL HISTORY ERROR:",
          withdrawalResult.error
        );
      }

      if (ledgerResult.error) {
        console.error(
          "LEDGER HISTORY ERROR:",
          ledgerResult.error
        );
      }

      /*
       * WALLET
       */

      const walletData = walletResult.data;

      setWallet({
        balance: Number(walletData?.balance || 0),
        deposit_balance: Number(
          walletData?.deposit_balance || 0
        ),
        earning_balance: Number(
          walletData?.earning_balance || 0
        ),
        total_earned: Number(
          walletData?.total_earned || 0
        ),
        total_deposited: Number(
          walletData?.total_deposited || 0
        ),
        total_withdrawn: Number(
          walletData?.total_withdrawn || 0
        ),
        deposit_bonus_claimed: Boolean(
          walletData?.deposit_bonus_claimed
        ),
        deposit_bonus_amount: Number(
          walletData?.deposit_bonus_amount || 0
        ),
      });

      /*
       * DEPOSITS
       */

      const depositRows: DepositItem[] =
        Array.isArray(depositResult.data)
          ? depositResult.data.map((item: any) => ({
              id: Number(item.id),
              amount: Number(item.amount || 0),
              payment_method:
                item.payment_method || null,
              payment_number:
                item.payment_number || null,
              transaction_id:
                item.transaction_id || null,
              status:
                item.status || "Pending",
              bonus_amount: Number(
                item.bonus_amount || 0
              ),
              created_at:
                item.created_at,
              approved_at:
                item.approved_at || null,
            }))
          : [];

      /*
       * WITHDRAWALS
       *
       * IMPORTANT:
       * এখানকার status সরাসরি withdrawals.status
       * থেকে নেওয়া হচ্ছে।
       *
       * Admin approve করলে:
       * approved
       *
       * Admin reject করলে:
       * rejected
       *
       * নতুন request হলে:
       * pending
       */

      const withdrawalRows: WithdrawalItem[] =
        Array.isArray(withdrawalResult.data)
          ? withdrawalResult.data.map(
              (item: any) => ({
                id: String(item.id),
                amount: Number(
                  item.amount || 0
                ),
                payment_method:
                  item.payment_method || null,
                account_number:
                  item.account_number || null,
                status:
                  item.status || "pending",
                admin_note:
                  item.admin_note || null,
                requested_at:
                  item.requested_at ||
                  item.created_at,
                reviewed_at:
                  item.reviewed_at || null,
                created_at:
                  item.created_at ||
                  item.requested_at,
              })
            )
          : [];

      /*
       * LEDGER
       */

      const ledgerRows: LedgerItem[] =
        Array.isArray(ledgerResult.data)
          ? ledgerResult.data.map(
              (item: any) => ({
                id: Number(item.id),
                type: String(
                  item.type || ""
                ),
                amount: Number(
                  item.amount || 0
                ),
                description:
                  item.description || null,
                created_at:
                  item.created_at,
              })
            )
          : [];

      setDeposits(depositRows);
      setWithdrawals(withdrawalRows);
      setLedger(ledgerRows);

      /*
       * =====================================================
       * TRANSACTION HISTORY
       * =====================================================
       */

      const depositTransactions: TransactionItem[] =
        depositRows.map((item) => {
          const status = depositStatus(
            item.status
          );

          const bonusText =
            item.bonus_amount > 0
              ? ` • বোনাস ${taka(
                  item.bonus_amount
                )}`
              : "";

          return {
            id: `deposit-${item.id}`,
            source: "deposit",
            type: "deposit",
            title: "ডিপোজিট",
            description:
              `${methodName(
                item.payment_method
              )} • Transaction ID: ${
                item.transaction_id || "N/A"
              }${bonusText}`,
            amount: item.amount,
            status: status.text,
            created_at:
              item.created_at,
          };
        });

      /*
       * WITHDRAWAL TRANSACTION
       *
       * শুধু withdrawals table-এর live status ব্যবহার করছি।
       */

      const withdrawalTransactions: TransactionItem[] =
        withdrawalRows.map((item) => {
          const status =
            withdrawalStatus(
              item.status
            );

          return {
            id: `withdrawal-${item.id}`,
            source: "withdrawal",
            type: "withdrawal",
            title: "উত্তোলন",
            description:
              `${methodName(
                item.payment_method
              )} • ${
                item.account_number || ""
              }`.trim(),
            amount:
              -Math.abs(item.amount),
            status: status.text,
            created_at:
              item.requested_at ||
              item.created_at,
          };
        });

      /*
       * LEDGER
       *
       * Withdrawal ledger entries এখানে বাদ দেওয়া হচ্ছে।
       *
       * কারণ withdrawal-এর আসল status withdrawals table-এ।
       * পুরোনো ledger entry-কে history-তে আবার দেখালে
       * একই withdrawal দুইবার দেখা যায় এবং Pending/কাটা হয়েছে
       * নিয়ে confusion তৈরি হয়।
       */

      const withdrawalLedgerTypes = new Set([
        "withdrawal",
        "withdraw",
        "withdrawal_request",
        "withdrawal_pending",
        "withdrawal_deduction",
      ]);

      const withdrawalLedgerDescriptions = [
        "withdrawal",
        "উত্তোলন",
      ];

      const ledgerTransactions: TransactionItem[] =
        ledgerRows
          .filter((item) => {
            const type = String(
              item.type || ""
            ).trim().toLowerCase();

            const description =
              String(
                item.description || ""
              ).trim().toLowerCase();

            if (
              withdrawalLedgerTypes.has(
                type
              )
            ) {
              return false;
            }

            if (
              withdrawalLedgerDescriptions.some(
                (keyword) =>
                  description.includes(
                    keyword
                  )
              )
            ) {
              return false;
            }

            return true;
          })
          .map((item) => {
            const amount = Number(
              item.amount || 0
            );

            const positive =
              amount >= 0;

            return {
              id: `ledger-${item.id}`,
              source: "ledger",
              type: item.type,
              title:
                item.description ||
                "ওয়ালেট লেনদেন",
              description:
                item.description ||
                item.type ||
                "ওয়ালেট লেনদেন",
              amount,
              status: positive
                ? "যোগ হয়েছে"
                : "কাটা হয়েছে",
              created_at:
                item.created_at,
            };
          });

      /*
       * Combine all real transaction sources.
       */

      const combined = [
        ...depositTransactions,
        ...withdrawalTransactions,
        ...ledgerTransactions,
      ];

      combined.sort(
        (a, b) =>
          new Date(
            b.created_at
          ).getTime() -
          new Date(
            a.created_at
          ).getTime()
      );

      setTransactions(
        combined.slice(0, 100)
      );
    } catch (err) {
      console.error(
        "WALLET LOAD ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "ওয়ালেট লোড করা যায়নি।"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  /*
   * INITIAL LOAD
   */

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  /*
   * PAGE/APP FOCUS REFRESH
   *
   * Admin অন্য tab-এ approve/reject করলে
   * user wallet page-এ ফিরে আসার সময় fresh data নেবে।
   */

  useEffect(() => {
    const handleFocus = () => {
      loadWallet(true);
    };

    const handleVisibility = () => {
      if (
        document.visibilityState ===
        "visible"
      ) {
        loadWallet(true);
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
  }, [loadWallet]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f6f7f7] px-4 py-8">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-[28px] border border-black/[0.05] bg-white p-10 text-center shadow-sm">
            <div className="mx-auto h-7 w-7 animate-spin rounded-full border-[3px] border-black/10 border-t-black" />

            <p className="mt-4 text-xs font-bold text-black/40">
              ওয়ালেট লোড হচ্ছে...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f7f7] text-[#111827]">

      <div className="mx-auto max-w-3xl px-4 pb-28 pt-4 sm:px-6">

        {/* HEADER */}

        <header className="mb-5 flex items-center justify-between">

          <Link
            href="/"
            className="text-[20px] font-black tracking-[-0.05em]"
          >
            Pocket Money
          </Link>

          <div className="flex items-center gap-2">

            <button
              type="button"
              onClick={() =>
                loadWallet(true)
              }
              disabled={refreshing}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-black/[0.07] bg-white text-sm shadow-sm transition active:scale-95 disabled:opacity-50"
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
              href="/profile"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-black/[0.07] bg-white shadow-sm transition hover:bg-[#111827] hover:text-white"
              aria-label="প্রোফাইল"
            >
              <span className="text-sm">
                👤
              </span>
            </Link>

          </div>

        </header>

        {/* ERROR */}

        {error && (
          <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-bold text-red-600">
            {error}
          </div>
        )}

        {/* TOTAL BALANCE */}

        <section className="relative overflow-hidden rounded-[28px] bg-[#111827] px-5 py-6 text-white shadow-[0_20px_50px_rgba(15,23,42,0.12)] sm:px-7">

          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-green-400/[0.08] blur-3xl" />

          <div className="relative">

            <div className="flex items-center justify-between">

              <p className="text-[10px] font-bold tracking-[0.18em] text-white/40">
                মোট ব্যালেন্স
              </p>

              <span className="rounded-full bg-white/[0.08] px-3 py-1 text-[9px] font-bold text-white/50">
                সক্রিয়
              </span>

            </div>

            <p className="mt-3 text-[38px] font-black tracking-[-0.06em] sm:text-[48px]">
              {taka(wallet?.balance || 0)}
            </p>

            <p className="mt-1 text-[10px] text-white/35">
              ডিপোজিট + ইনকাম ব্যালেন্স
            </p>

          </div>

        </section>

        {/* BALANCES */}

        <section className="mt-3 grid grid-cols-2 gap-3">

          <div className="rounded-[23px] border border-black/[0.05] bg-white p-4 shadow-sm sm:p-5">

            <div className="flex items-center justify-between">

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f3f4f6] text-sm font-black">
                ৳
              </div>

              <span className="text-[8px] font-black text-black/30">
                প্যাকেজ
              </span>

            </div>

            <p className="mt-4 text-[10px] font-bold text-black/35">
              ডিপোজিট ব্যালেন্স
            </p>

            <p className="mt-1 text-[23px] font-black tracking-[-0.04em] sm:text-[27px]">
              {taka(
                wallet?.deposit_balance || 0
              )}
            </p>

            <p className="mt-2 text-[9px] leading-4 text-black/30">
              শুধু প্যাকেজ সক্রিয় করতে ব্যবহারযোগ্য।
            </p>

          </div>

          <div className="rounded-[23px] border border-green-100 bg-[#f1faf3] p-4 shadow-sm sm:p-5">

            <div className="flex items-center justify-between">

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-100 text-sm font-black text-green-700">
                ↗
              </div>

              <span className="text-[8px] font-black text-green-700/50">
                উত্তোলনযোগ্য
              </span>

            </div>

            <p className="mt-4 text-[10px] font-bold text-green-700/50">
              ইনকাম ব্যালেন্স
            </p>

            <p className="mt-1 text-[23px] font-black tracking-[-0.04em] text-green-700 sm:text-[27px]">
              {taka(
                wallet?.earning_balance || 0
              )}
            </p>

            <p className="mt-2 text-[9px] leading-4 text-green-800/40">
              এখান থেকেই উত্তোলন করা যাবে।
            </p>

          </div>

        </section>

        {/* BONUS */}

        <section className="mt-3 flex items-center justify-between gap-3 rounded-[22px] border border-green-100 bg-white px-4 py-4 shadow-sm">

          <div className="flex min-w-0 items-center gap-3">

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-50 text-sm font-black text-green-700">
              +
            </div>

            <div className="min-w-0">

              <p className="text-xs font-black">
                ডিপোজিট বোনাস
              </p>

              <p className="mt-1 truncate text-[9px] text-black/35">
                {wallet?.deposit_bonus_claimed
                  ? "বোনাস ইতিমধ্যে যোগ হয়েছে"
                  : "৳2,000 বা তার বেশি ডিপোজিটে একবার"}
              </p>

            </div>

          </div>

          <p className="shrink-0 text-lg font-black text-green-700">
            {wallet?.deposit_bonus_claimed
              ? taka(
                  wallet?.deposit_bonus_amount ||
                    0
                )
              : "৳500"}
          </p>

        </section>

        {/* QUICK ACTIONS */}

        <section className="mt-3 grid grid-cols-3 gap-2.5">

          <Link
            href="/deposit"
            className="rounded-[19px] border border-black/[0.05] bg-white px-3 py-4 text-center shadow-sm transition active:scale-[0.97]"
          >
            <div className="text-lg font-light">
              ＋
            </div>

            <p className="mt-1 text-[10px] font-black">
              ডিপোজিট
            </p>
          </Link>

          <Link
            href="/packages"
            className="rounded-[19px] border border-black/[0.05] bg-white px-3 py-4 text-center shadow-sm transition active:scale-[0.97]"
          >
            <div className="text-lg font-light">
              ◇
            </div>

            <p className="mt-1 text-[10px] font-black">
              প্যাকেজ
            </p>
          </Link>

          <Link
            href="/withdraw"
            className="rounded-[19px] border border-black/[0.05] bg-white px-3 py-4 text-center shadow-sm transition active:scale-[0.97]"
          >
            <div className="text-lg font-light">
              ↗
            </div>

            <p className="mt-1 text-[10px] font-black">
              উত্তোলন
            </p>
          </Link>

        </section>

        {/* STATS */}

        <section className="mt-3 grid grid-cols-3 divide-x divide-black/[0.06] rounded-[22px] border border-black/[0.05] bg-white py-4 shadow-sm">

          <div className="px-1 text-center">
            <p className="text-[8px] font-bold text-black/30">
              মোট আয়
            </p>

            <p className="mt-1 text-xs font-black">
              {taka(
                wallet?.total_earned || 0
              )}
            </p>
          </div>

          <div className="px-1 text-center">
            <p className="text-[8px] font-bold text-black/30">
              মোট ডিপোজিট
            </p>

            <p className="mt-1 text-xs font-black">
              {taka(
                wallet?.total_deposited || 0
              )}
            </p>
          </div>

          <div className="px-1 text-center">
            <p className="text-[8px] font-bold text-black/30">
              মোট উত্তোলন
            </p>

            <p className="mt-1 text-xs font-black">
              {taka(
                wallet?.total_withdrawn || 0
              )}
            </p>
          </div>

        </section>

        {/* TRANSACTION HISTORY */}

        <section className="mt-7">

          <div className="mb-3 flex items-center justify-between">

            <div>
              <h2 className="text-base font-black tracking-[-0.02em]">
                লেনদেন
              </h2>

              <p className="mt-1 text-[9px] text-black/30">
                ডিপোজিট, উত্তোলন ও ওয়ালেটের সকল কার্যক্রম
              </p>
            </div>

            <span className="text-[9px] font-bold text-black/25">
              সর্বশেষ ১০০টি
            </span>

          </div>

          {transactions.length === 0 ? (

            <div className="rounded-[22px] border border-black/[0.05] bg-white px-5 py-10 text-center shadow-sm">

              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-black/[0.03] text-sm text-black/30">
                —
              </div>

              <p className="mt-3 text-xs font-semibold text-black/35">
                এখনো কোনো লেনদেন পাওয়া যায়নি।
              </p>

              <p className="mt-1 text-[9px] text-black/25">
                ডিপোজিট বা উত্তোলন করলে এখানে দেখা যাবে।
              </p>

            </div>

          ) : (

            <div className="space-y-2">

              {transactions.map(
                (item) => {

                  const positive =
                    item.amount >= 0;

                  const isDeposit =
                    item.source ===
                    "deposit";

                  const isWithdrawal =
                    item.source ===
                    "withdrawal";

                  let statusClass =
                    "bg-black/[0.04] text-black/50";

                  if (
                    item.status ===
                      "অনুমোদিত" ||
                    item.status ===
                      "সম্পন্ন" ||
                    item.status ===
                      "যোগ হয়েছে"
                  ) {
                    statusClass =
                      "bg-green-50 text-green-700";
                  }

                  if (
                    item.status ===
                      "বাতিল" ||
                    item.status ===
                      "কাটা হয়েছে"
                  ) {
                    statusClass =
                      "bg-red-50 text-red-600";
                  }

                  if (
                    item.status ===
                    "অপেক্ষমাণ"
                  ) {
                    statusClass =
                      "bg-amber-50 text-amber-700";
                  }

                  return (
                    <div
                      key={item.id}
                      className="rounded-[20px] border border-black/[0.04] bg-white px-4 py-3.5 shadow-sm"
                    >

                      <div className="flex items-center justify-between gap-3">

                        <div className="flex min-w-0 items-center gap-3">

                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-black ${
                              isDeposit
                                ? "bg-green-50 text-green-600"
                                : isWithdrawal
                                ? "bg-red-50 text-red-500"
                                : positive
                                ? "bg-green-50 text-green-600"
                                : "bg-red-50 text-red-500"
                            }`}
                          >
                            {isDeposit
                              ? "+"
                              : isWithdrawal
                              ? "↗"
                              : positive
                              ? "+"
                              : "−"}
                          </div>

                          <div className="min-w-0">

                            <div className="flex flex-wrap items-center gap-2">

                              <p className="truncate text-xs font-black">
                                {item.title}
                              </p>

                              <span
                                className={`rounded-full px-2 py-0.5 text-[8px] font-black ${statusClass}`}
                              >
                                {item.status}
                              </span>

                            </div>

                            <p className="mt-1 truncate text-[9px] text-black/35">
                              {item.description}
                            </p>

                            <p className="mt-1 text-[8px] text-black/25">
                              {formatDate(
                                item.created_at
                              )}
                            </p>

                          </div>

                        </div>

                        <p
                          className={`shrink-0 text-sm font-black ${
                            positive
                              ? "text-green-600"
                              : "text-red-500"
                          }`}
                        >
                          {positive
                            ? "+"
                            : "−"}
                          {taka(
                            Math.abs(
                              item.amount
                            )
                          )}
                        </p>

                      </div>

                    </div>
                  );
                }
              )}

            </div>

          )}

        </section>

        {/* DIRECT WITHDRAWAL STATUS */}

        {withdrawals.length > 0 && (
          <section className="mt-7">

            <div className="mb-3">

              <h2 className="text-base font-black">
                উত্তোলনের অবস্থা
              </h2>

              <p className="mt-1 text-[9px] text-black/30">
                আপনার উত্তোলনের অনুরোধের বর্তমান অবস্থা
              </p>

            </div>

            <div className="space-y-2">

              {withdrawals
                .slice(0, 10)
                .map((item) => {

                  const status =
                    withdrawalStatus(
                      item.status
                    );

                  return (
                    <div
                      key={`withdrawal-status-${item.id}`}
                      className="rounded-[19px] border border-black/[0.05] bg-white px-4 py-3.5 shadow-sm"
                    >

                      <div className="flex items-center justify-between gap-3">

                        <div className="min-w-0">

                          <p className="text-xs font-black">
                            {methodName(
                              item.payment_method
                            )} উত্তোলন
                          </p>

                          <p className="mt-1 text-[9px] text-black/30">
                            {formatDate(
                              item.requested_at
                            )}
                          </p>

                          {item.reviewed_at && (
                            <p className="mt-1 text-[8px] text-black/25">
                              যাচাই করা হয়েছে:{" "}
                              {formatDate(
                                item.reviewed_at
                              )}
                            </p>
                          )}

                          {item.admin_note && (
                            <p className="mt-1 text-[9px] text-black/40">
                              নোট:{" "}
                              {item.admin_note}
                            </p>
                          )}

                        </div>

                        <div className="shrink-0 text-right">

                          <p className="text-sm font-black text-red-500">
                            −
                            {taka(
                              item.amount
                            )}
                          </p>

                          <span
                            className={`mt-1 inline-flex rounded-full px-2 py-1 text-[8px] font-black ${status.className}`}
                          >
                            {status.text}
                          </span>

                        </div>

                      </div>

                    </div>
                  );
                })}

            </div>

          </section>
        )}

      </div>

      {/* BOTTOM NAVIGATION */}

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-black/[0.06] bg-white/95 px-3 pt-2 backdrop-blur-xl">

        <div className="mx-auto grid max-w-3xl grid-cols-5 pb-[max(8px,env(safe-area-inset-bottom))]">

          <Link
            href="/"
            className="flex flex-col items-center justify-center gap-1 py-1 text-black/35"
          >
            <span className="text-[17px]">
              ⌂
            </span>

            <span className="text-[9px] font-black">
              হোম
            </span>
          </Link>

          <Link
            href="/packages"
            className="flex flex-col items-center justify-center gap-1 py-1 text-black/35"
          >
            <span className="text-[17px]">
              ◇
            </span>

            <span className="text-[9px] font-black">
              প্যাকেজ
            </span>
          </Link>

          <Link
            href="/tasks"
            className="flex flex-col items-center justify-center gap-1 py-1 text-black/35"
          >
            <span className="text-[17px]">
              ✓
            </span>

            <span className="text-[9px] font-black">
              কাজ
            </span>
          </Link>

          <Link
            href="/wallet"
            className="flex flex-col items-center justify-center gap-1 py-1 text-[#111827]"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#111827] text-[11px] font-black text-white">
              ৳
            </span>

            <span className="text-[9px] font-black">
              ওয়ালেট
            </span>
          </Link>

          <Link
            href="/profile"
            className="flex flex-col items-center justify-center gap-1 py-1 text-black/35"
          >
            <span className="text-[17px]">
              ●
            </span>

            <span className="text-[9px] font-black">
              প্রোফাইল
            </span>
          </Link>

        </div>

      </nav>

    </main>
  );
}