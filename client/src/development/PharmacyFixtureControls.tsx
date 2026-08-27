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

type LocalDebugEntry = {
  id: string;
  mode: Exclude<LocalFailureMode, "normal">;
  delayMs: number;
  recordedAt: string;
};

const MIN_LOCAL_DELAY_MS = 180;
const MAX_LOCAL_DELAY_MS = 5000;

const localFailureDetails: Record<Exclude<LocalFailureMode, "normal">, { title: string; detail: string }> = {
  offline: { title: "Simulated offline condition", detail: "The local preview behaves as if the connection is offline. No connection was attempted." },
  timeout: { title: "Simulated request timeout", detail: "The local preview behaves as if a request timed out. No request was sent." },
  unavailable: { title: "Simulated service unavailable", detail: "The local preview behaves as if a service is unavailable. No service was contacted." },
};

export function FixtureQueueLoadingSkeleton({ progress, delayMs = MIN_LOCAL_DELAY_MS }: { progress: number; delayMs?: number }) {
  const completed = Math.max(0, Math.min(100, Math.round(progress)));
  return <div role="status" aria-live="polite" className="mb-3 rounded-2xl border border-dashed border-violet-200 bg-violet-50/60 p-3"><div className="flex items-center justify-between gap-3"><p className="text-xs font-bold text-violet-950">Preparing local test queue…</p><p className="shrink-0 text-[11px] font-extrabold tabular-nums text-violet-900">{completed}% ready</p></div><p className="mt-1 text-[11px] leading-4 text-violet-800">Synthetic non-clinical records stay in this browser. Local delay: {delayMs.toLocaleString()} ms. No Pharmacy service is called.</p><div role="progressbar" aria-label="Local test queue preparation" aria-valuemin={0} aria-valuemax={100} aria-valuenow={completed} className="mt-3 h-1.5 overflow-hidden rounded-full bg-violet-100"><div className="h-full rounded-full bg-violet-500 transition-[width] duration-150 ease-out motion-reduce:transition-none" style={{ width: `${completed}%` }} /></div><div aria-hidden="true" className="mt-3 space-y-2"><Skeleton className="h-8 w-2/5 bg-violet-100" /><Skeleton className="h-14 w-full bg-violet-100" /><Skeleton className="h-14 w-full bg-violet-100" /></div></div>;
}

export function FixtureModeHeaderBadge() {
  return <Tooltip><TooltipTrigger asChild><button type="button" data-testid="fixture-header-badge" className="rounded-full border border-violet-300/50 bg-violet-500/25 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-violet-50 shadow-sm transition-transform duration-150 ease-out hover:bg-violet-500/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-100 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1d1a3d] active:scale-[0.97] motion-reduce:transition-none">Local test queue active · synthetic data</button></TooltipTrigger><TooltipContent sideOffset={8} className="max-w-72 bg-slate-950 px-3 py-2 text-left text-xs leading-5 text-white">Synthetic data is locally generated, non-clinical test content held only in this browser. It is not an authorised request, provider response, patient record, prescription, stock event, or supply action.</TooltipContent></Tooltip>;
}

export function FixtureFailureSimulationPanel({ value, onChange, delayMs, onDelayChange }: { value: LocalFailureMode; onChange: (value: LocalFailureMode) => void; delayMs: number; onDelayChange: (delayMs: number) => void }) {
  return <div className="mb-2 flex flex-wrap items-end justify-between gap-2 rounded-xl bg-violet-100/70 px-2.5 py-2"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-violet-950">Local failure simulator</p><p className="mt-0.5 text-[10px] leading-4 text-violet-800">Browser-only preview. It never sends a request.</p></div><div className="flex flex-wrap items-end gap-2"><label className="grid gap-1 text-[10px] font-bold text-violet-950" htmlFor="fixture-failure-simulation"><span>Simulation</span><select id="fixture-failure-simulation" aria-label="Fixture preparation simulation" value={value} onChange={event => onChange(event.target.value as LocalFailureMode)} className="h-8 rounded-lg border border-violet-200 bg-white px-2 text-[11px] font-semibold text-violet-950 outline-none focus-visible:ring-2 focus-visible:ring-violet-400"><option value="normal">Normal local preparation</option><option value="offline">Simulate offline</option><option value="timeout">Simulate timeout</option><option value="unavailable">Simulate unavailable service</option></select></label><label className="grid gap-1 text-[10px] font-bold text-violet-950" htmlFor="fixture-local-delay"><span>Local delay</span><span className="flex items-center gap-1"><input id="fixture-local-delay" aria-label="Local fixture delay in milliseconds" type="number" min={MIN_LOCAL_DELAY_MS} max={MAX_LOCAL_DELAY_MS} step="50" value={delayMs} onChange={event => onDelayChange(event.currentTarget.valueAsNumber)} className="h-8 w-20 rounded-lg border border-violet-200 bg-white px-2 text-[11px] font-semibold text-violet-950 outline-none focus-visible:ring-2 focus-visible:ring-violet-400" /><span className="text-[10px]">ms</span></span></label></div></div>;
}

export function FixtureSimulationDebugLog({ entries, onClear }: { entries: LocalDebugEntry[]; onClear: () => void }) {
  return <div role="log" aria-label="Local simulated error log" aria-live="polite" className="mt-2 rounded-xl border border-violet-200 bg-white/75 p-2.5"><div className="flex items-center justify-between gap-2"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-violet-950">Local simulation log</p><p className="mt-0.5 text-[10px] text-violet-800">Browser memory only · latest 10 events</p></div><Button type="button" size="sm" variant="ghost" disabled={!entries.length} onClick={onClear} className="h-7 rounded-md px-2 text-[10px] text-violet-900 hover:bg-violet-100">Clear log</Button></div>{entries.length ? <ol className="mt-2 space-y-1.5">{entries.map(entry => <li key={entry.id} className="rounded-lg bg-violet-50 px-2 py-1.5 text-[10px] leading-4 text-violet-950"><strong className="capitalize">{entry.mode}</strong> simulated after {entry.delayMs.toLocaleString()} ms <span className="text-violet-700">· local time {entry.recordedAt}</span></li>)}</ol> : <p className="mt-2 text-[10px] leading-4 text-violet-800">No local simulated errors recorded in this browser session.</p>}</div>;
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
  const [delayMs, setDelayMs] = useState(MIN_LOCAL_DELAY_MS);
  const [debugEntries, setDebugEntries] = useState<LocalDebugEntry[]>([]);
  const timers = useRef<number[]>([]);
  const clearTimers = () => { timers.current.forEach(window.clearTimeout); timers.current = []; };
  useEffect(() => () => clearTimers(), []);
  const prepareLocalFixtures = () => {
    clearTimers(); setFailure(null); setLoading(true); setProgress(12);
    const progressDelay = Math.min(delayMs - 1, Math.max(85, Math.round(delayMs * 0.45)));
    timers.current.push(window.setTimeout(() => setProgress(68), progressDelay));
    timers.current.push(window.setTimeout(() => {
      setProgress(100); setLoading(false);
      if (failureMode === "normal") { onLoad(buildPharmacyDevelopmentFixtures()); return; }
      setDebugEntries(entries => [{ id: `${Date.now()}-${failureMode}`, mode: failureMode, delayMs, recordedAt: new Date().toLocaleTimeString() }, ...entries].slice(0, 10));
      setFailure(failureMode);
    }, delayMs));
  };
  const returnToAuthorisedQueue = () => { clearTimers(); setLoading(false); setProgress(0); setFailure(null); onClear(); };
  const toggle = (checked: boolean) => {
    if (!checked) { returnToAuthorisedQueue(); return; }
    prepareLocalFixtures();
  };
  if (loading) return <FixtureQueueLoadingSkeleton progress={progress} delayMs={delayMs} />;
  const boundedDelay = (value: number) => setDelayMs(Number.isFinite(value) ? Math.min(MAX_LOCAL_DELAY_MS, Math.max(MIN_LOCAL_DELAY_MS, Math.round(value))) : MIN_LOCAL_DELAY_MS);
  return <div className={`mb-3 rounded-2xl border border-dashed border-violet-200 bg-violet-50/95 px-3 py-2.5 ${fixtureMode ? "sticky top-3 z-20 shadow-sm" : ""}`}><FixtureFailureSimulationPanel value={failureMode} onChange={value => { setFailureMode(value); setFailure(null); }} delayMs={delayMs} onDelayChange={boundedDelay} />{failure ? <FixturePreparationFailure mode={failure} onRetry={prepareLocalFixtures} onReturn={returnToAuthorisedQueue} /> : <div className="flex flex-wrap items-center justify-between gap-3"><div className="min-w-0"><p className="text-[11px] font-bold leading-4 text-violet-950">Development-only local preview</p><p className="mt-0.5 text-[11px] leading-4 text-violet-800">{fixtureMode ? "Viewing synthetic browser-memory data. Review, approval, supply, and stock controls remain unavailable." : "Viewing the current authorised scoped queue. This switch does not initiate provider validation."}</p></div><label className="flex shrink-0 items-center gap-2 text-xs font-bold text-violet-950" htmlFor="pharmacy-fixture-mode"><span>Local test queue</span><Switch id="pharmacy-fixture-mode" aria-label="Use local synthetic test queue" checked={fixtureMode} onCheckedChange={toggle} /></label></div>}<FixtureSimulationDebugLog entries={debugEntries} onClear={() => setDebugEntries([])} /></div>;
}

export function FixtureSafetyNotice() {
  return <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">Synthetic development fixtures only. Review, approval, supply, and stock actions are intentionally unavailable.</p>;
}
