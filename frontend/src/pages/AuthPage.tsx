/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect } from "react";
import { SignIn, SignUp, AuthenticateWithRedirectCallback, useAuth as useClerkAuth } from "@clerk/clerk-react";
import { motion, AnimatePresence } from "framer-motion";
import { Leaf, BarChart3, Recycle, Shield } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import heroImage from "@/assets/hero-factory.png";

function AnimatedCounter({ target, suffix = "" }: { target: string; suffix?: string }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.8 }}
      className="font-mono text-2xl font-bold"
    >
      {target}{suffix}
    </motion.span>
  );
}

const features = [
  { icon: <BarChart3 className="h-5 w-5" />, title: "Carbon Tracking", desc: "Real-time emissions monitoring" },
  { icon: <Recycle className="h-5 w-5" />, title: "Waste Exchange", desc: "AI-matched material marketplace" },
  { icon: <Shield className="h-5 w-5" />, title: "ESG Compliance", desc: "Automated reporting & audits" },
];

export default function AuthPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const isSignUp = location.pathname.startsWith("/sign-up");
  const isSSO = location.pathname.includes("sso-callback");
  const { isSignedIn, isLoaded, getToken } = useClerkAuth();
  const { syncClerkSession, company, isLoading } = useAuthStore();

  useEffect(() => {
    const handleAuthSync = async () => {
      if (isLoaded && isSignedIn && !company) {
        try {
          const token = await getToken();
          if (token) {
            await syncClerkSession(token);
            toast.success("Authentication successful");
            const storeState = useAuthStore.getState();
            if (storeState.company?.onboardingComplete) {
              navigate("/dashboard");
            } else {
              navigate("/onboarding");
            }
          }
        } catch (error: any) {
          console.error("Sync error", error);
        }
      } else if (isLoaded && isSignedIn && company) {
        if (company.onboardingComplete) {
          navigate("/dashboard");
        } else {
          navigate("/onboarding");
        }
      }
    };

    handleAuthSync();
  }, [isLoaded, isSignedIn, company, getToken, navigate, syncClerkSession]);

  return (
    <div className="min-h-screen flex">
      {/* Left panel - hero */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-forest z-0" />
        <img
          src={heroImage}
          alt="Sustainable industrial factory with solar panels"
          className="absolute inset-0 w-full h-full object-cover z-10 opacity-40 mix-blend-overlay"
          onError={(e) => (e.currentTarget.style.display = 'none')}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(181,61%,10%)/0.8] via-[hsl(181,61%,15%)/0.7] to-[hsl(202,48%,20%)/0.8] z-20" />

        <div className="relative z-30 flex flex-col justify-between p-12 w-full">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-3"
          >
            <div className="h-11 w-11 rounded-xl bg-primary-foreground/15 backdrop-blur-sm flex items-center justify-center border border-primary-foreground/10">
              <Leaf className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-primary-foreground">EcoExchange AI</span>
              <p className="text-[10px] uppercase tracking-[0.2em] text-primary-foreground/60">Industrial Intelligence</p>
            </div>
          </motion.div>

          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <h1 className="text-5xl font-bold leading-[1.1] text-primary-foreground">
                Industrial<br />
                Intelligence.<br />
                <span className="text-primary-foreground/60">Circular Future.</span>
              </h1>
              <p className="text-base text-primary-foreground/70 max-w-md mt-4 leading-relaxed">
                Track carbon emissions, predict environmental impact, and exchange waste materials across your industrial supply chain.
              </p>
            </motion.div>

            {/* Feature pills */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="flex flex-col gap-3"
            >
              {features.map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + i * 0.1 }}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-primary-foreground/8 backdrop-blur-sm border border-primary-foreground/8 max-w-sm"
                >
                  <div className="text-primary-foreground/80">{f.icon}</div>
                  <div>
                    <p className="text-sm font-semibold text-primary-foreground">{f.title}</p>
                    <p className="text-xs text-primary-foreground/50">{f.desc}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Stats bar */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="grid grid-cols-3 gap-6 pt-6 border-t border-primary-foreground/10"
            >
              {[
                { label: "Companies", value: "2,400+" },
                { label: "CO₂ Prevented", value: "12K", suffix: " tonnes" },
                { label: "Waste Exchanged", value: "8K", suffix: " tonnes" },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1 + i * 0.1 }}
                >
                  <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                  <p className="text-xs text-primary-foreground/50 mt-0.5">{stat.label}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="text-xs text-primary-foreground/30"
          >
            Trusted by leading manufacturers across India
          </motion.p>
        </div>
      </div>

      {/* Right panel - Clerk forms */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-background relative overflow-y-auto w-full">
        {isLoading ? (
          <div className="flex flex-col items-center gap-4 text-muted-foreground">
            <Leaf className="h-8 w-8 text-primary animate-pulse" />
            <p className="text-sm font-medium">Synchronizing Secure Session...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={isSignUp ? "signup" : "signin"}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="w-full flex justify-center"
            >
              {isSSO ? (
                <AuthenticateWithRedirectCallback
                  afterSignInUrl="/dashboard"
                  afterSignUpUrl="/onboarding"
                />
              ) : isSignUp ? (
                <SignUp signInUrl="/login" forceRedirectUrl="/dashboard" routing="path" path="/sign-up" />
              ) : (
                <SignIn signUpUrl="/sign-up" forceRedirectUrl="/dashboard" routing="path" path="/login" />
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
