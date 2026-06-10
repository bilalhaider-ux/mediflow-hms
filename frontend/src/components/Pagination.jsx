import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const Pagination = ({ currentPage, totalPages, totalCount = 0, onPageChange, pageSize = 20 }) => {
  if (totalPages <= 1) return null;

  const startItem = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalCount);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-4 text-xs font-semibold text-slate-500">
      <div>
        Showing <span className="font-bold text-slate-800">{startItem}</span> to{" "}
        <span className="font-bold text-slate-800">{endItem}</span> of{" "}
        <span className="font-bold text-slate-800">{totalCount}</span> entries
      </div>
      
      <div className="flex items-center space-x-1">
        {/* Prev Button */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white text-slate-600 transition-all"
        >
          <ChevronLeft size={16} />
        </button>

        {/* Page numbers */}
        {getPageNumbers().map((page) => (
          <button
            key={page}
            type="button"
            onClick={() => onPageChange(page)}
            className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all ${
              currentPage === page
                ? "bg-teal-600 border-teal-600 text-white shadow-sm shadow-teal-600/10"
                : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
            }`}
          >
            {page}
          </button>
        ))}

        {/* Next Button */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white text-slate-600 transition-all"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

