"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="font-display font-extrabold text-2xl text-purple-700">Reset password</span>
        </div>
        {sent ? (
          <div className="bg-white rounded-3xl shadow-card p-6 text-center">
            <p className="font-bold text-sm text-ink-soft">Check your email for a reset link.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-card p-6 space-y-4">
            {error && (
              <div className="bg-pink-100 text-pink-600 text-sm font-bold rounded-xl px-4 py-3">{error}</div>
            )}
            <div>
              <label className="block text-xs font-extrabold text-ink-soft mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border-2 border-line rounded-2xl px-4 py-3 font-semibold focus:outline-none focus:border-purple-400"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-br from-purple-500 to-purple-700 text-white font-extrabold rounded-full py-3.5 shadow-lg disabled:opacity-60"
            >
              {loading ? "Sending..." : "Send reset link"}
            </button>
            <p className="text-center text-xs font-bold pt-1">
              <Link href="/login" className="text-purple-600">
                Back to login
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
