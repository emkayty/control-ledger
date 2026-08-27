import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import ControlDashboard from "@/pages/ControlDashboard";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

function PageFallback() { return <div className="grid min-h-[50vh] place-items-center text-sm font-semibold text-muted-foreground">Loading controlled workspace…</div>; }
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
