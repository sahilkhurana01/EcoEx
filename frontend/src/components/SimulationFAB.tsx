/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { Zap, X, Send, Loader2, CheckCircle2, AlertTriangle, Factory, Leaf, DollarSign, Shield, Package } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";

// ─── Scenario definitions (matching backend) ─────────────────
const SCENARIOS = [
    {
        id: "carbon_spike",
        label: "Carbon Spike",
        description: "40% above baseline emissions",
        icon: Factory,
        color: "#ef4444",
        gradient: "from-red-500 to-orange-500",
    },
    {
        id: "energy_overuse",
        label: "Energy Overuse",
        description: "25% above predicted consumption",
        icon: Zap,
        color: "#f97316",
        gradient: "from-orange-500 to-yellow-500",
    },
    {
        id: "waste_overflow",
        label: "Waste Overflow",
        description: "Storage at 85% capacity",
        icon: Package,
        color: "#8b5cf6",
        gradient: "from-violet-500 to-purple-500",
    },
    {
        id: "cost_anomaly",
        label: "Cost Anomaly",
        description: "Bill 150% of forecast",
        icon: DollarSign,
        color: "#eab308",
        gradient: "from-yellow-500 to-amber-500",
    },
    {
        id: "missed_opportunity",
        label: "Missed Opportunity",
        description: "₹1L savings untapped",
        icon: Leaf,
        color: "#22c55e",
        gradient: "from-green-500 to-emerald-500",
    },
    {
        id: "compliance_risk",
        label: "Compliance Risk",
        description: "15 days to deadline",
        icon: Shield,
        color: "#3b82f6",
        gradient: "from-blue-500 to-cyan-500",
    },
];

const SEVERITIES = [
    { id: "critical", label: "Critical", color: "#ef4444", bg: "rgba(239,68,68,0.15)" },
    { id: "high", label: "High", color: "#f97316", bg: "rgba(249,115,22,0.15)" },
    { id: "medium", label: "Medium", color: "#eab308", bg: "rgba(234,179,8,0.15)" },
];

export function SimulationFAB() {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
    const [selectedSeverity, setSelectedSeverity] = useState("high");
    const [customMessage, setCustomMessage] = useState("");
    const [isSimulating, setIsSimulating] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [pulsePhase, setPulsePhase] = useState(0);
    const { company } = useAuthStore();

    // Pulse animation every 5 seconds
    useEffect(() => {
        if (isOpen) return;
        const interval = setInterval(() => {
            setPulsePhase((p) => p + 1);
        }, 5000);
        return () => clearInterval(interval);
    }, [isOpen]);

    const handleSimulate = async () => {
        if (!selectedScenario) {
            toast.error("Please select an alert scenario");
            return;
        }

        setIsSimulating(true);
        setResult(null);

        try {
            const response: any = await api.post("/alerts/simulate", {
                alertType: selectedScenario,
                severity: selectedSeverity,
                customMessage: customMessage || undefined,
            });

            const data = response.data;
            setResult(data);
            toast.success(`Simulation alert sent to ${data.sentTo}`, {
                description: `Generated in ${data.generationTimeMs}ms via ${data.generatedBy}`,
                duration: 6000,
            });
        } catch (error: any) {
            const msg = error.response?.data?.error || error.message || "Simulation failed";
            toast.error(msg);
        } finally {
            setIsSimulating(false);
        }
    };

    const resetModal = () => {
        setSelectedScenario(null);
        setSelectedSeverity("high");
        setCustomMessage("");
        setResult(null);
        setIsSimulating(false);
    };

    const closeModal = () => {
        setIsOpen(false);
        setTimeout(resetModal, 300);
    };

    if (!company) return null;

    return (
        <>
            {/* ─── Floating Action Button ─────────────────────── */}
            <button
                id="simulate-alert-fab"
                onClick={() => { setIsOpen(true); resetModal(); }}
                className="fixed bottom-6 right-6 z-50 group"
                style={{ outline: "none" }}
                title="Simulate Alert"
            >
                <div
                    className="relative flex items-center justify-center w-14 h-14 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 hover:shadow-[0_0_30px_rgba(16,185,129,0.4)]"
                    style={{
                        background: "linear-gradient(135deg, #059669, #0d9488)",
                    }}
                >
                    {/* Pulse ring */}
                    <div
                        key={pulsePhase}
                        className="absolute inset-0 rounded-full"
                        style={{
                            background: "linear-gradient(135deg, #059669, #0d9488)",
                            animation: "fab-pulse 2s ease-out",
                            opacity: 0,
                        }}
                    />
                    <Zap className="h-6 w-6 text-white relative z-10 transition-transform duration-200 group-hover:rotate-12" />
                </div>
                {/* Tooltip */}
                <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-[#1a1a1a] text-white text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none border border-[#333]">
                    Simulate Alert
                </span>
            </button>

            {/* ─── Modal Overlay ──────────────────────────────── */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center p-4"
                    onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
                >
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        style={{ animation: "fade-in 0.2s ease-out" }}
                    />

                    {/* Modal */}
                    <div
                        className="relative w-full max-w-lg bg-[#0f0f0f] border border-[#262626] rounded-2xl shadow-2xl overflow-hidden"
                        style={{ animation: "modal-slide-up 0.3s ease-out" }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-[#262626]">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-9 h-9 rounded-lg" style={{ background: "linear-gradient(135deg, #059669, #0d9488)" }}>
                                    <Zap className="h-4 w-4 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-base font-semibold text-white">Simulate Alert</h2>
                                    <p className="text-xs text-[#737373]">Trigger a real alert email for demonstration</p>
                                </div>
                            </div>
                            <button onClick={closeModal} className="text-[#737373] hover:text-white transition-colors p-1 rounded-lg hover:bg-[#262626]">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
                            {!result ? (
                                <>
                                    {/* Scenario Selector */}
                                    <div>
                                        <label className="block text-xs font-medium text-[#a3a3a3] uppercase tracking-wider mb-3">Select Alert Type</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {SCENARIOS.map((s) => {
                                                const Icon = s.icon;
                                                const active = selectedScenario === s.id;
                                                return (
                                                    <button
                                                        key={s.id}
                                                        onClick={() => setSelectedScenario(s.id)}
                                                        className="relative flex items-start gap-3 p-3 rounded-xl border transition-all duration-200 text-left"
                                                        style={{
                                                            background: active ? `${s.color}15` : "#171717",
                                                            borderColor: active ? `${s.color}80` : "#262626",
                                                            boxShadow: active ? `0 0 20px ${s.color}20` : "none",
                                                        }}
                                                    >
                                                        <div
                                                            className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0 mt-0.5"
                                                            style={{ background: `${s.color}20` }}
                                                        >
                                                            <Icon className="h-4 w-4" style={{ color: s.color }} />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium text-white leading-tight">{s.label}</p>
                                                            <p className="text-[11px] text-[#737373] mt-0.5 leading-snug">{s.description}</p>
                                                        </div>
                                                        {active && (
                                                            <div className="absolute top-2 right-2">
                                                                <CheckCircle2 className="h-4 w-4" style={{ color: s.color }} />
                                                            </div>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Severity Selector */}
                                    <div>
                                        <label className="block text-xs font-medium text-[#a3a3a3] uppercase tracking-wider mb-3">Severity Level</label>
                                        <div className="flex gap-2">
                                            {SEVERITIES.map((s) => (
                                                <button
                                                    key={s.id}
                                                    onClick={() => setSelectedSeverity(s.id)}
                                                    className="flex-1 py-2.5 px-4 rounded-xl text-sm font-medium border transition-all duration-200"
                                                    style={{
                                                        background: selectedSeverity === s.id ? s.bg : "#171717",
                                                        borderColor: selectedSeverity === s.id ? `${s.color}60` : "#262626",
                                                        color: selectedSeverity === s.id ? s.color : "#a3a3a3",
                                                    }}
                                                >
                                                    {s.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Custom Message */}
                                    <div>
                                        <label className="block text-xs font-medium text-[#a3a3a3] uppercase tracking-wider mb-2">Custom Message <span className="text-[#525252]">(optional)</span></label>
                                        <textarea
                                            value={customMessage}
                                            onChange={(e) => setCustomMessage(e.target.value)}
                                            placeholder="Override the default alert description..."
                                            rows={2}
                                            className="w-full bg-[#171717] border border-[#262626] rounded-xl px-4 py-3 text-sm text-white placeholder-[#525252] resize-none focus:outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669]/30 transition-all"
                                        />
                                    </div>

                                    {/* Context Info */}
                                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[#171717] border border-[#262626]">
                                        <AlertTriangle className="h-3.5 w-3.5 text-[#f59e0b] shrink-0" />
                                        <p className="text-[11px] text-[#a3a3a3]">
                                            A real email will be sent to <span className="text-white font-medium">{company?.email || "your registered email"}</span>
                                        </p>
                                    </div>
                                </>
                            ) : (
                                /* ─── Success Result ─── */
                                <div className="text-center py-4">
                                    <div className="flex items-center justify-center w-16 h-16 rounded-full mx-auto mb-4" style={{ background: "rgba(16, 185, 129, 0.15)" }}>
                                        <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-white mb-1">Simulation Sent!</h3>
                                    <p className="text-sm text-[#a3a3a3] mb-6">The alert email has been delivered.</p>

                                    <div className="space-y-3 text-left">
                                        <div className="flex justify-between items-center px-4 py-3 bg-[#171717] rounded-xl border border-[#262626]">
                                            <span className="text-xs text-[#737373] uppercase tracking-wider">Sent To</span>
                                            <span className="text-sm text-white font-medium">{result.sentTo}</span>
                                        </div>
                                        <div className="flex justify-between items-center px-4 py-3 bg-[#171717] rounded-xl border border-[#262626]">
                                            <span className="text-xs text-[#737373] uppercase tracking-wider">AI Model</span>
                                            <span className="text-sm text-white font-medium capitalize">{result.generatedBy}</span>
                                        </div>
                                        <div className="flex justify-between items-center px-4 py-3 bg-[#171717] rounded-xl border border-[#262626]">
                                            <span className="text-xs text-[#737373] uppercase tracking-wider">Generation Time</span>
                                            <span className="text-sm font-medium" style={{ color: result.generationTimeMs < 1000 ? "#10b981" : "#f59e0b" }}>
                                                {result.generationTimeMs}ms
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center px-4 py-3 bg-[#171717] rounded-xl border border-[#262626]">
                                            <span className="text-xs text-[#737373] uppercase tracking-wider">Total Time</span>
                                            <span className="text-sm font-medium text-white">{result.totalTimeMs}ms</span>
                                        </div>
                                        <div className="flex justify-between items-center px-4 py-3 bg-[#171717] rounded-xl border border-[#262626]">
                                            <span className="text-xs text-[#737373] uppercase tracking-wider">Remaining</span>
                                            <span className="text-sm text-white font-medium">{result.simulationsRemaining}/5 this hour</span>
                                        </div>
                                    </div>

                                    <p className="text-[11px] text-[#525252] mt-5">Subject: {result.emailSubject}</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-[#262626] flex justify-end gap-3">
                            {!result ? (
                                <>
                                    <button
                                        onClick={closeModal}
                                        className="px-4 py-2.5 rounded-xl text-sm font-medium text-[#a3a3a3] hover:text-white bg-[#171717] border border-[#262626] hover:border-[#404040] transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSimulate}
                                        disabled={!selectedScenario || isSimulating}
                                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                        style={{
                                            background: selectedScenario
                                                ? "linear-gradient(135deg, #059669, #0d9488)"
                                                : "#262626",
                                            boxShadow: selectedScenario && !isSimulating
                                                ? "0 4px 20px rgba(5, 150, 105, 0.3)"
                                                : "none",
                                        }}
                                    >
                                        {isSimulating ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Generating...
                                            </>
                                        ) : (
                                            <>
                                                <Send className="h-4 w-4" />
                                                Trigger Simulation
                                            </>
                                        )}
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={closeModal}
                                    className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
                                    style={{ background: "linear-gradient(135deg, #059669, #0d9488)" }}
                                >
                                    Done
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Animations ─────────────────────────────────── */}
            <style>{`
        @keyframes fab-pulse {
          0% { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modal-slide-up {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
        </>
    );
}
