"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Routine = {
  id: string;
  name: string;
  tasks: { title: string; category: string; priority: string; duration: number }[];
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function RoutinesSection({ isPremium }: { isPremium: boolean }) {
  const supabase = createClient();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState("");
  const [showSave, setShowSave] = useState(false);

  async function load() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("routines")
      .select("id, name, tasks")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setRoutines((data as Routine[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    if (isPremium) load();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPremium]);

  async function saveCurrentDayAsRoutine() {
    if (!newName.trim()) return;
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }
    const { data: today } = await supabase
      .from("tasks")
      .select("title, category, priority, duration_minutes")
      .eq("user_id", user.id)
      .eq("status", "today")
      .eq("date", todayStr());

    const tasks = (today || []).map((t) => ({
      title: t.title,
      category: t.category,
      priority: t.priority,
      duration: t.duration_minutes,
    }));

    await supabase.from("routines").insert({ user_id: user.id, name: newName.trim(), tasks });
    setNewName("");
    setShowSave(false);
    setSaving(false);
    load();
  }

  async function applyRoutine(routine: Routine) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const now = new Date();
    let cursor = Math.max(8 * 60, Math.ceil((now.getHours() * 60 + now.getMinutes()) / 15) * 15);
    const rows = routine.tasks.map((t) => {
      const row = {
        user_id: user.id,
        title: t.title,
        category: t.category,
        priority: t.priority,
        duration_minutes: t.duration,
        status: "today",
        date: todayStr(),
        scheduled_minutes: cursor,
      };
      cursor += t.duration + 10;
      return row;
    });
    await supabase.from("tasks").insert(rows);
  }

  if (!isPremium) {
    return (
      <Link
        href="/paywall"
        className="flex items-center justify-between bg-white border-2 border-line rounded-2xl px-4 py-3"
      >
        <span className="text-sm font-bold text-ink-faint">🔒 Custom routines are Premium</span>
        <span className="text-xs font-extrabold text-purple-600">Upgrade →</span>
      </Link>
    );
  }

  if (loading) return null;

  return (
    <div className="space-y-2">
      {routines.map((r) => (
        <div key={r.id} className="flex items-center gap-3 bg-white rounded-2xl shadow-soft px-4 py-3">
          <div className="flex-1">
            <p className="font-extrabold text-sm">{r.name}</p>
            <p className="text-xs font-bold text-ink-faint">{r.tasks.length} tasks</p>
          </div>
          <button
            onClick={() => applyRoutine(r)}
            className="text-xs font-extrabold text-purple-600 bg-purple-50 rounded-full px-3 py-1.5"
          >
            Apply to today
          </button>
        </div>
      ))}

      {routines.length === 0 && !showSave && (
        <p className="text-xs font-bold text-ink-faint text-center py-2">No routines saved yet.</p>
      )}

      {showSave ? (
        <div className="flex gap-2">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && saveCurrentDayAsRoutine()}
            placeholder="Routine name..."
            className="flex-1 border-2 border-line rounded-full px-4 py-2 text-sm font-bold"
          />
          <button
            onClick={saveCurrentDayAsRoutine}
            disabled={saving}
            className="bg-purple-500 text-white font-extrabold rounded-full px-4 text-sm disabled:opacity-60"
          >
            Save
          </button>
        </div>
      ) : (
        <button onClick={() => setShowSave(true)} className="text-xs font-extrabold text-purple-600">
          + Save today's tasks as a routine
        </button>
      )}
    </div>
  );
}
