import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { breakdownTask } from "@/lib/anthropic";
import { isPremium } from "@/lib/limits";

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
      { error: "Break It Down is a Premium feature.", upgradeRequired: true },
      { status: 403 }
    );
  }

  const { title } = await request.json();
  if (!title || typeof title !== "string") {
    return NextResponse.json({ error: "No title provided" }, { status: 400 });
  }

  const steps = await breakdownTask(title);
  if (!steps) {
    return NextResponse.json({ error: "AI breakdown failed — please try again" }, { status: 502 });
  }

  await supabase.from("usage_events").insert({ user_id: user.id, event_type: "breakdown" });

  return NextResponse.json({ steps });
}
