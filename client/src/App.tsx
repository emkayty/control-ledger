import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import DashboardLayout from "@/components/DashboardLayout";
import ControlDashboard from "@/pages/ControlDashboard";
import AccessPage from "@/pages/AccessPage";
import { EvidencePage, ExceptionsPage, ReceivablesPage } from "@/pages/RecordsPages";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

function ProtectedPage({ children }: { children: React.ReactNode }) { return <DashboardLayout>{children}</DashboardLayout>; }
function Router() { return <Switch><Route path="/"><ProtectedPage><ControlDashboard /></ProtectedPage></Route><Route path="/receivables"><ProtectedPage><ReceivablesPage /></ProtectedPage></Route><Route path="/evidence"><ProtectedPage><EvidencePage /></ProtectedPage></Route><Route path="/exceptions"><ProtectedPage><ExceptionsPage /></ProtectedPage></Route><Route path="/access"><ProtectedPage><AccessPage /></ProtectedPage></Route><Route path="/404" component={NotFound} /><Route component={NotFound} /></Switch>; }
function App() { return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster richColors position="top-right" /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>; }
export default App;
