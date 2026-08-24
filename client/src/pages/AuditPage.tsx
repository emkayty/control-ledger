import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { useControlScope } from "@/contexts/ControlScopeContext";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, Clock3, Fingerprint, History, UserRoundCheck } from "lucide-react";

function ActionLabel({ action }: { action: string }) {
  const isControl = action.includes("reconciliation") || action.includes("exception");
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.13em] ${isControl ? "bg-amber-50 text-amber-800" : "bg-teal-50 text-teal-800"}`}>{action.replaceAll(".", " · ").replaceAll("_", " ")}</span>;
}

export default function AuditPage() {
  const scope = useControlScope();
  const audit = trpc.control.audit.list.useQuery({ organisationId: scope.organisationId, branchId: scope.branchId, limit: 50 });
  return <div className="mx-auto max-w-6xl space-y-6">
    <div><p className="text-xs font-extrabold uppercase tracking-[0.15em] text-teal-700">Immutable control history</p><h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">Audit trail</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Material actions are shown for this branch together with organisation-wide governance actions. Financial events are preserved, not silently rewritten.</p></div>
    {audit.isLoading ? <section className="soft-card rounded-3xl border bg-card p-8 text-sm font-bold text-muted-foreground">Loading append-only activity history…</section> : audit.isError ? <section className="soft-card rounded-3xl border border-rose-200 bg-rose-50 p-7"><AlertTriangle className="size-5 text-rose-700" /><p className="mt-3 text-sm font-extrabold text-rose-800">Audit history is unavailable</p><p className="mt-1 text-sm text-rose-700">{audit.error.message}</p><Button variant="outline" className="mt-4 rounded-xl" onClick={() => audit.refetch()}>Try again</Button></section> : !audit.data?.length ? <EmptyState icon={History} title="No scoped audit events yet" copy="The first material action in this branch will appear here with its actor and correlation identifier." /> : <section className="soft-card overflow-hidden rounded-3xl border bg-card"><div className="border-b px-5 py-4"><p className="text-sm font-extrabold">Latest material actions</p><p className="mt-1 text-xs text-muted-foreground">Showing up to 50 authorised events from the current branch scope.</p></div><div className="divide-y">{audit.data.map(event => <article key={event.id} className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-start"><div className="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700"><History className="size-4" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><ActionLabel action={event.action} /><span className="text-xs font-bold text-muted-foreground">{event.entityType.replaceAll("_", " ")}</span></div><div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2"><p className="flex items-center gap-1.5"><UserRoundCheck className="size-3.5" />{event.actorName ?? event.actorEmail ?? "Authorised user"}</p><p className="flex items-center gap-1.5"><Clock3 className="size-3.5" />{new Date(event.occurredAt).toLocaleString()}</p><p className="flex min-w-0 items-center gap-1.5 font-mono text-[10px]"><Fingerprint className="size-3.5 shrink-0" /><span className="truncate">{event.correlationId}</span></p></div></div></article>)}</div></section>}
  </div>;
}
