"use client";

import { useState } from "react";
import Link from "next/link";

type Decision = { title: string; action: string; note: string };

export default function DayWentWrongModal({
  onClose,
  onApplied,
}: {
  onClose: () => void;
  onApplied: () => void;
}) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [decisions, setDecisions] = useState<Decision[] | null>(null);

  async function submit() {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/day-went-wrong", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatHappened: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setLimitReached(!!data.limitReached);
      } else {
        setDecisions(data.decisions);
        onApplied();
      }
    } catch {
      setError("Network error — please try again.");
    }
    setLoading(false);
  }

  const actionLabel: Record<string, string> = {
    keep_today: "Kept today",
    move_tomorrow: "Moved to tomorrow",
    drop: "Saved for later",
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className="relative bg-paper w-full max-w-2xl rounded-t-3xl max-h-[85vh] overflow-y-auto p-5 pb-8">
        <div className="flex items-center justify-between mb-1">
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-purple-50 text-sm">
            ‹
          </button>
          <p className="font-display font-extrabold text-base">My day went wrong</p>
          <div className="w-8" />
        </div>

        {!decisions ? (
          <>
            <p className="text-center text-xs font-bold text-ink-soft mt-2 mb-4">
              No guilt. Tell me what happened and I'll sort out the rest of today.
            </p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What happened?"
              className="w-full border-2 border-line rounded-2xl p-3.5 font-semibold text-sm min-h-[100px] focus:outline-none focus:border-purple-400"
            />
            {error && (
              <div className="mt-3 text-center">
                <p className="text-pink-600 text-xs font-bold">{error}</p>
                {limitReached && (
                  <Link href="/paywall" className="text-xs font-extrabold text-purple-600 mt-1 inline-block">
                    Upgrade for unlimited →
                  </Link>
                )}
              </div>
            )}
            <button
              onClick={submit}
              disabled={loading || !text.trim()}
              className="w-full mt-4 bg-gradient-to-br from-purple-500 to-purple-700 text-white font-extrabold rounded-full py-3.5 disabled:opacity-60"
            >
              {loading ? "🧠 Working it out..." : "Rebuild my day"}
            </button>
          </>
        ) : (
          <div className="mt-4 space-y-2">
            {decisions.map((d, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-soft px-4 py-3">
                <p className="font-extrabold text-sm">{d.title}</p>
                <p className="text-xs font-bold text-ink-faint mt-0.5">
                  {actionLabel[d.action] || d.action} — {d.note}
                </p>
              </div>
            ))}
            <button
              onClick={onClose}
              className="w-full mt-3 bg-gradient-to-br from-purple-500 to-purple-700 text-white font-extrabold rounded-full py-3"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
