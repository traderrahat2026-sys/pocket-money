"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import AdminShell from "@/components/admin/AdminShell";

type PackageActivation = {
  id: string;
  package_amount: number;
  is_active: boolean;
  activated_at: string | null;
  deactivated_at: string | null;
};

type User = {
  id: string;
  username: string;
  full_name: string;
  email: string;
  phone: string;
  avatar_url?: string | null;
  role: string;
  referral_code: string;
  created_at: string;
  updated_at?: string;
  last_sign_in_at?: string | null;
  account_status: "active" | "blocked";

  wallet: {
    balance: number;
    deposit_balance: number;
    earning_balance: number;
    total_earned: number;
    total_deposited: number;
    total_withdrawn: number;
    deposit_bonus_amount: number;
  };

  packages: PackageActivation[];

  active_packages: PackageActivation[];

  referral: {
    total_referrals: number;
    active_referrals: number;
    qualified_referrals: number;
    reward: number;
  };
};

type ApiResponse = {
  success?: boolean;
  users?: User[];
  user?: User | null;
  total_users?: number;
  error?: string;
};

function taka(value: number) {
  return `৳${Number(value || 0).toLocaleString(
    "en-BD",
    {
      maximumFractionDigits: 2,
    }
  )}`;
}

function formatDate(
  value: string | null | undefined
) {
  if (!value) return "—";

  try {
    return new Date(
      value
    ).toLocaleString("en-BD", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function getInitials(user: User) {
  const source =
    user.full_name?.trim() ||
    user.username?.trim() ||
    "U";

  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((item) =>
      item.charAt(0).toUpperCase()
    )
    .join("");
}

export default function AdminUsersPage() {
  const [users, setUsers] =
    useState<User[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState<
      "all" | "active" | "blocked"
    >("all");

  const [selectedUser, setSelectedUser] =
    useState<User | null>(null);

  const [editingUser, setEditingUser] =
    useState<User | null>(null);

  const loadUsers = useCallback(
    async () => {
      try {
        setLoading(true);
        setError("");

        const response =
          await fetch(
            "/api/admin/users",
            {
              method: "GET",
              cache: "no-store",
              credentials:
                "include",
            }
          );

        const data: ApiResponse =
          await response
            .json()
            .catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Users could not be loaded."
          );
        }

        if (!data.success) {
          throw new Error(
            data.error ||
              "Users could not be loaded."
          );
        }

        setUsers(
          Array.isArray(
            data.users
          )
            ? data.users
            : []
        );
      } catch (err) {
        console.error(
          "ADMIN USERS ERROR:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Users could not be loaded."
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filteredUsers =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      return users.filter(
        (user) => {
          const matchesSearch =
            !query ||
            [
              user.username,
              user.full_name,
              user.email,
              user.phone,
              user.referral_code,
              user.id,
            ]
              .join(" ")
              .toLowerCase()
              .includes(query);

          const matchesStatus =
            statusFilter ===
              "all" ||
            user.account_status ===
              statusFilter;

          return (
            matchesSearch &&
            matchesStatus
          );
        }
      );
    }, [
      users,
      search,
      statusFilter,
    ]);

  const summary =
    useMemo(() => {
      const active =
        users.filter(
          (user) =>
            user.account_status ===
            "active"
        ).length;

      const blocked =
        users.filter(
          (user) =>
            user.account_status ===
            "blocked"
        ).length;

      const totalBalance =
        users.reduce(
          (sum, user) =>
            sum +
            user.wallet.balance,
          0
        );

      const totalEarned =
        users.reduce(
          (sum, user) =>
            sum +
            user.wallet
              .total_earned,
          0
        );

      return {
        total: users.length,
        active,
        blocked,
        totalBalance,
        totalEarned,
      };
    }, [users]);

  async function saveUser(
    formData: {
      userId: string;
      full_name: string;
      username: string;
      email: string;
      phone: string;
      referral_code: string;
      role: string;
      password: string;
      account_status:
        | "active"
        | "blocked";
    }
  ) {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response =
        await fetch(
          "/api/admin/users",
          {
            method: "PUT",
            headers: {
              "Content-Type":
                "application/json",
            },
            credentials:
              "include",
            body: JSON.stringify(
              formData
            ),
          }
        );

      const data: ApiResponse =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error ||
            "User update failed."
        );
      }

      if (!data.success) {
        throw new Error(
          data.error ||
            "User update failed."
        );
      }

      if (data.user) {
        setUsers((current) =>
          current.map((item) =>
            item.id === data.user!.id
              ? data.user!
              : item
          )
        );
      } else {
        await loadUsers();
      }

      setSuccess(
        "User information updated successfully."
      );

      setEditingUser(null);

      if (
        selectedUser &&
        data.user
      ) {
        setSelectedUser(
          data.user
        );
      }
    } catch (err) {
      console.error(
        "USER UPDATE ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "User update failed."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell
      title="Users"
      description="Manage users, accounts, packages and financial information"
    >
      <div className="space-y-6">
        {/* HEADER */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              Users
            </h1>

            <p className="mt-1 text-sm text-black/45">
              সকল user-এর account ও
              financial information
              এখান থেকে manage করুন।
            </p>
          </div>

          <button
            type="button"
            onClick={loadUsers}
            disabled={loading}
            className="h-11 rounded-xl border border-black/10 bg-white px-5 text-sm font-black shadow-sm hover:bg-black/[0.02] disabled:opacity-50"
          >
            {loading
              ? "Loading..."
              : "↻ Refresh"}
          </button>
        </div>

        {/* ALERT */}
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-600">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-2xl border border-[#d7efcd] bg-[#eef9e9] p-4 text-sm font-bold text-[#3f8d2b]">
            {success}
          </div>
        )}

        {/* SUMMARY */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Total Users"
            value={summary.total}
            icon="👥"
          />

          <SummaryCard
            title="Active Accounts"
            value={summary.active}
            icon="✓"
          />

          <SummaryCard
            title="Blocked Accounts"
            value={summary.blocked}
            icon="!"
          />

          <SummaryMoneyCard
            title="Total Earned"
            value={summary.totalEarned}
          />
        </div>

        {/* TABLE */}
        <div className="overflow-hidden rounded-2xl border border-black/8 bg-white shadow-sm">
          {/* FILTER */}
          <div className="flex flex-col gap-4 border-b border-black/6 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-black">
                User List
              </p>

              <p className="mt-1 text-xs text-black/40">
                Showing{" "}
                {
                  filteredUsers.length
                }{" "}
                of{" "}
                {users.length} users
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Name / email / phone / referral..."
                className="h-11 rounded-xl border border-black/10 bg-[#fafcfb] px-4 text-sm outline-none focus:border-[#4f9d32] sm:w-[330px]"
              />

              <select
                value={
                  statusFilter
                }
                onChange={(event) =>
                  setStatusFilter(
                    event.target
                      .value as
                      | "all"
                      | "active"
                      | "blocked"
                  )
                }
                className="h-11 rounded-xl border border-black/10 bg-[#fafcfb] px-4 text-sm font-bold outline-none focus:border-[#4f9d32]"
              >
                <option value="all">
                  All Accounts
                </option>

                <option value="active">
                  Active
                </option>

                <option value="blocked">
                  Blocked
                </option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-black/10 border-t-[#4f9d32]" />

              <p className="mt-4 text-sm font-bold text-black/40">
                Users loading...
              </p>
            </div>
          ) : filteredUsers.length ===
            0 ? (
            <div className="p-12 text-center">
              <p className="font-black">
                No users found
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1550px] text-left">
                <thead>
                  <tr className="bg-[#fafcfb] text-[11px] font-black uppercase tracking-wide text-black/40">
                    <th className="px-5 py-4">
                      User
                    </th>

                    <th className="px-5 py-4">
                      Gmail
                    </th>

                    <th className="px-5 py-4">
                      Phone
                    </th>

                    <th className="px-5 py-4">
                      Registered
                    </th>

                    <th className="px-5 py-4">
                      Balance
                    </th>

                    <th className="px-5 py-4">
                      Earned
                    </th>

                    <th className="px-5 py-4">
                      Package
                    </th>

                    <th className="px-5 py-4">
                      Referrals
                    </th>

                    <th className="px-5 py-4">
                      Account
                    </th>

                    <th className="px-5 py-4">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredUsers.map(
                    (user) => (
                      <tr
                        key={user.id}
                        className="border-b border-black/5 last:border-0 hover:bg-[#fafcfb]"
                      >
                        {/* USER */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#eef9e9] text-sm font-black text-[#4f9d32]">
                              {getInitials(
                                user
                              )}
                            </div>

                            <div>
                              <p className="font-black">
                                {user.full_name ||
                                  user.username ||
                                  "Unnamed"}
                              </p>

                              <p className="text-xs text-black/40">
                                @
                                {user.username ||
                                  "no-username"}
                              </p>

                              <p className="text-[11px] font-bold text-[#4f9d32]">
                                Ref:{" "}
                                {user.referral_code ||
                                  "—"}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* EMAIL */}
                        <td className="px-5 py-4">
                          <span className="text-sm font-semibold">
                            {user.email ||
                              "No email"}
                          </span>
                        </td>

                        {/* PHONE */}
                        <td className="px-5 py-4">
                          {user.phone ||
                            "—"}
                        </td>

                        {/* DATE */}
                        <td className="px-5 py-4 text-xs font-semibold text-black/50">
                          {formatDate(
                            user.created_at
                          )}
                        </td>

                        {/* BALANCE */}
                        <td className="px-5 py-4">
                          <p className="font-black">
                            {taka(
                              user.wallet
                                .balance
                            )}
                          </p>

                          <p className="text-[11px] text-black/40">
                            Deposit:{" "}
                            {taka(
                              user.wallet
                                .deposit_balance
                            )}
                          </p>
                        </td>

                        {/* EARNED */}
                        <td className="px-5 py-4">
                          <span className="font-black text-[#3f8d2b]">
                            {taka(
                              user.wallet
                                .total_earned
                            )}
                          </span>
                        </td>

                        {/* PACKAGE */}
                        <td className="px-5 py-4">
                          {user.active_packages
                            .length ? (
                            <div className="flex flex-wrap gap-1">
                              {user.active_packages.map(
                                (pkg) => (
                                  <span
                                    key={
                                      pkg.id
                                    }
                                    className="rounded-full bg-[#eef9e9] px-2.5 py-1 text-xs font-black text-[#3f8d2b]"
                                  >
                                    {taka(
                                      pkg.package_amount
                                    )}
                                  </span>
                                )
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-black/35">
                              No active package
                            </span>
                          )}
                        </td>

                        {/* REFERRAL */}
                        <td className="px-5 py-4">
                          <p className="font-black">
                            {
                              user
                                .referral
                                .total_referrals
                            }
                          </p>

                          <p className="text-[11px] text-black/40">
                            Qualified:{" "}
                            {
                              user
                                .referral
                                .qualified_referrals
                            }
                          </p>
                        </td>

                        {/* ACCOUNT */}
                        <td className="px-5 py-4">
                          {user.account_status ===
                          "active" ? (
                            <span className="rounded-full border border-[#d7efcd] bg-[#eef9e9] px-3 py-1 text-[11px] font-black text-[#3f8d2b]">
                              Active
                            </span>
                          ) : (
                            <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[11px] font-black text-red-600">
                              Blocked
                            </span>
                          )}
                        </td>

                        {/* ACTION */}
                        <td className="px-5 py-4">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedUser(
                                  user
                                )
                              }
                              className="rounded-xl border border-black/10 px-3 py-2 text-xs font-black hover:border-[#4f9d32]"
                            >
                              Details
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setEditingUser(
                                  user
                                )
                              }
                              className="rounded-xl bg-black px-3 py-2 text-xs font-black text-white hover:bg-black/80"
                            >
                              Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* DETAILS MODAL */}
      {selectedUser && (
        <Modal
          title="User Details"
          onClose={() =>
            setSelectedUser(null)
          }
        >
          <div className="space-y-6">
            <div className="rounded-2xl bg-[#fafcfb] p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#eef9e9] text-xl font-black text-[#4f9d32]">
                  {getInitials(
                    selectedUser
                  )}
                </div>

                <div>
                  <h2 className="text-xl font-black">
                    {selectedUser.full_name ||
                      selectedUser.username}
                  </h2>

                  <p className="text-sm text-black/45">
                    @
                    {selectedUser.username ||
                      "no-username"}
                  </p>

                  <p className="mt-1 text-sm font-semibold">
                    {selectedUser.email ||
                      "No email"}
                  </p>
                </div>
              </div>
            </div>

            <InfoGrid>
              <Info
                label="Full Name"
                value={
                  selectedUser.full_name ||
                  "—"
                }
              />

              <Info
                label="Username"
                value={
                  selectedUser.username ||
                  "—"
                }
              />

              <Info
                label="Gmail"
                value={
                  selectedUser.email ||
                  "—"
                }
              />

              <Info
                label="Phone"
                value={
                  selectedUser.phone ||
                  "—"
                }
              />

              <Info
                label="Referral Code"
                value={
                  selectedUser.referral_code ||
                  "—"
                }
              />

              <Info
                label="Role"
                value={
                  selectedUser.role
                }
              />

              <Info
                label="Registered"
                value={formatDate(
                  selectedUser.created_at
                )}
              />

              <Info
                label="Last Login"
                value={formatDate(
                  selectedUser.last_sign_in_at
                )}
              />
            </InfoGrid>

            <div>
              <h3 className="mb-3 font-black">
                Wallet
              </h3>

              <InfoGrid>
                <Info
                  label="Balance"
                  value={taka(
                    selectedUser.wallet
                      .balance
                  )}
                />

                <Info
                  label="Deposit Balance"
                  value={taka(
                    selectedUser.wallet
                      .deposit_balance
                  )}
                />

                <Info
                  label="Earning Balance"
                  value={taka(
                    selectedUser.wallet
                      .earning_balance
                  )}
                />

                <Info
                  label="Total Earned"
                  value={taka(
                    selectedUser.wallet
                      .total_earned
                  )}
                />

                <Info
                  label="Total Deposited"
                  value={taka(
                    selectedUser.wallet
                      .total_deposited
                  )}
                />

                <Info
                  label="Total Withdrawn"
                  value={taka(
                    selectedUser.wallet
                      .total_withdrawn
                  )}
                />
              </InfoGrid>
            </div>

            <div>
              <h3 className="mb-3 font-black">
                Package Activations
              </h3>

              <div className="space-y-2">
                {selectedUser.packages
                  .length === 0 ? (
                  <p className="rounded-xl bg-[#fafcfb] p-4 text-sm text-black/40">
                    No package activation
                    records.
                  </p>
                ) : (
                  selectedUser.packages.map(
                    (pkg) => (
                      <div
                        key={pkg.id}
                        className="flex items-center justify-between rounded-xl border border-black/7 p-4"
                      >
                        <div>
                          <p className="font-black">
                            {taka(
                              pkg.package_amount
                            )}
                          </p>

                          <p className="text-xs text-black/40">
                            {formatDate(
                              pkg.activated_at
                            )}
                          </p>
                        </div>

                        <span className="text-xs font-black">
                          {pkg.is_active
                            ? "Active"
                            : "Inactive"}
                        </span>
                      </div>
                    )
                  )
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Info
                label="Referrals"
                value={String(
                  selectedUser
                    .referral
                    .total_referrals
                )}
              />

              <Info
                label="Active"
                value={String(
                  selectedUser
                    .referral
                    .active_referrals
                )}
              />

              <Info
                label="Qualified"
                value={String(
                  selectedUser
                    .referral
                    .qualified_referrals
                )}
              />
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedUser(
                  null
                );
                setEditingUser(
                  selectedUser
                );
              }}
              className="w-full rounded-xl bg-black py-3 text-sm font-black text-white"
            >
              Edit This User
            </button>
          </div>
        </Modal>
      )}

      {/* EDIT MODAL */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          saving={saving}
          onClose={() =>
            setEditingUser(null)
          }
          onSave={saveUser}
        />
      )}
    </AdminShell>
  );
}

function EditUserModal({
  user,
  saving,
  onClose,
  onSave,
}: {
  user: User;
  saving: boolean;
  onClose: () => void;
  onSave: (data: {
    userId: string;
    full_name: string;
    username: string;
    email: string;
    phone: string;
    referral_code: string;
    role: string;
    password: string;
    account_status:
      | "active"
      | "blocked";
  }) => Promise<void>;
}) {
  const [fullName, setFullName] =
    useState(user.full_name);

  const [username, setUsername] =
    useState(user.username);

  const [email, setEmail] =
    useState(user.email);

  const [phone, setPhone] =
    useState(user.phone);

  const [referralCode, setReferralCode] =
    useState(user.referral_code);

  const [role, setRole] =
    useState(user.role);

  const [password, setPassword] =
    useState("");

  const [status, setStatus] =
    useState<
      "active" | "blocked"
    >(user.account_status);

  return (
    <Modal
      title="Edit User"
      onClose={onClose}
    >
      <form
        onSubmit={async (event) => {
          event.preventDefault();

          await onSave({
            userId: user.id,
            full_name: fullName,
            username,
            email,
            phone,
            referral_code:
              referralCode,
            role,
            password,
            account_status:
              status,
          });
        }}
        className="space-y-5"
      >
        <div className="rounded-xl bg-[#fafcfb] p-4">
          <p className="text-xs font-black uppercase tracking-wide text-black/35">
            User ID
          </p>

          <p className="mt-1 break-all text-xs font-semibold text-black/50">
            {user.id}
          </p>
        </div>

        <Field
          label="Full Name"
          value={fullName}
          onChange={setFullName}
          placeholder="Full name"
        />

        <Field
          label="Username"
          value={username}
          onChange={setUsername}
          placeholder="Username"
        />

        <Field
          label="Gmail / Email"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="user@gmail.com"
        />

        <Field
          label="Phone"
          value={phone}
          onChange={setPhone}
          placeholder="01XXXXXXXXX"
        />

        <Field
          label="Referral Code"
          value={referralCode}
          onChange={setReferralCode}
          placeholder="Referral code"
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-xs font-black">
              Role
            </span>

            <select
              value={role}
              onChange={(event) =>
                setRole(
                  event.target.value
                )
              }
              className="h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm font-semibold outline-none focus:border-[#4f9d32]"
            >
              <option value="user">
                User
              </option>

              <option value="admin">
                Admin
              </option>
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-black">
              Account Status
            </span>

            <select
              value={status}
              onChange={(event) =>
                setStatus(
                  event.target
                    .value as
                    | "active"
                    | "blocked"
                )
              }
              className="h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm font-semibold outline-none focus:border-[#4f9d32]"
            >
              <option value="active">
                Active
              </option>

              <option value="blocked">
                Blocked
              </option>
            </select>
          </label>
        </div>

        <Field
          label="New Password"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="Leave blank to keep current password"
        />

        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-3 text-xs font-semibold text-yellow-700">
          Password পরিবর্তন করলে user-এর
          বর্তমান password replace হয়ে যাবে।
          Blank রাখলে password পরিবর্তন হবে না।
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="h-11 flex-1 rounded-xl border border-black/10 bg-white text-sm font-black disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="h-11 flex-1 rounded-xl bg-black text-sm font-black text-white disabled:opacity-50"
          >
            {saving
              ? "Saving..."
              : "Save Changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-black/6 bg-white px-5 py-4">
          <h2 className="text-lg font-black">
            {title}
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/5 text-xl font-bold"
          >
            ×
          </button>
        </div>

        <div className="p-5 sm:p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black">
        {label}
      </span>

      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-black/10 bg-white px-4 text-sm font-semibold outline-none focus:border-[#4f9d32]"
      />
    </label>
  );
}

function SummaryCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border border-black/8 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-black/40">
            {title}
          </p>

          <p className="mt-2 text-2xl font-black">
            {value.toLocaleString(
              "en-BD"
            )}
          </p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eef9e9] font-black text-[#4f9d32]">
          {icon}
        </div>
      </div>
    </div>
  );
}

function SummaryMoneyCard({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-black/8 bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-wide text-black/40">
        {title}
      </p>

      <p className="mt-2 text-2xl font-black">
        {taka(value)}
      </p>
    </div>
  );
}

function InfoGrid({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {children}
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
    <div className="rounded-xl border border-black/7 bg-[#fafcfb] p-4">
      <p className="text-[11px] font-black uppercase tracking-wide text-black/35">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-bold">
        {value}
      </p>
    </div>
  );
}