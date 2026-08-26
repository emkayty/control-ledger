import { EmptyState } from "@/components/EmptyState";
import { StatusPill } from "@/components/StatusPill";
import { OPayProposal, ReceiptPreviewButton, ReceiptProposalCard } from "@/components/ReceiptProposalCard";
import { ReceiptExtractionPolicyCard } from "@/components/ReceiptExtractionPolicyCard";
import { VarianceCaseWorkflow } from "@/components/VarianceCaseWorkflow";
import { evidenceProposalDefaults } from "@/lib/evidenceProposal";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useControlScope } from "@/contexts/ControlScopeContext";
import { formatMoney } from "@/lib/control";
import { canExtractOpayReceipt, isImageReceipt } from "@/lib/receiptView";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  FilePlus2,
  FileText,
  FolderUp,
  Image,
  Link2,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  UsersRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

function PageHeading({
  eyebrow,
  title,
  copy,
  action,
}: {
  eyebrow: string;
  title: string;
  copy: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[0.15em] text-teal-700">{eyebrow}</p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{copy}</p>
      </div>
      {action}
    </div>
  );
}

function QueryFeedback({ loading, message, onRetry }: { loading?: boolean; message: string; onRetry?: () => void }) {
  return (
    <section className="soft-card rounded-3xl border bg-card px-6 py-12 text-center">
      <p className={`text-sm font-extrabold ${loading ? "text-slate-700" : "text-rose-700"}`}>{loading ? "Loading scoped records…" : "This control view needs attention"}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{message}</p>
      {onRetry ? <Button variant="outline" className="mt-5 rounded-xl" onClick={onRetry}>Try again</Button> : null}
    </section>
  );
}

const makeKey = () => crypto.randomUUID();

const readAsBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("The selected file could not be read."));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });

function FileLink({ fileId }: { fileId: string }) {
  const scope = useControlScope();
  const query = trpc.control.evidence.getFile.useQuery(
    { organisationId: scope.organisationId, fileId },
    { enabled: false },
  );

  return (
    <button
      className="inline-flex items-center gap-1.5 text-xs font-extrabold text-teal-700 hover:text-teal-800"
      onClick={async () => {
        const result = await query.refetch();
        if (result.data?.url) window.open(result.data.url, "_blank", "noopener,noreferrer");
        else toast.error("Evidence file is unavailable.");
      }}
    >
      <FileText className="size-3.5" /> Open file
    </button>
  );
}

function ReceiptPreviewAndExtract({ file, onUseProposal }: { file: { id: string; contentType: string; originalName: string }; onUseProposal: (proposal: OPayProposal) => void }) {
  const scope = useControlScope();
  const utils = trpc.useUtils();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [processingAccepted, setProcessingAccepted] = useState(false);
  const fileQuery = trpc.control.evidence.getFile.useQuery({ organisationId: scope.organisationId, fileId: file.id }, { enabled: false });
  const proposals = trpc.control.evidence.extractionProposals.useQuery({ organisationId: scope.organisationId, fileId: file.id });
  const policy = trpc.control.receiptExtractionPolicy.get.useQuery({ organisationId: scope.organisationId });
  const configurePolicy = trpc.control.receiptExtractionPolicy.configure.useMutation({
    onSuccess: () => {
      toast.success("Receipt extraction is enabled for this organisation. Every proposal still requires human review.");
      setPolicyOpen(false);
      setProcessingAccepted(false);
      policy.refetch();
    },
    onError: error => toast.error(error.message),
  });
  const extract = trpc.control.evidence.extractOpayReceipt.useMutation({
    onSuccess: () => {
      toast.success("OPay fields were proposed for review; no evidence was created or changed.");
      utils.control.evidence.extractionProposals.invalidate({ organisationId: scope.organisationId, fileId: file.id });
    },
    onError: error => toast.error(error.message),
  });
  const latest = proposals.data?.[0]?.proposal as OPayProposal | undefined;
  const preview = async () => {
    const result = await fileQuery.refetch();
    if (result.data?.url) setPreviewUrl(result.data.url);
    else toast.error("Secure receipt preview is unavailable.");
  };
  const isImage = isImageReceipt(file.contentType);
  const canExtract = canExtractOpayReceipt(file.contentType);
  const extractionEnabled = policy.data?.enabled === true;
  const acceptanceDetail = policy.data?.acceptedAt ? `${new Date(policy.data.acceptedAt).toLocaleString()}${policy.data.acceptedBy ? ` by ${policy.data.acceptedBy}` : ""}` : "No owner acceptance recorded.";
  return <div className="mt-3 flex flex-wrap items-center gap-2"><ReceiptPreviewButton onPreview={preview} />{canExtract && extractionEnabled ? <Button type="button" size="sm" variant="outline" disabled={extract.isPending} onClick={() => extract.mutate({ organisationId: scope.organisationId, fileId: file.id, idempotencyKey: makeKey() })} className="h-8 rounded-lg border-violet-200 text-xs text-violet-800 hover:bg-violet-50"><Sparkles className="mr-1.5 size-3.5" />{extract.isPending ? "Reading receipt…" : "Extract OPay fields"}</Button> : null}{canExtract ? <ReceiptExtractionPolicyCard enabled={extractionEnabled} acceptedAt={policy.data?.acceptedAt} acceptedBy={policy.data?.acceptedBy} isOwner={scope.role === "owner"} onManage={() => setPolicyOpen(true)} /> : null}{latest ? <ReceiptProposalCard proposal={latest} onReview={() => onUseProposal(latest)} /> : null}<Dialog open={policyOpen} onOpenChange={setPolicyOpen}><DialogContent><DialogHeader><DialogTitle>{extractionEnabled ? "Manage OPay receipt extraction" : "Enable OPay receipt extraction"}</DialogTitle><DialogDescription>This feature sends an authorised receipt image to the configured extraction processor to create a human-reviewed proposal. It does not record evidence, reconcile a payment, approve a variance, or confirm settlement. The extraction flow stores no raw image bytes in the control database; the original evidence file, proposal, and audit record remain under your organisation’s evidence-retention responsibility.</DialogDescription></DialogHeader>{extractionEnabled ? <><p className="rounded-xl border bg-emerald-50 p-3 text-sm leading-5 text-emerald-950">Currently enabled. Policy acceptance: {acceptanceDetail}</p><Button variant="outline" disabled={configurePolicy.isPending} onClick={() => configurePolicy.mutate({ organisationId: scope.organisationId, enabled: false, acceptProcessingNotice: false })} className="rounded-xl border-rose-200 text-rose-700 hover:bg-rose-50">{configurePolicy.isPending ? "Updating…" : "Disable controlled extraction"}</Button></> : <><label className="flex gap-3 rounded-xl border bg-amber-50 p-3 text-sm leading-5 text-amber-950"><input type="checkbox" checked={processingAccepted} onChange={event => setProcessingAccepted(event.target.checked)} className="mt-1 size-4" /><span>I confirm that my organisation is authorised to process this receipt data with the configured extraction processor, understands the stated retention boundary, and will review every proposal before recording it.</span></label><Button disabled={!processingAccepted || configurePolicy.isPending} onClick={() => configurePolicy.mutate({ organisationId: scope.organisationId, enabled: true, acceptProcessingNotice: true })} className="rounded-xl bg-teal-700 hover:bg-teal-800">{configurePolicy.isPending ? "Enabling…" : "Enable controlled extraction"}</Button></>}</DialogContent></Dialog><Dialog open={Boolean(previewUrl)} onOpenChange={open => { if (!open) setPreviewUrl(null); }}><DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>Controlled receipt preview</DialogTitle><DialogDescription>{file.originalName}. This preview uses an authorised, time-limited file retrieval link.</DialogDescription></DialogHeader>{previewUrl ? (isImage ? <img src={previewUrl} alt={`Preview of ${file.originalName}`} className="max-h-[70vh] w-full rounded-xl border object-contain" /> : <iframe src={previewUrl} title={`Preview of ${file.originalName}`} className="h-[70vh] w-full rounded-xl border" />) : null}</DialogContent></Dialog></div>;
}

function ReconcileButton({
  obligationId,
  evidenceEventId,
  controlStatus,
}: {
  obligationId?: string | null;
  evidenceEventId: string;
  controlStatus: string;
}) {
  const scope = useControlScope();
  const utils = trpc.useUtils();
  const reconcile = trpc.control.reconciliation.run.useMutation({
    onSuccess: () => {
      toast.success("Reconciliation outcome recorded.");
      utils.control.evidence.list.invalidate(scope);
      utils.control.exceptions.list.invalidate(scope);
      utils.control.dashboard.invalidate(scope);
    },
    onError: error => toast.error(error.message),
  });

  if (!obligationId) {
    return <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">Unlinked evidence</span>;
  }
  if (controlStatus !== "recorded") {
    return <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">Match outcome retained</span>;
  }

  const run = (treatAsShort: boolean) =>
    reconcile.mutate({ ...scope, obligationId, evidenceEventId, treatAsShort, idempotencyKey: makeKey() });

  return (
    <div className="flex items-center gap-1.5">
      <Button size="sm" variant="outline" disabled={reconcile.isPending} onClick={() => run(false)} className="h-8 rounded-lg px-2.5 text-xs font-extrabold">
        <Link2 className="mr-1.5 size-3.5" />{reconcile.isPending ? "Matching…" : "Run match"}
      </Button>
      <Button size="sm" variant="ghost" disabled={reconcile.isPending} onClick={() => run(true)} className="h-8 rounded-lg px-2 text-[10px] font-extrabold text-rose-700 hover:bg-rose-50 hover:text-rose-800">
        Mark short
      </Button>
    </div>
  );
}

function CustomerDialog() {
  const scope = useControlScope();
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const createCustomer = trpc.control.customers.create.useMutation({
    onSuccess: () => {
      toast.success("Customer recorded.");
      setOpen(false);
      utils.control.customers.list.invalidate(scope);
    },
    onError: error => toast.error(error.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-xl"><UsersRound className="mr-2 size-4" />Customer</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add customer</DialogTitle>
          <DialogDescription>Create a branch-scoped party before recording an obligation.</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={event => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            createCustomer.mutate({
              ...scope,
              name: String(data.get("name")),
              code: String(data.get("code")),
              contactName: String(data.get("contactName") || "") || undefined,
              contactEmail: String(data.get("contactEmail") || "") || undefined,
              idempotencyKey: makeKey(),
            });
          }}
        >
          <Input name="name" required minLength={2} placeholder="Customer name" />
          <Input name="code" required placeholder="Customer code" />
          <Input name="contactName" placeholder="Contact name (optional)" />
          <Input name="contactEmail" type="email" placeholder="Contact email (optional)" />
          <Button disabled={createCustomer.isPending} className="rounded-xl bg-teal-700 hover:bg-teal-800">Record customer</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ObligationDialog() {
  const scope = useControlScope();
  const utils = trpc.useUtils();
  const customers = trpc.control.customers.list.useQuery(scope);
  const [open, setOpen] = useState(false);
  const createObligation = trpc.control.obligations.create.useMutation({
    onSuccess: () => {
      toast.success("Receivable obligation recorded.");
      setOpen(false);
      utils.control.obligations.list.invalidate(scope);
      utils.control.dashboard.invalidate(scope);
    },
    onError: error => toast.error(error.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-xl bg-teal-700 hover:bg-teal-800"><FilePlus2 className="mr-2 size-4" />New receivable</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record receivable obligation</DialogTitle>
          <DialogDescription>For NGN, ₦5,000.00 is entered as the exact minor-unit value 500000.</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={event => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            createObligation.mutate({
              ...scope,
              customerId: String(data.get("customerId")),
              reference: String(data.get("reference")),
              amountMinor: String(data.get("amountMinor")),
              currency: String(data.get("currency")),
              dueAt: data.get("dueAt") ? new Date(String(data.get("dueAt"))) : undefined,
              idempotencyKey: makeKey(),
            });
          }}
        >
          <select required name="customerId" className="h-10 rounded-xl border bg-white px-3 text-sm" defaultValue="">
            <option value="" disabled>Select customer</option>
            {customers.data?.map(customer => <option key={customer.id} value={customer.id}>{customer.name} · {customer.code}</option>)}
          </select>
          <Input name="reference" required placeholder="Invoice / obligation reference" />
          <Input name="amountMinor" required inputMode="numeric" placeholder="Exact minor units, e.g. 500000" />
          <Input name="currency" required defaultValue="NGN" maxLength={3} />
          <Input name="dueAt" type="date" />
          <Button disabled={createObligation.isPending} className="rounded-xl bg-teal-700 hover:bg-teal-800">Record immutable obligation</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ReceivablesPage() {
  const scope = useControlScope();
  const obligations = trpc.control.obligations.list.useQuery(scope);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeading
        eyebrow="Commercial expectation"
        title="Receivables"
        copy="Record what should be collected. Amounts use exact minor units and every record carries a source, actor, and correlation trail."
        action={<div className="flex gap-2"><CustomerDialog /><ObligationDialog /></div>}
      />
      {obligations.isLoading ? <QueryFeedback loading message="Retrieving receivable obligations for this branch." /> : obligations.isError ? <QueryFeedback message={obligations.error.message} onRetry={() => obligations.refetch()} /> : !obligations.data?.length ? (
        <EmptyState icon={ReceiptText} title="No receivables in this branch" copy="First create a customer, then record the commercial obligation that should be collected." />
      ) : (
        <section className="soft-card overflow-hidden rounded-3xl border bg-card">
          <div className="divide-y sm:hidden">
            {obligations.data?.map(item => (
              <article key={item.id} className="p-4">
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-extrabold">{item.reference}</p><p className="mt-1 text-xs text-muted-foreground">{item.sourceType}{item.correctsObligationId ? " · correction" : ""}</p></div><StatusPill status={item.status} /></div>
                <div className="mt-4 grid grid-cols-2 gap-3 border-t pt-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">Amount</p><p className="money mt-1 text-sm font-medium">{formatMoney(String(item.amountMinor), item.currency)}</p></div><div><p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">Due date</p><p className="mt-1 text-sm font-semibold">{item.dueAt ? new Date(item.dueAt).toLocaleDateString() : "Not set"}</p></div></div>
                <p className="mt-3 font-mono text-[10px] text-muted-foreground">{item.correlationId.slice(0, 12)}…</p>
              </article>
            ))}
          </div>
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[680px] text-left">
              <thead className="border-b bg-slate-50/70 text-[10px] font-extrabold uppercase tracking-[0.13em] text-muted-foreground">
                <tr><th className="px-5 py-3">Reference</th><th className="px-5 py-3">Amount</th><th className="px-5 py-3">Due date</th><th className="px-5 py-3">State</th><th className="px-5 py-3">Provenance</th></tr>
              </thead>
              <tbody className="divide-y">
                {obligations.data?.map(item => (
                  <tr key={item.id} className="text-sm">
                    <td className="px-5 py-4 font-extrabold">{item.reference}<p className="mt-1 text-xs font-medium text-muted-foreground">{item.sourceType}{item.correctsObligationId ? " · correction" : ""}</p></td>
                    <td className="money px-5 py-4 font-medium">{formatMoney(String(item.amountMinor), item.currency)}</td>
                    <td className="px-5 py-4 text-muted-foreground">{item.dueAt ? new Date(item.dueAt).toLocaleDateString() : "Not set"}</td>
                    <td className="px-5 py-4"><StatusPill status={item.status} /></td>
                    <td className="px-5 py-4 font-mono text-xs text-muted-foreground">{item.correlationId.slice(0, 10)}…</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function EvidenceRecordDialog({ proposal }: { proposal: OPayProposal | null }) {
  const scope = useControlScope();
  const utils = trpc.useUtils();
  const obligations = trpc.control.obligations.list.useQuery(scope);
  const [open, setOpen] = useState(false);
  const defaults = evidenceProposalDefaults(proposal);
  useEffect(() => { if (proposal) setOpen(true); }, [proposal]);
  const intake = trpc.control.evidence.intake.useMutation({
    onSuccess: response => {
      if ("status" in response && response.status === "duplicate") toast.message("This source reference is already protected as a duplicate.");
      else if ("status" in response && response.status === "quarantined") toast.warning("The intake was quarantined for review; no evidence record was created.");
      else toast.success("Evidence recorded with source provenance.");
      setOpen(false);
      utils.control.evidence.list.invalidate(scope);
      utils.control.dashboard.invalidate(scope);
    },
    onError: error => toast.error(error.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-xl bg-teal-700 hover:bg-teal-800"><FolderUp className="mr-2 size-4" />Record evidence</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record independent evidence</DialogTitle>
          <DialogDescription>{proposal ? "Review every OPay proposal before recording. It is not proof of settlement and no evidence exists until you submit this form." : "The source reference protects the evidence trail from silent duplication. Do not place card, credential, or identity-document content in metadata."}</DialogDescription>
        </DialogHeader>
        <form key={proposal?.sourceReference ?? "manual"} className="grid gap-4" onSubmit={event => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          intake.mutate({
            ...scope,
            kind: String(data.get("kind")) as "delivery_observation" | "payment_observation" | "settlement_evidence",
            obligationId: String(data.get("obligationId") || "") || undefined,
            amountMinor: String(data.get("amountMinor")),
            currency: String(data.get("currency")),
            sourceName: String(data.get("sourceName")),
            sourceReference: String(data.get("sourceReference")),
            occurredAt: data.get("occurredAt") ? new Date(String(data.get("occurredAt"))) : undefined,
            idempotencyKey: makeKey(),
          });
        }}>
          <select name="kind" className="h-10 rounded-xl border bg-white px-3 text-sm" defaultValue={defaults.kind}><option value="payment_observation">Payment observation</option><option value="settlement_evidence">Settlement evidence</option><option value="delivery_observation">Delivery observation</option></select>
          <select name="obligationId" className="h-10 rounded-xl border bg-white px-3 text-sm" defaultValue=""><option value="">Unlinked evidence</option>{obligations.data?.map(item => <option key={item.id} value={item.id}>{item.reference}</option>)}</select>
          <Input name="amountMinor" required inputMode="numeric" defaultValue={defaults.amountMinor} placeholder="Exact minor units, e.g. 500000" />
          <Input name="currency" required defaultValue={defaults.currency} maxLength={3} />
          <Input name="sourceName" required defaultValue={defaults.sourceName} placeholder="Source name, e.g. bank_import" />
          <Input name="sourceReference" required defaultValue={defaults.sourceReference} placeholder="Stable external reference" />
          <Input name="occurredAt" type="datetime-local" defaultValue={defaults.occurredAt} />
          <Button disabled={intake.isPending} className="rounded-xl bg-teal-700 hover:bg-teal-800">Record evidence</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EvidenceUploadDialog() {
  const scope = useControlScope();
  const utils = trpc.useUtils();
  const evidence = trpc.control.evidence.list.useQuery(scope);
  const [open, setOpen] = useState(false);
  const upload = trpc.control.evidence.uploadFile.useMutation({
    onSuccess: () => {
      toast.success("Evidence file stored securely.");
      setOpen(false);
      utils.control.evidence.files.invalidate(scope);
    },
    onError: error => toast.error(error.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-xl"><UploadCloud className="mr-2 size-4" />Upload file</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Attach receipt, invoice, or delivery proof</DialogTitle>
          <DialogDescription>Use PDF, JPG, PNG, or WebP under 8 MB. The managed storage object is linked only after organisation and branch ownership are verified.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={async event => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const selected = data.get("file");
          if (!(selected instanceof File) || !selected.size) return toast.error("Select a receipt, invoice, or delivery-evidence file.");
          try {
            upload.mutate({
              ...scope,
              evidenceEventId: String(data.get("evidenceEventId") || "") || undefined,
              filename: selected.name,
              contentType: selected.type as "application/pdf" | "image/jpeg" | "image/png" | "image/webp",
              contentBase64: await readAsBase64(selected),
              idempotencyKey: makeKey(),
            });
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "The file could not be prepared.");
          }
        }}>
          <select name="evidenceEventId" className="h-10 rounded-xl border bg-white px-3 text-sm" defaultValue=""><option value="">Unlinked supporting evidence</option>{evidence.data?.map(item => <option key={item.id} value={item.id}>{item.sourceReference ?? item.id.slice(0, 8)} · {item.kind.replaceAll("_", " ")}</option>)}</select>
          <Input name="file" type="file" accept="application/pdf,image/png,image/jpeg,image/webp" required />
          <Button disabled={upload.isPending} className="rounded-xl bg-teal-700 hover:bg-teal-800">{upload.isPending ? "Encrypting & storing…" : "Store evidence file"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EvidenceGovernanceDialog({ files }: { files: Array<{ id: string; originalName: string }> }) {
  const scope = useControlScope();
  const [open, setOpen] = useState(false);
  const remediation = trpc.release2.evidenceGovernance.recordStorageRemediation.useMutation({ onSuccess: () => { toast.success("Provider-remediation register entry recorded. This does not itself revoke or rotate any stored object."); setOpen(false); }, onError: error => toast.error(error.message) });
  const retention = trpc.release2.evidenceGovernance.recordRetentionReview.useMutation({ onSuccess: () => { toast.success("Evidence retention review recorded."); setOpen(false); }, onError: error => toast.error(error.message) });
  if (scope.role !== "owner" || !files.length) return null;
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button variant="outline" className="rounded-xl"><ShieldCheck className="mr-2 size-4" />Evidence governance</Button></DialogTrigger><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Evidence governance register</DialogTitle><DialogDescription>Record a provider-remediation request or evidence-retention review. These are append-only governance records; they do not assert that a hosting provider has physically revoked, deleted, or rotated an object without external confirmation.</DialogDescription></DialogHeader><div className="grid gap-6"><form className="grid gap-3 rounded-2xl border bg-slate-50 p-4" onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); remediation.mutate({ ...scope, evidenceFileId: String(data.get("fileId")), status: String(data.get("status")) as "identified" | "provider_requested" | "provider_confirmed", providerReference: String(data.get("providerReference") || "") || undefined, note: String(data.get("note")), idempotencyKey: makeKey() }); }}><div><p className="text-sm font-extrabold">Provider remediation</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Use provider-confirmed only when you have a provider reference.</p></div><select name="fileId" required className="h-10 rounded-xl border bg-white px-3 text-sm"><option value="" disabled>Select evidence file</option>{files.map(file => <option key={file.id} value={file.id}>{file.originalName}</option>)}</select><select name="status" required className="h-10 rounded-xl border bg-white px-3 text-sm"><option value="identified">Identified</option><option value="provider_requested">Provider request submitted</option><option value="provider_confirmed">Provider confirmation received</option></select><Input name="providerReference" placeholder="Provider ticket / confirmation reference" /><textarea name="note" required minLength={4} className="min-h-24 rounded-xl border bg-white p-3 text-sm" placeholder="What was requested or confirmed" /><Button disabled={remediation.isPending} className="rounded-xl bg-teal-700 hover:bg-teal-800">{remediation.isPending ? "Recording…" : "Record provider status"}</Button></form><form className="grid gap-3 rounded-2xl border bg-slate-50 p-4" onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); retention.mutate({ ...scope, evidenceFileId: String(data.get("fileId")), reviewStatus: String(data.get("reviewStatus")) as "retained" | "review_due" | "legal_hold", retentionUntil: data.get("retentionUntil") ? new Date(String(data.get("retentionUntil"))) : undefined, note: String(data.get("note")), idempotencyKey: makeKey() }); }}><div><p className="text-sm font-extrabold">Retention review</p><p className="mt-1 text-xs leading-5 text-muted-foreground">This preserves the review decision and its basis; it never removes the evidence file.</p></div><select name="fileId" required className="h-10 rounded-xl border bg-white px-3 text-sm"><option value="" disabled>Select evidence file</option>{files.map(file => <option key={file.id} value={file.id}>{file.originalName}</option>)}</select><select name="reviewStatus" required className="h-10 rounded-xl border bg-white px-3 text-sm"><option value="retained">Retained</option><option value="review_due">Review due</option><option value="legal_hold">Legal hold</option></select><Input name="retentionUntil" type="date" /><textarea name="note" required minLength={4} className="min-h-24 rounded-xl border bg-white p-3 text-sm" placeholder="Retention basis / review note" /><Button disabled={retention.isPending} variant="outline" className="rounded-xl">{retention.isPending ? "Recording…" : "Record retention review"}</Button></form></div></DialogContent></Dialog>;
}

export function EvidencePage() {
  const scope = useControlScope();
  const evidence = trpc.control.evidence.list.useQuery(scope);
  const files = trpc.control.evidence.files.useQuery(scope);
  const [proposal, setProposal] = useState<OPayProposal | null>(null);
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeading
        eyebrow="Independent observation"
        title="Evidence intake"
        copy="Record delivery, payment, and settlement evidence with source references. Uploads stay in managed object storage; only secure metadata is retained in control records."
        action={<div className="flex flex-wrap gap-2"><EvidenceGovernanceDialog files={files.data ?? []} /><EvidenceUploadDialog /><EvidenceRecordDialog proposal={proposal} /></div>}
      />
      {evidence.isLoading ? <QueryFeedback loading message="Retrieving recorded evidence and derived control states." /> : evidence.isError ? <QueryFeedback message={evidence.error.message} onRetry={() => evidence.refetch()} /> : !evidence.data?.length ? (
        <EmptyState icon={FolderUp} title="No evidence received yet" copy="Payment, delivery, and independent settlement evidence will appear here with their source provenance and control state." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {evidence.data?.map(item => (
            <article key={item.id} className="soft-card rounded-3xl border bg-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div><p className="text-sm font-extrabold">{item.kind.replaceAll("_", " ")}</p><p className="mt-1 font-mono text-xs text-muted-foreground">{item.sourceName} · {item.sourceReference ?? "unreferenced"}</p></div>
                <StatusPill status={item.controlStatus} />
              </div>
              <div className="mt-6 flex items-end justify-between gap-3">
                <div><p className="money text-xl font-medium">{item.amountMinor ? formatMoney(String(item.amountMinor), item.currency ?? "NGN") : "No monetary value"}</p><p className="mt-1 text-xs text-muted-foreground">Recorded {new Date(item.recordedAt).toLocaleString()}</p></div>
                <ReconcileButton obligationId={item.obligationId} evidenceEventId={item.id} controlStatus={item.controlStatus} />
              </div>
              <p className="mt-3 font-mono text-[10px] text-muted-foreground">{item.correlationId.slice(0, 12)}…</p>
            </article>
          ))}
        </div>
      )}
      {files.isError ? <QueryFeedback message={files.error.message} onRetry={() => files.refetch()} /> : files.data?.length ? (
        <section className="soft-card rounded-3xl border bg-card">
          <div className="border-b px-5 py-4"><p className="text-sm font-extrabold">Stored evidence files</p><p className="mt-1 text-xs text-muted-foreground">Authorised metadata and retrieval only.</p></div>
          <div className="divide-y">{files.data.map(file => <div key={file.id} className="px-5 py-4"><div className="flex items-center justify-between gap-4"><div className="flex min-w-0 items-center gap-3"><div className="grid size-9 shrink-0 place-items-center rounded-xl bg-sky-50 text-sky-700">{file.contentType.startsWith("image/") ? <Image className="size-4" /> : <FileText className="size-4" />}</div><div className="min-w-0"><p className="truncate text-sm font-extrabold">{file.originalName}</p><p className="mt-1 text-xs text-muted-foreground">{file.contentType} · {(file.sizeBytes / 1024).toFixed(0)} KB · {new Date(file.createdAt).toLocaleDateString()}</p></div></div><FileLink fileId={file.id} /></div><ReceiptPreviewAndExtract file={file} onUseProposal={setProposal} /></div>)}</div>
        </section>
      ) : null}
    </div>
  );
}

export function ExceptionsPage() {
  const scope = useControlScope();
  const exceptions = trpc.control.exceptions.list.useQuery(scope);
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeading eyebrow="Accountable action" title="Exceptions" copy="Discrepancies retain their value impact, evidence link, owner, due date, and approval-aware resolution history. A closed item is never silently erased." />
      {exceptions.isLoading ? <QueryFeedback loading message="Retrieving accountable exception work for this branch." /> : exceptions.isError ? <QueryFeedback message={exceptions.error.message} onRetry={() => exceptions.refetch()} /> : !exceptions.data?.length ? (
        <EmptyState icon={AlertTriangle} title="No unresolved control work" copy="Exact, partial, delayed, duplicate, and unmatched reconciliation outcomes will create accountable exception records here." />
      ) : (
        <div className="grid gap-4">
          {exceptions.data?.map(item => (
            <article key={item.id} className="soft-card rounded-3xl border bg-card p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex gap-4"><div className={`grid size-10 shrink-0 place-items-center rounded-xl ${item.severity === "critical" || item.severity === "high" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}><AlertTriangle className="size-5" /></div><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-extrabold">{item.title}</h2><StatusPill status={item.status} /></div><p className="mt-2 text-xs leading-5 text-muted-foreground">{item.type.replaceAll("_", " ")} · {item.dueAt ? `due ${new Date(item.dueAt).toLocaleString()}` : "due date not set"} · severity {item.severity}</p>{item.resolutionNote ? <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-700">{item.resolutionNote}</p> : null}</div></div>
                <div className="sm:text-right"><p className="money text-base font-medium">{formatMoney(item.valueImpactMinor, item.currency ?? "NGN")}</p><p className="mt-1 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">value impact</p></div>
              </div>
              <VarianceCaseWorkflow exception={item} />
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
