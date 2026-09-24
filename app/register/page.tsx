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

  async function handleRegister(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (loading) return;

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
      setError("সবগুলো তথ্য পূরণ করুন।");
      return;
    }

    if (password.length < 6) {
      setError("পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।");
      return;
    }

    if (password !== confirmPassword) {
      setError("দুইটি পাসওয়ার্ড একই নয়।");
      return;
    }

    const normalizedPhone = cleanPhone.replace(/\s+/g, "");

    if (!/^01[3-9]\d{8}$/.test(normalizedPhone)) {
      setError(
        "সঠিক ১১ সংখ্যার বাংলাদেশি মোবাইল নম্বর দিন।"
      );
      return;
    }

    setLoading(true);

    try {
      /*
       * প্রথমে Supabase Auth account তৈরি করা হচ্ছে।
       *
       * Confirm Email OFF থাকলে confirmation email লাগবে না।
       */
      const {
        data,
        error: signUpError,
      } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            username: cleanUsername,
            full_name: cleanFullName,
            phone: normalizedPhone,
          },
        },
      });

      if (signUpError) {
        const message =
          signUpError.message.toLowerCase();

        if (
          message.includes("already registered") ||
          message.includes("already exists") ||
          message.includes("user already registered") ||
          message.includes("email address is already registered") ||
          message.includes("user with this email already exists")
        ) {
          setError(
            "এই Gmail দিয়ে আগে থেকেই একটি অ্যাকাউন্ট আছে। Login করুন।"
          );
        } else if (
          message.includes("rate limit") ||
          message.includes("too many requests")
        ) {
          setError(
            "অনেকবার চেষ্টা করা হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।"
          );
        } else if (
          message.includes("invalid email")
        ) {
          setError("সঠিক Gmail / ইমেইল দিন।");
        } else if (
          message.includes("password")
        ) {
          setError(
            "পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।"
          );
        } else {
          console.error(
            "Supabase signup error:",
            signUpError
          );

          setError(
            "Registration করা যায়নি। তথ্যগুলো পরীক্ষা করে আবার চেষ্টা করুন।"
          );
        }

        return;
      }

      if (!data.user) {
        setError(
          "অ্যাকাউন্ট তৈরি করা যায়নি। আবার চেষ্টা করুন।"
        );
        return;
      }

      /*
       * Auth account তৈরি হওয়ার পর profile trigger
       * metadata থেকে profile তৈরি করবে।
       *
       * এখানে profiles table SELECT করা হচ্ছে না।
       * তাই নতুন logged-out user-এর RLS-এর কারণে
       * Registration আটকে যাবে না।
       */

      /*
       * Registration-এর পর automatic login চাই না।
       * তাই session clear করছি।
       */
      await supabase.auth.signOut();

      setSuccess(
        "Registration সফল হয়েছে। এখন Login করুন।"
      );

      setTimeout(() => {
        router.replace("/login");
        router.refresh();
      }, 1000);
    } catch (error) {
      console.error(
        "Registration error:",
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
    <main className="min-h-screen bg-[#f7faf7] px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md items-center">
        <div className="w-full">

          {/* Brand */}
          <div className="mb-8 text-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#7ed957] shadow-lg shadow-green-100">
                <span className="text-2xl font-black text-white">
                  P
                </span>
              </div>
            </Link>

            <h1 className="mt-5 text-3xl font-black tracking-tight text-gray-900">
              Registration
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Pocket Money-তে আপনার অ্যাকাউন্ট তৈরি করুন
            </p>
          </div>

          {/* Card */}
          <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-[0_15px_50px_rgba(0,0,0,0.06)] sm:p-7">

            {/* Error */}
            {error && (
              <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium leading-5 text-red-600">
                {error}
              </div>
            )}

            {/* Success */}
            {success && (
              <div className="mb-5 rounded-2xl border border-green-100 bg-green-50 px-4 py-3 text-sm font-medium leading-5 text-green-700">
                {success}
              </div>
            )}

            <form
              onSubmit={handleRegister}
              className="space-y-4"
            >

              {/* Full Name */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  পূর্ণ নাম
                </label>

                <input
                  type="text"
                  value={fullName}
                  onChange={(event) =>
                    setFullName(event.target.value)
                  }
                  placeholder="আপনার পূর্ণ নাম দিন"
                  autoComplete="name"
                  disabled={loading}
                  className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm outline-none transition focus:border-[#7ed957] focus:bg-white focus:ring-4 focus:ring-green-50 disabled:opacity-60"
                />
              </div>

              {/* Username */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  ইউজারনেম
                </label>

                <input
                  type="text"
                  value={username}
                  onChange={(event) =>
                    setUsername(event.target.value)
                  }
                  placeholder="একটি ইউজারনেম দিন"
                  autoComplete="username"
                  disabled={loading}
                  className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm outline-none transition focus:border-[#7ed957] focus:bg-white focus:ring-4 focus:ring-green-50 disabled:opacity-60"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  মোবাইল নম্বর
                </label>

                <input
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(event) =>
                    setPhone(event.target.value)
                  }
                  placeholder="01XXXXXXXXX"
                  autoComplete="tel"
                  disabled={loading}
                  className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm outline-none transition focus:border-[#7ed957] focus:bg-white focus:ring-4 focus:ring-green-50 disabled:opacity-60"
                />

                <p className="mt-1.5 text-xs text-gray-400">
                  একটি মোবাইল নম্বর দিয়ে একটি অ্যাকাউন্ট করা যাবে।
                </p>
              </div>

              {/* Email */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
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
                  className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm outline-none transition focus:border-[#7ed957] focus:bg-white focus:ring-4 focus:ring-green-50 disabled:opacity-60"
                />

                <p className="mt-1.5 text-xs text-gray-400">
                  একটি Gmail দিয়ে একটি অ্যাকাউন্ট করা যাবে।
                </p>
              </div>

              {/* Password */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  পাসওয়ার্ড
                </label>

                <input
                  type="password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  placeholder="একটি পাসওয়ার্ড তৈরি করুন"
                  autoComplete="new-password"
                  disabled={loading}
                  className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm outline-none transition focus:border-[#7ed957] focus:bg-white focus:ring-4 focus:ring-green-50 disabled:opacity-60"
                />

                <p className="mt-1.5 text-xs text-gray-400">
                  কমপক্ষে ৬ অক্ষর।
                </p>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  পাসওয়ার্ড নিশ্চিত করুন
                </label>

                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(event.target.value)
                  }
                  placeholder="আবার পাসওয়ার্ড দিন"
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
                {loading
                  ? "Registration হচ্ছে..."
                  : "Registration"}
              </button>
            </form>

            {/* Login */}
            <div className="mt-7 border-t border-gray-100 pt-6 text-center">
              <p className="text-sm text-gray-500">
                আগে থেকেই অ্যাকাউন্ট আছে?
              </p>

              <Link
                href="/login"
                className="mt-2 inline-block text-sm font-bold text-[#4f9d32] hover:underline"
              >
                Login
              </Link>
            </div>
          </div>

          {/* Bottom */}
          <div className="mt-6 text-center">
            <Link
              href="/register"
              className="text-sm font-medium text-gray-500 hover:text-gray-800"
            >
              ← Registration পেজে থাকুন
            </Link>
          </div>

        </div>
      </div>
    </main>
  );
}