type AdminStatusBadgeProps = {
  status: string;
};

export default function AdminStatusBadge({
  status,
}: AdminStatusBadgeProps) {
  const normalized = status.toLowerCase();

  const isApproved =
    normalized === "approved" ||
    normalized === "active" ||
    normalized === "success";

  const isRejected =
    normalized === "rejected" ||
    normalized === "cancelled" ||
    normalized === "failed";

  const isVerifying =
    normalized === "verifying" ||
    normalized === "processing";

  const labelMap: Record<string, string> = {
    pending: "অপেক্ষমাণ",
    verifying: "যাচাই হচ্ছে",
    approved: "অনুমোদিত",
    rejected: "বাতিল",
    active: "সক্রিয়",
    inactive: "নিষ্ক্রিয়",
    success: "সফল",
    failed: "ব্যর্থ",
    processing: "প্রক্রিয়াধীন",
  };

  const label = labelMap[normalized] || status;

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1.5 text-[11px] font-black ${
        isApproved
          ? "bg-[#eef9e9] text-[#3d8329]"
          : isRejected
            ? "bg-red-50 text-red-600"
            : isVerifying
              ? "bg-blue-50 text-blue-600"
              : "bg-amber-50 text-amber-600"
      }`}
    >
      {label}
    </span>
  );
}