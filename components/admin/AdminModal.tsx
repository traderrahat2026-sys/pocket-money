"use client";

import { ReactNode, useEffect } from "react";

type AdminModalProps = {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
};

export default function AdminModal({
  open,
  title,
  description,
  onClose,
  children,
}: AdminModalProps) {
  useEffect(() => {
    if (!open) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKey);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", handleKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        className="absolute inset-0"
        onClick={onClose}
      />

      <div className="relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-[28px] bg-white p-6 shadow-[0_30px_100px_rgba(0,0,0,0.18)] sm:max-w-lg sm:rounded-[28px]">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black tracking-[-0.03em] text-[#151d18]">
              {title}
            </h2>

            {description && (
              <p className="mt-1.5 text-sm leading-6 text-black/45">
                {description}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f4f7f5] text-lg text-black/50"
          >
            ×
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}