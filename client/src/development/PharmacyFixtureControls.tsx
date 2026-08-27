import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import React, { useEffect, useRef, useState } from "react";
import { buildPharmacyDevelopmentFixtures, type PharmacyFixtureRequest } from "@/lib/pharmacyFixtures";

type Props = {
  fixtureMode: boolean;
  onLoad: (fixtures: PharmacyFixtureRequest[]) => void;
  onClear: () => void;
};

type LocalFailureMode = "normal" | "offline" | "timeout" | "unavailable";

const localFailureDetails: Record<Exclude<LocalFailureMode, "normal">, { title: string; detail: string }> = {
  offline: { title: "Simulated offline condition", detail: "The local preview behaves as if the connection is offline. No connection was attempted." },
  timeout: { title: "Simulated request timeout", detail: "The local preview behaves as if a request timed out. No request was sent." },
  unavailable: { title: "Simulated service unavailable", detail: "The local preview behaves as if a service is unavailable. No service was contacted." },
};

export function FixtureQueueLoadingSkeleton({ progress }: { progress: number }) {
  const completed = Math.max(0, Math.min(100, Math.round(progress)));
  return <div role="status" aria-live="polite" className="mb-3 rounded-2xl border border-dashed border-violet-200 bg-violet-50/60 p-3"><div className="flex items-center justify-between gap-3"><p className="text-xs font-bold text-violet-950">Preparing local test queue…</p><p className="shrink-0 text-[11px] font-extrabold tabular-nums text-violet-900">{completed}% ready</p></div><p className="mt-1 text-[11px] leading-4 text-violet-800">Synthetic non-clinical records stay in this browser. No Pharmacy service is called.</p><div role="progressbar" aria-label="Local test queue preparation" aria-valuemin={0} aria-valuemax={100} aria-valuenow={completed} className="mt-3 h-1.5 overflow-hidden rounded-full bg-violet-100"><div className="h-full rounded-full bg-violet-500 transition-[width] duration-150 ease-out motion-reduce:transition-none" style={{ width: `${completed}%` }} /></div><div aria-hidden="true" className="mt-3 space-y-2"><Skeleton className="h-8 w-2/5 bg-violet-100" /><Skeleton className="h-14 w-full bg-violet-100" /><Skeleton className="h-14 w-full bg-violet-100" /></div></div>;
}

export function FixtureModeHeaderBadge() {
  return <Tooltip><TooltipTrigger asChild><button type="button" data-testid="fixture-header-badge" className="rounded-full border border-violet-300/50 bg-violet-500/25 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-violet-50 shadow-sm transition-transform duration-150 ease-out hover:bg-violet-500/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-100 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1d1a3d] active:scale-[0.97] motion-reduce:transition-none">Local test queue active · synthetic data</button></TooltipTrigger><TooltipContent sideOffset={8} className="max-w-72 bg-slate-950 px-3 py-2 text-left text-xs leading-5 text-white">Synthetic data is locally generated, non-clinical test content held only in this browser. It is not an authorised request, provider response, patient record, prescription, stock event, or supply action.</TooltipContent></Tooltip>;
}

export function FixtureFailureSimulationPanel({ value, onChange }: { value: LocalFailureMode; onChange: (value: LocalFailureMode) => void }) {
  return <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-violet-100/70 px-2.5 py-2"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-violet-950">Local failure simulator</p><p className="mt-0.5 text-[10px] leading-4 text-violet-800">Browser-only preview. It never sends a request.</p></div><label className="text-[11px] font-bold text-violet-950" htmlFor="fixture-failure-simulation"><span className="sr-only">Fixture preparation simulation</span><select id="fixture-failure-simulation" aria-label="Fixture preparation simulation" value={value} onChange={event => onChange(event.target.value as LocalFailureMode)} className="h-8 rounded-lg border border-violet-200 bg-white px-2 text-[11px] font-semibold text-violet-950 outline-none focus-visible:ring-2 focus-visible:ring-violet-400"><option value="normal">Normal local preparation</option><option value="offline">Simulate offline</option><option value="timeout">Simulate timeout</option><option value="unavailable">Simulate unavailable service</option></select></label></div>;
}

export function FixturePreparationFailure({ mode, onRetry, onReturn }: { mode: Exclude<LocalFailureMode, "normal">; onRetry: () => void; onReturn: () => void }) {
  const detail = localFailureDetails[mode];
  return <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3"><p className="text-xs font-extrabold text-rose-950">{detail.title}</p><p className="mt-1 text-[11px] leading-4 text-rose-900">{detail.detail} This is a development-only local error state; no Pharmacy service, provider validation, or data change occurred.</p><div className="mt-3 flex flex-wrap gap-2"><Button type="button" size="sm" variant="outline" onClick={onRetry} className="h-8 rounded-lg border-rose-300 bg-white text-xs text-rose-950 hover:bg-rose-100">Retry local preview</Button><Button type="button" size="sm" variant="ghost" onClick={onReturn} className="h-8 rounded-lg text-xs text-rose-950 hover:bg-rose-100">Return to authorised queue</Button></div></div>;
}

export default function PharmacyFixtureControls({ fixtureMode, onLoad, onClear }: Props) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [failureMode, setFailureMode] = useState<LocalFailureMode>("normal");
  const [failure, setFailure] = useState<Exclude<LocalFailureMode, "normal"> | null>(null);
  const timers = useRef<number[]>([]);
  const clearTimers = () => { timers.current.forEach(window.clearTimeout); timers.current = []; };
  useEffect(() => () => clearTimers(), []);
  const prepareLocalFixtures = () => {
    clearTimers(); setFailure(null); setLoading(true); setProgress(12);
    timers.current.push(window.setTimeout(() => setProgress(68), 85));
    timers.current.push(window.setTimeout(() => {
      setProgress(100); setLoading(false);
      if (failureMode === "normal") { onLoad(buildPharmacyDevelopmentFixtures()); return; }
      setFailure(failureMode);
    }, 180));
  };
  const returnToAuthorisedQueue = () => { clearTimers(); setLoading(false); setProgress(0); setFailure(null); onClear(); };
  const toggle = (checked: boolean) => {
    if (!checked) { returnToAuthorisedQueue(); return; }
    prepareLocalFixtures();
  };
  if (loading) return <FixtureQueueLoadingSkeleton progress={progress} />;
  return <div className={`mb-3 rounded-2xl border border-dashed border-violet-200 bg-violet-50/95 px-3 py-2.5 ${fixtureMode ? "sticky top-3 z-20 shadow-sm" : ""}`}><FixtureFailureSimulationPanel value={failureMode} onChange={value => { setFailureMode(value); setFailure(null); }} />{failure ? <FixturePreparationFailure mode={failure} onRetry={prepareLocalFixtures} onReturn={returnToAuthorisedQueue} /> : <div className="flex flex-wrap items-center justify-between gap-3"><div className="min-w-0"><p className="text-[11px] font-bold leading-4 text-violet-950">Development-only local preview</p><p className="mt-0.5 text-[11px] leading-4 text-violet-800">{fixtureMode ? "Viewing synthetic browser-memory data. Review, approval, supply, and stock controls remain unavailable." : "Viewing the current authorised scoped queue. This switch does not initiate provider validation."}</p></div><label className="flex shrink-0 items-center gap-2 text-xs font-bold text-violet-950" htmlFor="pharmacy-fixture-mode"><span>Local test queue</span><Switch id="pharmacy-fixture-mode" aria-label="Use local synthetic test queue" checked={fixtureMode} onCheckedChange={toggle} /></label></div>}</div>;
}

export function FixtureSafetyNotice() {
  return <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">Synthetic development fixtures only. Review, approval, supply, and stock actions are intentionally unavailable.</p>;
}
