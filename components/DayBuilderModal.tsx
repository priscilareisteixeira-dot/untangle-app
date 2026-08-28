app/
  login, signup, forgot-password, reset-password/   — auth pages
  auth/callback/                                     — email confirmation handler
  paywall/                                            — opt-in upgrade page (not a forced gate)
  dashboard/                                          — the real app: Home, Today, Planner, Brain Dump, Settings, Insights
  api/stripe/                                         — checkout, billing portal, webhook
  api/ai/                                             — organize, breakdown, day-builder, day-went-wrong
                                                         (all server-side Claude calls, all tier-checked)
components/
  TaskDetailModal.tsx, FocusMode.tsx                  — task detail, breakdown, focus timer
  BrainDumpCapture.tsx                                — the core AI loop, tier-aware
  HabitsSection.tsx, RoutinesSection.tsx              — free/premium habit + routine features
  DayWentWrongModal.tsx, DayBuilderModal.tsx           — the two premium AI planning features
lib/
  supabase/                                           — browser + server Supabase clients
  stripe.ts, anthropic.ts                             — server-side integrations
  limits.ts                                           — single source of truth for free vs premium
  usage.ts                                            — daily usage-limit counting
middleware.ts                                         — the security boundary: just auth now, not subscription
                                                         (premium gating happens per-feature in the API routes instead)
supabase/migrations/
  0001_init.sql                                       — accounts, tasks, brain dumps, usage — run first
  0002_premium_features.sql                           — habits, routines, completed_at — run second
