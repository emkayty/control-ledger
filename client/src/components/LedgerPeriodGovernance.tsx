import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useControlScope } from "@/contexts/ControlScopeContext";
import { trpc } from "@/lib/trpc";
import { CalendarRange, CircleAlert, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const makeKey = () => crypto.randomUUID();
const canManagePeriods = (role: string) => ["owner", "controller"].includes(role);
const canRequestClose = (role: string) => ["owner", "controller", "manager"].includes(role);
const canDecideClose = (role: string) => ["owner", "controller", "approver"].includes(role);

type AccountingPeriod = {
  id: string;
  periodName: string;
  startsAt: Date;
  endsAt: Date;
  status: "open" | "close_requested" | "closed";
  decisions: Array<{ id: string; decision: string; rationale: string; createdAt: Date }>;
};

function PeriodStatus({ status }: { status: AccountingPeriod["status"] }) {
  const copy = status === "close_requested" ? "awaiting independent close" : status;
  const tone = status === "closed" ? "bg-slate-100 text-slate-700" : status === "close_requested" ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-800";
  return <span className={`rounded-full px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider ${tone}`}>{copy}</span>;
}

function PeriodDialog() {
  const scope = useControlScope(); const utils = trpc.useUtils(); const [open, setOpen] = useState(false);
  const create = trpc.ledger.periods.create.useMutation({ onSuccess: () => { toast.success("Accounting period created. No balances or journals were created."); setOpen(false); utils.ledger.periods.list.invalidate(scope); }, onError: error => toast.error(error.message) });
  if (!canManagePeriods(scope.role)) return null;
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button variant="outline" className="rounded-xl"><CalendarRange className="mr-2 size-4" />Period</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Set up accounting period</DialogTitle><DialogDescription>Configure a real branch accounting window. This creates only a governance definition; it does not create balances, journals, or opening entries.</DialogDescription></DialogHeader><form className="grid gap-3" onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); create.mutate({ ...scope, periodName: String(form.get("periodName")), startsOn: String(form.get("startsOn")), endsOn: String(form.get("endsOn")), rationale: String(form.get("rationale")), idempotencyKey: makeKey() }); }}><Input name="periodName" required minLength={2} maxLength={96} placeholder="e.g. August 2026" /><div className="grid grid-cols-2 gap-3"><label className="grid gap-1 text-xs font-bold">Starts (UTC)<Input name="startsOn" type="date" required /></label><label className="grid gap-1 text-xs font-bold">Ends (UTC)<Input name="endsOn" type="date" required /></label></div><textarea name="rationale" required minLength={4} className="min-h-24 rounded-xl border bg-white p-3 text-sm" placeholder="Why this accounting window is appropriate" /><Button disabled={create.isPending} className="rounded-xl bg-teal-700 hover:bg-teal-800">{create.isPending ? "Creating…" : "Create accounting period"}</Button></form></DialogContent></Dialog>;
}

function RequestCloseDialog({ period }: { period: AccountingPeriod }) {
  const scope = useControlScope(); const utils = trpc.useUtils(); const [open, setOpen] = useState(false);
  const request = trpc.ledger.periods.requestClose.useMutation({ onSuccess: () => { toast.success("Period close submitted for independent review."); setOpen(false); utils.ledger.periods.list.invalidate(scope); }, onError: error => toast.error(error.message) });
  if (!canRequestClose(scope.role) || period.status !== "open") return null;
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button size="sm" variant="outline" className="rounded-lg text-xs">Request close</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Request period close</DialogTitle><DialogDescription>Control Ledger checks for ready journals in this period. A different authorised reviewer must make the final decision.</DialogDescription></DialogHeader><form className="grid gap-3" onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); request.mutate({ ...scope, periodId: period.id, rationale: String(form.get("rationale")), idempotencyKey: makeKey() }); }}><textarea name="rationale" required minLength={4} className="min-h-24 rounded-xl border bg-white p-3 text-sm" placeholder="Why this period is ready for independent close review" /><Button disabled={request.isPending} className="rounded-xl bg-teal-700 hover:bg-teal-800">{request.isPending ? "Submitting…" : "Submit close request"}</Button></form></DialogContent></Dialog>;
}

function DecideCloseDialog({ period }: { period: AccountingPeriod }) {
  const scope = useControlScope(); const utils = trpc.useUtils(); const [open, setOpen] = useState(false);
  const decide = trpc.ledger.periods.decideClose.useMutation({ onSuccess: (_, input) => { toast.success(input.decision === "approve" ? "Period independently closed." : "Period close request rejected and returned to open."); setOpen(false); utils.ledger.periods.list.invalidate(scope); }, onError: error => toast.error(error.message) });
  if (!canDecideClose(scope.role) || period.status !== "close_requested") return null;
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button size="sm" className="rounded-lg bg-teal-700 text-xs hover:bg-teal-800">Independent decision</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Decide period close</DialogTitle><DialogDescription>You cannot decide your own close request. Approval closes only this period; it does not post, settle, or modify any journal.</DialogDescription></DialogHeader><form className="grid gap-3" onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); decide.mutate({ ...scope, periodId: period.id, decision: String(form.get("decision")) as "approve" | "reject", rationale: String(form.get("rationale")), idempotencyKey: makeKey() }); }}><select name="decision" required className="h-10 rounded-xl border bg-white px-3 text-sm"><option value="approve">Approve and close period</option><option value="reject">Reject and return to open</option></select><textarea name="rationale" required minLength={4} className="min-h-24 rounded-xl border bg-white p-3 text-sm" placeholder="Independent decision rationale" /><Button disabled={decide.isPending} className="rounded-xl bg-teal-700 hover:bg-teal-800">{decide.isPending ? "Recording…" : "Record independent decision"}</Button></form></DialogContent></Dialog>;
}

export function LedgerPeriodGovernance() {
  const scope = useControlScope(); const periodsQuery = trpc.ledger.periods.list.useQuery(scope); const periods = (periodsQuery.data ?? []) as AccountingPeriod[];
  return <section className="rounded-3xl border bg-white shadow-sm"><div className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-xl bg-violet-50 text-violet-700"><CalendarRange className="size-5" /></div><div><h2 className="font-extrabold">Accounting periods</h2><p className="mt-1 text-xs text-muted-foreground">Open a real window, clear ready journals, then require an independent close decision.</p></div></div><PeriodDialog /></div>{periodsQuery.isError ? <div className="p-5 text-center"><CircleAlert className="mx-auto size-5 text-rose-600" /><p className="mt-2 text-sm font-extrabold text-rose-700">Accounting periods could not load.</p><Button className="mt-3 rounded-xl" size="sm" variant="outline" onClick={() => periodsQuery.refetch()}>Try again</Button></div> : periodsQuery.isLoading ? <p className="p-5 text-sm text-muted-foreground">Loading accounting periods…</p> : !periods.length ? <div className="p-5 text-center"><div className="mx-auto grid size-10 place-items-center rounded-2xl bg-violet-50 text-violet-700"><ShieldCheck className="size-5" /></div><p className="mt-3 text-sm font-extrabold">No accounting period configured</p><p className="mx-auto mt-1 max-w-lg text-xs leading-5 text-muted-foreground">Existing journals remain unchanged. When your branch is ready, create its real operating period; no opening balance or journal is created automatically.</p></div> : <div className="divide-y">{periods.map(period => <article key={period.id} className="p-4 sm:p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-extrabold">{period.periodName}</p><PeriodStatus status={period.status} /></div><p className="mt-1 text-xs text-muted-foreground">{new Date(period.startsAt).toLocaleDateString()} to {new Date(period.endsAt).toLocaleDateString()} · UTC boundary</p>{period.decisions[0] ? <p className="mt-2 max-w-xl text-xs leading-5 text-slate-600">Latest decision: {period.decisions[0].decision.replaceAll("_", " ")} · {period.decisions[0].rationale}</p> : null}</div><div className="flex shrink-0 gap-2"><RequestCloseDialog period={period} /><DecideCloseDialog period={period} /></div></div></article>)}</div>}</section>;
}
