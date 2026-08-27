"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { isPremium } from "@/lib/limits";
import TaskDetailModal, { type DetailTask } from "@/components/TaskDetailModal";
import HabitsSection from "@/components/HabitsSection";
import DayWentWrongModal from "@/components/DayWentWrongModal";
import DayBuilderModal from "@/components/DayBuilderModal";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatTime(mins: number | null) {
  if (mins == null) return "--";
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const ampm = h < 12 ? "am" : "pm";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m < 10 ? "0" : ""}${m}${ampm}`;
}

function timeOfDay(mins: number | null): "Morning" | "Afternoon" | "Evening" {
  if (mins == null) return "Morning";
  const h = Math.floor(mins / 60) % 24;
  if (h < 12) return "Morning";
  if (h < 17) return "Afternoon";
  return "Evening";
}

export default function TodayPage() {
  const supabase = createClient();
  const [tasks, setTasks] = useState<DetailTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [premium, setPremium] = useState(false);
  const [selected, setSelected] = useState<DetailTask | null>(null);
  const [showDayWentWrong, setShowDayWentWrong] = useState(false);
  const [showDayBuilder, setShowDayBuilder] = useState(false);

  async function load() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_status")
      .eq("id", user.id)
      .single();
    setPremium(isPremium(profile?.subscription_status));

    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "today")
      .eq("date", todayStr())
      .order("scheduled_minutes", { ascending: true });
    setTasks((data as DetailTask[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const done = tasks.filter((t) => t.completed).length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  const groups: Record<string, DetailTask[]> = { Morning: [], Afternoon: [], Evening: [] };
  tasks.forEach((t) => groups[timeOfDay(t.scheduled_minutes)].push(t));

  return (
    <div className="space-y-4">
      <h1 className="font-display font-extrabold text-xl">Today</h1>

      <div className="bg-white rounded-3xl shadow-soft p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="font-extrabold text-sm">
            {done} of {tasks.length} done
          </span>
          <span className="font-extrabold text-sm text-purple-600">{pct}%</span>
        </div>
        <div className="h-1.5 bg-purple-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-purple-700 rounded-full"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setShowDayBuilder(true)}
          className="flex-1 bg-white border-2 border-purple-200 text-purple-700 font-extrabold rounded-full py-2.5 text-xs"
        >
          ✨ Build my day
        </button>
        <button
          onClick={() => setShowDayWentWrong(true)}
          className="flex-1 bg-white border-2 border-purple-200 text-purple-700 font-extrabold rounded-full py-2.5 text-xs"
        >
          😵 Day went wrong
        </button>
      </div>

      {loading ? (
        <p className="text-center text-sm font-bold text-ink-faint py-8">Loading...</p>
      ) : tasks.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-soft p-6 text-center">
          <p className="text-sm font-bold text-ink-faint">
            Nothing scheduled yet today. Brain dump on the Home tab to add some.
          </p>
        </div>
      ) : (
        (["Morning", "Afternoon", "Evening"] as const).map((section) =>
          groups[section].length === 0 ? null : (
            <div key={section}>
              <p className="text-[11px] font-extrabold uppercase tracking-wide text-ink-faint mb-2">
                {section === "Morning" ? "🌅" : section === "Afternoon" ? "☀️" : "🌙"} {section}
              </p>
              <div className="space-y-2">
                {groups[section].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelected(t)}
                    className={`w-full flex items-center gap-3 bg-white rounded-2xl shadow-soft px-4 py-3 text-left ${
                      t.completed ? "opacity-50" : ""
                    }`}
                  >
                    <span className="text-xs font-extrabold text-ink-faint w-12">
                      {formatTime(t.scheduled_minutes)}
                    </span>
                    <div className="flex-1">
                      <p className="font-extrabold text-sm">{t.title}</p>
                      <p className="text-xs font-bold text-ink-faint">{t.duration_minutes} min</p>
                    </div>
                    <span className={t.completed ? "text-green-600 font-extrabold" : "text-purple-400"}>
                      {t.completed ? "✓" : "▶"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )
        )
      )}

      <HabitsSection isPremium={premium} />

      {selected && (
        <TaskDetailModal
          task={selected}
          isPremium={premium}
          onClose={() => setSelected(null)}
          onChanged={load}
        />
      )}
      {showDayWentWrong && (
        <DayWentWrongModal onClose={() => setShowDayWentWrong(false)} onApplied={load} />
      )}
      {showDayBuilder && !premium && (
        <div className="fixed inset-0 z-40 flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setShowDayBuilder(false)} />
          <div className="relative bg-white rounded-3xl p-6 text-center max-w-xs">
            <p className="text-3xl mb-2">👑</p>
            <p className="font-extrabold text-sm mb-1">AI Day Builder is Premium</p>
            <p className="text-xs font-bold text-ink-faint mb-4">Let Mind+Do build your day around your real energy.</p>
            <Link
              href="/paywall"
              className="block bg-gradient-to-br from-purple-500 to-purple-700 text-white font-extrabold rounded-full py-3"
            >
              Upgrade — £2.99/mo
            </Link>
            <button
              onClick={() => setShowDayBuilder(false)}
              className="text-xs font-bold text-ink-faint mt-3"
            >
              Not now
            </button>
          </div>
        </div>
      )}
      {showDayBuilder && premium && <DayBuilderModal onClose={() => setShowDayBuilder(false)} />}
    </div>
  );
}
