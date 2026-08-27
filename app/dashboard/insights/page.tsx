"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { isPremium } from "@/lib/limits";

type TaskRow = {
  duration_minutes: number;
  completed: boolean;
  completed_at: string | null;
  date: string | null;
};

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}
function fmtHour(h: number) {
  const ampm = h < 12 ? "am" : "pm";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}${ampm}`;
}

export default function InsightsPage() {
  const supabase = createClient();
  const [premium, setPremium] = useState(false);
  const [rows, setRows] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
        .select("duration_minutes, completed, completed_at, date")
        .eq("user_id", user.id)
        .gte("date", daysAgo(30).toISOString().slice(0, 10));

      setRows((data as TaskRow[]) || []);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return <p className="text-center text-sm font-bold text-ink-faint py-10">Loading...</p>;
  }

  const weekStart = daysAgo(6);
  const thisWeek = rows.filter((r) => r.date && new Date(r.date) >= weekStart);
  const weekCompleted = thisWeek.filter((r) => r.completed).length;

  const days: { label: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = daysAgo(i);
    const label = d.toLocaleDateString(undefined, { weekday: "short" });
    const count = rows.filter(
      (r) => r.completed && r.date === d.toISOString().slice(0, 10)
    ).length;
    days.push({ label, count });
  }
  const maxDay = Math.max(1, ...days.map((d) => d.count));

  if (!premium) {
    return (
      <div className="space-y-4">
        <h1 className="font-display font-extrabold text-xl">Your progress</h1>

        <div className="bg-white rounded-3xl shadow-soft p-5">
          <p className="font-extrabold text-sm mb-3">{weekCompleted} tasks completed this week</p>
          <div className="flex items-end gap-2 h-24">
            {days.map((d) => (
              <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-purple-500 rounded-t-md"
                  style={{ height: `${Math.max(6, (d.count / maxDay) * 100)}%` }}
                />
                <span className="text-[9px] font-extrabold text-ink-faint">{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        <Link
          href="/paywall"
          className="flex items-center justify-between bg-white border-2 border-line rounded-2xl px-4 py-3"
        >
          <span className="text-sm font-bold text-ink-faint">🔒 Unlock advanced insights</span>
          <span className="text-xs font-extrabold text-purple-600">Upgrade →</span>
        </Link>
      </div>
    );
  }

  const completedWithTime = rows.filter((r) => r.completed && r.completed_at);
  const hourCounts: Record<number, number> = {};
  completedWithTime.forEach((r) => {
    const h = new Date(r.completed_at as string).getHours();
    hourCounts[h] = (hourCounts[h] || 0) + 1;
  });
  const bestHourEntry = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
  const bestHourText = bestHourEntry
    ? `You get the most done around ${fmtHour(Number(bestHourEntry[0]))}.`
    : "Complete a few more tasks and I'll find your best hours.";

  const short = rows.filter((r) => r.duration_minutes <= 15);
  const long = rows.filter((r) => r.duration_minutes > 30);
  const shortRate = short.length ? short.filter((r) => r.completed).length / short.length : 0;
  const longRate = long.length ? long.filter((r) => r.completed).length / long.length : 0;
  const diff = Math.round((shortRate - longRate) * 100);
  const patternText =
    short.length && long.length
      ? diff > 0
        ? `You complete short tasks (under 15 min) ${diff}% more often than tasks over 30 minutes.`
        : `You're handling longer tasks about as well as short ones — nice and steady.`
      : "Once you've logged more tasks of different lengths, I'll spot the pattern.";

  const overloadedDays = Array.from(
    rows.reduce((map, r) => {
      if (!r.date) return map;
      map.set(r.date, (map.get(r.date) || 0) + r.duration_minutes);
      return map;
    }, new Map<string, number>())
  ).filter(([, total]) => total > 5 * 60).length;

  const overloadText =
    overloadedDays > 0
      ? `${overloadedDays} day${overloadedDays === 1 ? "" : "s"} recently were probably overloaded — more than 5 hours planned in one day.`
      : "Your days have been realistically sized recently — nice balance.";

  const weekNote =
    weekCompleted > 0
      ? `You had ${weekCompleted} completions this week. Progress, not perfection.`
      : "A quiet week — that's okay, tomorrow's a fresh start.";

  return (
    <div className="space-y-4">
      <h1 className="font-display font-extrabold text-xl">Your progress</h1>

      <div className="bg-white rounded-3xl shadow-soft p-5">
        <p className="font-extrabold text-sm mb-3">Last 7 days</p>
        <div className="flex items-end gap-2 h-24">
          {days.map((d) => (
            <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full bg-purple-500 rounded-t-md"
                style={{ height: `${Math.max(6, (d.count / maxDay) * 100)}%` }}
              />
              <span className="text-[9px] font-extrabold text-ink-faint">{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-purple-50 rounded-2xl p-4">
        <p className="text-sm font-bold">⏰ {bestHourText}</p>
      </div>
      <div className="bg-green-100 rounded-2xl p-4">
        <p className="text-sm font-bold">📊 {patternText}</p>
      </div>
      <div className="bg-orange-100 rounded-2xl p-4">
        <p className="text-sm font-bold">⚖️ {overloadText}</p>
      </div>
      <div className="bg-pink-100 rounded-2xl p-4">
        <p className="text-sm font-bold">🫶 {weekNote}</p>
      </div>
    </div>
  );
}
