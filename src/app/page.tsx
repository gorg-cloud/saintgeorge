"use client";

import React from "react";
import { HeaderBar } from "@/components/HeaderBar";
import { RegistrationForm } from "@/components/RegistrationForm";
import { useLanguage } from "@/lib/i18n/context";

/**
 * Public landing page.
 *
 * There is a single job here: the student details form. A child fills it in,
 * their name is recognised against the roster, and their details are saved —
 * an unrecognised name is added as a new child rather than turned away.
 */
export default function HomePage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col bg-[#ede7f6]/40 text-slate-900">
      <HeaderBar />

      <main className="flex-1 py-8 px-4 sm:px-6">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Billboard hero */}
          <div className="rounded-2xl border border-amber-200/70 bg-gradient-to-tr from-amber-50 via-white to-blue-50 p-6 sm:p-8 shadow-sm text-center">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">{t.appTitle}</h1>
            <p className="mt-2 text-xs sm:text-sm font-semibold text-slate-600">
              {t.billboardSubtitle}
            </p>
          </div>

          <RegistrationForm />
        </div>
      </main>

      <footer className="py-6 text-center text-xs text-slate-500">
        <p>
          © 2026 {t.churchName} — {t.billboardTitle}
        </p>
      </footer>
    </div>
  );
}
