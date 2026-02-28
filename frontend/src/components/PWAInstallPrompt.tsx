import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] =
        useState<BeforeInstallPromptEvent | null>(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Check if already installed
        const isStandalone =
            window.matchMedia("(display-mode: standalone)").matches ||
            (window.navigator as any).standalone === true;

        if (isStandalone) {
            setIsInstalled(true);
            return;
        }

        // Check if user dismissed before (respect for 7 days)
        const dismissed = localStorage.getItem("pwa-install-dismissed");
        if (dismissed) {
            const dismissedAt = parseInt(dismissed, 10);
            if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) return;
        }

        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            // Small delay before showing to avoid jarring UX
            setTimeout(() => setShowPrompt(true), 3000);
        };

        window.addEventListener("beforeinstallprompt", handler);

        // Listen for successful install
        window.addEventListener("appinstalled", () => {
            setIsInstalled(true);
            setShowPrompt(false);
            setDeferredPrompt(null);
        });

        return () => window.removeEventListener("beforeinstallprompt", handler);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
            setIsInstalled(true);
        }
        setShowPrompt(false);
        setDeferredPrompt(null);
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        localStorage.setItem("pwa-install-dismissed", Date.now().toString());
    };

    if (!showPrompt || isInstalled) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-6 md:max-w-sm animate-fade-in">
            <div className="bg-card border border-border rounded-xl shadow-2xl p-4 flex items-start gap-3">
                <div className="h-10 w-10 shrink-0 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Download className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                        Install EcoExchange
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Get the app on your device for faster access and offline support.
                    </p>
                    <div className="flex gap-2 mt-3">
                        <Button size="sm" className="h-8 text-xs gap-1.5" onClick={handleInstall}>
                            <Download className="h-3.5 w-3.5" /> Install
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-xs text-muted-foreground"
                            onClick={handleDismiss}
                        >
                            Not now
                        </Button>
                    </div>
                </div>
                <button
                    onClick={handleDismiss}
                    className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}
