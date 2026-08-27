"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import FocusMode from "@/components/FocusMode";

type Subtask = { text: string; done: boolean };

export type DetailTask = {
  id: string;
  title: string;
  category: string;
  priority: "must" | "should" | "could";
  duration_minutes: number;
  status: string;
  date: string | null;
  scheduled_minutes: number | null;
  completed: boolean;
  subtasks: Subtask[] | null;
};

const priorityMeta: Record<string, { emoji: string; label: string }> = {
  must: { emoji: "🔴", label: "Must do" },
  should: { emoji: "🟠", label: "Should do" },
  could: { emoji: "🟢", label: "Could do" },
};

function nextPriority(p: string) {
  return p === "must" ? "should" : p === "should" ? "could" : "must";
}
function tomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export default function TaskDetailModal({
  task,
  isPremium,
  onClose,
  onChanged,
}: {
  task: DetailTask;
  isPremium: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const supabase = createClient();
  const [current, setCurrent] = useState<DetailTask>(task);
  const [breakingDown, setBreakingDown] = useState(false);
  const [breakdownError, setBreakdownError] = useState<string | null>(null);
  const [showReschedule, setShowReschedule] = useState(false);
  const [focusing, setFocusing] = useState(false);

  async function refreshTask(patch: Partial<DetailTask>) {
    setCurrent((t) => ({ ...t, ...patch }));
  }

  async function cyclePriority() {
    const priority = nextPriority(current.priority) as DetailTask["priority"];
    await supabase.from("tasks").update({ priority }).eq("id", current.id);
    refreshTask({ priority });
    onChanged();
  }

  async function toggleComplete() {
    const completed = !current.completed;
    await supabase
      .from("tasks")
      .update({ completed, completed_at: completed ? new Date().toISOString() : null })
      .eq("id", current.id);
    refreshTask({ completed });
    onChanged();
    if (completed) onClose();
  }

  async function breakItDown() {
    setBreakingDown(true);
    setBreakdownError(null);
    try {
      const res = await fetch("/api/ai/breakdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: current.title }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBreakdownError(data.error || "Couldn't break that down");
      } else {
        const subtasks: Subtask[] = data.steps.map((s: string) => ({ text: s, done: false }));
        await supabase.from("tasks").update({ subtasks }).eq("id", current.id);
        refreshTask({ subtasks });
      }
    } catch {
      setBreakdownError("Network error — please try again.");
    }
    setBreakingDown(false);
  }

  async function toggleSubtask(idx: number) {
    if (!current.subtasks) return;
    const subtasks = current.subtasks.map((s, i) => (i === idx ? { ...s, done: !s.done } : s));
    const allDone = subtasks.every((s) => s.done);
    await supabase
      .from("tasks")
      .update({ subtasks, completed: allDone, completed_at: allDone ? new Date().toISOString() : null })
      .eq("id", current.id);
    refreshTask({ subtasks, completed: allDone });
    onChanged();
  }

  async function reschedule(action: "tomorrow" | "later" | "remove") {
    if (action === "tomorrow") {
      await supabase.from("tasks").update({ date: tomorrowStr(), scheduled_minutes: null }).eq("id", current.id);
    } else if (action === "later") {
      await supabase
        .from("tasks")
        .update({ status: "backlog", date: null, scheduled_minutes: null })
        .eq("id", current.id);
    } else {
      await supabase.from("tasks").delete().eq("id", current.id);
    }
    onChanged();
    onClose();
  }

  if (focusing) {
    return (
      <FocusMode
        title={current.title}
        onExit={() => setFocusing(false)}
        onComplete={async () => {
          setFocusing(false);
          await toggleComplete();
        }}
      />
    );
  }

  const meta = priorityMeta[current.priority];

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className="relative bg-paper w-full max-w-2xl rounded-t-3xl max-h-[85vh] overflow-y-auto p-5 pb-8">
        <div className="flex items-center justify-between mb-1">
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-purple-50 text-sm">
            ‹
          </button>
          <p className="font-display font-extrabold text-base flex-1 text-center px-2">{current.title}</p>
          <div className="w-8" />
        </div>

        <div className="bg-white rounded-2xl shadow-soft p-4 mt-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="bg-purple-100 text-purple-700 font-extrabold text-[11px] px-2.5 py-1 rounded-full">
              {current.category}
            </span>
            <button
              onClick={cyclePriority}
              className="bg-purple-50 font-extrabold text-[11px] px-2.5 py-1 rounded-full"
            >
              {meta.emoji} {meta.label}
            </button>
            <span className="font-extrabold text-[11px] text-ink-faint">⏱ {current.duration_minutes} min</span>
          </div>
        </div>

        {current.subtasks && current.subtasks.length > 0 ? (
          <div className="mt-4">
            <p className="text-[11px] font-extrabold uppercase text-ink-faint mb-2">Steps</p>
            <div className="space-y-2">
              {current.subtasks.map((s, i) => (
                <button
                  key={i}
                  onClick={() => toggleSubtask(i)}
                  className="w-full flex items-center gap-3 bg-white rounded-xl shadow-soft px-3 py-2.5 text-left"
                >
                  <span
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] ${
                      s.done ? "bg-green-600 border-green-600 text-white" : "border-line"
                    }`}
                  >
                    {s.done ? "✓" : ""}
                  </span>
                  <span className={`text-sm font-bold ${s.done ? "line-through text-ink-faint" : ""}`}>
                    {s.text}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : isPremium ? (
          <div className="mt-4">
            <button
              onClick={breakItDown}
              disabled={breakingDown}
              className="w-full bg-white border-2 border-purple-200 text-purple-700 font-extrabold rounded-full py-3 disabled:opacity-60"
            >
              {breakingDown ? "🧠 Breaking it down..." : "🧩 Break this down"}
            </button>
            {breakdownError && <p className="text-pink-600 text-xs font-bold mt-2 text-center">{breakdownError}</p>}
          </div>
        ) : (
          <Link
            href="/paywall"
            className="mt-4 flex items-center justify-between bg-white border-2 border-line rounded-2xl px-4 py-3"
          >
            <span className="text-sm font-bold text-ink-faint">🔒 Break It Down is Premium</span>
            <span className="text-xs font-extrabold text-purple-600">Upgrade →</span>
          </Link>
        )}

        <div className="flex gap-2 mt-5">
          <button
            onClick={() => setFocusing(true)}
            className="flex-1 bg-white border-2 border-purple-200 text-purple-700 font-extrabold rounded-full py-3"
          >
            🎯 Focus
          </button>
          <button
            onClick={toggleComplete}
            className={`flex-1 font-extrabold rounded-full py-3 ${
              current.completed ? "bg-white border-2 border-line text-ink-faint" : "bg-gradient-to-br from-purple-500 to-purple-700 text-white"
            }`}
          >
            {current.completed ? "Undo complete" : "Mark complete ✓"}
          </button>
        </div>

        {!showReschedule ? (
          <button
            onClick={() => setShowReschedule(true)}
            className="block w-full text-center text-xs font-bold text-purple-600 mt-5"
          >
            Didn't finish this? That's okay →
          </button>
        ) : (
          <div className="mt-5 space-y-2">
            <p className="text-xs font-extrabold text-ink-soft text-center mb-1">What would help?</p>
            <button
              onClick={() => reschedule("tomorrow")}
              className="w-full bg-white border-2 border-line rounded-2xl px-4 py-3 text-left text-sm font-bold"
            >
              📅 Move to tomorrow
            </button>
            <button
              onClick={() => reschedule("later")}
              className="w-full bg-white border-2 border-line rounded-2xl px-4 py-3 text-left text-sm font-bold"
            >
              🙈 Keep it for later
            </button>
            <button
              onClick={() => reschedule("remove")}
              className="w-full bg-white border-2 border-line rounded-2xl px-4 py-3 text-left text-sm font-bold text-pink-600"
            >
              🗑️ Remove it
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
