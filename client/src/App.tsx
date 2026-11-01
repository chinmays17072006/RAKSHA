import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ToastProvider } from "./components/system/feedback";
import { ThemeProvider } from "./contexts/ThemeContext";
import { OperationsProvider } from "./features/command-center/OperationsContext";
import CitizenSOSPage from "./features/citizen-sos/CitizenSOS";
import AITriagePage from "./features/ai-triage/AITriagePage";
import SafeRoutingPage from "./features/safe-routing/SafeRoutingPage";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/citizen-sos" component={CitizenSOSPage} />
      <Route path="/ai-triage" component={AITriagePage} />
      <Route path="/safe-routing" component={SafeRoutingPage} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <OperationsProvider>
          <ToastProvider>
            <Router />
          </ToastProvider>
        </OperationsProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
