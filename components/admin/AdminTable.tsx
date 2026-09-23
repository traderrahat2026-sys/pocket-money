"use client";

import { ReactNode } from "react";

type Column<T> = {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
};

type AdminTableProps<T> = {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T, index: number) => string;
  loading?: boolean;
  emptyText?: string;
};

export default function AdminTable<T>({
  columns,
  data,
  rowKey,
  loading = false,
  emptyText = "কোনো তথ্য পাওয়া যায়নি।",
}: AdminTableProps<T>) {
  return (
    <div className="overflow-hidden rounded-[22px] border border-black/[0.06] bg-white shadow-[0_8px_30px_rgba(20,30,24,0.04)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse">
          <thead>
            <tr className="border-b border-black/[0.06] bg-[#f7f9f8]">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-5 py-4 text-left text-xs font-black text-black/45"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <tr key={`loading-${index}`} className="border-b border-black/[0.05]">
                  {columns.map((column) => (
                    <td key={column.key} className="px-5 py-5">
                      <div className="h-4 w-24 animate-pulse rounded bg-black/[0.06]" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-5 py-16 text-center text-sm font-medium text-black/35"
                >
                  {emptyText}
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr
                  key={rowKey(row, index)}
                  className="border-b border-black/[0.05] last:border-b-0 hover:bg-[#fbfcfb]"
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className="px-5 py-4 text-sm text-[#26322b]"
                    >
                      {column.render
                        ? column.render(row)
                        : String(
                            (row as Record<string, unknown>)[column.key] ?? "—",
                          )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}