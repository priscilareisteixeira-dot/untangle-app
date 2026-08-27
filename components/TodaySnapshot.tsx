type Task = {
  id: string;
  title: string;
  category: string;
  duration_minutes: number;
  scheduled_minutes: number | null;
  completed: boolean;
};

function formatTime(mins: number | null) {
  if (mins == null) return "--";
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const ampm = h < 12 ? "am" : "pm";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m < 10 ? "0" : ""}${m}${ampm}`;
}

export default function TodaySnapshot({ tasks }: { tasks: Task[] }) {
  if (tasks.length === 0) {
    return (
      <div className="bg-white rounded-3xl shadow-soft p-6 text-center">
        <p className="text-2xl mb-2">🌱</p>
        <p className="text-sm font-bold text-ink-faint">Nothing planned yet. Brain dump above to get started.</p>
      </div>
    );
  }

  const done = tasks.filter((t) => t.completed).length;
  const pct = Math.round((done / tasks.length) * 100);
  const next = tasks.find((t) => !t.completed);

  return (
    <div className="bg-white rounded-3xl shadow-soft p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="font-extrabold text-sm">
          {done} of {tasks.length} done today
        </span>
        <span className="font-extrabold text-sm text-purple-600">{pct}%</span>
      </div>
      <div className="h-1.5 bg-purple-100 rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-gradient-to-r from-purple-500 to-purple-700 rounded-full"
          style={{ width: `${pct}%` }}
        />
      </div>
      {next ? (
        <div className="bg-purple-50 rounded-2xl p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-lg">📌</div>
          <div>
            <p className="font-extrabold text-sm">{next.title}</p>
            <p className="text-xs font-bold text-ink-faint">
              {formatTime(next.scheduled_minutes)} · {next.duration_minutes} min
            </p>
          </div>
        </div>
      ) : (
        <p className="text-center text-sm font-extrabold text-green-600">🎉 All done for today</p>
      )}
    </div>
  );
}
