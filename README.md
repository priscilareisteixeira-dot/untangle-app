# Mind+Do Planner (Untangle) — Free + Premium

This is a real Next.js app, not a demo. It has:

- **Real accounts** — sign up, log in, log out, forgot/reset password, via Supabase Auth
- **A real free tier** — anyone who signs up gets into the actual dashboard immediately.
  There's no forced paywall; free is a genuinely usable product.
- **Real Premium billing** — one price, £2.99/month, backed by real Stripe subscriptions and
  webhooks. Premium status is checked server-side in every AI route — never trust-the-browser.
- **A real database** — Postgres via Supabase, with Row Level Security so each user can only
  ever see their own data

### Free vs Premium (enforced in `lib/limits.ts`)
**Free:** 5 AI brain dumps/day, basic prioritizing, daily planner (morning/afternoon/evening),
reschedule unfinished tasks, focus timer, up to 3 habits, basic weekly progress, 1 "My Day Went
Wrong" re-plan/day.
**Premium (£2.99/mo):** unlimited brain dumps, advanced 7-bucket AI organizing, AI Day Builder,
unlimited Day Went Wrong, Break It Down into steps, advanced insights, unlimited habits, custom
routines.

### Not built yet
Voice input and calendar sync were deliberately left out of this pass — voice specifically
because Safari on iOS has weak support for it, calendar sync because it's real OAuth work
(Google) and genuinely awkward for Apple. Both are worth doing as their own follow-up once the
app is live. "Stay With Me" and reminders currently work only while the app is open (no push
notifications yet) — that's also a separate build (service worker + permissions + a scheduled
job) rather than something that piggybacks on what's here.

---

## Prerequisites

- [Node.js](https://nodejs.org) 18 or later installed on your computer
- A free [Supabase](https://supabase.com) account
- A [Stripe](https://stripe.com) account (test mode is free)
- An [Anthropic](https://console.anthropic.com) API key
- A [Vercel](https://vercel.com) account (free tier is fine) — or any host that runs Next.js

---

## Step 1 — Create your Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project**. Pick any name/region.
2. Once it's created, go to **SQL Editor** → **New query**, paste the entire contents of
   `supabase/migrations/0001_init.sql`, and click **Run**. Then do the same again with
   `supabase/migrations/0002_premium_features.sql` — these must be run in that order.
3. Go to **Settings → API Keys**. Newer projects show a **Publishable key** and a **Secret
   key** instead of the older `anon`/`service_role` names — either naming works the same way:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - **Publishable key** (or `anon public`) → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Secret key** (or `service_role`) → `SUPABASE_SERVICE_ROLE_KEY` (keep this one secret —
     never expose it to the browser, and consider regenerating it once before going live, since
     any key typed into a chat or shared elsewhere during setup should be treated as seen)
4. Go to **Authentication → URL Configuration** and set the **Site URL** to your eventual live
   URL (you can update this later once you know your Vercel URL).

## Step 2 — Create your Stripe product

1. In the Stripe Dashboard (test mode is fine to start), go to **Product catalog → Add product**.
2. Create one product ("Mind+Do Premium") with one **recurring price**: £2.99/month. Copy the
   price ID (starts with `price_...`) → `STRIPE_PRICE_ID_PREMIUM`.
3. Go to **Developers → API keys** and copy your **Secret key** → `STRIPE_SECRET_KEY`.
4. You'll set up the webhook in Step 5, after you have a live URL (Stripe needs a real URL to
   send events to — this is normal, every Stripe integration works this way).

## Step 3 — Get an Anthropic API key

Go to [console.anthropic.com](https://console.anthropic.com) → **API Keys** → create one →
that's your `ANTHROPIC_API_KEY`.

## Step 4 — Install and run locally (optional but recommended first)

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local` with everything from Steps 1–3 (leave `STRIPE_WEBHOOK_SECRET` blank for
now — you'll add it in Step 5). Then:

```bash
npm run dev
```

Open `http://localhost:3000` — you should be able to sign up, get sent to the paywall (since
you haven't subscribed yet), and everything else should load. Stripe checkout itself won't
fully complete locally without the webhook, which is set up next.

## Step 5 — Deploy to Vercel

1. Push this folder to a GitHub repo, then import it at [vercel.com/new](https://vercel.com/new).
2. In Vercel's project settings → **Environment Variables**, add everything from
   `.env.example` (same values as your `.env.local`, except set `NEXT_PUBLIC_SITE_URL` to your
   Vercel URL, e.g. `https://your-app.vercel.app`). Leave `STRIPE_WEBHOOK_SECRET` blank for now.
3. Deploy.

## Step 6 — Connect the Stripe webhook (do this after deploying)

1. In Stripe Dashboard → **Developers → Webhooks → Add endpoint**.
2. Endpoint URL: `https://your-app.vercel.app/api/stripe/webhook`
3. Events to send: `checkout.session.completed`, `customer.subscription.created`,
   `customer.subscription.updated`, `customer.subscription.deleted`.
4. After creating it, Stripe shows a **Signing secret** (starts with `whsec_...`) — copy that
   into Vercel's environment variables as `STRIPE_WEBHOOK_SECRET`, then redeploy (Vercel →
   Deployments → ⋯ → Redeploy) so it picks up the new variable.

## Step 7 — Test the whole flow

1. Visit your live URL → **Sign up** → confirm the email (check spam) → **Log in**.
2. You should land straight on the real dashboard — no paywall, since free tier is real access
   now. Try a brain dump right away (up to 5/day on free); it should come back organized within
   a couple of seconds, since the AI call runs server-side.
3. From Settings, tap **Upgrade to Premium** → Stripe Checkout (use
   [test card 4242 4242 4242 4242](https://stripe.com/docs/testing), any future date, any CVC).
4. After checkout, you should land back on the dashboard with Settings now showing "👑 Premium"
   — the webhook should have flipped your `subscription_status` to `active` in Supabase (check
   the `profiles` table there if it doesn't update immediately).
5. Try Break It Down on a task, the AI Day Builder, and My Day Went Wrong — all three should
   now work without the free-tier upgrade prompts.

If step 4 doesn't work, the most common cause is the webhook secret being wrong or the
endpoint URL being off — check **Stripe Dashboard → Webhooks → your endpoint → recent
deliveries** for the exact error.

---

## Project structure

```
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
```

## A note on security

The reason this had to be a real app instead of a browser file: every Premium-only action
(unlimited brain dumps, Break It Down, the Day Builder, My Day Went Wrong past the daily limit)
is checked server-side, inside its own API route, by reading `subscription_status` straight
from the database — never from anything the browser sends. There's no client-side flag to
fake. `middleware.ts` handles the simpler question (are you logged in at all), and each
`api/ai/*` route independently decides what you're allowed to do based on the real database
value. Same idea for auth: passwords are handled entirely by Supabase and never touch your own
code.
