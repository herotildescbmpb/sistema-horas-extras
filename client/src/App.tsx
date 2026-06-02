import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import AppLayout from "./components/AppLayout";
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
import AdminPermissions from "./pages/AdminPermissions";
import UserGuide from "./pages/UserGuide";
import Login from "./pages/Login";

function ProtectedRouter() {
  return (
    <AppLayout>
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
        <Route path="/admin/permissoes" component={AdminPermissions} />
        <Route path="/escalas" component={EscalaList} />
        <Route path="/escalas/nova" component={EscalaWizard} />
        <Route path="/escalas/:id" component={EscalaDetail} />
        <Route path="/meu-setor" component={MeuSetor} />
        <Route path="/guia" component={UserGuide} />
        <Route path="/perfil" component={Profile} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route component={ProtectedRouter} />
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
