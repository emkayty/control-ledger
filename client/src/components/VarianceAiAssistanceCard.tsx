import { useState } from "react";
import { Bot, BrainCircuit, CheckCircle2, LockKeyhole, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useControlScope } from "@/contexts/ControlScopeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatMoney } from "@/lib/control";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

type Suggestion = {
  id: string;
  model: string;
  confidence: "low" | "medium" | "high";
  createdAt: Date | string;
  proposal: {
    summary?: string;
    potentialCauses?: Array<{ label: string; rationale: string; confidence: string }>;
    possibleMatches?: Array<{ candidateKey: string; rationale: string; confidence: string }>;
    reviewSteps?: string[];
    candidateSnapshot?: Array<{ candidateKey: string; kind: string; reference: string; status: string; amountMinor: string; currency: string; sourceName?: string }>;
  };
};

export function VarianceAiAssistanceCard({ exceptionId }: { exceptionId: string }) {
  const scope = useControlScope();
  const { t } = useLanguage();
  const utils = trpc.useUtils();
  const policy = trpc.varianceAi.policy.get.useQuery(scope);
  const suggestions = trpc.varianceAi.suggestions.list.useQuery({ organisationId: scope.organisationId, exceptionId });
  const [showNotice, setShowNotice] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const isOwner = scope.role === "owner";
  const configure = trpc.varianceAi.policy.configure.useMutation({
    onSuccess: () => { toast.success("Variance AI policy updated."); setShowNotice(false); setAccepted(false); policy.refetch(); },
    onError: error => toast.error(error.message),
  });
  const analyse = trpc.varianceAi.suggestions.analyse.useMutation({
    onSuccess: () => { toast.success("AI suggestion recorded for review."); utils.varianceAi.suggestions.list.invalidate({ organisationId: scope.organisationId, exceptionId }); },
    onError: error => toast.error(error.message),
  });
  const enabled = policy.data?.enabled === true;
  const latest = (suggestions.data?.[0] as Suggestion | undefined) ?? null;
  const snapshots = new Map((latest?.proposal.candidateSnapshot ?? []).map(candidate => [candidate.candidateKey, candidate]));
  const idempotencyKey = () => crypto.randomUUID();

  return <section className={`mt-4 overflow-hidden rounded-2xl border ${enabled ? "border-violet-200 bg-violet-50/40" : "border-amber-200 bg-amber-50/50"}`}>
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between"><div className="flex min-w-0 gap-3"><div className={`grid size-10 shrink-0 place-items-center rounded-xl ${enabled ? "bg-violet-100 text-violet-800" : "bg-amber-100 text-amber-800"}`}>{enabled ? <BrainCircuit className="size-5" /> : <LockKeyhole className="size-5" />}</div><div><h3 className="text-sm font-extrabold">{t("aiAssistant")}</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">{enabled ? t("aiEnabled") : t("aiDisabled")}</p></div></div>{enabled ? <Button type="button" size="sm" disabled={analyse.isPending} onClick={() => analyse.mutate({ organisationId: scope.organisationId, exceptionId, idempotencyKey: idempotencyKey() })} className="rounded-xl bg-violet-700 text-xs font-bold hover:bg-violet-800"><Sparkles className="mr-1.5 size-3.5" />{analyse.isPending ? t("analysing") : t("requestAnalysis")}</Button> : isOwner ? <Button type="button" size="sm" variant="outline" onClick={() => setShowNotice(value => !value)} className="rounded-xl border-amber-300 bg-white text-xs font-bold text-amber-900"><Bot className="mr-1.5 size-3.5" />{t("reviewNotice")}</Button> : null}</div>
    <div className="border-t border-inherit px-4 py-3 text-xs leading-5"><p className="font-bold text-slate-800">{t("aiProposalOnly")}</p>{!enabled ? <p className="mt-1 text-amber-900">{t("aiOwnerOnly")}</p> : <p className="mt-1 text-slate-600">{t("notAction")}</p>}<details className="mt-2 rounded-xl bg-white/70 px-3 py-2"><summary className="cursor-pointer font-bold text-slate-700">{t("reviewNotice")}</summary><p className="pt-2 text-slate-600">{t("aiProcessingNotice")}</p></details></div>
    {showNotice && isOwner ? <div className="border-t border-amber-200 bg-white/70 p-4"><label className="flex cursor-pointer items-start gap-3 text-xs leading-5 text-slate-700"><Checkbox checked={accepted} onCheckedChange={value => setAccepted(value === true)} className="mt-0.5" /><span>{t("aiEnableNotice")}</span></label><div className="mt-3 flex flex-wrap gap-2"><Button type="button" size="sm" disabled={!accepted || configure.isPending} onClick={() => configure.mutate({ ...scope, enabled: true, acceptProcessingNotice: true, idempotencyKey: idempotencyKey() })} className="rounded-xl bg-violet-700 text-xs font-bold hover:bg-violet-800">{t("enableAssistance")}</Button><Button type="button" size="sm" variant="outline" className="rounded-xl text-xs" onClick={() => setShowNotice(false)}>Cancel</Button></div></div> : null}
    {enabled && isOwner ? <div className="border-t border-violet-200 bg-white/65 px-4 py-3"><Button type="button" size="sm" variant="outline" disabled={configure.isPending} onClick={() => configure.mutate({ ...scope, enabled: false, acceptProcessingNotice: false, idempotencyKey: idempotencyKey() })} className="h-8 rounded-lg border-violet-200 bg-white text-xs text-violet-900">{t("disableAssistance")}</Button></div> : null}
    <div className="border-t border-inherit bg-white/55 p-4"><div className="flex items-center justify-between gap-3"><p className="text-xs font-extrabold text-slate-800">{t("recentSuggestions")}</p>{latest ? <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-violet-800">{t("confidence")}: {latest.confidence}</span> : null}</div>{suggestions.isLoading ? <div className="mt-3 h-16 animate-pulse rounded-xl bg-slate-100" /> : !latest ? <p className="mt-2 text-xs text-muted-foreground">{t("noSuggestions")}</p> : <div className="mt-3 space-y-3 text-xs"><p className="rounded-xl bg-violet-50 p-3 leading-5 text-violet-950">{latest.proposal.summary}</p>{latest.proposal.potentialCauses?.length ? <div><p className="font-extrabold text-slate-800">{t("potentialCauses")}</p><div className="mt-2 space-y-2">{latest.proposal.potentialCauses.map((cause, index) => <div key={`${cause.label}-${index}`} className="rounded-xl border bg-white p-3"><div className="flex items-start justify-between gap-2"><p className="font-bold text-slate-800">{cause.label}</p><span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">{cause.confidence}</span></div><p className="mt-1 leading-5 text-slate-600">{cause.rationale}</p></div>)}</div></div> : null}{latest.proposal.possibleMatches?.length ? <div><p className="font-extrabold text-slate-800">{t("possibleMatches")}</p><div className="mt-2 space-y-2">{latest.proposal.possibleMatches.map((match, index) => { const candidate = snapshots.get(match.candidateKey); return <div key={`${match.candidateKey}-${index}`} className="rounded-xl border bg-white p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-bold text-slate-800">{candidate ? `${candidate.kind}: ${candidate.reference}` : match.candidateKey}</p><span className="text-[10px] uppercase tracking-wide text-muted-foreground">{match.confidence}</span></div>{candidate ? <p className="mt-1 text-[11px] text-muted-foreground">{formatMoney(candidate.amountMinor, candidate.currency)} · {candidate.status}{candidate.sourceName ? ` · ${candidate.sourceName}` : ""}</p> : null}<p className="mt-1 leading-5 text-slate-600">{match.rationale}</p></div>; })}</div></div> : <p className="text-muted-foreground">{t("noCandidateMatch")}</p>}{latest.proposal.reviewSteps?.length ? <div><p className="font-extrabold text-slate-800">{t("reviewSteps")}</p><ol className="mt-2 list-decimal space-y-1 pl-5 leading-5 text-slate-600">{latest.proposal.reviewSteps.map((step, index) => <li key={`${step}-${index}`}>{step}</li>)}</ol></div> : null}<div className="flex flex-wrap gap-x-4 gap-y-1 border-t pt-2 text-[10px] text-muted-foreground"><span>{t("model")}: {latest.model}</span><span>{t("generated")}: {new Date(latest.createdAt).toLocaleString()}</span></div><p className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-2 py-1.5 text-[11px] font-bold text-amber-900"><CheckCircle2 className="size-3.5" />{t("aiProposalOnly")}</p></div>}</div>
  </section>;
}
