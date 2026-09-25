"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [referralCode, setReferralCode] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const ref = searchParams.get("ref");

    if (ref) {
      setReferralCode(ref.trim().toUpperCase());
    }
  }, [searchParams]);

  const handleRegister = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setError("");
    setMessage("");

    const cleanFullName = fullName.trim();
    const cleanUsername = username.trim();
    const cleanPhone = phone.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanReferralCode = referralCode.trim().toUpperCase();

    if (
      !cleanFullName ||
      !cleanUsername ||
      !cleanPhone ||
      !cleanEmail ||
      !password ||
      !confirmPassword
    ) {
      setError("সব তথ্য পূরণ করুন।");
      return;
    }

    if (password.length < 6) {
      setError("পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।");
      return;
    }

    if (password !== confirmPassword) {
      setError("পাসওয়ার্ড এবং কনফার্ম পাসওয়ার্ড একই নয়।");
      return;
    }

    if (!/^01[3-9]\d{8}$/.test(cleanPhone)) {
      setError("সঠিক বাংলাদেশি মোবাইল নম্বর দিন।");
      return;
    }

    if (cleanReferralCode) {
      if (!/^PM[A-Z0-9]{8}$/.test(cleanReferralCode)) {
        setError("Referral code সঠিক নয়।");
        return;
      }
    }

    setLoading(true);

    try {
      const { data, error: signUpError } =
        await supabase.auth.signUp({
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
        const errorMessage =
          signUpError.message?.toLowerCase() || "";

        if (
          errorMessage.includes("user already registered") ||
          errorMessage.includes("already registered") ||
          errorMessage.includes("already exists")
        ) {
          setError(
            "এই Gmail দিয়ে ইতিমধ্যে account তৈরি করা আছে।"
          );
        } else if (
          errorMessage.includes("rate limit") ||
          errorMessage.includes("too many")
        ) {
          setError(
            "অনেকবার চেষ্টা করা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।"
          );
        } else if (
          errorMessage.includes("invalid email")
        ) {
          setError("সঠিক Gmail / Email দিন।");
        } else if (
          errorMessage.includes("password")
        ) {
          setError(
            "পাসওয়ার্ড সঠিক নয়। কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড দিন।"
          );
        } else {
          setError(signUpError.message);
        }

        return;
      }

      if (!data.user) {
        setError(
          "Registration সম্পন্ন হয়নি। আবার চেষ্টা করুন।"
        );
        return;
      }

      /*
       * Referral registration
       *
       * এখানে referral record তৈরি হবে।
       * তবে শুধু registration করলেই referral valid হবে না।
       * User package active করলে database logic অনুযায়ী
       * referral valid হবে।
       */
      if (cleanReferralCode) {
        const { error: referralError } =
          await supabase.rpc(
            "create_referral_for_new_user",
            {
              p_new_user_id: data.user.id,
              p_referral_code: cleanReferralCode,
            }
          );

        if (referralError) {
          console.error(
            "REFERRAL CREATE ERROR:",
            referralError
          );
        }
      }

      /*
       * Registration-এর পর user-কে automatically logged-in
       * অবস্থায় না রেখে Login page-এ পাঠানো হচ্ছে।
       */
      await supabase.auth.signOut();

      if (cleanReferralCode) {
        setMessage(
          "Registration সফল হয়েছে। Referral সংযুক্ত হয়েছে। এখন Login করুন।"
        );
      } else {
        setMessage(
          "Registration সফল হয়েছে। এখন Login করুন।"
        );
      }

      setTimeout(() => {
        router.push("/login");
      }, 1000);
    } catch (err) {
      console.error("REGISTRATION ERROR:", err);

      setError(
        "Registration করার সময় একটি সমস্যা হয়েছে। আবার চেষ্টা করুন।"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center">
        <div className="w-full rounded-3xl bg-white p-6 shadow-xl ring-1 ring-green-100 sm:p-8">
          {/* Header */}
          <div className="mb-7 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-600 text-2xl font-black text-white shadow-lg">
              ৳
            </div>

            <h1 className="text-2xl font-black text-gray-900">
              Registration
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              নতুন account তৈরি করুন
            </p>
          </div>

          {/* Referral notice */}
          {referralCode && (
            <div className="mb-5 rounded-2xl border border-green-200 bg-green-50 p-4">
              <p className="text-sm font-bold text-green-800">
                Referral সংযুক্ত আছে
              </p>

              <p className="mt-1 break-all text-sm font-black text-green-700">
                {referralCode}
              </p>

              <p className="mt-1 text-xs text-green-700">
                Package Active করলে referral count হবে।
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          {/* Success */}
          {message && (
            <div className="mb-5 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
              {message}
            </div>
          )}

          <form
            onSubmit={handleRegister}
            className="space-y-4"
          >
            {/* Full Name */}
            <div>
              <label className="mb-2 block text-sm font-bold text-gray-700">
                পূর্ণ নাম
              </label>

              <input
                type="text"
                value={fullName}
                onChange={(e) =>
                  setFullName(e.target.value)
                }
                placeholder="আপনার পূর্ণ নাম"
                autoComplete="name"
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm outline-none transition focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100"
                disabled={loading}
              />
            </div>

            {/* Username */}
            <div>
              <label className="mb-2 block text-sm font-bold text-gray-700">
                ইউজারনেম
              </label>

              <input
                type="text"
                value={username}
                onChange={(e) =>
                  setUsername(e.target.value)
                }
                placeholder="আপনার ইউজারনেম"
                autoComplete="username"
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm outline-none transition focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100"
                disabled={loading}
              />
            </div>

            {/* Phone */}
            <div>
              <label className="mb-2 block text-sm font-bold text-gray-700">
                মোবাইল নম্বর
              </label>

              <input
                type="tel"
                value={phone}
                onChange={(e) =>
                  setPhone(e.target.value.replace(/\D/g, ""))
                }
                placeholder="01XXXXXXXXX"
                autoComplete="tel"
                inputMode="numeric"
                maxLength={11}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm outline-none transition focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100"
                disabled={loading}
              />
            </div>

            {/* Email */}
            <div>
              <label className="mb-2 block text-sm font-bold text-gray-700">
                Gmail / Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                placeholder="example@gmail.com"
                autoComplete="email"
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm outline-none transition focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100"
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div>
              <label className="mb-2 block text-sm font-bold text-gray-700">
                পাসওয়ার্ড
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                placeholder="কমপক্ষে ৬ অক্ষর"
                autoComplete="new-password"
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm outline-none transition focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100"
                disabled={loading}
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label className="mb-2 block text-sm font-bold text-gray-700">
                পাসওয়ার্ড নিশ্চিত করুন
              </label>

              <input
                type="password"
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(e.target.value)
                }
                placeholder="পাসওয়ার্ড আবার লিখুন"
                autoComplete="new-password"
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm outline-none transition focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100"
                disabled={loading}
              />
            </div>

            {/* Referral */}
            <div>
              <label className="mb-2 block text-sm font-bold text-gray-700">
                Referral Code
                <span className="ml-1 font-normal text-gray-400">
                  (ঐচ্ছিক)
                </span>
              </label>

              <input
                type="text"
                value={referralCode}
                onChange={(e) =>
                  setReferralCode(
                    e.target.value.toUpperCase()
                  )
                }
                placeholder="PMXXXXXXXX"
                maxLength={10}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm uppercase outline-none transition focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100"
                disabled={loading}
              />

              <p className="mt-1.5 text-xs text-gray-400">
                Referral link থেকে এলে এটি automatically পূরণ হবে।
              </p>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-2xl bg-green-600 px-4 py-4 text-sm font-black text-white shadow-lg shadow-green-200 transition hover:bg-green-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Registration হচ্ছে..."
                : "Registration"}
            </button>
          </form>

          {/* Login */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              আগে থেকেই account আছে?
            </p>

            <button
              type="button"
              onClick={() => router.push("/login")}
              className="mt-2 font-black text-green-600 hover:text-green-700"
            >
              Login
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 via-white to-emerald-50 px-4">
          <div className="rounded-2xl bg-white px-6 py-5 text-center shadow-lg">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-green-200 border-t-green-600" />
            <p className="text-sm font-bold text-gray-600">
              লোড হচ্ছে...
            </p>
          </div>
        </main>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}