import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import React, { useState } from "react";
import { buildPharmacyDevelopmentFixtures, type PharmacyFixtureRequest } from "@/lib/pharmacyFixtures";

type Props = {
  fixtureMode: boolean;
  onLoad: (fixtures: PharmacyFixtureRequest[]) => void;
  onClear: () => void;
};

export default function PharmacyFixtureControls({ fixtureMode, onLoad, onClear }: Props) {
  const [loading, setLoading] = useState(false);
  const toggle = () => {
    if (fixtureMode) { onClear(); return; }
    setLoading(true);
    window.setTimeout(() => { onLoad(buildPharmacyDevelopmentFixtures()); setLoading(false); }, 0);
  };
  return <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-violet-200 bg-violet-50/60 px-3 py-2"><p className="text-[11px] font-bold leading-4 text-violet-950">Development-only local preview. Synthetic non-clinical data stays in this browser and never calls a Pharmacy write service.</p><Button type="button" variant="outline" size="sm" disabled={loading} className="h-7 rounded-lg text-xs" onClick={toggle}>{loading ? <><Loader2 className="mr-1 size-3 animate-spin" />Loading…</> : fixtureMode ? "Return to authorised queue" : "Load local test queue"}</Button></div>;
}

export function FixtureSafetyNotice() {
  return <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">Synthetic development fixtures only. Review, approval, supply, and stock actions are intentionally unavailable.</p>;
}
