import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildDayPlan } from "@/lib/anthropic";
import { isPremium } from "@/lib/limits";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
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

  if (!isPremium(profile?.subscription_status)) {
    return NextResponse.json(
      { error: "AI Day Builder is a Premium feature.", upgradeRequired: true },
      { status: 403 }
    );
  }

  const { context } = await request.json();
  if (!context || typeof context !== "string" || !context.trim()) {
    return NextResponse.json({ error: "Tell me what you've got to work with" }, { status: 400 });
  }

  const { data: pendingTasks } = await supabase
    .from("tasks")
    .select("title, duration_minutes, priority")
    .eq("user_id", user.id)
    .eq("status", "today")
    .eq("date", todayStr())
    .eq("completed", false);

  const schedule = await buildDayPlan(
    context.trim(),
    (pendingTasks || []).map((t: { title: string; duration_minutes: number; priority: string }) => ({
      title: t.title,
      duration: t.duration_minutes,
      priority: t.priority,
    }))
  );

  if (!schedule) {
    return NextResponse.json({ error: "Couldn't build a plan — please try again" }, { status: 502 });
  }

  await supabase.from("usage_events").insert({ user_id: user.id, event_type: "day_builder" });

  return NextResponse.json({ schedule });
}