import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import ImpactCalculator from "./pages/ImpactCalculator";
import Predictions from "./pages/Predictions";
import Marketplace from "./pages/Marketplace";
import Matches from "./pages/Matches";
import DigitalPassport from "./pages/DigitalPassport";
import ImpactDashboard from "./pages/ImpactDashboard";
import ROIDashboard from "./pages/ROIDashboard";
import ESGReports from "./pages/ESGReports";
import Settings from "./pages/Settings";
import AlertsPage from "./pages/AlertsPage";
import LiveDocument from "./pages/LiveDocument";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

import Lenis from 'lenis';
import { useEffect, ReactNode } from 'react';

const SmoothScroll = ({ children }: { children: ReactNode }) => {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      infinite: false,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    }
  }, []);

  return <>{children}</>;
};

const App = () => (
  <SmoothScroll>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login/*" element={<AuthPage />} />
            <Route path="/sign-up/*" element={<AuthPage />} />
            <Route path="/sso-callback/*" element={<AuthPage />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/impact" element={<ImpactCalculator />} />
              <Route path="/predictions" element={<Predictions />} />
              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/matches" element={<Matches />} />
              <Route path="/passports" element={<DigitalPassport />} />
              <Route path="/passports/:id" element={<DigitalPassport />} />
              <Route path="/impact-dashboard" element={<ImpactDashboard />} />
              <Route path="/roi-dashboard" element={<ROIDashboard />} />
              <Route path="/esg-reports" element={<ESGReports />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/alerts" element={<AlertsPage />} />
              <Route path="/live-document" element={<LiveDocument />} />
              <Route path="/live/:companyId" element={<LiveDocument />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </SmoothScroll>
);

export default App;
