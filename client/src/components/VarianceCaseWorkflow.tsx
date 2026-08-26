import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useControlScope } from "@/contexts/ControlScopeContext";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, History, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export type VarianceCaseWorkflowItem = {
  id: string;
  status: string;
};

function ApprovalHistory({ exceptionId }: { exceptionId: string }) {
  const scope = useControlScope();
  const history = trpc.control.exceptions.approvalHistory.useQuery({ organisationId: scope.organisationId, exceptionId });
  if (history.isLoading) return null;
  if (history.isError) return <p className="mt-3 text-xs text-rose-700">Approval history could not load: {history.error.message}</p>;
  if (!history.data?.length) return null;
  return <section className="mt-4 rounded-2xl border border-violet-100 bg-violet-50/50 p-4"><div className="flex items-center gap-2"><History className="size-4 text-violet-700" /><p className="text-xs font-extrabold text-violet-900">Approval decision trail</p></div><div className="mt-3 space-y-2">{history.data.map(item => <div key={item.id} className="rounded-xl bg-white/80 p-3"><p className="text-xs font-extrabold capitalize text-slate-800">{item.decision} <span className="font-medium text-muted-foreground">· {item.actorName ?? "Authorised user"}</span></p><p className="mt-1 text-xs leading-5 text-slate-700">{item.rationale}</p><p className="mt-2 font-mono text-[10px] text-muted-foreground">{new Date(item.createdAt).toLocaleString()} · {item.correlationId.slice(0, 10)}…</p></div>)}</div></section>;
}

function InvestigationNotes({ exceptionId }: { exceptionId: string }) {
  const scope = useControlScope();
  const utils = trpc.useUtils();
  const notes = trpc.control.exceptions.notes.useQuery({ organisationId: scope.organisationId, exceptionId });
  const addNote = trpc.control.exceptions.addNote.useMutation({
    onSuccess: () => { toast.success("Investigation note added."); utils.control.exceptions.notes.invalidate({ organisationId: scope.organisationId, exceptionId }); },
    onError: error => toast.error(error.message),
  });
  return <details className="mt-4 rounded-2xl bg-slate-50 px-4 py-3"><summary className="cursor-pointer text-xs font-extrabold text-slate-700">Investigation notes {notes.data?.length ? `(${notes.data.length})` : ""}</summary><div className="mt-3 space-y-3">{notes.isLoading ? <p className="text-xs text-muted-foreground">Loading note history…</p> : null}{notes.isError ? <p className="text-xs text-rose-700">{notes.error.message}</p> : null}{notes.data?.length ? notes.data.map(note => <div key={note.id} className="rounded-xl border bg-white p-3"><p className="text-xs leading-5 text-slate-700">{note.body}</p><p className="mt-2 font-mono text-[10px] text-muted-foreground">{new Date(note.createdAt).toLocaleString()} · {note.correlationId.slice(0, 10)}…</p></div>) : <p className="text-xs text-muted-foreground">No investigation notes have been recorded.</p>}<form className="flex flex-col gap-2 pt-1 sm:flex-row" onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); addNote.mutate({ organisationId: scope.organisationId, exceptionId, body: String(data.get("note")) }); event.currentTarget.reset(); }}><Input name="note" required minLength={2} placeholder="Add an investigation note" /><Button type="submit" size="sm" variant="outline" disabled={addNote.isPending} className="rounded-xl">Add note</Button></form></div></details>;
}

export function VarianceCaseWorkflow({ exception }: { exception: VarianceCaseWorkflowItem }) {
  const scope = useControlScope();
  const utils = trpc.useUtils();
  const [rationale, setRationale] = useState("");
  const submit = trpc.control.exceptions.submitResolution.useMutation({
    onSuccess: () => { toast.success("Resolution submitted for independent approval."); utils.control.exceptions.list.invalidate(scope); utils.control.dashboard.invalidate(scope); },
    onError: error => toast.error(error.message),
  });
  const approve = trpc.control.exceptions.approveResolution.useMutation({
    onSuccess: result => { toast.success(result.status === "resolved" ? "Resolution independently approved." : "Variance returned for investigation."); utils.control.exceptions.list.invalidate(scope); utils.control.dashboard.invalidate(scope); },
    onError: error => toast.error(error.message),
  });
  const isFinal = ["resolved", "rejected"].includes(exception.status);
  const canDecide = exception.status === "pending_approval" && ["owner", "controller", "approver"].includes(scope.role);
  return <section className="mt-5 border-t pt-4"><p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">Controlled decision</p>{isFinal ? <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800"><ShieldCheck className="size-4" />Resolution history is retained; this case is not silently erased.</div> : canDecide ? <div className="mt-3 space-y-2"><p className="text-xs leading-5 text-muted-foreground">Record an independent decision. The service prevents a submitter from approving their own proposal.</p><div className="flex flex-col gap-2"><Input value={rationale} onChange={event => setRationale(event.target.value)} required minLength={4} placeholder="Approval or return rationale" /><div className="flex flex-wrap gap-2"><Button disabled={approve.isPending || rationale.trim().length < 4} onClick={() => approve.mutate({ organisationId: scope.organisationId, exceptionId: exception.id, approve: true, rationale: rationale.trim() })} className="rounded-xl bg-teal-700 hover:bg-teal-800"><CheckCircle2 className="mr-2 size-4" />Approve resolution</Button><Button disabled={approve.isPending || rationale.trim().length < 4} variant="outline" onClick={() => approve.mutate({ organisationId: scope.organisationId, exceptionId: exception.id, approve: false, rationale: rationale.trim() })} className="rounded-xl">Return for review</Button></div></div></div> : <form className="mt-3 flex flex-col gap-2" onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); submit.mutate({ organisationId: scope.organisationId, exceptionId: exception.id, note: String(data.get("note")) }); }}><p className="text-xs leading-5 text-muted-foreground">Submit a genuine proposed resolution with its investigation basis. This does not settle a receivable or alter evidence.</p><Input name="note" required minLength={4} placeholder="Proposed resolution and investigation basis" /><Button type="submit" disabled={submit.isPending} className="w-fit rounded-xl bg-teal-700 hover:bg-teal-800">Submit for independent approval</Button></form>}<ApprovalHistory exceptionId={exception.id} /><InvestigationNotes exceptionId={exception.id} /></section>;
}
