"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type HelpData = {
  firstAdminUrl: string;
  secondAdminUrl: string;
  thirdAdminUrl: string;
  telegramChannelUrl: string;
};

function makeTelegramUrl(value: string) {
  const raw = String(value || "").trim();

  if (!raw) return "";

  // Full Telegram URL already
  if (/^https?:\/\/(www\.)?t\.me\//i.test(raw)) {
    return raw;
  }

  if (/^https?:\/\/(www\.)?telegram\.me\//i.test(raw)) {
    return raw;
  }

  let username = raw
    .replace(/^@+/, "")
    .replace(/^https?:\/\/(www\.)?t\.me\//i, "")
    .replace(/^https?:\/\/(www\.)?telegram\.me\//i, "")
    .replace(/^t\.me\//i, "")
    .replace(/^telegram\.me\//i, "")
    .split(/[/?#]/)[0]
    .trim();

  if (!username) return "";

  return `https://t.me/${username}`;
}

function openTelegram(value: string) {
  const url = makeTelegramUrl(value);

  if (!url) {
    return;
  }

  window.location.href = url;
}

function openChannel(value: string) {
  const url = String(value || "").trim();

  if (!url) {
    return;
  }

  if (
    !/^https?:\/\/(www\.)?(t\.me|telegram\.me)\//i.test(
      url
    )
  ) {
    return;
  }

  window.location.href = url;
}

export default function HelpPage() {
  const [help, setHelp] = useState<HelpData>({
    firstAdminUrl: "",
    secondAdminUrl: "",
    thirdAdminUrl: "",
    telegramChannelUrl: "",
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHelpLine() {
      try {
        const response = await fetch("/api/help-line", {
          cache: "no-store",
        });

        const result = await response.json();

        console.log(
          "HELP API RESPONSE:",
          result
        );

        if (
          result?.success &&
          result?.data
        ) {
          setHelp({
            firstAdminUrl:
              result.data.firstAdminUrl || "",

            secondAdminUrl:
              result.data.secondAdminUrl || "",

            thirdAdminUrl:
              result.data.thirdAdminUrl || "",

            telegramChannelUrl:
              result.data.telegramChannelUrl || "",
          });
        }
      } catch (error) {
        console.error(
          "Help line load error:",
          error
        );
      } finally {
        setLoading(false);
      }
    }

    loadHelpLine();
  }, []);

  const admins = [
    {
      name: "ফার্স্ট অ্যাডমিন",
      username: help.firstAdminUrl,
      icon: "👤",
    },
    {
      name: "সেকেন্ড অ্যাডমিন",
      username: help.secondAdminUrl,
      icon: "👤",
    },
    {
      name: "থার্ড অ্যাডমিন",
      username: help.thirdAdminUrl,
      icon: "👤",
    },
  ];

  return (
    <main className="min-h-screen bg-[#050816] px-4 py-6 text-white">
      <div className="mx-auto w-full max-w-md">

        {/* Home Button */}
        <div className="mb-5">
          <Link
            href="/"
            aria-label="হোমে ফিরুন"
            className="
              inline-flex
              items-center
              gap-2
              rounded-xl
              border
              border-white/10
              bg-white/[0.06]
              px-4
              py-2.5
              text-sm
              font-medium
              text-white
              backdrop-blur-xl
              transition-all
              duration-200
              hover:border-cyan-300/40
              hover:bg-white/[0.10]
              hover:shadow-[0_0_18px_rgba(34,211,238,0.15)]
              active:scale-95
            "
          >
            <span className="text-lg leading-none">
              ⌂
            </span>

            <span>
              হোমে ফিরুন
            </span>
          </Link>
        </div>

        {/* Header */}
        <div className="mb-6 text-center">
          <div
            className="
              mx-auto
              mb-4
              flex
              h-20
              w-20
              items-center
              justify-center
              rounded-full
              border
              border-cyan-300/30
              bg-gradient-to-br
              from-purple-600
              via-blue-600
              to-cyan-500
              shadow-[0_0_35px_rgba(34,211,238,0.35)]
            "
          >
            <span className="text-4xl">
              💬
            </span>
          </div>

          <h1 className="text-2xl font-bold">
            হেল্প লাইন
          </h1>

          <p className="mt-2 text-sm text-cyan-200">
            যেকোনো সমস্যায় যোগাযোগ করুন
          </p>

          <p className="mt-1 text-xs text-white/60">
            সকল আপডেট পেতে আমাদের চ্যানেলে যোগ দিন
          </p>
        </div>

        {/* Admin Cards */}
        <div className="space-y-3">
          {admins.map((admin) => {
            const telegramUrl =
              makeTelegramUrl(
                admin.username
              );

            const available =
              Boolean(telegramUrl);

            return (
              <button
                key={admin.name}
                type="button"
                disabled={!available}
                onClick={() =>
                  openTelegram(
                    admin.username
                  )
                }
                className={`
                  group
                  relative
                  w-full
                  overflow-hidden
                  rounded-2xl
                  border
                  p-4
                  text-left
                  transition-all
                  duration-200

                  ${
                    available
                      ? `
                        border-purple-400/30
                        bg-white/[0.07]
                        shadow-[0_0_20px_rgba(139,92,246,0.12)]
                        hover:scale-[1.02]
                        hover:border-cyan-300/50
                        hover:bg-white/[0.11]
                        hover:shadow-[0_0_28px_rgba(34,211,238,0.18)]
                        active:scale-[0.98]
                      `
                      : `
                        cursor-not-allowed
                        border-white/10
                        bg-white/[0.03]
                        opacity-40
                      `
                  }
                `}
              >
                {/* Glow */}
                <div
                  className="
                    pointer-events-none
                    absolute
                    -right-10
                    -top-10
                    h-24
                    w-24
                    rounded-full
                    bg-purple-500/20
                    blur-2xl
                  "
                />

                <div className="relative flex items-center gap-4">
                  {/* Icon */}
                  <div
                    className="
                      flex
                      h-12
                      w-12
                      shrink-0
                      items-center
                      justify-center
                      rounded-xl
                      border
                      border-purple-300/20
                      bg-gradient-to-br
                      from-purple-600/80
                      to-blue-600/80
                    "
                  >
                    <span className="text-xl">
                      {admin.icon}
                    </span>
                  </div>

                  {/* Text */}
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-bold">
                      {admin.name}
                    </p>

                    <p className="mt-1 text-xs text-white/50">
                      Telegram-এ যোগাযোগ করুন
                    </p>
                  </div>

                  {/* Arrow */}
                  <div
                    className="
                      flex
                      h-9
                      w-9
                      shrink-0
                      items-center
                      justify-center
                      rounded-full
                      bg-cyan-400/10
                      text-cyan-300
                      transition-transform
                      group-hover:translate-x-1
                    "
                  >
                    →
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Telegram Channel */}
        <div className="mt-5">
          <button
            type="button"
            disabled={
              !help.telegramChannelUrl
            }
            onClick={() =>
              openChannel(
                help.telegramChannelUrl
              )
            }
            className={`
              group
              relative
              w-full
              overflow-hidden
              rounded-2xl
              border
              p-5
              text-left
              transition-all
              duration-200

              ${
                help.telegramChannelUrl
                  ? `
                    border-cyan-300/30
                    bg-gradient-to-r
                    from-blue-600/20
                    via-cyan-500/10
                    to-blue-600/20
                    shadow-[0_0_25px_rgba(34,211,238,0.15)]
                    hover:scale-[1.02]
                    hover:border-cyan-300/60
                    hover:shadow-[0_0_32px_rgba(34,211,238,0.25)]
                    active:scale-[0.98]
                  `
                  : `
                    cursor-not-allowed
                    border-white/10
                    bg-white/[0.03]
                    opacity-40
                  `
              }
            `}
          >
            {/* Glow */}
            <div
              className="
                pointer-events-none
                absolute
                -right-12
                -top-12
                h-32
                w-32
                rounded-full
                bg-cyan-400/20
                blur-3xl
              "
            />

            <div className="relative flex items-center gap-4">
              {/* Telegram Icon */}
              <div
                className="
                  flex
                  h-14
                  w-14
                  shrink-0
                  items-center
                  justify-center
                  rounded-2xl
                  bg-[#229ED9]
                  shadow-[0_0_20px_rgba(34,158,217,0.4)]
                "
              >
                <span className="text-2xl">
                  ✈️
                </span>
              </div>

              {/* Text */}
              <div className="min-w-0 flex-1">
                <p className="text-base font-bold">
                  আমাদের টেলিগ্রাম চ্যানেল
                </p>

                <p className="mt-1 text-xs text-cyan-100/60">
                  সকল আপডেট পেতে চ্যানেলে যোগ দিন
                </p>
              </div>

              {/* Arrow */}
              <div
                className="
                  flex
                  h-9
                  w-9
                  shrink-0
                  items-center
                  justify-center
                  rounded-full
                  bg-white/10
                  text-cyan-200
                  transition-transform
                  group-hover:translate-x-1
                "
              >
                →
              </div>
            </div>
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <p className="mt-5 text-center text-xs text-white/40">
            তথ্য লোড হচ্ছে...
          </p>
        )}

        {/* Footer */}
        <p className="mt-8 text-center text-[11px] text-white/30">
          যেকোনো সমস্যায় আমাদের সাথে যোগাযোগ করুন
        </p>
      </div>
    </main>
  );
}