/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import {
    Bell, Filter, ChevronLeft, ChevronRight, CheckCircle2, Clock,
    Factory, Zap, Package, DollarSign, Shield, Leaf, Eye, Mail,
    AlertTriangle, RefreshCw, Search
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";

const CATEGORY_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
    carbon: { icon: Factory, color: "#ef4444", label: "Carbon" },
    energy: { icon: Zap, color: "#f97316", label: "Energy" },
    waste: { icon: Package, color: "#8b5cf6", label: "Waste" },
    cost: { icon: DollarSign, color: "#eab308", label: "Cost" },
    compliance: { icon: Shield, color: "#3b82f6", label: "Compliance" },
};

const SEVERITY_COLORS: Record<string, string> = {
    critical: "#ef4444",
    high: "#f97316",
    medium: "#eab308",
};

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
    monitoring: { color: "#6366f1", label: "Monitoring" },
    triggered: { color: "#f97316", label: "Triggered" },
    processing: { color: "#8b5cf6", label: "Processing" },
    sent: { color: "#3b82f6", label: "Sent" },
    acknowledged: { color: "#10b981", label: "Acknowledged" },
    resolved: { color: "#525252", label: "Resolved" },
};

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export default function AlertsPage() {
    const [alerts, setAlerts] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedAlert, setSelectedAlert] = useState<any>(null);

    // Filters
    const [categoryFilter, setCategoryFilter] = useState("");
    const [severityFilter, setSeverityFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");

    const { company } = useAuthStore();

    const fetchAlerts = async () => {
        setIsLoading(true);
        try {
            const params: any = { page, limit: 15 };
            if (categoryFilter) params.category = categoryFilter;
            if (severityFilter) params.severity = severityFilter;
            if (statusFilter) params.status = statusFilter;

            const response: any = await api.get("/alerts/history", { params });
            if (response.success) {
                setAlerts(response.data.alerts || []);
                setTotal(response.data.total || 0);
                setPages(response.data.pages || 1);
            }
        } catch {
            toast.error("Failed to load alert history");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAlerts();
    }, [page, categoryFilter, severityFilter, statusFilter]);

    const handleAcknowledge = async (alertId: string) => {
        try {
            await api.put(`/alerts/${alertId}/acknowledge`);
            setAlerts((prev) =>
                prev.map((a) =>
                    a._id === alertId ? { ...a, status: "acknowledged", acknowledgedAt: new Date().toISOString() } : a
                )
            );
            if (selectedAlert?._id === alertId) {
                setSelectedAlert((prev: any) => ({ ...prev, status: "acknowledged", acknowledgedAt: new Date().toISOString() }));
            }
            toast.success("Alert acknowledged");
        } catch {
            toast.error("Failed to acknowledge alert");
        }
    };

    const handleReSimulate = async (alert: any) => {
        try {
            const response: any = await api.post("/alerts/simulate", {
                alertType: alert.alertType,
                severity: alert.severity,
            });
            toast.success(`Re-simulation sent to ${response.data.sentTo}`, {
                description: `Generated in ${response.data.generationTimeMs}ms`,
            });
            fetchAlerts();
        } catch (error: any) {
            toast.error(error?.error || "Re-simulation failed");
        }
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl" style={{ background: "linear-gradient(135deg, #059669, #0d9488)" }}>
                            <Bell className="h-5 w-5 text-white" />
                        </div>
                        Alert History
                    </h1>
                    <p className="text-sm text-[#737373] mt-1">
                        {total} total alerts · Real-time threshold monitoring & AI-powered notifications
                    </p>
                </div>
                <button
                    onClick={fetchAlerts}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-[#171717] border border-[#262626] hover:border-[#404040] transition-all"
                >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                    Refresh
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-[#525252]" />
                    <span className="text-xs text-[#737373] font-medium uppercase tracking-wider">Filters:</span>
                </div>

                <select
                    value={categoryFilter}
                    onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
                    className="bg-[#171717] border border-[#262626] text-sm text-white rounded-xl px-3 py-2 focus:outline-none focus:border-[#059669]"
                >
                    <option value="">All Categories</option>
                    {Object.entries(CATEGORY_CONFIG).map(([key, val]) => (
                        <option key={key} value={key}>{val.label}</option>
                    ))}
                </select>

                <select
                    value={severityFilter}
                    onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }}
                    className="bg-[#171717] border border-[#262626] text-sm text-white rounded-xl px-3 py-2 focus:outline-none focus:border-[#059669]"
                >
                    <option value="">All Severities</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                </select>

                <select
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                    className="bg-[#171717] border border-[#262626] text-sm text-white rounded-xl px-3 py-2 focus:outline-none focus:border-[#059669]"
                >
                    <option value="">All Statuses</option>
                    {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                        <option key={key} value={key}>{val.label}</option>
                    ))}
                </select>

                {(categoryFilter || severityFilter || statusFilter) && (
                    <button
                        onClick={() => { setCategoryFilter(""); setSeverityFilter(""); setStatusFilter(""); setPage(1); }}
                        className="text-xs text-[#ef4444] hover:text-[#f87171] transition-colors px-2"
                    >
                        Clear All
                    </button>
                )}
            </div>

            {/* Main content */}
            <div className="flex gap-6">
                {/* Alert Table */}
                <div className="flex-1">
                    <div className="bg-[#0f0f0f] border border-[#262626] rounded-2xl overflow-hidden">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-20">
                                <RefreshCw className="h-6 w-6 text-[#525252] animate-spin" />
                            </div>
                        ) : alerts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20">
                                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-[#171717] mb-4">
                                    <Search className="h-7 w-7 text-[#525252]" />
                                </div>
                                <p className="text-[#737373] font-medium">No alerts found</p>
                                <p className="text-xs text-[#525252] mt-1">Try adjusting your filters or trigger a simulation</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-[#1a1a1a]">
                                {alerts.map((alert: any) => {
                                    const catConfig = CATEGORY_CONFIG[alert.category] || CATEGORY_CONFIG.carbon;
                                    const CatIcon = catConfig.icon;
                                    const sevColor = SEVERITY_COLORS[alert.severity] || "#eab308";
                                    const statConfig = STATUS_CONFIG[alert.status] || STATUS_CONFIG.triggered;
                                    const isSelected = selectedAlert?._id === alert._id;

                                    return (
                                        <button
                                            key={alert._id}
                                            onClick={() => setSelectedAlert(alert)}
                                            className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-all hover:bg-[#171717] ${isSelected ? "bg-[#171717] border-l-2" : "border-l-2 border-transparent"
                                                }`}
                                            style={isSelected ? { borderLeftColor: catConfig.color } : {}}
                                        >
                                            {/* Icon */}
                                            <div
                                                className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0"
                                                style={{ background: `${catConfig.color}15` }}
                                            >
                                                <CatIcon className="h-5 w-5" style={{ color: catConfig.color }} />
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <p className="text-sm font-medium text-white truncate">{alert.title}</p>
                                                    {alert.simulated && (
                                                        <span className="text-[9px] font-semibold text-[#3b82f6] bg-[#3b82f6]/10 px-1.5 py-0.5 rounded shrink-0">SIM</span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-[#737373]">
                                                    {alert.metric}: <span className="text-white font-medium">{alert.currentValue?.toLocaleString()}</span> {alert.unit}
                                                    <span className="text-[#525252] mx-1.5">·</span>
                                                    <span style={{ color: sevColor }}>{alert.severity}</span>
                                                </p>
                                            </div>

                                            {/* Status & Date */}
                                            <div className="text-right shrink-0">
                                                <span
                                                    className="inline-block text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full tracking-wider"
                                                    style={{ color: statConfig.color, background: `${statConfig.color}15` }}
                                                >
                                                    {statConfig.label}
                                                </span>
                                                <p className="text-[10px] text-[#525252] mt-1 flex items-center gap-1 justify-end">
                                                    <Clock className="h-2.5 w-2.5" />
                                                    {formatDate(alert.createdAt)}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Pagination */}
                        {pages > 1 && (
                            <div className="flex items-center justify-between px-5 py-3 border-t border-[#262626]">
                                <p className="text-xs text-[#525252]">
                                    Page {page} of {pages} · {total} total
                                </p>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                                        disabled={page <= 1}
                                        className="p-1.5 rounded-lg text-[#737373] hover:text-white hover:bg-[#262626] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => setPage((p) => Math.min(pages, p + 1))}
                                        disabled={page >= pages}
                                        className="p-1.5 rounded-lg text-[#737373] hover:text-white hover:bg-[#262626] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Detail Panel */}
                {selectedAlert && (
                    <div
                        className="w-[380px] shrink-0 bg-[#0f0f0f] border border-[#262626] rounded-2xl overflow-hidden sticky top-6 self-start"
                        style={{ animation: "modal-slide-up 0.2s ease-out" }}
                    >
                        {/* Detail Header */}
                        <div
                            className="px-5 py-4"
                            style={{ background: `linear-gradient(135deg, ${CATEGORY_CONFIG[selectedAlert.category]?.color || "#059669"}22, transparent)` }}
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <span
                                    className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full tracking-wider"
                                    style={{
                                        color: SEVERITY_COLORS[selectedAlert.severity],
                                        background: `${SEVERITY_COLORS[selectedAlert.severity]}15`,
                                    }}
                                >
                                    {selectedAlert.severity}
                                </span>
                                <span
                                    className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full tracking-wider"
                                    style={{
                                        color: STATUS_CONFIG[selectedAlert.status]?.color,
                                        background: `${STATUS_CONFIG[selectedAlert.status]?.color}15`,
                                    }}
                                >
                                    {STATUS_CONFIG[selectedAlert.status]?.label}
                                </span>
                                {selectedAlert.simulated && (
                                    <span className="text-[9px] font-semibold text-[#3b82f6] bg-[#3b82f6]/10 px-1.5 py-0.5 rounded">SIMULATION</span>
                                )}
                            </div>
                            <h3 className="text-base font-semibold text-white">{selectedAlert.title}</h3>
                            <p className="text-xs text-[#737373] mt-1">{selectedAlert.description}</p>
                        </div>

                        {/* Metric Cards */}
                        <div className="px-5 py-4 space-y-3">
                            <div className="grid grid-cols-3 gap-2">
                                <div className="bg-[#171717] rounded-xl p-3 text-center">
                                    <p className="text-[10px] text-[#737373] uppercase tracking-wider">Current</p>
                                    <p className="text-base font-bold mt-1" style={{ color: SEVERITY_COLORS[selectedAlert.severity] }}>
                                        {selectedAlert.currentValue?.toLocaleString()}
                                    </p>
                                    <p className="text-[10px] text-[#525252]">{selectedAlert.unit}</p>
                                </div>
                                <div className="bg-[#171717] rounded-xl p-3 text-center">
                                    <p className="text-[10px] text-[#737373] uppercase tracking-wider">Threshold</p>
                                    <p className="text-base font-bold text-[#10b981] mt-1">
                                        {selectedAlert.thresholdValue?.toLocaleString()}
                                    </p>
                                    <p className="text-[10px] text-[#525252]">{selectedAlert.unit}</p>
                                </div>
                                <div className="bg-[#171717] rounded-xl p-3 text-center">
                                    <p className="text-[10px] text-[#737373] uppercase tracking-wider">Exceeded</p>
                                    <p className="text-base font-bold mt-1" style={{ color: SEVERITY_COLORS[selectedAlert.severity] }}>
                                        +{selectedAlert.percentageExceeded}%
                                    </p>
                                </div>
                            </div>

                            {/* Context */}
                            {selectedAlert.context && (
                                <div className="bg-[#171717] rounded-xl p-4 space-y-2">
                                    <h4 className="text-xs font-medium text-[#a3a3a3] uppercase tracking-wider">Context</h4>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-[#737373]">30-day Average</span>
                                        <span className="text-white">{selectedAlert.context.thirtyDayAvg?.toLocaleString()} {selectedAlert.unit}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-[#737373]">Last Month</span>
                                        <span className="text-white">{selectedAlert.context.lastMonthValue?.toLocaleString()} {selectedAlert.unit}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-[#737373]">Trend</span>
                                        <span className="text-white capitalize">{selectedAlert.context.trend}</span>
                                    </div>
                                    {selectedAlert.context.industryPercentile && (
                                        <div className="flex justify-between text-xs">
                                            <span className="text-[#737373]">Industry %ile</span>
                                            <span className="text-white">{selectedAlert.context.industryPercentile}th</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* AI Info */}
                            {selectedAlert.aiContent && (
                                <div className="bg-[#171717] rounded-xl p-4 space-y-2">
                                    <h4 className="text-xs font-medium text-[#a3a3a3] uppercase tracking-wider">AI Generation</h4>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-[#737373]">Model</span>
                                        <span className="text-white capitalize">{selectedAlert.aiContent.generatedBy}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-[#737373]">Generation Time</span>
                                        <span className="font-medium" style={{ color: (selectedAlert.aiContent.generationTimeMs || 0) < 1000 ? "#10b981" : "#f59e0b" }}>
                                            {selectedAlert.aiContent.generationTimeMs}ms
                                        </span>
                                    </div>
                                    {selectedAlert.aiContent.subject && (
                                        <div className="mt-2 pt-2 border-t border-[#262626]">
                                            <p className="text-[10px] text-[#525252] uppercase tracking-wider mb-1">Email Subject</p>
                                            <p className="text-xs text-white">{selectedAlert.aiContent.subject}</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Email Delivery */}
                            {selectedAlert.emailDelivery?.sentTo && (
                                <div className="bg-[#171717] rounded-xl p-4 space-y-2">
                                    <h4 className="text-xs font-medium text-[#a3a3a3] uppercase tracking-wider flex items-center gap-1.5">
                                        <Mail className="h-3 w-3" /> Delivery
                                    </h4>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-[#737373]">Sent To</span>
                                        <span className="text-white">{selectedAlert.emailDelivery.sentTo}</span>
                                    </div>
                                    {selectedAlert.emailDelivery.sentAt && (
                                        <div className="flex justify-between text-xs">
                                            <span className="text-[#737373]">Sent At</span>
                                            <span className="text-white">{formatDate(selectedAlert.emailDelivery.sentAt)}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="px-5 py-4 border-t border-[#262626] flex gap-2">
                            {!selectedAlert.acknowledgedAt && (
                                <button
                                    onClick={() => handleAcknowledge(selectedAlert._id)}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-white transition-all"
                                    style={{ background: "linear-gradient(135deg, #059669, #0d9488)" }}
                                >
                                    <CheckCircle2 className="h-4 w-4" />
                                    Acknowledge
                                </button>
                            )}
                            <button
                                onClick={() => handleReSimulate(selectedAlert)}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-[#a3a3a3] bg-[#171717] border border-[#262626] hover:border-[#404040] hover:text-white transition-all"
                            >
                                <RefreshCw className="h-4 w-4" />
                                Re-simulate
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Animations */}
            <style>{`
        @keyframes modal-slide-up {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
        </div>
    );
}
