// Single source of truth for what's free vs premium. If the pricing model
// changes, this is the only file that should need to change.

export type SubscriptionStatus = string | null | undefined;

export function isPremium(subscriptionStatus: SubscriptionStatus): boolean {
  return subscriptionStatus === "active" || subscriptionStatus === "trialing";
}

export const FREE_LIMITS = {
  brainDumpsPerDay: 5,
  dayWentWrongPerDay: 1,
  maxHabits: 3,
};

export const PREMIUM_FEATURES = [
  "Unlimited brain dumps",
  "Advanced AI organizing (Urgent / Today / This week / Later / Shopping / Home / Work)",
  "AI Day Builder",
  "Unlimited My Day Went Wrong",
  "Break It Down into tiny steps",
  "Stay With Me check-ins",
  "Smart reminders",
  "Advanced insights",
  "Unlimited habits",
  "Custom routines",
];
