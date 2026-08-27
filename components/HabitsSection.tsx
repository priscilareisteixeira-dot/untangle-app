"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { FREE_LIMITS } from "@/lib/limits";

type Habit = {
  id: string;
  title: string;
  streak_count: number;
  last_completed_date: string | null;
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function HabitsSection({ isPremium }: { isPremium: boolean }) {
  const supabase = createClient();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("habits")
      .select("id, title, streak_count, last_completed_date")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    setHabits(data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const atLimit = !isPremium && habits.length >= FREE_LIMITS.maxHabits;

  async function addHabit() {
    if (!newTitle.trim()) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("habits").insert({ user_id: user.id, title: newTitle.trim() });
    setNewTitle("");
    setAdding(false);
    load();
  }

  async function markDone(habit: Habit) {
    if (habit.last_completed_date === todayStr()) return; // already done today
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const wasYesterday = habit.last_completed_date === yesterday.toISOString().slice(0, 10);
    const newStreak = wasYesterday ? habit.streak_count + 1 : 1;

    await supabase
      .from("habits")
      .update({ streak_count: newStreak, last_completed_date: todayStr() })
      .eq("id", habit.id);
    load();
  }

  if (loading) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-extrabold uppercase tracking-wide text-ink-faint">Habits</p>
        {!isPremium && (
          <span className="text-[10px] font-extrabold text-ink-faint">
            {habits.length}/{FREE_LIMITS.maxHabits}
          </span>
        )}
      </div>

      <div className="space-y-2">
        {habits.map((h) => {
          const doneToday = h.last_completed_date === todayStr();
          return (
            <button
              key={h.id}
              onClick={() => markDone(h)}
              disabled={doneToday}
              className="w-full flex items-center gap-3 bg-white rounded-2xl shadow-soft px-4 py-3 text-left disabled:opacity-70"
            >
              <span
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                  doneToday ? "bg-green-100 text-green-600" : "bg-purple-50"
                }`}
              >
                {doneToday ? "✓" : "○"}
              </span>
              <span className="flex-1 font-extrabold text-sm">{h.title}</span>
              {h.streak_count > 0 && (
                <span className="text-xs font-extrabold text-orange-600">🔥 {h.streak_count}</span>
              )}
            </button>
          );
        })}

        {habits.length === 0 && (
          <p className="text-xs font-bold text-ink-faint text-center py-3">No habits yet.</p>
        )}
      </div>

      {adding ? (
        <div className="flex gap-2 mt-2">
          <input
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addHabit()}
            placeholder="New habit..."
            className="flex-1 border-2 border-line rounded-full px-4 py-2 text-sm font-bold"
          />
          <button onClick={addHabit} className="bg-purple-500 text-white font-extrabold rounded-full px-4 text-sm">
            Add
          </button>
        </div>
      ) : atLimit ? (
        <Link
          href="/paywall"
          className="flex items-center justify-between bg-white border-2 border-line rounded-2xl px-4 py-3 mt-2"
        >
          <span className="text-xs font-bold text-ink-faint">🔒 3 habit limit reached</span>
          <span className="text-xs font-extrabold text-purple-600">Upgrade →</span>
        </Link>
      ) : (
        <button onClick={() => setAdding(true)} className="text-xs font-extrabold text-purple-600 mt-2">
          + Add a habit
        </button>
      )}
    </div>
  );
}
