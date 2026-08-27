"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const supabase = createClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 text-center">
        <div className="max-w-sm bg-white rounded-3xl shadow-card p-8">
          <div className="text-3xl mb-3">📬</div>
          <h1 className="font-display font-extrabold text-lg mb-2">Check your email</h1>
          <p className="text-ink-soft text-sm font-semibold">
            We sent a confirmation link to {email}. Click it to activate your account.
          </p>
        </div>
      </div>
    );
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
          <p className="text-ink-soft text-sm font-semibold">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-card p-6 space-y-4">
          {error && (
            <div className="bg-pink-100 text-pink-600 text-sm font-bold rounded-xl px-4 py-3">{error}</div>
          )}
          <div>
            <label className="block text-xs font-extrabold text-ink-soft mb-1.5">Name</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border-2 border-line rounded-2xl px-4 py-3 font-semibold focus:outline-none focus:border-purple-400"
            />
          </div>
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
            {loading ? "Creating account..." : "Sign up"}
          </button>
          <p className="text-center text-xs font-bold pt-1">
            <span className="text-ink-faint">Already have an account? </span>
            <Link href="/login" className="text-purple-600">
              Log in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
