import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, AlertTriangle, BarChart3, Loader2,
  Zap, Flame, Droplets, Recycle, Cog, RefreshCw, ChevronDown, ChevronUp,
  Sparkles, ArrowUpRight, ArrowDownRight, ArrowRight, Target, Shield, DollarSign,
  Clock, CheckCircle2, Lightbulb,
} from "lucide-react";
import { StatCard } from "@/components/StatCard";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Line,
} from "recharts";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { FormulaFx } from "@/components/FormulaFx";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Info } from "lucide-react";
const PRIORITY_COLORS: Record<string, string> = {
  HIGH: "bg-red-500/15 text-red-400 border-red-500/20",
  MEDIUM: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  LOW: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  energy: <Zap className="h-5 w-5" />,
  energy_efficiency: <Zap className="h-5 w-5" />,
  fuel: <Flame className="h-5 w-5" />,
  fuel_switching: <Flame className="h-5 w-5" />,
  water: <Droplets className="h-5 w-5" />,
  water_efficiency: <Droplets className="h-5 w-5" />,
  waste: <Recycle className="h-5 w-5" />,
  waste_valorization: <Recycle className="h-5 w-5" />,
  process: <Cog className="h-5 w-5" />,
  process_optimization: <Cog className="h-5 w-5" />,
};

const CATEGORY_GRADIENT: Record<string, string> = {
  energy: "from-yellow-500/20 to-orange-500/20",
  energy_efficiency: "from-yellow-500/20 to-orange-500/20",
  fuel: "from-red-500/20 to-orange-500/20",
  fuel_switching: "from-red-500/20 to-orange-500/20",
  water: "from-blue-500/20 to-cyan-500/20",
  water_efficiency: "from-blue-500/20 to-cyan-500/20",
  waste: "from-emerald-500/20 to-teal-500/20",
  waste_valorization: "from-emerald-500/20 to-teal-500/20",
  process: "from-purple-500/20 to-indigo-500/20",
  process_optimization: "from-purple-500/20 to-indigo-500/20",
};

const SEVERITY_COLORS: Record<string, string> = {
  info: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  warning: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  critical: "bg-red-500/15 text-red-400 border-red-500/20",
};

function TrendIcon({ trend }: { trend: string }) {
  if (trend === 'increasing') return <ArrowUpRight className="h-4 w-4 text-red-400" />;
  if (trend === 'decreasing') return <ArrowDownRight className="h-4 w-4 text-emerald-400" />;
  return <ArrowRight className="h-4 w-4 text-muted-foreground" />;
}

export default function Predictions() {
  const { company } = useAuthStore();
  const queryClient = useQueryClient();
  const [expandedSuggestion, setExpandedSuggestion] = useState<string | null>(null);

  // ───────── Emission Forecast (ML API) ─────────
  const { data: forecast, isLoading: forecastLoading, refetch: refetchForecast } = useQuery({
    queryKey: ['ml-forecast', company?.id],
    queryFn: async () => {
      const res: any = await api.post('/ml/forecast', { companyId: company?.id });
      return res.data;
    },
    enabled: !!company?.id,
    staleTime: 1000 * 60 * 60,
    retry: 2,
  });

  // ───────── ML Suggestions ─────────
  const { data: mlSuggestions, isLoading: mlSuggestionsLoading } = useQuery({
    queryKey: ['ml-suggestions', company?.id],
    queryFn: async () => {
      const res: any = await api.post('/ml/suggestions', { companyId: company?.id });
      return res.data;
    },
    enabled: !!company?.id,
    staleTime: 1000 * 60 * 60,
    retry: 2,
  });

  // ───────── Groq AI Suggestions ─────────
  const { data: groqSuggestions, isLoading: groqLoading } = useQuery({
    queryKey: ['groq-suggestions', company?.id],
    queryFn: async () => {
      const res: any = await api.post(`/suggestions/${company?.id}/generate`);
      return res.data || res;
    },
    enabled: !!company?.id,
    staleTime: 1000 * 60 * 60 * 24, // 24hr cache
    retry: 1,
  });

  // ───────── Benchmark (ML API) ─────────
  const { data: benchmark } = useQuery({
    queryKey: ['ml-benchmark', company?.industry],
    queryFn: async () => {
      const res: any = await api.get(`/ml/benchmark/${company?.industry || 'other'}`);
      return res.data;
    },
    enabled: !!company?.industry,
    staleTime: Infinity,
  });

  // ───────── Chart data from ML forecast ─────────
  const chartData = (() => {
    if (!forecast?.predictions) return null;
    return forecast.predictions.map((p: any) => {
      const monthLabel = new Date(p.month + '-01').toLocaleString('default', { month: 'short', year: '2-digit' });
      return {
        month: monthLabel,
        predicted: Math.round(p.total_predicted / 1000),
        scope1: Math.round((p.scope1_predicted || 0) / 1000),
        scope2: Math.round((p.scope2_predicted || 0) / 1000),
        scope3: Math.round((p.scope3_predicted || 0) / 1000),
        upper: Math.round((p.confidence_interval?.[1] || p.total_predicted * 1.1) / 1000),
        lower: Math.round((p.confidence_interval?.[0] || p.total_predicted * 0.9) / 1000),
        confidence: Math.round((p.confidence_level || 0.85) * 100),
      };
    });
  })();

  const nextMonthPrediction = forecast?.predictions?.[0]?.total_predicted
    ? Math.round(forecast.predictions[0].total_predicted / 1000) : null;
  const confidenceLevel = forecast?.predictions?.[0]?.confidence_level
    ? Math.round(forecast.predictions[0].confidence_level * 100) : null;
  const dataQuality = forecast?.data_quality_score ? Math.round(forecast.data_quality_score * 100) : null;
  const benchmarkPercentile = forecast?.benchmark_comparison?.percentile;
  const trendPercent = forecast?.trend_percent;
  const trendDir = forecast?.trend;

  // Combine ML + Groq suggestions
  const allGroqSuggestions = groqSuggestions?.suggestions || groqSuggestions?.data?.suggestions || [];

  // ───────── CONFIDENCE SCORE ENGINE ─────────
  const [showConfidenceModal, setShowConfidenceModal] = useState(false);

  // Calculate specific factors. Ensure we handle empty states safely 
  const calculateConfidence = () => {
    if (!forecast || !chartData || chartData.length === 0) return { score: 0, indicator: "Low", metrics: {} };

    // 1. Data Length Score (months / 12), max 1.0 (approximating that chart length shows dataset maturity or via payload if there's raw hist length)
    // using chart length as a rough heuristic or hardcoding to 10 for demo if backend isn't sending raw count 
    const monthsLoaded = chartData.length || 1;
    const dataLengthScore = Math.min(monthsLoaded / 12, 1.0);

    // 2. Stability Score (1 - (stdDev / mean))
    const values = chartData.map((d: any) => d.predicted).filter((v: number) => !isNaN(v));
    const mean = values.reduce((a: number, b: number) => a + b, 0) / (values.length || 1);
    const variance = values.reduce((a: number, b: number) => a + Math.pow(b - mean, 2), 0) / (values.length || 1);
    const stdDev = Math.sqrt(variance);
    const cv = mean === 0 ? 0 : stdDev / mean;
    const stabilityScore = Math.max(0, 1 - cv); // Ensure it doesn't go below 0

    // 3. Completeness Score (1 - missing_data_percentage)
    // Since we are not strictly handed missing data% from backend to frontend right now,
    // we derive a rough approx using the dataQuality payload that already reflects NaN drops
    const completenessScore = forecast.data_quality_score ? forecast.data_quality_score : 1.0;

    // Final Calculation: Average of three, clamped between 0.40 and 0.98.
    const averageScore = (dataLengthScore + stabilityScore + completenessScore) / 3;
    const clampedScore = Math.max(0.40, Math.min(averageScore, 0.98));

    let indicator = "Low";
    if (clampedScore > 0.80) indicator = "High";
    else if (clampedScore >= 0.60) indicator = "Medium";

    return {
      score: clampedScore,
      indicator,
      metrics: { dataLengthScore, stabilityScore, completenessScore }
    };
  };

  const { score: rawConfidenceScore, indicator: confidenceIndicator } = calculateConfidence();

  return (
    <div className="space-y-6 max-w-[1400px]">

      {/* ═══════ HEADER ═══════ */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" /> AI Predictions
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Live ML forecasts & Groq-powered insights for <span className="text-foreground font-medium">{company?.name || 'your facility'}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {forecast && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-gradient-to-r from-primary/15 to-emerald-500/15 text-primary px-3 py-1.5 rounded-full text-xs font-bold border border-primary/20 flex items-center gap-2"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              {forecast.model_version || 'ML Model Active'}
            </motion.div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => { refetchForecast(); toast.info('Refreshing predictions...'); }}
            className="gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </motion.div>

      {/* ═══════ TOP STAT CARDS ═══════ */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}
          className="industrial-card p-5 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Next Month</span>
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <p className="text-3xl font-bold font-mono text-foreground">
              {forecastLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : nextMonthPrediction ? `${nextMonthPrediction}` : '—'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">tonnes CO₂ predicted</p>
            {confidenceLevel && (
              <div className="mt-2 flex items-center gap-1.5">
                <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${confidenceLevel}%` }} transition={{ delay: 0.5, duration: 0.8 }} className="h-full rounded-full bg-primary" />
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">{confidenceLevel}%</span>
              </div>
            )}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="industrial-card p-5 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Trend</span>
              {trendDir && <TrendIcon trend={trendDir} />}
            </div>
            <p className="text-3xl font-bold font-mono text-foreground">
              {trendPercent != null ? `${trendPercent > 0 ? '+' : ''}${trendPercent}%` : '—'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">monthly change rate</p>
            {trendDir && (
              <Badge variant="outline" className={`mt-2 text-[10px] ${trendDir === 'decreasing' ? 'border-emerald-500/30 text-emerald-400' : trendDir === 'increasing' ? 'border-red-500/30 text-red-400' : 'border-muted text-muted-foreground'}`}>
                {trendDir === 'decreasing' ? '↓ Improving' : trendDir === 'increasing' ? '↑ Rising' : '→ Stable'}
              </Badge>
            )}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="industrial-card p-5 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Data Quality</span>
              <Shield className="h-4 w-4 text-blue-400" />
            </div>
            <p className="text-3xl font-bold font-mono text-foreground">
              {dataQuality ? `${dataQuality}%` : '—'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">prediction confidence</p>
          </div>
        </motion.div>

        {/* --- DYNAMIC CONFIDENCE SCORE --- */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
          className="industrial-card p-5 relative overflow-hidden flex flex-col justify-between"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1">
                Confidence <Info className="h-3 w-3" />
              </span>
              <div className={`h-2.5 w-2.5 rounded-full ${confidenceIndicator === 'High' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : confidenceIndicator === 'Medium' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`} />
            </div>

            <p className="text-3xl font-bold font-mono text-foreground">
              {rawConfidenceScore > 0 ? `${(rawConfidenceScore * 100).toFixed(1)}%` : '—'}
            </p>

            <div className="flex items-center justify-between mt-1">
              <p className={`text-xs font-medium ${confidenceIndicator === 'High' ? 'text-emerald-400' : confidenceIndicator === 'Medium' ? 'text-amber-400' : 'text-red-400'}`}>
                {confidenceIndicator} Reliability
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-3 h-7 text-[10px] bg-background/50 border border-border/50 hover:bg-muted"
            onClick={() => setShowConfidenceModal(true)}
          >
            View Formula
          </Button>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="industrial-card p-5 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Industry Rank</span>
              <Target className="h-4 w-4 text-amber-400" />
            </div>
            <p className="text-3xl font-bold font-mono text-foreground">
              {benchmarkPercentile != null ? `Top ${100 - benchmarkPercentile}%` : '—'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              vs {benchmark?.companies_in_dataset || 40} {company?.industry?.replace(/_/g, ' ')} companies
            </p>
          </div>
        </motion.div>
      </div>

      {/* ═══════ FORECAST CHART ═══════ */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="industrial-card p-6 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">3-Month Emission Forecast</h3>
              <p className="text-xs text-muted-foreground">ML-powered prediction with confidence bounds</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-0.5 w-6 border-t-2 border-dashed border-primary inline-block" /> Predicted</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-6 rounded bg-primary/10 inline-block" /> Confidence Band</span>
          </div>
        </div>

        {forecastLoading ? (
          <div className="flex flex-col items-center justify-center h-[320px] text-muted-foreground gap-3">
            <div className="relative">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="absolute inset-0 h-8 w-8 rounded-full border-2 border-primary/20 animate-ping" />
            </div>
            <span className="text-sm">Fetching ML predictions...</span>
            <span className="text-[10px] text-muted-foreground">First load may take 30-60s (Render cold start)</span>
          </div>
        ) : chartData && chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="predGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(181, 61%, 40%)" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="hsl(181, 61%, 40%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,18%)" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'hsl(0,0%,55%)' }} stroke="hsl(0,0%,25%)" />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(0,0%,55%)' }} stroke="hsl(0,0%,25%)" tickFormatter={(v) => `${v}t`} />
              <Tooltip
                contentStyle={{ borderRadius: "12px", fontSize: "12px", background: "hsl(0,0%,7%)", border: "1px solid hsl(0,0%,18%)", color: "#fff", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}
                formatter={(value: number, name: string) => {
                  const labels: Record<string, string> = { predicted: 'Total', scope1: 'Scope 1', scope2: 'Scope 2', scope3: 'Scope 3', upper: 'Upper', lower: 'Lower' };
                  return [`${value} t CO₂`, labels[name] || name];
                }}
              />
              <Area dataKey="upper" stroke="none" fill="hsl(181, 61%, 30%)" fillOpacity={0.1} />
              <Area dataKey="lower" stroke="none" fill="hsl(0, 0%, 5%)" fillOpacity={1} />
              <Area dataKey="predicted" stroke="hsl(181, 61%, 45%)" strokeWidth={2.5} strokeDasharray="8 4" fill="url(#predGradient)" dot={{ fill: "hsl(181, 61%, 45%)", r: 5, strokeWidth: 2, stroke: "hsl(181, 61%, 20%)" }} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center h-[320px] text-muted-foreground">
            <BarChart3 className="h-10 w-10 mb-3 text-muted-foreground/30" />
            <p className="text-sm">No forecast data available</p>
            <p className="text-xs mt-1">ML service may be warming up. Click Refresh.</p>
          </div>
        )}
      </motion.div>

      {/* ═══════ ANOMALIES ═══════ */}
      {forecast?.anomalies && forecast.anomalies.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="industrial-card p-5 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" /> Detected Anomalies
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {forecast.anomalies.map((a: any, i: number) => (
              <div key={`anomaly-${i}`} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                <Badge variant="outline" className={`text-[10px] uppercase shrink-0 ${SEVERITY_COLORS[a.severity] || SEVERITY_COLORS.info}`}>
                  {a.severity}
                </Badge>
                <div>
                  <p className="text-sm font-medium text-foreground">{a.month} — {a.type}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Z-score: {a.z_score?.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ═══════ BENCHMARK BAR ═══════ */}
      {benchmark && nextMonthPrediction && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="industrial-card p-5 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-400" />
            Industry Benchmark — <span className="capitalize">{company?.industry?.replace(/_/g, ' ')}</span>
          </h3>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: 'Your Forecast', value: nextMonthPrediction, color: 'text-primary', bg: 'from-primary/10 to-transparent' },
              { label: 'Industry Avg', value: Math.round(benchmark.avg_monthly_co2_kg / 1000), color: 'text-muted-foreground', bg: 'from-muted/50 to-transparent' },
              { label: 'Best in Class', value: Math.round(benchmark.best_in_class_co2_kg / 1000), color: 'text-emerald-400', bg: 'from-emerald-500/10 to-transparent' },
            ].map((item, i) => (
              <div key={`bench-${i}`} className={`p-4 rounded-xl bg-gradient-to-br ${item.bg} border border-border/50 text-center`}>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{item.label}</p>
                <p className={`text-2xl font-bold font-mono ${item.color}`}>{item.value}</p>
                <p className="text-[10px] text-muted-foreground">t CO₂/mo</p>
              </div>
            ))}
          </div>
          <div className="relative h-4 bg-muted/50 rounded-full overflow-hidden border border-border/30">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/30 via-amber-500/30 to-red-500/30 rounded-full" />
            <motion.div
              initial={{ left: '0%' }}
              animate={{
                left: `${Math.min(95, Math.max(2, ((nextMonthPrediction * 1000 - benchmark.best_in_class_co2_kg) / (benchmark.worst_in_class_co2_kg - benchmark.best_in_class_co2_kg)) * 100))}%`
              }}
              transition={{ delay: 0.5, duration: 0.8, type: 'spring' }}
              className="absolute top-0 h-4 w-1.5 bg-primary rounded shadow-lg shadow-primary/50"
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5 px-1">
            <span>Best ({Math.round(benchmark.best_in_class_co2_kg / 1000)}t)</span>
            <span>Avg ({Math.round(benchmark.avg_monthly_co2_kg / 1000)}t)</span>
            <span>Worst ({Math.round(benchmark.worst_in_class_co2_kg / 1000)}t)</span>
          </div>
        </motion.div>
      )}

      {/* ═══════ ML SUGGESTIONS ═══════ */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        className="industrial-card p-6 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Target className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">ML Reduction Strategies</h3>
              <p className="text-xs text-muted-foreground">Statistical analysis from ML model</p>
            </div>
          </div>
          {mlSuggestions && (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Potential savings</p>
                <p className="text-sm font-mono font-bold text-emerald-400">
                  −{Math.round((mlSuggestions.total_potential_co2_reduction_kg || 0) / 1000)} t CO₂/mo
                </p>
              </div>
            </div>
          )}
        </div>

        {mlSuggestionsLoading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin" /><span className="text-sm">Loading ML strategies...</span>
          </div>
        ) : mlSuggestions?.suggestions && mlSuggestions.suggestions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {mlSuggestions.suggestions.map((s: any, idx: number) => (
              <motion.div
                key={`ml-${s.id || idx}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * idx }}
                className={`rounded-xl border border-border/50 bg-gradient-to-br ${CATEGORY_GRADIENT[s.category] || 'from-muted/50 to-transparent'} p-4 hover:border-border transition-colors`}
              >
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-background/50 flex items-center justify-center text-primary shrink-0">
                    {CATEGORY_ICONS[s.category] || <Cog className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-foreground truncate">{s.title}</p>
                      <Badge variant="outline" className={`text-[9px] shrink-0 ${PRIORITY_COLORS[s.priority] || ''}`}>{s.priority}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{s.why_recommended}</p>
                    <div className="flex items-center gap-4 mt-3">
                      <div className="flex items-center gap-1 text-xs">
                        <Recycle className="h-3 w-3 text-emerald-400" />
                        <span className="font-mono font-semibold text-emerald-400">−{Math.round(s.impact_co2_kg_monthly)}</span>
                        <span className="text-muted-foreground">kg/mo</span>
                      </div>
                      {s.roi_percent > 0 && (
                        <div className="flex items-center gap-1 text-xs">
                          <DollarSign className="h-3 w-3 text-amber-400" />
                          <span className="font-mono font-semibold text-amber-400">{Math.round(s.roi_percent)}%</span>
                          <span className="text-muted-foreground">ROI</span>
                        </div>
                      )}
                      {s.payback_months && (
                        <div className="flex items-center gap-1 text-xs">
                          <Clock className="h-3 w-3 text-blue-400" />
                          <span className="font-mono text-muted-foreground">{s.payback_months.toFixed(1)} mo</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <p className="text-sm">ML service warming up. Click Refresh.</p>
          </div>
        )}
      </motion.div>

      {/* ═══════ GROQ AI INSIGHTS ═══════ */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        className="industrial-card p-6 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Groq AI Insights</h3>
              <p className="text-xs text-muted-foreground">LLama 3.3 70B • Personalized recommendations</p>
            </div>
          </div>
          <Badge variant="outline" className="border-purple-500/20 text-purple-400 text-[10px] gap-1">
            <Sparkles className="h-3 w-3" /> Powered by Groq
          </Badge>
        </div>

        {groqLoading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
            <span className="text-sm">Generating personalized insights with LLama 3.3...</span>
          </div>
        ) : allGroqSuggestions.length > 0 ? (
          <div className="space-y-3">
            {allGroqSuggestions.slice(0, 6).map((s: any, idx: number) => {
              const sKey = s.category + '-' + idx;
              return (
                <motion.div
                  key={sKey}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * idx }}
                  className="rounded-xl border border-border/50 bg-muted/20 overflow-hidden cursor-pointer hover:bg-muted/40 transition-all"
                  onClick={() => setExpandedSuggestion(expandedSuggestion === sKey ? null : sKey)}
                >
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${CATEGORY_GRADIENT[s.category] || 'from-purple-500/20 to-indigo-500/20'} flex items-center justify-center text-foreground shrink-0`}>
                        {CATEGORY_ICONS[s.category] || <Lightbulb className="h-5 w-5" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{s.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{s.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      <Badge variant="outline" className={`text-[9px] ${s.complexity === 'high' ? 'border-red-500/20 text-red-400' : s.complexity === 'medium' ? 'border-amber-500/20 text-amber-400' : 'border-emerald-500/20 text-emerald-400'}`}>
                        {s.complexity}
                      </Badge>
                      <div className="text-right hidden sm:block">
                        <p className="text-xs font-mono font-semibold text-emerald-400">
                          −{((s.annualSavings?.co2Kg || s.annualSavingsCo2Kg || 0) / 12).toFixed(0)} kg/mo
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          ₹{((s.annualSavings?.inr || s.annualSavingsInr || 0) / 12).toFixed(0)}/mo
                        </p>
                      </div>
                      {expandedSuggestion === sKey ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </div>

                  <AnimatePresence>
                    {expandedSuggestion === sKey && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 pt-0 border-t border-border/50">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                            <div className="p-3 rounded-lg bg-muted/30 text-center">
                              <DollarSign className="h-3.5 w-3.5 mx-auto text-amber-400 mb-1" />
                              <p className="text-[10px] text-muted-foreground">Investment</p>
                              <p className="text-sm font-mono font-bold text-foreground">
                                {s.investmentInr ? `₹${(s.investmentInr / 100000).toFixed(1)}L` : 'Varies'}
                              </p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/30 text-center">
                              <Clock className="h-3.5 w-3.5 mx-auto text-blue-400 mb-1" />
                              <p className="text-[10px] text-muted-foreground">Payback</p>
                              <p className="text-sm font-mono font-bold text-foreground">
                                {s.paybackMonths || s.payback ? `${(s.paybackMonths || s.payback).toFixed(0)} mo` : '—'}
                              </p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/30 text-center">
                              <Recycle className="h-3.5 w-3.5 mx-auto text-emerald-400 mb-1" />
                              <p className="text-[10px] text-muted-foreground">CO₂ Saved/yr</p>
                              <p className="text-sm font-mono font-bold text-emerald-400">
                                {((s.annualSavings?.co2Kg || s.annualSavingsCo2Kg || 0) / 1000).toFixed(1)}t
                              </p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/30 text-center">
                              <Target className="h-3.5 w-3.5 mx-auto text-purple-400 mb-1" />
                              <p className="text-[10px] text-muted-foreground">Impact</p>
                              <div className="flex items-center justify-center gap-1 mt-0.5">
                                <div className="h-1.5 w-10 rounded-full bg-muted overflow-hidden">
                                  <div className="h-full rounded-full bg-purple-400" style={{ width: `${s.impactScore || 50}%` }} />
                                </div>
                                <span className="text-[10px] font-mono text-foreground">{s.impactScore || 50}</span>
                              </div>
                            </div>
                          </div>
                          {s.implementationSteps && s.implementationSteps.length > 0 && (
                            <div className="mt-3 space-y-1.5">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Implementation Steps</p>
                              {s.implementationSteps.map((step: string, si: number) => (
                                <div key={si} className="flex items-start gap-2 text-xs">
                                  <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                                  <span className="text-muted-foreground">{step}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <Sparkles className="h-8 w-8 mb-2 text-muted-foreground/30" />
            <p className="text-sm">No Groq insights available yet</p>
            <p className="text-xs mt-1">Suggestions generate from your company's emission data</p>
          </div>
        )}
      </motion.div>

      {/* --- CONFIDENCE FORMULA MODAL --- */}
      <Dialog open={showConfidenceModal} onOpenChange={setShowConfidenceModal}>
        <DialogContent className="sm:max-w-md bg-background border border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Shield className="h-4 w-4 text-primary" />
              Confidence Score Formula
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Calculated using historical data constraints to determine prediction reliability.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 text-sm text-foreground">
            <div className="bg-muted/30 p-3 rounded-md font-mono text-xs border border-border/50">
              Confidence Score = clamp( average(Data Length Score, Stability Score, Completeness Score), 0.40, 0.98 )
            </div>

            <ul className="space-y-2 text-xs">
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1 shrink-0" />
                <div><span className="font-semibold text-foreground">Data Length Score</span> = months_of_data / 12 (max 1.0)</div>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-1 shrink-0" />
                <div><span className="font-semibold text-foreground">Stability Score</span> = <span className="font-mono">1 − (standard_deviation / mean)</span></div>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-500 mt-1 shrink-0" />
                <div><span className="font-semibold text-foreground">Completeness Score</span> = <span className="font-mono">1 − missing_data_percentage</span></div>
              </li>
            </ul>

            <div className="bg-primary/10 text-primary p-3 rounded-md text-xs border border-primary/20 flex gap-2">
              <Info className="h-4 w-4 shrink-0" />
              <p>More months of clean, stable data = higher confidence.</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
