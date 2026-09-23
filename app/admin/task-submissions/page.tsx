"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import AdminShell from "@/components/admin/AdminShell";

type Submission = {
  id: string;
  user_id: string;
  task_id: string;
  screenshot_url: string | null;
  status: string;
  admin_note: string | null;
  reward_amount: number;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;

  package_amount: number | null;

  user: {
    id: string;
    username: string | null;
    full_name: string | null;
    phone: string | null;
    referral_code: string | null;
  } | null;

  task: {
    id: string;
    package_amount: number;
    title: string;
    description: string | null;
    task_url: string;
    reward_amount: number;
    duration_hours: number;
    screenshot_required: boolean;
    is_active: boolean;
    created_at: string;
    available_from: string | null;
    expires_at: string | null;
  } | null;

  user_has_active_matching_package: boolean;
};

type Summary = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  approvedRewards: number;
};

function formatMoney(value: number | null | undefined) {
  return `৳${Number(value || 0).toLocaleString("en-BD")}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-BD", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getStatusClass(status: string) {
  const value = status.toLowerCase();

  if (value === "approved") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (value === "rejected") {
    return "bg-red-50 text-red-700 ring-red-200";
  }

  return "bg-amber-50 text-amber-700 ring-amber-200";
}

export default function TaskSubmissionsPage() {
  const [submissions, setSubmissions] = useState<
    Submission[]
  >([]);

  const [summary, setSummary] = useState<Summary>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    approvedRewards: 0,
  });

  const [packageAmounts, setPackageAmounts] =
    useState<number[]>([]);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("pending");
  const [packageAmount, setPackageAmount] =
    useState("all");

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] =
    useState(false);

  const [selected, setSelected] =
    useState<Submission | null>(null);

  const [rejectNote, setRejectNote] =
    useState("");

  const [showRejectModal, setShowRejectModal] =
    useState(false);

  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const loadSubmissions = useCallback(async () => {
    try {
      setLoading(true);
      setMessage(null);

      const params = new URLSearchParams();

      params.set("status", status);

      if (search.trim()) {
        params.set("search", search.trim());
      }

      if (packageAmount !== "all") {
        params.set(
          "packageAmount",
          packageAmount,
        );
      }

      const response = await fetch(
        `/api/admin/task-submissions?${params.toString()}`,
        {
          method: "GET",
          cache: "no-store",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to load task submissions.",
        );
      }

      setSubmissions(data.submissions || []);
      setSummary(
        data.summary || {
          total: 0,
          pending: 0,
          approved: 0,
          rejected: 0,
          approvedRewards: 0,
        },
      );
      setPackageAmounts(
        data.packageAmounts || [],
      );
    } catch (error) {
      console.error(error);

      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to load submissions.",
      });
    } finally {
      setLoading(false);
    }
  }, [status, search, packageAmount]);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  const pendingSubmissions = useMemo(
    () =>
      submissions.filter(
        (item) =>
          item.status.toLowerCase() ===
          "pending",
      ),
    [submissions],
  );

  async function approveSubmission(
    submission: Submission,
  ) {
    const reward = Number(
      submission.task?.reward_amount ??
        submission.reward_amount ??
        0,
    );

    const userName =
      submission.user?.full_name ||
      submission.user?.username ||
      "this user";

    const confirmed = window.confirm(
      `Approve this task submission?\n\nUser: ${userName}\nTask: ${
        submission.task?.title || "Unknown task"
      }\nReward: ${formatMoney(reward)}\n\nThe reward will be added to the user's earning balance.`,
    );

    if (!confirmed) return;

    try {
      setActionLoading(true);
      setMessage(null);

      const response = await fetch(
        "/api/admin/task-submissions",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            submissionId: submission.id,
            action: "approve",
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to approve submission.",
        );
      }

      setMessage({
        type: "success",
        text: `Task approved successfully. ${formatMoney(
          data.result?.reward_amount ?? reward,
        )} added to the user's earning balance.`,
      });

      setSelected(null);

      await loadSubmissions();
    } catch (error) {
      console.error(error);

      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to approve submission.",
      });
    } finally {
      setActionLoading(false);
    }
  }

  function openRejectModal(
    submission: Submission,
  ) {
    setSelected(submission);
    setRejectNote("");
    setShowRejectModal(true);
  }

  async function rejectSubmission() {
    if (!selected) return;

    try {
      setActionLoading(true);
      setMessage(null);

      const response = await fetch(
        "/api/admin/task-submissions",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            submissionId: selected.id,
            action: "reject",
            adminNote:
              rejectNote.trim() || null,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to reject submission.",
        );
      }

      setMessage({
        type: "success",
        text: "Task submission rejected successfully.",
      });

      setShowRejectModal(false);
      setSelected(null);
      setRejectNote("");

      await loadSubmissions();
    } catch (error) {
      console.error(error);

      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to reject submission.",
      });
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <AdminShell
      title="Task Submissions"
      description="Review user task proof and manage rewards"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#4f9d32]">
              Task Management
            </p>

            <h1 className="mt-1 text-2xl font-black tracking-tight text-black sm:text-3xl">
              Task Submissions
            </h1>

            <p className="mt-1 text-sm text-black/50">
              Check screenshots and approve or reject
              user submissions.
            </p>
          </div>

          <button
            type="button"
            onClick={loadSubmissions}
            disabled={loading}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-black/10 bg-white px-5 text-sm font-black text-black shadow-sm transition hover:border-black/20 hover:bg-black/[0.02] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm font-bold ${
              message.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Summary */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <SummaryCard
            label="Total"
            value={summary.total}
          />

          <SummaryCard
            label="Pending"
            value={summary.pending}
            highlight
          />

          <SummaryCard
            label="Approved"
            value={summary.approved}
          />

          <SummaryCard
            label="Rejected"
            value={summary.rejected}
          />

          <SummaryCard
            label="Approved Rewards"
            value={formatMoney(
              summary.approvedRewards,
            )}
          />
        </div>

        {/* Filters */}
        <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px_auto]">
            <div>
              <label className="mb-1.5 block text-xs font-black uppercase tracking-wide text-black/45">
                Search
              </label>

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Name, username, phone, task..."
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
                  setStatus(event.target.value)
                }
                className="h-11 w-full rounded-xl border border-black/10 bg-[#fafafa] px-3 text-sm font-bold outline-none focus:border-[#4f9d32]"
              >
                <option value="pending">
                  Pending
                </option>

                <option value="approved">
                  Approved
                </option>

                <option value="rejected">
                  Rejected
                </option>

                <option value="all">
                  All
                </option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-black uppercase tracking-wide text-black/45">
                Package
              </label>

              <select
                value={packageAmount}
                onChange={(event) =>
                  setPackageAmount(
                    event.target.value,
                  )
                }
                className="h-11 w-full rounded-xl border border-black/10 bg-[#fafafa] px-3 text-sm font-bold outline-none focus:border-[#4f9d32]"
              >
                <option value="all">
                  All Packages
                </option>

                {packageAmounts.map((amount) => (
                  <option
                    key={amount}
                    value={String(amount)}
                  >
                    {formatMoney(amount)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setStatus("pending");
                  setPackageAmount("all");
                }}
                className="h-11 w-full rounded-xl border border-black/10 bg-black px-4 text-sm font-black text-white transition hover:bg-black/85 lg:w-auto"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Pending quick info */}
        {status === "pending" &&
          pendingSubmissions.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm font-black text-amber-800">
                {pendingSubmissions.length} pending
                submission
                {pendingSubmissions.length !== 1
                  ? "s"
                  : ""}{" "}
                waiting for review.
              </p>
            </div>
          )}

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[1050px] w-full">
              <thead>
                <tr className="border-b border-black/10 bg-[#fafafa]">
                  <th className="px-5 py-4 text-left text-[11px] font-black uppercase tracking-wider text-black/45">
                    User
                  </th>

                  <th className="px-5 py-4 text-left text-[11px] font-black uppercase tracking-wider text-black/45">
                    Package
                  </th>

                  <th className="px-5 py-4 text-left text-[11px] font-black uppercase tracking-wider text-black/45">
                    Task
                  </th>

                  <th className="px-5 py-4 text-left text-[11px] font-black uppercase tracking-wider text-black/45">
                    Reward
                  </th>

                  <th className="px-5 py-4 text-left text-[11px] font-black uppercase tracking-wider text-black/45">
                    Submitted
                  </th>

                  <th className="px-5 py-4 text-left text-[11px] font-black uppercase tracking-wider text-black/45">
                    Status
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
                        Loading submissions...
                      </p>
                    </td>
                  </tr>
                ) : submissions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-16 text-center"
                    >
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-black/[0.04] text-2xl">
                        ✓
                      </div>

                      <p className="mt-4 text-base font-black text-black">
                        No submissions found
                      </p>

                      <p className="mt-1 text-sm text-black/40">
                        There are no submissions matching
                        the selected filters.
                      </p>
                    </td>
                  </tr>
                ) : (
                  submissions.map((submission) => (
                    <SubmissionRow
                      key={submission.id}
                      submission={submission}
                      actionLoading={actionLoading}
                      onView={() =>
                        setSelected(submission)
                      }
                      onApprove={() =>
                        approveSubmission(
                          submission,
                        )
                      }
                      onReject={() =>
                        openRejectModal(
                          submission,
                        )
                      }
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {selected && !showRejectModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-black/10 bg-white px-5 py-4">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-[#4f9d32]">
                  Submission Details
                </p>

                <h2 className="mt-1 text-xl font-black">
                  {selected.task?.title ||
                    "Task Submission"}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSelected(null)}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-black/[0.05] text-lg font-black hover:bg-black/10"
              >
                ×
              </button>
            </div>

            <div className="space-y-5 p-5">
              {/* User */}
              <section className="rounded-2xl border border-black/10 bg-[#fafafa] p-4">
                <h3 className="mb-3 text-sm font-black">
                  User Information
                </h3>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Info
                    label="Full Name"
                    value={
                      selected.user?.full_name ||
                      "—"
                    }
                  />

                  <Info
                    label="Username"
                    value={
                      selected.user?.username ||
                      "—"
                    }
                  />

                  <Info
                    label="Phone"
                    value={
                      selected.user?.phone ||
                      "—"
                    }
                  />

                  <Info
                    label="Referral Code"
                    value={
                      selected.user
                        ?.referral_code || "—"
                    }
                  />
                </div>
              </section>

              {/* Task */}
              <section className="rounded-2xl border border-black/10 bg-[#fafafa] p-4">
                <h3 className="mb-3 text-sm font-black">
                  Task Information
                </h3>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Info
                    label="Package"
                    value={formatMoney(
                      selected.task
                        ?.package_amount,
                    )}
                  />

                  <Info
                    label="Reward"
                    value={formatMoney(
                      selected.task
                        ?.reward_amount,
                    )}
                  />

                  <Info
                    label="Duration"
                    value={`${
                      selected.task
                        ?.duration_hours || 0
                    } hours`}
                  />

                  <Info
                    label="Screenshot Required"
                    value={
                      selected.task
                        ?.screenshot_required
                        ? "Yes"
                        : "No"
                    }
                  />
                </div>

                {selected.task?.description && (
                  <div className="mt-4">
                    <p className="text-xs font-black uppercase tracking-wide text-black/40">
                      Description
                    </p>

                    <p className="mt-1 whitespace-pre-wrap text-sm font-medium leading-6 text-black/70">
                      {
                        selected.task
                          .description
                      }
                    </p>
                  </div>
                )}

                {selected.task?.task_url && (
                  <div className="mt-4">
                    <p className="text-xs font-black uppercase tracking-wide text-black/40">
                      Task URL
                    </p>

                    <a
                      href={
                        selected.task.task_url
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 block break-all text-sm font-bold text-[#4f9d32] underline"
                    >
                      {
                        selected.task.task_url
                      }
                    </a>
                  </div>
                )}
              </section>

              {/* Submission */}
              <section className="rounded-2xl border border-black/10 bg-[#fafafa] p-4">
                <h3 className="mb-3 text-sm font-black">
                  Submission Information
                </h3>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Info
                    label="Submitted"
                    value={formatDate(
                      selected.created_at,
                    )}
                  />

                  <Info
                    label="Reviewed"
                    value={formatDate(
                      selected.reviewed_at,
                    )}
                  />

                  <Info
                    label="Status"
                    value={
                      selected.status
                    }
                  />

                  <Info
                    label="Reward Recorded"
                    value={formatMoney(
                      selected.reward_amount,
                    )}
                  />
                </div>

                {selected.admin_note && (
                  <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3">
                    <p className="text-xs font-black uppercase tracking-wide text-red-500">
                      Admin Note
                    </p>

                    <p className="mt-1 text-sm font-semibold text-red-700">
                      {selected.admin_note}
                    </p>
                  </div>
                )}
              </section>

              {/* Screenshot */}
              <section className="rounded-2xl border border-black/10 bg-[#fafafa] p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black">
                    Screenshot Proof
                  </h3>

                  {selected.screenshot_url && (
                    <a
                      href={
                        selected.screenshot_url
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-black text-[#4f9d32] underline"
                    >
                      Open Full Size
                    </a>
                  )}
                </div>

                {selected.screenshot_url ? (
                  <div className="mt-3 overflow-hidden rounded-2xl border border-black/10 bg-white">
                    <img
                      src={
                        selected.screenshot_url
                      }
                      alt="Task submission screenshot"
                      className="max-h-[520px] w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="mt-3 rounded-xl border border-dashed border-black/15 bg-white px-4 py-10 text-center">
                    <p className="text-sm font-bold text-black/40">
                      No screenshot was submitted.
                    </p>
                  </div>
                )}
              </section>

              {/* Actions */}
              {selected.status.toLowerCase() ===
                "pending" && (
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      openRejectModal(
                        selected,
                      )
                    }
                    disabled={actionLoading}
                    className="h-12 rounded-xl border border-red-200 bg-red-50 px-6 text-sm font-black text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                  >
                    Reject
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      approveSubmission(
                        selected,
                      )
                    }
                    disabled={actionLoading}
                    className="h-12 rounded-xl bg-[#4f9d32] px-6 text-sm font-black text-white transition hover:bg-[#43862a] disabled:opacity-50"
                  >
                    {actionLoading
                      ? "Processing..."
                      : `Approve & Add ${formatMoney(
                          selected.task
                            ?.reward_amount,
                        )}`}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {selected && showRejectModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-red-600">
                  Reject Submission
                </p>

                <h2 className="mt-1 text-xl font-black text-black">
                  Are you sure?
                </h2>

                <p className="mt-1 text-sm text-black/50">
                  This submission will be marked as
                  rejected.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowRejectModal(false)
                }
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/[0.05] text-lg font-black"
              >
                ×
              </button>
            </div>

            <div className="mt-5 rounded-2xl bg-[#fafafa] p-4">
              <p className="text-sm font-black">
                {selected.user?.full_name ||
                  selected.user?.username ||
                  "Unknown user"}
              </p>

              <p className="mt-1 text-sm text-black/50">
                {selected.task?.title ||
                  "Unknown task"}
              </p>
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-xs font-black uppercase tracking-wide text-black/45">
                Admin Note
              </label>

              <textarea
                value={rejectNote}
                onChange={(event) =>
                  setRejectNote(
                    event.target.value,
                  )
                }
                rows={4}
                placeholder="Why is this submission being rejected?"
                className="w-full resize-none rounded-2xl border border-black/10 bg-[#fafafa] p-4 text-sm font-semibold outline-none focus:border-red-400 focus:bg-white"
              />
            </div>

            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() =>
                  setShowRejectModal(false)
                }
                disabled={actionLoading}
                className="h-11 rounded-xl border border-black/10 px-5 text-sm font-black"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={rejectSubmission}
                disabled={actionLoading}
                className="h-11 rounded-xl bg-red-600 px-5 text-sm font-black text-white hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading
                  ? "Rejecting..."
                  : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

// =========================================================
// COMPONENTS
// =========================================================

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

function SubmissionRow({
  submission,
  actionLoading,
  onView,
  onApprove,
  onReject,
}: {
  submission: Submission;
  actionLoading: boolean;
  onView: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const isPending =
    submission.status.toLowerCase() ===
    "pending";

  const userName =
    submission.user?.full_name ||
    submission.user?.username ||
    "Unknown User";

  return (
    <tr className="border-b border-black/[0.06] last:border-b-0 hover:bg-black/[0.015]">
      <td className="px-5 py-4">
        <button
          type="button"
          onClick={onView}
          className="text-left"
        >
          <p className="max-w-[190px] truncate text-sm font-black text-black hover:text-[#4f9d32]">
            {userName}
          </p>

          <p className="mt-0.5 text-xs font-semibold text-black/40">
            {submission.user?.username
              ? `@${submission.user.username}`
              : submission.user?.phone ||
                "No phone"}
          </p>
        </button>
      </td>

      <td className="px-5 py-4">
        <div>
          <p className="text-sm font-black">
            {formatMoney(
              submission.package_amount,
            )}
          </p>

          <p
            className={`mt-1 text-[10px] font-black ${
              submission.user_has_active_matching_package
                ? "text-emerald-600"
                : "text-black/35"
            }`}
          >
            {submission.user_has_active_matching_package
              ? "Active package"
              : "Package not active"}
          </p>
        </div>
      </td>

      <td className="px-5 py-4">
        <button
          type="button"
          onClick={onView}
          className="max-w-[240px] text-left"
        >
          <p className="truncate text-sm font-black hover:text-[#4f9d32]">
            {submission.task?.title ||
              "Unknown task"}
          </p>

          <p className="mt-1 text-xs font-semibold text-black/40">
            {submission.task
              ? `${submission.task.duration_hours}h duration`
              : "Task unavailable"}
          </p>
        </button>
      </td>

      <td className="px-5 py-4">
        <p className="text-sm font-black text-[#4f9d32]">
          {formatMoney(
            submission.task?.reward_amount ??
              submission.reward_amount,
          )}
        </p>
      </td>

      <td className="px-5 py-4">
        <p className="text-xs font-bold text-black/60">
          {formatDate(
            submission.created_at,
          )}
        </p>
      </td>

      <td className="px-5 py-4">
        <span
          className={`inline-flex rounded-full px-3 py-1 text-[11px] font-black capitalize ring-1 ${getStatusClass(
            submission.status,
          )}`}
        >
          {submission.status}
        </span>
      </td>

      <td className="px-5 py-4">
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onView}
            className="rounded-lg border border-black/10 px-3 py-2 text-xs font-black hover:bg-black/[0.04]"
          >
            View
          </button>

          {isPending && (
            <>
              <button
                type="button"
                onClick={onReject}
                disabled={actionLoading}
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-100 disabled:opacity-50"
              >
                Reject
              </button>

              <button
                type="button"
                onClick={onApprove}
                disabled={actionLoading}
                className="rounded-lg bg-[#4f9d32] px-3 py-2 text-xs font-black text-white hover:bg-[#43862a] disabled:opacity-50"
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