// Server-side calls to the Anthropic API. This runs on your server (Vercel's
// servers), not in the user's browser, so it doesn't hit the CORS/timeout
// issues the browser-based prototype ran into — a real API key, called
// server-to-server, is the correct way to do this.

export type Bucket = "Urgent" | "Today" | "This week" | "Later" | "Shopping" | "Home" | "Work";

export type OrganizedItem = {
  title: string;
  category: string;
  priority: "must" | "should" | "could";
  duration: number;
  today: boolean;
  when: string | null;
  bucket: Bucket | null; // only populated when organizeBrainDump is called with advanced=true
};

export type ScheduleBlock = {
  time: string; // e.g. "10:00"
  label: string; // e.g. "Easy win", "Email work", "Break"
  durationMinutes: number;
  taskTitle: string | null; // matches an existing task title, or null for a suggested break/warm-up
};

async function callClaude(prompt: string, maxTokens: number): Promise<string | null> {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: maxTokens,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      console.error("Anthropic API error:", res.status, await res.text());
      return null;
    }

    const data = await res.json();
    const blocks = (data.content || [])
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text);
    return blocks.join("\n");
  } catch (err) {
    console.error("Anthropic call failed:", err);
    return null;
  }
}

function extractJsonArray(raw: string | null): any[] | null {
  if (!raw) return null;
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // fall through to bracket extraction below
  }
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      return null;
    }
  }
  return null;
}

export async function organizeBrainDump(
  text: string,
  advanced: boolean = false
): Promise<OrganizedItem[] | null> {
  const bucketField = advanced
    ? `\n- bucket: exactly one of "Urgent", "Today", "This week", "Later", "Shopping", "Home", "Work" — pick whichever fits best`
    : "";

  const prompt = `You help an ADHD user turn a messy brain dump into a clear, organized task list.
Read the brain dump below and extract every distinct actionable item (tasks, errands, chores, calls, bills, appointments, deadlines, reminders). Merge obvious duplicates. Ignore filler commentary that is not an actual task, such as "I have so much to do" or "I want to prioritize everything".

For each item return an object with exactly these fields:
- title: short, clear, imperative phrase
- category: one short word describing the type, such as Bills, Calls, Home, Errands, Work, Health, or Ideas
- priority: exactly "must", "should", or "could"
- duration: your best-guess estimate in minutes, an integer
- today: true if this is something to do today, false if it is a future appointment, deadline, or reminder
- when: if today is false, a short human string for when it is due, such as "Friday" or "Tuesday 2pm"; otherwise null${bucketField}

Respond with ONLY a raw JSON array of these objects. No markdown code fences, no explanation, no text before or after the array.

Brain dump:
${text}`;

  const raw = await callClaude(prompt, 1400);
  const parsed = extractJsonArray(raw);
  if (!Array.isArray(parsed)) return null;

  const validBuckets = ["Urgent", "Today", "This week", "Later", "Shopping", "Home", "Work"];

  return parsed
    .filter((it) => it && it.title)
    .map((it) => ({
      title: String(it.title).slice(0, 120),
      category: it.category ? String(it.category).slice(0, 24) : "General",
      priority: ["must", "should", "could"].includes(it.priority) ? it.priority : "should",
      duration: typeof it.duration === "number" && it.duration > 0 ? Math.round(it.duration) : 15,
      today: it.today !== false,
      when: it.when ? String(it.when).slice(0, 40) : null,
      bucket: advanced && validBuckets.includes(it.bucket) ? it.bucket : null,
    }));
}

export async function breakdownTask(title: string): Promise<string[] | null> {
  const prompt = `Break the following single task into 3 to 6 small, concrete, sequential micro-steps that make it feel easy to start for someone with ADHD. Keep each step short, under 8 words, and physically concrete.
Task: "${title}"

Respond with ONLY a raw JSON array of strings. No markdown, no explanation.`;

  const raw = await callClaude(prompt, 400);
  const parsed = extractJsonArray(raw);
  if (!Array.isArray(parsed)) return null;
  return parsed.map((s) => String(s).slice(0, 80)).filter(Boolean).slice(0, 8);
}

// AI Day Builder (premium): "I've got 2 hours and low energy" -> a realistic
// schedule built from the user's actual pending tasks, plus short breaks.
export async function buildDayPlan(
  context: string,
  pendingTasks: { title: string; duration: number; priority: string }[]
): Promise<ScheduleBlock[] | null> {
  const taskList = pendingTasks
    .map((t) => `- "${t.title}" (${t.duration} min, priority: ${t.priority})`)
    .join("\n");

  const prompt = `You are building a realistic, kind schedule for someone with ADHD, based on how much time and energy they say they have right now.

Their situation: "${context}"

Their pending tasks to choose from (do not invent new tasks, only use these, and you don't have to use all of them — pick what realistically fits):
${taskList || "(no pending tasks — just suggest a short warm-up routine)"}

Build a short schedule starting from now. Include brief breaks between tasks (2-10 minutes) and an "easy win" first if their energy sounds low. Respect the time and energy they described — do not overload them.

Respond with ONLY a raw JSON array of objects, each with exactly these fields:
- time: a clock time string like "10:00"
- label: a short friendly label for this block, e.g. "Easy win", "Email work", "Break"
- durationMinutes: integer
- taskTitle: the exact matching title string from the task list above if this block is one of their tasks, otherwise null (for breaks/warm-ups)

No markdown, no explanation, no text outside the array.`;

  const raw = await callClaude(prompt, 900);
  const parsed = extractJsonArray(raw);
  if (!Array.isArray(parsed)) return null;

  return parsed
    .filter((b) => b && b.time && b.label)
    .map((b) => ({
      time: String(b.time).slice(0, 8),
      label: String(b.label).slice(0, 60),
      durationMinutes: typeof b.durationMinutes === "number" ? Math.round(b.durationMinutes) : 15,
      taskTitle: b.taskTitle ? String(b.taskTitle).slice(0, 120) : null,
    }));
}

// My Day Went Wrong (free: limited, premium: unlimited): given what happened
// and what's still left, suggest a calm, realistic re-plan for the rest of
// the day — never just "do everything anyway".
export async function rebuildDay(
  whatHappened: string,
  remainingTasks: { title: string; duration: number; priority: string }[]
): Promise<{ title: string; action: "keep_today" | "move_tomorrow" | "drop"; note: string }[] | null> {
  const taskList = remainingTasks
    .map((t) => `- "${t.title}" (${t.duration} min, priority: ${t.priority})`)
    .join("\n");

  const prompt = `Someone with ADHD had their day go off track. Help them re-plan the rest of it with zero guilt — realistic, not idealistic.

What happened: "${whatHappened}"

Tasks still remaining today:
${taskList || "(none remaining)"}

For each remaining task, decide what should happen to it now. Be realistic: if the explanation suggests they have little time/energy left, move most non-urgent things to tomorrow rather than cramming.

Respond with ONLY a raw JSON array of objects, one per task, each with exactly these fields:
- title: the exact matching task title
- action: exactly "keep_today", "move_tomorrow", or "drop"
- note: a short, kind, non-judgmental reason (under 12 words)

No markdown, no explanation, no text outside the array.`;

  const raw = await callClaude(prompt, 700);
  const parsed = extractJsonArray(raw);
  if (!Array.isArray(parsed)) return null;

  const validActions = ["keep_today", "move_tomorrow", "drop"];
  return parsed
    .filter((it) => it && it.title)
    .map((it) => ({
      title: String(it.title).slice(0, 120),
      action: validActions.includes(it.action) ? it.action : "move_tomorrow",
      note: it.note ? String(it.note).slice(0, 80) : "",
    }));
}
