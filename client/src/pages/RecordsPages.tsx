import { EmptyState } from "@/components/EmptyState";
import { StatusPill } from "@/components/StatusPill";
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
  CheckCircle2,
  Eye,
  FilePlus2,
  FileText,
  FolderUp,
  History,
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

type OPayProposal = {
  provider: "OPay";
  sourceReference: string | null;
  amountMinor: string | null;
  currency: string | null;
  occurredAtIso: string | null;
  confidence: "low" | "medium" | "high";
  notes: string;
};

const toDateTimeLocal = (value: string | null) => value ? (value.includes("Z") ? new Date(value).toISOString().slice(0, 16) : value.slice(0, 16)) : "";

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
  const fileQuery = trpc.control.evidence.getFile.useQuery({ organisationId: scope.organisationId, fileId: file.id }, { enabled: false });
  const proposals = trpc.control.evidence.extractionProposals.useQuery({ organisationId: scope.organisationId, fileId: file.id });
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
  return <div className="mt-3 flex flex-wrap items-center gap-2"><Button type="button" size="sm" variant="outline" onClick={preview} className="h-8 rounded-lg text-xs"><Eye className="mr-1.5 size-3.5" />Preview</Button>{canExtractOpayReceipt(file.contentType) ? <Button type="button" size="sm" variant="outline" disabled={extract.isPending} onClick={() => extract.mutate({ organisationId: scope.organisationId, fileId: file.id, idempotencyKey: makeKey() })} className="h-8 rounded-lg border-violet-200 text-xs text-violet-800 hover:bg-violet-50"><Sparkles className="mr-1.5 size-3.5" />{extract.isPending ? "Reading receipt…" : "Extract OPay fields"}</Button> : null}{latest ? <div className="w-full rounded-xl border border-violet-100 bg-violet-50/60 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-extrabold text-violet-900">OPay proposal · {latest.confidence} confidence</p><Button type="button" size="sm" onClick={() => onUseProposal(latest)} className="h-8 rounded-lg bg-violet-700 text-xs hover:bg-violet-800">Review in evidence form</Button></div><p className="mt-2 text-xs text-violet-950">{latest.amountMinor && latest.currency ? `${formatMoney(latest.amountMinor, latest.currency)} · ` : ""}{latest.sourceReference ?? "No reference read"}</p><p className="mt-1 text-[11px] leading-4 text-violet-800">{latest.notes} Confirm every field before recording; extraction is not proof of settlement.</p></div> : null}<Dialog open={Boolean(previewUrl)} onOpenChange={open => { if (!open) setPreviewUrl(null); }}><DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>Controlled receipt preview</DialogTitle><DialogDescription>{file.originalName}. This preview uses an authorised, time-limited file retrieval link.</DialogDescription></DialogHeader>{previewUrl ? (isImage ? <img src={previewUrl} alt={`Preview of ${file.originalName}`} className="max-h-[70vh] w-full rounded-xl border object-contain" /> : <iframe src={previewUrl} title={`Preview of ${file.originalName}`} className="h-[70vh] w-full rounded-xl border" />) : null}</DialogContent></Dialog></div>;
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
          <select name="kind" className="h-10 rounded-xl border bg-white px-3 text-sm" defaultValue="payment_observation"><option value="payment_observation">Payment observation</option><option value="settlement_evidence">Settlement evidence</option><option value="delivery_observation">Delivery observation</option></select>
          <select name="obligationId" className="h-10 rounded-xl border bg-white px-3 text-sm" defaultValue=""><option value="">Unlinked evidence</option>{obligations.data?.map(item => <option key={item.id} value={item.id}>{item.reference}</option>)}</select>
          <Input name="amountMinor" required inputMode="numeric" defaultValue={proposal?.amountMinor ?? ""} placeholder="Exact minor units, e.g. 500000" />
          <Input name="currency" required defaultValue={proposal?.currency ?? "NGN"} maxLength={3} />
          <Input name="sourceName" required defaultValue={proposal ? "OPay" : ""} placeholder="Source name, e.g. bank_import" />
          <Input name="sourceReference" required defaultValue={proposal?.sourceReference ?? ""} placeholder="Stable external reference" />
          <Input name="occurredAt" type="datetime-local" defaultValue={toDateTimeLocal(proposal?.occurredAtIso ?? null)} />
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
        action={<div className="flex gap-2"><EvidenceUploadDialog /><EvidenceRecordDialog proposal={proposal} /></div>}
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

function ExceptionResolutionControls({ exception }: { exception: { id: string; status: string; approvalRequired: number; createdByUserId: number } }) {
  const scope = useControlScope();
  const utils = trpc.useUtils();
  const [rationale, setRationale] = useState("");
  const submit = trpc.control.exceptions.submitResolution.useMutation({
    onSuccess: () => { toast.success("Resolution recorded."); utils.control.exceptions.list.invalidate(scope); utils.control.dashboard.invalidate(scope); },
    onError: error => toast.error(error.message),
  });
  const approve = trpc.control.exceptions.approveResolution.useMutation({
    onSuccess: result => { toast.success(result.status === "resolved" ? "Resolution approved." : "Exception returned for review."); utils.control.exceptions.list.invalidate(scope); utils.control.dashboard.invalidate(scope); },
    onError: error => toast.error(error.message),
  });
  if (["resolved", "rejected"].includes(exception.status)) return <div className="mt-5 flex items-center gap-2 border-t pt-4 text-xs font-bold text-emerald-700"><ShieldCheck className="size-4" />Resolution history retained in the audit trail.</div>;
  if (exception.status === "pending_approval" && ["owner", "controller", "approver"].includes(scope.role)) return <div className="mt-5 space-y-2 border-t pt-4"><p className="text-xs font-extrabold text-slate-700">Independent approval decision</p><div className="flex flex-col gap-2 sm:flex-row"><Input value={rationale} onChange={event => setRationale(event.target.value)} required minLength={4} placeholder="Record the approval or return rationale" /><Button disabled={approve.isPending || rationale.trim().length < 4} onClick={() => approve.mutate({ organisationId: scope.organisationId, exceptionId: exception.id, approve: true, rationale: rationale.trim() })} className="rounded-xl bg-teal-700 hover:bg-teal-800"><CheckCircle2 className="mr-2 size-4" />Approve</Button><Button disabled={approve.isPending || rationale.trim().length < 4} variant="outline" onClick={() => approve.mutate({ organisationId: scope.organisationId, exceptionId: exception.id, approve: false, rationale: rationale.trim() })} className="rounded-xl">Return</Button></div></div>;
  return <form className="mt-5 flex flex-col gap-2 border-t pt-4 sm:flex-row" onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); submit.mutate({ organisationId: scope.organisationId, exceptionId: exception.id, note: String(data.get("note")) }); }}><Input name="note" required minLength={4} placeholder="Record the proposed resolution and investigation basis" /><Button type="submit" disabled={submit.isPending} className="rounded-xl bg-teal-700 hover:bg-teal-800">Submit for approval</Button></form>;
}

function ApprovalHistory({ exceptionId }: { exceptionId: string }) {
  const scope = useControlScope();
  const history = trpc.control.exceptions.approvalHistory.useQuery({ organisationId: scope.organisationId, exceptionId });
  if (history.isLoading) return null;
  if (history.isError) return <p className="mt-3 text-xs text-rose-700">Approval history could not load: {history.error.message}</p>;
  if (!history.data?.length) return null;
  return <section className="mt-4 rounded-2xl border border-violet-100 bg-violet-50/50 p-4"><div className="flex items-center gap-2"><History className="size-4 text-violet-700" /><p className="text-xs font-extrabold text-violet-900">Approval decision trail</p></div><div className="mt-3 space-y-2">{history.data.map(item => <div key={item.id} className="rounded-xl bg-white/80 p-3"><p className="text-xs font-extrabold capitalize text-slate-800">{item.decision} <span className="font-medium text-muted-foreground">· {item.actorName ?? "Authorised user"}</span></p><p className="mt-1 text-xs leading-5 text-slate-700">{item.rationale}</p><p className="mt-2 font-mono text-[10px] text-muted-foreground">{new Date(item.createdAt).toLocaleString()} · {item.correlationId.slice(0, 10)}…</p></div>)}</div></section>;
}

function ExceptionNotes({ exceptionId }: { exceptionId: string }) {
  const scope = useControlScope();
  const utils = trpc.useUtils();
  const notes = trpc.control.exceptions.notes.useQuery({ organisationId: scope.organisationId, exceptionId });
  const addNote = trpc.control.exceptions.addNote.useMutation({
    onSuccess: () => {
      toast.success("Investigation note added.");
      utils.control.exceptions.notes.invalidate({ organisationId: scope.organisationId, exceptionId });
    },
    onError: error => toast.error(error.message),
  });

  return (
    <details className="mt-4 rounded-2xl bg-slate-50 px-4 py-3">
      <summary className="cursor-pointer text-xs font-extrabold text-slate-700">Investigation notes {notes.data?.length ? `(${notes.data.length})` : ""}</summary>
      <div className="mt-3 space-y-3">
        {notes.isLoading ? <p className="text-xs text-muted-foreground">Loading note history…</p> : null}
        {notes.isError ? <p className="text-xs text-rose-700">{notes.error.message}</p> : null}
        {notes.data?.length ? notes.data.map(note => <div key={note.id} className="rounded-xl border bg-white p-3"><p className="text-xs leading-5 text-slate-700">{note.body}</p><p className="mt-2 font-mono text-[10px] text-muted-foreground">{new Date(note.createdAt).toLocaleString()} · {note.correlationId.slice(0, 10)}…</p></div>) : <p className="text-xs text-muted-foreground">No investigation notes have been recorded.</p>}
        <form className="flex flex-col gap-2 pt-1 sm:flex-row" onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); addNote.mutate({ organisationId: scope.organisationId, exceptionId, body: String(data.get("note")) }); event.currentTarget.reset(); }}>
          <Input name="note" required minLength={2} placeholder="Add an investigation note" />
          <Button type="submit" size="sm" variant="outline" disabled={addNote.isPending} className="rounded-xl">Add note</Button>
        </form>
      </div>
    </details>
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
              <ExceptionResolutionControls exception={item} />
              <ApprovalHistory exceptionId={item.id} />
              <ExceptionNotes exceptionId={item.id} />
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
