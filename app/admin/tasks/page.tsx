"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import AdminShell from "@/components/admin/AdminShell";

type Task = {
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
  expires_at: string | null;
  updated_at: string;
  available_from: string | null;
};

type Summary = {
  total: number;
  active: number;
  inactive: number;
  totalRewards: number;
};

const emptySummary: Summary = {
  total: 0,
  active: 0,
  inactive: 0,
  totalRewards: 0,
};

function money(
  value: number
) {
  return `৳${Number(
    value || 0
  ).toLocaleString("en-BD", {
    maximumFractionDigits: 2,
  })}`;
}

function dateTime(
  value: string | null
) {
  if (!value) return "—";

  return new Date(
    value
  ).toLocaleString("en-BD", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function TasksPage() {
  const [tasks, setTasks] =
    useState<Task[]>([]);

  const [summary, setSummary] =
    useState<Summary>(
      emptySummary
    );

  const [
    packageAmounts,
    setPackageAmounts,
  ] = useState<number[]>([]);

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("all");

  const [
    packageFilter,
    setPackageFilter,
  ] = useState("all");

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  const [
    showForm,
    setShowForm,
  ] = useState(false);

  const [
    editingTask,
    setEditingTask,
  ] = useState<Task | null>(
    null
  );

  const [
    selectedTask,
    setSelectedTask,
  ] = useState<Task | null>(
    null
  );

  const [
    form,
    setForm,
  ] = useState({
    packageAmount: "",
    title: "",
    description: "",
    taskUrl: "",
    rewardAmount: "",
    durationHours: "24",
    screenshotRequired: true,
    isActive: true,
    availableFrom: "",
    expiresAt: "",
  });

  const loadTasks =
    useCallback(async () => {
      try {
        setLoading(true);
        setError("");

        const params =
          new URLSearchParams();

        params.set(
          "status",
          statusFilter
        );

        params.set(
          "packageAmount",
          packageFilter
        );

        if (search.trim()) {
          params.set(
            "search",
            search.trim()
          );
        }

        const response =
          await fetch(
            `/api/admin/tasks?${params.toString()}`,
            {
              cache: "no-store",
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Failed to load tasks."
          );
        }

        setTasks(
          data.tasks ?? []
        );

        setSummary(
          data.summary ??
            emptySummary
        );

        setPackageAmounts(
          data.packageAmounts ??
            []
        );
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load tasks."
        );
      } finally {
        setLoading(false);
      }
    }, [
      statusFilter,
      packageFilter,
      search,
    ]);

  useEffect(() => {
    const timer =
      window.setTimeout(
        () => {
          loadTasks();
        },
        250
      );

    return () =>
      window.clearTimeout(
        timer
      );
  }, [loadTasks]);

  function resetForm() {
    setForm({
      packageAmount: "",
      title: "",
      description: "",
      taskUrl: "",
      rewardAmount: "",
      durationHours: "24",
      screenshotRequired: true,
      isActive: true,
      availableFrom: "",
      expiresAt: "",
    });
  }

  function openCreate() {
    resetForm();
    setEditingTask(null);
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function openEdit(
    task: Task
  ) {
    setEditingTask(task);

    setForm({
      packageAmount:
        String(
          task.package_amount
        ),

      title:
        task.title,

      description:
        task.description ??
        "",

      taskUrl:
        task.task_url,

      rewardAmount:
        String(
          task.reward_amount
        ),

      durationHours:
        String(
          task.duration_hours
        ),

      screenshotRequired:
        task.screenshot_required,

      isActive:
        task.is_active,

      availableFrom:
        toDateTimeLocal(
          task.available_from
        ),

      expiresAt:
        toDateTimeLocal(
          task.expires_at
        ),
    });

    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function toDateTimeLocal(
    value: string | null
  ) {
    if (!value) return "";

    const date =
      new Date(value);

    const pad = (
      n: number
    ) =>
      String(n).padStart(
        2,
        "0"
      );

    return `${date.getFullYear()}-${pad(
      date.getMonth() + 1
    )}-${pad(
      date.getDate()
    )}T${pad(
      date.getHours()
    )}:${pad(
      date.getMinutes()
    )}`;
  }

  function toISOStringOrNull(
    value: string
  ) {
    if (!value) return null;

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return null;
    }

    return date.toISOString();
  }

  async function saveTask() {
    const packageAmount =
      Number(
        form.packageAmount
      );

    const rewardAmount =
      Number(
        form.rewardAmount
      );

    const durationHours =
      Number(
        form.durationHours
      );

    if (
      !Number.isFinite(
        packageAmount
      ) ||
      packageAmount <= 0
    ) {
      setError(
        "Enter a valid package amount."
      );
      return;
    }

    if (!form.title.trim()) {
      setError(
        "Task title is required."
      );
      return;
    }

    if (!form.taskUrl.trim()) {
      setError(
        "Task URL is required."
      );
      return;
    }

    if (
      !Number.isFinite(
        rewardAmount
      ) ||
      rewardAmount < 0
    ) {
      setError(
        "Enter a valid reward amount."
      );
      return;
    }

    if (
      !Number.isFinite(
        durationHours
      ) ||
      durationHours <= 0
    ) {
      setError(
        "Duration must be greater than 0."
      );
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        packageAmount,
        title:
          form.title.trim(),

        description:
          form.description.trim(),

        taskUrl:
          form.taskUrl.trim(),

        rewardAmount,

        durationHours,

        screenshotRequired:
          form.screenshotRequired,

        isActive:
          form.isActive,

        availableFrom:
          toISOStringOrNull(
            form.availableFrom
          ),

        expiresAt:
          toISOStringOrNull(
            form.expiresAt
          ),
      };

      const response =
        await fetch(
          "/api/admin/tasks",
          {
            method:
              editingTask
                ? "PATCH"
                : "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify(
              editingTask
                ? {
                    ...payload,
                    taskId:
                      editingTask.id,
                  }
                : payload
            ),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to save task."
        );
      }

      setSuccess(
        editingTask
          ? "Task updated successfully."
          : "Task created successfully."
      );

      setShowForm(false);
      setEditingTask(null);
      resetForm();

      await loadTasks();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to save task."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleTask(
    task: Task
  ) {
    try {
      setError("");
      setSuccess("");

      const response =
        await fetch(
          "/api/admin/tasks",
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              taskId: task.id,
              isActive:
                !task.is_active,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to update task."
        );
      }

      setSuccess(
        !task.is_active
          ? "Task activated."
          : "Task deactivated."
      );

      await loadTasks();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to update task."
      );
    }
  }

  async function deleteTask(
    task: Task
  ) {
    const confirmed =
      window.confirm(
        `Delete "${task.title}"?`
      );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      const response =
        await fetch(
          `/api/admin/tasks?taskId=${encodeURIComponent(
            task.id
          )}`,
          {
            method: "DELETE",
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to delete task."
        );
      }

      setSuccess(
        "Task deleted successfully."
      );

      setSelectedTask(null);

      await loadTasks();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete task."
      );
    }
  }

  return (
    <AdminShell
      title="Tasks"
      description="Create and manage package-based earning tasks."
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-black sm:text-3xl">
              Tasks
            </h1>

            <p className="mt-1 text-sm font-medium text-black/45">
              Tasks are shown to users according to their active package.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                loadTasks()
              }
              disabled={loading}
              className="h-11 rounded-xl border border-black/10 bg-white px-4 text-sm font-black text-black/65 shadow-sm hover:bg-black/[0.03] disabled:opacity-50"
            >
              Refresh
            </button>

            <button
              type="button"
              onClick={openCreate}
              className="h-11 rounded-xl bg-[#4f9d32] px-5 text-sm font-black text-white shadow-sm hover:bg-[#43872b]"
            >
              + Create Task
            </button>
          </div>
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

        {/* Summary */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Total Tasks"
            value={summary.total}
            description="Current filter"
            icon="✓"
          />

          <SummaryCard
            title="Active Tasks"
            value={summary.active}
            description="Available to users"
            icon="●"
            accent="green"
          />

          <SummaryCard
            title="Inactive Tasks"
            value={summary.inactive}
            description="Currently disabled"
            icon="○"
            accent="gray"
          />

          <SummaryCard
            title="Total Rewards"
            value={money(
              summary.totalRewards
            )}
            description="Sum of listed task rewards"
            icon="৳"
            accent="amber"
          />
        </div>

        {/* Filters */}
        <div className="rounded-2xl border border-black/[0.07] bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search task..."
              className="h-11 rounded-xl border border-black/10 bg-[#f8faf8] px-4 text-sm font-semibold outline-none focus:border-[#4f9d32] focus:ring-4 focus:ring-[#7ed957]/15"
            />

            <select
              value={packageFilter}
              onChange={(event) =>
                setPackageFilter(
                  event.target.value
                )
              }
              className="h-11 rounded-xl border border-black/10 bg-[#f8faf8] px-4 text-sm font-bold outline-none focus:border-[#4f9d32]"
            >
              <option value="all">
                All Packages
              </option>

              {packageAmounts.map(
                (amount) => (
                  <option
                    key={amount}
                    value={amount}
                  >
                    {money(amount)}
                  </option>
                )
              )}
            </select>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value
                )
              }
              className="h-11 rounded-xl border border-black/10 bg-[#f8faf8] px-4 text-sm font-bold outline-none focus:border-[#4f9d32]"
            >
              <option value="all">
                All Status
              </option>

              <option value="active">
                Active
              </option>

              <option value="inactive">
                Inactive
              </option>
            </select>
          </div>
        </div>

        {/* Tasks */}
        <div className="overflow-hidden rounded-2xl border border-black/[0.07] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[1200px] w-full">
              <thead>
                <tr className="border-b border-black/[0.06] bg-[#f8faf8] text-left">
                  <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-black/35">
                    Task
                  </th>

                  <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-black/35">
                    Package
                  </th>

                  <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-black/35">
                    Reward
                  </th>

                  <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-black/35">
                    Duration
                  </th>

                  <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-black/35">
                    Schedule
                  </th>

                  <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-black/35">
                    Status
                  </th>

                  <th className="px-5 py-4 text-right text-xs font-black uppercase tracking-wider text-black/35">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <LoadingRows />
                ) : tasks.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-16 text-center"
                    >
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-black/[0.04] text-2xl">
                        ✓
                      </div>

                      <p className="mt-4 text-base font-black text-black/70">
                        No tasks found
                      </p>

                      <p className="mt-1 text-sm font-medium text-black/40">
                        Create a task or change the filters.
                      </p>
                    </td>
                  </tr>
                ) : (
                  tasks.map(
                    (task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        onView={() =>
                          setSelectedTask(
                            task
                          )
                        }
                        onEdit={() =>
                          openEdit(
                            task
                          )
                        }
                        onToggle={() =>
                          toggleTask(
                            task
                          )
                        }
                        onDelete={() =>
                          deleteTask(
                            task
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

      {/* Create / Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
          <div className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-black/[0.06] bg-white px-6 py-5">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-black/35">
                  Task Management
                </p>

                <h2 className="mt-1 text-xl font-black text-black">
                  {editingTask
                    ? "Edit Task"
                    : "Create Task"}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  !saving &&
                  setShowForm(false)
                }
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-black/[0.05] text-xl font-bold text-black/60"
              >
                ×
              </button>
            </div>

            <div className="space-y-5 p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field
                  label="Package Amount"
                  value={
                    form.packageAmount
                  }
                  onChange={(value) =>
                    setForm({
                      ...form,
                      packageAmount:
                        value,
                    })
                  }
                  placeholder="Example: 2000"
                  type="number"
                />

                <Field
                  label="Reward Amount"
                  value={
                    form.rewardAmount
                  }
                  onChange={(value) =>
                    setForm({
                      ...form,
                      rewardAmount:
                        value,
                    })
                  }
                  placeholder="Example: 50"
                  type="number"
                />

                <Field
                  label="Duration (Hours)"
                  value={
                    form.durationHours
                  }
                  onChange={(value) =>
                    setForm({
                      ...form,
                      durationHours:
                        value,
                    })
                  }
                  placeholder="24"
                  type="number"
                />

                <Field
                  label="Task URL"
                  value={
                    form.taskUrl
                  }
                  onChange={(value) =>
                    setForm({
                      ...form,
                      taskUrl:
                        value,
                    })
                  }
                  placeholder="https://t.me/..."
                />
              </div>

              <Field
                label="Task Title"
                value={form.title}
                onChange={(value) =>
                  setForm({
                    ...form,
                    title: value,
                  })
                }
                placeholder="Example: Join Telegram Channel"
              />

              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-wider text-black/40">
                  Description
                </label>

                <textarea
                  value={
                    form.description
                  }
                  onChange={(event) =>
                    setForm({
                      ...form,
                      description:
                        event.target
                          .value,
                    })
                  }
                  rows={4}
                  placeholder="Explain exactly what the user needs to do."
                  className="w-full rounded-xl border border-black/10 bg-[#f8faf8] px-4 py-3 text-sm font-semibold outline-none focus:border-[#4f9d32] focus:bg-white focus:ring-4 focus:ring-[#7ed957]/15"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field
                  label="Available From"
                  value={
                    form.availableFrom
                  }
                  onChange={(value) =>
                    setForm({
                      ...form,
                      availableFrom:
                        value,
                    })
                  }
                  type="datetime-local"
                  placeholder=""
                />

                <Field
                  label="Expires At"
                  value={
                    form.expiresAt
                  }
                  onChange={(value) =>
                    setForm({
                      ...form,
                      expiresAt:
                        value,
                    })
                  }
                  type="datetime-local"
                  placeholder=""
                />
              </div>

              <div className="space-y-3 rounded-2xl bg-[#f8faf8] p-4">
                <Toggle
                  label="Require Screenshot"
                  description="User must upload proof before submission."
                  checked={
                    form.screenshotRequired
                  }
                  onChange={(checked) =>
                    setForm({
                      ...form,
                      screenshotRequired:
                        checked,
                    })
                  }
                />

                <Toggle
                  label="Task Active"
                  description="Active tasks can be shown to matching users."
                  checked={
                    form.isActive
                  }
                  onChange={(checked) =>
                    setForm({
                      ...form,
                      isActive:
                        checked,
                    })
                  }
                />
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-black/[0.06] pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() =>
                    !saving &&
                    setShowForm(false)
                  }
                  disabled={saving}
                  className="h-11 rounded-xl border border-black/10 px-5 text-sm font-black text-black/60"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={saveTask}
                  disabled={saving}
                  className="h-11 rounded-xl bg-[#4f9d32] px-6 text-sm font-black text-white disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingTask
                    ? "Update Task"
                    : "Create Task"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-black/[0.06] px-6 py-5">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-black/35">
                  Task Details
                </p>

                <h2 className="mt-1 text-xl font-black text-black">
                  {selectedTask.title}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedTask(
                    null
                  )
                }
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-black/[0.05] text-xl font-bold text-black/60"
              >
                ×
              </button>
            </div>

            <div className="space-y-5 p-6">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Detail
                  label="Package"
                  value={money(
                    selectedTask.package_amount
                  )}
                />

                <Detail
                  label="Reward"
                  value={money(
                    selectedTask.reward_amount
                  )}
                />

                <Detail
                  label="Duration"
                  value={`${selectedTask.duration_hours}h`}
                />

                <Detail
                  label="Screenshot"
                  value={
                    selectedTask.screenshot_required
                      ? "Required"
                      : "Optional"
                  }
                />
              </div>

              <div className="rounded-2xl bg-[#f8faf8] p-4">
                <p className="text-xs font-black uppercase tracking-wider text-black/35">
                  Description
                </p>

                <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-black/65">
                  {selectedTask.description ||
                    "No description provided."}
                </p>
              </div>

              <div className="rounded-2xl border border-black/[0.06] p-4">
                <p className="text-xs font-black uppercase tracking-wider text-black/35">
                  Task URL
                </p>

                <a
                  href={
                    selectedTask.task_url
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 block break-all text-sm font-bold text-[#4f9d32] hover:underline"
                >
                  {selectedTask.task_url}
                </a>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Detail
                  label="Available From"
                  value={dateTime(
                    selectedTask.available_from
                  )}
                />

                <Detail
                  label="Expires At"
                  value={dateTime(
                    selectedTask.expires_at
                  )}
                />

                <Detail
                  label="Created"
                  value={dateTime(
                    selectedTask.created_at
                  )}
                />

                <Detail
                  label="Status"
                  value={
                    selectedTask.is_active
                      ? "Active"
                      : "Inactive"
                  }
                />
              </div>

              <div className="flex flex-col gap-3 border-t border-black/[0.06] pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() =>
                    deleteTask(
                      selectedTask
                    )
                  }
                  className="h-11 rounded-xl border border-red-200 bg-red-50 px-5 text-sm font-black text-red-700"
                >
                  Delete
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedTask(
                      null
                    );
                    openEdit(
                      selectedTask
                    );
                  }}
                  className="h-11 rounded-xl border border-black/10 px-5 text-sm font-black text-black/65"
                >
                  Edit
                </button>

                <button
                  type="button"
                  onClick={() =>
                    toggleTask(
                      selectedTask
                    )
                  }
                  className="h-11 rounded-xl bg-black px-5 text-sm font-black text-white"
                >
                  {selectedTask.is_active
                    ? "Deactivate"
                    : "Activate"}
                </button>
              </div>
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
  value: number | string;
  description: string;
  icon: string;
  accent?:
    | "black"
    | "green"
    | "gray"
    | "amber";
}) {
  const classes = {
    black:
      "bg-black text-white",
    green:
      "bg-emerald-100 text-emerald-700",
    gray:
      "bg-black/[0.06] text-black/50",
    amber:
      "bg-amber-100 text-amber-700",
  };

  return (
    <div className="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-bold text-black/45">
            {title}
          </p>

          <p className="mt-2 text-2xl font-black text-black">
            {typeof value ===
            "number"
              ? value.toLocaleString(
                  "en-BD"
                )
              : value}
          </p>

          <p className="mt-1 text-xs font-bold text-black/35">
            {description}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl text-lg font-black ${classes[accent]}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function TaskRow({
  task,
  onView,
  onEdit,
  onToggle,
  onDelete,
}: {
  task: Task;
  onView: () => void;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <tr className="border-b border-black/[0.05] last:border-0 hover:bg-black/[0.012]">
      <td className="px-5 py-4">
        <button
          type="button"
          onClick={onView}
          className="text-left"
        >
          <p className="max-w-[280px] truncate text-sm font-black text-black hover:underline">
            {task.title}
          </p>

          <p className="mt-1 max-w-[300px] truncate text-xs font-semibold text-black/35">
            {task.description ||
              "No description"}
          </p>
        </button>
      </td>

      <td className="px-5 py-4">
        <span className="rounded-full bg-black/[0.05] px-3 py-1.5 text-xs font-black text-black/65">
          {money(
            task.package_amount
          )}
        </span>
      </td>

      <td className="px-5 py-4">
        <p className="text-sm font-black text-[#4f9d32]">
          {money(
            task.reward_amount
          )}
        </p>
      </td>

      <td className="px-5 py-4 text-sm font-bold text-black/55">
        {task.duration_hours} hours
      </td>

      <td className="px-5 py-4">
        <p className="text-xs font-semibold text-black/50">
          From:{" "}
          {dateTime(
            task.available_from
          )}
        </p>

        <p className="mt-1 text-xs font-semibold text-black/40">
          Until:{" "}
          {dateTime(
            task.expires_at
          )}
        </p>
      </td>

      <td className="px-5 py-4">
        <span
          className={`rounded-full px-3 py-1.5 text-xs font-black ${
            task.is_active
              ? "bg-emerald-50 text-emerald-700"
              : "bg-black/[0.05] text-black/45"
          }`}
        >
          {task.is_active
            ? "Active"
            : "Inactive"}
        </span>
      </td>

      <td className="px-5 py-4">
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onView}
            className="rounded-lg border border-black/10 px-3 py-2 text-xs font-black text-black/60 hover:bg-black/[0.04]"
          >
            View
          </button>

          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg bg-black px-3 py-2 text-xs font-black text-white"
          >
            Edit
          </button>

          <button
            type="button"
            onClick={onToggle}
            className={`rounded-lg px-3 py-2 text-xs font-black ${
              task.is_active
                ? "bg-amber-50 text-amber-700"
                : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {task.is_active
              ? "Off"
              : "On"}
          </button>
        </div>
      </td>
    </tr>
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
  placeholder: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-black uppercase tracking-wider text-black/40">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-black/10 bg-[#f8faf8] px-4 text-sm font-semibold text-black outline-none placeholder:text-black/30 focus:border-[#4f9d32] focus:bg-white focus:ring-4 focus:ring-[#7ed957]/15"
      />
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (
    checked: boolean
  ) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4">
      <div>
        <p className="text-sm font-black text-black">
          {label}
        </p>

        <p className="mt-0.5 text-xs font-semibold text-black/40">
          {description}
        </p>
      </div>

      <button
        type="button"
        onClick={() =>
          onChange(!checked)
        }
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${
          checked
            ? "bg-[#4f9d32]"
            : "bg-black/15"
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${
            checked
              ? "left-6"
              : "left-1"
          }`}
        />
      </button>
    </label>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-[#f8faf8] p-3">
      <p className="text-[10px] font-black uppercase tracking-wider text-black/30">
        {label}
      </p>

      <p className="mt-1 text-sm font-black text-black/70">
        {value}
      </p>
    </div>
  );
}

function LoadingRows() {
  return (
    <>
      {Array.from({
        length: 6,
      }).map((_, row) => (
        <tr
          key={row}
          className="border-b border-black/[0.05]"
        >
          {Array.from({
            length: 7,
          }).map((_, cell) => (
            <td
              key={cell}
              className="px-5 py-5"
            >
              <div className="h-4 animate-pulse rounded-lg bg-black/[0.06]" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}