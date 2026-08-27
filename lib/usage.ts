import type { SupabaseClient } from "@supabase/supabase-js";

// Counts how many events of a given type a user has logged since local
// midnight today. Used to enforce free-tier daily limits (brain dumps,
// My Day Went Wrong) without needing a separate counter table — usage_events
// already exists for exactly this.
export async function getTodayUsageCount(
  supabase: SupabaseClient,
  userId: string,
  eventType: string
): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("usage_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("event_type", eventType)
    .gte("created_at", startOfDay.toISOString());

  return count ?? 0;
}
