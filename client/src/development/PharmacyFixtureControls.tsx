import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import React, { useState } from "react";
import { buildPharmacyDevelopmentFixtures, type PharmacyFixtureRequest } from "@/lib/pharmacyFixtures";

type Props = {
  fixtureMode: boolean;
  onLoad: (fixtures: PharmacyFixtureRequest[]) => void;
  onClear: () => void;
};

export function FixtureQueueLoadingSkeleton() {
  return <div role="status" aria-live="polite" className="mb-3 rounded-2xl border border-dashed border-violet-200 bg-violet-50/60 p-3"><p className="text-xs font-bold text-violet-950">Preparing local test queue…</p><p className="mt-1 text-[11px] leading-4 text-violet-800">Synthetic non-clinical records stay in this browser. No Pharmacy service is called.</p><div aria-hidden="true" className="mt-3 space-y-2"><Skeleton className="h-8 w-2/5 bg-violet-100" /><Skeleton className="h-14 w-full bg-violet-100" /><Skeleton className="h-14 w-full bg-violet-100" /></div></div>;
}

export default function PharmacyFixtureControls({ fixtureMode, onLoad, onClear }: Props) {
  const [loading, setLoading] = useState(false);
  const toggle = (checked: boolean) => {
    if (!checked) { onClear(); return; }
    setLoading(true);
    window.setTimeout(() => { onLoad(buildPharmacyDevelopmentFixtures()); setLoading(false); }, 180);
  };
  if (loading) return <FixtureQueueLoadingSkeleton />;
  return <div className="mb-3 rounded-2xl border border-dashed border-violet-200 bg-violet-50/60 px-3 py-2.5"><div className="flex flex-wrap items-center justify-between gap-3"><div className="min-w-0"><p className="text-[11px] font-bold leading-4 text-violet-950">Development-only local preview</p><p className="mt-0.5 text-[11px] leading-4 text-violet-800">{fixtureMode ? "Viewing synthetic browser-memory data. Review, approval, supply, and stock controls remain unavailable." : "Viewing the current authorised scoped queue. This switch does not initiate provider validation."}</p></div><label className="flex shrink-0 items-center gap-2 text-xs font-bold text-violet-950" htmlFor="pharmacy-fixture-mode"><span>Local test queue</span><Switch id="pharmacy-fixture-mode" aria-label="Use local synthetic test queue" checked={fixtureMode} onCheckedChange={toggle} /></label></div></div>;
}

export function FixtureSafetyNotice() {
  return <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">Synthetic development fixtures only. Review, approval, supply, and stock actions are intentionally unavailable.</p>;
}
