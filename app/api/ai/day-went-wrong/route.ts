import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rebuildDay } from "@/lib/anthropic";
import { isPremium, FREE_LIMITS } from "@/lib/limits";
import { getTodayUsageCount } from "@/lib/usage";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function tomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_status")
    .eq("id", user.id)
    .single();

  const premium = isPremium(profile?.subscription_status);

  if (!premium) {
    const usedToday = await getTodayUsageCount(supabase, user.id, "day_went_wrong");
    if (usedToday >= FREE_LIMITS.dayWentWrongPerDay) {
      return NextResponse.json(
        {
          error: "You've used today's free re-plan. Upgrade for unlimited.",
          limitReached: true,
        },
        { status: 403 }
      );
    }
  }

  const { whatHappened } = await request.json();
  if (!whatHappened || typeof whatHappened !== "string" || !whatHappened.trim()) {
    return NextResponse.json({ error: "Tell me what happened" }, { status: 400 });
  }

  const { data: remaining } = await supabase
    .from("tasks")
    .select("id, title, duration_minutes, priority")
    .eq("user_id", user.id)
    .eq("status", "today")
    .eq("date", todayStr())
    .eq("completed", false);

  const decisions = await rebuildDay(
    whatHappened.trim(),
    (remaining || []).map((t: { id: string; title: string; duration_minutes: number; priority: string }) => ({
      title: t.title,
      duration: t.duration_minutes,
      priority: t.priority,
    }))
  );

  if (!decisions) {
    return NextResponse.json({ error: "Couldn't re-plan — please try again" }, { status: 502 });
  }

  // Apply the AI's decisions directly to the database.
  const byTitle = new Map(
    (remaining || []).map((t: { id: string; title: string }) => [t.title, t.id])
  );
  for (const d of decisions) {
    const taskId = byTitle.get(d.title);
    if (!taskId) continue;
    if (d.action === "move_tomorrow") {
      await supabase.from("tasks").update({ date: tomorrowStr(), scheduled_minutes: null }).eq("id", taskId);
    } else if (d.action === "drop") {
      await supabase.from("tasks").update({ status: "backlog", date: null, scheduled_minutes: null }).eq("id", taskId);
    }
    // "keep_today" needs no change.
  }

  await supabase.from("usage_events").insert({ user_id: user.id, event_type: "day_went_wrong" });

  return NextResponse.json({ decisions });
}
