"use client";

import React from "react";
import Link from "next/link";
import { HeaderBar } from "@/components/HeaderBar";
import { RegistrationForm } from "@/components/RegistrationForm";
import { useLanguage } from "@/lib/i18n/context";
import { PhoneCall, ArrowLeft, ArrowRight, HeartHandshake, ShieldAlert } from "lucide-react";

export default function AssistancePage() {
  const { t, isRtl } = useLanguage();
  const ArrowIcon = isRtl ? ArrowRight : ArrowLeft;

  return (
    <div className="min-h-screen flex flex-col bg-slate-100/70">
      <HeaderBar />

      <main className="flex-1 pb-16 pt-6 sm:pt-10">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 space-y-6">
          {/* Back button */}
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-coptic-blue hover:text-blue-900 transition"
            >
              <ArrowIcon className="h-4 w-4" />
              <span>{t.backToHome}</span>
            </Link>
          </div>

          {/* Assistance Hero Banner */}
          <div className="rounded-3xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-6 sm:p-8 shadow-md">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow">
                <HeartHandshake className="h-6 w-6" />
              </div>
              <div className="space-y-2 flex-1">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  {t.assistanceTitle}
                </h2>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {t.assistanceBanner}
                </p>

                {/* Call Support CTA */}
                <div className="pt-3">
                  <a
                    href="tel:+970553071353"
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-emerald-700 transition active:scale-95"
                  >
                    <PhoneCall className="h-5 w-5" />
                    <span>{t.callSupport}: +970553071353</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Embedded Full Registration Form */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-slate-900 px-1">
              {t.orRegisterDirectly}
            </h3>
            <RegistrationForm />
          </div>
        </div>
      </main>
    </div>
  );
}
