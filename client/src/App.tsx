import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import DashboardLayout from "@/components/DashboardLayout";
import ControlDashboard from "@/pages/ControlDashboard";
import AccessPage from "@/pages/AccessPage";
import AuditPage from "@/pages/AuditPage";
import { EvidencePage, ExceptionsPage, ReceivablesPage } from "@/pages/RecordsPages";
import OperationsPage from "@/pages/OperationsPage";
import CollectionsPage from "@/pages/CollectionsPage";
import LedgerPage from "@/pages/LedgerPage";
import VariancesPage from "@/pages/VariancesPage";
import PharmacyPrototypePage from "@/pages/PharmacyPrototypePage";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

function ProtectedPage({ children }: { children: React.ReactNode }) { return <DashboardLayout>{children}</DashboardLayout>; }
function Router() { return <Switch><Route path="/"><ProtectedPage><ControlDashboard /></ProtectedPage></Route><Route path="/receivables"><ProtectedPage><ReceivablesPage /></ProtectedPage></Route><Route path="/evidence"><ProtectedPage><EvidencePage /></ProtectedPage></Route><Route path="/operations"><ProtectedPage><OperationsPage /></ProtectedPage></Route><Route path="/collections"><ProtectedPage><CollectionsPage /></ProtectedPage></Route><Route path="/ledger"><ProtectedPage><LedgerPage /></ProtectedPage></Route><Route path="/variances"><ProtectedPage><VariancesPage /></ProtectedPage></Route><Route path="/pharmacy-prototype"><ProtectedPage><PharmacyPrototypePage /></ProtectedPage></Route><Route path="/exceptions"><ProtectedPage><ExceptionsPage /></ProtectedPage></Route><Route path="/access"><ProtectedPage><AccessPage /></ProtectedPage></Route><Route path="/audit"><ProtectedPage><AuditPage /></ProtectedPage></Route><Route path="/404" component={NotFound} /><Route component={NotFound} /></Switch>; }
function App() { return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster richColors position="top-right" /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>; }
export default App;
