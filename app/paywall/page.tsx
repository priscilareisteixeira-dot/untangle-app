"use client";

import { useState } from "react";
import Link from "next/link";
import { PREMIUM_FEATURES } from "@/lib/limits";

export default function UpgradePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upgrade() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setLoading(false);
        setError(data.error || "Something went wrong starting checkout.");
      }
    } catch {
      setLoading(false);
      setError("Network error — please try again.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="text-4xl mb-3">👑</div>
        <h1 className="font-display font-extrabold text-xl mb-2">Mind+Do Premium</h1>
        <p className="text-ink-soft text-sm font-semibold mb-6">Mind+Do does the thinking.</p>

        <div className="bg-white rounded-3xl shadow-card p-5 text-left mb-4">
          <ul className="space-y-2">
            {PREMIUM_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm font-bold">
                <span className="text-green-600">✓</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {error && <p className="text-pink-600 text-xs font-bold mb-3">{error}</p>}

        <button
          onClick={upgrade}
          disabled={loading}
          className="w-full bg-gradient-to-br from-purple-500 to-purple-700 text-white font-extrabold rounded-full py-3.5 shadow-lg disabled:opacity-60"
        >
          {loading ? "Redirecting..." : "Upgrade — £2.99/mo"}
        </button>

        <Link href="/dashboard" className="block text-xs font-bold text-ink-faint mt-5">
          Not now, keep using the free plan
        </Link>
      </div>
    </div>
  );
}
