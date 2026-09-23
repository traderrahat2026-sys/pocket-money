import Link from "next/link";

const actions = [
  { href: "/deposit", icon: "＋", label: "Deposit" },
  { href: "/withdraw", icon: "↗", label: "Withdraw" },
  { href: "/tasks", icon: "✓", label: "Tasks" },
  { href: "/profile", icon: "◎", label: "Profile" },
];

export default function QuickActions() {
  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-4">
      {actions.map((action) => (
        <Link
          key={action.label}
          href={action.href}
          className="flex min-h-[84px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-2 py-3 shadow-sm hover:border-green-200 hover:bg-green-50"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-lg font-black text-green-600">
            {action.icon}
          </span>

          <span className="mt-2 text-[11px] font-bold text-slate-700">
            {action.label}
          </span>
        </Link>
      ))}
    </div>
  );
}