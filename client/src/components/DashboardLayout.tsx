import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { ControlScopeProvider } from "@/contexts/ControlScopeContext";
import type { ControlScope } from "@/lib/control";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, ArrowUpRight, BookOpenCheck, Building2, CircleUserRound, FileCheck2, History, LayoutDashboard, LogOut, Menu, ReceiptText, ShieldCheck, Sparkles, UsersRound, Warehouse, WalletCards } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { Skeleton } from "./ui/skeleton";
import { toast } from "sonner";

const navigation = [
  { href: "/", label: "Control desk", icon: LayoutDashboard },
  { href: "/receivables", label: "Receivables", icon: ReceiptText },
  { href: "/evidence", label: "Evidence intake", icon: FileCheck2 },
  { href: "/operations", label: "Operations", icon: Warehouse },
  { href: "/collections", label: "Collections", icon: WalletCards },
  { href: "/ledger", label: "Ledger", icon: BookOpenCheck },
  { href: "/variances", label: "Variances", icon: AlertTriangle },
  { href: "/access", label: "People & access", icon: UsersRound },
  { href: "/audit", label: "Audit trail", icon: History },
];

function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  const [location] = useLocation();
  return <nav className="space-y-1 px-3 py-4" aria-label="Primary navigation">
    {navigation.map(item => {
      const Icon = item.icon; const active = location === item.href;
      return <Link key={item.href} href={item.href} onClick={onNavigate} className={`flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold transition-colors ${active ? "bg-white/12 text-white shadow-sm" : "text-slate-300 hover:bg-white/7 hover:text-white"}`}>
        <Icon className="size-[18px]" /><span>{item.label}</span>{active ? <span className="ml-auto size-1.5 rounded-full bg-teal-300" /> : null}
      </Link>;
    })}
  </nav>;
}

function Brand() { return <div className="flex items-center gap-3 px-5 py-6"><div className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-teal-200 to-cyan-400 text-slate-950 shadow-lg shadow-cyan-900/30"><ShieldCheck className="size-5" /></div><div><p className="text-sm font-extrabold tracking-tight text-white">Control Ledger</p><p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-teal-200/70">Operations control</p></div></div>; }

function WorkspaceSetup() {
  const [organisationName, setOrganisationName] = useState("");
  const [branchName, setBranchName] = useState("Main branch");
  const utils = trpc.useUtils();
  const bootstrap = trpc.control.workspace.bootstrap.useMutation({ onSuccess: () => { toast.success("Your control workspace is ready."); utils.control.workspace.list.invalidate(); }, onError: error => toast.error(error.message) });
  return <main className="surface-grid min-h-screen bg-[#f6faf9] px-5 py-6 sm:grid sm:place-items-center"><section className="rise-in soft-card w-full max-w-2xl overflow-hidden rounded-[2rem] border bg-white">
    <div className="bg-[#071d22] p-7 text-white sm:p-10"><div className="mb-7 grid size-12 place-items-center rounded-2xl bg-teal-300 text-[#071d22]"><Sparkles className="size-6" /></div><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-teal-200">Release 1 workspace</p><h1 className="mt-3 max-w-md text-3xl font-extrabold tracking-tight sm:text-4xl">Start with one accountable control scope.</h1><p className="mt-4 max-w-lg text-sm leading-6 text-slate-300">Create your first organisation and branch. All records created afterwards remain scoped, attributed, and traceable.</p></div>
    <form className="space-y-5 p-7 sm:p-10" onSubmit={event => { event.preventDefault(); bootstrap.mutate({ organisationName, branchName }); }}><div className="grid gap-5 sm:grid-cols-2"><label className="grid gap-2 text-sm font-bold">Organisation name<Input required minLength={2} value={organisationName} onChange={event => setOrganisationName(event.target.value)} placeholder="e.g. Aster Distribution" /></label><label className="grid gap-2 text-sm font-bold">First branch<Input required minLength={2} value={branchName} onChange={event => setBranchName(event.target.value)} /></label></div><div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between"><p className="max-w-sm text-xs leading-5 text-muted-foreground">The workspace owner can later add controllers, operators, managers, and approvers through governed access workflows.</p><Button type="submit" size="lg" disabled={bootstrap.isPending} className="rounded-xl bg-teal-700 px-5 font-extrabold hover:bg-teal-800">{bootstrap.isPending ? "Creating workspace…" : "Create control workspace"}<ArrowUpRight className="ml-2 size-4" /></Button></div></form>
  </section></main>;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const workspaceQuery = trpc.control.workspace.list.useQuery(undefined, { enabled: Boolean(user) });
  const [selectedOrganisationId, setSelectedOrganisationId] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const organisationIds = useMemo(() => Array.from(new Set((workspaceQuery.data?.memberships ?? []).map(item => item.organisationId))), [workspaceQuery.data?.memberships]);
  const selectedOrganisation = selectedOrganisationId || organisationIds[0] || "";
  const availableBranches = (workspaceQuery.data?.branches ?? []).filter(branch => branch.organisationId === selectedOrganisation);
  const selectedBranch = selectedBranchId || availableBranches[0]?.id || "";
  const membership = (workspaceQuery.data?.memberships ?? []).find(item => item.organisationId === selectedOrganisation && (item.branchId === selectedBranch || item.branchId === null));

  useEffect(() => { if (selectedOrganisation && !selectedBranchId && availableBranches[0]) setSelectedBranchId(availableBranches[0].id); }, [selectedOrganisation, selectedBranchId, availableBranches]);

  if (loading || workspaceQuery.isLoading) return <div className="min-h-screen bg-[#f6faf9] p-6 sm:p-10"><div className="mx-auto max-w-6xl space-y-5"><Skeleton className="h-14 w-64 rounded-2xl" /><Skeleton className="h-40 w-full rounded-3xl" /><div className="grid gap-4 md:grid-cols-3"><Skeleton className="h-32 rounded-3xl" /><Skeleton className="h-32 rounded-3xl" /><Skeleton className="h-32 rounded-3xl" /></div></div></div>;
  if (!user) return <main className="surface-grid grid min-h-screen place-items-center bg-[#f6faf9] p-5"><section className="soft-card w-full max-w-md rounded-[2rem] border bg-white p-8 text-center"><div className="mx-auto grid size-12 place-items-center rounded-2xl bg-teal-50 text-teal-700"><ShieldCheck className="size-6" /></div><h1 className="mt-6 text-2xl font-extrabold tracking-tight">A clear view of what needs attention.</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Sign in to work with scoped receivables, evidence, and exceptions.</p><Button onClick={() => startLogin()} className="mt-7 w-full rounded-xl bg-teal-700 font-bold hover:bg-teal-800">Sign in to Control Ledger</Button></section></main>;
  if (workspaceQuery.isError) return <main className="grid min-h-screen place-items-center p-5"><section className="max-w-md rounded-3xl border bg-card p-7 text-center"><AlertTriangle className="mx-auto size-6 text-rose-600" /><h1 className="mt-4 font-extrabold">Workspace information is unavailable</h1><p className="mt-2 text-sm text-muted-foreground">{workspaceQuery.error.message}</p><Button variant="outline" className="mt-5" onClick={() => workspaceQuery.refetch()}>Try again</Button></section></main>;
  if (!workspaceQuery.data?.memberships.length || !selectedOrganisation || !selectedBranch || !membership) return <WorkspaceSetup />;

  const scope: ControlScope = { organisationId: selectedOrganisation, branchId: selectedBranch, organisationName: membership.organisationName, branchName: availableBranches.find(branch => branch.id === selectedBranch)?.name ?? "Branch", role: membership.role };
  return <ControlScopeProvider scope={scope}><div className="min-h-screen bg-[#f6faf9] lg:flex">
    <aside className="hidden min-h-screen w-64 shrink-0 bg-[#071d22] lg:block"><Brand /><Navigation /><div className="absolute bottom-5 w-64 px-4"><div className="rounded-2xl border border-white/8 bg-white/5 p-3 text-xs text-slate-300"><p className="font-extrabold text-white">Immutable by default</p><p className="mt-1 leading-5">Every material action carries an actor and correlation trail.</p></div></div></aside>
    <div className="min-w-0 flex flex-1 flex-col"><header className="sticky top-0 z-30 border-b border-slate-200/80 bg-[#f6faf9]/92 backdrop-blur-xl"><div className="flex h-[72px] items-center gap-3 px-4 sm:px-6"><Sheet><SheetTrigger asChild><Button variant="outline" size="icon" className="rounded-xl lg:hidden"><Menu className="size-5" /><span className="sr-only">Open navigation</span></Button></SheetTrigger><SheetContent side="left" className="w-72 border-0 bg-[#071d22] p-0 text-white"><Brand /><Navigation /></SheetContent></Sheet><div className="min-w-0 flex-1"><p className="hidden text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted-foreground sm:block">Scoped workspace</p><div className="flex items-center gap-2"><Building2 className="size-4 text-teal-700" /><span className="truncate text-sm font-extrabold">{scope.organisationName}</span></div></div><div className="hidden items-center gap-2 md:flex"><select value={selectedOrganisation} onChange={event => { setSelectedOrganisationId(event.target.value); setSelectedBranchId(""); }} className="h-10 max-w-44 rounded-xl border bg-white px-3 text-xs font-bold outline-none"><option value={selectedOrganisation}>{scope.organisationName}</option></select><select value={selectedBranch} onChange={event => setSelectedBranchId(event.target.value)} className="h-10 max-w-40 rounded-xl border bg-white px-3 text-xs font-bold outline-none">{availableBranches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></div><div className="flex items-center gap-2 rounded-xl border bg-white py-1.5 pl-2 pr-3"><div className="grid size-7 place-items-center rounded-lg bg-slate-100 text-slate-600"><CircleUserRound className="size-4" /></div><div className="hidden max-w-32 sm:block"><p className="truncate text-xs font-extrabold">{user.name ?? "Account"}</p><p className="truncate text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{scope.role}</p></div><button onClick={logout} className="ml-1 text-muted-foreground hover:text-rose-600" aria-label="Sign out"><LogOut className="size-4" /></button></div></div></header>
      <main className="surface-grid flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      <footer className="border-t border-slate-200/80 bg-[#f6faf9] px-4 py-4 text-center text-xs font-semibold tracking-wide text-slate-500 sm:px-6">Developed Ace Technologies</footer>
    </div>
  </div></ControlScopeProvider>;
}
