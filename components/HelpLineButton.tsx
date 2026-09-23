"use client";

import Link from "next/link";

export default function HelpLineButton() {
  return (
    <Link
      href="/help"
      aria-label="হেল্প লাইন"
      className="
        fixed
        right-4
        bottom-[88px]
        z-[70]

        flex
        h-12
        w-12
        items-center
        justify-center

        rounded-full

        border
        border-cyan-300/40

        bg-gradient-to-br
        from-purple-600/95
        via-blue-600/95
        to-cyan-500/95

        shadow-[0_0_18px_rgba(59,130,246,0.55)]

        backdrop-blur-xl

        transition-all
        duration-200

        hover:scale-110
        hover:shadow-[0_0_28px_rgba(34,211,238,0.7)]

        active:scale-90
      "
    >
      <span className="relative flex items-center justify-center">
        <span className="text-[21px] leading-none">
          💬
        </span>

        <span
          className="
            absolute
            -right-1
            -top-1
            h-2.5
            w-2.5
            rounded-full
            border
            border-white/50
            bg-cyan-300
            shadow-[0_0_9px_rgba(103,232,249,1)]
          "
        />
      </span>
    </Link>
  );
}