"use client";

import React from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/context";
import { Globe, KeyRound } from "lucide-react";
import { OrthodoxCross } from "@/components/OrthodoxCross";

export function HeaderBar() {
  const { toggleLang, t, isRtl } = useLanguage();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-amber-200/50 bg-[#fbfaf8]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Left: Gold Logo Icon & Church Title */}
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            title={isRtl ? "دخول الخدام والإدارة (اضغط على الصليب)" : "Khuddam & Staff Gateway (Click Cross)"}
            className="group relative flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 p-2 text-white shadow-md shadow-amber-500/20 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
          >
            <OrthodoxCross size={24} className="text-amber-100 group-hover:text-white transition" />
            <span className="sr-only">Khuddam Login</span>
            {/* Indicator Dot */}
            <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-[#183153] ring-2 ring-white">
              <span className="h-1 w-1 rounded-full bg-amber-300" />
            </span>
          </Link>

          <Link href="/" className="transition hover:opacity-90">
            <h1 className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight">
              {t.billboardTitle}
            </h1>
            <p className="text-[11px] sm:text-xs font-semibold text-amber-900/80">{t.churchName}</p>
          </Link>
        </div>

        {/* Right: Pill Gateway Button & Language Selector */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="flex items-center gap-1.5 rounded-full bg-[#183153] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#11243e] active:scale-95"
            title="Khuddam & Staff Gateway"
          >
            <KeyRound className="h-3.5 w-3.5 text-amber-300" />
            <span>{t.staffLoginTitle}</span>
          </Link>

          <button
            onClick={toggleLang}
            type="button"
            className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 hover:text-slate-900 active:scale-95 shadow-sm cursor-pointer"
            title="Toggle Language"
          >
            <Globe className="h-3.5 w-3.5 text-slate-500" />
            <span>{t.langSwitch}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
