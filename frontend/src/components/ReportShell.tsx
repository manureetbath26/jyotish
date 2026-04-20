"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useReportLock } from "@/contexts/ReportLockContext";

interface Props {
  /** Report title shown in the sticky bar (small text). */
  title?: string;
  /** Back-button handler. When omitted, the back link is hidden. */
  onBack?: () => void;
  /** Reason shown on profile tabs while this report is open. */
  lockReason?: string;
  /**
   * Optional custom PDF download handler. When provided, replaces the default
   * browser-print flow \u2014 use for reports that generate a custom PDF
   * (e.g. via jsPDF) with better layout than the print view.
   */
  onDownload?: () => void | Promise<void>;
  children: ReactNode;
}

/**
 * Wraps a generated-report view with a sticky top bar (Back + Download PDF),
 * locks the profile tab switcher while mounted, and injects print CSS that
 * produces a clean PDF when the user invokes their browser's "Save as PDF"
 * dialog via Download.
 */
export function ReportShell({ title, onBack, lockReason, onDownload, children }: Props) {
  const { lock, unlock } = useReportLock();
  const [printing, setPrinting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Lock profile switcher while a report is open
  useEffect(() => {
    lock(lockReason ?? "You're viewing a generated report \u2014 finish or go back to switch profiles.");
    return () => unlock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDownload = async () => {
    if (onDownload) {
      try {
        setDownloading(true);
        await onDownload();
      } finally {
        setDownloading(false);
      }
      return;
    }
    setPrinting(true);
    // Give React a tick to apply the "report-printing" class, then trigger print.
    setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 50);
  };

  return (
    <div className={`report-shell ${printing ? "report-printing" : ""}`}>
      {/* Sticky top bar: back + download, always visible while scrolling */}
      <div className="report-shell__bar sticky top-0 z-30 -mx-4 sm:mx-0 px-4 sm:px-0 py-2 mb-3 bg-slate-950/80 backdrop-blur border-b border-slate-800 flex items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              className="text-sm text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors flex-shrink-0"
            >
              {"\u2190"} Back
            </button>
          )}
          {title && (
            <span className="text-xs text-slate-500 truncate hidden sm:inline">
              {title}
            </span>
          )}
        </div>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center gap-1.5 text-xs bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/50 text-black font-semibold px-3 py-1.5 rounded-md transition-colors flex-shrink-0"
          title="Download this report as PDF"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          {downloading ? "Preparing..." : "Download PDF"}
        </button>
      </div>

      <div className="report-shell__content">{children}</div>

      {/* Global print rules: hide chrome (nav, tabs, shell bar), keep only content. */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 14mm 12mm;
          }
          html,
          body {
            background: #ffffff !important;
            color: #111827 !important;
          }
          nav,
          header.site-header,
          .site-footer,
          .profile-tabs-strip {
            display: none !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .report-shell__content {
            color: #111827 !important;
          }
          /* Soften dark theme tokens for print legibility */
          .report-shell__content * {
            color: inherit;
            background: transparent !important;
            box-shadow: none !important;
          }
          .report-shell__content .text-slate-400,
          .report-shell__content .text-slate-500,
          .report-shell__content .text-slate-600 {
            color: #4b5563 !important;
          }
          .report-shell__content .text-slate-200,
          .report-shell__content .text-slate-300,
          .report-shell__content .text-slate-100 {
            color: #111827 !important;
          }
          .report-shell__content .text-amber-400,
          .report-shell__content .text-amber-300 {
            color: #b45309 !important;
          }
          .report-shell__content h1,
          .report-shell__content h2,
          .report-shell__content h3 {
            page-break-after: avoid;
          }
          .report-shell__content section,
          .report-shell__content .avoid-break {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}
