import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isPremium } from "@/lib/limits";
import BrainDumpCapture from "@/components/BrainDumpCapture";
import TodaySnapshot from "@/components/TodaySnapshot";

export default async function DashboardHome() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, subscription_status")
    .eq("id", user!.id)
    .single();
  const premium = isPremium(profile?.subscription_status);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = profile?.name ? profile.name.split(" ")[0] : "";

  const today = new Date().toISOString().slice(0, 10);
  const { data: todayTasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", user!.id)
    .eq("status", "today")
    .eq("date", today)
    .order("scheduled_minutes", { ascending: true });

  return (
    <div className="space-y-5">
      <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-3xl px-5 py-6 text-white relative overflow-hidden">
        <p className="font-display font-extrabold text-lg">
          {greeting}
          {firstName ? `, ${firstName}` : ""} 👋
        </p>
        <p className="text-xs font-bold opacity-80 mt-2">What is on your mind?</p>
      </div>

      <BrainDumpCapture compact />

      <div>
        <p className="text-[11px] font-extrabold uppercase tracking-wide text-ink-faint mb-2">Today at a glance</p>
        <TodaySnapshot tasks={todayTasks || []} />
      </div>

      <Link
        href="/dashboard/insights"
        className="flex items-center justify-between bg-white rounded-2xl shadow-soft px-4 py-3"
      >
        <span className="text-sm font-extrabold">📊 View my progress</span>
        <span className="text-ink-faint">›</span>
      </Link>

      {!premium && (
        <Link
          href="/paywall"
          className="flex items-center justify-between bg-gradient-to-br from-purple-600 to-purple-800 rounded-2xl px-4 py-3.5 text-white"
        >
          <span className="text-sm font-extrabold">👑 Go Premium — £2.99/mo</span>
          <span>›</span>
        </Link>
      )}
    </div>
  );
}
