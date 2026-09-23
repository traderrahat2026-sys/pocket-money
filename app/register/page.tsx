"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function RegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleRegister = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    const cleanFullName = fullName.trim();
    const cleanUsername = username.trim();
    const cleanPhone = phone.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (
      !cleanFullName ||
      !cleanUsername ||
      !cleanPhone ||
      !cleanEmail ||
      !password ||
      !confirmPassword
    ) {
      setError("Please fill in all fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      /*
       * Create Supabase Auth account.
       *
       * The same email + password will be used for future login.
       */
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            username: cleanUsername,
            full_name: cleanFullName,
            phone: cleanPhone,
          },
        },
      });

      if (signUpError) {
        const message = signUpError.message.toLowerCase();

        if (
          message.includes("already registered") ||
          message.includes("already exists") ||
          message.includes("user already registered")
        ) {
          setError(
            "An account with this Gmail already exists. Please login."
          );
        } else {
          setError(signUpError.message);
        }

        return;
      }

      if (!data.user) {
        setError("Account could not be created. Please try again.");
        return;
      }

      /*
       * If email confirmation is OFF, Supabase should create
       * an active session immediately.
       */
      if (data.session) {
        setSuccess("Account created successfully. Logging you in...");

        setTimeout(() => {
          router.replace("/");
          router.refresh();
        }, 700);

        return;
      }

      /*
       * If this appears, Email Confirmation is still enabled
       * in Supabase.
       */
      setSuccess(
        "Account created. Please confirm your email address before logging in."
      );

      setTimeout(() => {
        router.replace("/login");
      }, 1200);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f7faf7] px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md items-center">
        <div className="w-full">
          {/* Brand */}
          <div className="mb-8 text-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#7ed957] shadow-lg shadow-green-100">
                <span className="text-2xl font-black text-white">
                  P
                </span>
              </div>
            </Link>

            <h1 className="mt-5 text-3xl font-black tracking-tight text-gray-900">
              Create Account
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Join Pocket Money and start earning rewards
            </p>
          </div>

          {/* Card */}
          <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-[0_15px_50px_rgba(0,0,0,0.06)] sm:p-7">
            {error && (
              <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium leading-5 text-red-600">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-5 rounded-2xl border border-green-100 bg-green-50 px-4 py-3 text-sm font-medium leading-5 text-green-700">
                {success}
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Full Name
                </label>

                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  autoComplete="name"
                  disabled={loading}
                  className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm outline-none transition focus:border-[#7ed957] focus:bg-white focus:ring-4 focus:ring-green-50 disabled:opacity-60"
                />
              </div>

              {/* Username */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Username
                </label>

                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose a username"
                  autoComplete="username"
                  disabled={loading}
                  className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm outline-none transition focus:border-[#7ed957] focus:bg-white focus:ring-4 focus:ring-green-50 disabled:opacity-60"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Phone Number
                </label>

                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  autoComplete="tel"
                  disabled={loading}
                  className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm outline-none transition focus:border-[#7ed957] focus:bg-white focus:ring-4 focus:ring-green-50 disabled:opacity-60"
                />
              </div>

              {/* Email */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Gmail / Email
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your Gmail"
                  autoComplete="email"
                  disabled={loading}
                  className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm outline-none transition focus:border-[#7ed957] focus:bg-white focus:ring-4 focus:ring-green-50 disabled:opacity-60"
                />
              </div>

              {/* Password */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Password
                </label>

                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  autoComplete="new-password"
                  disabled={loading}
                  className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm outline-none transition focus:border-[#7ed957] focus:bg-white focus:ring-4 focus:ring-green-50 disabled:opacity-60"
                />
              </div>

              {/* Confirm Password */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Confirm Password
                </label>

                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) =>
                    setConfirmPassword(e.target.value)
                  }
                  placeholder="Enter password again"
                  autoComplete="new-password"
                  disabled={loading}
                  className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm outline-none transition focus:border-[#7ed957] focus:bg-white focus:ring-4 focus:ring-green-50 disabled:opacity-60"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex h-13 w-full items-center justify-center rounded-2xl bg-[#7ed957] px-5 text-sm font-bold text-white shadow-lg shadow-green-100 transition hover:bg-[#70ca4c] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Creating Account..." : "Create Account"}
              </button>
            </form>

            {/* Login */}
            <div className="mt-7 border-t border-gray-100 pt-6 text-center">
              <p className="text-sm text-gray-500">
                Already have an account?
              </p>

              <Link
                href="/login"
                className="mt-2 inline-block text-sm font-bold text-[#4f9d32] hover:underline"
              >
                Login
              </Link>
            </div>
          </div>

          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-sm font-medium text-gray-500 hover:text-gray-800"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}