"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!supabase) {
      setError("Supabase is not configured. Please check your .env.local file.");
      return;
    }

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

      if (loginError) {
        const errorMessage = loginError.message.toLowerCase();

        if (
          errorMessage.includes("invalid login credentials") ||
          errorMessage.includes("invalid credentials")
        ) {
          setError(
            "Account not found or email/password is incorrect."
          );
        } else if (errorMessage.includes("email not confirmed")) {
          setError(
            "Please confirm your email address before logging in."
          );
        } else {
          setError(loginError.message);
        }

        return;
      }

      if (!data.user) {
        setError("Login failed. Please try again.");
        return;
      }

      setSuccess("Successfully logged in! Redirecting...");

      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 1000);
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f8f7] px-4 py-8">
      <div className="mx-auto w-full max-w-md">
        <Link
          href="/"
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
              Welcome back
            </p>
          </div>
        </Link>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <h2 className="text-2xl font-black text-slate-900">
            Login
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Login to your personal account.
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
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-black text-slate-700">
                Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-green-600 px-5 py-3.5 text-sm font-black text-white shadow-sm transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-5 text-center">
            <p className="text-sm text-slate-500">
              Don't have an account?
            </p>

            <Link
              href="/register"
              className="mt-1 inline-block text-sm font-black text-green-600 hover:text-green-700"
            >
              Create Account →
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}