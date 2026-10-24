"use client";
import { useEffect, useState } from "react";

export default function NotificationPreferences() {
  const [token, setToken] = useState("");
  const [action, setAction] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get("token") || ""); setAction(params.get("action") || "");
  }, []);
  async function submit() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/notifications/manage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, action }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to update your preference.");
      setMessage(data.message);
    } catch (err) { setError(err instanceof Error ? err.message : "Please try again."); }
    finally { setLoading(false); }
  }
  return <main className="mx-auto max-w-xl px-6 py-32 space-y-6">
    <h1 className="text-2xl font-bold">Email preferences</h1>
    {message ? <p role="status">{message}</p> : token && ["confirm", "unsubscribe"].includes(action) ? <>
      <p>{action === "confirm" ? "Confirm that you requested these emails." : "Stop emails for this subscription or stock alert."}</p>
      <button onClick={submit} disabled={loading} className="rounded bg-black text-white px-6 py-3 disabled:opacity-50">{loading ? "Updating…" : action === "confirm" ? "Confirm subscription" : "Unsubscribe"}</button>
    </> : <p>Open the preference link from your PerfumeBooth email.</p>}
    {error && <p role="alert" className="text-red-700">{error}</p>}
  </main>;
}
