import BrainDumpCapture from "@/components/BrainDumpCapture";

export default function BrainDumpPage() {
  return (
    <div className="space-y-4">
      <h1 className="font-display font-extrabold text-xl">Brain Dump</h1>
      <p className="text-xs font-extrabold uppercase tracking-wide text-ink-faint">
        Dump everything in your head...
      </p>
      <BrainDumpCapture />
    </div>
  );
}
