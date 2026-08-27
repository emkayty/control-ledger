import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useControlScope } from "@/contexts/ControlScopeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, ExternalLink, History, Paperclip, ShieldCheck, Upload } from "lucide-react";
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

function fileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onerror = () => reject(new Error("Could not read the selected attachment.")); reader.onload = () => resolve(String(reader.result)); reader.readAsDataURL(file); });
}

function AttachmentLink({ attachment }: { attachment: { id: string; originalName: string; contentType: string; sizeBytes: number } }) {
  const scope = useControlScope();
  const { t } = useLanguage();
  const file = trpc.control.exceptions.getNoteAttachment.useQuery({ organisationId: scope.organisationId, attachmentId: attachment.id }, { enabled: false });
  const open = async () => {
    const result = await file.refetch();
    if (result.data?.url) window.open(result.data.url, "_blank", "noopener,noreferrer");
  };
  return <Button type="button" size="sm" variant="outline" className="h-7 max-w-full rounded-lg px-2 text-[11px]" onClick={open} disabled={file.isFetching}><Paperclip className="mr-1 size-3 shrink-0" /><span className="truncate">{attachment.originalName}</span><ExternalLink className="ml-1 size-3 shrink-0" /><span className="sr-only">{t("openAttachment")}</span></Button>;
}

function InvestigationNotes({ exceptionId, className = "" }: { exceptionId: string; className?: string }) {
  const scope = useControlScope();
  const { t } = useLanguage();
  const utils = trpc.useUtils();
  const notes = trpc.control.exceptions.notes.useQuery({ organisationId: scope.organisationId, exceptionId });
  const [attachments, setAttachments] = useState<File[]>([]);
  const addNote = trpc.control.exceptions.addNote.useMutation();
  const addAttachment = trpc.control.exceptions.addNoteAttachment.useMutation();
  const isSaving = addNote.isPending || addAttachment.isPending;
  return <details className={`rounded-2xl bg-slate-50 px-4 py-3 ${className}`}><summary className="cursor-pointer text-xs font-extrabold text-slate-700">{t("investigationNotes")} {notes.data?.length ? `(${notes.data.length})` : ""}</summary><div className="mt-3 space-y-3">{notes.isLoading ? <p className="text-xs text-muted-foreground">Loading note history…</p> : null}{notes.isError ? <p className="text-xs text-rose-700">{notes.error.message}</p> : null}{notes.data?.length ? notes.data.map(note => <div key={note.id} className="rounded-xl border bg-white p-3"><p className="text-xs leading-5 text-slate-700">{note.body}</p>{note.attachments?.length ? <div className="mt-3 flex flex-wrap gap-2">{note.attachments.map(attachment => <AttachmentLink key={attachment.id} attachment={attachment} />)}</div> : null}<p className="mt-2 font-mono text-[10px] text-muted-foreground">{new Date(note.createdAt).toLocaleString()} · {note.correlationId.slice(0, 10)}…</p></div>) : <p className="text-xs text-muted-foreground">{t("noInvestigationNotes")}</p>}<form className="space-y-3 border-t pt-3" onSubmit={async event => { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); try { const attachmentData = await Promise.all(attachments.map(async file => ({ filename: file.name, contentType: file.type, contentBase64: await fileAsDataUrl(file) }))); const note = await addNote.mutateAsync({ organisationId: scope.organisationId, exceptionId, body: String(data.get("note")) }); for (const attachment of attachmentData) await addAttachment.mutateAsync({ organisationId: scope.organisationId, exceptionId, noteId: note.id, attachment, idempotencyKey: crypto.randomUUID() }); toast.success(attachmentData.length ? "Investigation note and attachments saved." : "Investigation note added."); form.reset(); setAttachments([]); await utils.control.exceptions.notes.invalidate({ organisationId: scope.organisationId, exceptionId }); } catch (error) { toast.error(error instanceof Error ? error.message : "The investigation note could not be saved."); } }}><div className="flex flex-col gap-2 sm:flex-row"><Input name="note" required minLength={2} placeholder={t("addInvestigationNote")} /><Button type="submit" size="sm" variant="outline" disabled={isSaving} className="rounded-xl">{isSaving ? t("uploadingAttachments") : t("addNote")}</Button></div><div><label className="flex w-fit cursor-pointer items-center gap-2 rounded-xl border border-dashed bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"><Upload className="size-3.5 text-teal-700" />{t("attachFiles")}<input className="sr-only" type="file" multiple accept="application/pdf,image/jpeg,image/png,image/webp" onChange={event => setAttachments(Array.from(event.target.files ?? []).slice(0, 3))} /></label><p className="mt-2 text-[11px] leading-4 text-muted-foreground">{t("attachmentHint")}</p>{attachments.length ? <p className="mt-2 text-[11px] font-semibold text-slate-700">{attachments.map(file => file.name).join(" · ")}</p> : null}</div></form></div></details>;
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
  return <section className="mt-5 border-t pt-4"><InvestigationNotes exceptionId={exception.id} /><div className="mt-5 border-t pt-4"><p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">Controlled decision</p>{isFinal ? <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800"><ShieldCheck className="size-4" />Resolution history is retained; this case is not silently erased.</div> : canDecide ? <div className="mt-3 space-y-2"><p className="text-xs leading-5 text-muted-foreground">Record an independent decision. The service prevents a submitter from approving their own proposal.</p><div className="flex flex-col gap-2"><Input value={rationale} onChange={event => setRationale(event.target.value)} required minLength={4} placeholder="Approval or return rationale" /><div className="flex flex-wrap gap-2"><Button disabled={approve.isPending || rationale.trim().length < 4} onClick={() => approve.mutate({ organisationId: scope.organisationId, exceptionId: exception.id, approve: true, rationale: rationale.trim() })} className="rounded-xl bg-teal-700 hover:bg-teal-800"><CheckCircle2 className="mr-2 size-4" />Approve resolution</Button><Button disabled={approve.isPending || rationale.trim().length < 4} variant="outline" onClick={() => approve.mutate({ organisationId: scope.organisationId, exceptionId: exception.id, approve: false, rationale: rationale.trim() })} className="rounded-xl">Return for review</Button></div></div></div> : <form className="mt-3 flex flex-col gap-2" onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); submit.mutate({ organisationId: scope.organisationId, exceptionId: exception.id, note: String(data.get("note")) }); }}><p className="text-xs leading-5 text-muted-foreground">Submit a genuine proposed resolution with its investigation basis. This does not settle a receivable or alter evidence.</p><Input name="note" required minLength={4} placeholder="Proposed resolution and investigation basis" /><Button type="submit" disabled={submit.isPending} className="w-fit rounded-xl bg-teal-700 hover:bg-teal-800">Submit for independent approval</Button></form>}<ApprovalHistory exceptionId={exception.id} /></div></section>;
}
