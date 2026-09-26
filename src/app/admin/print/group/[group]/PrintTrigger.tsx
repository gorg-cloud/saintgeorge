"use client";

import React, { useEffect, useState } from "react";
import { Printer, ArrowRight, Loader2 } from "lucide-react";

/**
 * Opens the browser's print dialog as soon as every photo on the sheet has
 * finished loading, so the saved PDF never contains empty image boxes.
 *
 * The button stays available as a manual fallback for browsers that refuse a
 * print dialog that was not triggered by a click.
 */
export function PrintTrigger() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const waitForImages = async () => {
      const images = Array.from(document.images);
      await Promise.all(
        images.map(
          (img) =>
            new Promise<void>((resolve) => {
              if (img.complete) {
                resolve();
                return;
              }
              img.addEventListener("load", () => resolve(), { once: true });
              img.addEventListener("error", () => resolve(), { once: true });
            })
        )
      );

      if (cancelled) return;
      setReady(true);
      // A short beat so the loaded photos are painted before the dialog opens.
      window.setTimeout(() => {
        if (!cancelled) window.print();
      }, 400);
    };

    waitForImages();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="no-print mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-4">
      <a
        href="/admin/dashboard"
        className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
      >
        <ArrowRight className="h-4 w-4" />
        <span>رجوع إلى لوحة التحكم / Back to dashboard</span>
      </a>

      <button
        type="button"
        onClick={() => window.print()}
        disabled={!ready}
        className="inline-flex items-center gap-2 rounded-xl bg-[#183153] px-5 py-2.5 text-xs font-bold text-white shadow transition hover:bg-[#11243e] disabled:opacity-60"
      >
        {ready ? <Printer className="h-4 w-4" /> : <Loader2 className="h-4 w-4 animate-spin" />}
        <span>{ready ? "طبع / حفظ كـ PDF" : "جاري تحميل الصور..."}</span>
      </button>
    </div>
  );
}
