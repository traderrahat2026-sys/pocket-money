"use client";

type AdminPaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export default function AdminPagination({
  page,
  totalPages,
  onPageChange,
}: AdminPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-5 flex items-center justify-between gap-3">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="rounded-xl border border-black/[0.07] bg-white px-4 py-2.5 text-xs font-bold text-black/55 disabled:cursor-not-allowed disabled:opacity-30"
      >
        ← আগের
      </button>

      <div className="flex items-center gap-1.5">
        {Array.from({ length: totalPages }, (_, index) => index + 1)
          .slice(Math.max(0, page - 3), Math.min(totalPages, page + 2))
          .map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange(item)}
              className={`h-9 w-9 rounded-xl text-xs font-black ${
                item === page
                  ? "bg-[#101713] text-white"
                  : "bg-white text-black/45"
              }`}
            >
              {item}
            </button>
          ))}
      </div>

      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className="rounded-xl border border-black/[0.07] bg-white px-4 py-2.5 text-xs font-bold text-black/55 disabled:cursor-not-allowed disabled:opacity-30"
      >
        পরের →
      </button>
    </div>
  );
}