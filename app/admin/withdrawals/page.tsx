"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";

type WithdrawalUser = {
  id: string;
  full_name: string;
  username: string;
  phone: string;
  email: string;
};

type Withdrawal = {
  id: string;
  user_id: string;
  payment_method: string;
  account_number: string;
  amount: number;
  status: string;
  admin_note: string | null;
  reviewed_by: string | null;
  requested_at: string;
  reviewed_at: string | null;
  created_at: string;
  updated_at?: string | null;
  user: WithdrawalUser;
};

type Summary = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  pendingAmount: number;
  approvedAmount: number;
  rejectedAmount: number;
  totalAmount: number;
};

const emptySummary: Summary = {
  total: 0,
  pending: 0,
  approved: 0,
  rejected: 0,
  pendingAmount: 0,
  approvedAmount: 0,
  rejectedAmount: 0,
  totalAmount: 0,
};

function normalizeStatus(status: unknown) {
  return String(status ?? "")
    .trim()
    .toLowerCase();
}

function formatMoney(value: number) {
  return `৳${Number(value || 0).toLocaleString("en-BD", {
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en-BD", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function statusLabel(status: string) {
  const normalized = normalizeStatus(status);

  if (normalized === "approved") return "Approved";
  if (normalized === "completed") return "Completed";
  if (normalized === "rejected") return "Rejected";
  if (normalized === "pending") return "Pending";

  return "Pending";
}

function statusClasses(status: string) {
  const normalized = normalizeStatus(status);

  if (
    normalized === "approved" ||
    normalized === "completed"
  ) {
    return "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200";
  }

  if (normalized === "rejected") {
    return "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200";
  }

  return "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200";
}

function methodLabel(method: string) {
  const normalized = String(method ?? "")
    .trim()
    .toLowerCase();

  if (normalized === "bkash") return "bKash";
  if (normalized === "nagad") return "Nagad";
  if (normalized === "rocket") return "Rocket";

  return method || "Unknown";
}

function calculateSummary(
  withdrawals: Withdrawal[]
): Summary {
  const summary: Summary = {
    ...emptySummary,
  };

  summary.total = withdrawals.length;

  for (const withdrawal of withdrawals) {
    const amount = Number(withdrawal.amount || 0);
    const status = normalizeStatus(withdrawal.status);

    summary.totalAmount += amount;

    if (status === "pending") {
      summary.pending += 1;
      summary.pendingAmount += amount;
    }

    if (
      status === "approved" ||
      status === "completed"
    ) {
      summary.approved += 1;
      summary.approvedAmount += amount;
    }

    if (status === "rejected") {
      summary.rejected += 1;
      summary.rejectedAmount += amount;
    }
  }

  return summary;
}

function mergeWithdrawal(
  current: Withdrawal,
  incoming: Partial<Withdrawal>
): Withdrawal {
  return {
    ...current,
    ...incoming,
    status:
      incoming.status !== undefined
        ? String(incoming.status)
        : current.status,
  };
}

export default function WithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<
    Withdrawal[]
  >([]);

  const [summary, setSummary] =
    useState<Summary>(emptySummary);

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] =
    useState(false);

  const [selected, setSelected] =
    useState<Withdrawal | null>(null);

  const [confirmAction, setConfirmAction] =
    useState<"approve" | "reject" | null>(null);

  const [adminNote, setAdminNote] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadWithdrawals = useCallback(
    async () => {
      try {
        setLoading(true);
        setError("");

        const params = new URLSearchParams();

        params.set("status", statusFilter);

        if (search.trim()) {
          params.set(
            "search",
            search.trim()
          );
        }

        /*
         * Timestamp prevents browser/proxy from
         * returning an old GET response.
         */
        params.set("_", String(Date.now()));

        const response = await fetch(
          `/api/admin/withdrawals?${params.toString()}`,
          {
            method: "GET",
            cache: "no-store",
            headers: {
              "Cache-Control": "no-cache, no-store, max-age=0",
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Failed to load withdrawals."
          );
        }

        const nextWithdrawals: Withdrawal[] =
          Array.isArray(data.withdrawals)
            ? data.withdrawals
            : [];

        /*
         * Normalize status immediately after
         * receiving API data.
         */
        const normalizedWithdrawals =
          nextWithdrawals.map((item) => ({
            ...item,
            status: normalizeStatus(
              item.status
            ),
          }));

        setWithdrawals(
          normalizedWithdrawals
        );

        /*
         * Prefer API summary if valid.
         * Otherwise calculate directly from rows.
         */
        if (
          data.summary &&
          typeof data.summary === "object"
        ) {
          setSummary({
            total: Number(
              data.summary.total ?? 0
            ),
            pending: Number(
              data.summary.pending ?? 0
            ),
            approved: Number(
              data.summary.approved ?? 0
            ),
            rejected: Number(
              data.summary.rejected ?? 0
            ),
            pendingAmount: Number(
              data.summary.pendingAmount ?? 0
            ),
            approvedAmount: Number(
              data.summary.approvedAmount ?? 0
            ),
            rejectedAmount: Number(
              data.summary.rejectedAmount ?? 0
            ),
            totalAmount: Number(
              data.summary.totalAmount ?? 0
            ),
          });
        } else {
          setSummary(
            calculateSummary(
              normalizedWithdrawals
            )
          );
        }
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load withdrawals."
        );
      } finally {
        setLoading(false);
      }
    },
    [statusFilter, search]
  );

  useEffect(() => {
    const timer =
      window.setTimeout(() => {
        loadWithdrawals();
      }, 250);

    return () =>
      window.clearTimeout(timer);
  }, [loadWithdrawals]);

  const visibleWithdrawals =
    useMemo(() => {
      return withdrawals;
    }, [withdrawals]);

  function openAction(
    withdrawal: Withdrawal,
    action: "approve" | "reject"
  ) {
    /*
     * Always use the latest row from state.
     */
    const latest =
      withdrawals.find(
        (item) => item.id === withdrawal.id
      ) ?? withdrawal;

    setSelected(latest);
    setConfirmAction(action);
    setAdminNote(
      latest.admin_note ?? ""
    );
    setError("");
    setSuccess("");
  }

  function closeAction() {
    if (processing) return;

    setSelected(null);
    setConfirmAction(null);
    setAdminNote("");
  }

  async function processWithdrawal() {
    if (
      !selected ||
      !confirmAction ||
      processing
    ) {
      return;
    }

    const withdrawalId = selected.id;
    const action = confirmAction;
    const amount = Number(
      selected.amount || 0
    );

    try {
      setProcessing(true);
      setError("");
      setSuccess("");

      const response = await fetch(
        "/api/admin/withdrawals",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
            "Cache-Control":
              "no-cache",
          },
          cache: "no-store",
          body: JSON.stringify({
            withdrawalId,
            action,
            adminNote:
              action === "reject"
                ? adminNote
                : null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to process withdrawal."
        );
      }

      /*
       * The database function has already changed
       * the real status.
       *
       * We immediately update the local row so the
       * Admin UI cannot remain visually Pending.
       */
      const newStatus =
        action === "approve"
          ? "approved"
          : "rejected";

      let updatedRow:
        | Withdrawal
        | null = null;

      if (
        data.withdrawal &&
        typeof data.withdrawal ===
          "object"
      ) {
        updatedRow = {
          ...selected,
          ...data.withdrawal,
          status: normalizeStatus(
            data.withdrawal.status ??
              newStatus
          ),
        };
      } else {
        updatedRow = {
          ...selected,
          status: newStatus,
          admin_note:
            action === "reject"
              ? adminNote || null
              : selected.admin_note,
          reviewed_at:
            new Date().toISOString(),
        };
      }

      /*
       * CRITICAL FIX:
       * Replace the row immediately.
       */
      setWithdrawals((current) =>
        current.map((item) =>
          item.id === withdrawalId
            ? mergeWithdrawal(
                item,
                updatedRow!
              )
            : item
        )
      );

      /*
       * Recalculate summary from the updated
       * local list as well.
       */
      setWithdrawals((current) => {
        const next = current.map(
          (item) =>
            item.id === withdrawalId
              ? updatedRow!
              : item
        );

        setSummary(
          calculateSummary(next)
        );

        return next;
      });

      if (action === "approve") {
        setSuccess(
          `${formatMoney(
            amount
          )} withdrawal approved successfully.`
        );
      } else {
        setSuccess(
          `${formatMoney(
            amount
          )} withdrawal rejected successfully. The amount has been refunded to the user's earning balance.`
        );
      }

      setSelected(null);
      setConfirmAction(null);
      setAdminNote("");

      /*
       * Re-read database after a short delay.
       *
       * The local state has already been updated,
       * so even if the GET request is delayed the UI
       * does not jump back to Pending.
       */
      window.setTimeout(() => {
        loadWithdrawals();
      }, 300);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to process withdrawal."
      );
    } finally {
      setProcessing(false);
    }
  }

  return (
    <AdminShell
      title="Withdrawals"
      description="Review and manage user withdrawal requests."
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-black sm:text-3xl">
              Withdrawals
            </h1>

            <p className="mt-1 text-sm font-medium text-black/45">
              Review user withdrawal requests and update their status.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setSuccess("");
              loadWithdrawals();
            }}
            disabled={loading}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-black/10 bg-white px-5 text-sm font-extrabold text-black shadow-sm transition hover:border-black/20 hover:bg-black/[0.02] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Refreshing..."
              : "Refresh"}
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            {success}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Total Requests"
            value={summary.total.toLocaleString(
              "en-BD"
            )}
            description={formatMoney(
              summary.totalAmount
            )}
            icon="↕"
          />

          <SummaryCard
            title="Pending"
            value={summary.pending.toLocaleString(
              "en-BD"
            )}
            description={formatMoney(
              summary.pendingAmount
            )}
            icon="◷"
            accent="amber"
          />

          <SummaryCard
            title="Approved"
            value={summary.approved.toLocaleString(
              "en-BD"
            )}
            description={formatMoney(
              summary.approvedAmount
            )}
            icon="✓"
            accent="green"
          />

          <SummaryCard
            title="Rejected"
            value={summary.rejected.toLocaleString(
              "en-BD"
            )}
            description={formatMoney(
              summary.rejectedAmount
            )}
            icon="×"
            accent="red"
          />
        </div>

        {/* Filters */}
        <div className="rounded-2xl border border-black/[0.07] bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {[
                ["all", "All"],
                ["pending", "Pending"],
                ["approved", "Approved"],
                ["rejected", "Rejected"],
              ].map(
                ([value, label]) => {
                  const active =
                    statusFilter ===
                    value;

                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        setStatusFilter(
                          value
                        )
                      }
                      className={`rounded-xl px-4 py-2.5 text-sm font-extrabold transition ${
                        active
                          ? "bg-black text-white"
                          : "bg-black/[0.04] text-black/60 hover:bg-black/[0.08] hover:text-black"
                      }`}
                    >
                      {label}
                    </button>
                  );
                }
              )}
            </div>

            <div className="relative w-full lg:max-w-sm">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-black/35">
                ⌕
              </span>

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search user, phone, account..."
                className="h-11 w-full rounded-xl border border-black/10 bg-[#f8faf8] pl-10 pr-4 text-sm font-semibold text-black outline-none transition placeholder:text-black/30 focus:border-[#4f9d32] focus:bg-white focus:ring-4 focus:ring-[#7ed957]/15"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-black/[0.07] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[1050px] w-full">
              <thead>
                <tr className="border-b border-black/[0.06] bg-[#f8faf8] text-left">
                  <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-black/40">
                    User
                  </th>

                  <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-black/40">
                    Payment
                  </th>

                  <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-black/40">
                    Amount
                  </th>

                  <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-black/40">
                    Requested
                  </th>

                  <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-black/40">
                    Status
                  </th>

                  <th className="px-5 py-4 text-right text-xs font-black uppercase tracking-wider text-black/40">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <TableLoading />
                ) : visibleWithdrawals.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-16 text-center"
                    >
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-black/[0.04] text-2xl">
                        ↕
                      </div>

                      <p className="mt-4 text-base font-black text-black/70">
                        No withdrawal requests found
                      </p>

                      <p className="mt-1 text-sm font-medium text-black/40">
                        Try another filter or search term.
                      </p>
                    </td>
                  </tr>
                ) : (
                  visibleWithdrawals.map(
                    (withdrawal) => (
                      <WithdrawalRow
                        key={withdrawal.id}
                        withdrawal={
                          withdrawal
                        }
                        onView={() => {
                          setSelected(
                            withdrawal
                          );
                          setConfirmAction(
                            null
                          );
                          setAdminNote(
                            withdrawal.admin_note ??
                              ""
                          );
                        }}
                        onApprove={() =>
                          openAction(
                            withdrawal,
                            "approve"
                          )
                        }
                        onReject={() =>
                          openAction(
                            withdrawal,
                            "reject"
                          )
                        }
                      />
                    )
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Details / Action Modal */}
      {selected && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-black/[0.06] bg-white px-6 py-5">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-black/35">
                  Withdrawal Details
                </p>

                <h2 className="mt-1 text-xl font-black text-black">
                  {formatMoney(
                    Number(
                      selected.amount
                    )
                  )}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeAction}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-black/[0.05] text-xl font-bold text-black/60 transition hover:bg-black/10 hover:text-black"
              >
                ×
              </button>
            </div>

            <div className="space-y-5 p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InfoItem
                  label="Full Name"
                  value={
                    selected.user
                      ?.full_name ||
                    "Not provided"
                  }
                />

                <InfoItem
                  label="Username"
                  value={
                    selected.user
                      ?.username ||
                    "Not provided"
                  }
                />

                <InfoItem
                  label="Email"
                  value={
                    selected.user
                      ?.email ||
                    "Not available"
                  }
                />

                <InfoItem
                  label="Phone"
                  value={
                    selected.user
                      ?.phone ||
                    "Not provided"
                  }
                />

                <InfoItem
                  label="Payment Method"
                  value={methodLabel(
                    selected.payment_method
                  )}
                />

                <InfoItem
                  label="Account Number"
                  value={
                    selected.account_number
                  }
                />

                <InfoItem
                  label="Amount"
                  value={formatMoney(
                    Number(
                      selected.amount
                    )
                  )}
                />

                <InfoItem
                  label="Status"
                  value={statusLabel(
                    selected.status
                  )}
                />

                <InfoItem
                  label="Requested At"
                  value={formatDate(
                    selected.requested_at
                  )}
                />

                <InfoItem
                  label="Reviewed At"
                  value={formatDate(
                    selected.reviewed_at
                  )}
                />
              </div>

              <div className="rounded-2xl border border-black/[0.06] bg-[#f8faf8] p-4">
                <p className="text-xs font-black uppercase tracking-wider text-black/35">
                  Withdrawal ID
                </p>

                <p className="mt-2 break-all font-mono text-xs font-semibold text-black/65">
                  {selected.id}
                </p>
              </div>

              {selected.admin_note && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs font-black uppercase tracking-wider text-amber-700">
                    Admin Note
                  </p>

                  <p className="mt-2 text-sm font-semibold leading-6 text-amber-900">
                    {selected.admin_note}
                  </p>
                </div>
              )}

              {!confirmAction &&
                normalizeStatus(
                  selected.status
                ) === "pending" && (
                  <div className="flex flex-col gap-3 border-t border-black/[0.06] pt-5 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        openAction(
                          selected,
                          "reject"
                        )
                      }
                      className="h-12 rounded-xl border border-red-200 bg-red-50 px-5 text-sm font-black text-red-700 transition hover:bg-red-100"
                    >
                      Reject Withdrawal
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        openAction(
                          selected,
                          "approve"
                        )
                      }
                      className="h-12 rounded-xl bg-[#4f9d32] px-5 text-sm font-black text-white shadow-sm transition hover:bg-[#43872b]"
                    >
                      Approve Withdrawal
                    </button>
                  </div>
                )}

              {confirmAction && (
                <div
                  className={`rounded-2xl border p-5 ${
                    confirmAction ===
                    "approve"
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-red-200 bg-red-50"
                  }`}
                >
                  <p
                    className={`text-base font-black ${
                      confirmAction ===
                      "approve"
                        ? "text-emerald-800"
                        : "text-red-800"
                    }`}
                  >
                    {confirmAction ===
                    "approve"
                      ? "Approve this withdrawal?"
                      : "Reject this withdrawal?"}
                  </p>

                  <p
                    className={`mt-2 text-sm font-medium leading-6 ${
                      confirmAction ===
                      "approve"
                        ? "text-emerald-700"
                        : "text-red-700"
                    }`}
                  >
                    {confirmAction ===
                    "approve"
                      ? `৳${Number(
                          selected.amount
                        ).toLocaleString(
                          "en-BD"
                        )} has already been deducted from the user's earning balance when the withdrawal was requested. Approval will not deduct it again.`
                      : `If this withdrawal is rejected, ৳${Number(
                          selected.amount
                        ).toLocaleString(
                          "en-BD"
                        )} will be refunded to the user's earning balance.`}
                  </p>

                  {confirmAction ===
                    "reject" && (
                    <div className="mt-4">
                      <label className="mb-2 block text-xs font-black uppercase tracking-wider text-red-700">
                        Admin Note (Optional)
                      </label>

                      <textarea
                        value={
                          adminNote
                        }
                        onChange={(
                          event
                        ) =>
                          setAdminNote(
                            event
                              .target
                              .value
                          )
                        }
                        rows={3}
                        placeholder="Write the reason for rejection..."
                        className="w-full rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-medium text-black outline-none placeholder:text-black/30 focus:border-red-400 focus:ring-4 focus:ring-red-500/10"
                      />
                    </div>
                  )}

                  <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          !processing
                        ) {
                          setConfirmAction(
                            null
                          );
                        }
                      }}
                      disabled={
                        processing
                      }
                      className="h-11 rounded-xl border border-black/10 bg-white px-5 text-sm font-black text-black/65 transition hover:bg-black/[0.03] disabled:opacity-50"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={
                        processWithdrawal
                      }
                      disabled={
                        processing
                      }
                      className={`h-11 rounded-xl px-5 text-sm font-black text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        confirmAction ===
                        "approve"
                          ? "bg-[#4f9d32] hover:bg-[#43872b]"
                          : "bg-red-600 hover:bg-red-700"
                      }`}
                    >
                      {processing
                        ? "Processing..."
                        : confirmAction ===
                          "approve"
                        ? "Confirm Approval"
                        : "Confirm Rejection"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

function SummaryCard({
  title,
  value,
  description,
  icon,
  accent = "black",
}: {
  title: string;
  value: string;
  description: string;
  icon: string;
  accent?:
    | "black"
    | "amber"
    | "green"
    | "red";
}) {
  const accentClasses = {
    black: "bg-black text-white",
    amber:
      "bg-amber-100 text-amber-700",
    green:
      "bg-emerald-100 text-emerald-700",
    red: "bg-red-100 text-red-700",
  };

  return (
    <div className="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-black/45">
            {title}
          </p>

          <p className="mt-2 text-2xl font-black tracking-tight text-black">
            {value}
          </p>

          <p className="mt-1 text-xs font-bold text-black/35">
            {description}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-black ${accentClasses[accent]}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function WithdrawalRow({
  withdrawal,
  onView,
  onApprove,
  onReject,
}: {
  withdrawal: Withdrawal;
  onView: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const pending =
    normalizeStatus(
      withdrawal.status
    ) === "pending";

  return (
    <tr className="border-b border-black/[0.05] last:border-b-0 hover:bg-black/[0.012]">
      <td className="px-5 py-4">
        <button
          type="button"
          onClick={onView}
          className="text-left"
        >
          <p className="max-w-[220px] truncate text-sm font-black text-black hover:underline">
            {withdrawal.user
              ?.full_name ||
              withdrawal.user
                ?.username ||
              "Unknown User"}
          </p>

          <p className="mt-1 text-xs font-semibold text-black/40">
            {withdrawal.user
              ?.phone ||
              withdrawal.user
                ?.email ||
              "No contact"}
          </p>
        </button>
      </td>

      <td className="px-5 py-4">
        <p className="text-sm font-black text-black">
          {methodLabel(
            withdrawal.payment_method
          )}
        </p>

        <p className="mt-1 text-xs font-mono font-semibold text-black/40">
          {
            withdrawal.account_number
          }
        </p>
      </td>

      <td className="px-5 py-4">
        <p className="text-sm font-black text-black">
          {formatMoney(
            Number(
              withdrawal.amount
            )
          )}
        </p>
      </td>

      <td className="px-5 py-4">
        <p className="text-sm font-semibold text-black/65">
          {formatDate(
            withdrawal.requested_at
          )}
        </p>
      </td>

      <td className="px-5 py-4">
        <span
          className={`inline-flex rounded-full px-3 py-1.5 text-xs font-black ${statusClasses(
            withdrawal.status
          )}`}
        >
          {statusLabel(
            withdrawal.status
          )}
        </span>
      </td>

      <td className="px-5 py-4">
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onView}
            className="rounded-lg border border-black/10 bg-white px-3 py-2 text-xs font-black text-black/65 transition hover:bg-black/[0.04] hover:text-black"
          >
            View
          </button>

          {pending && (
            <>
              <button
                type="button"
                onClick={onReject}
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700 transition hover:bg-red-100"
              >
                Reject
              </button>

              <button
                type="button"
                onClick={onApprove}
                className="rounded-lg bg-[#4f9d32] px-3 py-2 text-xs font-black text-white transition hover:bg-[#43872b]"
              >
                Approve
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-black/[0.06] bg-[#f8faf8] p-4">
      <p className="text-xs font-black uppercase tracking-wider text-black/35">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-extrabold text-black/75">
        {value}
      </p>
    </div>
  );
}

function TableLoading() {
  return (
    <>
      {Array.from({
        length: 5,
      }).map((_, index) => (
        <tr
          key={index}
          className="border-b border-black/[0.05]"
        >
          {Array.from({
            length: 6,
          }).map(
            (_, cellIndex) => (
              <td
                key={cellIndex}
                className="px-5 py-5"
              >
                <div className="h-4 animate-pulse rounded-lg bg-black/[0.06]" />
              </td>
            )
          )}
        </tr>
      ))}
    </>
  );
}