import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { organizeBrainDump } from "@/lib/anthropic";
import { isPremium, FREE_LIMITS } from "@/lib/limits";
import { getTodayUsageCount } from "@/lib/usage";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { text } = await request.json();
  if (!text || typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "No text provided" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_status")
    .eq("id", user.id)
    .single();

  const premium = isPremium(profile?.subscription_status);

  if (!premium) {
    const usedToday = await getTodayUsageCount(supabase, user.id, "brain_dump");
    if (usedToday >= FREE_LIMITS.brainDumpsPerDay) {
      return NextResponse.json(
        {
          error: `You've used your ${FREE_LIMITS.brainDumpsPerDay} free brain dumps for today. Upgrade for unlimited.`,
          limitReached: true,
        },
        { status: 403 }
      );
    }
  }

  const items = await organizeBrainDump(text.trim(), premium);
  if (!items) {
    return NextResponse.json({ error: "AI organizing failed — please try again" }, { status: 502 });
  }

  await supabase.from("brain_dumps").insert({ user_id: user.id, raw_text: text.trim() });
  await supabase.from("usage_events").insert({ user_id: user.id, event_type: "brain_dump" });

  return NextResponse.json({ items, premium });
}
