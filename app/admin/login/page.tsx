"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

    setError("");

    const cleanUsername = username.trim();

    if (!cleanUsername) {
      setError("ইউজারনেম দিন।");
      return;
    }

    if (!password) {
      setError("পাসওয়ার্ড দিন।");
      return;
    }

    setLoading(true);

    try {
      /*
       * Admin authentication API পরের ধাপে যুক্ত করা হবে।
       *
       * এখানে কোনো password hardcode করা হয়নি।
       * Database/server-side verification-এর মাধ্যমে
       * Admin account যাচাই করা হবে।
       */

      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: cleanUsername,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.message || "ইউজারনেম অথবা পাসওয়ার্ড সঠিক নয়।");
        setLoading(false);
        return;
      }

      router.replace("/admin");
      router.refresh();
    } catch (loginError) {
      console.error("ADMIN LOGIN ERROR:", loginError);
      setError("সংযোগে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f5f8f6] px-4 py-8">
      {/* Background decorations */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-[#7ed957]/15 blur-3xl" />
        <div className="absolute -bottom-40 -right-32 h-96 w-96 rounded-full bg-[#7ed957]/10 blur-3xl" />

        <div className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/[0.025]" />
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/[0.02]" />
      </div>

      <div className="relative z-10 w-full max-w-[430px]">
        {/* Brand */}
        <div className="mb-7 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#101713] text-2xl font-black text-white shadow-[0_18px_40px_rgba(16,23,19,0.18)]">
            ৳
          </div>

          <h1 className="mt-5 text-2xl font-black tracking-[-0.04em] text-[#121a15]">
            Pocket Money
          </h1>

          <p className="mt-1.5 text-sm font-medium text-black/45">
            প্রশাসনিক নিয়ন্ত্রণ কেন্দ্র
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-[30px] border border-black/[0.06] bg-white p-6 shadow-[0_25px_80px_rgba(20,30,24,0.09)] sm:p-8">
          <div className="mb-7">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#4f9d32]">
              নিরাপদ প্রবেশ
            </p>

            <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[#151d18]">
              Admin Login
            </h2>

            <p className="mt-2 text-sm leading-6 text-black/45">
              প্রশাসনিক প্যানেলে প্রবেশ করতে আপনার ইউজারনেম ও পাসওয়ার্ড দিন।
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Username */}
            <div>
              <label
                htmlFor="admin-username"
                className="mb-2 block text-sm font-bold text-[#26322b]"
              >
                ইউজারনেম
              </label>

              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-black/30">
                  @
                </span>

                <input
                  id="admin-username"
                  type="text"
                  value={username}
                  onChange={(event) => {
                    setUsername(event.target.value);
                    setError("");
                  }}
                  autoComplete="username"
                  placeholder="আপনার ইউজারনেম"
                  className="h-13 w-full rounded-2xl border border-black/[0.08] bg-[#f8faf9] pl-10 pr-4 text-sm font-semibold text-[#17201b] outline-none transition placeholder:text-black/25 focus:border-[#7ed957] focus:bg-white focus:ring-4 focus:ring-[#7ed957]/10"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="admin-password"
                className="mb-2 block text-sm font-bold text-[#26322b]"
              >
                পাসওয়ার্ড
              </label>

              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-black/30">
                  •••
                </span>

                <input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError("");
                  }}
                  autoComplete="current-password"
                  placeholder="আপনার পাসওয়ার্ড"
                  className="h-13 w-full rounded-2xl border border-black/[0.08] bg-[#f8faf9] pl-11 pr-14 text-sm font-semibold tracking-[0.02em] text-[#17201b] outline-none transition placeholder:text-black/25 focus:border-[#7ed957] focus:bg-white focus:ring-4 focus:ring-[#7ed957]/10"
                  disabled={loading}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-xs font-black text-black/35 transition hover:bg-black/[0.04] hover:text-black/60"
                  aria-label={
                    showPassword
                      ? "পাসওয়ার্ড লুকান"
                      : "পাসওয়ার্ড দেখুন"
                  }
                  disabled={loading}
                >
                  {showPassword ? "লুকান" : "দেখুন"}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-2xl border border-red-500/10 bg-red-50 px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 text-xs font-black text-red-600">
                    !
                  </div>

                  <p className="text-sm font-semibold leading-6 text-red-600">
                    {error}
                  </p>
                </div>
              </div>
            )}

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="flex h-13 w-full items-center justify-center rounded-2xl bg-[#101713] px-5 text-sm font-black text-white shadow-[0_12px_28px_rgba(16,23,19,0.14)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#1a241e] hover:shadow-[0_16px_34px_rgba(16,23,19,0.18)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  যাচাই হচ্ছে...
                </span>
              ) : (
                "Login"
              )}
            </button>
          </form>

          {/* Security note */}
          <div className="mt-6 flex items-start gap-3 rounded-2xl bg-[#f5f8f6] p-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-xs font-black text-[#4f9d32] shadow-sm">
              ✓
            </div>

            <div>
              <p className="text-xs font-black text-[#26322b]">
                সুরক্ষিত প্রশাসনিক প্রবেশ
              </p>

              <p className="mt-1 text-[11px] leading-5 text-black/40">
                শুধুমাত্র অনুমোদিত প্রশাসনিক অ্যাকাউন্টের জন্য এই প্যানেল।
              </p>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-xs font-medium text-black/30">
          Pocket Money • প্রশাসনিক ব্যবস্থা
        </p>
      </div>
    </main>
  );
}