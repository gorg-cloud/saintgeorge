"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/context";
import { Lock, User, AlertCircle, ArrowRight, ArrowLeft, Loader2, Home } from "lucide-react";
import { OrthodoxCross } from "@/components/OrthodoxCross";

export function LoginForm() {
  const { t, isRtl } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");

  const [username, setUsername] = useState("");
  const [passcode, setPasscode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const performLogin = async (userToLogin: string, passToLogin: string) => {
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: userToLogin, passcode: passToLogin }),
      });

      const data = await res.json();

      if (data.success) {
        if (callbackUrl) {
          router.push(callbackUrl);
        } else {
          router.push(data.redirectTo || "/admin/dashboard");
        }
        router.refresh();
      } else if (data.error === "KHADEM_LOGIN_DISABLED") {
        // The server decides this, so the wording comes from the dictionary.
        setError(t.khademLoginDisabled);
      } else {
        setError(data.error || t.invalidCredentials);
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(t.invalidCredentials);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !passcode) return;
    performLogin(username, passcode);
  };

  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight;

  return (
    <div className="w-full max-w-[440px] bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden animate-fade-in mx-auto">
      {/* Top Accent Strip */}
      <div className="h-1.5 w-full bg-amber-500" />

      {/* Navy Header Card */}
      <div className="bg-[#183153] px-6 py-7 text-white text-center">
        <div className="mx-auto mb-2.5 flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 backdrop-blur border border-white/20 shadow-sm">
          <OrthodoxCross size={24} className="text-amber-300" />
        </div>
        <h2 className="text-xl font-bold tracking-tight">{t.staffLoginTitle}</h2>
        <p className="mt-0.5 text-xs text-blue-200/80">{t.staffLoginSubtitle}</p>
      </div>

      <div className="p-6 sm:p-7 space-y-5">
        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-700 animate-fade-in">
            <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="space-y-4">
          {/* Username Field */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              {t.usernameLabel}
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t.usernamePlaceholder}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 transition focus:border-[#183153] focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              <User className={`absolute top-3 ${isRtl ? "left-3" : "right-3"} h-4 w-4 text-slate-400`} />
            </div>
          </div>

          {/* Passcode Field */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              {t.passcodeLabel}
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder={t.passcodePlaceholder}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 transition focus:border-[#183153] focus:outline-none focus:ring-2 focus:ring-blue-100 font-mono"
              />
              <Lock className={`absolute top-3 ${isRtl ? "left-3" : "right-3"} h-4 w-4 text-slate-400`} />
            </div>
          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={loading || !username || !passcode}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#183153] py-3 text-sm font-bold text-white shadow transition hover:bg-[#11243e] disabled:opacity-50 active:scale-[0.98] cursor-pointer mt-2"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{t.signingIn}</span>
              </span>
            ) : (
              <>
                <span>{t.signInBtn}</span>
                <ArrowIcon className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Khodam have no logins — the groups are named after them instead. */}
        <p className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-[11px] font-semibold leading-relaxed text-amber-900">
          {t.adminOnlyLoginNote}
        </p>

        {/* Back to Form Link */}
        <div className="text-center pt-1">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#183153] transition"
          >
            <Home className="h-3.5 w-3.5" />
            <span>{t.backToHome}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
