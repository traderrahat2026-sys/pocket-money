"use client";

import { useEffect, useState } from "react";

type HelpForm = {
  firstAdminUrl: string;
  secondAdminUrl: string;
  thirdAdminUrl: string;
  telegramChannelUrl: string;
};

const initialForm: HelpForm = {
  firstAdminUrl: "",
  secondAdminUrl: "",
  thirdAdminUrl: "",
  telegramChannelUrl: "",
};

export default function AdminHelpLinePage() {
  const [form, setForm] = useState<HelpForm>(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/admin/help-line", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "তথ্য লোড করা যায়নি"
        );
      }

      setForm({
        firstAdminUrl: result.data?.firstAdminUrl || "",
        secondAdminUrl: result.data?.secondAdminUrl || "",
        thirdAdminUrl: result.data?.thirdAdminUrl || "",
        telegramChannelUrl:
          result.data?.telegramChannelUrl || "",
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "তথ্য লোড করা যায়নি"
      );
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    if (saving) return;

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/admin/help-line", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "সেটিংস সংরক্ষণ করা যায়নি"
        );
      }

      setMessage(
        "হেল্প লাইন সেটিংস সফলভাবে সংরক্ষণ হয়েছে।"
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "সেটিংস সংরক্ষণ করা যায়নি"
      );
    } finally {
      setSaving(false);
    }
  }

  function updateField(
    field: keyof HelpForm,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f6f7f9] p-4 md:p-8">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <div className="animate-pulse">
              <div className="h-8 w-48 rounded-lg bg-gray-200" />
              <div className="mt-3 h-4 w-80 rounded bg-gray-100" />

              <div className="mt-8 space-y-5">
                <div className="h-28 rounded-xl bg-gray-100" />
                <div className="h-28 rounded-xl bg-gray-100" />
                <div className="h-28 rounded-xl bg-gray-100" />
                <div className="h-28 rounded-xl bg-gray-100" />
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f7f9] p-4 md:p-8">
      <div className="mx-auto max-w-4xl">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-2xl shadow-sm">
              💬
            </div>

            <div>
              <h1 className="text-2xl font-black tracking-tight text-gray-900 md:text-3xl">
                Help Line
              </h1>

              <p className="mt-1 text-sm font-medium text-gray-500">
                Telegram Admin এবং Channel-এর যোগাযোগের তথ্য
              </p>
            </div>
          </div>
        </div>

        {/* Information */}
        <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 p-4 md:p-5">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-lg text-white">
              ℹ
            </div>

            <div>
              <h2 className="text-sm font-black text-blue-900">
                গুরুত্বপূর্ণ
              </h2>

              <p className="mt-1 text-sm leading-6 text-blue-800">
                Admin Account-এর ক্ষেত্রে শুধু Telegram
                Username লিখুন। যেমন:
              </p>

              <div className="mt-2 inline-block rounded-lg bg-white px-3 py-2 font-mono text-sm font-bold text-blue-900 shadow-sm">
                @poket_money_ADMIN
              </div>

              <p className="mt-2 text-sm leading-6 text-blue-800">
                Telegram Channel-এর ক্ষেত্রে সম্পূর্ণ Channel
                Link দিতে হবে।
              </p>

              <div className="mt-2 inline-block rounded-lg bg-white px-3 py-2 font-mono text-sm font-bold text-blue-900 shadow-sm">
                https://t.me/poket_money
              </div>
            </div>
          </div>
        </div>

        {/* Main Card */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">

          <div className="border-b border-gray-100 px-5 py-5 md:px-7">
            <h2 className="text-lg font-black text-gray-900">
              যোগাযোগের তথ্য
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Admin Account-এর জন্য Username এবং Channel-এর জন্য Link দিন।
            </p>
          </div>

          <div className="space-y-6 p-5 md:p-7">

            {/* First Admin */}
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 md:p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 text-xl">
                  👤
                </div>

                <div>
                  <h3 className="text-base font-black text-gray-900">
                    ফার্স্ট অ্যাডমিন
                  </h3>

                  <p className="mt-0.5 text-xs font-medium text-gray-500">
                    Telegram Username
                  </p>
                </div>
              </div>

              <label className="mb-2 block text-sm font-bold text-gray-800">
                Telegram Username
              </label>

              <input
                type="text"
                value={form.firstAdminUrl}
                onChange={(e) =>
                  updateField(
                    "firstAdminUrl",
                    e.target.value
                  )
                }
                placeholder="@poket_money_ADMIN"
                autoComplete="off"
                className="
                  h-12
                  w-full
                  rounded-xl
                  border
                  border-gray-300
                  bg-white
                  px-4
                  text-sm
                  font-medium
                  text-gray-900
                  outline-none
                  transition
                  placeholder:text-gray-400
                  focus:border-purple-500
                  focus:ring-4
                  focus:ring-purple-500/10
                "
              />
            </div>

            {/* Second Admin */}
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 md:p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-xl">
                  👤
                </div>

                <div>
                  <h3 className="text-base font-black text-gray-900">
                    সেকেন্ড অ্যাডমিন
                  </h3>

                  <p className="mt-0.5 text-xs font-medium text-gray-500">
                    Telegram Username
                  </p>
                </div>
              </div>

              <label className="mb-2 block text-sm font-bold text-gray-800">
                Telegram Username
              </label>

              <input
                type="text"
                value={form.secondAdminUrl}
                onChange={(e) =>
                  updateField(
                    "secondAdminUrl",
                    e.target.value
                  )
                }
                placeholder="@second_admin"
                autoComplete="off"
                className="
                  h-12
                  w-full
                  rounded-xl
                  border
                  border-gray-300
                  bg-white
                  px-4
                  text-sm
                  font-medium
                  text-gray-900
                  outline-none
                  transition
                  placeholder:text-gray-400
                  focus:border-blue-500
                  focus:ring-4
                  focus:ring-blue-500/10
                "
              />
            </div>

            {/* Third Admin */}
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 md:p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-100 text-xl">
                  👤
                </div>

                <div>
                  <h3 className="text-base font-black text-gray-900">
                    থার্ড অ্যাডমিন
                  </h3>

                  <p className="mt-0.5 text-xs font-medium text-gray-500">
                    Telegram Username
                  </p>
                </div>
              </div>

              <label className="mb-2 block text-sm font-bold text-gray-800">
                Telegram Username
              </label>

              <input
                type="text"
                value={form.thirdAdminUrl}
                onChange={(e) =>
                  updateField(
                    "thirdAdminUrl",
                    e.target.value
                  )
                }
                placeholder="@third_admin"
                autoComplete="off"
                className="
                  h-12
                  w-full
                  rounded-xl
                  border
                  border-gray-300
                  bg-white
                  px-4
                  text-sm
                  font-medium
                  text-gray-900
                  outline-none
                  transition
                  placeholder:text-gray-400
                  focus:border-cyan-500
                  focus:ring-4
                  focus:ring-cyan-500/10
                "
              />
            </div>

            {/* Telegram Channel */}
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 md:p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-xl text-white shadow-sm">
                  ✈
                </div>

                <div>
                  <h3 className="text-base font-black text-gray-900">
                    Telegram Channel
                  </h3>

                  <p className="mt-0.5 text-xs font-medium text-gray-600">
                    Channel-এর সম্পূর্ণ Link
                  </p>
                </div>
              </div>

              <label className="mb-2 block text-sm font-bold text-gray-800">
                Telegram Channel Link
              </label>

              <input
                type="url"
                value={form.telegramChannelUrl}
                onChange={(e) =>
                  updateField(
                    "telegramChannelUrl",
                    e.target.value
                  )
                }
                placeholder="https://t.me/poket_money"
                autoComplete="off"
                className="
                  h-12
                  w-full
                  rounded-xl
                  border
                  border-blue-200
                  bg-white
                  px-4
                  text-sm
                  font-medium
                  text-gray-900
                  outline-none
                  transition
                  placeholder:text-gray-400
                  focus:border-blue-500
                  focus:ring-4
                  focus:ring-blue-500/10
                "
              />
            </div>

            {/* Success */}
            {message && (
              <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-sm font-bold text-white">
                  ✓
                </span>

                <p className="text-sm font-bold text-green-800">
                  {message}
                </p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-sm font-bold text-white">
                  !
                </span>

                <p className="text-sm font-bold text-red-800">
                  {error}
                </p>
              </div>
            )}

            {/* Save */}
            <div className="border-t border-gray-100 pt-5">
              <button
                type="button"
                onClick={saveSettings}
                disabled={saving}
                className="
                  flex
                  min-h-12
                  w-full
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-black
                  px-5
                  py-3
                  text-sm
                  font-black
                  text-white
                  shadow-sm
                  transition
                  hover:bg-gray-800
                  active:scale-[0.99]
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                  md:w-auto
                  md:min-w-[240px]
                "
              >
                {saving ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    সংরক্ষণ হচ্ছে...
                  </>
                ) : (
                  <>
                    <span>✓</span>
                    হেল্প লাইন সংরক্ষণ করুন
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:p-7">
          <div className="mb-5">
            <h2 className="text-lg font-black text-gray-900">
              User Side Preview
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              User-এর কাছে শুধু এই নামগুলো দেখা যাবে। কোনো URL বা Username দেখা যাবে না।
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">

            <div className="flex items-center gap-3 rounded-xl border border-purple-200 bg-purple-50 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600 text-white">
                👤
              </div>

              <span className="text-sm font-black text-gray-900">
                ফার্স্ট অ্যাডমিন
              </span>

              <span className="ml-auto text-gray-400">
                →
              </span>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
                👤
              </div>

              <span className="text-sm font-black text-gray-900">
                সেকেন্ড অ্যাডমিন
              </span>

              <span className="ml-auto text-gray-400">
                →
              </span>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-cyan-200 bg-cyan-50 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-600 text-white">
                👤
              </div>

              <span className="text-sm font-black text-gray-900">
                থার্ড অ্যাডমিন
              </span>

              <span className="ml-auto text-gray-400">
                →
              </span>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
                ✈
              </div>

              <span className="text-sm font-black text-gray-900">
                টেলিগ্রাম চ্যানেল
              </span>

              <span className="ml-auto text-gray-400">
                →
              </span>
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}