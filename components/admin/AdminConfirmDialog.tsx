"use client";

type AdminConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function AdminConfirmDialog({
  open,
  title,
  message,
  confirmText = "নিশ্চিত করুন",
  cancelText = "বাতিল",
  loading = false,
  danger = false,
  onConfirm,
  onCancel,
}: AdminConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[26px] bg-white p-6 shadow-[0_30px_100px_rgba(0,0,0,0.18)]">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-black ${
            danger
              ? "bg-red-50 text-red-600"
              : "bg-[#eef9e9] text-[#4f9d32]"
          }`}
        >
          {danger ? "!" : "?"}
        </div>

        <h2 className="mt-5 text-xl font-black text-[#151d18]">
          {title}
        </h2>

        <p className="mt-2 text-sm leading-6 text-black/50">
          {message}
        </p>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-2xl border border-black/[0.08] px-4 py-3 text-sm font-bold text-black/55"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 rounded-2xl px-4 py-3 text-sm font-black text-white disabled:opacity-50 ${
              danger ? "bg-red-600" : "bg-[#101713]"
            }`}
          >
            {loading ? "অপেক্ষা করুন..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}