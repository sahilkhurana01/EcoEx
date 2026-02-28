import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { Navigate } from "react-router-dom";
import { AlertBell } from "@/components/AlertBell";
import { SimulationFAB } from "@/components/SimulationFAB";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";

import { UserButton, useUser, useAuth as useClerkAuth } from "@clerk/clerk-react";
import { useEffect } from "react";

export function AppLayout() {
  const { company, isAuthenticated, isLoading: authSyncing, syncClerkSession, error: authError } = useAuthStore();
  const { user, isLoaded: userLoaded } = useUser();
  const { isSignedIn, isLoaded: authLoaded, getToken } = useClerkAuth();

  // Automatic sync if we have a Clerk session but no backend session
  useEffect(() => {
    const sync = async () => {
      // Prevent infinite loop if we already have an error
      if (authLoaded && isSignedIn && !isAuthenticated && !authSyncing && !authError) {
        const token = await getToken();
        if (token) {
          await syncClerkSession(token);
        }
      }
    };
    sync();
  }, [authLoaded, isSignedIn, isAuthenticated, authSyncing, authError, getToken, syncClerkSession]);

  // Wait for Clerk to load OR backend to finish syncing
  if (!authLoaded || !userLoaded || authSyncing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">Syncing your facility profile...</p>
        </div>
      </div>
    );
  }

  // If there's an error syncing, show it instead of breaking
  if (authError && isSignedIn && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="h-10 w-10 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-2">
            X
          </div>
          <p className="text-sm font-medium text-foreground">Failed to sync profile</p>
          <p className="text-xs text-muted-foreground max-w-[250px]">{authError}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground text-xs rounded-md font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Redirect to login ONLY if we are sure there is no session anywhere
  if (!isSignedIn && !authSyncing && !isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Redirect to onboarding if profile is incomplete
  if (company && !company.onboardingComplete) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background selection:bg-primary/20">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-40 h-16 sm:h-14 flex shrink-0 items-center justify-between border-b px-4 sm:px-6 bg-background/80 backdrop-blur-md">
            <div className="flex items-center gap-2 sm:gap-4">
              <SidebarTrigger className="-ml-1 h-9 w-9 sm:h-8 sm:w-8" />
              <div className="h-4 w-[1px] bg-border mx-1 sm:hidden" />
            </div>
            <div className="flex items-center gap-3 sm:gap-4">
              <AlertBell />
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="hidden lg:block text-right">
                  <p className="text-xs sm:text-sm font-bold leading-none text-foreground">
                    {company?.name || user?.fullName || "My Company"}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">
                    {user?.primaryEmailAddress?.emailAddress || company?.email || ""}
                  </p>
                </div>
                <UserButton
                  afterSignOutUrl="/"
                  appearance={{
                    elements: {
                      avatarBox: "h-9 w-9 sm:h-8 sm:w-8",
                      userButtonTrigger: "focus:shadow-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-full transition-shadow",
                    }
                  }}
                />
              </div>
            </div>
          </header>
          <main className="flex-1 p-3 sm:p-6 md:p-8 lg:p-10">
            <Outlet />
          </main>
        </div>
      </div>
      <SimulationFAB />
      <PWAInstallPrompt />
    </SidebarProvider>
  );
}
