"use client";

import { useState } from "react";
import Link from "next/link";

type Decision = { title: string; action: string; note: string };

export default function DayWentWrongModal({
  onClose,
  onApplied,
}: {
  onClose: () => void;
  onApplied: () => void;
}) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [decisions, setDecisions] = useState<Decision[] | null>(null);

  async function submit() {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/day-went-wrong", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatHappened: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setLimitReached(!!data.limitReached);
      } else {
        setDecisions(data.decisions);
        onApplied();
      }
    } catch {
      setError("Network error — please try again.");
    }
    setLoading(false);
  }

  const actionLabel: Record<string, string> = {
    keep_today: "Kept today",
    move_tomorrow: "Moved to tomorrow",
    drop: "Saved for later",
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
