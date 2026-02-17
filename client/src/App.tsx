import { useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navigation } from "@/components/Navigation";
import { ResultsProvider } from "@/context/ResultsContext";

import Analyzer from "@/pages/Analyzer";
import FractalSettings from "@/pages/FractalSettings";
import MikingGuide from "@/pages/MikingGuide";
import IRMixer from "@/pages/IRMixer";
import AmpDesigner from "@/pages/AmpDesigner";
import AmpDialIn from "@/pages/AmpDialIn";
import Pairing from "@/pages/Pairing";
import AmpAndDriveDialer from "@/pages/AmpAndDriveDialer";
import ReferenceManual from "@/pages/ReferenceManual";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Analyzer} />

      {/* New top-nav routes */}
      <Route path="/learner" component={IRMixer} />
      <Route path="/blend-builder" component={Pairing} />
      <Route path="/mic-shots-suggester" component={MikingGuide} />
      <Route path="/sic-tool" component={FractalSettings} />
      <Route path="/amp-drive-dialer" component={AmpAndDriveDialer} />
      <Route path="/reference-manual" component={ReferenceManual} />

      {/* Back-compat routes */}
      <Route path="/mixer" component={IRMixer} />
      <Route path="/pairing" component={Pairing} />
      <Route path="/miking-guide" component={MikingGuide} />
      <Route path="/fractal" component={FractalSettings} />
      <Route path="/amp-designer" component={AmpDesigner} />
      <Route path="/amp-dial-in" component={AmpDialIn} />

      <Route component={NotFound} />
    </Switch>
  );
}

function RedirectToHome() {
  const [location, setLocation] = useLocation();
  useEffect(() => {
    if (location !== "/") {
      setLocation("/");
    }
  }, []);
  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ResultsProvider>
          <div className="min-h-screen bg-background text-foreground antialiased selection:bg-primary/30">
            <RedirectToHome />
            <Navigation />
            <Router />
            <Toaster />
          </div>
        </ResultsProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
