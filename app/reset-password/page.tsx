"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const supabase = createClient();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/dashboard"), 1500);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="font-display font-extrabold text-2xl text-purple-700">Set a new password</span>
        </div>
        {done ? (
          <div className="bg-white rounded-3xl shadow-card p-6 text-center">
            <p className="font-bold text-sm text-green-600">Password updated. Redirecting...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-card p-6 space-y-4">
            {error && (
              <div className="bg-pink-100 text-pink-600 text-sm font-bold rounded-xl px-4 py-3">{error}</div>
            )}
            <div>
              <label className="block text-xs font-extrabold text-ink-soft mb-1.5">New password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border-2 border-line rounded-2xl px-4 py-3 font-semibold focus:outline-none focus:border-purple-400"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-br from-purple-500 to-purple-700 text-white font-extrabold rounded-full py-3.5 shadow-lg disabled:opacity-60"
            >
              {loading ? "Updating..." : "Update password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
