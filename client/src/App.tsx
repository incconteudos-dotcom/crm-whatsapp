import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import WhatsApp from "./pages/WhatsApp";
import Contacts from "./pages/Contacts";
import Pipeline from "./pages/Pipeline";
import Contracts from "./pages/Contracts";
import Invoices from "./pages/Invoices";
import Quotes from "./pages/Quotes";
import Studio from "./pages/Studio";
import Tasks from "./pages/Tasks";
import Analytics from "./pages/Analytics";
import Users from "./pages/Users";
import Payments from "./pages/Payments";
import Settings from "./pages/Settings";
import ContactProfile from "./pages/ContactProfile";
import ClientPortal from "./pages/ClientPortal";
import Products from "./pages/Products";
import Projects from "./pages/Projects";
import ContractTemplates from "./pages/ContractTemplates";
import Credits from "./pages/Credits";
import DailyRoutine from "./pages/DailyRoutine";
import Podcasts from "./pages/Podcasts";
import Automations from "./pages/Automations";
import ClientPortalDashboard, { ClientPortalMagicEntry } from "./pages/ClientPortalV2";
import BrandSettings from "./pages/BrandSettings";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/whatsapp" component={WhatsApp} />
      <Route path="/contacts" component={Contacts} />
      <Route path="/pipeline" component={Pipeline} />
      <Route path="/contracts" component={Contracts} />
      <Route path="/invoices" component={Invoices} />
      <Route path="/quotes" component={Quotes} />
      <Route path="/studio" component={Studio} />
      <Route path="/tasks" component={Tasks} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/users" component={Users} />
      <Route path="/payments" component={Payments} />
      <Route path="/settings" component={Settings} />
      <Route path="/contacts/:id" component={ContactProfile} />
      <Route path="/portal/:token" component={ClientPortal} />
      <Route path="/portal/magic/:token" component={ClientPortalMagicEntry} />
      <Route path="/portal/client/:contactId" component={ClientPortalDashboard} />
      <Route path="/brand-settings" component={BrandSettings} />
      <Route path="/products" component={Products} />
      <Route path="/projects" component={Projects} />
      <Route path="/contract-templates" component={ContractTemplates} />
      <Route path="/credits" component={Credits} />
      <Route path="/routine" component={DailyRoutine} />
      <Route path="/podcasts" component={Podcasts} />
      <Route path="/automations" component={Automations} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
