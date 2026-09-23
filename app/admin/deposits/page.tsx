"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import AdminShell from "@/components/admin/AdminShell";

type DepositStatus =
  | "Pending"
  | "Verifying"
  | "Approved"
  | "Rejected";

type DepositUser = {
  id: string;
  username: string | null;
  full_name: string | null;
  phone: string | null;
  role: string | null;
  referral_code: string | null;
};

type Deposit = {
  id: number;
  user_id: string;
  amount: number;
  payment_method: string;
  payment_number: string | null;
  transaction_id: string;
  status: DepositStatus | string;
  bonus_amount: number;
  created_at: string;
  approved_at: string | null;
  updated_at: string;
  user: DepositUser | null;
};

type Summary = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  pendingAmount: number;
  approvedAmount: number;
  bonusAmount: number;
};

const emptySummary: Summary = {
  total: 0,
  pending: 0,
  approved: 0,
  rejected: 0,
  pendingAmount: 0,
  approvedAmount: 0,
  bonusAmount: 0,
};

function safeNumber(
  value: unknown,
) {
  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
}

function taka(value: unknown) {
  return `৳${safeNumber(
    value,
  ).toLocaleString("en-BD")}`;
}

function formatNumber(
  value: unknown,
) {
  return safeNumber(
    value,
  ).toLocaleString("en-BD");
}

function formatDate(
  value: string,
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "—";
  }

  return date.toLocaleString(
    "en-BD",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  );
}

function getUserName(
  user: DepositUser | null,
) {
  if (!user) {
    return "Unknown user";
  }

  return (
    user.full_name ||
    user.username ||
    "Unnamed user"
  );
}

function getStatusClass(
  status: string,
) {
  switch (
    String(status || "").toLowerCase()
  ) {
    case "approved":
      return "border-green-200 bg-green-50 text-green-700";

    case "rejected":
      return "border-red-200 bg-red-50 text-red-700";

    case "verifying":
      return "border-blue-200 bg-blue-50 text-blue-700";

    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
}

function getPaymentLabel(
  method: string,
) {
  const value =
    String(method || "").toLowerCase();

  if (value === "bkash") {
    return "bKash";
  }

  if (value === "nagad") {
    return "Nagad";
  }

  if (value === "rocket") {
    return "Rocket";
  }

  return method || "Unknown";
}

function normalizeSummary(
  rawSummary: any,
  deposits: Deposit[],
): Summary {
  const safeSummary =
    rawSummary &&
    typeof rawSummary === "object"
      ? rawSummary
      : {};

  /*
   * The current API returns:
   *
   * totalDeposits
   * totalAmount
   * totalBonus
   * pending
   * approved
   * rejected
   *
   * Older page versions used:
   *
   * total
   * pendingAmount
   * approvedAmount
   * bonusAmount
   *
   * Support both formats.
   */

  const total =
    safeNumber(
      safeSummary.total ??
        safeSummary.totalDeposits ??
        deposits.length,
    );

  const pending =
    safeNumber(
      safeSummary.pending,
    );

  const approved =
    safeNumber(
      safeSummary.approved,
    );

  const rejected =
    safeNumber(
      safeSummary.rejected,
    );

  const bonusAmount =
    safeNumber(
      safeSummary.bonusAmount ??
        safeSummary.totalBonus ??
        deposits.reduce(
          (sum, deposit) =>
            sum +
            safeNumber(
              deposit.bonus_amount,
            ),
          0,
        ),
    );

  /*
   * Calculate pending/approved amounts
   * from actual loaded records when the API
   * does not provide these fields.
   */
  const pendingAmount =
    safeNumber(
      safeSummary.pendingAmount ??
        deposits
          .filter(
            (deposit) =>
              String(
                deposit.status,
              ).toLowerCase() ===
              "pending",
          )
          .reduce(
            (sum, deposit) =>
              sum +
              safeNumber(
                deposit.amount,
              ),
            0,
          ),
    );

  const approvedAmount =
    safeNumber(
      safeSummary.approvedAmount ??
        deposits
          .filter(
            (deposit) =>
              String(
                deposit.status,
              ).toLowerCase() ===
              "approved",
          )
          .reduce(
            (sum, deposit) =>
              sum +
              safeNumber(
                deposit.amount,
              ),
            0,
          ),
    );

  return {
    total,
    pending,
    approved,
    rejected,
    pendingAmount,
    approvedAmount,
    bonusAmount,
  };
}

export default function AdminDepositsPage() {
  const [deposits, setDeposits] =
    useState<Deposit[]>([]);

  const [summary, setSummary] =
    useState<Summary>(
      emptySummary,
    );

  const [loading, setLoading] =
    useState(true);

  const [processingId, setProcessingId] =
    useState<number | null>(
      null,
    );

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [search, setSearch] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const [selectedDeposit, setSelectedDeposit] =
    useState<Deposit | null>(
      null,
    );

  const [confirmAction, setConfirmAction] =
    useState<{
      id: number;
      status:
        | "Approved"
        | "Rejected";
    } | null>(null);

  /*
   * =========================================================
   * LOAD
   * =========================================================
   */

  const loadDeposits =
    useCallback(
      async (
        showLoader = true,
      ) => {
        try {
          if (showLoader) {
            setLoading(true);
          }

          setError("");

          const params =
            new URLSearchParams();

          params.set(
            "status",
            statusFilter,
          );

          if (search.trim()) {
            params.set(
              "search",
              search.trim(),
            );
          }

          const response =
            await fetch(
              `/api/admin/deposits?${params.toString()}`,
              {
                method: "GET",
                cache: "no-store",
              },
            );

          const data =
            await response.json();

          if (!response.ok) {
            throw new Error(
              data?.error ||
                "Failed to load deposits.",
            );
          }

          const loadedDeposits =
            Array.isArray(
              data?.deposits,
            )
              ? data.deposits.map(
                  (
                    deposit: any,
                  ) => ({
                    ...deposit,

                    id: Number(
                      deposit?.id ||
                        0,
                    ),

                    amount:
                      safeNumber(
                        deposit?.amount,
                      ),

                    bonus_amount:
                      safeNumber(
                        deposit?.bonus_amount,
                      ),
                  }),
                )
              : [];

          setDeposits(
            loadedDeposits,
          );

          setSummary(
            normalizeSummary(
              data?.summary,
              loadedDeposits,
            ),
          );
        } catch (err) {
          console.error(err);

          setError(
            err instanceof Error
              ? err.message
              : "Failed to load deposits.",
          );
        } finally {
          setLoading(false);
        }
      },
      [
        search,
        statusFilter,
      ],
    );

  useEffect(() => {
    loadDeposits();
  }, [loadDeposits]);

  /*
   * =========================================================
   * FILTERED DATA
   * =========================================================
   */

  const visibleDeposits =
    useMemo(() => {
      return deposits;
    }, [deposits]);

  /*
   * =========================================================
   * ACTION
   * =========================================================
   */

  async function performAction(
    id: number,
    status:
      | "Approved"
      | "Rejected",
  ) {
    try {
      setProcessingId(id);
      setError("");
      setMessage("");

      const response =
        await fetch(
          "/api/admin/deposits",
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              id,
              status,
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to update deposit.",
        );
      }

      if (
        status === "Approved"
      ) {
        const bonus =
          safeNumber(
            data?.deposit
              ?.bonus_amount,
          );

        setMessage(
          bonus > 0
            ? `Deposit approved. ${taka(
                bonus,
              )} bonus was added to the user's earning balance.`
            : "Deposit approved and wallet/package updated successfully.",
        );
      } else {
        setMessage(
          "Deposit rejected successfully. No wallet credit was added.",
        );
      }

      setConfirmAction(
        null,
      );

      setSelectedDeposit(
        null,
      );

      await loadDeposits(
        false,
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to update deposit.",
      );
    } finally {
      setProcessingId(
        null,
      );
    }
  }

  function requestAction(
    id: number,
    status:
      | "Approved"
      | "Rejected",
  ) {
    setConfirmAction({
      id,
      status,
    });
  }

  /*
   * =========================================================
   * LOADING
   * =========================================================
   */

  if (loading) {
    return (
      <AdminShell
        title="Deposits"
        description="Review and manage user deposit requests."
      >
        <div className="flex min-h-[420px] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-black/10 border-t-[#4f9d32]" />

            <p className="mt-4 text-sm font-semibold text-black/50">
              Loading deposits...
            </p>
          </div>
        </div>
      </AdminShell>
    );
  }

  /*
   * =========================================================
   * PAGE
   * =========================================================
   */

  return (
    <AdminShell
      title="Deposits"
      description="Review, approve, and reject user deposit requests."
    >
      <div className="space-y-6">
        {/* =====================================================
            MESSAGE
        ===================================================== */}

        {message && (
          <div className="flex items-start justify-between gap-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
            <span>
              {message}
            </span>

            <button
              type="button"
              onClick={() =>
                setMessage("")
              }
              className="font-bold"
            >
              ×
            </button>
          </div>
        )}

        {error && (
          <div className="flex items-start justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            <span>
              {error}
            </span>

            <button
              type="button"
              onClick={() =>
                setError("")
              }
              className="font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* =====================================================
            SUMMARY
        ===================================================== */}

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <SummaryCard
            title="Total Deposits"
            value={formatNumber(
              summary.total,
            )}
            icon="▣"
          />

          <SummaryCard
            title="Pending"
            value={formatNumber(
              summary.pending,
            )}
            subtitle={taka(
              summary.pendingAmount,
            )}
            icon="◷"
          />

          <SummaryCard
            title="Approved"
            value={formatNumber(
              summary.approved,
            )}
            subtitle={taka(
              summary.approvedAmount,
            )}
            icon="✓"
          />

          <SummaryCard
            title="Rejected"
            value={formatNumber(
              summary.rejected,
            )}
            icon="×"
          />

          <SummaryCard
            title="Bonus Given"
            value={taka(
              summary.bonusAmount,
            )}
            icon="+"
          />
        </div>

        {/* =====================================================
            FILTERS
        ===================================================== */}

        <div className="rounded-3xl border border-black/5 bg-white p-4 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {[
                ["all", "All"],
                [
                  "Pending",
                  "Pending",
                ],
                [
                  "Verifying",
                  "Verifying",
                ],
                [
                  "Approved",
                  "Approved",
                ],
                [
                  "Rejected",
                  "Rejected",
                ],
              ].map(
                ([
                  value,
                  label,
                ]) => (
                  <button
                    key={
                      value
                    }
                    type="button"
                    onClick={() =>
                      setStatusFilter(
                        value,
                      )
                    }
                    className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                      statusFilter ===
                      value
                        ? "bg-black text-white"
                        : "bg-black/[0.04] text-black/60 hover:bg-black/[0.08]"
                    }`}
                  >
                    {
                      label
                    }
                  </button>
                ),
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={
                  search
                }
                onChange={(
                  event,
                ) =>
                  setSearch(
                    event.target
                      .value,
                  )
                }
                placeholder="Search user, phone, transaction..."
                className="h-11 w-full rounded-xl border border-black/10 bg-white px-4 text-sm font-medium outline-none transition placeholder:text-black/30 focus:border-[#4f9d32] sm:w-[320px]"
              />

              <button
                type="button"
                onClick={() =>
                  loadDeposits()
                }
                className="h-11 rounded-xl bg-[#4f9d32] px-5 text-sm font-bold text-white transition hover:bg-[#3f8128]"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* =====================================================
            TABLE
        ===================================================== */}

        <div className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
          <div className="border-b border-black/5 px-5 py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-black">
                  Deposit Requests
                </h2>

                <p className="mt-1 text-xs font-medium text-black/40">
                  {formatNumber(
                    visibleDeposits.length,
                  )}{" "}
                  records
                </p>
              </div>

              <div className="rounded-xl bg-black/[0.04] px-3 py-2 text-xs font-bold text-black/50">
                Latest first
              </div>
            </div>
          </div>

          {visibleDeposits.length ===
          0 ? (
            <div className="px-6 py-20 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-black/[0.04] text-2xl text-black/30">
                $
              </div>

              <h3 className="mt-4 text-lg font-black text-black">
                No deposits found
              </h3>

              <p className="mt-2 text-sm text-black/40">
                There are no deposit records matching the current filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] border-collapse">
                <thead>
                  <tr className="border-b border-black/5 bg-black/[0.02] text-left">
                    <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-black/40">
                      User
                    </th>

                    <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-black/40">
                      Payment
                    </th>

                    <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-black/40">
                      Transaction
                    </th>

                    <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-black/40">
                      Amount
                    </th>

                    <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-black/40">
                      Date
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
                  {visibleDeposits.map(
                    (
                      deposit,
                    ) => {
                      const user =
                        deposit.user;

                      const normalizedStatus =
                        String(
                          deposit.status ||
                            "",
                        ).toLowerCase();

                      const canAct =
                        normalizedStatus ===
                          "pending" ||
                        normalizedStatus ===
                          "verifying";

                      const processing =
                        processingId ===
                        deposit.id;

                      return (
                        <tr
                          key={
                            deposit.id
                          }
                          className="border-b border-black/5 last:border-0 hover:bg-black/[0.015]"
                        >
                          {/* USER */}

                          <td className="px-5 py-5">
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedDeposit(
                                  deposit,
                                )
                              }
                              className="text-left"
                            >
                              <div className="font-bold text-black hover:underline">
                                {getUserName(
                                  user,
                                )}
                              </div>

                              <div className="mt-1 text-xs text-black/40">
                                {user?.username
                                  ? `@${user.username}`
                                  : deposit.user_id
                                      ? deposit.user_id.slice(
                                          0,
                                          12,
                                        )
                                      : "Unknown ID"}
                              </div>

                              {user?.phone && (
                                <div className="mt-1 text-xs font-medium text-black/50">
                                  {
                                    user.phone
                                  }
                                </div>
                              )}
                            </button>
                          </td>

                          {/* PAYMENT */}

                          <td className="px-5 py-5">
                            <div className="font-bold text-black">
                              {getPaymentLabel(
                                deposit.payment_method,
                              )}
                            </div>

                            {deposit.payment_number && (
                              <div className="mt-1 text-xs text-black/45">
                                {
                                  deposit.payment_number
                                }
                              </div>
                            )}
                          </td>

                          {/* TRANSACTION */}

                          <td className="px-5 py-5">
                            <button
                              type="button"
                              onClick={() =>
                                navigator.clipboard?.writeText(
                                  deposit.transaction_id ||
                                    "",
                                )
                              }
                              className="max-w-[220px] truncate rounded-lg bg-black/[0.04] px-2.5 py-1.5 text-xs font-bold text-black/70 hover:bg-black/[0.08]"
                              title="Click to copy"
                            >
                              {
                                deposit.transaction_id
                              }
                            </button>
                          </td>

                          {/* AMOUNT */}

                          <td className="px-5 py-5">
                            <div className="font-black text-black">
                              {taka(
                                deposit.amount,
                              )}
                            </div>

                            {safeNumber(
                              deposit.bonus_amount,
                            ) > 0 && (
                              <div className="mt-1 text-xs font-bold text-green-600">
                                +{" "}
                                {taka(
                                  deposit.bonus_amount,
                                )}{" "}
                                bonus
                              </div>
                            )}
                          </td>

                          {/* DATE */}

                          <td className="px-5 py-5">
                            <div className="text-sm font-semibold text-black/70">
                              {formatDate(
                                deposit.created_at,
                              )}
                            </div>

                            {deposit.approved_at && (
                              <div className="mt-1 text-xs text-black/35">
                                Approved{" "}
                                {formatDate(
                                  deposit.approved_at,
                                )}
                              </div>
                            )}
                          </td>

                          {/* STATUS */}

                          <td className="px-5 py-5">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-black ${getStatusClass(
                                deposit.status,
                              )}`}
                            >
                              {
                                deposit.status
                              }
                            </span>
                          </td>

                          {/* ACTION */}

                          <td className="px-5 py-5">
                            {canAct ? (
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  disabled={
                                    processing
                                  }
                                  onClick={() =>
                                    requestAction(
                                      deposit.id,
                                      "Approved",
                                    )
                                  }
                                  className="rounded-xl bg-[#4f9d32] px-3.5 py-2 text-xs font-black text-white transition hover:bg-[#3f8128] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {processing
                                    ? "..."
                                    : "Approve"}
                                </button>

                                <button
                                  type="button"
                                  disabled={
                                    processing
                                  }
                                  onClick={() =>
                                    requestAction(
                                      deposit.id,
                                      "Rejected",
                                    )
                                  }
                                  className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-black text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <div className="text-right text-xs font-bold text-black/25">
                                Completed
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    },
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* =======================================================
          DEPOSIT DETAILS MODAL
      ======================================================= */}

      {selectedDeposit && (
        <Modal
          onClose={() =>
            setSelectedDeposit(
              null,
            )
          }
        >
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-black/35">
                    Deposit #
                    {
                      selectedDeposit.id
                    }
                  </p>

                  <h2 className="mt-1 text-2xl font-black text-black">
                    {taka(
                      selectedDeposit.amount,
                    )}
                  </h2>
                </div>

                <span
                  className={`rounded-full border px-3 py-1.5 text-xs font-black ${getStatusClass(
                    selectedDeposit.status,
                  )}`}
                >
                  {
                    selectedDeposit.status
                  }
                </span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <InfoItem
                label="User"
                value={getUserName(
                  selectedDeposit.user,
                )}
              />

              <InfoItem
                label="Username"
                value={
                  selectedDeposit.user
                    ?.username
                    ? `@${selectedDeposit.user.username}`
                    : "—"
                }
              />

              <InfoItem
                label="Phone"
                value={
                  selectedDeposit.user
                    ?.phone ||
                  "—"
                }
              />

              <InfoItem
                label="Referral Code"
                value={
                  selectedDeposit.user
                    ?.referral_code ||
                  "—"
                }
              />

              <InfoItem
                label="Payment Method"
                value={getPaymentLabel(
                  selectedDeposit.payment_method,
                )}
              />

              <InfoItem
                label="Payment Number"
                value={
                  selectedDeposit.payment_number ||
                  "—"
                }
              />

              <InfoItem
                label="Transaction ID"
                value={
                  selectedDeposit.transaction_id ||
                  "—"
                }
              />

              <InfoItem
                label="Deposit Date"
                value={formatDate(
                  selectedDeposit.created_at,
                )}
              />

              <InfoItem
                label="Bonus"
                value={taka(
                  selectedDeposit.bonus_amount,
                )}
              />

              <InfoItem
                label="Approved Date"
                value={
                  selectedDeposit.approved_at
                    ? formatDate(
                        selectedDeposit.approved_at,
                      )
                    : "Not approved"
                }
              />
            </div>

            {(
              String(
                selectedDeposit.status ||
                  "",
              ).toLowerCase() ===
                "pending" ||
              String(
                selectedDeposit.status ||
                  "",
              ).toLowerCase() ===
                "verifying"
            ) && (
              <div className="flex flex-col gap-3 border-t border-black/5 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={
                    processingId ===
                    selectedDeposit.id
                  }
                  onClick={() =>
                    requestAction(
                      selectedDeposit.id,
                      "Rejected",
                    )
                  }
                  className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-black text-red-600 hover:bg-red-100 disabled:opacity-50"
                >
                  Reject Deposit
                </button>

                <button
                  type="button"
                  disabled={
                    processingId ===
                    selectedDeposit.id
                  }
                  onClick={() =>
                    requestAction(
                      selectedDeposit.id,
                      "Approved",
                    )
                  }
                  className="rounded-xl bg-[#4f9d32] px-5 py-3 text-sm font-black text-white hover:bg-[#3f8128] disabled:opacity-50"
                >
                  Approve Deposit
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* =======================================================
          CONFIRMATION MODAL
      ======================================================= */}

      {confirmAction && (
        <Modal
          onClose={() =>
            processingId === null &&
            setConfirmAction(
              null,
            )
          }
        >
          <div className="text-center">
            <div
              className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-black ${
                confirmAction.status ===
                "Approved"
                  ? "bg-green-50 text-green-600"
                  : "bg-red-50 text-red-600"
              }`}
            >
              {confirmAction.status ===
              "Approved"
                ? "✓"
                : "×"}
            </div>

            <h2 className="mt-5 text-xl font-black text-black">
              {confirmAction.status ===
              "Approved"
                ? "Approve this deposit?"
                : "Reject this deposit?"}
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-black/50">
              {confirmAction.status ===
              "Approved"
                ? "Approval will credit the deposit to the user's wallet. If this is the user's first qualifying deposit, the applicable bonus will also be added and the package will be activated."
                : "Rejecting this deposit will not add any money to the user's wallet or earnings."}
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                disabled={
                  processingId !==
                  null
                }
                onClick={() =>
                  setConfirmAction(
                    null,
                  )
                }
                className="rounded-xl border border-black/10 bg-black/[0.03] px-5 py-3 text-sm font-black text-black/60 hover:bg-black/[0.06] disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={
                  processingId !==
                  null
                }
                onClick={() =>
                  performAction(
                    confirmAction.id,
                    confirmAction.status,
                  )
                }
                className={`rounded-xl px-5 py-3 text-sm font-black text-white disabled:opacity-50 ${
                  confirmAction.status ===
                  "Approved"
                    ? "bg-[#4f9d32] hover:bg-[#3f8128]"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {processingId !==
                null
                  ? "Processing..."
                  : confirmAction.status ===
                    "Approved"
                  ? "Yes, Approve"
                  : "Yes, Reject"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </AdminShell>
  );
}

/*
 * =========================================================
 * COMPONENTS
 * =========================================================
 */

function SummaryCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-black/40">
            {title}
          </p>

          <p className="mt-2 text-xl font-black text-black">
            {value || "0"}
          </p>

          {subtitle && (
            <p className="mt-1 text-xs font-bold text-black/35">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/[0.04] text-sm font-black text-black/50">
          {icon}
        </div>
      </div>
    </div>
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
    <div className="rounded-xl border border-black/5 bg-black/[0.02] p-3">
      <p className="text-[11px] font-black uppercase tracking-wider text-black/35">
        {label}
      </p>

      <p className="mt-1 break-all text-sm font-bold text-black/75">
        {value}
      </p>
    </div>
  );
}

function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />

      <div className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-7">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-xl bg-black/[0.04] text-lg font-bold text-black/50 hover:bg-black/[0.08]"
        >
          ×
        </button>

        {children}
      </div>
    </div>
  );
}