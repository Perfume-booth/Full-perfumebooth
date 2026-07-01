import React from "react";
import ResetPasswordForm from "@/components/ui/reset-password-form";

export default async function AuthResetPasswordPage({ params }: { params: Promise<{ id: string; token: string }> }) {
  const resolvedParams = await params;
  return (
    <main className="min-h-screen pt-32 pb-24 bg-[var(--color-bg-subtle)] flex items-center justify-center">
      <div className="w-full max-w-lg mx-auto">
        <ResetPasswordForm id={resolvedParams.id} token={resolvedParams.token} />
      </div>
    </main>
  );
}
