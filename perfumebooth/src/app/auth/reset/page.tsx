import React from "react";
import ResetPasswordForm from "@/components/ui/reset-password-form";

export default async function AuthResetPasswordQueryPage({ searchParams }: { searchParams: Promise<{ id?: string; token?: string; resetToken?: string }> }) {
  const resolvedParams = await searchParams;
  const id = resolvedParams.id || "";
  const token = resolvedParams.token || resolvedParams.resetToken || "";
  return (
    <main className="min-h-screen pt-32 pb-24 bg-[var(--color-bg-subtle)] flex items-center justify-center">
      <div className="w-full max-w-lg mx-auto">
        <ResetPasswordForm id={id} token={token} />
      </div>
    </main>
  );
}
