"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { isPremium } from "@/lib/limits";
import LogoutButton from "@/components/LogoutButton";

type Profile = {
  name: string | null;
  email: string | null;
  subscription_status: string | null;
};

export default function SettingsPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("name, email, subscription_status")
        .eq("id", user.id)
        .single();
      setProfile(data);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openBillingPortal() {
    setPortalLoading(true);
    const res = await fetch("/api/stripe/portal", { method: "POST" });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      setPortalLoading(false);
      alert(data.error || "Could not open billing portal.");
    }
  }

  const premium = isPremium(profile?.subscription_status);

  return (
    <div className="space-y-4">
      <h1 className="font-display font-extrabold text-xl">Settings</h1>

      <div className="bg-white rounded-3xl shadow-soft p-5 space-y-3">
        <div>
          <p className="text-[11px] font-extrabold uppercase text-ink-faint">Name</p>
          <p className="font-bold text-sm">{profile?.name || "—"}</p>
        </div>
        <div>
          <p className="text-[11px] font-extrabold uppercase text-ink-faint">Email</p>
          <p className="font-bold text-sm">{profile?.email || "—"}</p>
        </div>
        <div>
          <p className="text-[11px] font-extrabold uppercase text-ink-faint">Plan</p>
          <p className={`font-bold text-sm ${premium ? "text-green-600" : "text-ink-faint"}`}>
            {premium ? "👑 Premium" : "Free"}
          </p>
        </div>
      </div>

      {premium ? (
        <button
          onClick={openBillingPortal}
          disabled={portalLoading}
          className="w-full bg-white border-2 border-purple-200 text-purple-700 font-extrabold rounded-full py-3 disabled:opacity-60"
        >
          {portalLoading ? "Opening..." : "Manage billing"}
        </button>
      ) : (
        <Link
          href="/paywall"
          className="block text-center w-full bg-gradient-to-br from-purple-500 to-purple-700 text-white font-extrabold rounded-full py-3"
        >
          Upgrade to Premium — £2.99/mo
        </Link>
      )}

      <LogoutButton className="w-full text-center text-sm font-extrabold text-pink-600 py-3 block" />
    </div>
  );
}
