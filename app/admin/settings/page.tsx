"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import AdminShell from "@/components/admin/AdminShell";

type Setting = {
  id: string;
  setting_key: string;
  setting_value: string | null;
  setting_type: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
};

const EMPTY_FORM = {
  setting_key: "",
  setting_value: "",
  setting_type: "text",
  description: "",
  is_public: false,
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

export default function AdminSettingsPage() {
  const [settings, setSettings] =
    useState<Setting[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [showModal, setShowModal] =
    useState(false);

  const [editing, setEditing] =
    useState<Setting | null>(null);

  const [form, setForm] =
    useState(EMPTY_FORM);

  const [message, setMessage] =
    useState<{
      type: "success" | "error";
      text: string;
    } | null>(null);

  const loadSettings =
    useCallback(async () => {
      try {
        setLoading(true);
        setMessage(null);

        const response =
          await fetch(
            "/api/admin/settings",
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
              "Failed to load settings.",
          );
        }

        setSettings(
          data.settings || [],
        );
      } catch (error) {
        console.error(error);

        setMessage({
          type: "error",
          text:
            error instanceof Error
              ? error.message
              : "Failed to load settings.",
        });
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  function openCreate() {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
    });
    setMessage(null);
    setShowModal(true);
  }

  function openEdit(
    setting: Setting,
  ) {
    setEditing(setting);

    setForm({
      setting_key:
        setting.setting_key,
      setting_value:
        setting.setting_value || "",
      setting_type:
        setting.setting_type ||
        "text",
      description:
        setting.description || "",
      is_public:
        setting.is_public,
    });

    setMessage(null);
    setShowModal(true);
  }

  function closeModal() {
    if (saving) return;

    setShowModal(false);
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
    });
  }

  async function saveSetting() {
    if (!form.setting_key.trim()) {
      setMessage({
        type: "error",
        text:
          "Setting key is required.",
      });
      return;
    }

    try {
      setSaving(true);
      setMessage(null);

      const response =
        await fetch(
          "/api/admin/settings",
          {
            method: editing
              ? "PATCH"
              : "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify(
              editing
                ? {
                    id: editing.id,
                    setting_key:
                      form.setting_key,
                    setting_value:
                      form.setting_value,
                    setting_type:
                      form.setting_type,
                    description:
                      form.description,
                    is_public:
                      form.is_public,
                  }
                : {
                    setting_key:
                      form.setting_key,
                    setting_value:
                      form.setting_value,
                    setting_type:
                      form.setting_type,
                    description:
                      form.description,
                    is_public:
                      form.is_public,
                  },
            ),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to save setting.",
        );
      }

      setMessage({
        type: "success",
        text: editing
          ? "Setting updated successfully."
          : "Setting created successfully.",
      });

      setShowModal(false);
      setEditing(null);
      setForm({
        ...EMPTY_FORM,
      });

      await loadSettings();
    } catch (error) {
      console.error(error);

      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to save setting.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function deleteSetting(
    setting: Setting,
  ) {
    const confirmed =
      window.confirm(
        `Delete setting "${setting.setting_key}"?\n\nThis action cannot be undone.`,
      );

    if (!confirmed) return;

    try {
      setMessage(null);

      const response =
        await fetch(
          `/api/admin/settings?id=${encodeURIComponent(
            setting.id,
          )}`,
          {
            method: "DELETE",
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to delete setting.",
        );
      }

      setMessage({
        type: "success",
        text:
          "Setting deleted successfully.",
      });

      await loadSettings();
    } catch (error) {
      console.error(error);

      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to delete setting.",
      });
    }
  }

  const filteredSettings =
    settings.filter(
      (setting) => {
        const q =
          search
            .trim()
            .toLowerCase();

        if (!q) return true;

        return (
          setting.setting_key
            .toLowerCase()
            .includes(q) ||
          String(
            setting.setting_value ||
              "",
          )
            .toLowerCase()
            .includes(q) ||
          String(
            setting.description ||
              "",
          )
            .toLowerCase()
            .includes(q)
        );
      },
    );

  return (
    <AdminShell
      title="Settings"
      description="Manage application configuration and public settings"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#4f9d32]">
              System Configuration
            </p>

            <h1 className="mt-1 text-2xl font-black tracking-tight text-black sm:text-3xl">
              Settings
            </h1>

            <p className="mt-1 text-sm text-black/50">
              Manage configurable application
              values from one place.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={
                loadSettings
              }
              disabled={loading}
              className="h-11 rounded-xl border border-black/10 bg-white px-4 text-sm font-black shadow-sm transition hover:bg-black/[0.03] disabled:opacity-50"
            >
              Refresh
            </button>

            <button
              type="button"
              onClick={openCreate}
              className="h-11 rounded-xl bg-[#4f9d32] px-5 text-sm font-black text-white shadow-sm transition hover:bg-[#43862a]"
            >
              + Add Setting
            </button>
          </div>
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

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard
            label="Total Settings"
            value={settings.length}
          />

          <StatCard
            label="Public Settings"
            value={
              settings.filter(
                (item) =>
                  item.is_public,
              ).length
            }
          />

          <StatCard
            label="Private Settings"
            value={
              settings.filter(
                (item) =>
                  !item.is_public,
              ).length
            }
          />
        </div>

        {/* Search */}
        <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
          <label className="mb-1.5 block text-xs font-black uppercase tracking-wide text-black/45">
            Search Settings
          </label>

          <input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value,
              )
            }
            placeholder="Search by key, value or description..."
            className="h-11 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 text-sm font-semibold outline-none placeholder:text-black/30 focus:border-[#4f9d32] focus:bg-white"
          />
        </div>

        {/* Settings */}
        <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full">
              <thead>
                <tr className="border-b border-black/10 bg-[#fafafa]">
                  <th className="px-5 py-4 text-left text-[11px] font-black uppercase tracking-wider text-black/45">
                    Setting
                  </th>

                  <th className="px-5 py-4 text-left text-[11px] font-black uppercase tracking-wider text-black/45">
                    Value
                  </th>

                  <th className="px-5 py-4 text-left text-[11px] font-black uppercase tracking-wider text-black/45">
                    Type
                  </th>

                  <th className="px-5 py-4 text-left text-[11px] font-black uppercase tracking-wider text-black/45">
                    Visibility
                  </th>

                  <th className="px-5 py-4 text-left text-[11px] font-black uppercase tracking-wider text-black/45">
                    Updated
                  </th>

                  <th className="px-5 py-4 text-right text-[11px] font-black uppercase tracking-wider text-black/45">
                    Actions
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
                        Loading settings...
                      </p>
                    </td>
                  </tr>
                ) : filteredSettings.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-16 text-center"
                    >
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-black/[0.04] text-2xl">
                        ⚙
                      </div>

                      <p className="mt-4 text-base font-black">
                        No settings found
                      </p>

                      <p className="mt-1 text-sm text-black/40">
                        Add your first application
                        setting.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredSettings.map(
                    (setting) => (
                      <tr
                        key={setting.id}
                        className="border-b border-black/[0.06] last:border-b-0 hover:bg-black/[0.015]"
                      >
                        <td className="px-5 py-4">
                          <p className="text-sm font-black">
                            {setting.setting_key}
                          </p>

                          {setting.description && (
                            <p className="mt-1 max-w-[260px] text-xs font-medium leading-5 text-black/40">
                              {
                                setting.description
                              }
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <p className="max-w-[300px] truncate rounded-lg bg-black/[0.03] px-3 py-2 text-xs font-bold text-black/70">
                            {setting.setting_value ||
                              "—"}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <span className="rounded-full bg-black/[0.05] px-3 py-1 text-[10px] font-black uppercase">
                            {
                              setting.setting_type
                            }
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          {setting.is_public ? (
                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black text-emerald-700 ring-1 ring-emerald-200">
                              Public
                            </span>
                          ) : (
                            <span className="rounded-full bg-black/[0.04] px-3 py-1 text-[10px] font-black text-black/50">
                              Private
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-xs font-bold text-black/50">
                            {formatDate(
                              setting.updated_at,
                            )}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                openEdit(
                                  setting,
                                )
                              }
                              className="rounded-lg border border-black/10 px-3 py-2 text-xs font-black hover:bg-black/[0.04]"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                deleteSetting(
                                  setting,
                                )
                              }
                              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-100"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ),
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-black/10 bg-white px-5 py-4">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-[#4f9d32]">
                  {editing
                    ? "Edit Setting"
                    : "New Setting"}
                </p>

                <h2 className="mt-1 text-xl font-black">
                  {editing
                    ? "Update Configuration"
                    : "Add Configuration"}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-black/[0.05] text-lg font-black hover:bg-black/10"
              >
                ×
              </button>
            </div>

            <div className="space-y-5 p-5">
              {/* Key */}
              <Field label="Setting Key">
                <input
                  value={
                    form.setting_key
                  }
                  disabled={Boolean(
                    editing,
                  )}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      setting_key:
                        event.target.value,
                    }))
                  }
                  placeholder="example_setting"
                  className="input"
                />

                <p className="mt-1.5 text-[11px] font-semibold text-black/40">
                  Use lowercase letters, numbers
                  and underscores.
                </p>
              </Field>

              {/* Type */}
              <Field label="Setting Type">
                <select
                  value={
                    form.setting_type
                  }
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      setting_type:
                        event.target.value,
                    }))
                  }
                  className="input"
                >
                  <option value="text">
                    Text
                  </option>

                  <option value="number">
                    Number
                  </option>

                  <option value="boolean">
                    Boolean
                  </option>

                  <option value="json">
                    JSON
                  </option>
                </select>
              </Field>

              {/* Value */}
              <Field label="Setting Value">
                {form.setting_type ===
                "boolean" ? (
                  <select
                    value={
                      form.setting_value ||
                      "false"
                    }
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        setting_value:
                          event.target
                            .value,
                      }))
                    }
                    className="input"
                  >
                    <option value="true">
                      true
                    </option>

                    <option value="false">
                      false
                    </option>
                  </select>
                ) : (
                  <textarea
                    value={
                      form.setting_value
                    }
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        setting_value:
                          event.target
                            .value,
                      }))
                    }
                    rows={
                      form.setting_type ===
                      "json"
                        ? 6
                        : 3
                    }
                    placeholder={
                      form.setting_type ===
                      "json"
                        ? '{"example": true}'
                        : "Enter setting value..."
                    }
                    className="input resize-none py-3"
                  />
                )}
              </Field>

              {/* Description */}
              <Field label="Description">
                <textarea
                  value={
                    form.description
                  }
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      description:
                        event.target
                          .value,
                    }))
                  }
                  rows={3}
                  placeholder="Explain what this setting controls..."
                  className="input resize-none py-3"
                />
              </Field>

              {/* Public */}
              <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-black/10 bg-[#fafafa] p-4">
                <div>
                  <p className="text-sm font-black">
                    Public Setting
                  </p>

                  <p className="mt-1 text-xs font-semibold text-black/40">
                    Allow this setting to be used by
                    public-facing features.
                  </p>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={
                    form.is_public
                  }
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      is_public:
                        !prev.is_public,
                    }))
                  }
                  className={`relative h-7 w-12 rounded-full transition ${
                    form.is_public
                      ? "bg-[#4f9d32]"
                      : "bg-black/15"
                  }`}
                >
                  <span
                    className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
                      form.is_public
                        ? "left-6"
                        : "left-1"
                    }`}
                  />
                </button>
              </label>

              {/* Buttons */}
              <div className="flex flex-col-reverse gap-3 border-t border-black/10 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="h-11 rounded-xl border border-black/10 px-5 text-sm font-black disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={
                    saveSetting
                  }
                  disabled={saving}
                  className="h-11 rounded-xl bg-[#4f9d32] px-6 text-sm font-black text-white hover:bg-[#43862a] disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editing
                      ? "Update Setting"
                      : "Create Setting"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .input {
          width: 100%;
          min-height: 44px;
          border-radius: 12px;
          border: 1px solid rgba(0, 0, 0, 0.1);
          background: #fafafa;
          padding: 0 14px;
          font-size: 14px;
          font-weight: 600;
          outline: none;
          transition: 0.2s;
        }

        .input:focus {
          border-color: #4f9d32;
          background: #fff;
        }

        .input:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }
      `}</style>
    </AdminShell>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-black uppercase tracking-wide text-black/45">
        {label}
      </label>

      {children}
    </div>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-black uppercase tracking-wider text-black/40">
        {label}
      </p>

      <p className="mt-2 text-2xl font-black">
        {value}
      </p>
    </div>
  );
}