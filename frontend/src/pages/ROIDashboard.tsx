import { motion } from "framer-motion";
import {
    IndianRupee,
    TrendingUp,
    Leaf,
    Award,
    ArrowUpRight,
    ArrowDownRight,
    ShieldCheck,
    Zap,
    Activity,
    Download,
    Loader2,
    AlertTriangle,
    Clock,
    Info,
    SlidersHorizontal,
    BarChart3,
    Scale,
    TrendingDown
} from "lucide-react";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from "recharts";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@clerk/clerk-react";

export default function ROIDashboard() {
    const { company } = useAuthStore();
    const { toast } = useToast();
    const { user } = useUser();

    // Scenario Simulation State
    const [scenarioSim, setScenarioSim] = useState({
        electricityPrice: 0,
        fuelPrice: 0,
        production: 0,
        efficiency: 0,
    });

    const [showBenchmark, setShowBenchmark] = useState(false);

    const { data: roiResponse, isLoading, isPending, error } = useQuery({
        queryKey: ['roiDashboard', company?.id],
        queryFn: async () => {
            if (!company?.id) return null;
            const res: any = await api.get(`/roi/${company.id}`);
            if (res.success) return res.data;
            throw new Error(res.error || "Failed to load ROI data");
        },
        enabled: !!company?.id,
    });

    const exportMutation = useMutation({
        mutationFn: async () => {
            const actualEmail = user?.primaryEmailAddress?.emailAddress || company?.email;
            const res: any = await api.post(`/roi/${company?.id}/export`, {
                email: actualEmail
            });
            if (!res.success) throw new Error(res.error);
            return res;
        },
        onSuccess: () => {
            toast({
                title: "Report Exported",
                description: "Your ROI report has been emailed successfully.",
            });
        },
        onError: (err: any) => {
            toast({
                title: "Export Failed",
                description: err.message || "Could not send report email.",
                variant: "destructive",
            });
        }
    });

    if (isLoading || isPending || !company?.id) {
        return (
            <div className="flex flex-col items-center justify-center h-[80vh] gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground animate-pulse">Running Financial Engine...</p>
            </div>
        );
    }

    if (error || !roiResponse) {
        return (
            <div className="flex h-[80vh] flex-col items-center justify-center space-y-4">
                <AlertTriangle className="h-12 w-12 text-destructive" />
                <h2 className="text-xl font-semibold">Dashboard Need Setup</h2>
                <p className="text-sm text-muted-foreground w-1/2 text-center">
                    Incomplete data. Please generate predictions and suggestions first by visiting the Impact Dashboard.
                </p>
            </div>
        );
    }

    const {
        totalCapitalSaved,
        totalCarbonLiabilitiesRemoved,
        portfolioRoi,
        esgRating,
        roiData,
        esgData,
        actions
    } = roiResponse;

    // Calculate Simulated Values
    const getSimulatedSaved = () => {
        let saved = totalCapitalSaved;
        // Basic simulation logic: efficiency increases savings, price hikes increase the *value* of those savings
        saved += saved * (scenarioSim.efficiency / 100);
        saved += saved * ((scenarioSim.electricityPrice + scenarioSim.fuelPrice) / 200);
        return saved;
    };

    const getSimulatedRoi = () => {
        let roi = portfolioRoi;
        // Efficiency improves ROI directly
        roi += roi * (scenarioSim.efficiency / 100);
        // Increased production slightly lowers ROI if not matched with efficiency (simplified)
        roi -= roi * (scenarioSim.production / 200);
        return Math.max(0, roi);
    };

    const simCapitalSaved = getSimulatedSaved();
    const simPortfolioRoi = getSimulatedRoi();

    const handleQuickScenario = () => {
        setScenarioSim(prev => ({ ...prev, electricityPrice: 10 }));
    };

    // Benchmark Calculations
    const getAvgPayback = () => {
        if (!actions || actions.length === 0) return 0;
        const total = actions.reduce((sum: number, act: any) => sum + (act.paybackMonths || 0), 0);
        return parseFloat((total / actions.length).toFixed(1));
    };

    const myAvgPayback = getAvgPayback();
    const industryAvgPayback = 18.0; // Fixed mockup
    const percentBetter = myAvgPayback > 0 ? Math.round(((industryAvgPayback - myAvgPayback) / industryAvgPayback) * 100) : 0;

    return (
        <div className="space-y-8 max-w-[1400px]">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-[10px] font-black uppercase tracking-widest mb-3">
                        <ShieldCheck className="h-3 w-3" />
                        Investor & Board Ready
                    </div>
                    <h1 className="text-3xl font-black text-foreground uppercase tracking-tight">Return on Sustainability</h1>
                    <p className="text-sm text-muted-foreground mt-1 font-medium">Financial and Environmental Yield Analytics</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => exportMutation.mutate()}
                        disabled={exportMutation.isPending}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-sm font-medium disabled:opacity-50"
                        title="Download a comprehensive executive summary of your Return on Sustainability."
                    >
                        {exportMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : <Download className="h-4 w-4 text-muted-foreground" />}
                        Export Report
                    </button>
                    <div className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-teal-500/20 to-emerald-500/20 border border-teal-500/30 flex items-center gap-3">
                        <span className="text-xs text-teal-400 font-bold uppercase tracking-wider flex items-center gap-1" title="Aggregate ROI = Total Operational Savings / Total Capital Expenditure across all active interventions">Portfolio ROI <Info className="h-3 w-3 opacity-70" /></span>
                        <span className="text-xl font-black text-foreground">{simPortfolioRoi > 0 ? `${simPortfolioRoi.toFixed(1)}%` : 'N/A'}</span>
                    </div>
                </div>
            </motion.div>

            {/* Top Value Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="glass-card p-6 rounded-[1.5rem] relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-500">
                        <IndianRupee className="h-24 w-24" />
                    </div>
                    <div className="relative z-10">
                        <div className="h-10 w-10 text-teal-400 bg-teal-500/10 rounded-xl flex items-center justify-center border border-teal-500/20 mb-4">
                            <TrendingUp className="h-5 w-5" />
                        </div>
                        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1" title="Combined projected annual savings based on live sustainability initiatives.">Total Capital Saved <Info className="h-3 w-3 opacity-50" /></p>
                        <div className="flex items-baseline gap-2">
                            <h2 className="text-4xl font-black text-foreground tracking-tighter">₹{(simCapitalSaved / 1000).toFixed(1)}k</h2>
                        </div>
                        <div className="mt-4 flex items-center gap-2 text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full w-fit">
                            <ArrowUpRight className="h-3 w-3" /> Projected Annual Yield
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="glass-card p-6 rounded-[1.5rem] relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-500">
                        <Leaf className="h-24 w-24" />
                    </div>
                    <div className="relative z-10">
                        <div className="h-10 w-10 text-emerald-400 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20 mb-4">
                            <Activity className="h-5 w-5" />
                        </div>
                        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1" title="Aggregated sum of avoided emissions from efficiency scaling.">Carbon Liabilities Removed <Info className="h-3 w-3 opacity-50" /></p>
                        <div className="flex items-baseline gap-2">
                            <h2 className="text-4xl font-black text-foreground tracking-tighter">{totalCarbonLiabilitiesRemoved.toLocaleString()}<span className="text-2xl text-muted-foreground ml-1">kg</span></h2>
                        </div>
                        <div className="mt-4 flex items-center gap-2 text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full w-fit">
                            <ArrowDownRight className="h-3 w-3" /> Projected Annual Avoidance
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="glass-card p-6 rounded-[1.5rem] relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-500">
                        <Award className="h-24 w-24" />
                    </div>
                    <div className="relative z-10">
                        <div className="h-10 w-10 text-blue-400 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20 mb-4">
                            <Zap className="h-5 w-5" />
                        </div>
                        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1" title="System calculated proxy of ESG performance health based on data verifiability.">ESG Rating Index <Info className="h-3 w-3 opacity-50" /></p>
                        <div className="flex items-baseline gap-2">
                            <h2 className="text-4xl font-black text-foreground tracking-tighter">
                                {esgRating >= 85 ? 'A+' : esgRating >= 70 ? 'A' : esgRating >= 50 ? 'B' : 'C'}
                                <span className="text-xl text-emerald-400 ml-1" title="Prediction Confidence Score">({esgRating}/100)</span>
                            </h2>
                        </div>
                        <div className="mt-4 flex items-center gap-2 text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full w-fit">
                            <ShieldCheck className="h-3 w-3" /> Verified by Quality Score
                        </div>
                    </div>
                </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Chart */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="lg:col-span-2 glass-card p-6 rounded-[1.5rem]"
                >
                    <div className="mb-6">
                        <h3 className="text-lg font-black uppercase tracking-tight text-foreground mb-1">Cumulative Financial Yield</h3>
                        <p className="text-xs font-medium text-muted-foreground">Capital expenditure vs operational savings over time.</p>
                    </div>

                    <div className="h-[320px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={roiData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="savingsFill" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(175, 70%, 41%)" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="hsl(175, 70%, 41%)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="month" stroke="rgba(255,255,255,0.3)" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 12 }} tickLine={false} axisLine={false} />
                                <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value / 1000}k`} />
                                <RechartsTooltip
                                    contentStyle={{ backgroundColor: "#050B0B", borderColor: "rgba(255,255,255,0.1)", borderRadius: "12px", boxShadow: "0 10px 40px -10px rgba(0,0,0,0.5)" }}
                                    itemStyle={{ fontSize: "12px", fontWeight: "bold" }}
                                    labelStyle={{ color: "rgba(255,255,255,0.5)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}
                                />
                                <Area type="monotone" dataKey="cumulativeSavings" name="Cumulative Savings" stroke="#2DD4BF" strokeWidth={3} fillOpacity={1} fill="url(#savingsFill)" />
                                <Area type="monotone" dataKey="investment" name="Total Capital Invested" stroke="#64748B" strokeWidth={2} strokeDasharray="4 4" fill="none" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Compact Industry Benchmark Panel */}
                    <div className="mt-6 pt-6 border-t border-white/5 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Industry Comparison</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm font-medium">
                            <div className="flex flex-col">
                                <span className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Your ROI</span>
                                <span className="text-teal-400 font-bold">{simPortfolioRoi.toFixed(1)}%</span>
                            </div>
                            <div className="h-8 w-px bg-white/10" />
                            <div className="flex flex-col">
                                <span className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Industry Avg</span>
                                <span className="text-foreground">142%</span>
                            </div>
                            <div className="h-8 w-px bg-white/10" />
                            <div className="flex flex-col">
                                <span className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Top Quartile</span>
                                <span className="text-foreground">188%</span>
                            </div>
                            <div className="ml-2 px-3 py-1.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                                <Award className="h-3 w-3" />
                                {simPortfolioRoi > 188 ? "Top 20% Performer" : simPortfolioRoi > 142 ? "Above Industry Average" : "Needs Optimization"}
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Radar Chart & Scenario Settings */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="glass-card p-6 rounded-[1.5rem] flex flex-col justify-between"
                >
                    <div>
                        <div className="mb-2">
                            <h3 className="text-lg font-black uppercase tracking-tight text-foreground mb-1">ESG Equilibrium</h3>
                            <p className="text-xs font-medium text-muted-foreground">Performance dimensions vs industry benchmarks.</p>
                        </div>

                        <div className="w-full h-[220px] mt-2 border-b border-white/5 pb-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={esgData}>
                                    <PolarGrid stroke="rgba(255,255,255,0.1)" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 10, fontWeight: 600 }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                    <Radar name="Company" dataKey="A" stroke="#2DD4BF" strokeWidth={2} fill="#2DD4BF" fillOpacity={0.3} />
                                    <RechartsTooltip
                                        contentStyle={{ backgroundColor: "#050B0B", borderColor: "rgba(255,255,255,0.1)", borderRadius: "8px" }}
                                        itemStyle={{ color: "#2DD4BF", fontSize: "12px", fontWeight: "bold" }}
                                    />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Scenario Simulation Quick Panel */}
                    <div className="mt-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <SlidersHorizontal className="h-4 w-4 text-emerald-400" />
                                <span className="text-xs font-black uppercase tracking-widest text-emerald-400">Simulation Engine</span>
                            </div>
                            <button
                                onClick={handleQuickScenario}
                                className="text-[10px] uppercase font-bold tracking-widest bg-white/5 hover:bg-white/10 text-muted-foreground px-2 py-1 rounded transition-colors"
                            >
                                What if +10% Power Cost?
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1 font-medium">
                                    <span>Efficiency Improvement</span>
                                    <span className="text-foreground">+{scenarioSim.efficiency}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0" max="50" step="5"
                                    value={scenarioSim.efficiency}
                                    onChange={(e) => setScenarioSim(p => ({ ...p, efficiency: parseInt(e.target.value) }))}
                                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-teal-500"
                                />
                            </div>
                            <div>
                                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1 font-medium">
                                    <span>Electricity Price Change</span>
                                    <span className="text-foreground">{scenarioSim.electricityPrice > 0 ? '+' : ''}{scenarioSim.electricityPrice}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="-20" max="50" step="5"
                                    value={scenarioSim.electricityPrice}
                                    onChange={(e) => setScenarioSim(p => ({ ...p, electricityPrice: parseInt(e.target.value) }))}
                                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-teal-500"
                                />
                            </div>
                            <div className="pt-2 flex items-center justify-between">
                                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Simulated ROI Result</span>
                                <span className="text-sm font-black text-teal-400">{simPortfolioRoi.toFixed(1)}%</span>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Sustainability Actions Table */}
            <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="glass-card rounded-[1.5rem] overflow-hidden"
            >
                <div className="p-6 border-b border-white/5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h3 className="text-lg font-black uppercase tracking-tight text-foreground mb-1">Strategic Interventions & Payback Engine</h3>
                            <p className="text-xs font-medium text-muted-foreground">Yield analysis of specific suggested sustainability projects.</p>
                        </div>
                        <button
                            onClick={() => setShowBenchmark(!showBenchmark)}
                            className="text-[11px] uppercase font-bold tracking-widest bg-gradient-to-r from-blue-500/10 to-indigo-500/10 hover:from-blue-500/20 hover:to-indigo-500/20 border border-blue-500/20 text-blue-400 px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-2"
                        >
                            <Scale className="h-3.5 w-3.5" />
                            Industry Benchmark
                        </button>
                    </div>

                    {showBenchmark && myAvgPayback > 0 && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mt-6 p-4 rounded-xl bg-[#0a0f12] border border-blue-500/20 flex flex-col md:flex-row items-center gap-6"
                        >
                            <div className="flex-1">
                                <h4 className="text-sm font-black uppercase tracking-widest text-blue-400 mb-2 flex items-center gap-2">
                                    <TrendingDown className="h-4 w-4" /> Payback Period Performance
                                </h4>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Our algorithmic engine predicts that your specific strategic interventions yield a payback timeline that is <strong className="text-foreground">{percentBetter > 0 ? `${percentBetter}% faster` : `${Math.abs(percentBetter)}% slower`}</strong> than the current industry baseline average.
                                </p>
                            </div>
                            <div className="flex items-center gap-8 px-4">
                                <div className="text-center">
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Your Portfolio Avg</p>
                                    <p className="text-2xl font-black text-foreground">{myAvgPayback} <span className="text-sm font-medium text-muted-foreground">Months</span></p>
                                </div>
                                <div className="h-10 w-px bg-white/10 hidden md:block" />
                                <div className="text-center">
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Industry Average</p>
                                    <p className="text-2xl font-black text-muted-foreground">{industryAvgPayback} <span className="text-sm font-medium text-muted-foreground">Months</span></p>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white/[0.02] text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-white/5">
                            <tr>
                                <th className="px-6 py-4">Action Recommended</th>
                                <th className="px-6 py-4">CapEx</th>
                                <th className="px-6 py-4">Annual Return</th>
                                <th className="px-6 py-4">Payback Period</th>
                                <th className="px-6 py-4">ROI</th>
                                <th className="px-6 py-4">Carbon Impact</th>
                                <th className="px-6 py-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {actions.map((row: any, i: number) => (
                                <motion.tr
                                    key={row.id || i}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.6 + (i * 0.1) }}
                                    className="hover:bg-white/[0.02] transition-colors"
                                >
                                    <td className="px-6 py-4 font-semibold text-foreground">{row.action}</td>
                                    <td className="px-6 py-4 text-muted-foreground font-mono">{row.investment}</td>
                                    <td className="px-6 py-4 text-emerald-400 font-mono font-bold">{row.annualReturn}</td>
                                    <td className="px-6 py-4 font-mono font-medium flex items-center gap-1.5 pt-4">
                                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                        {row.paybackMonths > 0 ? `${row.paybackMonths} Months` : "Immediate"}
                                    </td>
                                    <td className="px-6 py-4 font-mono font-bold">
                                        <span className="bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-md border border-emerald-500/20">{row.roi}</span>
                                    </td>
                                    <td className="px-6 py-4 text-muted-foreground font-mono text-xs">{row.carbonImpact}</td>
                                    <td className="px-6 py-4">
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border 
                      ${row.status === 'Completed' ? 'border-teal-500/30 text-teal-400 bg-teal-500/10'
                                                : row.status === 'Active' ? 'border-blue-500/30 text-blue-400 bg-blue-500/10'
                                                    : 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10'}`}>
                                            {row.status}
                                        </span>
                                    </td>
                                </motion.tr>
                            ))}
                            {actions.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground text-sm">
                                        No strategic interventions have been analyzed yet. Check your impact recommendations.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.div>
        </div>
    );
}
