/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    FileText, RefreshCw, Download, Share2, Loader2, AlertTriangle,
    CheckCircle2, Clock, Shield, Zap, Droplets, Flame, Recycle,
    TrendingUp, TrendingDown, Minus, ExternalLink, Copy, ChevronDown, ChevronUp,
    Activity, Globe, Leaf,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/lib/api";
import { toast } from "sonner";
import jsPDF from "jspdf";

// ════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════

interface FrameworkSection {
    code: string;
    name: string;
    status: "complete" | "partial" | "missing";
    value: string | number | null;
    unit?: string;
    source?: string;
    confidence?: number;
    description?: string;
}

interface LiveDocData {
    company: { id: string; name: string; industry: string; location: any; iso14001: string; totalEmployees: number };
    reportingPeriod: { start: string; end: string };
    lastUpdated: string;
    versionHash: string;
    emissions: { totalCo2e: number; scope1: number; scope2: number; scope3: number; breakdown: any; trendDirection: string; annualProjection: any; forecasts: any[] };
    wasteMetrics: { totalWasteKg: number; diversionRate: number; streamCount: number };
    water: { monthlyConsumptionKl: number; recyclingPercentage: number };
    energy: { avgMonthlyKwh: number; renewablePercentage: number };
    frameworks: Record<string, { sections: FrameworkSection[]; score: number }>;
    overallScore: number;
    topSuggestions: any[];
    circularEconomy: { activeListings: number; completedExchanges: number; totalMatches: number };
    riskFlags: Array<{ level: "red" | "yellow" | "green"; metric: string; message: string }>;
    executiveSummary?: string;
}

const FRAMEWORKS = ["GRI", "SASB", "TCFD", "BRSR"] as const;
type Framework = typeof FRAMEWORKS[number];

// ════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════

const statusIcon = (status: string) => {
    if (status === "complete") return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
    if (status === "partial") return <Clock className="h-4 w-4 text-amber-400" />;
    return <AlertTriangle className="h-4 w-4 text-red-400" />;
};

const flagColor = (level: string) => {
    if (level === "red") return "border-red-500/30 bg-red-500/5 text-red-400";
    if (level === "yellow") return "border-amber-500/30 bg-amber-500/5 text-amber-400";
    return "border-emerald-500/30 bg-emerald-500/5 text-emerald-400";
};

const trendIcon = (dir: string) => {
    if (dir === "improving") return <TrendingDown className="h-4 w-4 text-emerald-400" />;
    if (dir === "worsening") return <TrendingUp className="h-4 w-4 text-red-400" />;
    return <Minus className="h-4 w-4 text-zinc-400" />;
};

function formatTimestamp(iso: string) {
    return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "medium" });
}

// ════════════════════════════════════════════
// PDF EXPORT
// ════════════════════════════════════════════

function exportLivePDF(data: LiveDocData) {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const m = 18;
    let y = 0;

    // Header
    doc.setFillColor(13, 59, 54);
    doc.rect(0, 0, pw, 45, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("ALIVE ESG DOCUMENT", m, 18);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(data.company.name, m, 27);
    doc.setFontSize(8);
    doc.text(`Generated: ${new Date().toLocaleString("en-IN")}  |  Hash: ${data.versionHash}`, m, 37);
    doc.text(`Overall Score: ${data.overallScore}%`, pw - m - 40, 37);
    y = 55;

    // Summary
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Executive Summary", m, y); y += 8;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    const summaryLines = doc.splitTextToSize(data.executiveSummary || "No summary available.", pw - m * 2);
    doc.text(summaryLines, m, y); y += summaryLines.length * 4.5 + 8;

    // Emissions
    doc.setTextColor(16, 185, 129);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Emissions Overview", m, y); y += 7;
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Total CO₂e: ${data.emissions.totalCo2e.toLocaleString()} kg/month`, m, y); y += 5;
    doc.text(`Scope 1: ${data.emissions.scope1.toLocaleString()} kg  |  Scope 2: ${data.emissions.scope2.toLocaleString()} kg  |  Scope 3: ${data.emissions.scope3.toLocaleString()} kg`, m, y); y += 5;
    doc.text(`Trend: ${data.emissions.trendDirection}`, m, y); y += 10;

    // Framework scores
    doc.setTextColor(16, 185, 129);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Framework Compliance Scores", m, y); y += 7;
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    FRAMEWORKS.forEach(fw => {
        const fwData = data.frameworks[fw];
        if (fwData) {
            doc.text(`${fw}: ${fwData.score}% — ${fwData.sections.filter(s => s.status === 'complete').length}/${fwData.sections.length} complete`, m, y);
            y += 5;
        }
    });
    y += 5;

    // Framework detail table for GRI
    const gri = data.frameworks.GRI;
    if (gri) {
        if (y > ph - 60) { doc.addPage(); y = m; }
        doc.setTextColor(16, 185, 129);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("GRI Standards Detail", m, y); y += 7;
        doc.setTextColor(40, 40, 40);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        gri.sections.forEach(s => {
            if (y > ph - 15) { doc.addPage(); y = m; }
            const statusSymbol = s.status === 'complete' ? '✓' : s.status === 'partial' ? '◐' : '✗';
            doc.text(`${statusSymbol} ${s.code} — ${s.name}: ${s.value !== null ? `${s.value} ${s.unit || ''}` : 'No data'}`, m, y);
            y += 4.5;
        });
    }

    // Footer on all pages
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(160, 160, 160);
        doc.text(`EcoExchange AI · ALIVE DOCUMENT · ${data.company.name} · Confidential`, m, ph - 8);
        doc.text(`Page ${i}/${totalPages}`, pw - m - 15, ph - 8);
    }

    doc.save(`${data.company.name.replace(/\s+/g, '_')}_ALIVE_ESG_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ════════════════════════════════════════════
// SECTION ROW COMPONENT
// ════════════════════════════════════════════

function SectionRow({ section }: { section: FrameworkSection }) {
    const [expanded, setExpanded] = useState(false);
    return (
        <div className="border-b border-border/30 last:border-0">
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors text-left"
            >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    {statusIcon(section.status)}
                    <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-mono font-bold text-primary/70 mr-2">{section.code}</span>
                        <span className="text-xs font-medium text-foreground">{section.name}</span>
                    </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    {section.value !== null ? (
                        <span className="text-xs font-mono font-bold text-foreground tabular-nums">
                            {typeof section.value === 'number' ? section.value.toLocaleString() : section.value}
                            {section.unit && <span className="text-muted-foreground ml-1 font-normal">{section.unit}</span>}
                        </span>
                    ) : (
                        <span className="text-[10px] text-red-400/70 font-medium">No data</span>
                    )}
                    {expanded ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
                </div>
            </button>
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-3 pt-0 grid grid-cols-2 sm:grid-cols-3 gap-3">
                            <div className="text-[10px]">
                                <span className="text-muted-foreground block">Source</span>
                                <span className="text-foreground font-medium">{section.source || "—"}</span>
                            </div>
                            <div className="text-[10px]">
                                <span className="text-muted-foreground block">Confidence</span>
                                <div className="flex items-center gap-1.5">
                                    <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                                        <div className="h-full rounded-full" style={{ width: `${section.confidence || 0}%`, background: (section.confidence || 0) > 70 ? '#10b981' : (section.confidence || 0) > 40 ? '#f59e0b' : '#ef4444' }} />
                                    </div>
                                    <span className="text-foreground font-mono font-bold">{section.confidence || 0}%</span>
                                </div>
                            </div>
                            {section.description && (
                                <div className="text-[10px] col-span-2 sm:col-span-1">
                                    <span className="text-muted-foreground block">Detail</span>
                                    <span className="text-foreground/80">{section.description}</span>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════

export default function LiveDocument() {
    const { company } = useAuthStore();
    const [data, setData] = useState<LiveDocData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeFramework, setActiveFramework] = useState<Framework>("GRI");
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [sseStatus, setSseStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
    const eventSourceRef = useRef<EventSource | null>(null);

    // Fetch initial data
    const fetchData = useCallback(async () => {
        if (!company?.id) return;
        try {
            const res: any = await api.get(`/esg-live/${company.id}`);
            setData(res.data);
            setLastUpdate(new Date());
            setLoading(false);
        } catch (err) {
            console.error("Failed to load live document:", err);
            setLoading(false);
        }
    }, [company?.id]);

    // SSE connection
    useEffect(() => {
        if (!company?.id) return;
        fetchData();

        const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
        const es = new EventSource(`${baseUrl}/esg-live/${company.id}/stream`);
        eventSourceRef.current = es;

        es.onopen = () => setSseStatus("connected");
        es.onmessage = (event) => {
            try {
                const parsed = JSON.parse(event.data);
                if (!parsed.error) {
                    setData(prev => ({ ...(prev || {} as any), ...parsed }));
                    setLastUpdate(new Date());
                }
            } catch { /* ignore parse errors */ }
        };
        es.onerror = () => setSseStatus("disconnected");

        return () => { es.close(); eventSourceRef.current = null; };
    }, [company?.id, fetchData]);

    const handleRefresh = async () => {
        if (!company?.id || refreshing) return;
        setRefreshing(true);
        try {
            const res: any = await api.post(`/esg-live/${company.id}/refresh`);
            setData(res.data);
            setLastUpdate(new Date());
            toast.success("Document refreshed with latest data");
        } catch {
            toast.error("Refresh failed");
        } finally {
            setRefreshing(false);
        }
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(`${window.location.origin}/live/${company?.id}`);
        toast.success("Live document link copied!");
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground animate-pulse">Loading live document...</p>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center space-y-3">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">Unable to load live document. Please try again.</p>
                    <Button onClick={fetchData} variant="outline" size="sm">Retry</Button>
                </div>
            </div>
        );
    }

    const fw = data.frameworks[activeFramework];

    return (
        <div className="space-y-6 max-w-[1100px] pb-12">
            {/* ── Hero Banner ────────────────────────── */}
            <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/[0.06] via-background to-background p-6 sm:p-8"
            >
                {/* Version hash watermark */}
                <div className="absolute top-4 right-4 flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${sseStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : sseStatus === 'connecting' ? 'bg-amber-400 animate-pulse' : 'bg-red-400'}`} />
                    <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">
                        {sseStatus === 'connected' ? 'LIVE' : sseStatus === 'connecting' ? 'CONNECTING' : 'OFFLINE'}
                    </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center">
                                <FileText className="h-4 w-4 text-primary" />
                            </div>
                            <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">ALIVE DOCUMENT</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">{data.company.name}</h1>
                        <p className="text-xs text-muted-foreground mt-1">
                            {data.company.industry.replace(/_/g, " ").toUpperCase()} · {data.company.totalEmployees > 0 ? `${data.company.totalEmployees} employees` : "—"} · {data.company.location?.city || "India"}
                        </p>
                        {lastUpdate && (
                            <p className="text-[10px] text-muted-foreground/60 mt-2 font-mono">
                                Last synced: {formatTimestamp(lastUpdate.toISOString())} · v:{data.versionHash}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs h-9" onClick={handleRefresh} disabled={refreshing}>
                            {refreshing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                            Refresh
                        </Button>
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs h-9" onClick={handleCopyLink}>
                            <Share2 className="h-3 w-3" /> Share
                        </Button>
                        <Button size="sm" className="gap-1.5 text-xs h-9" onClick={() => exportLivePDF(data)}>
                            <Download className="h-3 w-3" /> Export PDF
                        </Button>
                    </div>
                </div>

                {/* Overall Score */}
                <div className="mt-6 flex flex-wrap gap-4">
                    <div className="flex-1 min-w-[140px] p-4 rounded-xl bg-background/80 border border-border/50">
                        <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Overall Compliance</div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-black text-primary tabular-nums">{data.overallScore}</span>
                            <span className="text-sm text-muted-foreground font-bold">%</span>
                        </div>
                    </div>
                    <div className="flex-1 min-w-[140px] p-4 rounded-xl bg-background/80 border border-border/50">
                        <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Monthly CO₂e</div>
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-black text-foreground tabular-nums">{data.emissions.totalCo2e.toLocaleString()}</span>
                            <span className="text-xs text-muted-foreground">kg</span>
                            {trendIcon(data.emissions.trendDirection)}
                        </div>
                    </div>
                    <div className="flex-1 min-w-[110px] p-4 rounded-xl bg-background/80 border border-border/50">
                        <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Waste Diversion</div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-foreground tabular-nums">{Math.round(data.wasteMetrics.diversionRate)}</span>
                            <span className="text-sm text-muted-foreground font-bold">%</span>
                        </div>
                    </div>
                    <div className="flex-1 min-w-[110px] p-4 rounded-xl bg-background/80 border border-border/50">
                        <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Renewable Energy</div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-foreground tabular-nums">{data.energy.renewablePercentage}</span>
                            <span className="text-sm text-muted-foreground font-bold">%</span>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* ── Risk Flags ─────────────────────────── */}
            {data.riskFlags.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex flex-wrap gap-2">
                    {data.riskFlags.map((flag, i) => (
                        <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium ${flagColor(flag.level)}`}>
                            {flag.level === 'red' ? <AlertTriangle className="h-3 w-3 shrink-0" /> : flag.level === 'yellow' ? <Clock className="h-3 w-3 shrink-0" /> : <CheckCircle2 className="h-3 w-3 shrink-0" />}
                            <span className="font-bold">{flag.metric}:</span> {flag.message}
                        </div>
                    ))}
                </motion.div>
            )}

            {/* ── Executive Summary ──────────────────── */}
            {data.executiveSummary && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="industrial-card p-6">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                        <Zap className="h-4 w-4 text-primary" /> AI Executive Summary
                    </h3>
                    <p className="text-sm text-foreground/80 leading-relaxed">{data.executiveSummary}</p>
                    <p className="text-[9px] text-muted-foreground mt-3 font-mono">Generated by Llama 3.3 70B · Source: Live facility data</p>
                </motion.div>
            )}

            {/* ── Emissions Breakdown ────────────────── */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="industrial-card p-6">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-4">
                    <Flame className="h-4 w-4 text-primary" /> Emissions Breakdown
                </h3>
                <div className="grid grid-cols-3 gap-4 mb-5">
                    <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/10 text-center">
                        <div className="text-[9px] text-red-400 font-bold uppercase tracking-wider mb-1">Scope 1</div>
                        <div className="text-xl font-black tabular-nums text-foreground">{data.emissions.scope1.toLocaleString()}</div>
                        <div className="text-[10px] text-muted-foreground">kg CO₂e</div>
                    </div>
                    <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 text-center">
                        <div className="text-[9px] text-amber-400 font-bold uppercase tracking-wider mb-1">Scope 2</div>
                        <div className="text-xl font-black tabular-nums text-foreground">{data.emissions.scope2.toLocaleString()}</div>
                        <div className="text-[10px] text-muted-foreground">kg CO₂e</div>
                    </div>
                    <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/10 text-center">
                        <div className="text-[9px] text-blue-400 font-bold uppercase tracking-wider mb-1">Scope 3</div>
                        <div className="text-xl font-black tabular-nums text-foreground">{data.emissions.scope3.toLocaleString()}</div>
                        <div className="text-[10px] text-muted-foreground">kg CO₂e</div>
                    </div>
                </div>

                {/* Breakdown bar */}
                {data.emissions.totalCo2e > 0 && (
                    <div className="space-y-2">
                        <div className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">Source Attribution</div>
                        <div className="flex h-3 rounded-full overflow-hidden bg-muted/30">
                            {Object.entries(data.emissions.breakdown || {}).filter(([, v]) => (v as number) > 0).map(([key, val], i) => {
                                const pct = ((val as number) / data.emissions.totalCo2e) * 100;
                                const colors = ['bg-red-500', 'bg-amber-500', 'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-pink-500', 'bg-cyan-500', 'bg-orange-500'];
                                return <div key={key} className={`${colors[i % colors.length]} transition-all`} style={{ width: `${pct}%` }} title={`${key}: ${(val as number).toLocaleString()} kg (${pct.toFixed(1)}%)`} />;
                            })}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                            {Object.entries(data.emissions.breakdown || {}).filter(([, v]) => (v as number) > 0).map(([key, val], i) => {
                                const colors = ['text-red-400', 'text-amber-400', 'text-blue-400', 'text-emerald-400', 'text-violet-400', 'text-pink-400', 'text-cyan-400', 'text-orange-400'];
                                return (
                                    <span key={key} className={`text-[10px] font-medium ${colors[i % colors.length]}`}>
                                        {key}: {(val as number).toLocaleString()} kg
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                )}
            </motion.div>

            {/* ── Framework Selector + Compliance Matrix ── */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="industrial-card overflow-hidden">
                <div className="p-5 pb-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Shield className="h-4 w-4 text-primary" /> Framework Compliance Matrix
                    </h3>
                    <div className="flex gap-1.5">
                        {FRAMEWORKS.map((fw) => (
                            <button
                                key={fw}
                                onClick={() => setActiveFramework(fw)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${activeFramework === fw
                                        ? "bg-primary text-primary-foreground shadow-md"
                                        : "bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                    }`}
                            >
                                {fw}
                                <span className="ml-1.5 text-[9px] opacity-70">{data.frameworks[fw]?.score || 0}%</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Score bar */}
                <div className="px-5 py-3">
                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-2.5 rounded-full bg-muted/30 overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${fw?.score || 0}%` }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                                className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-400"
                            />
                        </div>
                        <span className="text-sm font-mono font-black text-primary tabular-nums">{fw?.score || 0}%</span>
                    </div>
                    <div className="flex gap-4 mt-2 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-400" /> {fw?.sections.filter(s => s.status === 'complete').length || 0} Complete</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-amber-400" /> {fw?.sections.filter(s => s.status === 'partial').length || 0} Partial</span>
                        <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-red-400" /> {fw?.sections.filter(s => s.status === 'missing').length || 0} Missing</span>
                    </div>
                </div>

                {/* Sections */}
                <div className="border-t border-border/30">
                    {fw?.sections.map((section) => (
                        <SectionRow key={section.code} section={section} />
                    ))}
                </div>
            </motion.div>

            {/* ── Circular Economy ───────────────────── */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="industrial-card p-6">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-4">
                    <Recycle className="h-4 w-4 text-primary" /> Circular Economy Activity
                </h3>
                <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 rounded-xl bg-muted/20 border border-border/50">
                        <div className="text-2xl font-black text-foreground tabular-nums">{data.circularEconomy.activeListings}</div>
                        <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-1">Active Listings</div>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-muted/20 border border-border/50">
                        <div className="text-2xl font-black text-foreground tabular-nums">{data.circularEconomy.totalMatches}</div>
                        <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-1">Total Matches</div>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                        <div className="text-2xl font-black text-emerald-400 tabular-nums">{data.circularEconomy.completedExchanges}</div>
                        <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-1">Completed</div>
                    </div>
                </div>
            </motion.div>

            {/* ── AI Suggestions ─────────────────────── */}
            {data.topSuggestions.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="industrial-card p-6">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-4">
                        <Leaf className="h-4 w-4 text-primary" /> Top AI Recommendations
                    </h3>
                    <div className="space-y-3">
                        {data.topSuggestions.map((s, i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/50">
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-foreground truncate">{s.title}</p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">{s.category.replace(/_/g, ' ')}</p>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    {s.annualSavings?.inr > 0 && <span className="text-[10px] font-mono text-emerald-400 font-bold">₹{(s.annualSavings.inr / 100000).toFixed(1)}L/yr</span>}
                                    <Badge variant="outline" className="text-[9px] bg-primary/10 text-primary border-primary/20 font-bold">{s.impactScore}/100</Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* ── Audit Trail Footer ─────────────────── */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] text-muted-foreground/60 font-mono px-2">
                <div className="flex items-center gap-2">
                    <Shield className="h-3 w-3" />
                    Document Hash: {data.versionHash} · SHA-256 Anchored
                </div>
                <div>
                    EcoExchange AI · Alive Document v1.0 · Data refreshed in real-time
                </div>
            </motion.div>
        </div>
    );
}
