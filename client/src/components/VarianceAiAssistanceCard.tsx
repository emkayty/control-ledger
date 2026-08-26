import { useState } from "react";
import { BrainCircuit, CheckCircle2, LockKeyhole, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useControlScope } from "@/contexts/ControlScopeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatMoney } from "@/lib/control";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

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
    candidateSnapshot?: Array<{ candidateKey: string; kind: string; reference: string; status: string; amountMinor: string; currency: string }>;
  };
};

const activationPhrase = "ENABLE VARIANCE AI";

export function VarianceAiAssistanceCard({ exceptionId }: { exceptionId: string }) {
  const scope = useControlScope();
  const { t } = useLanguage();
  const utils = trpc.useUtils();
  const policy = trpc.varianceAi.policy.get.useQuery(scope);
  const suggestions = trpc.varianceAi.suggestions.list.useQuery({ organisationId: scope.organisationId, exceptionId });
  const [showActivation, setShowActivation] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const isOwner = scope.role === "owner";
  const enabled = policy.data?.enabled === true;
  const latest = (suggestions.data?.[0] as Suggestion | undefined) ?? null;
  const snapshots = new Map((latest?.proposal.candidateSnapshot ?? []).map(candidate => [candidate.candidateKey, candidate]));
  const idempotencyKey = () => crypto.randomUUID();
  const resetActivation = () => { setShowActivation(false); setAccepted(false); setConfirmation(""); };
  const configure = trpc.varianceAi.policy.configure.useMutation({
    onSuccess: () => { toast.success("Variance AI policy updated."); resetActivation(); policy.refetch(); },
    onError: error => toast.error(error.message),
  });
  const analyse = trpc.varianceAi.suggestions.analyse.useMutation({
    onSuccess: () => { toast.success("AI suggestion saved for review."); utils.varianceAi.suggestions.list.invalidate({ organisationId: scope.organisationId, exceptionId }); },
    onError: error => toast.error(error.message),
  });

  const enableReady = accepted && confirmation.trim().toLocaleUpperCase() === activationPhrase;

  return <section className={`mt-4 overflow-hidden rounded-2xl border ${enabled ? "border-violet-200 bg-violet-50/45" : "border-amber-200 bg-amber-50/55"}`}>
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 gap-3"><div className={`grid size-10 shrink-0 place-items-center rounded-xl ${enabled ? "bg-violet-100 text-violet-800" : "bg-amber-100 text-amber-800"}`}>{enabled ? <BrainCircuit className="size-5" /> : <LockKeyhole className="size-5" />}</div><div><h3 className="text-sm font-extrabold text-slate-900">{t("aiAssistant")}</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">{enabled ? t("aiEnabled") : t("aiDisabled")}</p></div></div>
      {enabled ? <div className="flex flex-wrap gap-2"><Button type="button" size="sm" disabled={analyse.isPending} onClick={() => analyse.mutate({ organisationId: scope.organisationId, exceptionId, idempotencyKey: idempotencyKey() })} className="rounded-xl bg-violet-700 text-xs font-bold hover:bg-violet-800"><Sparkles className="mr-1.5 size-3.5" />{analyse.isPending ? t("analysing") : t("requestAnalysis")}</Button>{isOwner ? <Button type="button" size="sm" variant="ghost" disabled={configure.isPending} onClick={() => configure.mutate({ organisationId: scope.organisationId, branchId: scope.branchId, enabled: false, acceptProcessingNotice: false, confirmation: "", idempotencyKey: idempotencyKey() })} className="rounded-xl text-xs text-violet-900 hover:bg-violet-100">{t("disableAssistance")}</Button> : null}</div> : isOwner ? <Button type="button" size="sm" variant="outline" onClick={() => setShowActivation(value => !value)} className="rounded-xl border-amber-300 bg-white text-xs font-bold text-amber-950">{t("enableAssistance")}</Button> : null}
    </div>
    <div className="border-t border-inherit px-4 py-3 text-xs leading-5"><p className="font-bold text-slate-800">{t("aiProposalOnly")}</p><p className="mt-1 text-slate-600">{enabled ? t("aiUsageLimit") : isOwner ? t("aiFocus") : t("aiOwnerOnly")}</p></div>
    {showActivation && !enabled && isOwner ? <div className="border-t border-amber-200 bg-white/75 p-4"><p className="text-sm font-extrabold text-slate-900">{t("aiPrepareEnable")}</p><p className="mt-1 text-xs leading-5 text-slate-600">{t("aiProcessingNotice")}</p><details className="mt-3 text-xs"><summary className="cursor-pointer font-bold text-slate-800">{t("reviewNotice")}</summary><p className="pt-2 leading-5 text-slate-600">{t("aiEnableNotice")}</p></details><label className="mt-4 flex cursor-pointer items-start gap-3 text-xs leading-5 text-slate-700"><Checkbox checked={accepted} onCheckedChange={value => setAccepted(value === true)} className="mt-0.5" /><span>{t("aiAcknowledge")}</span></label><div className="mt-3"><label htmlFor="variance-ai-confirmation" className="text-xs font-bold text-slate-800">{t("aiConfirmPhrase")}</label><Input id="variance-ai-confirmation" value={confirmation} onChange={event => setConfirmation(event.target.value)} placeholder={activationPhrase} autoComplete="off" className="mt-1 h-9 rounded-lg bg-white font-mono text-xs" /></div><div className="mt-3 flex flex-wrap gap-2"><Button type="button" size="sm" disabled={!enableReady || configure.isPending} onClick={() => configure.mutate({ organisationId: scope.organisationId, branchId: scope.branchId, enabled: true, acceptProcessingNotice: true, confirmation, idempotencyKey: idempotencyKey() })} className="rounded-xl bg-violet-700 text-xs font-bold hover:bg-violet-800">{t("enableReviewOnly")}</Button><Button type="button" size="sm" variant="ghost" className="rounded-xl text-xs" onClick={resetActivation}>{t("cancel")}</Button></div></div> : null}
    {(suggestions.isLoading || latest) ? <div className="border-t border-inherit bg-white/60 p-4"><div className="flex items-center justify-between gap-3"><p className="text-xs font-extrabold text-slate-800">{t("recentSuggestions")}</p>{latest ? <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-violet-800">{t("confidence")}: {latest.confidence}</span> : null}</div>{suggestions.isLoading ? <div className="mt-3 h-16 animate-pulse rounded-xl bg-slate-100" /> : latest ? <div className="mt-3 space-y-3 text-xs"><p className="rounded-xl bg-violet-50 p-3 leading-5 text-violet-950">{latest.proposal.summary}</p>{latest.proposal.potentialCauses?.length ? <div><p className="font-extrabold text-slate-800">{t("potentialCauses")}</p><div className="mt-2 space-y-2">{latest.proposal.potentialCauses.map((cause, index) => <div key={`${cause.label}-${index}`} className="rounded-xl border bg-white p-3"><div className="flex items-start justify-between gap-2"><p className="font-bold text-slate-800">{cause.label}</p><span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">{cause.confidence}</span></div><p className="mt-1 leading-5 text-slate-600">{cause.rationale}</p></div>)}</div></div> : null}{latest.proposal.possibleMatches?.length ? <div><p className="font-extrabold text-slate-800">{t("possibleMatches")}</p><div className="mt-2 space-y-2">{latest.proposal.possibleMatches.map((match, index) => { const candidate = snapshots.get(match.candidateKey); return <div key={`${match.candidateKey}-${index}`} className="rounded-xl border bg-white p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-bold text-slate-800">{candidate ? `${candidate.kind}: ${candidate.reference}` : match.candidateKey}</p><span className="text-[10px] uppercase tracking-wide text-muted-foreground">{match.confidence}</span></div>{candidate ? <p className="mt-1 text-[11px] text-muted-foreground">{formatMoney(candidate.amountMinor, candidate.currency)} · {candidate.status}</p> : null}<p className="mt-1 leading-5 text-slate-600">{match.rationale}</p></div>; })}</div></div> : null}{latest.proposal.reviewSteps?.length ? <div><p className="font-extrabold text-slate-800">{t("reviewSteps")}</p><ol className="mt-2 list-decimal space-y-1 pl-5 leading-5 text-slate-600">{latest.proposal.reviewSteps.map((step, index) => <li key={`${step}-${index}`}>{step}</li>)}</ol></div> : null}<div className="flex flex-wrap gap-x-4 gap-y-1 border-t pt-2 text-[10px] text-muted-foreground"><span>{t("model")}: {latest.model}</span><span>{t("generated")}: {new Date(latest.createdAt).toLocaleString()}</span></div><p className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-2 py-1.5 text-[11px] font-bold text-amber-900"><CheckCircle2 className="size-3.5" />{t("aiProposalOnly")}</p></div> : null}</div> : null}
  </section>;
}
