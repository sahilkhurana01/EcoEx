/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef } from "react";
import { Bell, CheckCheck, Clock, AlertTriangle, Factory, Zap, Package, DollarSign, Shield, Leaf, ExternalLink } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { useNavigate } from "react-router-dom";

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

function timeAgo(dateStr: string): string {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return "just now";
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

export function AlertBell() {
    const [isOpen, setIsOpen] = useState(false);
    const [alerts, setAlerts] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { company } = useAuthStore();
    const navigate = useNavigate();

    // Fetch recent alerts
    const fetchAlerts = async () => {
        if (!company) return;
        try {
            const response: any = await api.get("/alerts/recent");
            if (response.success) {
                setAlerts(response.data.alerts || []);
                setUnreadCount(response.data.unreadCount || 0);
            }
        } catch {
            // silently fail
        }
    };

    // Poll every 30 seconds
    useEffect(() => {
        if (!company?.id) return;

        fetchAlerts();

        const interval = setInterval(() => {
            fetchAlerts();
        }, 30000);

        return () => {
            clearInterval(interval);
        };
    }, [company?.id]); // Use primitive ID to avoid object identity issues

    // Close on outside click
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [isOpen]);

    const handleMarkAllRead = async () => {
        setIsLoading(true);
        try {
            await api.put("/alerts/acknowledge-all");
            setUnreadCount(0);
            setAlerts((prev) => prev.map((a) => ({ ...a, status: "acknowledged", acknowledgedAt: new Date().toISOString() })));
        } catch {
            // silently fail
        } finally {
            setIsLoading(false);
        }
    };

    const handleAlertClick = async (alert: any) => {
        // Acknowledge if unread
        if (!alert.acknowledgedAt) {
            try {
                await api.put(`/alerts/${alert._id}/acknowledge`);
                setAlerts((prev) =>
                    prev.map((a) =>
                        a._id === alert._id ? { ...a, status: "acknowledged", acknowledgedAt: new Date().toISOString() } : a
                    )
                );
                setUnreadCount((c) => Math.max(0, c - 1));
            } catch {
                // silently fail
            }
        }
        setIsOpen(false);
        navigate("/alerts");
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                id="alert-bell"
                onClick={() => { setIsOpen(!isOpen); if (!isOpen) fetchAlerts(); }}
                className="relative p-2 rounded-lg text-[#a3a3a3] hover:text-white hover:bg-[#262626] transition-all duration-200"
            >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                    <span
                        className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-bold text-white px-1"
                        style={{
                            background: "linear-gradient(135deg, #ef4444, #dc2626)",
                            animation: "bell-bounce 0.3s ease-out",
                            boxShadow: "0 2px 8px rgba(239, 68, 68, 0.4)",
                        }}
                    >
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div
                    className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] max-w-[360px] bg-[#0f0f0f] border border-[#262626] rounded-2xl shadow-2xl overflow-hidden z-50"
                    style={{ animation: "dropdown-slide 0.2s ease-out" }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-[#262626]">
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-white">Alerts</h3>
                            {unreadCount > 0 && (
                                <span className="text-[10px] font-semibold text-white px-1.5 py-0.5 rounded-full" style={{ background: "rgba(239, 68, 68, 0.2)", color: "#ef4444" }}>
                                    {unreadCount} new
                                </span>
                            )}
                        </div>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                disabled={isLoading}
                                className="flex items-center gap-1 text-[11px] font-medium text-[#059669] hover:text-[#10b981] transition-colors"
                            >
                                <CheckCheck className="h-3 w-3" />
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* Alert List */}
                    <div className="max-h-[400px] overflow-y-auto">
                        {alerts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 px-4">
                                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#171717] mb-3">
                                    <Bell className="h-5 w-5 text-[#525252]" />
                                </div>
                                <p className="text-sm text-[#737373]">No alerts yet</p>
                                <p className="text-[11px] text-[#525252] mt-1">Use the simulation button to trigger one</p>
                            </div>
                        ) : (
                            alerts.map((alert: any) => {
                                const catConfig = CATEGORY_CONFIG[alert.category] || CATEGORY_CONFIG.carbon;
                                const CatIcon = catConfig.icon;
                                const isUnread = !alert.acknowledgedAt;
                                const sevColor = SEVERITY_COLORS[alert.severity] || "#eab308";

                                return (
                                    <button
                                        key={alert._id}
                                        onClick={() => handleAlertClick(alert)}
                                        className="w-full flex items-start gap-3 px-4 py-3 hover:bg-[#171717] transition-colors text-left border-b border-[#1a1a1a] last:border-0"
                                    >
                                        {/* Icon */}
                                        <div
                                            className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0 mt-0.5"
                                            style={{ background: `${catConfig.color}15` }}
                                        >
                                            <CatIcon className="h-4 w-4" style={{ color: catConfig.color }} />
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className={`text-sm leading-tight truncate ${isUnread ? "font-semibold text-white" : "text-[#a3a3a3]"}`}>
                                                    {alert.title}
                                                </p>
                                                {alert.simulated && (
                                                    <span className="text-[9px] font-semibold text-[#3b82f6] bg-[#3b82f6]/10 px-1.5 py-0.5 rounded shrink-0">SIM</span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-[#737373] mt-0.5 truncate">
                                                {alert.metric}: {alert.currentValue?.toLocaleString()} {alert.unit}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1.5">
                                                <span
                                                    className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded"
                                                    style={{ color: sevColor, background: `${sevColor}15` }}
                                                >
                                                    {alert.severity}
                                                </span>
                                                <span className="flex items-center gap-1 text-[10px] text-[#525252]">
                                                    <Clock className="h-2.5 w-2.5" />
                                                    {timeAgo(alert.createdAt)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Unread dot */}
                                        {isUnread && (
                                            <div className="w-2 h-2 rounded-full bg-[#059669] shrink-0 mt-2" />
                                        )}
                                    </button>
                                );
                            })
                        )}
                    </div>

                    {/* Footer */}
                    {alerts.length > 0 && (
                        <div className="border-t border-[#262626] px-4 py-2.5">
                            <button
                                onClick={() => { setIsOpen(false); navigate("/alerts"); }}
                                className="flex items-center justify-center gap-1.5 w-full text-xs font-medium text-[#059669] hover:text-[#10b981] transition-colors py-1"
                            >
                                View All Alerts
                                <ExternalLink className="h-3 w-3" />
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Animations */}
            <style>{`
        @keyframes bell-bounce {
          0% { transform: scale(0); }
          60% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        @keyframes dropdown-slide {
          from { opacity: 0; transform: translateY(-8px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
        </div>
    );
}
