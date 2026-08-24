import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useControlScope } from "@/contexts/ControlScopeContext";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, GitBranchPlus, ShieldCheck, UserMinus, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const makeKey = () => crypto.randomUUID();
const roles = ["owner", "controller", "operator", "manager", "approver"] as const;

function RoleBadge({ role }: { role: string }) {
  const tone = role === "owner" ? "bg-teal-50 text-teal-800" : role === "controller" ? "bg-sky-50 text-sky-800" : role === "approver" ? "bg-violet-50 text-violet-800" : "bg-slate-100 text-slate-700";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.13em] ${tone}`}>{role}</span>;
}

function BranchDialog() {
  const scope = useControlScope();
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const createBranch = trpc.control.branches.create.useMutation({
    onSuccess: () => {
      toast.success("Branch created and recorded in the audit trail.");
      setOpen(false);
      utils.control.workspace.list.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  if (scope.role !== "owner") return null;
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button variant="outline" className="rounded-xl"><GitBranchPlus className="mr-2 size-4" />New branch</Button></DialogTrigger>
    <DialogContent><DialogHeader><DialogTitle>Add a controlled branch</DialogTitle><DialogDescription>A branch creates a new financial scope. Assign access separately from this page once it is created.</DialogDescription></DialogHeader>
      <form className="grid gap-4" onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); createBranch.mutate({ organisationId: scope.organisationId, name: String(data.get("name")), code: String(data.get("code")), idempotencyKey: makeKey() }); }}>
        <Input name="name" required minLength={2} placeholder="Branch name" />
        <Input name="code" required minLength={2} maxLength={16} placeholder="Branch code, e.g. LAG-01" />
        <Button disabled={createBranch.isPending} className="rounded-xl bg-teal-700 hover:bg-teal-800">{createBranch.isPending ? "Creating…" : "Create branch"}</Button>
      </form>
    </DialogContent>
  </Dialog>;
}

function GrantAccessDialog({ branches }: { branches: Array<{ id: string; name: string }> }) {
  const scope = useControlScope();
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const grant = trpc.control.memberships.grant.useMutation({
    onSuccess: () => {
      toast.success("Access recorded with an audit trail.");
      setOpen(false);
      utils.control.memberships.list.invalidate({ organisationId: scope.organisationId });
    },
    onError: error => toast.error(error.message),
  });
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button className="rounded-xl bg-teal-700 hover:bg-teal-800"><UserPlus className="mr-2 size-4" />Grant access</Button></DialogTrigger>
    <DialogContent><DialogHeader><DialogTitle>Grant scoped access</DialogTitle><DialogDescription>The person must already have signed in to Control Ledger with this email. Controllers can only manage their own branch and cannot grant owner/controller roles.</DialogDescription></DialogHeader>
      <form className="grid gap-4" onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); const selectedBranch = String(data.get("branchId")); grant.mutate({ organisationId: scope.organisationId, branchId: selectedBranch === "organisation" ? null : selectedBranch, existingUserEmail: String(data.get("email")), role: String(data.get("role")) as (typeof roles)[number], idempotencyKey: makeKey() }); }}>
        <Input name="email" type="email" required placeholder="Existing user's email address" />
        <select name="role" className="h-10 rounded-xl border bg-white px-3 text-sm" defaultValue="operator">{roles.filter(role => scope.role === "owner" || !["owner", "controller"].includes(role)).map(role => <option key={role} value={role}>{role[0].toUpperCase() + role.slice(1)}</option>)}</select>
        <select name="branchId" className="h-10 rounded-xl border bg-white px-3 text-sm" defaultValue={scope.role === "controller" ? scope.branchId : "organisation"} disabled={scope.role === "controller"}>{scope.role === "owner" ? <option value="organisation">Organisation-wide access</option> : null}{branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select>
        <Button disabled={grant.isPending} className="rounded-xl bg-teal-700 hover:bg-teal-800">{grant.isPending ? "Recording…" : "Grant access"}</Button>
      </form>
    </DialogContent>
  </Dialog>;
}

export default function AccessPage() {
  const scope = useControlScope();
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const memberships = trpc.control.memberships.list.useQuery({ organisationId: scope.organisationId });
  const workspace = trpc.control.workspace.list.useQuery();
  const branches = useMemo(() => (workspace.data?.branches ?? []).filter(branch => branch.organisationId === scope.organisationId), [workspace.data?.branches, scope.organisationId]);
  const canManage = ["owner", "controller"].includes(scope.role);
  const revoke = trpc.control.memberships.revoke.useMutation({
    onSuccess: () => {
      toast.success("Membership revoked; the historical audit trail remains.");
      utils.control.memberships.list.invalidate({ organisationId: scope.organisationId });
    },
    onError: error => toast.error(error.message),
  });

  if (!canManage) return <div className="mx-auto max-w-4xl"><section className="soft-card rounded-3xl border bg-card p-7 text-center"><ShieldCheck className="mx-auto size-7 text-teal-700" /><h1 className="mt-4 text-xl font-extrabold">Access is governed by owners and controllers</h1><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">Your current role can work with scoped records, but it cannot assign or revoke organisation access.</p></section></div>;

  return <div className="mx-auto max-w-6xl space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[0.15em] text-teal-700">Governed permissions</p><h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">People & access</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Grant existing signed-in users only the organisation or branch role they need. Every grant, revocation, and branch is attributed and auditable.</p></div><div className="flex flex-wrap gap-2"><BranchDialog /><GrantAccessDialog branches={branches} /></div></div>

    {scope.role === "owner" ? <section className="soft-card rounded-3xl border bg-card"><div className="border-b px-5 py-4"><p className="text-sm font-extrabold">Operating branches</p><p className="mt-1 text-xs text-muted-foreground">Each branch is a separate control scope for receivables, evidence, reconciliation, and exceptions.</p></div><div className="divide-y">{branches.map(branch => <div key={branch.id} className="flex items-center justify-between px-5 py-4"><div><p className="text-sm font-extrabold">{branch.name}</p><p className="mt-1 font-mono text-xs text-muted-foreground">{branch.code}</p></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.13em] text-emerald-700">Active</span></div>)}</div></section> : null}

    {memberships.isLoading ? <section className="soft-card rounded-3xl border bg-card p-8 text-sm font-bold text-muted-foreground">Loading governed access records…</section> : memberships.isError ? <section className="soft-card rounded-3xl border border-rose-200 bg-rose-50 p-7"><AlertTriangle className="size-5 text-rose-700" /><p className="mt-3 text-sm font-extrabold text-rose-800">Access records are unavailable</p><p className="mt-1 text-sm text-rose-700">{memberships.error.message}</p><Button variant="outline" className="mt-4 rounded-xl" onClick={() => memberships.refetch()}>Try again</Button></section> : <section className="soft-card overflow-hidden rounded-3xl border bg-card"><div className="border-b px-5 py-4"><p className="text-sm font-extrabold">Current access</p><p className="mt-1 text-xs text-muted-foreground">Inactive memberships remain in the audit history but no longer grant product access.</p></div><div className="divide-y">{memberships.data?.map(member => <article key={member.id} className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-extrabold">{member.name ?? "Signed-in user"}</p><RoleBadge role={member.role} />{member.isActive ? null : <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.13em] text-rose-700">Revoked</span>}</div><p className="mt-1 truncate text-xs text-muted-foreground">{member.email ?? "No email returned"} · {member.branchId ? branches.find(branch => branch.id === member.branchId)?.name ?? "Branch-scoped" : "Organisation-wide"}</p></div>{member.isActive && member.userId !== user?.id ? <Button variant="outline" size="sm" disabled={revoke.isPending} onClick={() => revoke.mutate({ organisationId: scope.organisationId, membershipId: member.id, idempotencyKey: makeKey() })} className="self-start rounded-xl text-rose-700 hover:bg-rose-50 hover:text-rose-800 sm:self-auto"><UserMinus className="mr-2 size-3.5" />Revoke</Button> : null}</article>)}</div></section>}
  </div>;
}
