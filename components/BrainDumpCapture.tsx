"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Bucket } from "@/lib/anthropic";

type OrganizedItem = {
  title: string;
  category: string;
  priority: "must" | "should" | "could";
  duration: number;
  today: boolean;
  when: string | null;
  bucket: Bucket | null;
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const nextPriority: Record<OrganizedItem["priority"], OrganizedItem["priority"]> = {
  must: "should",
  should: "could",
  could: "must",
};

const priorityStyle: Record<OrganizedItem["priority"], string> = {
  must: "bg-pink-100 text-pink-600",
  should: "bg-orange-100 text-orange-600",
  could: "bg-green-100 text-green-600",
};

const bucketOrder: Bucket[] = ["Urgent", "Today", "This week", "Later", "Shopping", "Home", "Work"];

export default function BrainDumpCapture({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const supabase = createClient();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<OrganizedItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [saving, setSaving] = useState(false);
  const [wasAdvanced, setWasAdvanced] = useState(false);

  async function handleOrganize() {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    setLimitReached(false);
    setItems(null);
    try {
      const res = await fetch("/api/ai/organize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setLimitReached(!!data.limitReached);
      } else {
        setItems(data.items);
        setWasAdvanced(!!data.premium);
      }
    } catch {
      setError("Network error — please try again.");
    }
    setLoading(false);
  }

  function cyclePriority(index: number) {
    if (!items) return;
    const next = [...items];
    next[index] = { ...next[index], priority: nextPriority[next[index].priority] };
    setItems(next);
  }

  function removeItem(index: number) {
    if (!items) return;
    setItems(items.filter((_, i) => i !== index));
  }

  async function acceptPlan() {
    if (!items || items.length === 0) return;
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }

    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    let cursor = Math.max(8 * 60, Math.ceil(nowMinutes / 15) * 15);
    const rank: Record<OrganizedItem["priority"], number> = { must: 0, should: 1, could: 2 };
    const sorted = [...items].sort((a, b) => rank[a.priority] - rank[b.priority]);

    const rows = sorted.map((it) => {
      const isToday = it.today;
      const scheduled = isToday ? cursor : null;
      if (isToday) cursor += it.duration + 10;
      return {
        user_id: user.id,
        title: it.title,
        category: it.bucket || it.category,
        priority: it.priority,
        duration_minutes: it.duration,
        status: isToday ? "today" : "upcoming",
        date: isToday ? todayStr() : null,
        when_label: it.when,
        scheduled_minutes: scheduled,
      };
    });

    await supabase.from("tasks").insert(rows);
    setSaving(false);
    setItems(null);
    setText("");
    router.push("/dashboard/today");
    router.refresh();
  }

  const grouped: Record<string, OrganizedItem[]> = {};
  if (items && wasAdvanced) {
    items.forEach((it, idx) => {
      const key = it.bucket || "Other";
      if (!grouped[key]) grouped[key] = [];
      (grouped[key] as any).push({ ...it, __idx: idx });
    });
  }

  return (
    <div className="bg-white rounded-3xl shadow-soft p-5">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Brain dump everything here..."
        className={`w-full border-2 border-line rounded-2xl p-3.5 font-semibold text-sm focus:outline-none focus:border-purple-400 resize-none ${
          compact ? "min-h-[100px]" : "min-h-[220px]"
        }`}
      />
      <button
        onClick={handleOrganize}
        disabled={loading || !text.trim()}
        className="w-full mt-3 bg-gradient-to-br from-purple-500 to-purple-700 text-white font-extrabold rounded-full py-3.5 disabled:opacity-60"
      >
        {loading ? "🧠 Thinking..." : "Turn my brain dump into a plan"}
      </button>

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

      {items && items.length > 0 && (
        <div className="mt-4 space-y-3">
          <p className="text-xs font-extrabold text-ink-soft">Tap a priority to change it</p>

          {wasAdvanced
            ? bucketOrder
                .filter((b) => grouped[b]?.length)
                .map((b) => (
                  <div key={b}>
                    <p className="text-[10px] font-extrabold uppercase text-ink-faint mb-1">{b}</p>
                    <div className="space-y-2">
                      {(grouped[b] as any[]).map((it) => (
                        <div key={it.__idx} className="flex items-center gap-2 bg-paper rounded-xl px-3 py-2.5">
                          <span className="flex-1 text-sm font-bold">{it.title}</span>
                          <button
                            onClick={() => cyclePriority(it.__idx)}
                            className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${priorityStyle[it.priority]}`}
                          >
                            {it.priority}
                          </button>
                          <button onClick={() => removeItem(it.__idx)} className="text-ink-faint font-bold px-1">
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
            : items.map((it, i) => (
                <div key={i} className="flex items-center gap-2 bg-paper rounded-xl px-3 py-2.5">
                  <span className="flex-1 text-sm font-bold">{it.title}</span>
                  <button
                    onClick={() => cyclePriority(i)}
                    className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${priorityStyle[it.priority]}`}
                  >
                    {it.priority}
                  </button>
                  <button onClick={() => removeItem(i)} className="text-ink-faint font-bold px-1">
                    ×
                  </button>
                </div>
              ))}

          <button
            onClick={acceptPlan}
            disabled={saving}
            className="w-full mt-2 bg-gradient-to-br from-purple-500 to-purple-700 text-white font-extrabold rounded-full py-3 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Add to my plan"}
          </button>
        </div>
      )}
    </div>
  );
}
