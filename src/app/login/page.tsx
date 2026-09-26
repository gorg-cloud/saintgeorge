import { Suspense } from "react";
import { HeaderBar } from "@/components/HeaderBar";
import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f0f4f9]">
      <HeaderBar />
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <Suspense fallback={<div className="text-center p-8">Loading...</div>}>
          <LoginForm />
        </Suspense>
      </main>
    </div>
  );
}
