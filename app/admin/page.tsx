"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Profile = {
  id: string;
  full_name: string | null;
  username: string | null;
  phone: string | null;
  role: string | null;
  created_at: string;
  referral_code?: string | null;
  active_package_count?: number;
};

type Deposit = {
  id: string;
  user_id: string;
  amount: number;
  payment_method: string;
  payment_number: string | null;
  transaction_id: string;
  status: string;
  bonus_amount: number;
  created_at: string;
  approved_at?: string | null;
  user?: Profile | null;
};

type Withdrawal = {
  id: string;
  user_id: string;
  payment_method: string;
  account_number: string;
  amount: number;
  status: string;
  admin_note: string | null;
  requested_at: string;
  reviewed_at: string | null;
  created_at: string;
  user?: Profile | null;
};

type Submission = {
  id: string;
  kind: "task" | "package_task";
  user_id: string;
  task_id: string;
  screenshot_url: string | null;
  status: string;
  admin_note?: string | null;
  reward_amount: number;
  created_at: string;
  reviewed_at?: string | null;
  task_title?: string | null;
  package_amount?: number | null;
  user?: Profile | null;
};

type Referral = {
  id: string;
  referrer_id: string;
  referred_user_id: string;
  referral_code: string;
  status: string;
  qualified_at: string | null;
  created_at: string;
  user?: Profile | null;
  referredUser?: Profile | null;
};

type PackageStat = {
  packageAmount: number;
  activeUsers: number;
  totalActivations: number;
};

type DashboardData = {
  success: boolean;
  generated_at: string;

  users: {
    total: number;
    admins: number;
    activePackageUsers: number;
    totalProfiles: number;
    recent: Profile[];
  };

  packages: {
    activeActivations: number;
    totalActivations: number;
    stats: PackageStat[];
  };

  deposits: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    totalAmount: number;
    pendingAmount: number;
    approvedAmount: number;
    rejectedAmount: number;
    bonusAmount: number;
  };

  withdrawals: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    totalAmount: number;
    pendingAmount: number;
    approvedAmount: number;
    rejectedAmount: number;
  };

  tasks: {
    normalTotal: number;
    normalActive: number;
    packageTotal: number;
    packageActive: number;
    pendingSubmissions: number;
    approvedSubmissions: number;
    rewardPaid: number;
  };

  referrals: {
    total: number;
    pending: number;
    qualified: number;
    completed: number;
    rejected: number;
    uniqueReferrers: number;
  };

  wallet: {
    totalBalance: number;
    depositBalance: number;
    earningBalance: number;
    totalEarned: number;
    totalWithdrawn: number;
    totalDeposited: number;
  };

  recentActivity: unknown[];
  recentDeposits: Deposit[];
  recentWithdrawals: Withdrawal[];
  recentSubmissions: Submission[];
  recentReferrals: Referral[];
  packageStats: PackageStat[];
};

const emptyDashboard: DashboardData = {
  success: true,
  generated_at: new Date().toISOString(),

  users: {
    total: 0,
    admins: 0,
    activePackageUsers: 0,
    totalProfiles: 0,
    recent: [],
  },

  packages: {
    activeActivations: 0,
    totalActivations: 0,
    stats: [],
  },

  deposits: {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    totalAmount: 0,
    pendingAmount: 0,
    approvedAmount: 0,
    rejectedAmount: 0,
    bonusAmount: 0,
  },

  withdrawals: {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    totalAmount: 0,
    pendingAmount: 0,
    approvedAmount: 0,
    rejectedAmount: 0,
  },

  tasks: {
    normalTotal: 0,
    normalActive: 0,
    packageTotal: 0,
    packageActive: 0,
    pendingSubmissions: 0,
    approvedSubmissions: 0,
    rewardPaid: 0,
  },

  referrals: {
    total: 0,
    pending: 0,
    qualified: 0,
    completed: 0,
    rejected: 0,
    uniqueReferrers: 0,
  },

  wallet: {
    totalBalance: 0,
    depositBalance: 0,
    earningBalance: 0,
    totalEarned: 0,
    totalWithdrawn: 0,
    totalDeposited: 0,
  },

  recentActivity: [],
  recentDeposits: [],
  recentWithdrawals: [],
  recentSubmissions: [],
  recentReferrals: [],
  packageStats: [],
};

function formatMoney(
  value: number | string | null | undefined,
) {
  const amount = Number(value ?? 0);

  return `৳${amount.toLocaleString("en-BD", {
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(
  value: string | null | undefined,
) {
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

function shortId(value: string | number) {
  const text = String(value);

  if (text.length <= 12) return text;

  return `${text.slice(0, 6)}...${text.slice(-4)}`;
}

function getStatusClass(status: string) {
  const normalized = String(
    status || "",
  ).toLowerCase();

  if (
    normalized === "approved" ||
    normalized === "completed" ||
    normalized === "qualified" ||
    normalized === "active"
  ) {
    return "status success";
  }

  if (
    normalized === "rejected" ||
    normalized === "failed" ||
    normalized === "cancelled"
  ) {
    return "status danger";
  }

  return "status pending";
}

function getUserName(
  userId: string,
  profiles: Map<string, Profile>,
) {
  const profile = profiles.get(userId);

  if (!profile) {
    return shortId(userId);
  }

  return (
    profile.full_name ||
    profile.username ||
    profile.phone ||
    shortId(userId)
  );
}

export default function AdminPage() {
  const router = useRouter();

  const [dashboard, setDashboard] =
    useState<DashboardData>(
      emptyDashboard,
    );

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const loadDashboard = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const response = await fetch(
          "/api/admin/dashboard",
          {
            method: "GET",
            cache: "no-store",
            credentials: "include",
          },
        );

        const data = await response.json();

        if (
          response.status === 401
        ) {
          router.replace(
            "/admin/login",
          );
          return;
        }

        if (!response.ok) {
          throw new Error(
            data?.error ||
              "Unable to load dashboard data.",
          );
        }

        if (!data?.success) {
          throw new Error(
            data?.error ||
              "Dashboard API returned an error.",
          );
        }

        setDashboard(data);
      } catch (err) {
        console.error(
          "ADMIN DASHBOARD ERROR:",
          err,
        );

        setError(
          err instanceof Error
            ? err.message
            : "Dashboard data load failed.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [router],
  );

  useEffect(() => {
    loadDashboard();

    const interval =
      window.setInterval(() => {
        loadDashboard(true);
      }, 30000);

    return () => {
      window.clearInterval(interval);
    };
  }, [loadDashboard]);

  const profileMap = useMemo(() => {
    const map =
      new Map<string, Profile>();

    for (const profile of [
      ...dashboard.users.recent,
    ]) {
      map.set(profile.id, profile);
    }

    for (const item of dashboard.recentDeposits) {
      if (item.user) {
        map.set(item.user.id, item.user);
      }
    }

    for (const item of dashboard.recentWithdrawals) {
      if (item.user) {
        map.set(item.user.id, item.user);
      }
    }

    for (const item of dashboard.recentSubmissions) {
      if (item.user) {
        map.set(item.user.id, item.user);
      }
    }

    for (const item of dashboard.recentReferrals) {
      if (item.user) {
        map.set(item.user.id, item.user);
      }

      if (item.referredUser) {
        map.set(
          item.referredUser.id,
          item.referredUser,
        );
      }
    }

    return map;
  }, [
    dashboard.users.recent,
    dashboard.recentDeposits,
    dashboard.recentWithdrawals,
    dashboard.recentSubmissions,
    dashboard.recentReferrals,
  ]);

  return (
    <main className="min-h-screen bg-[#f6f7f9] text-[#111827]">
      {/* ================= HEADER ================= */}

      <div className="border-b border-[#e5e7eb] bg-white">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-5 py-4 lg:px-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-black text-lg font-black text-white">
                PM
              </div>

              <div>
                <h1 className="text-xl font-black tracking-tight">
                  Pocket Money Home
                </h1>

                <p className="text-xs font-medium text-gray-500">
                  Admin Control Center
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                loadDashboard(true)
              }
              disabled={refreshing}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {refreshing
                ? "Refreshing..."
                : "Refresh"}
            </button>

            <Link
              href="/admin/settings"
              className="rounded-xl bg-black px-4 py-2.5 text-sm font-bold text-white transition hover:bg-gray-800"
            >
              Settings
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1500px] px-5 py-6 lg:px-8">
        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-bold text-red-700">
                  Dashboard Error
                </p>

                <p className="mt-1 text-sm text-red-600">
                  {error}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  loadDashboard(true)
                }
                className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        <div className="mb-7">
          <p className="mb-1 text-sm font-bold uppercase tracking-[0.18em] text-gray-400">
            Overview
          </p>

          <h2 className="text-3xl font-black tracking-tight">
            Dashboard
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Complete Pocket Money Home platform
            overview.
          </p>
        </div>

        {loading ? (
          <DashboardSkeleton />
        ) : (
          <>
            {/* ================= MAIN STATS ================= */}

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
              <StatCard
                title="Total Users"
                value={dashboard.users.total.toLocaleString(
                  "en-BD",
                )}
                icon="👥"
                description={`${dashboard.users.activePackageUsers} active package users`}
              />

              <StatCard
                title="Active Packages"
                value={dashboard.packages.activeActivations.toLocaleString(
                  "en-BD",
                )}
                icon="📦"
                description="Active package activations"
              />

              <StatCard
                title="Active Tasks"
                value={(
                  dashboard.tasks.normalActive +
                  dashboard.tasks.packageActive
                ).toLocaleString("en-BD")}
                icon="✓"
                description={`${dashboard.tasks.normalActive} normal · ${dashboard.tasks.packageActive} package`}
              />

              <StatCard
                title="Pending Deposits"
                value={dashboard.deposits.pending.toLocaleString(
                  "en-BD",
                )}
                icon="💳"
                description={formatMoney(
                  dashboard.deposits
                    .pendingAmount,
                )}
                alert={
                  dashboard.deposits.pending >
                  0
                }
              />

              <StatCard
                title="Pending Withdrawals"
                value={dashboard.withdrawals.pending.toLocaleString(
                  "en-BD",
                )}
                icon="💸"
                description={formatMoney(
                  dashboard.withdrawals
                    .pendingAmount,
                )}
                alert={
                  dashboard.withdrawals
                    .pending > 0
                }
              />

              <StatCard
                title="Pending Submissions"
                value={dashboard.tasks.pendingSubmissions.toLocaleString(
                  "en-BD",
                )}
                icon="📝"
                description="Waiting for review"
                alert={
                  dashboard.tasks
                    .pendingSubmissions > 0
                }
              />
            </section>

            {/* ================= FINANCIAL ================= */}

            <section className="mt-6">
              <SectionHeading
                eyebrow="Financial"
                title="Financial Overview"
              />

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <FinanceCard
                  title="Total Deposited"
                  value={formatMoney(
                    dashboard.deposits
                      .approvedAmount,
                  )}
                  description={`${dashboard.deposits.approved} approved deposits`}
                  icon="↓"
                />

                <FinanceCard
                  title="Total Withdrawn"
                  value={formatMoney(
                    dashboard.withdrawals
                      .approvedAmount,
                  )}
                  description={`${dashboard.withdrawals.approved} approved withdrawals`}
                  icon="↑"
                />

                <FinanceCard
                  title="Total Earned"
                  value={formatMoney(
                    dashboard.wallet
                      .totalEarned,
                  )}
                  description="Wallet total earned"
                  icon="৳"
                />

                <FinanceCard
                  title="Current Wallet"
                  value={formatMoney(
                    dashboard.wallet
                      .totalBalance,
                  )}
                  description={`Earning ${formatMoney(
                    dashboard.wallet
                      .earningBalance,
                  )}`}
                  icon="◈"
                />
              </div>
            </section>

            {/* ================= QUICK ACTIONS ================= */}

            <section className="mt-6">
              <SectionHeading
                eyebrow="Needs Attention"
                title="Quick Actions"
              />

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <QuickAction
                  href="/admin/deposits"
                  title="Deposit Verification"
                  value={
                    dashboard.deposits.pending
                  }
                  description={
                    dashboard.deposits.pending >
                    0
                      ? `${formatMoney(
                          dashboard.deposits
                            .pendingAmount,
                        )} waiting for approval`
                      : "No pending deposits"
                  }
                  icon="💰"
                  alert={
                    dashboard.deposits.pending >
                    0
                  }
                />

                <QuickAction
                  href="/admin/withdrawals"
                  title="Withdrawal Review"
                  value={
                    dashboard.withdrawals.pending
                  }
                  description={
                    dashboard.withdrawals
                      .pending > 0
                      ? `${formatMoney(
                          dashboard.withdrawals
                            .pendingAmount,
                        )} waiting for review`
                      : "No pending withdrawals"
                  }
                  icon="💸"
                  alert={
                    dashboard.withdrawals
                      .pending > 0
                  }
                />

                <QuickAction
                  href="/admin/task-submissions"
                  title="Task Submissions"
                  value={
                    dashboard.tasks
                      .pendingSubmissions
                  }
                  description={
                    dashboard.tasks
                      .pendingSubmissions > 0
                      ? "Submissions need review"
                      : "No pending submissions"
                  }
                  icon="📋"
                  alert={
                    dashboard.tasks
                      .pendingSubmissions > 0
                  }
                />

                <QuickAction
                  href="/admin/referrals"
                  title="Referral Activity"
                  value={
                    dashboard.referrals.pending
                  }
                  description={`${dashboard.referrals.qualified} qualified · ${dashboard.referrals.completed} completed`}
                  icon="🔗"
                  alert={false}
                />
              </div>
            </section>

            {/* ================= DEPOSIT / WITHDRAWAL ================= */}

            <section className="mt-6 grid gap-6 xl:grid-cols-2">
              <DashboardPanel
                title="Deposit Overview"
                subtitle="Complete deposit status summary"
                actionHref="/admin/deposits"
                actionText="Manage"
              >
                <div className="grid grid-cols-2 gap-px bg-gray-100">
                  <MetricBox
                    label="Total Requests"
                    value={
                      dashboard.deposits
                        .total
                    }
                  />

                  <MetricBox
                    label="Pending"
                    value={
                      dashboard.deposits
                        .pending
                    }
                    valueText={formatMoney(
                      dashboard.deposits
                        .pendingAmount,
                    )}
                  />

                  <MetricBox
                    label="Approved"
                    value={
                      dashboard.deposits
                        .approved
                    }
                    valueText={formatMoney(
                      dashboard.deposits
                        .approvedAmount,
                    )}
                  />

                  <MetricBox
                    label="Rejected"
                    value={
                      dashboard.deposits
                        .rejected
                    }
                  />

                  <MetricBox
                    label="Total Deposit Amount"
                    value={formatMoney(
                      dashboard.deposits
                        .totalAmount,
                    )}
                  />

                  <MetricBox
                    label="Bonus Given"
                    value={formatMoney(
                      dashboard.deposits
                        .bonusAmount,
                    )}
                  />
                </div>
              </DashboardPanel>

              <DashboardPanel
                title="Withdrawal Overview"
                subtitle="Complete withdrawal status summary"
                actionHref="/admin/withdrawals"
                actionText="Manage"
              >
                <div className="grid grid-cols-2 gap-px bg-gray-100">
                  <MetricBox
                    label="Total Requests"
                    value={
                      dashboard.withdrawals
                        .total
                    }
                  />

                  <MetricBox
                    label="Pending"
                    value={
                      dashboard.withdrawals
                        .pending
                    }
                    valueText={formatMoney(
                      dashboard.withdrawals
                        .pendingAmount,
                    )}
                  />

                  <MetricBox
                    label="Approved"
                    value={
                      dashboard.withdrawals
                        .approved
                    }
                    valueText={formatMoney(
                      dashboard.withdrawals
                        .approvedAmount,
                    )}
                  />

                  <MetricBox
                    label="Rejected"
                    value={
                      dashboard.withdrawals
                        .rejected
                    }
                  />

                  <MetricBox
                    label="Total Requested"
                    value={formatMoney(
                      dashboard.withdrawals
                        .totalAmount,
                    )}
                  />

                  <MetricBox
                    label="Total Withdrawn"
                    value={formatMoney(
                      dashboard.wallet
                        .totalWithdrawn,
                    )}
                  />
                </div>
              </DashboardPanel>
            </section>

            {/* ================= RECENT DEPOSITS ================= */}

            <section className="mt-6">
              <DashboardPanel
                title="Recent Deposits"
                subtitle="Latest deposit requests"
                actionHref="/admin/deposits"
                actionText="View All"
              >
                {dashboard.recentDeposits
                  .length === 0 ? (
                  <EmptyState text="No deposits found." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px]">
                      <thead>
                        <tr className="border-b border-gray-100 text-left">
                          <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-400">
                            User
                          </th>

                          <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-400">
                            Amount
                          </th>

                          <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-400">
                            Method
                          </th>

                          <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-400">
                            Transaction
                          </th>

                          <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-400">
                            Status
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {dashboard.recentDeposits.map(
                          (deposit) => (
                            <tr
                              key={deposit.id}
                              className="border-b border-gray-50 last:border-0"
                            >
                              <td className="px-4 py-4">
                                <p className="max-w-[180px] truncate text-sm font-bold">
                                  {getUserName(
                                    deposit.user_id,
                                    profileMap,
                                  )}
                                </p>

                                <p className="mt-0.5 text-xs text-gray-400">
                                  {formatDate(
                                    deposit.created_at,
                                  )}
                                </p>
                              </td>

                              <td className="px-4 py-4">
                                <p className="text-sm font-black">
                                  {formatMoney(
                                    deposit.amount,
                                  )}
                                </p>

                                {Number(
                                  deposit.bonus_amount,
                                ) > 0 && (
                                  <p className="text-xs font-semibold text-green-600">
                                    +{" "}
                                    {formatMoney(
                                      deposit.bonus_amount,
                                    )}{" "}
                                    bonus
                                  </p>
                                )}
                              </td>

                              <td className="px-4 py-4">
                                <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-bold uppercase text-gray-600">
                                  {
                                    deposit.payment_method
                                  }
                                </span>
                              </td>

                              <td className="px-4 py-4">
                                <span className="font-mono text-xs font-semibold text-gray-600">
                                  {shortId(
                                    deposit.transaction_id,
                                  )}
                                </span>
                              </td>

                              <td className="px-4 py-4">
                                <span
                                  className={getStatusClass(
                                    deposit.status,
                                  )}
                                >
                                  {
                                    deposit.status
                                  }
                                </span>
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </DashboardPanel>
            </section>

            {/* ================= PACKAGE DISTRIBUTION ================= */}

            <section className="mt-6">
              <DashboardPanel
                title="Active Package Distribution"
                subtitle="Users currently active on each package"
                actionHref="/admin/packages"
                actionText="Manage"
              >
                {dashboard.packageStats
                  .length === 0 ? (
                  <EmptyState text="No active packages found." />
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {dashboard.packageStats.map(
                      (item, index) => {
                        const maxCount =
                          Math.max(
                            ...dashboard.packageStats.map(
                              (x) =>
                                x.activeUsers,
                            ),
                            1,
                          );

                        const width =
                          Math.max(
                            8,
                            (item.activeUsers /
                              maxCount) *
                              100,
                          );

                        return (
                          <div
                            key={`${item.packageAmount}-${index}`}
                            className="rounded-xl border border-gray-100 bg-gray-50 p-4"
                          >
                            <div className="mb-3 flex items-center justify-between">
                              <span className="text-sm font-black">
                                {formatMoney(
                                  item.packageAmount,
                                )}
                              </span>

                              <span className="text-xs font-bold text-gray-500">
                                {
                                  item.activeUsers
                                }{" "}
                                users
                              </span>
                            </div>

                            <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                              <div
                                className="h-full rounded-full bg-black transition-all"
                                style={{
                                  width: `${width}%`,
                                }}
                              />
                            </div>

                            <p className="mt-2 text-xs text-gray-400">
                              {
                                item.totalActivations
                              }{" "}
                              total activation(s)
                            </p>
                          </div>
                        );
                      },
                    )}
                  </div>
                )}
              </DashboardPanel>
            </section>

            {/* ================= TASKS ================= */}

            <section className="mt-6">
              <SectionHeading
                eyebrow="Tasks"
                title="Task System Overview"
              />

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                  title="Normal Tasks"
                  value={
                    dashboard.tasks
                      .normalTotal
                  }
                  description={`${dashboard.tasks.normalActive} active`}
                />

                <MetricCard
                  title="Package Tasks"
                  value={
                    dashboard.tasks
                      .packageTotal
                  }
                  description={`${dashboard.tasks.packageActive} active`}
                />

                <MetricCard
                  title="Pending Submissions"
                  value={
                    dashboard.tasks
                      .pendingSubmissions
                  }
                  description="Need review"
                />

                <MetricCard
                  title="Rewards Paid"
                  value={formatMoney(
                    dashboard.tasks
                      .rewardPaid,
                  )}
                  description={`${dashboard.tasks.approvedSubmissions} approved`}
                />
              </div>
            </section>

            {/* ================= RECENT SUBMISSIONS ================= */}

            <section className="mt-6">
              <DashboardPanel
                title="Recent Task Submissions"
                subtitle="Latest task submissions"
                actionHref="/admin/task-submissions"
                actionText="Review"
              >
                {dashboard.recentSubmissions
                  .length === 0 ? (
                  <EmptyState text="No task submissions found." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px]">
                      <thead>
                        <tr className="border-b border-gray-100 text-left">
                          <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-400">
                            User
                          </th>

                          <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-400">
                            Task
                          </th>

                          <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-400">
                            Reward
                          </th>

                          <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-400">
                            Date
                          </th>

                          <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-400">
                            Status
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {dashboard.recentSubmissions.map(
                          (submission) => (
                            <tr
                              key={`${submission.kind}-${submission.id}`}
                              className="border-b border-gray-50 last:border-0"
                            >
                              <td className="px-4 py-4">
                                <p className="text-sm font-bold">
                                  {getUserName(
                                    submission.user_id,
                                    profileMap,
                                  )}
                                </p>

                                <p className="mt-0.5 font-mono text-[11px] text-gray-400">
                                  {shortId(
                                    submission.user_id,
                                  )}
                                </p>
                              </td>

                              <td className="px-4 py-4">
                                <p className="max-w-[280px] truncate text-sm font-bold">
                                  {submission.task_title ||
                                    shortId(
                                      submission.task_id,
                                    )}
                                </p>

                                {submission.package_amount ? (
                                  <p className="mt-1 text-xs text-gray-400">
                                    Package{" "}
                                    {formatMoney(
                                      Number(
                                        submission.package_amount,
                                      ),
                                    )}
                                  </p>
                                ) : (
                                  <p className="mt-1 text-xs text-gray-400">
                                    Normal task
                                  </p>
                                )}
                              </td>

                              <td className="px-4 py-4 text-sm font-black">
                                {formatMoney(
                                  submission.reward_amount,
                                )}
                              </td>

                              <td className="px-4 py-4 text-xs font-medium text-gray-500">
                                {formatDate(
                                  submission.created_at,
                                )}
                              </td>

                              <td className="px-4 py-4">
                                <span
                                  className={getStatusClass(
                                    submission.status,
                                  )}
                                >
                                  {
                                    submission.status
                                  }
                                </span>
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </DashboardPanel>
            </section>

            {/* ================= REFERRALS ================= */}

            <section className="mt-6">
              <DashboardPanel
                title="Referral Overview"
                subtitle="Latest referral activity"
                actionHref="/admin/referrals"
                actionText="View All"
              >
                <div className="grid grid-cols-2 gap-px bg-gray-100 md:grid-cols-4">
                  <MetricBox
                    label="Total Referrals"
                    value={
                      dashboard.referrals
                        .total
                    }
                  />

                  <MetricBox
                    label="Pending"
                    value={
                      dashboard.referrals
                        .pending
                    }
                  />

                  <MetricBox
                    label="Qualified"
                    value={
                      dashboard.referrals
                        .qualified
                    }
                  />

                  <MetricBox
                    label="Completed"
                    value={
                      dashboard.referrals
                        .completed
                    }
                  />
                </div>

                {dashboard.recentReferrals
                  .length > 0 && (
                  <div className="border-t border-gray-100">
                    <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-4">
                      {dashboard.recentReferrals.map(
                        (referral) => (
                          <div
                            key={
                              referral.id
                            }
                            className="rounded-xl border border-gray-100 bg-gray-50 p-4"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono text-xs font-bold text-gray-600">
                                {
                                  referral.referral_code
                                }
                              </span>

                              <span
                                className={getStatusClass(
                                  referral.status,
                                )}
                              >
                                {
                                  referral.status
                                }
                              </span>
                            </div>

                            <p className="mt-3 text-sm font-bold">
                              {getUserName(
                                referral.referrer_id,
                                profileMap,
                              )}
                            </p>

                            <p className="mt-1 text-xs text-gray-400">
                              Referred:{" "}
                              {getUserName(
                                referral.referred_user_id,
                                profileMap,
                              )}
                            </p>

                            <p className="mt-2 text-xs text-gray-400">
                              {formatDate(
                                referral.created_at,
                              )}
                            </p>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}
              </DashboardPanel>
            </section>

            {/* ================= RECENT WITHDRAWALS ================= */}

            <section className="mt-6">
              <DashboardPanel
                title="Recent Withdrawals"
                subtitle="Latest withdrawal requests"
                actionHref="/admin/withdrawals"
                actionText="View All"
              >
                {dashboard.recentWithdrawals
                  .length === 0 ? (
                  <EmptyState text="No withdrawals found." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px]">
                      <thead>
                        <tr className="border-b border-gray-100 text-left">
                          <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-400">
                            User
                          </th>

                          <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-400">
                            Amount
                          </th>

                          <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-400">
                            Method
                          </th>

                          <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-400">
                            Date
                          </th>

                          <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-400">
                            Status
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {dashboard.recentWithdrawals.map(
                          (withdrawal) => (
                            <tr
                              key={
                                withdrawal.id
                              }
                              className="border-b border-gray-50 last:border-0"
                            >
                              <td className="px-4 py-4">
                                <p className="text-sm font-bold">
                                  {getUserName(
                                    withdrawal.user_id,
                                    profileMap,
                                  )}
                                </p>

                                <p className="mt-0.5 text-xs text-gray-400">
                                  {formatDate(
                                    withdrawal.created_at ||
                                      withdrawal.requested_at,
                                  )}
                                </p>
                              </td>

                              <td className="px-4 py-4 text-sm font-black">
                                {formatMoney(
                                  withdrawal.amount,
                                )}
                              </td>

                              <td className="px-4 py-4">
                                <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-bold uppercase text-gray-600">
                                  {
                                    withdrawal.payment_method
                                  }
                                </span>
                              </td>

                              <td className="px-4 py-4 text-xs text-gray-500">
                                {formatDate(
                                  withdrawal.requested_at,
                                )}
                              </td>

                              <td className="px-4 py-4">
                                <span
                                  className={getStatusClass(
                                    withdrawal.status,
                                  )}
                                >
                                  {
                                    withdrawal.status
                                  }
                                </span>
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </DashboardPanel>
            </section>

            {/* ================= WALLET ================= */}

            <section className="mt-6">
              <SectionHeading
                eyebrow="Wallet"
                title="Wallet Summary"
              />

              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <WalletCard
                  title="Total Balance"
                  value={formatMoney(
                    dashboard.wallet
                      .totalBalance,
                  )}
                />

                <WalletCard
                  title="Deposit Balance"
                  value={formatMoney(
                    dashboard.wallet
                      .depositBalance,
                  )}
                />

                <WalletCard
                  title="Earning Balance"
                  value={formatMoney(
                    dashboard.wallet
                      .earningBalance,
                  )}
                />

                <WalletCard
                  title="Total Earned"
                  value={formatMoney(
                    dashboard.wallet
                      .totalEarned,
                  )}
                />
              </div>
            </section>

            {/* ================= SYSTEM STATUS ================= */}

            <section className="mt-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="font-black">
                      Pocket Money Home Admin
                    </h3>

                    <p className="mt-1 text-sm text-gray-500">
                      Dashboard automatically
                      refreshes every 30 seconds.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <SystemBadge label="Database Connected" />
                    <SystemBadge label="Live Dashboard" />
                    <SystemBadge label="Auto Refresh 30s" />
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </div>

      <style jsx global>{`
        .status {
          display: inline-flex;
          align-items: center;
          border-radius: 9999px;
          padding: 5px 9px;
          font-size: 11px;
          line-height: 1;
          font-weight: 800;
          text-transform: capitalize;
        }

        .status.success {
          background: #ecfdf3;
          color: #047857;
        }

        .status.pending {
          background: #fff7ed;
          color: #c2410c;
        }

        .status.danger {
          background: #fef2f2;
          color: #dc2626;
        }
      `}</style>
    </main>
  );
}

/* ============================================================
   SECTION HEADING
============================================================ */

function SectionHeading({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="mb-4">
      <p className="mb-1 text-xs font-black uppercase tracking-[0.16em] text-gray-400">
        {eyebrow}
      </p>

      <h3 className="text-xl font-black tracking-tight">
        {title}
      </h3>
    </div>
  );
}

/* ============================================================
   STAT CARD
============================================================ */

function StatCard({
  title,
  value,
  icon,
  description,
  alert = false,
}: {
  title: string;
  value: string;
  icon: string;
  description: string;
  alert?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border bg-white p-5 shadow-sm ${
        alert
          ? "border-orange-200"
          : "border-gray-200"
      }`}
    >
      <div className="flex items-start justify-between">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl ${
            alert
              ? "bg-orange-50"
              : "bg-gray-100"
          }`}
        >
          {icon}
        </div>

        {alert && (
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-orange-500" />
        )}
      </div>

      <p className="mt-4 text-xs font-bold uppercase tracking-wide text-gray-400">
        {title}
      </p>

      <p className="mt-1 text-3xl font-black tracking-tight">
        {value}
      </p>

      <p className="mt-1 text-xs font-medium text-gray-500">
        {description}
      </p>
    </div>
  );
}

/* ============================================================
   FINANCE CARD
============================================================ */

function FinanceCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 font-black">
          {icon}
        </div>
      </div>

      <p className="mt-4 text-xs font-bold uppercase tracking-wide text-gray-400">
        {title}
      </p>

      <p className="mt-1 text-2xl font-black">
        {value}
      </p>

      <p className="mt-1 text-xs font-medium text-gray-500">
        {description}
      </p>
    </div>
  );
}

/* ============================================================
   QUICK ACTION
============================================================ */

function QuickAction({
  href,
  title,
  value,
  description,
  icon,
  alert,
}: {
  href: string;
  title: string;
  value: number;
  description: string;
  icon: string;
  alert: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        alert
          ? "border-orange-200"
          : "border-gray-200"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-lg">
          {icon}
        </div>

        <span className="text-2xl font-black">
          {value}
        </span>
      </div>

      <h4 className="mt-4 font-black">
        {title}
      </h4>

      <p className="mt-1 text-sm leading-6 text-gray-500">
        {description}
      </p>

      <p className="mt-3 text-xs font-black text-[#4f9d32]">
        Open →
      </p>
    </Link>
  );
}

/* ============================================================
   DASHBOARD PANEL
============================================================ */

function DashboardPanel({
  title,
  subtitle,
  actionHref,
  actionText,
  children,
}: {
  title: string;
  subtitle: string;
  actionHref?: string;
  actionText?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-gray-100 px-5 py-4">
        <div>
          <h3 className="font-black">
            {title}
          </h3>

          <p className="mt-0.5 text-xs font-medium text-gray-400">
            {subtitle}
          </p>
        </div>

        {actionHref &&
          actionText && (
            <Link
              href={actionHref}
              className="shrink-0 text-xs font-black text-[#4f9d32] hover:underline"
            >
              {actionText} →
            </Link>
          )}
      </div>

      <div>{children}</div>
    </div>
  );
}

/* ============================================================
   METRIC BOX
============================================================ */

function MetricBox({
  label,
  value,
  valueText,
}: {
  label: string;
  value: string | number;
  valueText?: string;
}) {
  return (
    <div className="bg-white p-5">
      <p className="text-[10px] font-black uppercase tracking-wide text-gray-400">
        {label}
      </p>

      <p className="mt-1 text-lg font-black">
        {value}
      </p>

      {valueText && (
        <p className="mt-1 text-xs font-semibold text-gray-400">
          {valueText}
        </p>
      )}
    </div>
  );
}

/* ============================================================
   METRIC CARD
============================================================ */

function MetricCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string | number;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
        {title}
      </p>

      <p className="mt-2 text-3xl font-black">
        {value}
      </p>

      <p className="mt-1 text-xs font-medium text-gray-500">
        {description}
      </p>
    </div>
  );
}

/* ============================================================
   WALLET CARD
============================================================ */

function WalletCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
        {title}
      </p>

      <p className="mt-2 text-xl font-black">
        {value}
      </p>
    </div>
  );
}

/* ============================================================
   EMPTY STATE
============================================================ */

function EmptyState({
  text,
}: {
  text: string;
}) {
  return (
    <div className="flex min-h-[180px] items-center justify-center px-5 text-center">
      <div>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-xl">
          —
        </div>

        <p className="mt-3 text-sm font-bold text-gray-500">
          {text}
        </p>
      </div>
    </div>
  );
}

/* ============================================================
   SYSTEM BADGE
============================================================ */

function SystemBadge({
  label,
}: {
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-600">
      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
      {label}
    </span>
  );
}

/* ============================================================
   LOADING SKELETON
============================================================ */

function DashboardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {Array.from({
          length: 6,
        }).map((_, index) => (
          <div
            key={`top-skeleton-${index}`}
            className="h-40 rounded-2xl border border-gray-200 bg-white"
          />
        ))}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({
          length: 4,
        }).map((_, index) => (
          <div
            key={`finance-skeleton-${index}`}
            className="h-36 rounded-2xl border border-gray-200 bg-white"
          />
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="h-[330px] rounded-2xl border border-gray-200 bg-white" />

        <div className="h-[330px] rounded-2xl border border-gray-200 bg-white" />
      </div>

      <div className="mt-6 h-[430px] rounded-2xl border border-gray-200 bg-white" />

      <div className="mt-6 h-[300px] rounded-2xl border border-gray-200 bg-white" />
    </div>
  );
}