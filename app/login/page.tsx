"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  async function handleLogin(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (loading) return;

    setError("");
    setSuccess("");

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setError("Gmail / ইমেইল এবং পাসওয়ার্ড দিন।");
      return;
    }

    setLoading(true);

    try {
      const {
        data,
        error: loginError,
      } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (loginError) {
        const errorMessage =
          loginError.message.toLowerCase();

        if (
          errorMessage.includes(
            "invalid login credentials"
          ) ||
          errorMessage.includes("invalid credentials")
        ) {
          setError(
            "অ্যাকাউন্ট পাওয়া যায়নি অথবা Gmail / পাসওয়ার্ড ভুল।"
          );
        } else if (
          errorMessage.includes("email not confirmed")
        ) {
          setError(
            "এই অ্যাকাউন্টের Email confirmation চালু আছে। Supabase-এর Confirm Email OFF আছে কিনা যাচাই করুন।"
          );
        } else if (
          errorMessage.includes("rate limit") ||
          errorMessage.includes("too many requests")
        ) {
          setError(
            "অনেকবার চেষ্টা করা হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।"
          );
        } else {
          console.error(
            "Supabase login error:",
            loginError
          );

          setError(
            "Login করা যায়নি। আবার চেষ্টা করুন।"
          );
        }

        return;
      }

      if (!data.user) {
        setError(
          "Login ব্যর্থ হয়েছে। আবার চেষ্টা করুন।"
        );
        return;
      }

      const nextPath = searchParams.get("next");

      const safeNextPath =
        nextPath &&
        nextPath.startsWith("/") &&
        !nextPath.startsWith("//")
          ? nextPath
          : "/";

      setSuccess("Login সফল হয়েছে।");

      setTimeout(() => {
        router.replace(safeNextPath);
        router.refresh();
      }, 500);
    } catch (error) {
      console.error(
        "Login error:",
        error
      );

      setError(
        "কিছু সমস্যা হয়েছে। আবার চেষ্টা করুন।"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f8f7] px-4 py-8">
      <div className="mx-auto w-full max-w-md">

        <Link
          href="/register"
          className="mb-6 flex items-center gap-3"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-green-600 text-xl font-black text-white">
            P
          </div>

          <div>
            <h1 className="text-lg font-black text-slate-900">
              Pocket Money
            </h1>

            <p className="text-xs text-slate-500">
              আপনার অ্যাকাউন্টে প্রবেশ করুন
            </p>
          </div>
        </Link>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">

          <h2 className="text-2xl font-black text-slate-900">
            Login
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            আপনার ব্যক্তিগত অ্যাকাউন্টে প্রবেশ করুন।
          </p>

          {error && (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-3 text-sm font-semibold text-green-700">
              {success}
            </div>
          )}

          <form
            onSubmit={handleLogin}
            className="mt-6 space-y-4"
          >

            <div>
              <label className="mb-1.5 block text-xs font-black text-slate-700">
                Gmail / ইমেইল
              </label>

              <input
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="আপনার Gmail দিন"
                autoComplete="email"
                disabled={loading}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-black text-slate-700">
                পাসওয়ার্ড
              </label>

              <input
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="আপনার পাসওয়ার্ড দিন"
                autoComplete="current-password"
                disabled={loading}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100 disabled:opacity-60"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-green-600 px-5 py-3.5 text-sm font-black text-white shadow-sm transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Login হচ্ছে..." : "Login"}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-5 text-center">
            <p className="text-sm text-slate-500">
              আপনার অ্যাকাউন্ট নেই?
            </p>

            <Link
              href="/register"
              className="mt-1 inline-block text-sm font-black text-green-600 hover:text-green-700"
            >
              Registration করুন →
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

function LoginLoading() {
  return (
    <main className="min-h-screen bg-[#f6f8f7] px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md items-center justify-center">
        <div className="text-sm font-semibold text-slate-500">
          Login লোড হচ্ছে...
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginForm />
    </Suspense>
  );
}