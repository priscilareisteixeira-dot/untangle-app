"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white">
              🧠
            </div>
            <span className="font-display font-extrabold text-2xl bg-gradient-to-br from-purple-700 to-purple-500 bg-clip-text text-transparent">
              Untangle
            </span>
          </div>
          <p className="text-ink-soft text-sm font-semibold">Welcome back</p>
        </div>

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
          <div>
            <label className="block text-xs font-extrabold text-ink-soft mb-1.5">Password</label>
            <input
              type="password"
              required
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
            {loading ? "Signing in..." : "Log in"}
          </button>
          <div className="flex items-center justify-between text-xs font-bold pt-1">
            <Link href="/forgot-password" className="text-purple-600">
              Forgot password?
            </Link>
            <Link href="/signup" className="text-purple-600">
              Create account
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
