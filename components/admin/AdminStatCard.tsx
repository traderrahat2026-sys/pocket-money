type AdminStatCardProps = {
  title: string;
  value: string | number;
  description?: string;
  icon: string;
  href?: string;
  loading?: boolean;
};

export default function AdminStatCard({
  title,
  value,
  description,
  icon,
  href,
  loading = false,
}: AdminStatCardProps) {
  const content = (
    <div className="group rounded-[22px] border border-black/[0.06] bg-white p-5 shadow-[0_8px_30px_rgba(20,30,24,0.04)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_40px_rgba(20,30,24,0.08)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef9e9] text-lg font-black text-[#4f9d32]">
          {icon}
        </div>

        {href && (
          <span className="text-black/20 transition group-hover:translate-x-1 group-hover:text-[#4f9d32]">
            →
          </span>
        )}
      </div>

      <p className="mt-5 text-sm font-bold text-black/50">{title}</p>

      {loading ? (
        <div className="mt-2 h-9 w-24 animate-pulse rounded-lg bg-black/[0.06]" />
      ) : (
        <p className="mt-1 text-3xl font-black tracking-[-0.04em] text-[#151d18]">
          {value}
        </p>
      )}

      {description && (
        <p className="mt-2 text-xs leading-5 text-black/40">
          {description}
        </p>
      )}
    </div>
  );

  if (!href) return content;

  return <a href={href}>{content}</a>;
}