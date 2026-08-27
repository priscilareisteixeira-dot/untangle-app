"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isPremium } from "@/lib/limits";
import RoutinesSection from "@/components/RoutinesSection";

type Task = {
  id: string;
  title: string;
  category: string;
  status: string;
  date: string | null;
  when_label: string | null;
  completed: boolean;
};

type Tab = "upcoming" | "backlog" | "done" | "routines";

export default function PlannerPage() {
  const supabase = createClient();
  const [tab, setTab] = useState<Tab>("upcoming");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [premium, setPremium] = useState(false);

  useEffect(() => {
    async function loadPremium() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("subscription_status")
        .eq("id", user.id)
        .single();
      setPremium(isPremium(data?.subscription_status));
    }
    loadPremium();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (tab === "routines") return;
    async function load() {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase.from("tasks").select("*").eq("user_id", user.id);
      if (tab === "done") {
        query = query.eq("completed", true).order("updated_at", { ascending: false });
      } else if (tab === "backlog") {
        query = query.eq("status", "backlog").eq("completed", false);
      } else {
        query = query.eq("status", "upcoming").eq("completed", false);
      }
      const { data } = await query;
      setTasks(data || []);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const tabs: Tab[] = ["upcoming", "backlog", "done", "routines"];

  return (
    <div className="space-y-4">
      <h1 className="font-display font-extrabold text-xl">Planner</h1>
      <div className="flex bg-purple-50 rounded-full p-1 gap-1">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-full text-[11px] font-extrabold capitalize ${
              tab === t ? "bg-white text-purple-700 shadow-soft" : "text-ink-faint"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "routines" ? (
        <RoutinesSection isPremium={premium} />
      ) : loading ? (
        <p className="text-center text-sm font-bold text-ink-faint py-8">Loading...</p>
      ) : tasks.length === 0 ? (
        <p className="text-center text-sm font-bold text-ink-faint py-8">Nothing here yet.</p>
      ) : (
        <div className="space-y-2">
          {tasks.map((t) => (
            <div key={t.id} className="flex items-center gap-3 bg-white rounded-2xl shadow-soft px-4 py-3">
              <div className="flex-1">
                <p className={`font-extrabold text-sm ${t.completed ? "line-through text-ink-faint" : ""}`}>
                  {t.title}
                </p>
                <p className="text-xs font-bold text-ink-faint">{t.category}</p>
              </div>
              {t.when_label && <span className="text-xs font-extrabold text-ink-faint">{t.when_label}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
