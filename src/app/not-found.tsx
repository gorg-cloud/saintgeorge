"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/i18n/context";
import { HeaderBar } from "@/components/HeaderBar";
import { AlertCircle, Home, PhoneCall } from "lucide-react";

export default function NotFound() {
  const { t, isRtl } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <HeaderBar />
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center space-y-6 bg-white p-8 rounded-3xl border border-slate-200 shadow-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
            <AlertCircle className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-900">{t.childNotFoundTitle}</h1>
            <p className="text-sm text-slate-600 leading-relaxed">{t.assistanceBanner}</p>
          </div>

          <div className="flex flex-col gap-3">
            <a
              href="tel:+970553071353"
              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow hover:bg-emerald-700 transition"
            >
              <PhoneCall className="h-4 w-4" />
              <span>{t.callSupport} (+970553071353)</span>
            </a>

            <Link
              href="/"
              className="flex items-center justify-center gap-2 rounded-xl bg-coptic-blue py-3 text-sm font-bold text-white shadow hover:bg-blue-800 transition"
            >
              <Home className="h-4 w-4" />
              <span>{t.backToHome}</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
