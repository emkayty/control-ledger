import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import React, { useEffect, useRef, useState } from "react";
import { buildPharmacyDevelopmentFixtures, type PharmacyFixtureRequest } from "@/lib/pharmacyFixtures";

type Props = {
  fixtureMode: boolean;
  onLoad: (fixtures: PharmacyFixtureRequest[]) => void;
  onClear: () => void;
};

export function FixtureQueueLoadingSkeleton({ progress }: { progress: number }) {
  const completed = Math.max(0, Math.min(100, Math.round(progress)));
  return <div role="status" aria-live="polite" className="mb-3 rounded-2xl border border-dashed border-violet-200 bg-violet-50/60 p-3"><div className="flex items-center justify-between gap-3"><p className="text-xs font-bold text-violet-950">Preparing local test queue…</p><p className="shrink-0 text-[11px] font-extrabold tabular-nums text-violet-900">{completed}% ready</p></div><p className="mt-1 text-[11px] leading-4 text-violet-800">Synthetic non-clinical records stay in this browser. No Pharmacy service is called.</p><div role="progressbar" aria-label="Local test queue preparation" aria-valuemin={0} aria-valuemax={100} aria-valuenow={completed} className="mt-3 h-1.5 overflow-hidden rounded-full bg-violet-100"><div className="h-full rounded-full bg-violet-500 transition-[width] duration-150 ease-out motion-reduce:transition-none" style={{ width: `${completed}%` }} /></div><div aria-hidden="true" className="mt-3 space-y-2"><Skeleton className="h-8 w-2/5 bg-violet-100" /><Skeleton className="h-14 w-full bg-violet-100" /><Skeleton className="h-14 w-full bg-violet-100" /></div></div>;
}

export function FixtureModeHeaderBadge() {
  return <span data-testid="fixture-header-badge" role="status" aria-live="polite" className="rounded-full border border-violet-300/50 bg-violet-500/25 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-violet-50 shadow-sm">Local test queue active · synthetic data</span>;
}

export default function PharmacyFixtureControls({ fixtureMode, onLoad, onClear }: Props) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(window.clearTimeout), []);
  const toggle = (checked: boolean) => {
    if (!checked) { onClear(); return; }
    setLoading(true); setProgress(12);
    timers.current.push(window.setTimeout(() => setProgress(68), 85));
    timers.current.push(window.setTimeout(() => { setProgress(100); onLoad(buildPharmacyDevelopmentFixtures()); setLoading(false); }, 180));
  };
  if (loading) return <FixtureQueueLoadingSkeleton progress={progress} />;
  return <div className={`mb-3 rounded-2xl border border-dashed border-violet-200 bg-violet-50/95 px-3 py-2.5 ${fixtureMode ? "sticky top-3 z-20 shadow-sm" : ""}`}><div className="flex flex-wrap items-center justify-between gap-3"><div className="min-w-0"><p className="text-[11px] font-bold leading-4 text-violet-950">Development-only local preview</p><p className="mt-0.5 text-[11px] leading-4 text-violet-800">{fixtureMode ? "Viewing synthetic browser-memory data. Review, approval, supply, and stock controls remain unavailable." : "Viewing the current authorised scoped queue. This switch does not initiate provider validation."}</p></div><label className="flex shrink-0 items-center gap-2 text-xs font-bold text-violet-950" htmlFor="pharmacy-fixture-mode"><span>Local test queue</span><Switch id="pharmacy-fixture-mode" aria-label="Use local synthetic test queue" checked={fixtureMode} onCheckedChange={toggle} /></label></div></div>;
}

export function FixtureSafetyNotice() {
  return <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">Synthetic development fixtures only. Review, approval, supply, and stock actions are intentionally unavailable.</p>;
}
