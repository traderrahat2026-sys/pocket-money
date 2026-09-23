"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import AdminShell from "@/components/admin/AdminShell";

type Referral = {
  id: string;
  referrer_id: string;
  referred_user_id: string;
  referral_code: string;
  status: string;
  qualified_at: string | null;
  created_at: string;

  referrer: {
    id: string;
    username: string | null;
    full_name: string | null;
    phone: string | null;
    referral_code: string | null;
  } | null;

  referred: {
    id: string;
    username: string | null;
    full_name: string | null;
    phone: string | null;
    referral_code: string | null;
    created_at: string | null;
  } | null;
};

type Summary = {
  total: number;
  pending: number;
  qualified: number;
  completed: number;
  rejected: number;
  uniqueReferrers: number;
};

function formatDate(
  value: string | null | undefined,
) {
  if (!value) return "—";

  return new Intl.DateTimeFormat(
    "en-BD",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(new Date(value));
}

function statusClass(status: string) {
  const value =
    status.toLowerCase();

  if (
    value === "qualified" ||
    value === "completed" ||
    value === "approved"
  ) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (
    value === "rejected" ||
    value === "cancelled"
  ) {
    return "bg-red-50 text-red-700 ring-red-200";
  }

  return "bg-amber-50 text-amber-700 ring-amber-200";
}

export default function AdminReferralsPage() {
  const [referrals, setReferrals] =
    useState<Referral[]>([]);

  const [summary, setSummary] =
    useState<Summary>({
      total: 0,
      pending: 0,
      qualified: 0,
      completed: 0,
      rejected: 0,
      uniqueReferrers: 0,
    });

  const [status, setStatus] =
    useState("all");

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [selected, setSelected] =
    useState<Referral | null>(null);

  const [message, setMessage] =
    useState<{
      type: "success" | "error";
      text: string;
    } | null>(null);

  const loadReferrals =
    useCallback(async () => {
      try {
        setLoading(true);
        setMessage(null);

        const params =
          new URLSearchParams();

        params.set(
          "status",
          status,
        );

        if (search.trim()) {
          params.set(
            "search",
            search.trim(),
          );
        }

        const response =
          await fetch(
            `/api/admin/referrals?${params.toString()}`,
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
              "Failed to load referrals.",
          );
        }

        setReferrals(
          data.referrals || [],
        );

        setSummary(
          data.summary || {
            total: 0,
            pending: 0,
            qualified: 0,
            completed: 0,
            rejected: 0,
            uniqueReferrers: 0,
          },
        );
      } catch (error) {
        console.error(error);

        setMessage({
          type: "error",
          text:
            error instanceof Error
              ? error.message
              : "Failed to load referrals.",
        });
      } finally {
        setLoading(false);
      }
    }, [status, search]);

  useEffect(() => {
    loadReferrals();
  }, [loadReferrals]);

  const visibleReferrals =
    useMemo(
      () => referrals,
      [referrals],
    );

  return (
    <AdminShell
      title="Referrals"
      description="Monitor referral relationships and qualification status"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#4f9d32]">
              Growth Management
            </p>

            <h1 className="mt-1 text-2xl font-black tracking-tight text-black sm:text-3xl">
              Referrals
            </h1>

            <p className="mt-1 text-sm text-black/50">
              Track who referred whom and
              monitor referral status.
            </p>
          </div>

          <button
            type="button"
            onClick={loadReferrals}
            disabled={loading}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-black/10 bg-white px-5 text-sm font-black text-black shadow-sm transition hover:border-black/20 hover:bg-black/[0.02] disabled:cursor-not-allowed disabled:opacity-50"
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
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <SummaryCard
            label="Total Referrals"
            value={summary.total}
          />

          <SummaryCard
            label="Pending"
            value={summary.pending}
            highlight
          />

          <SummaryCard
            label="Qualified"
            value={summary.qualified}
          />

          <SummaryCard
            label="Completed"
            value={summary.completed}
          />

          <SummaryCard
            label="Rejected"
            value={summary.rejected}
          />

          <SummaryCard
            label="Unique Referrers"
            value={
              summary.uniqueReferrers
            }
          />
        </div>

        {/* Filters */}
        <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-[1fr_200px_auto]">
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
                placeholder="Name, username, phone, referral code..."
                className="h-11 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 text-sm font-semibold outline-none transition placeholder:text-black/30 focus:border-[#4f9d32] focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-black uppercase tracking-wide text-black/45">
                Status
              </label>

              <select
                value={status}
                onChange={(event) =>
                  setStatus(
                    event.target.value,
                  )
                }
                className="h-11 w-full rounded-xl border border-black/10 bg-[#fafafa] px-3 text-sm font-bold outline-none focus:border-[#4f9d32]"
              >
                <option value="all">
                  All Statuses
                </option>

                <option value="pending">
                  Pending
                </option>

                <option value="qualified">
                  Qualified
                </option>

                <option value="completed">
                  Completed
                </option>

                <option value="rejected">
                  Rejected
                </option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setStatus("all");
                }}
                className="h-11 w-full rounded-xl border border-black/10 bg-black px-5 text-sm font-black text-white transition hover:bg-black/85 md:w-auto"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[1050px] w-full">
              <thead>
                <tr className="border-b border-black/10 bg-[#fafafa]">
                  <th className="px-5 py-4 text-left text-[11px] font-black uppercase tracking-wider text-black/45">
                    Referrer
                  </th>

                  <th className="px-5 py-4 text-left text-[11px] font-black uppercase tracking-wider text-black/45">
                    Referred User
                  </th>

                  <th className="px-5 py-4 text-left text-[11px] font-black uppercase tracking-wider text-black/45">
                    Referral Code
                  </th>

                  <th className="px-5 py-4 text-left text-[11px] font-black uppercase tracking-wider text-black/45">
                    Status
                  </th>

                  <th className="px-5 py-4 text-left text-[11px] font-black uppercase tracking-wider text-black/45">
                    Qualified
                  </th>

                  <th className="px-5 py-4 text-left text-[11px] font-black uppercase tracking-wider text-black/45">
                    Created
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
                      colSpan={7}
                      className="px-5 py-16 text-center"
                    >
                      <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-black/10 border-t-[#4f9d32]" />

                      <p className="mt-3 text-sm font-bold text-black/40">
                        Loading referrals...
                      </p>
                    </td>
                  </tr>
                ) : visibleReferrals.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-16 text-center"
                    >
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-black/[0.04] text-2xl">
                        👥
                      </div>

                      <p className="mt-4 text-base font-black text-black">
                        No referrals found
                      </p>

                      <p className="mt-1 text-sm text-black/40">
                        No referral records match
                        the selected filters.
                      </p>
                    </td>
                  </tr>
                ) : (
                  visibleReferrals.map(
                    (referral) => (
                      <ReferralRow
                        key={
                          referral.id
                        }
                        referral={
                          referral
                        }
                        onView={() =>
                          setSelected(
                            referral,
                          )
                        }
                      />
                    ),
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {selected && (
        <ReferralDetails
          referral={selected}
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
  highlight = false,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm ${
        highlight
          ? "border-amber-200 bg-amber-50"
          : "border-black/10 bg-white"
      }`}
    >
      <p className="text-[11px] font-black uppercase tracking-wider text-black/40">
        {label}
      </p>

      <p className="mt-2 text-xl font-black text-black">
        {value}
      </p>
    </div>
  );
}

function ReferralRow({
  referral,
  onView,
}: {
  referral: Referral;
  onView: () => void;
}) {
  const referrerName =
    referral.referrer
      ?.full_name ||
    referral.referrer
      ?.username ||
    "Unknown User";

  const referredName =
    referral.referred
      ?.full_name ||
    referral.referred
      ?.username ||
    "Unknown User";

  return (
    <tr className="border-b border-black/[0.06] last:border-b-0 hover:bg-black/[0.015]">
      {/* Referrer */}
      <td className="px-5 py-4">
        <button
          type="button"
          onClick={onView}
          className="text-left"
        >
          <p className="max-w-[190px] truncate text-sm font-black text-black hover:text-[#4f9d32]">
            {referrerName}
          </p>

          <p className="mt-1 text-xs font-semibold text-black/40">
            {referral.referrer
              ?.username
              ? `@${referral.referrer.username}`
              : referral.referrer
                  ?.phone ||
                "No phone"}
          </p>
        </button>
      </td>

      {/* Referred */}
      <td className="px-5 py-4">
        <div>
          <p className="max-w-[190px] truncate text-sm font-black">
            {referredName}
          </p>

          <p className="mt-1 text-xs font-semibold text-black/40">
            {referral.referred
              ?.username
              ? `@${referral.referred.username}`
              : referral.referred
                  ?.phone ||
                "No phone"}
          </p>
        </div>
      </td>

      {/* Code */}
      <td className="px-5 py-4">
        <span className="inline-flex rounded-lg border border-black/10 bg-black/[0.03] px-3 py-1.5 text-xs font-black tracking-wide">
          {referral.referral_code ||
            "—"}
        </span>
      </td>

      {/* Status */}
      <td className="px-5 py-4">
        <span
          className={`inline-flex rounded-full px-3 py-1 text-[11px] font-black capitalize ring-1 ${statusClass(
            referral.status,
          )}`}
        >
          {referral.status}
        </span>
      </td>

      {/* Qualified */}
      <td className="px-5 py-4">
        <p className="text-xs font-bold text-black/60">
          {formatDate(
            referral.qualified_at,
          )}
        </p>
      </td>

      {/* Created */}
      <td className="px-5 py-4">
        <p className="text-xs font-bold text-black/60">
          {formatDate(
            referral.created_at,
          )}
        </p>
      </td>

      {/* Action */}
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

function ReferralDetails({
  referral,
  onClose,
}: {
  referral: Referral;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-black/10 bg-white px-5 py-4">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-[#4f9d32]">
              Referral Details
            </p>

            <h2 className="mt-1 text-xl font-black">
              Referral Relationship
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
          {/* Referrer */}
          <section className="rounded-2xl border border-black/10 bg-[#fafafa] p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-black">
                Referrer
              </h3>

              <span className="rounded-full bg-[#eef9e9] px-3 py-1 text-[10px] font-black uppercase text-[#4f9d32]">
                Inviter
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Info
                label="Full Name"
                value={
                  referral.referrer
                    ?.full_name ||
                  "—"
                }
              />

              <Info
                label="Username"
                value={
                  referral.referrer
                    ?.username
                    ? `@${referral.referrer.username}`
                    : "—"
                }
              />

              <Info
                label="Phone"
                value={
                  referral.referrer
                    ?.phone ||
                  "—"
                }
              />

              <Info
                label="Referral Code"
                value={
                  referral.referrer
                    ?.referral_code ||
                  referral.referral_code ||
                  "—"
                }
              />
            </div>
          </section>

          {/* Referred */}
          <section className="rounded-2xl border border-black/10 bg-[#fafafa] p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-black">
                Referred User
              </h3>

              <span className="rounded-full bg-black/[0.05] px-3 py-1 text-[10px] font-black uppercase text-black/50">
                New User
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Info
                label="Full Name"
                value={
                  referral.referred
                    ?.full_name ||
                  "—"
                }
              />

              <Info
                label="Username"
                value={
                  referral.referred
                    ?.username
                    ? `@${referral.referred.username}`
                    : "—"
                }
              />

              <Info
                label="Phone"
                value={
                  referral.referred
                    ?.phone ||
                  "—"
                }
              />

              <Info
                label="Registered"
                value={formatDate(
                  referral.referred
                    ?.created_at,
                )}
              />
            </div>
          </section>

          {/* Referral info */}
          <section className="rounded-2xl border border-black/10 bg-[#fafafa] p-4">
            <h3 className="mb-4 text-sm font-black">
              Referral Information
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <Info
                label="Referral Code"
                value={
                  referral.referral_code ||
                  "—"
                }
              />

              <Info
                label="Status"
                value={
                  referral.status ||
                  "—"
                }
              />

              <Info
                label="Qualified Date"
                value={formatDate(
                  referral.qualified_at,
                )}
              />

              <Info
                label="Created Date"
                value={formatDate(
                  referral.created_at,
                )}
              />
            </div>
          </section>

          {/* Relationship */}
          <div className="rounded-2xl border border-[#d9edd2] bg-[#eef9e9] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#4f9d32] text-lg text-white">
                ↗
              </div>

              <div>
                <p className="text-sm font-black text-[#315c20]">
                  Referral Relationship
                </p>

                <p className="mt-1 text-xs font-semibold text-[#4f6f42]">
                  {referral.referrer
                    ?.full_name ||
                    referral.referrer
                      ?.username ||
                    "Unknown"}{" "}
                  referred{" "}
                  {referral.referred
                    ?.full_name ||
                    referral.referred
                      ?.username ||
                    "Unknown"}
                </p>
              </div>
            </div>
          </div>
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

      <p className="mt-1 break-words text-sm font-bold text-black">
        {value}
      </p>
    </div>
  );
}