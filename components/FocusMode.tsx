"use client";

import { useEffect, useRef, useState } from "react";

export default function FocusMode({
  title,
  onComplete,
  onExit,
}: {
  title: string;
  onComplete: () => void;
  onExit: () => void;
}) {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  function toggle() {
    if (running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setRunning(false);
    } else {
      setRunning(true);
      intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    }
  }

  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const display = `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;

  return (
    <div className="fixed inset-0 bg-paper z-50 flex flex-col items-center justify-center px-6 text-center">
      <button onClick={onExit} className="absolute top-6 left-4 w-9 h-9 rounded-full bg-purple-50 text-lg">
        ‹
      </button>
      <p className="text-[11px] font-extrabold uppercase tracking-wide text-ink-faint">Focus mode</p>
      <p className="font-display font-extrabold text-xl mt-2 max-w-xs">{title}</p>
      <p className="font-display font-extrabold text-6xl text-purple-700 mt-8">{display}</p>
      <div className="flex gap-3 mt-8">
        <button
          onClick={toggle}
          className="bg-white border-2 border-purple-200 text-purple-700 font-extrabold rounded-full px-6 py-3"
        >
          {running ? "⏸ Pause" : seconds > 0 ? "▶ Resume" : "▶ Start"}
        </button>
        <button
          onClick={onComplete}
          className="bg-gradient-to-br from-purple-500 to-purple-700 text-white font-extrabold rounded-full px-6 py-3"
        >
          Complete ✓
        </button>
      </div>
    </div>
  );
}
