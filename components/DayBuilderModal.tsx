"use client";

import { useState } from "react";

type Block = { time: string; label: string; durationMinutes: number; taskTitle: string | null };

export default function DayBuilderModal({ onClose }: { onClose: () => void }) {
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<Block[] | null>(null);

  async function submit() {
    if (!context.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/day-builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
      } else {
        setSchedule(data.schedule);
      }
    } catch {
      setError("Network error — please try again.");
    }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className="relative bg-paper w-full max-w-2xl rounded-t-3xl max-h-[85vh] overflow-y-auto p-5 pb-8">
        <div className="flex items-center justify-between mb-1">
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-purple-50 text-sm">
            ‹
          </button>
          <p className="font-display font-extrabold text-base">AI Day Builder</p>
          <div className="w-8" />
        </div>

        {!schedule ? (
          <>
            <p className="text-center text-xs font-bold text-ink-soft mt-2 mb-4">
              Tell me what you've got to work with, and I'll build a realistic plan from your tasks.
            </p>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="e.g. I've got 2 hours and barely any energy"
              className="w-full border-2 border-line rounded-2xl p-3.5 font-semibold text-sm min-h-[90px] focus:outline-none focus:border-purple-400"
            />
            {error && <p className="text-pink-600 text-xs font-bold mt-3 text-center">{error}</p>}
            <button
              onClick={submit}
              disabled={loading || !context.trim()}
              className="w-full mt-4 bg-gradient-to-br from-purple-500 to-purple-700 text-white font-extrabold rounded-full py-3.5 disabled:opacity-60"
            >
              {loading ? "🧠 Building..." : "Build my day"}
            </button>
          </>
        ) : (
          <div className="mt-4 space-y-2">
            {schedule.map((b, i) => (
              <div key={i} className="flex items-center gap-3 bg-white rounded-2xl shadow-soft px-4 py-3">
                <span className="text-xs font-extrabold text-ink-faint w-12">{b.time}</span>
                <div className="flex-1">
                  <p className="font-extrabold text-sm">{b.label}</p>
                  <p className="text-xs font-bold text-ink-faint">{b.durationMinutes} min</p>
                </div>
              </div>
            ))}
            <button
              onClick={onClose}
              className="w-full mt-3 bg-gradient-to-br from-purple-500 to-purple-700 text-white font-extrabold rounded-full py-3"
            >
              Got it
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
