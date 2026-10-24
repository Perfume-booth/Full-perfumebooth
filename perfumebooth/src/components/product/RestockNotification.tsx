"use client";
import { useId, useState, type FormEvent } from "react";

export default function RestockNotification({ productId, variantId, variantTitle }: {
  productId: string | number; variantId?: string; variantTitle?: string;
}) {
  const id = useId();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/notifications/restock", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, consent: true, product_id: productId, variant_id: variantId || null }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save your request.");
      setMessage(data.message);
    } catch (err) { setError(err instanceof Error ? err.message : "Please try again."); }
    finally { setLoading(false); }
  }
  return <section className="rounded-xl border border-[var(--color-border)] p-4 space-y-3" aria-label="Back in stock notification">
    <h2 className="text-sm font-bold">Notify me when available</h2>
    <p className="text-xs text-[var(--color-text-secondary)]">{variantTitle ? `${variantTitle}: ` : ""}Get an email when this item is back in stock. No marketing emails.</p>
    {message ? <p role="status" className="text-sm text-green-800">{message}</p> : <form onSubmit={submit} className="space-y-3">
      <label htmlFor={id} className="block text-xs">Email address</label>
      <input id={id} type="email" required maxLength={254} autoComplete="email" value={email} onChange={e => setEmail(e.target.value)}
        className="w-full min-w-0 rounded border border-[var(--color-border)] px-3 py-2 text-sm" />
      <label className="flex items-start gap-2 text-xs"><input type="checkbox" required className="mt-0.5" />Email me about this item. I can cancel through the email link.</label>
      <button disabled={loading} type="submit" className="w-full rounded bg-[var(--color-maroon)] px-4 py-3 text-sm text-white disabled:opacity-50">{loading ? "Saving…" : "Notify me"}</button>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </form>}
  </section>;
}
