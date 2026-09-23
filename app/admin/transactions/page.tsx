"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import AdminShell from "@/components/admin/AdminShell";

type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
  phone: string | null;
};

type Transaction = {
  id: number;
  user_id: string;
  type: string;
  amount: number | string;
  user: Profile | null;
};

type Summary = {
  total: number;
  totalAmount: number;
  creditAmount: number;
  debitAmount: number;
  uniqueUsers: number;
};

function money(value: number | string) {
  return `৳${Number(value || 0).toLocaleString(
    "en-BD",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  )}`;
}

function typeClass(type: string) {
  const value =
    type.toLowerCase();

  if (
    value.includes("deposit") ||
    value.includes("earning") ||
    value.includes("bonus") ||
    value.includes("credit") ||
    value.includes("reward")
  ) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (
    value.includes("withdraw") ||
    value.includes("debit")
  ) {
    return "bg-red-50 text-red-700 ring-red-200";
  }

  return "bg-black/[0.04] text-black/60 ring-black/10";
}

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] =
    useState<Transaction[]>([]);

  const [summary, setSummary] =
    useState<Summary>({
      total: 0,
      totalAmount: 0,
      creditAmount: 0,
      debitAmount: 0,
      uniqueUsers: 0,
    });

  const [types, setTypes] =
    useState<string[]>([]);

  const [type, setType] =
    useState("all");

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [selected, setSelected] =
    useState<Transaction | null>(null);

  const [message, setMessage] =
    useState<{
      type: "success" | "error";
      text: string;
    } | null>(null);

  const loadTransactions =
    useCallback(async () => {
      try {
        setLoading(true);
        setMessage(null);

        const params =
          new URLSearchParams();

        params.set(
          "type",
          type,
        );

        if (search.trim()) {
          params.set(
            "search",
            search.trim(),
          );
        }

        params.set("limit", "500");

        const response =
          await fetch(
            `/api/admin/transactions?${params.toString()}`,
            {
              method: "GET",
              cache: "no-store",
            },
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Failed to load transactions.",
          );
        }

        setTransactions(
          data.transactions || [],
        );

        setSummary(
          data.summary || {
            total: 0,
            totalAmount: 0,
            creditAmount: 0,
            debitAmount: 0,
            uniqueUsers: 0,
          },
        );

        setTypes(
          data.types || [],
        );
      } catch (error) {
        console.error(error);

        setMessage({
          type: "error",
          text:
            error instanceof Error
              ? error.message
              : "Failed to load transactions.",
        });
      } finally {
        setLoading(false);
      }
    }, [type, search]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const visibleTransactions =
    useMemo(
      () => transactions,
      [transactions],
    );

  return (
    <AdminShell
      title="Transactions"
      description="View wallet ledger activity and user earnings movements"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#4f9d32]">
              Wallet Ledger
            </p>

            <h1 className="mt-1 text-2xl font-black tracking-tight text-black sm:text-3xl">
              Transactions
            </h1>

            <p className="mt-1 text-sm text-black/50">
              Monitor wallet credit and debit
              activity across users.
            </p>
          </div>

          <button
            type="button"
            onClick={
              loadTransactions
            }
            disabled={loading}
            className="h-11 rounded-xl border border-black/10 bg-white px-5 text-sm font-black shadow-sm transition hover:bg-black/[0.03] disabled:opacity-50"
          >
            {loading
              ? "Refreshing..."
              : "Refresh"}
          </button>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm font-bold ${
              message.type ===
              "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Summary */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          <SummaryCard
            label="Transactions"
            value={summary.total}
          />

          <SummaryCard
            label="Net Amount"
            value={money(
              summary.totalAmount,
            )}
          />

          <SummaryCard
            label="Credits"
            value={money(
              summary.creditAmount,
            )}
          />

          <SummaryCard
            label="Debits"
            value={money(
              summary.debitAmount,
            )}
          />

          <SummaryCard
            label="Unique Users"
            value={
              summary.uniqueUsers
            }
          />
        </div>

        {/* Filters */}
        <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
            <div>
              <label className="mb-1.5 block text-xs font-black uppercase tracking-wide text-black/45">
                Search
              </label>

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                placeholder="User, phone, transaction ID, type..."
                className="h-11 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 text-sm font-semibold outline-none placeholder:text-black/30 focus:border-[#4f9d32] focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-black uppercase tracking-wide text-black/45">
                Transaction Type
              </label>

              <select
                value={type}
                onChange={(event) =>
                  setType(
                    event.target.value,
                  )
                }
                className="h-11 w-full rounded-xl border border-black/10 bg-[#fafafa] px-3 text-sm font-bold outline-none focus:border-[#4f9d32]"
              >
                <option value="all">
                  All Types
                </option>

                {types.map(
                  (item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  ),
                )}
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setType("all");
                }}
                className="h-11 w-full rounded-xl bg-black px-5 text-sm font-black text-white transition hover:bg-black/85 md:w-auto"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[950px] w-full">
              <thead>
                <tr className="border-b border-black/10 bg-[#fafafa]">
                  <th className="px-5 py-4 text-left text-[11px] font-black uppercase tracking-wider text-black/45">
                    ID
                  </th>

                  <th className="px-5 py-4 text-left text-[11px] font-black uppercase tracking-wider text-black/45">
                    User
                  </th>

                  <th className="px-5 py-4 text-left text-[11px] font-black uppercase tracking-wider text-black/45">
                    Type
                  </th>

                  <th className="px-5 py-4 text-right text-[11px] font-black uppercase tracking-wider text-black/45">
                    Amount
                  </th>

                  <th className="px-5 py-4 text-left text-[11px] font-black uppercase tracking-wider text-black/45">
                    User ID
                  </th>

                  <th className="px-5 py-4 text-right text-[11px] font-black uppercase tracking-wider text-black/45">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-16 text-center"
                    >
                      <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-black/10 border-t-[#4f9d32]" />

                      <p className="mt-3 text-sm font-bold text-black/40">
                        Loading transactions...
                      </p>
                    </td>
                  </tr>
                ) : visibleTransactions.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-16 text-center"
                    >
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-black/[0.04] text-2xl">
                        ₳
                      </div>

                      <p className="mt-4 text-base font-black">
                        No transactions found
                      </p>

                      <p className="mt-1 text-sm text-black/40">
                        No wallet ledger records
                        match your filters.
                      </p>
                    </td>
                  </tr>
                ) : (
                  visibleTransactions.map(
                    (transaction) => (
                      <TransactionRow
                        key={
                          transaction.id
                        }
                        transaction={
                          transaction
                        }
                        onView={() =>
                          setSelected(
                            transaction,
                          )
                        }
                      />
                    ),
                  )
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-black/10 bg-[#fafafa] px-5 py-3">
            <p className="text-xs font-semibold text-black/40">
              Showing up to 500 latest ledger
              records.
            </p>
          </div>
        </div>
      </div>

      {/* Details */}
      {selected && (
        <TransactionDetails
          transaction={selected}
          onClose={() =>
            setSelected(null)
          }
        />
      )}
    </AdminShell>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-black uppercase tracking-wider text-black/40">
        {label}
      </p>

      <p className="mt-2 text-xl font-black">
        {value}
      </p>
    </div>
  );
}

function TransactionRow({
  transaction,
  onView,
}: {
  transaction: Transaction;
  onView: () => void;
}) {
  const userName =
    transaction.user?.full_name ||
    transaction.user?.username ||
    "Unknown User";

  const amount =
    Number(transaction.amount || 0);

  return (
    <tr className="border-b border-black/[0.06] last:border-b-0 hover:bg-black/[0.015]">
      <td className="px-5 py-4">
        <span className="font-mono text-xs font-black text-black/60">
          #{transaction.id}
        </span>
      </td>

      <td className="px-5 py-4">
        <p className="max-w-[180px] truncate text-sm font-black">
          {userName}
        </p>

        <p className="mt-1 text-xs font-semibold text-black/40">
          {transaction.user
            ?.phone ||
            (transaction.user
              ?.username
              ? `@${transaction.user.username}`
              : "No phone")}
        </p>
      </td>

      <td className="px-5 py-4">
        <span
          className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black capitalize ring-1 ${typeClass(
            transaction.type,
          )}`}
        >
          {transaction.type}
        </span>
      </td>

      <td className="px-5 py-4 text-right">
        <span
          className={`text-sm font-black ${
            amount >= 0
              ? "text-emerald-600"
              : "text-red-600"
          }`}
        >
          {amount >= 0
            ? "+"
            : "-"}
          {money(
            Math.abs(amount),
          )}
        </span>
      </td>

      <td className="px-5 py-4">
        <span className="font-mono text-[10px] font-semibold text-black/35">
          {transaction.user_id}
        </span>
      </td>

      <td className="px-5 py-4 text-right">
        <button
          type="button"
          onClick={onView}
          className="rounded-lg border border-black/10 px-3 py-2 text-xs font-black transition hover:bg-black/[0.04]"
        >
          View
        </button>
      </td>
    </tr>
  );
}

function TransactionDetails({
  transaction,
  onClose,
}: {
  transaction: Transaction;
  onClose: () => void;
}) {
  const amount =
    Number(transaction.amount || 0);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-black/10 px-5 py-4">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-[#4f9d32]">
              Ledger Entry
            </p>

            <h2 className="mt-1 text-xl font-black">
              Transaction #{transaction.id}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-black/[0.05] text-lg font-black hover:bg-black/10"
          >
            ×
          </button>
        </div>

        <div className="space-y-5 p-5">
          <div className="rounded-2xl border border-black/10 bg-[#fafafa] p-5 text-center">
            <p className="text-xs font-black uppercase tracking-wider text-black/40">
              Amount
            </p>

            <p
              className={`mt-2 text-3xl font-black ${
                amount >= 0
                  ? "text-emerald-600"
                  : "text-red-600"
              }`}
            >
              {amount >= 0
                ? "+"
                : "-"}
              {money(
                Math.abs(amount),
              )}
            </p>

            <span
              className={`mt-3 inline-flex rounded-full px-3 py-1 text-[10px] font-black capitalize ring-1 ${typeClass(
                transaction.type,
              )}`}
            >
              {transaction.type}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Info
              label="User"
              value={
                transaction.user
                  ?.full_name ||
                transaction.user
                  ?.username ||
                "Unknown User"
              }
            />

            <Info
              label="Phone"
              value={
                transaction.user
                  ?.phone ||
                "—"
              }
            />

            <Info
              label="Username"
              value={
                transaction.user
                  ?.username
                  ? `@${transaction.user.username}`
                  : "—"
              }
            />

            <Info
              label="Transaction ID"
              value={String(
                transaction.id,
              )}
            />

            <Info
              label="User ID"
              value={
                transaction.user_id
              }
            />

            <Info
              label="Type"
              value={
                transaction.type
              }
            />
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-black text-amber-800">
              Ledger information
            </p>

            <p className="mt-1 text-xs font-semibold leading-5 text-amber-700">
              This page displays records from
              the wallet ledger. It does not
              modify transaction balances.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="h-11 w-full rounded-xl bg-black text-sm font-black text-white hover:bg-black/85"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-wider text-black/40">
        {label}
      </p>

      <p className="mt-1 break-all text-sm font-bold text-black">
        {value}
      </p>
    </div>
  );
}