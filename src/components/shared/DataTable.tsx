"use client";

import React from "react";
import { Search, ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import { SkeletonTable } from "./SkeletonLoaders";

export interface Column<T> {
  key: string;
  header: string;
  align?: "left" | "right" | "center";
  render?: (item: T, index: number) => React.ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  renderCard?: (item: T, index: number) => React.ReactNode;
  loading?: boolean;
  emptyState?: React.ReactNode;
  pagination?: {
    page: number;
    totalPages: number;
    total: number;
    onPageChange: (newPage: number) => void;
  };
  search?: {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
  };
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  onRowClick?: (item: T) => void;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  renderCard,
  loading = false,
  emptyState,
  pagination,
  search,
  filters,
  actions,
  onRowClick,
  className = "",
}: DataTableProps<T>) {
  if (loading) {
    return <SkeletonTable rows={6} cols={columns.length} />;
  }

  const showToolbar = Boolean(search || filters || actions);

  return (
    <div
      className={`bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden ${className}`}
    >
      {/* Search and Filters Toolbar */}
      {showToolbar && (
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-3">
            {search && (
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search.value}
                  onChange={(e) => search.onChange(e.target.value)}
                  placeholder={search.placeholder || "Search records..."}
                  className="w-full pl-10 pr-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}
            {filters}
          </div>

          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      )}

      {/* Empty State */}
      {data.length === 0 ? (
        emptyState || (
          <div className="p-12 text-center space-y-2">
            <Inbox className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
            <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
              No records found
            </div>
            <p className="text-xs text-slate-400">
              No data matched the current search or filter criteria.
            </p>
          </div>
        )
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  {columns.map((col) => {
                    const alignClass =
                      col.align === "right"
                        ? "text-right"
                        : col.align === "center"
                        ? "text-center"
                        : "text-left";

                    return (
                      <th
                        key={col.key}
                        className={`px-6 py-3.5 ${alignClass} ${col.className || ""}`}
                      >
                        {col.header}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.map((item, index) => (
                  <tr
                    key={keyExtractor(item)}
                    onClick={() => onRowClick && onRowClick(item)}
                    className={`transition-colors ${
                      onRowClick ? "cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/50" : "hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                    }`}
                  >
                    {columns.map((col) => {
                      const alignClass =
                        col.align === "right"
                          ? "text-right"
                          : col.align === "center"
                          ? "text-center"
                          : "text-left";

                      return (
                        <td
                          key={col.key}
                          className={`px-6 py-4 ${alignClass} ${col.className || ""}`}
                        >
                          {col.render
                            ? col.render(item, index)
                            : (item as any)[col.key] ?? "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {data.map((item, index) => {
              if (renderCard) {
                return (
                  <div key={keyExtractor(item)} className="p-4">
                    {renderCard(item, index)}
                  </div>
                );
              }

              // Default fallback card if renderCard is not provided
              return (
                <div
                  key={keyExtractor(item)}
                  onClick={() => onRowClick && onRowClick(item)}
                  className="p-4 space-y-2 text-xs"
                >
                  {columns.map((col) => (
                    <div
                      key={col.key}
                      className="flex items-center justify-between gap-3"
                    >
                      <span className="font-semibold text-slate-400 text-[11px] uppercase">
                        {col.header}:
                      </span>
                      <div className="text-right text-slate-800 dark:text-slate-200">
                        {col.render
                          ? col.render(item, index)
                          : (item as any)[col.key] ?? "—"}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          {/* Pagination Footer */}
          {pagination && (
            <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between text-xs">
              <div className="text-slate-500">
                Showing <strong className="text-slate-700 dark:text-slate-300">{data.length}</strong> of{" "}
                <strong className="text-slate-700 dark:text-slate-300">{pagination.total}</strong> records
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => pagination.onPageChange(Math.max(1, pagination.page - 1))}
                  disabled={pagination.page <= 1}
                  className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                </button>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 px-2">
                  Page {pagination.page} of {pagination.totalPages || 1}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    pagination.onPageChange(Math.min(pagination.totalPages, pagination.page + 1))
                  }
                  disabled={pagination.page >= pagination.totalPages}
                  className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
