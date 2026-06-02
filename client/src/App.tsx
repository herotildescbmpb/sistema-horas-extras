import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Dashboard from "./pages/Dashboard";
import OvertimeList from "./pages/OvertimeList";
import OvertimeForm from "./pages/OvertimeForm";
import AdminPanel from "./pages/AdminPanel";
import AdminUsers from "./pages/AdminUsers";
import AdminDepartments from "./pages/AdminDepartments";
import Reports from "./pages/Reports";
import Profile from "./pages/Profile";
import EscalaList from "./pages/EscalaList";
import EscalaWizard from "./pages/EscalaWizard";
import EscalaDetail from "./pages/EscalaDetail";
import NovoRegistro from "./pages/NovoRegistro";
import MeuSetor from "./pages/MeuSetor";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/horas" component={OvertimeList} />
      <Route path="/novo" component={NovoRegistro} />
      <Route path="/horas/novo" component={OvertimeForm} />
      <Route path="/horas/:id/editar" component={OvertimeForm} />
      <Route path="/relatorios" component={Reports} />
      <Route path="/admin" component={AdminPanel} />
      <Route path="/admin/usuarios" component={AdminUsers} />
      <Route path="/admin/setores" component={AdminDepartments} />
      <Route path="/escalas" component={EscalaList} />
      <Route path="/escalas/nova" component={EscalaWizard} />
      <Route path="/escalas/:id" component={EscalaDetail} />
      <Route path="/meu-setor" component={MeuSetor} />
      <Route path="/perfil" component={Profile} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
