export default function StatsCards() {
  const stats = [
    {
      icon: "৳",
      label: "Available Balance",
      value: "৳0.00",
    },
    {
      icon: "↗",
      label: "Total Earned",
      value: "৳0.00",
    },
    {
      icon: "✓",
      label: "Active Packages",
      value: "0",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-green-50 text-sm font-black text-green-600">
            {stat.icon}
          </div>

          <p className="mt-2 text-[10px] font-semibold text-slate-500 sm:text-xs">
            {stat.label}
          </p>

          <p className="mt-1 truncate text-sm font-black">
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  );
}