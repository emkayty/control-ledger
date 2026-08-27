import { Toaster } from "@/components/ui/sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import React, { lazy, Suspense } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import ControlDashboard from "@/pages/ControlDashboard";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

export function PageFallback() { return <section role="status" aria-label="Preparing controlled workspace" className="mx-auto grid min-h-[50vh] w-full max-w-7xl content-start gap-6 pt-2"><div className="rounded-[1.8rem] border border-slate-200/80 bg-[#071d22] p-6 sm:p-8"><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-teal-200">Scoped control workspace</p><p className="mt-3 text-xl font-extrabold tracking-tight text-white">Preparing your workspace</p><p className="mt-2 text-sm text-slate-300">Loading the selected control view. No action is being submitted.</p></div><div className="grid gap-4 md:grid-cols-3"><Skeleton className="h-32 rounded-3xl" /><Skeleton className="h-32 rounded-3xl" /><Skeleton className="h-32 rounded-3xl" /></div><Skeleton className="h-48 rounded-3xl" /></section>; }
function ProtectedPage({ children }: { children: React.ReactNode }) { return <DashboardLayout><Suspense fallback={<PageFallback />}>{children}</Suspense></DashboardLayout>; }
const LedgerPage = lazy(() => import("@/pages/LedgerPage"));
const VariancesPage = lazy(() => import("@/pages/VariancesPage"));
const PharmacyPrototypePage = lazy(() => import("@/pages/PharmacyPrototypePage"));
const ReceivablesPage = lazy(() => import("@/pages/RecordsPages").then(module => ({ default: module.ReceivablesPage })));
const EvidencePage = lazy(() => import("@/pages/RecordsPages").then(module => ({ default: module.EvidencePage })));
const ExceptionsPage = lazy(() => import("@/pages/RecordsPages").then(module => ({ default: module.ExceptionsPage })));
const OperationsPage = lazy(() => import("@/pages/OperationsPage"));
const CollectionsPage = lazy(() => import("@/pages/CollectionsPage"));
const AccessPage = lazy(() => import("@/pages/AccessPage"));
const AuditPage = lazy(() => import("@/pages/AuditPage"));
function Router() { return <Switch><Route path="/"><ProtectedPage><ControlDashboard /></ProtectedPage></Route><Route path="/receivables"><ProtectedPage><ReceivablesPage /></ProtectedPage></Route><Route path="/evidence"><ProtectedPage><EvidencePage /></ProtectedPage></Route><Route path="/operations"><ProtectedPage><OperationsPage /></ProtectedPage></Route><Route path="/collections"><ProtectedPage><CollectionsPage /></ProtectedPage></Route><Route path="/ledger"><ProtectedPage><LedgerPage /></ProtectedPage></Route><Route path="/variances"><ProtectedPage><VariancesPage /></ProtectedPage></Route><Route path="/pharmacy-prototype"><ProtectedPage><PharmacyPrototypePage /></ProtectedPage></Route><Route path="/exceptions"><ProtectedPage><ExceptionsPage /></ProtectedPage></Route><Route path="/access"><ProtectedPage><AccessPage /></ProtectedPage></Route><Route path="/audit"><ProtectedPage><AuditPage /></ProtectedPage></Route><Route path="/404" component={NotFound} /><Route component={NotFound} /></Switch>; }
function App() { return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster richColors position="top-right" /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>; }
export default App;
