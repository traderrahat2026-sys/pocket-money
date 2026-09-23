"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import AdminShell from "@/components/admin/AdminShell";

type PackageActivation = {
  id: string;
  user_id: string;
  package_amount: number;
  is_active: boolean;
  activated_at: string | null;
  deactivated_at: string | null;
  active_from: string | null;
  created_at: string | null;
};

type PackageTask = {
  id: string;
  package_amount: number;
  title: string;
  description: string | null;
  task_url: string | null;
  reward_amount: number;
  duration_hours: number;
  screenshot_required: boolean;
  is_active: boolean;
  created_at: string | null;
  expires_at: string | null;
  updated_at: string | null;
  available_from: string | null;
};

type PackageImage = {
  id: string;
  package_amount: number;
  image_url: string;
  storage_path: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type PackageItem = {
  package_amount: number;
  packageAmount: number;

  active: boolean;

  activeUsers: number;
  inactiveUsers: number;
  totalUsers: number;
  totalActivations: number;

  activeTasks: number;
  inactiveTasks: number;
  totalTasks: number;

  totalRewards: number;

  imagesCount: number;

  images: PackageImage[];
  tasks: PackageTask[];

  latestActivation: PackageActivation | null;
};

type Summary = {
  totalPackages: number;
  totalPackageUsers: number;
  activePackageUsers: number;
  totalTasks: number;
  activeTasks: number;
  totalRewards: number;
};

const emptySummary: Summary = {
  totalPackages: 0,
  totalPackageUsers: 0,
  activePackageUsers: 0,
  totalTasks: 0,
  activeTasks: 0,
  totalRewards: 0,
};

function safeNumber(value: unknown): number {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
}

function formatNumber(value: unknown): string {
  return safeNumber(value).toLocaleString(
    "en-BD"
  );
}

function money(value: unknown): string {
  return `৳${safeNumber(value).toLocaleString(
    "en-BD",
    {
      maximumFractionDigits: 2,
    }
  )}`;
}

function dateTime(
  value: string | null | undefined
) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString(
    "en-BD",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  );
}

function normalizeSummary(
  summary: Partial<Summary> | null | undefined
): Summary {
  return {
    totalPackages: safeNumber(
      summary?.totalPackages
    ),

    totalPackageUsers: safeNumber(
      summary?.totalPackageUsers
    ),

    activePackageUsers: safeNumber(
      summary?.activePackageUsers
    ),

    totalTasks: safeNumber(
      summary?.totalTasks
    ),

    activeTasks: safeNumber(
      summary?.activeTasks
    ),

    totalRewards: safeNumber(
      summary?.totalRewards
    ),
  };
}

function normalizePackage(
  item: Partial<PackageItem>
): PackageItem {
  const amount = safeNumber(
    item.package_amount ??
      item.packageAmount
  );

  return {
    package_amount: amount,

    packageAmount: amount,

    active:
      item.active === true,

    activeUsers: safeNumber(
      item.activeUsers
    ),

    inactiveUsers: safeNumber(
      item.inactiveUsers
    ),

    totalUsers: safeNumber(
      item.totalUsers
    ),

    totalActivations: safeNumber(
      item.totalActivations ??
        item.totalUsers
    ),

    activeTasks: safeNumber(
      item.activeTasks
    ),

    inactiveTasks: safeNumber(
      item.inactiveTasks
    ),

    totalTasks: safeNumber(
      item.totalTasks
    ),

    totalRewards: safeNumber(
      item.totalRewards
    ),

    imagesCount: safeNumber(
      item.imagesCount
    ),

    images: Array.isArray(
      item.images
    )
      ? (item.images as PackageImage[])
      : [],

    tasks: Array.isArray(
      item.tasks
    )
      ? (item.tasks as PackageTask[])
      : [],

    latestActivation:
      item.latestActivation ?? null,
  };
}

export default function PackagesPage() {
  const [
    packages,
    setPackages,
  ] = useState<PackageItem[]>([]);

  const [
    summary,
    setSummary,
  ] = useState<Summary>(
    emptySummary
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  const [
    showAdd,
    setShowAdd,
  ] = useState(false);

  const [
    selected,
    setSelected,
  ] = useState<PackageItem | null>(
    null
  );

  const [
    amount,
    setAmount,
  ] = useState("");

  const [
    imageUrl,
    setImageUrl,
  ] = useState("");

  const [
    storagePath,
    setStoragePath,
  ] = useState("");

  const [
    saving,
    setSaving,
  ] = useState(false);

  const loadPackages =
    useCallback(async () => {
      try {
        setLoading(true);
        setError("");

        const response =
          await fetch(
            "/api/admin/packages",
            {
              method: "GET",
              cache: "no-store",
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error ||
              "Failed to load packages."
          );
        }

        const rawPackages =
          Array.isArray(
            data?.packages
          )
            ? data.packages
            : [];

        const normalizedPackages =
          rawPackages.map(
            (
              item: Partial<PackageItem>
            ) =>
              normalizePackage(
                item
              )
          );

        setPackages(
          normalizedPackages
        );

        setSummary(
          normalizeSummary(
            data?.summary
          )
        );
      } catch (err) {
        console.error(
          "Packages page load error:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load packages."
        );

        setPackages([]);
        setSummary(
          emptySummary
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    loadPackages();
  }, [loadPackages]);

  function resetAddForm() {
    setAmount("");
    setImageUrl("");
    setStoragePath("");
  }

  async function addPackage() {
    const packageAmount =
      Number(amount);

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

    if (!imageUrl.trim()) {
      setError(
        "Enter the package image URL."
      );
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response =
        await fetch(
          "/api/admin/packages",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              package_amount:
                packageAmount,

              image_url:
                imageUrl.trim(),

              storage_path:
                storagePath.trim(),
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to add package image."
        );
      }

      setSuccess(
        `${money(
          packageAmount
        )} package image added successfully.`
      );

      resetAddForm();
      setShowAdd(false);

      await loadPackages();
    } catch (err) {
      console.error(
        "Add package error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to add package image."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteImage(
    imageId: string,
    packageAmount: number
  ) {
    const confirmed =
      window.confirm(
        `Delete the image for ${money(
          packageAmount
        )} package?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setSuccess("");

      const response =
        await fetch(
          `/api/admin/packages?id=${encodeURIComponent(
            imageId
          )}`,
          {
            method: "DELETE",
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to delete package image."
        );
      }

      setSuccess(
        "Package image deleted successfully."
      );

      setSelected(null);

      await loadPackages();
    } catch (err) {
      console.error(
        "Delete package image error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete package image."
      );
    }
  }

  return (
    <AdminShell
      title="Packages"
      description="Manage package amounts, package images and active package users."
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-black sm:text-3xl">
              Packages
            </h1>

            <p className="mt-1 text-sm font-medium text-black/45">
              Monitor real package activations, tasks and package images.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                loadPackages()
              }
              disabled={loading}
              className="h-11 rounded-xl border border-black/10 bg-white px-4 text-sm font-black text-black/70 shadow-sm transition hover:bg-black/[0.03] disabled:opacity-50"
            >
              {loading
                ? "Refreshing..."
                : "Refresh"}
            </button>

            <button
              type="button"
              onClick={() => {
                setError("");
                setSuccess("");
                resetAddForm();
                setShowAdd(true);
              }}
              className="h-11 rounded-xl bg-[#4f9d32] px-5 text-sm font-black text-white shadow-sm transition hover:bg-[#43872b]"
            >
              + Add Package Image
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
            title="Total Packages"
            value={
              summary.totalPackages
            }
            description="Unique package amounts"
            icon="▣"
          />

          <SummaryCard
            title="Active Package Users"
            value={
              summary.activePackageUsers
            }
            description="Currently active"
            icon="●"
            accent="green"
          />

          <SummaryCard
            title="Total Activations"
            value={
              summary.totalPackageUsers
            }
            description="Active + inactive"
            icon="↗"
            accent="blue"
          />

          <SummaryCard
            title="Active Tasks"
            value={
              summary.activeTasks
            }
            description={`${formatNumber(
              summary.totalTasks
            )} total tasks`}
            icon="✓"
            accent="purple"
          />
        </div>

        {/* Secondary Summary */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <InfoCard
            title="Total Tasks"
            value={formatNumber(
              summary.totalTasks
            )}
            description="All package tasks"
          />

          <InfoCard
            title="Active Tasks"
            value={formatNumber(
              summary.activeTasks
            )}
            description="Currently active tasks"
          />

          <InfoCard
            title="Task Rewards"
            value={money(
              summary.totalRewards
            )}
            description="Combined configured rewards"
          />
        </div>

        {/* Package Grid */}
        {loading ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({
              length: 6,
            }).map((_, index) => (
              <LoadingCard
                key={index}
              />
            ))}
          </div>
        ) : packages.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-black/10 bg-white px-6 py-20 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-black/[0.04] text-2xl">
              ▣
            </div>

            <h2 className="mt-5 text-lg font-black text-black">
              No packages found
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-black/40">
              No package records currently exist in the database. Add a package image or activate a package to create package data.
            </p>

            <button
              type="button"
              onClick={() => {
                setError("");
                setSuccess("");
                resetAddForm();
                setShowAdd(true);
              }}
              className="mt-5 rounded-xl bg-[#4f9d32] px-5 py-3 text-sm font-black text-white"
            >
              Add First Package
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {packages.map(
              (item) => (
                <PackageCard
                  key={
                    item.package_amount
                  }
                  item={item}
                  onView={() =>
                    setSelected(
                      item
                    )
                  }
                />
              )
            )}
          </div>
        )}
      </div>

      {/* Add Package Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-black/[0.06] px-6 py-5">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-black/35">
                  Package Management
                </p>

                <h2 className="mt-1 text-xl font-black text-black">
                  Add Package Image
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  !saving &&
                  setShowAdd(false)
                }
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-black/[0.05] text-xl font-bold text-black/60 hover:bg-black/10"
              >
                ×
              </button>
            </div>

            <div className="space-y-5 p-6">
              <Field
                label="Package Amount"
                placeholder="Example: 2000"
                value={amount}
                onChange={setAmount}
                type="number"
              />

              <Field
                label="Image URL"
                placeholder="https://..."
                value={imageUrl}
                onChange={setImageUrl}
              />

              <Field
                label="Storage Path"
                placeholder="Optional"
                value={storagePath}
                onChange={setStoragePath}
              />

              {imageUrl && (
                <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-[#f8faf8]">
                  <div className="aspect-video w-full">
                    <img
                      src={imageUrl}
                      alt="Package preview"
                      className="h-full w-full object-cover"
                      onError={(
                        event
                      ) => {
                        event.currentTarget.style.display =
                          "none";
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() =>
                    !saving &&
                    setShowAdd(false)
                  }
                  disabled={saving}
                  className="h-11 rounded-xl border border-black/10 px-5 text-sm font-black text-black/60"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={
                    addPackage
                  }
                  disabled={saving}
                  className="h-11 rounded-xl bg-[#4f9d32] px-5 text-sm font-black text-white disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : "Save Package Image"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Package Details Modal */}
      {selected && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-black/[0.06] bg-white px-6 py-5">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-black/35">
                  Package Details
                </p>

                <h2 className="mt-1 text-2xl font-black text-black">
                  {money(
                    selected.package_amount
                  )}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelected(null)
                }
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-black/[0.05] text-xl font-bold text-black/60"
              >
                ×
              </button>
            </div>

            <div className="space-y-6 p-6">
              {/* Package stats */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <DetailCard
                  title="Active Users"
                  value={
                    selected.activeUsers
                  }
                />

                <DetailCard
                  title="Total Activations"
                  value={
                    selected.totalUsers
                  }
                />

                <DetailCard
                  title="Active Tasks"
                  value={
                    selected.activeTasks
                  }
                />

                <DetailCard
                  title="Total Tasks"
                  value={
                    selected.totalTasks
                  }
                />
              </div>

              {/* Package image */}
              {selected.images.length >
                0 ? (
                <div>
                  <h3 className="text-base font-black text-black">
                    Package Images
                  </h3>

                  <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {selected.images.map(
                      (image) => (
                        <div
                          key={
                            image.id
                          }
                          className="overflow-hidden rounded-2xl border border-black/[0.07]"
                        >
                          <div className="aspect-video bg-[#f3f5f3]">
                            {image.image_url ? (
                              <img
                                src={
                                  image.image_url
                                }
                                alt={`Package ${selected.package_amount}`}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-4xl text-black/15">
                                ▣
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between gap-3 p-3">
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold text-black/40">
                                {image.storage_path ||
                                  "External image"}
                              </p>

                              <p className="mt-1 text-[11px] font-semibold text-black/30">
                                {dateTime(
                                  image.created_at
                                )}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                deleteImage(
                                  image.id,
                                  selected.package_amount
                                )
                              }
                              className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700 transition hover:bg-red-100"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-black/10 bg-[#fafbfa] p-6 text-center">
                  <p className="text-sm font-bold text-black/35">
                    No package image found.
                  </p>
                </div>
              )}

              {/* Package tasks */}
              <div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h3 className="text-base font-black text-black">
                      Package Tasks
                    </h3>

                    <p className="mt-1 text-xs font-semibold text-black/35">
                      Tasks assigned to this package
                    </p>
                  </div>

                  <div className="rounded-full bg-black/[0.04] px-3 py-1.5 text-xs font-black text-black/50">
                    {formatNumber(
                      selected.totalTasks
                    )}{" "}
                    tasks
                  </div>
                </div>

                {selected.tasks.length >
                0 ? (
                  <div className="mt-3 space-y-3">
                    {selected.tasks.map(
                      (task) => (
                        <TaskRow
                          key={
                            task.id
                          }
                          task={task}
                        />
                      )
                    )}
                  </div>
                ) : (
                  <div className="mt-3 rounded-2xl border border-dashed border-black/10 bg-[#fafbfa] p-6 text-center">
                    <p className="text-sm font-bold text-black/35">
                      No tasks found for this package.
                    </p>
                  </div>
                )}
              </div>

              {/* Activations */}
              <div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h3 className="text-base font-black text-black">
                      Package Activations
                    </h3>

                    <p className="mt-1 text-xs font-semibold text-black/35">
                      Real users who activated this package
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700">
                      {formatNumber(
                        selected.activeUsers
                      )}{" "}
                      active
                    </span>

                    <span className="rounded-full bg-black/[0.05] px-3 py-1.5 text-xs font-black text-black/45">
                      {formatNumber(
                        selected.inactiveUsers
                      )}{" "}
                      inactive
                    </span>
                  </div>
                </div>

                {selected.totalUsers >
                0 &&
                selected.latestActivation ? (
                  <div className="mt-4 rounded-2xl border border-black/[0.06] bg-[#f8faf8] p-4">
                    <p className="text-xs font-black uppercase tracking-wider text-black/30">
                      Latest Activation
                    </p>

                    <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div>
                        <p className="text-[11px] font-bold text-black/30">
                          User ID
                        </p>

                        <p className="mt-1 truncate font-mono text-xs font-bold text-black/60">
                          {
                            selected
                              .latestActivation
                              .user_id
                          }
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] font-bold text-black/30">
                          Activated
                        </p>

                        <p className="mt-1 text-xs font-bold text-black/60">
                          {dateTime(
                            selected
                              .latestActivation
                              .activated_at
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] font-bold text-black/30">
                          Status
                        </p>

                        <p className="mt-1 text-xs font-black text-emerald-700">
                          {selected
                            .latestActivation
                            .is_active
                            ? "Active"
                            : "Inactive"}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="mt-3 overflow-hidden rounded-2xl border border-black/[0.07]">
                  {/*
                    The API response currently contains package
                    activation counts and latest activation.
                    Individual activation rows are not returned
                    by the current package API.
                  */}
                  <div className="bg-[#f8faf8] px-5 py-6 text-center">
                    {selected.totalUsers >
                    0 ? (
                      <>
                        <p className="text-sm font-black text-black">
                          {formatNumber(
                            selected.totalUsers
                          )}{" "}
                          activation records
                        </p>

                        <p className="mt-1 text-xs font-semibold text-black/35">
                          {formatNumber(
                            selected.activeUsers
                          )}{" "}
                          currently active and{" "}
                          {formatNumber(
                            selected.inactiveUsers
                          )}{" "}
                          inactive.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-black text-black/40">
                          No activations found.
                        </p>

                        <p className="mt-1 text-xs font-semibold text-black/30">
                          No users have activated this package yet.
                        </p>
                      </>
                    )}
                  </div>
                </div>
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
  value?: number | null;
  description: string;
  icon: string;
  accent?:
    | "black"
    | "green"
    | "blue"
    | "purple";
}) {
  const classes = {
    black:
      "bg-black text-white",
    green:
      "bg-emerald-100 text-emerald-700",
    blue:
      "bg-blue-100 text-blue-700",
    purple:
      "bg-purple-100 text-purple-700",
  };

  const safeValue =
    safeNumber(value);

  return (
    <div className="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-black/45">
            {title}
          </p>

          <p className="mt-2 text-2xl font-black tracking-tight text-black">
            {safeValue.toLocaleString(
              "en-BD"
            )}
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

function InfoCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-wider text-black/35">
        {title}
      </p>

      <p className="mt-2 text-xl font-black text-black">
        {value}
      </p>

      <p className="mt-1 text-xs font-bold text-black/35">
        {description}
      </p>
    </div>
  );
}

function PackageCard({
  item,
  onView,
}: {
  item: PackageItem;
  onView: () => void;
}) {
  const primaryImage =
    item.images?.[0]?.image_url ||
    "";

  return (
    <div className="overflow-hidden rounded-3xl border border-black/[0.07] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative aspect-[16/9] overflow-hidden bg-[#eef2ef]">
        {primaryImage ? (
          <img
            src={primaryImage}
            alt={`Package ${item.package_amount}`}
            className="h-full w-full object-cover transition duration-300 hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl text-black/20">
            ▣
          </div>
        )}

        <div className="absolute left-4 top-4 rounded-full bg-black/80 px-3 py-1.5 text-sm font-black text-white backdrop-blur">
          {money(
            item.package_amount
          )}
        </div>

        <div
          className={`absolute right-4 top-4 rounded-full px-3 py-1.5 text-xs font-black backdrop-blur ${
            item.activeUsers > 0
              ? "bg-emerald-500/90 text-white"
              : "bg-white/90 text-black/50"
          }`}
        >
          {item.activeUsers > 0
            ? "Active"
            : "No Active Users"}
        </div>
      </div>

      <div className="p-5">
        <div className="grid grid-cols-2 gap-3">
          <MiniStat
            label="Active Users"
            value={
              item.activeUsers
            }
          />

          <MiniStat
            label="Total Users"
            value={
              item.totalUsers
            }
          />

          <MiniStat
            label="Active Tasks"
            value={
              item.activeTasks
            }
          />

          <MiniStat
            label="Total Tasks"
            value={
              item.totalTasks
            }
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-[#f7f9f7] p-3">
            <p className="text-[11px] font-black uppercase tracking-wider text-black/30">
              Images
            </p>

            <p className="mt-1 text-lg font-black text-black">
              {formatNumber(
                item.imagesCount
              )}
            </p>
          </div>

          <div className="rounded-xl bg-[#f7f9f7] p-3">
            <p className="text-[11px] font-black uppercase tracking-wider text-black/30">
              Rewards
            </p>

            <p className="mt-1 text-lg font-black text-black">
              {money(
                item.totalRewards
              )}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs font-bold text-black/35">
            {formatNumber(
              item.inactiveUsers
            )}{" "}
            inactive users
          </p>

          <button
            type="button"
            onClick={onView}
            className="rounded-xl bg-black px-4 py-2.5 text-xs font-black text-white transition hover:bg-black/80"
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  );
}

function TaskRow({
  task,
}: {
  task: PackageTask;
}) {
  return (
    <div className="rounded-2xl border border-black/[0.07] bg-white p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-black text-black">
              {task.title ||
                "Untitled Task"}
            </h4>

            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
                task.is_active
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-black/[0.05] text-black/40"
              }`}
            >
              {task.is_active
                ? "Active"
                : "Inactive"}
            </span>
          </div>

          {task.description ? (
            <p className="mt-2 text-xs font-medium leading-5 text-black/45">
              {task.description}
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-lg bg-black/[0.04] px-2.5 py-1.5 text-[11px] font-bold text-black/50">
              Reward:{" "}
              {money(
                task.reward_amount
              )}
            </span>

            <span className="rounded-lg bg-black/[0.04] px-2.5 py-1.5 text-[11px] font-bold text-black/50">
              Duration:{" "}
              {safeNumber(
                task.duration_hours
              )}{" "}
              hours
            </span>

            <span className="rounded-lg bg-black/[0.04] px-2.5 py-1.5 text-[11px] font-bold text-black/50">
              Screenshot:{" "}
              {task.screenshot_required
                ? "Required"
                : "Not required"}
            </span>
          </div>
        </div>

        {task.task_url ? (
          <a
            href={task.task_url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-xs font-black text-black transition hover:bg-black/[0.03]"
          >
            Open Task
          </a>
        ) : null}
      </div>

      <div className="mt-3 border-t border-black/[0.05] pt-3">
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-[11px] font-semibold text-black/35">
          <span>
            Available:{" "}
            {dateTime(
              task.available_from
            )}
          </span>

          <span>
            Expires:{" "}
            {dateTime(
              task.expires_at
            )}
          </span>

          <span>
            Created:{" "}
            {dateTime(
              task.created_at
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value?: number | null;
}) {
  return (
    <div className="rounded-xl bg-[#f7f9f7] p-3">
      <p className="text-[11px] font-black uppercase tracking-wider text-black/30">
        {label}
      </p>

      <p className="mt-1 text-lg font-black text-black">
        {safeNumber(
          value
        ).toLocaleString(
          "en-BD"
        )}
      </p>
    </div>
  );
}

function DetailCard({
  title,
  value,
}: {
  title: string;
  value?: number | null;
}) {
  return (
    <div className="rounded-2xl border border-black/[0.06] bg-[#f8faf8] p-4">
      <p className="text-xs font-black uppercase tracking-wider text-black/35">
        {title}
      </p>

      <p className="mt-2 text-2xl font-black text-black">
        {safeNumber(
          value
        ).toLocaleString(
          "en-BD"
        )}
      </p>
    </div>
  );
}

function Field({
  label,
  placeholder,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (
    value: string
  ) => void;
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
        placeholder={
          placeholder
        }
        min={
          type === "number"
            ? "1"
            : undefined
        }
        className="h-12 w-full rounded-xl border border-black/10 bg-[#f8faf8] px-4 text-sm font-semibold text-black outline-none transition placeholder:text-black/30 focus:border-[#4f9d32] focus:bg-white focus:ring-4 focus:ring-[#7ed957]/15"
      />
    </div>
  );
}

function LoadingCard() {
  return (
    <div className="overflow-hidden rounded-3xl border border-black/[0.07] bg-white">
      <div className="aspect-[16/9] animate-pulse bg-black/[0.05]" />

      <div className="space-y-4 p-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="h-16 animate-pulse rounded-xl bg-black/[0.05]" />
          <div className="h-16 animate-pulse rounded-xl bg-black/[0.05]" />
          <div className="h-16 animate-pulse rounded-xl bg-black/[0.05]" />
          <div className="h-16 animate-pulse rounded-xl bg-black/[0.05]" />
        </div>

        <div className="h-10 animate-pulse rounded-xl bg-black/[0.05]" />
      </div>
    </div>
  );
}